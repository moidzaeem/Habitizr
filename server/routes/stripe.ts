import express from "express";
import {
  stripe,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} from "../lib/stripe";
import { db } from "@db";
import { users, type User } from "@db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Create a Stripe Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { priceId } = req.body;

    let session;
    if (req.user.stripeCustomerId) {
      // Existing customer
      session = await createCheckoutSession(priceId, req.user.stripeCustomerId);
    } else {
      // New customer
      const customer = await stripe.customers.create({
        email: req.user.email || undefined,
        metadata: {
          userId: req.user.id.toString(),
        },
      });

      // Update user with Stripe customer ID
      await db
        .update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, req.user.id));

      session = await createCheckoutSession(priceId, customer.id);
    }
    console.log(session);
    res.json({ url: session });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create a Stripe Portal Session
router.post("/create-portal-session", async (req, res) => {
  try {
    if (!req.user?.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found" });
    }

    const session = await createPortalSession(req.user.stripeCustomerId);
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// Stripe webhook handler
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(400).send("Missing signature or webhook secret");
      }

      const result = await handleWebhook(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );

      res.json(result);
    } catch (error) {
      console.error("Error handling webhook:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  },
);

export default router;
