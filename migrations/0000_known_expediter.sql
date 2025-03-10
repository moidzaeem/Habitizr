CREATE TABLE IF NOT EXISTS "habit_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer,
	"user_id" integer,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp DEFAULT now(),
	"mood" text,
	"difficulty" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer,
	"user_id" integer,
	"message" text NOT NULL,
	"role" text NOT NULL,
	"context" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer,
	"user_id" integer,
	"type" text NOT NULL,
	"insight" text NOT NULL,
	"relevance_score" integer,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer,
	"response" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"selected_days" jsonb,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"reminder_time" text NOT NULL,
	"is_running" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"last_checkin" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"verification_token" text,
	"tos_accepted" boolean DEFAULT false,
	"phone_number" text,
	"phone_verified" boolean DEFAULT false,
	"phone_verification_token" text,
	"created_at" timestamp DEFAULT now(),
	"provider" text,
	"provider_id" text,
	"role" text DEFAULT 'user' NOT NULL,
	"package_type" text DEFAULT 'pathfinder' NOT NULL,
	"ai_helper_name" text DEFAULT 'Coach',
	"onboarding_completed" boolean DEFAULT false,
	"must_change_password" boolean DEFAULT false,
	"stripe_customer_id" text,
	"stripe_subscription_status" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_conversations" ADD CONSTRAINT "habit_conversations_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_conversations" ADD CONSTRAINT "habit_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_insights" ADD CONSTRAINT "habit_insights_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_insights" ADD CONSTRAINT "habit_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_responses" ADD CONSTRAINT "habit_responses_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_id_idx" ON "habits" USING btree ("user_id");