import Stripe from "stripe";
import { TIERS } from "@/lib/tiers";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const STRIPE_PRODUCTS = {
  [TIERS.PATHFINDER]: {
    price: 9.99,
    features: [
      "1 Active Habit",
      "Basic AI Insights",
      "Daily SMS Reminders",
      "7-Day Free Trial",
    ],
    trial_days: 7,
  },
  [TIERS.TRAILBLAZER]: {
    price: 19.99,
    features: [
      "Up to 3 Active Habits",
      "Advanced AI Insights",
      "Priority SMS Reminders",
      "Detailed Analytics",
      "Premium Support",
      "Unlimited Access",
    ],
    trial_days: 7,
  },
} as const;

export async function createCheckoutSession(
  packageType: keyof typeof STRIPE_PRODUCTS,
  customerId?: string,
) {
  const product = STRIPE_PRODUCTS[packageType];

  // Create or get price for the package
  const prices = await stripe.prices.list({
    lookup_keys: [`${packageType.toLowerCase()}_monthly`],
    active: true,
  });

  let priceId: string;

  if (prices.data.length === 0) {
    // Create new product and price if it doesn't exist
    const stripeProduct = await stripe.products.create({
      name: `${packageType} Plan`,
      description: product.features.join(", "),
    });

    const price = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(product.price * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      lookup_key: `${packageType.toLowerCase()}_monthly`,
    });

    priceId = price.id;
  } else {
    priceId = prices.data[0].id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: product.trial_days,
    },
    success_url: `${process.env.APP_URL}/profile?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/profile`,
    customer: customerId,
    allow_promotion_codes: true,
  });

  return session.url;
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/profile`,
  });

  return session;
}

export async function handleWebhook(
  body: string,
  signature: string,
  webhookSecret: string,
) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        const metadata = subscription.metadata;
        console.log('STATUS: ', status);

        // Get package type from metadata, fallback to Pathfinder if not found
        // const packageType = metadata.packageType || TIERS.PATHFINDER;
        const totalAmount = subscription.items.data[0].plan.amount;

        // @ts-ignore
        const packageType = totalAmount >=999? TIERS.TRAILBLAZER :TIERS.PATHFINDER;

        console.log(`Updating subscription for customer ${customerId} to ${packageType}`);

        // If the subscription is canceled, update the user record to reflect cancellation
        if (status === "canceled" || status === "unpaid") {
          console.log(`Subscription for customer ${customerId} has been canceled.`);
          await db
            .update(users)
            .set({
              stripeSubscriptionStatus: "canceled", // Mark the status as canceled
            })
            .where(eq(users.stripeCustomerId, customerId));
        } else {
          // Otherwise, handle active subscription
          await db
            .update(users)
            .set({
              packageType,
              stripeSubscriptionStatus: status,
            })
            .where(eq(users.stripeCustomerId, customerId));
        }
        break;


      case "checkout.session.completed":
        const session = event.data.object; // session object from the event
        const subscriptionId = session.subscription;

        // Add metadata to subscription after checkout session is completed
        await stripe.subscriptions.update(subscriptionId, {
          metadata: {
            packageType: session.metadata.packageType, // Metadata from checkout session
          },
        });

        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const deletedCustomerId = deletedSubscription.customer as string;

        console.log(`Subscription deleted for customer ${deletedCustomerId}`);

        // Reset user to Pathfinder tier when subscription is canceled
        await db
          .update(users)
          .set({
            packageType: TIERS.PATHFINDER,
            stripeSubscriptionStatus: "canceled",
          })
          .where(eq(users.stripeCustomerId, deletedCustomerId));
        break;
    }

    return { status: "success" };
  } catch (err) {
    console.error("Error processing webhook:", err);
    throw err;
  }
}