import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { habits, users, habitCompletions, habitReminders, habitResponses, habitConversations, habitInsights } from "@db/schema";
import { checkTrialStatus } from "./middleware/checkTrialStatus";
import { eq, and, lte, gte, or, desc, sql } from "drizzle-orm";
import Stripe from "stripe";
import { TIERS } from "@/lib/tiers";
import nodemailer from "nodemailer";
import {
  sendVerificationMessage,
  generateHabitInsights,
  sendHabitReminder,
} from "./lib/utils";
import { now } from "moment-timezone";
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { generateWeeklyInsights, getHabitCompletionStats, storeInsights } from "./twilio";

const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
};

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // Update the register endpoint to create Stripe customer properly
  app.post("/api/register", async (req, res, next) => {
    try {
      // First create the user
      const [user] = await db
        .insert(users)
        .values({
          ...req.body,
          password: await hashPassword(req.body.password),
          packageType: TIERS.PATHFINDER,
        })
        .returning();

      // Then create Stripe customer with the user's ID
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.username,
        metadata: {
          userId: user.id.toString(),
        },
      });

      // Update user with Stripe customer ID
      const [updatedUser] = await db
        .update(users)
        .set({
          stripeCustomerId: customer.id,
        })
        .where(eq(users.id, user.id))
        .returning();

      req.login(updatedUser, (err) => {
        if (err) return next(err);
        res.status(201).json(updatedUser);
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).send("Failed to create user");
    }
  });

  // Add package upgrade endpoint
  app.post("/api/upgrade-package", isAuthenticated, async (req, res) => {
    try {
      const { packageType } = req.body;
      //const productConfig = STRIPE_PRODUCTS[packageType as keyof typeof STRIPE_PRODUCTS]; // Removed

      //if (!productConfig) { //Removed
      //  return res.status(400).json({ error: "Invalid package type" });
      //}

      // Get user with Stripe customer ID
      const [userWithStripe] = await db
        .select()
        .from(users)
        // @ts-ignore
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!userWithStripe.stripeCustomerId) {
        // Create Stripe customer if not exists
        const customer = await stripe.customers.create({
          email: userWithStripe.email || undefined,
          name: userWithStripe.username,
          metadata: {
            userId: userWithStripe.id.toString(),
          },
        });

        // Update user with new Stripe customer ID
        await db
          .update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, userWithStripe.id));

        userWithStripe.stripeCustomerId = customer.id;
      }

      // Create a price for the package type
      const price = await stripe.prices.create({
        unit_amount: packageType === TIERS.PATHFINDER ? 999 : 1999, // Amount in cents
        currency: "usd",
        recurring: { interval: "month" },
        product_data: {
          name: `${packageType} Plan`,
          // @ts-ignore
          description:
            packageType === TIERS.PATHFINDER
              ? "1 Active Habit, Basic AI Insights, Daily SMS Reminders"
              : "Up to 3 Active Habits, Advanced AI Insights, Priority SMS Reminders, Analytics",
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: userWithStripe.stripeCustomerId,
        items: [{ price: price.id }],
        trial_period_days: packageType === TIERS.PATHFINDER ? 7 : undefined, // Trial only for Pathfinder
        metadata: {
          userId: userWithStripe.id.toString(),
          packageType,
        },
      });

      // Update user's package type
      const [updatedUser] = await db
        .update(users)
        .set({
          packageType,
          stripeSubscriptionStatus: subscription.status,
        })
        .where(eq(users.id, userWithStripe.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error upgrading package:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to upgrade package",
      });
    }
  });

  // Add subscription cancellation endpoint
  app.post(
    "/api/stripe/cancel-subscription",
    isAuthenticated,
    async (req, res) => {
      if (!req.user) {
        return res.status(401).send("Not authenticated");
      }

      try {
        // Get the customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
          // @ts-ignore
          customer: req.user.stripeCustomerId,
        });


        console.log(subscriptions);
        if (subscriptions.data.length === 0) {
          return res.status(400).send("No active subscription found");
        }

        // Cancel the subscription at period end
        await stripe.subscriptions.cancel(subscriptions.data[0].id);


        res.sendStatus(200);
      } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).send("Failed to cancel subscription");
      }
    },
  );

  // Add portal session creation endpoint
  app.post(
    "/api/stripe/create-portal-session",
    isAuthenticated,
    async (req, res) => {
      if (!req.user) {
        return res.status(401).send("Not authenticated");
      }

      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          // @ts-ignore
          customer: req.user.stripeCustomerId!,
          return_url: `${req.protocol}://${req.get("host")}/profile`,
        });

        res.json({ url: portalSession.url });
      } catch (error) {
        console.error("Error creating portal session:", error);
        res.status(500).json({ error: "Failed to create portal session" });
      }
    },
  );

  // Admin routes
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);

      // Remove sensitive information before sending
      const sanitizedUsers = allUsers.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Failed to fetch users");
    }
  });

  // New endpoint for getting AI insights for a habit
  app.get("/api/habits/:id/insights", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const habitId = parseInt(req.params.id);
      const [habit] = await db
        .select()
        .from(habits)
        // @ts-ignore
        .where(and(eq(habits.id, habitId), eq(habits.userId, req.user.id)))
        .limit(1);

      if (!habit) {
        return res.status(404).send("Habit not found");
      }

      const insights = await generateHabitInsights(habit);
      res.json(insights);
    } catch (error) {
      console.error("Error generating habit insights:", error);
      res.status(500).send("Failed to generate habit insights");
    }
  });

  // Update admin user creation endpoint
  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, role, packageType, password } = req.body;

      // Find the user first
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if username is changing and already exists
      if (username && username !== user.username) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      // Build update object
      const updateFields: Partial<typeof users.$inferInsert> = {
        username,
        email,
        role,
        packageType,
      };

      // Optional: update password if provided
      if (password && password.length >= 6) {
        updateFields.password = await hashPassword(password);
        updateFields.mustChangePassword = true;
      }

      // Update user in DB
      const [updatedUser] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, userId))
        .returning();

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Failed to update user");
    }
  });


  // Add password change endpoint
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res
          .status(400)
          .send("Password must be at least 6 characters long");
      }

      const hashedPassword = await hashPassword(newPassword);
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          mustChangePassword: false,
        })
        // @ts-ignore
        .where(eq(users.id, req.user.id))
        .returning();

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).send("Failed to change password");
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Check if req.user exists
      if (!req.user) {
        return res.status(500).send("Failed to authenticate user");
      }

      // Prevent deleting self
      if (userId === req.user.id) {
        return res.status(400).send("Cannot delete your own admin account");
      }

      // Assuming you're using a library like Prisma, you might need to change this accordingly
      const deletedUser = await db.delete(users).where(eq(users.id, userId));

      if (deletedUser) {
        res.sendStatus(200);
      } else {
        res.status(404).send("User not found");
      }

    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).send("Failed to delete user");
    }
  });

  // User phone number update endpoint
  app.post("/api/user/phone", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).send("Phone number is required");
    }

    try {
      // Update user's phone number
      const [updatedUser] = await db
        .update(users)
        .set({
          phoneNumber,
          phoneVerified: false,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // Send verification message
      const success = await sendVerificationMessage(phoneNumber, req.user.id);
      if (!success) {
        throw new Error("Failed to send verification message");
      }

      res.json(updatedUser);
    } catch (error) {
      res
        .status(500)
        .send(
          error instanceof Error
            ? error.message
            : "Phone no is not correct By twillio!",
        );
    }
  });

  // Add new endpoint to verify phone number via link
  app.get("/api/verify-phone", async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Verification token is required");
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phoneVerificationToken, token as string))
        .limit(1);

      if (!user) {
        return res.status(400).send("Invalid or expired verification token");
      }

      // Update user's phone verification status
      await db
        .update(users)
        .set({
          phoneVerified: true,
          phoneVerificationToken: null
        })
        .where(eq(users.id, user.id));

      res.redirect('/profile');
    } catch (error) {
      res.status(500).send("Failed to verify phone number");
    }
  });


  // Habit management endpoints
  app.post("/api/habits", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Log the habit creation attempt
      console.log(
        "Creating habit for user:",
        req.user.id,
        "with data:",
        req.body,
      );

      // Add explicit user check
      const [habit] = await db
        .insert(habits)
        .values({
          ...req.body,
          userId: req.user.id,
          createdAt: new Date(),
          isRunning: false,
          active: true,
        })
        .returning();

      console.log("Created habit:", habit);
      res.json(habit);
    } catch (error) {
      console.error("Error creating habit:", error);
      res.status(500).send("Error creating habit");
    }
  });

  app.get("/api/habits", isAuthenticated, checkTrialStatus, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log("Fetching habits for user:", req.user.id);
      // Fetch habits with their completions, strictly for the current user only
      const userHabits = await db
        .select({
          habits: habits,
          completions: habitCompletions,
        })
        .from(habits)
        .leftJoin(
          habitCompletions,
          and(
            eq(habits.id, habitCompletions.habitId),
            eq(habits.userId, req.user.id),
          ),
        )
        .where(eq(habits.userId, req.user.id))
        .orderBy(habits.id);

      // Group completions by habit
      const groupedHabits = userHabits.reduce(
        (acc: Record<number, any>, row) => {
          if (!acc[row.habits.id]) {
            acc[row.habits.id] = {
              ...row.habits,
              completions: [],
            };
          }
          if (row.completions) {
            acc[row.habits.id].completions.push(row.completions);
          }
          return acc;
        },
        {},
      );

      const formattedHabits = Object.values(groupedHabits);
      res.json(formattedHabits);
    } catch (error) {
      console.error("Error fetching habits:", error);
      res.status(500).send("Error fetching habits");
    }
  });

  // Start a habit
  app.post("/api/habits/:id/start", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // First verify the habit belongs to the user
      const [existingHabit] = await db
        .select()
        .from(habits)
        .where(
          and(
            eq(habits.id, parseInt(req.params.id)),
            eq(habits.userId, req.user.id),
          ),
        )
        .limit(1);

      if (!existingHabit) {
        return res.status(404).send("Habit not found or unauthorized");
      }

      const [habit] = await db
        .update(habits)
        .set({
          isRunning: true,
          startedAt: new Date(),
        })
        .where(eq(habits.id, parseInt(req.params.id)))
        .returning();

      res.json(habit);
    } catch (error) {
      res.status(500).send("Error starting habit");
    }
  });

  // Stop a habit
  app.post("/api/habits/:id/stop", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // First verify the habit belongs to the user
      const [existingHabit] = await db
        .select()
        .from(habits)
        .where(
          and(
            eq(habits.id, parseInt(req.params.id)),
            eq(habits.userId, req.user.id),
          ),
        )
        .limit(1);

      if (!existingHabit) {
        return res.status(404).send("Habit not found or unauthorized");
      }

      const [habit] = await db
        .update(habits)
        .set({
          isRunning: false,
        })
        .where(eq(habits.id, parseInt(req.params.id)))
        .returning();

      res.json(habit);
    } catch (error) {
      res.status(500).send("Error stopping habit");
    }
  });

  app.put("/api/habits/:habitId/completions", isAuthenticated, async (req, res) => {
    const { habitId } = req.params;
    const { completedAt, completed } = req.body;

    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    // Validate habitId
    const parsedHabitId = parseInt(habitId);
    if (isNaN(parsedHabitId)) {
      return res.status(400).send("Invalid habit ID");
    }

    // Validate and normalize completedAt date
    const rawDate = new Date(completedAt);
    if (isNaN(rawDate.getTime())) {
      return res.status(400).send("Invalid completedAt date");
    }
    const utcDate = new Date(Date.UTC(
      rawDate.getUTCFullYear(),
      rawDate.getUTCMonth(),
      rawDate.getUTCDate()
    ));

    const formattedDate = formatInTimeZone(utcDate, 'UTC', 'yyyy-MM-dd');


    try {
      // Check if the habit belongs to the user
      const habit = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, parsedHabitId), eq(habits.userId, req.user.id)))
        .limit(1);

      if (!habit.length) {
        return res.status(404).send("Habit not found or not authorized");
      }

      // Check for an existing completion on the same day
      const existingCompletion = await db
        .select()
        .from(habitCompletions)
        .where(and(
          eq(habitCompletions.habitId, parsedHabitId),
          sql`DATE(${habitCompletions.completedAt}) = ${formattedDate}`
        ))
        .limit(1);

      let result;

      if (existingCompletion.length > 0) {
        // Update the existing completion
        [result] = await db
          .update(habitCompletions)
          .set({ completed })
          .where(eq(habitCompletions.id, existingCompletion[0].id))
          .returning();

      } else {
        [result] = await db
          .insert(habitCompletions)
          .values({
            habitId: parsedHabitId,
            completedAt: utcDate,
            completed,
            userId: req.user.id,
          })
          .returning();
      }

      // If no completion exists for the given date, return 404
      return res.json(result);
    } catch (error) {
      console.error("Error updating completion:", error);
      res.status(500).send("Server error updating completion");
    }
  });




  // Update a habit
  app.put("/api/habits/:id", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const habitId = parseInt(req.params.id);

      // First verify the habit belongs to the user
      const [existingHabit] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, req.user.id)))
        .limit(1);

      if (!existingHabit) {
        return res.status(404).send("Habit not found or unauthorized");
      }

      const [habit] = await db
        .update(habits)
        .set({
          ...req.body,
          userId: req.user.id,
        })
        .where(eq(habits.id, habitId))
        .returning();

      res.json(habit);
    } catch (error) {
      console.error("Error updating habit:", error);
      res.status(500).send("Error updating habit");
    }
  });

  // Add DELETE endpoint for habits
  app.delete("/api/habits/:id", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const habitId = parseInt(req.params.id);

      // First verify the habit belongs to the user
      const [existingHabit] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, req.user.id)))
        .limit(1);

      if (!existingHabit) {
        return res.status(404).send("Habit not found or unauthorized");
      }

      await db
        .delete(habitConversations)
        .where(eq(habitConversations.habitId, habitId));

      // Delete the habit completions first (due to foreign key constraint)
      await db
        .delete(habitCompletions)
        .where(eq(habitCompletions.habitId, habitId));

      await db
        .delete(habitResponses)
        .where(eq(habitResponses.habitId, habitId));

      await db
        .delete(habitInsights)
        .where(eq(habitInsights.habitId, habitId));

      await db
        .delete(habitReminders)
        .where(eq(habitReminders.habitId, habitId));

      // Then delete the habit
      await db.delete(habits).where(eq(habits.id, habitId));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting habit:", error);
      res.status(500).send("Error deleting habit");
    }
  });

  app.post("/api/sms/webhook", async (req, res) => {
    const { From, Body } = req.body;

    // console.log('Received SMS: ', JSON.stringify(req.body));
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)); // Start of today
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
    const reminder = await db
      .select()
      .from(habitReminders)
      .where(
        or(
          eq(habitReminders.phoneNumber, From),
          and(
            gte(habitReminders.timestamp, startOfDay),
            lte(habitReminders.timestamp, endOfDay)
          )
        )
      )
      .orderBy(desc(habitReminders.timestamp)) // Use the 'desc' method to specify descending order
      .limit(1)
    const mostRecentReminder = reminder[0];  // If the query returns an array

    if (Body.toLowerCase() === 'yes' || Body.toLowerCase() === 'no') {
      const habitId = mostRecentReminder.habitId;  // Habit ID associated with the most recent reminder
      const habit = await db.select().from(habits).where(eq(habits.id, habitId)).limit(1);

      if (habit.length > 0) {
        const status = 'responded';
        const response = Body.toLowerCase() === 'yes' ? 'completed' : 'not_completed';

        // Update the habit status in the database
        await db.update(habitReminders).set({ status, response }).where(eq(habitReminders.habitId, habitId));

        // Insert the new habit response with the current timestamp
        await db.insert(habitResponses).values({
          habitId: habitId, // Use habitId from the habit object (not habitReminders)
          response: Body.toLowerCase() === 'yes' ? 'YES' : 'NO',
          timestamp: new Date() // Use new Date() to get the current timestamp
        });

        await db.insert(habitCompletions).values({
          habitId: habitId,
          userId: mostRecentReminder.userId,
          completed: Body.toLowerCase() === 'yes' ? true : false,
          completedAt: new Date()
        })
      }

      const completionStats = await getHabitCompletionStats(habitId, mostRecentReminder.userId);

      const isCompletion = Body.toLowerCase().includes('yes') || Body.toLowerCase().includes('no');

      // Generate and store insights if needed
      if (isCompletion && completionStats.totalCompletions % 7 === 0) {
        const insights = await generateWeeklyInsights(habitId, mostRecentReminder.userId);
        await storeInsights(habitId, mostRecentReminder.userId, insights);
      }

    }

    res.json({
      message: 'We received your webhook - Habitizr',
    });
  });

  // Temporary endpoint for testing SMS
  app.post("/api/test-sms/:username", async (req, res) => {
    try {
      // Get user and their active habit
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, req.params.username))
        .limit(1);

      if (!user) {
        return res.status(404).send("User not found");
      }

      const [habit] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, user.id), eq(habits.isRunning, true)))
        .limit(1);

      if (!habit) {
        return res.status(404).send("No active habits found for user");
      }

      // Add user data to habit for SMS sending
      const habitWithUser = {
        ...habit,
        user: {
          ...user,
          phoneNumber: user.phoneNumber,
        },
      };

      await sendHabitReminder(habitWithUser);
      res.status(200).send("Test SMS sent successfully");
    } catch (error) {
      console.error("Error sending test SMS:", error);
      res.status(500).send("Error sending test SMS");
    }
  });

  app.post("/api/report-problem", async (req, res) => {
    try {
      const {
        name,
        email,
        category,
        description,
        stepsToReproduce,
        browserInfo,
      } = req.body;

      // Create a transporter using sendmail
      const transporter = nodemailer.createTransport({
        sendmail: true,
        newline: "unix",
        path: "/usr/sbin/sendmail",
      });

      // Construct email content
      const emailContent = `
Problem Report from Habitizr

Reporter Information:
Name: ${name}
Email: ${email}

Problem Details:
Category: ${category}
Description:
${description}

${stepsToReproduce
          ? `Steps to Reproduce:
${stepsToReproduce}

`
          : ""
        }
Browser/Device Information:
${browserInfo}
      `;

      // Send the email
      await transporter.sendMail({
        from: email,
        to: "info@habitizr.com",
        subject: `Habitizr Problem Report: ${category}`,
        text: emailContent,
      });

      res.status(200).json({ message: "Problem report sent successfully" });
    } catch (error) {
      console.error("Error sending problem report:", error);
      res.status(500).json({ message: "Failed to send problem report" });
    }
  });

  // Inside registerRoutes function, replace the existing create-checkout-session endpoint with:
  app.post("/api/create-checkout-session", isAuthenticated, async (req, res) => {
    try {
      const { packageType } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get user with Stripe customer ID
      const [userWithStripe] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (userWithStripe.packageType === packageType && userWithStripe.stripeSubscriptionStatus === 'active') {
        return res.status(500).json({ error: "You already subscribed to this package" });
      }

      let customerId = userWithStripe.stripeCustomerId;

      if (!customerId) {
        // Create Stripe customer if not exists
        const customer = await stripe.customers.create({
          email: userWithStripe.email || undefined,
          name: userWithStripe.username,
          metadata: {
            userId: userWithStripe.id.toString(),
          },
        });
        customerId = customer.id;

        // Update user with new Stripe customer ID
        await db
          .update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, userWithStripe.id));
      }

      // Check if the user has any active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active", // Filter by active subscriptions
        limit: 1, // Only need to know if there's at least one active subscription
      });

      // Determine the price amount for the selected package
      const priceAmount = packageType === TIERS.PATHFINDER ? 699 : 999; // Amount in cents

      // If the user isn't subscribed to any plan, create a new subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: priceAmount, // Amount in cents
              product_data: {
                name: `${packageType} Plan`,
              },
              recurring: { interval: "month" }, // Ensures it's a subscription
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}/profile?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}/profile`,
        metadata: {
          packageType: packageType, // Add the packageType to metadata
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      });
    }
  });


  app.post(
    "/api/get-client-secret",
    isAuthenticated,
    async (req, res) => {
      const trailblazer = 'price_1R1ad3JKwzZ1wTvdcpJArZco';
      const pathFinder = 'price_1R1acjJKwzZ1wTvdgzMyrOKn';

      try {
        // Destructure the packageType from the request body
        const { packageType } = req.body;

        if (!packageType) {
          return res.status(500).json({ error: "Package type is required" });
        }

        // Check if user is authenticated
        if (!req.user) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        // Get the user with the Stripe customer ID
        const [userWithStripe] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1);

        if (!userWithStripe) {
          return res.status(404).json({ error: "User not found" });
        }

        let customerId = userWithStripe.stripeCustomerId;

        // If the user doesn't have a Stripe customer ID, create one
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: userWithStripe.email || undefined,
            name: userWithStripe.username,
            metadata: {
              userId: userWithStripe.id.toString(),
            },
          });
          customerId = customer.id;

          // Update user with new Stripe customer ID
          await db
            .update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, userWithStripe.id));
        }

        // Ensure the packageType is valid
        if(packageType === 'basic'){
          await db
          .update(users)
          .set({
            stripeSubscriptionStatus: "active", // Mark the status as canceled
            packageType: 'basic',
          })
          .where(eq(users.stripeCustomerId, customerId));
         return res.status(200).json({ success:true, needClientSeceret: false });
        }

        const priceId = packageType === TIERS.TRAILBLAZER ? trailblazer : pathFinder;
        if (!priceId) {
          return res.status(400).json({ error: "Invalid package type" });
        }

        // Create a Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [
            {
              price: priceId, // Use the correct price based on packageType
            },
          ],
          payment_behavior: 'default_incomplete', // Payment is not finalized until confirmed
          expand: ['latest_invoice.payment_intent'], // Expand payment intent to confirm payment
        });

        // Check if subscription and payment_intent are available
        // @ts-ignore
        const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret;
        if (!clientSecret) {
          return res.status(500).json({ error: "Failed to retrieve client secret" });
        }
        res.status(200).json({ clientSecret });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to create checkout session",
        });
      }
    }
  );

  app.delete("/api/delete-user", isAuthenticated, async (req, res, next) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userId = req.user.id;
      // Check if the user exists in the database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Check if the user has a Stripe customer ID
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "User does not have an associated Stripe customer" });
      }
      // Cancel the user's subscription on Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        // Cancel the active subscription
        await stripe.subscriptions.cancel(subscription.id);
      }

      const allHabits = await db
        .select()
        .from(habits)
        .where(eq(habits.userId, userId));

      for (const habit of allHabits) {
        await db
          .delete(habitConversations)
          .where(eq(habitConversations.habitId, habit.id));

        await db
          .delete(habitCompletions)
          .where(eq(habitCompletions.habitId, habit.id));

        await db
          .delete(habitResponses)
          .where(eq(habitResponses.habitId, habit.id));

        await db
          .delete(habitInsights)
          .where(eq(habitInsights.habitId, habit.id));

        await db
          .delete(habitReminders)
          .where(eq(habitReminders.habitId, habit.id));
      }

      await db
        .delete(habits)
        .where(eq(habits.userId, userId));

      // Remove the user from the database
      await db
        .delete(users)
        .where(eq(users.id, userId));
      res.status(200).json({ message: "User and subscriptions successfully deleted from database and Stripe" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user and subscriptions. Please try again." });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
