import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import stripeRouter from "./routes/stripe";
import { startReminderScheduler } from "./scheduler";
import dotenv from 'dotenv';
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import fs from 'fs';
import path from 'path';
import { verifyEmail } from "./email";
dotenv.config();

const app = express();
startReminderScheduler();

// let messaging: Messaging;

// try {
//   const serviceAccount = JSON.parse(fs.readFileSync(path.resolve('./habitizr-778e7-firebase-adminsdk-fbsvc-07eb0eff80.json'), 'utf8'));

//   const FCM_PUSH = initializeApp({
//     credential: cert(serviceAccount),
//     databaseURL: 'https://habitizr-778e7.firebaseio.com',
  
//   });
//    messaging = getMessaging(FCM_PUSH); // This will give you access to messaging functionality
  

//   console.log("Firebase Admin SDK initialized successfully");

// } catch (error) {
//   console.error("Error initializing Firebase Admin SDK:", error);
// }






// Regular JSON middleware for normal routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add Stripe routes
app.use('/api/stripe', stripeRouter);

// app.post('/api/push-notification', (req, res) => {
  
//   const { fcmToken, title, body } = req.body;

// if (!fcmToken || !title || !body) {
//   return res.status(400).json({ message: 'FCM token, title, and body are required' });
// }

// const message = {
//   token: fcmToken,
//   notification: {
//     title: title,
//     body: body,
//   },
//   apns: {
//     headers: {
//       'apns-priority': '10',              // 10 = Immediate delivery
//       'apns-push-type': 'alert',          // Required for iOS 13+
//       'apns-topic': 'com.habitizr.habitizrapp'  // <-- Change to your actual app's bundle ID
//     },
//     payload: {
//       aps: {
//         alert: {
//           title: title,
//           body: body,
//         },
//         sound: 'default',                 // Optional: enables sound
//         badge: 10                          // Optional: badge number
//       }
//     }
//   }
// };

// messaging.send(message)
//   .then((response) => {
//     console.log('Successfully sent message:', response);
//     return res.status(200).json({ success: true });
//   })
//   .catch((error) => {
//     console.log('Error sending message:', error);
//     return res.status(500).json({ success: false });
//   });

  
//   // messaging.send(message)
//   //   .then((response) => {
//   //     // Response is a message ID string.
//   //     console.log('Successfully sent message:', response);
//   //           return res.status(200).json({ message: 'Push notification sent successfully', response });

//   //   })
//   //   .catch((error) => {
//   //     console.log('Error sending message:', error);
//   //   });
  

//   // Send the push notification
//   // messaging.send(message)
//   //   .then((response) => {
//   //     console.log('Successfully sent message:', response);
//   //     return res.status(200).json({ message: 'Push notification sent successfully', response });
//   //   })
//   //   .catch((error) => {
//   //     console.error('Error sending message:', error);
//   //     return res.status(500).json({ message: 'Error sending push notification', error });
//   //   });
// });


app.get('/api/verify-email', async (req, res) => {
  try {
    // Get the token from the request params
    const token = req.query.token;
    console.log('TOKEN: ', token);
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    // Call the verifyEmail function asynchronously
    await verifyEmail(token);

    // If verification is successful, send a success response
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    // If an error occurs, send an error response
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
});


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();