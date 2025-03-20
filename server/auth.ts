import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, loginSchema } from "@db/schema";
import { db } from "@db";
import { eq, or } from "drizzle-orm";
import { TIERS } from "@/lib/tiers";
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail } from "./email";

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

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
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
          emailVerified: true,
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
}