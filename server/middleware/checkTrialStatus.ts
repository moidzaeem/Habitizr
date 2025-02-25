
import { Request, Response, NextFunction } from 'express';
import { users } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { TIERS, isWithinTrialPeriod } from '@/lib/tiers';

export const checkTrialStatus = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return next();
  }

  const user = req.user as any;
  
  if (user.packageType === TIERS.PATHFINDER) {
    const createdAt = new Date(user.createdAt);
    const isInTrial = isWithinTrialPeriod(createdAt);

    if (!isInTrial) {
      return res.status(402).json({
        error: 'Trial period expired',
        message: 'Please upgrade to Trailblazer to continue using all features',
        requiresUpgrade: true
      });
    }
  }
  
  next();
};
