export interface Tier {
  name: string;
  description: string;
  maxHabits: number;
  price: number;
  features: string[];
  durationDays?: number;
  stripePriceId?: string;
}

export const TIERS = {
  PATHFINDER: "pathfinder",
  TRAILBLAZER: "trailblazer",
  BASIC:"basic",
  FREE: "free",
  ADMIN: "admin",
} as const;

export const PRICING_TIERS: Record<string, Tier> = {
  [TIERS.PATHFINDER]: {
    name: "Pathfinder",
    description: "Start your habit-building journey",
    maxHabits: 1,
    price: 6.99,
    durationDays: 7,
    stripePriceId: "price_1Qtrg9JKwzZ1wTvdDh1RAWYg",
    features: [
      "1 Active Habit",
      "Basic AI Insights",
      "Daily SMS Reminders",
      "7-Day Free Trial",
    ],
  },
  [TIERS.TRAILBLAZER]: {
    name: "Trailblazer",
    description: "For serious habit builders",
    maxHabits: 3,
    price: 9.99,
    stripePriceId: "price_1QtrgZJKwzZ1wTvdLLKVhRP0",
    features: [
      "Up to 3 Active Habits",
      "Advanced AI Insights",
      "Priority SMS Reminders",
      "Detailed Analytics",
      "Premium Support",
    ],
  },
  [TIERS.FREE]: {
    name: "Free",
    description: "Basic access account",
    maxHabits: 3,
    price: 0,
    features: [
      "Up to 3 Active Habits",
      "Basic AI Insights",
      "Daily SMS Reminders",
      "Basic Analytics",
    ],
  },
  [TIERS.ADMIN]: {
    name: "Admin",
    description: "Administrative account",
    maxHabits: Number.MAX_SAFE_INTEGER,
    price: 0,
    features: [
      "Unlimited Habits",
      "Advanced AI Insights",
      "Priority SMS Reminders",
      "Full Analytics",
      "Admin Features",
    ],
  },
};

export function getTierLimit(tier: string, isAdmin: boolean = false): number {
  if (isAdmin || tier === TIERS.ADMIN) {
    return Number.MAX_SAFE_INTEGER; // Unlimited habits for admins
  }
  return PRICING_TIERS[tier]?.maxHabits ?? 1;
}

export function isWithinTrialPeriod(createdAt: Date): boolean {
  // For testing: Use 30 seconds instead of 7 days
  const isTestMode = false;
  const trialDuration = isTestMode
    ? 30 * 1000 // 30 seconds for testing
    : PRICING_TIERS[TIERS.PATHFINDER].durationDays! * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() < trialDuration;
}
