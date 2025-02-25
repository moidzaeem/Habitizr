import OpenAI from "openai";
import { type Habit } from "@db/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface HabitInsight {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  consistency_score: number;
}

export async function generateHabitInsights(habit: Habit): Promise<HabitInsight> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a habit formation and behavioral psychology expert. Your role is to analyze habit data comprehensively and provide actionable insights based on historical trends and patterns.

          Consider:
          - The user's progress since day one
          - Pattern of completion and difficulty levels
          - Emotional states and motivation levels
          - Time of day and contextual factors`,
        },
        {
          role: "user",
          content: `Please analyze this habit:
            Name: ${habit.name}
            Description: ${habit.description}
            Frequency: ${habit.frequency}
            Active: ${habit.active}
            Started At: ${habit.startedAt}
            Last Check-in: ${habit.lastCheckin}

            Provide insights in JSON format with:
            - A brief summary of the habit status
            - Key strengths in the current habit practice (as array of strings)
            - Areas for improvement (as array of strings)
            - Specific suggestions for better habit formation (as array of strings)
            - A consistency score (0-100)
            `
        }
      ],
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message?.content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(response.choices[0].message.content);
    return {
      summary: result.summary,
      strengths: result.strengths,
      improvements: result.improvements,
      suggestions: result.suggestions,
      consistency_score: result.consistency_score
    };
  } catch (error) {
    console.error('Error generating habit insights:', error);
    throw new Error('Failed to generate habit insights');
  }
}

// Function to analyze daily responses and generate personalized feedback
export async function generateDailyFeedback(
  habitId: number,
  userId: number,
  currentResponse: string,
  historicalData: {
    completionRate: number;
    streak: number;
    averageDifficulty: number;
    commonMood: string;
    previousResponses: Array<{ message: string; timestamp: Date }>;
  }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a supportive habit coach with perfect memory of the user's journey. You have access to:
            - Historical completion rate: ${historicalData.completionRate}%
            - Current streak: ${historicalData.streak} days
            - Average difficulty level: ${historicalData.averageDifficulty}/5
            - Most common mood: ${historicalData.commonMood}

            Previous responses to consider:
            ${historicalData.previousResponses
              .map(r => `${r.timestamp.toISOString()}: ${r.message}`)
              .join('\n')}
            `
        },
        {
          role: "user",
          content: currentResponse
        }
      ]
    });

    return response.choices[0].message?.content || 'Keep going! You\'re making progress.';
  } catch (error) {
    console.error('Error generating daily feedback:', error);
    throw new Error('Failed to generate daily feedback');
  }
}