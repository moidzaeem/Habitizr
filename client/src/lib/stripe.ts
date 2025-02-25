import { TIERS } from "./tiers";

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