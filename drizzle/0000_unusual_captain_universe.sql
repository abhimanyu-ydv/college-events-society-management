CREATE TYPE "public"."society_category" AS ENUM('technical', 'cultural', 'sports', 'literary', 'departmental');--> statement-breakpoint
CREATE TYPE "public"."society_member_role" AS ENUM('member', 'event_manager', 'head', 'faculty_coordinator');--> statement-breakpoint
CREATE TYPE "public"."society_member_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."society_status" AS ENUM('pending', 'active', 'rejected');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"roll_number" text,
	"branch" text,
	"year" integer,
	"avatar_url" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "societies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "society_category" NOT NULL,
	"department" text,
	"description" text NOT NULL,
	"status" "society_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "societies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "society_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"society_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "society_member_role" DEFAULT 'member' NOT NULL,
	"status" "society_member_status" DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "societies" ADD CONSTRAINT "societies_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "society_members" ADD CONSTRAINT "society_members_society_id_societies_id_fk" FOREIGN KEY ("society_id") REFERENCES "public"."societies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "society_members" ADD CONSTRAINT "society_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "society_members_society_profile_idx" ON "society_members" USING btree ("society_id","profile_id");