import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { habits, users, habitCompletions } from "@db/schema";
import { checkTrialStatus } from "./middleware/checkTrialStatus";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";
import { TIERS } from "@/lib/tiers";
//import { STRIPE_PRODUCTS } from "./lib/stripe"; // Removed as per intention
import nodemailer from "nodemailer";
import {
  sendVerificationMessage,
  generateHabitInsights,
  sendHabitReminder,
  handleIncomingSMS,
} from "./lib/utils";

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
          customer: req.user.stripeCustomerId,
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          return res.status(400).send("No active subscription found");
        }

        // Cancel the subscription at period end
        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: true,
        });

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
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const { username, password, email, role, packageType } = req.body;
      console.log("Creating new user:", { username, email, role, packageType });

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Hash the password before storing
      const hashedPassword = await hashPassword(password);

      // Create the new user with email verified and must change password flags
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          emailVerified: true,
          packageType: packageType || "free",
          role: role || "user",
          provider: "local",
          mustChangePassword: true,
        })
        .returning();

      // Remove sensitive information before sending response
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).send("Failed to create user");
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

      // Prevent deleting self
      if (userId === req.user.id) {
        return res.status(400).send("Cannot delete your own admin account");
      }

      await db.delete(users).where(eq(users.id, userId));

      res.sendStatus(200);
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
      const success = await sendVerificationMessage(phoneNumber);
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
            : "Failed to update phone number",
        );
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
      console.log("Found habits for user:", formattedHabits);
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

      // Delete the habit completions first (due to foreign key constraint)
      await db
        .delete(habitCompletions)
        .where(eq(habitCompletions.habitId, habitId));

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
    const response = await handleIncomingSMS(From, Body);

    res.type("text/xml");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`,
    );
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

${
  stepsToReproduce
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
  app.post(
    "/api/create-checkout-session",
    isAuthenticated,
    async (req, res) => {
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

        // Create a price for the package type
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: packageType === TIERS.PATHFINDER ? 999 : 1999, // Amount in cents
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
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
