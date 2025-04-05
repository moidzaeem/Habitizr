import twilio from 'twilio';
import { OpenAI } from 'openai';
import { users, type Habit } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Twilio credentials missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
}

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SMS Verification
// export async function sendVerificationMessage(phoneNumber: string): Promise<boolean> {
//   try {
//     if (!process.env.TWILIO_PHONE_NUMBER) {
//       throw new Error("TWILIO_PHONE_NUMBER must be set");
//     }

//     await twilioClient.messages.create({
//       body: `Your Habitizr verification code is: ${Math.floor(100000 + Math.random() * 900000)}`,
//       to: phoneNumber,
//       from: process.env.TWILIO_PHONE_NUMBER
//     });

//     return true;
//   } catch (error) {
//     console.error('Error sending verification message:', error);
//     return false;
//   }
// }

export async function sendVerificationMessage(phoneNumber: string, userId: number) {
  try {
    const verificationToken = Buffer.from(`${userId}-${Date.now()}`).toString('base64');
    const verificationLink = `${process.env.APP_URL}/api/verify-phone?token=${verificationToken}`;
    await twilioClient.messages.create({
      body: `Click this link to verify your phone number for Habitizr: ${verificationLink}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    // Store the token temporarily
    await db.update(users)
      .set({ phoneVerificationToken: verificationToken })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('Error sending verification message:', error);
  }
}
// Habit Insights Generation
export async function generateHabitInsights(habit: Habit): Promise<{
  analysis: string;
  recommendations: string[];
}> {
  try {
    // For now, return mock insights
    return {
      analysis: "Based on your habit tracking data, you're making steady progress.",
      recommendations: [
        "Try to be more consistent with your daily practice",
        "Consider tracking additional metrics",
        "Share your progress with friends for accountability"
      ]
    };
  } catch (error) {
    console.error('Error generating habit insights:', error);
    return {
      analysis: "Unable to generate insights at this time",
      recommendations: []
    };
  }
}

// SMS Reminders
export async function sendHabitReminder(habit: Habit & { user: { phoneNumber?: string } }): Promise<boolean> {
  try {
    if (!habit.user.phoneNumber || !process.env.TWILIO_PHONE_NUMBER) {
      return false;
    }

    await twilioClient.messages.create({
      body: `Reminder: Time to work on your habit "${habit.name}"!`,
      to: habit.user.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return true;
  } catch (error) {
    console.error('Error sending habit reminder:', error);
    return false;
  }
}
