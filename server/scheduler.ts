
import cron from 'node-cron';
import { db } from '@db';
import { habits, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { sendHabitReminder } from './twilio';
import moment from 'moment-timezone';

function parseReminderTime(time: string) {
  const [hours, minutes] = time.split(':');
  return { hours, minutes };
}

export function startReminderScheduler() {
  // Run every minute to check for reminders
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentDay = now.getDay(); // Get the current day (0 = Sunday, 6 = Saturday)

      // Get all active habits with their users
      const activeHabits = await db
        .select({
          habit: habits,
          user: users
        })
        .from(habits)
        .leftJoin(users, eq(habits.userId, users.id))
        .where(
          and(
            eq(habits.isRunning, true),
            eq(habits.active, true)
          )
        );

      for (const { habit, user } of activeHabits) {
        if (
          !habit.reminderTime ||
          !user.phoneVerified ||
          user?.stripeSubscriptionStatus === 'canceled' ||
          user?.stripeSubscriptionStatus === '' ||
          user?.stripeSubscriptionStatus === 'incomplete_expired'
        ) {
          continue;
        }
        
        const { hours, minutes } = parseReminderTime(habit.reminderTime);

        // Convert current time to the user's time zone
        const userTime = moment.tz(now, habit.timezone);  // Convert to user's time zone
        const userHour = userTime.format('HH');           // Get hours in 24-hour format
        const userMinute = userTime.format('mm');         // Get minutes

        // Check if it's time to send reminder for daily habits
        if (habit.frequency.toLowerCase() === "daily" && hours == userHour && minutes == userMinute) {
          await sendHabitReminder({ ...habit, user });
        }

        // Check if it's time to send reminder for semi-daily habits
        if (habit.frequency.toLowerCase() === "semi-daily" && hours === userHour && minutes === userMinute) {
          // Check if the current day is in the selectedDays (jsonb)
          if (habit.selectedDays && habit.selectedDays.includes(currentDay)) {
            await sendHabitReminder({ ...habit, user });
          }
        }

        // Check if it's time to send reminder for weekly habits
        if (habit.frequency.toLowerCase() === "weekly" && hours === userHour && minutes === userMinute) {
          // Check if the current day is in the selectedDays (jsonb)
          if (habit.selectedDays && habit.selectedDays.includes(currentDay)) {
            await sendHabitReminder({ ...habit, user });
          }
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });
}

