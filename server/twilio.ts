import twilio from 'twilio';
import OpenAI from 'openai';
import { db } from '@db';
import {
  habits,
  habitResponses,
  habitCompletions,
  habitConversations,
  habitInsights,
  users
} from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.OPENAI_API_KEY) {
  throw new Error('Missing required environment variables for Twilio/OpenAI');
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getConversationHistory(habitId: number, userId: number, limit = 5) {
  const history = await db
    .select()
    .from(habitConversations)
    .where(
      and(
        eq(habitConversations.habitId, habitId),
        eq(habitConversations.userId, userId)
      )
    )
    .orderBy(desc(habitConversations.timestamp))
    .limit(limit);

  return history.reverse();
}

async function getHabitCompletionStats(habitId: number, userId: number) {
  const completions = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId)
      )
    )
    .orderBy(desc(habitCompletions.completedAt));

  const totalCompletions = completions.length;
  const successfulCompletions = completions.filter(c => c.completed).length;
  const streak = calculateStreak(completions);

  return {
    totalCompletions,
    successfulCompletions,
    completionRate: totalCompletions ? (successfulCompletions / totalCompletions) * 100 : 0,
    streak,
    recentMood: completions[0]?.mood,
    recentDifficulty: completions[0]?.difficulty
  };
}

function calculateStreak(completions: typeof habitCompletions.$inferSelect[]) {
  let streak = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const completion of completions) {
    // @ts-ignore
    const completionDate = new Date(completion.completedAt);
    const compareDate = new Date(today);
    compareDate.setDate(today.getDate() - streak);

    if (
      completion.completed &&
      completionDate.getFullYear() === compareDate.getFullYear() &&
      completionDate.getMonth() === compareDate.getMonth() &&
      completionDate.getDate() === compareDate.getDate()
    ) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// export async function sendVerificationMessage(phoneNumber: string) {
//   try {
//     await client.messages.create({
//       body: 'Reply YES to verify your phone number for habit tracking',
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
    const verificationLink = `${process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}/api/verify-phone?token=${verificationToken}`;

    await client.messages.create({
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
  async function generateReminderMessage(habit: any, stats: any, user: any, isFollowUp = false) {
    try {
      const helperName = user.aiHelperName || 'Habitizr';

      // Get recent conversation history for context
      const recentConversations = await getConversationHistory(habit.id, user.id, 3);
      const conversationContext = recentConversations
        .map(conv => `${conv.role}: ${conv.message}`)
        .join('\n');

      // Get time of day context
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      const prompt = {
        role: "system",
        content: `You are ${helperName}, a supportive habit coach with a warm, friendly personality.
      Important guidelines:
      - Keep responses under 160 characters for SMS
      - Never repeat previous messages
      - Adapt tone based on user's history and current streak
      - Be encouraging but authentic
      - Use varied language and expressions
      - Personalize based on time of day and user's patterns
      - Each response must be completely unique, even if context is similar

      Current context:
      - Time of day: ${timeOfDay}
      - Habit: ${habit.name}
      - Description: ${habit.description || 'No description provided'}
      - Streak: ${stats.streak} days
      - Completion rate: ${stats.completionRate.toFixed(1)}%
      - Recent mood: ${stats.recentMood || 'unknown'}
      - Recent difficulty level: ${stats.recentDifficulty || 'unknown'}
      - Helper name: ${helperName}

      Recent conversations:
      ${conversationContext}

      ${isFollowUp ?
            "Create a unique follow-up message that acknowledges their pattern and encourages engagement" :
            "Generate a fresh check-in message that feels personal and timely. End with clear YES/NO instructions"}`
      };

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
           // @ts-ignore
          prompt,
          {
            role: "user",
            content: isFollowUp ?
              `Create a unique follow-up message for "${habit.name}" considering their ${stats.streak}-day streak and recent interactions.` :
              `Create a fresh, personalized check-in message for "${habit.name}" considering their ${stats.streak}-day streak and the current time of day (${timeOfDay}).`
          }
        ],
        temperature: 0.9,
        presence_penalty: 0.8,
        frequency_penalty: 1.0,
        max_tokens: 150
      });

      return completion.choices[0].message?.content || 'Time for your habit check-in! Reply YES or NO.';
    } catch (error) {
      console.error('Error generating AI message:', error);
      return isFollowUp ?
        `Hey! Just checking in about "${habit.name}". How's it going?` :
        `Time to check in on ${habit.name}! Reply YES or NO.`;
    }
  }

  export async function sendHabitReminder(habit: any) {
    try {
      console.log('Generating reminder for habit:', habit.id, 'user:', habit.userId);

      // Get user's completion history
      const stats = await getHabitCompletionStats(habit.id, habit.userId);

      // Get user details for AI helper name
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, habit.userId))
        .limit(1);

      if (!user) {
        console.error('User not found for habit reminder:', habit.userId);
        return;
      }

      // Generate personalized message
      const message = await generateReminderMessage(habit, stats, user, false);
      console.log('Generated AI message:', message);

      // Store the AI-generated message in conversations
      await db.insert(habitConversations).values({
        habitId: habit.id,
        userId: habit.userId,
        message: message,
        role: 'assistant',
        timestamp: new Date(),
        context: { type: 'reminder', stats }
      });

      // Send the message via Twilio
      const twilioResponse = await client.messages.create({
        body: message,
        to: habit.user.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      console.log('Twilio message sent successfully:', twilioResponse.sid);

      // Schedule follow-up message after 15 minutes
      setTimeout(async () => {
        try {
          // Check if user has responded
          const recentResponse = await db
            .select()
            .from(habitCompletions)
            .where(
              and(
                eq(habitCompletions.habitId, habit.id),
                eq(habitCompletions.userId, habit.userId)
              )
            )
            .orderBy(desc(habitCompletions.completedAt))
            .limit(1);

          // Get updated stats
          const updatedStats = await getHabitCompletionStats(habit.id, habit.userId);

          // Generate AI follow-up message
          const followUpMessage = await generateReminderMessage(habit, updatedStats, user, true);
          console.log('Generated follow-up message:', followUpMessage);

          // Store the follow-up message
          await db.insert(habitConversations).values({
            habitId: habit.id,
            userId: habit.userId,
            message: followUpMessage,
            role: 'assistant',
            timestamp: new Date(),
            context: { type: 'follow_up', stats: updatedStats }
          });

          // Send follow-up via Twilio
          const followUpResponse = await client.messages.create({
            body: followUpMessage,
            to: habit.user.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
          });

          console.log('Follow-up message sent successfully:', followUpResponse.sid);

          // Update habit insights
          await db.insert(habitInsights).values({
            habitId: habit.id,
            userId: habit.userId,
            type: 'follow_up',
            insight: followUpMessage,
            relevanceScore: 100,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
            metadata: { stats: updatedStats }
          });

        } catch (error) {
          console.error('Error sending follow-up message:', error);
        }
      }, 15 * 60 * 1000);
    } catch (error) {
      console.error('Error in sendHabitReminder:', error);
    }
  }

  export async function handleIncomingSMS(from: string, body: string) {
    try {
      // Handle verification response
      if (body.toLowerCase() === 'yes') {
        await db.update(users)
          .set({ phoneVerified: true })
          .where(eq(users.phoneNumber, from));
        return 'Phone number verified successfully!';
      }

      // Get user and their active habit
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, from))
        .limit(1);

      if (!user) {
        return 'User not found. Please verify your phone number first.';
      }

      const [habit] = await db
        .select()
        .from(habits)
        .where(
          and(
            eq(habits.userId, user.id),
            eq(habits.isRunning, true)
          )
        )
        .limit(1);

      if (!habit) {
        return 'No active habits found. Please start a habit in the app first.';
      }

      // Process the response and store completion
      const isCompletion = body.toLowerCase().includes('yes') || body.toLowerCase().includes('no');
      const completed = body.toLowerCase().includes('yes');

      if (isCompletion) {
        await db.insert(habitCompletions).values({
          habitId: habit.id,
          userId: user.id,
          completed,
          notes: body,
          mood: detectMood(body),
          difficulty: detectDifficulty(body)
        });
      }

      // Store the user's message
      await db.insert(habitConversations).values({
        habitId: habit.id,
        userId: user.id,
        message: body,
        role: 'user',
        context: { isCompletion, completed },
        timestamp: new Date()
      });

      // Get conversation history and stats
      const conversationHistory = await getConversationHistory(habit.id, user.id);
      const completionStats = await getHabitCompletionStats(habit.id, user.id);

      // Generate AI response
      const aiResponse = await generateAIResponse(
        habit.id,
        user.id,
        body,
        completionStats,
        conversationHistory
      );

      // Store AI response
      await db.insert(habitConversations).values({
        habitId: habit.id,
        userId: user.id,
        message: aiResponse,
        role: 'assistant',
        context: { stats: completionStats },
        timestamp: new Date()
      });

      // Generate and store insights if needed
      if (isCompletion && completionStats.totalCompletions % 7 === 0) {
        const insights = await generateWeeklyInsights(habit.id, user.id);
        await storeInsights(habit.id, user.id, insights);
      }

      return aiResponse;
    } catch (error) {
      console.error('Error processing SMS:', error);
      return 'Thanks for your response!';
    }
  }

  async function generateAIResponse(
    habitId: number,
    userId: number,
    userMessage: string,
    completionStats: any,
    conversationHistory: any[]
  ) {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a supportive habit coach. Current stats:
          - Streak: ${completionStats.streak} days
          - Completion rate: ${completionStats.completionRate.toFixed(1)}%
          - Recent mood: ${completionStats.recentMood || 'N/A'}
          - Recent difficulty: ${completionStats.recentDifficulty || 'N/A'}`
        },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.message
        })),
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    return completion.choices[0].message?.content || 'Keep up the good work!';
  }

  function detectMood(message: string): string | null {
    const moodIndicators = {
      positive: ['happy', 'great', 'awesome', 'good', 'excited', '😊', '😃'],
      neutral: ['okay', 'fine', 'alright', 'normal', '😐'],
      negative: ['tired', 'difficult', 'hard', 'struggling', 'bad', '😞', '😕']
    };

    const messageLower = message.toLowerCase();

    for (const [mood, indicators] of Object.entries(moodIndicators)) {
      if (indicators.some(indicator => messageLower.includes(indicator))) {
        return mood;
      }
    }

    return null;
  }

  function detectDifficulty(message: string): number | null {
    const difficultyIndicators = {
      1: ['very easy', 'super easy', 'no problem'],
      2: ['easy', 'simple'],
      3: ['moderate', 'okay', 'alright'],
      4: ['hard', 'difficult', 'challenging'],
      5: ['very hard', 'very difficult', 'impossible', 'struggling']
    };

    const messageLower = message.toLowerCase();

    for (const [level, indicators] of Object.entries(difficultyIndicators)) {
      if (indicators.some(indicator => messageLower.includes(indicator))) {
        return parseInt(level);
      }
    }

    return null;
  }

  async function generateWeeklyInsights(habitId: number, userId: number) {
    const completions = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.userId, userId)
        )
      )
      .orderBy(desc(habitCompletions.completedAt))
      .limit(7);

    const stats = {
      completedDays: completions.filter(c => c.completed).length,
      averageDifficulty: completions.reduce((acc, c) => acc + (c.difficulty || 3), 0) / completions.length,
      commonMood: getCommonMood(completions),
      notes: completions.map(c => c.notes).filter(Boolean)
    };

    return {
      strengths: generateStrengthsInsights(stats),
      weaknesses: generateWeaknessesInsights(stats),
      suggestions: generateSuggestions(stats)
    };
  }

  function getCommonMood(completions: typeof habitCompletions.$inferSelect[]) {
    const moodCounts = completions.reduce((acc, c) => {
      if (c.mood) {
        acc[c.mood] = (acc[c.mood] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  function generateStrengthsInsights(stats: any) {
    const strengths = [];

    if (stats.completedDays >= 5) {
      strengths.push("Strong consistency in habit completion");
    }
    if (stats.averageDifficulty < 3) {
      strengths.push("Finding the habit manageable and sustainable");
    }
    if (stats.commonMood === 'positive') {
      strengths.push("Maintaining a positive attitude towards the habit");
    }

    return strengths;
  }

  function generateWeaknessesInsights(stats: any) {
    const weaknesses = [];

    if (stats.completedDays < 4) {
      weaknesses.push("Struggling with consistent habit completion");
    }
    if (stats.averageDifficulty > 4) {
      weaknesses.push("Finding the habit challenging to maintain");
    }
    if (stats.commonMood === 'negative') {
      weaknesses.push("Experiencing difficulty maintaining motivation");
    }

    return weaknesses;
  }

  function generateSuggestions(stats: any) {
    const suggestions = [];

    if (stats.completedDays < 4) {
      suggestions.push("Try breaking down the habit into smaller, more manageable steps");
    }
    if (stats.averageDifficulty > 4) {
      suggestions.push("Consider adjusting the habit's difficulty level or seeking additional support");
    }
    if (stats.commonMood === 'negative') {
      suggestions.push("Focus on celebrating small wins and tracking progress visually");
    }

    return suggestions;
  }

  async function storeInsights(habitId: number, userId: number, insights: any) {
    const insightTypes = ['strength', 'weakness', 'suggestion'];
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    for (const type of insightTypes) {
      const items = insights[type + 's'] || [];
      for (const insight of items) {
        await db.insert(habitInsights).values({
          habitId,
          userId,
          type,
          insight,
          relevanceScore: 100,
          validUntil,
          metadata: { source: 'weekly_analysis' }
        });
      }
    }
  }