import twilio from 'twilio';
import { OpenAI } from 'openai';
import type { Habit } from '@db/schema';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Twilio credentials missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
}

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SMS Verification
export async function sendVerificationMessage(phoneNumber: string): Promise<boolean> {
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error("TWILIO_PHONE_NUMBER must be set");
    }

    await twilioClient.messages.create({
      body: `Your Habitizr verification code is: ${Math.floor(100000 + Math.random() * 900000)}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return true;
  } catch (error) {
    console.error('Error sending verification message:', error);
    return false;
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

// Handle Incoming SMS
export async function handleIncomingSMS(from: string, body: string): Promise<string> {
  try {
    // Simple response for now
    return "Thank you for your message. We'll process your habit update shortly.";
  } catch (error) {
    console.error('Error handling incoming SMS:', error);
    return "Sorry, we couldn't process your message at this time.";
  }
}
