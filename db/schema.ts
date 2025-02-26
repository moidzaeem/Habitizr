import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { TIERS } from "@/lib/tiers";

// Updated users table with Stripe-related fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  tosAccepted: boolean("tos_accepted").default(false),
  phoneNumber: text("phone_number").unique(),
  phoneVerified: boolean("phone_verified").default(false),
  phoneVerificationToken: text("phone_verification_token"),
  createdAt: timestamp("created_at").defaultNow(),
  provider: text("provider"),
  providerId: text("provider_id"),
  role: text("role").default("user").notNull(),
  packageType: text("package_type").default(TIERS.PATHFINDER).notNull(),
  aiHelperName: text("ai_helper_name").default("Coach"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  mustChangePassword: boolean("must_change_password").default(false),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
});

// Updated habits table with proper constraints
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // daily, semi-daily, weekly
  selectedDays: jsonb("selected_days"), // array of days for semi-daily/weekly
  timezone: text("timezone").notNull().default('UTC'),
  reminderTime: text("reminder_time").notNull(),
  isRunning: boolean("is_running").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  lastCheckin: timestamp("last_checkin")
}, (table) => {
  return {
    userIdIdx: index("habits_user_id_idx").on(table.userId),
  };
});

// New table for tracking daily habit completions
export const habitCompletions = pgTable("habit_completions", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  userId: integer("user_id").references(() => users.id),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
  mood: text("mood"), // User's mood when completing the habit
  difficulty: integer("difficulty"), // Scale of 1-5
  notes: text("notes"), // Any additional notes from the user
});

// Store AI conversation history and context
export const habitConversations = pgTable("habit_conversations", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(), // The message sent/received
  role: text("role").notNull(), // 'user' or 'assistant'
  context: jsonb("context"), // Store conversation context and metadata
  timestamp: timestamp("timestamp").defaultNow(),
});

// Store AI-generated insights and recommendations
export const habitInsights = pgTable("habit_insights", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // 'strength', 'weakness', 'suggestion', etc.
  insight: text("insight").notNull(),
  relevanceScore: integer("relevance_score"), // How relevant is this insight (1-100)
  validUntil: timestamp("valid_until"), // When this insight should be reconsidered
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional data about the insight
});

// Existing habitResponses table remains
export const habitResponses = pgTable("habit_responses", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  completions: many(habitCompletions),
  conversations: many(habitConversations),
  insights: many(habitInsights)
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id]
  }),
  responses: many(habitResponses),
  completions: many(habitCompletions),
  conversations: many(habitConversations),
  insights: many(habitInsights)
}));

export const habitCompletionsRelations = relations(habitCompletions, ({ one }) => ({
  habit: one(habits, {
    fields: [habitCompletions.habitId],
    references: [habits.id]
  }),
  user: one(users, {
    fields: [habitCompletions.userId],
    references: [users.id]
  })
}));

export const habitConversationsRelations = relations(habitConversations, ({ one }) => ({
  habit: one(habits, {
    fields: [habitConversations.habitId],
    references: [habits.id]
  }),
  user: one(users, {
    fields: [habitConversations.userId],
    references: [users.id]
  })
}));

export const habitInsightsRelations = relations(habitInsights, ({ one }) => ({
  habit: one(habits, {
    fields: [habitInsights.habitId],
    references: [habits.id]
  }),
  user: one(users, {
    fields: [habitInsights.userId],
    references: [users.id]
  })
}));

// Schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tosAccepted: z.boolean().optional(),
  packageType: z.string().default(TIERS.PATHFINDER),
});

export const habitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "semi-daily", "weekly"]),
  selectedDays: z.array(z.number()).optional(),
  reminderTime: z.string().min(1, "Reminder time is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitResponse = typeof habitResponses.$inferSelect;
export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type HabitConversation = typeof habitConversations.$inferSelect;
export type HabitInsight = typeof habitInsights.$inferSelect;