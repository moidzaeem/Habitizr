
import { Request, Response, NextFunction } from 'express';
import { users } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { TIERS, isWithinTrialPeriod } from '@/lib/tiers';

export const checkTrialStatus = async (req: Request, res: Response, next: NextFunction) => {

  const user = req.user as any;

  const isAdmin = user?.role === 'admin';
  const isFreeTier = user?.packageType === TIERS.FREE;
  const isActiveSubscription = user?.stripeSubscriptionStatus === 'active';

  if (isAdmin || isFreeTier || isActiveSubscription) {
    return next();
  }

  const isInTrial = isWithinTrialPeriod(new Date(user.createdAt));

  if (!isInTrial) {
    return res.status(402).json({
      error: 'Trial period expired',
      message: 'Please upgrade to packages to continue using all features',
      requiresUpgrade: true
    });
  }
  next();
};
