import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, loginSchema } from "@db/schema";
import { db } from "@db";
import { eq, or, and, gt } from "drizzle-orm";
import { TIERS } from "@/lib/tiers";
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export const hashPassword = crypto.hash;

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  app.set("trust proxy", 1);

  // Configure session with proper settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "local-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: "auto",
      sameSite: "lax",
      path: "/",
      httpOnly: true
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(or(
            eq(users.username, username),
            eq(users.email, username)
          ))
          .limit(1);

        if (!user) {
          return done({ message: "Invalid username or password." }, false, { message: "Invalid username or password." });
        }

        const isMatch = await crypto.compare(password, user.password);

        if (!isMatch) {
          return done({ message: "Invalid username or password." }, false, { message: "Invalid username or password." });
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return done({ message: "Please verify your email address." }, false);
        }

        // Remove sensitive data
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        console.log('WAOW DONE: ', err);
        return done('WOAW');
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    // @ts-ignore
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      // Remove sensitive data
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (err) {
      done(err);
    }
  });

  // Auth endpoints
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    if (req.body?.fcmToken) {
      await db.update(users).set({ fcm: req.body.fcmToken }).where(eq(users.id, req?.user.id));
    }
    res.status(200).json(req.user);
  });
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Session destruction failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logout successful" });
      });
    });
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(password);
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          emailVerified: false,
          packageType: TIERS.PATHFINDER,
          role: 'user',
          provider: 'local',
          createdAt: new Date(),
        })
        .returning();
      await sendVerificationEmail(user.id, email);
      res.status(200).json();

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post('/api/auth/google', async (req, res) => {
    // 557005901423-93qf2ouvnhrjp82cm0us9fjmij0ek05v.apps.googleusercontent.com
    const client = new OAuth2Client('557005901423-93qf2ouvnhrjp82cm0us9fjmij0ek05v.apps.googleusercontent.com');

    const { token } = req.body; // The token sent from the client-side

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    try {
      // Step 1: Verify the token using Google OAuth2 client
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '557005901423-93qf2ouvnhrjp82cm0us9fjmij0ek05v.apps.googleusercontent.com', // Your Google client ID
      });

      const payload = ticket.getPayload();
      const googleId = payload?.sub;  // Unique Google user ID
      const email = payload?.email;   // Google user email
      const name = payload?.name;     // Google user name
      const picture = payload?.picture; // Google user profile picture

      // Step 2: Check if the Google user already exists in the database
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.provider, 'google'))  // First condition
        .where(eq(users.providerId, googleId))  // Second condition (chained)
        .limit(1);

      if (existingUser) {
        // Step 3: If the user exists, log them in (send back user data)
        req.login(existingUser, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      } else {
        // Step 4: If the user doesn't exist, register them
        const hashedPassword = await crypto.hash('123245678');

        const [user] = await db
          .insert(users)
          .values({
            username: name,   // Set the username to the Google user's name
            email,
            provider: 'google',
            providerId: googleId,  // Save the Google user ID as providerId
            emailVerified: true,
            picture,
            packageType: TIERS.PATHFINDER, // Default package
            role: 'user',
            createdAt: new Date(),
            password: hashedPassword

          })
          .returning();

        // Log in the user and create a session
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      }

    } catch (error) {
      console.error('Error verifying Google token:', error);
      return res.status(500).json({ message: 'Error verifying Google token', error });
    }
  });

  // FOR MOBILE
  app.post('/api/auth/google-signin', async (req, res) => {
    // 557005901423-93qf2ouvnhrjp82cm0us9fjmij0ek05v.apps.googleusercontent.com
    const client = new OAuth2Client('727936511077-987cakqcr6t40ga1t39e1ebmvft240qf.apps.googleusercontent.com');

    const { token } = req.body; // The token sent from the client-side

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    try {
      // Step 1: Verify the token using Google OAuth2 client
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '727936511077-987cakqcr6t40ga1t39e1ebmvft240qf.apps.googleusercontent.com', // Your Google client ID
      });

      const payload = ticket.getPayload();
      const googleId = payload?.sub;  // Unique Google user ID
      const email = payload?.email;   // Google user email
      const name = payload?.name;     // Google user name
      const picture = payload?.picture; // Google user profile picture

      // Step 2: Check if the Google user already exists in the database
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.provider, 'google'),
            // @ts-ignore
            eq(users.providerId, googleId)
          )
        )
        .limit(1);

      if (existingUser) {
        if (req.body?.fcmToken) {
          await db.update(users).set({ fcm: req.body.fcmToken }).where(eq(users.id, existingUser.id));
        }

        // Step 3: If the user exists, log them in (send back user data)
        req.login(existingUser, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      } else {
        // Step 4: If the user doesn't exist, register them
        const hashedPassword = await crypto.hash('123245678');

        const [user] = await db
          .insert(users)
          .values({
            username: name,   // Set the username to the Google user's name
            email,
            provider: 'google',
            providerId: googleId,  // Save the Google user ID as providerId
            emailVerified: true,
            picture,
            packageType: TIERS.PATHFINDER, // Default package
            role: 'user',
            createdAt: new Date(),
            password: hashedPassword,
            fcm: req.body?.fcmToken || null // Save the FCM token if provided

          })
          .returning();

        // Log in the user and create a session
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      }

    } catch (error) {
      console.error('Error verifying Google token:', error);
      return res.status(500).json({ message: 'Error verifying Google token', error });
    }
  });

  // FOR MOBILE
  app.post('/api/auth/apple-signin', async (req, res) => {


    try {

      const { name, email } = req.body;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.provider, 'apple'),
            eq(users.email, email)
          )
        )
        .limit(1);

      if (existingUser) {
        // Step 3: If the user exists, log them in (send back user data)
        if (req.body?.fcmToken) {
          await db.update(users).set({ fcm: req.body.fcmToken }).where(eq(users.id, existingUser.id));
        }
        req.login(existingUser, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      } else {
        // Step 4: If the user doesn't exist, register them
        const hashedPassword = await crypto.hash('123245678');

        const [user] = await db
          .insert(users)
          .values({
            username: name?.trim() || `user_${Date.now()}`,
            email,
            provider: 'apple',
            emailVerified: true,
            packageType: TIERS.PATHFINDER, // Default package
            role: 'user',
            createdAt: new Date(),
            password: hashedPassword,
            fcm: req.body?.fcmToken || null // Save the FCM token if provided

          })
          .returning();

        // Log in the user and create a session
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed', error: err });
          }
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      }

    } catch (error) {
      console.error('Error verifying Google token:', error);
      return res.status(500).json({ message: 'Error verifying Google token', error });
    }
  });

  const client = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
  });

  function getAppleSigningKey(header: { kid: string | null | undefined; }, callback: (arg0: null, arg1: string) => void) {
    client.getSigningKey(header.kid, function (err, key) {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }
  

  // FOR DESKTOp
  app.post('/api/auth/apple', async (req, res) => {
    const { token } = req.body;
  
    if (!token) return res.status(400).json({ message: 'Missing token' });
  
    // Verify Apple ID token
    jwt.verify(token, getAppleSigningKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    }, async (err: any, payload: { sub: any; email: any; firstName: any; lastName: any; }) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid Apple token', error: err });
      }
      console.log('Decoded Apple ID Token:', payload);

  
      const appleId = payload.sub;
      const email = payload.email; // May be missing on repeat logins
      const name = `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim() || 'Apple User';
  
      // Find existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.provider, 'apple'),
            eq(users.providerId, appleId)
          )
        )
        .limit(1);
  
      if (existingUser) {
        
  
        req.login(existingUser, (err) => {
          if (err) return res.status(500).json({ message: 'Login failed', error: err });
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      } else {
        // Register new user
        const hashedPassword = await crypto.hash('123245678');
  
        const [user] = await db
          .insert(users)
          .values({
            username: name,
            email,
            provider: 'apple',
            providerId: appleId,
            emailVerified: !!email,
            packageType: TIERS.PATHFINDER,
            role: 'user',
            createdAt: new Date(),
            password: hashedPassword,

          })
          .returning();
  
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: 'Login failed', error: err });
          return res.status(200).json({ message: 'Login successful', user: req.user });
        });
      }
    });
  });
  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
      // Check if the user exists in the database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "No user found with that email." });
      }

      // Generate a reset token (could be a random string)
      const resetToken = randomBytes(32).toString("hex");


      // Store the token in the database with an expiration time
      const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetTokenExpiry: expirationTime,
        })
        .where(eq(users.id, user.id));


      // Send the reset token to the user's email
      await sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({ message: "Password reset email sent." });
    } catch (error) {
      console.error('Error during forgot-password request:', error);
      res.status(500).json({ message: 'Something went wrong. Please try again later.' });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    // Check if token and newPassword are provided
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    try {
      // Find user by the reset token and check expiry date
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.passwordResetToken, token), // Check for matching reset token
            gt(users.passwordResetTokenExpiry, new Date()) // Ensure expiry is after current date/time
          )
        )
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password is too short" });
      }

      // Hash the new password
      const hashedPassword = await crypto.hash(newPassword);

      // Update the user record with the new password and clear reset token fields
      await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null, // Clear reset token after use
          passwordResetTokenExpiry: null, // Clear expiry time
        })
        .where(eq(users.id, user.id)); // Ensure we're updating the correct user

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while resetting the password" });
    }
  });


}