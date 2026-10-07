import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const societyCategoryEnum = pgEnum("society_category", [
  "technical",
  "cultural",
  "sports",
  "literary",
  "departmental",
]);

export const societyStatusEnum = pgEnum("society_status", [
  "pending",
  "active",
  "rejected",
]);

export const societyMemberRoleEnum = pgEnum("society_member_role", [
  "member",
  "event_manager",
  "head",
  "faculty_coordinator",
]);

export const societyMemberStatusEnum = pgEnum("society_member_status", [
  "pending",
  "approved",
  "rejected",
]);

export const venueTypeEnum = pgEnum("venue_type", [
  "auditorium",
  "seminar_hall",
  "laboratory",
  "ground",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "pending_coordinator",
  "pending_admin",
  "approved",
  "rejected",
  "cancelled",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  rollNumber: text("roll_number"),
  branch: text("branch"),
  year: integer("year"),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const societies = pgTable("societies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: societyCategoryEnum("category").notNull(),
  department: text("department"),
  description: text("description").notNull(),
  status: societyStatusEnum("status").notNull().default("pending"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const societyMembers = pgTable(
  "society_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    societyId: uuid("society_id")
      .notNull()
      .references(() => societies.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: societyMemberRoleEnum("role").notNull().default("member"),
    status: societyMemberStatusEnum("status").notNull().default("pending"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("society_members_society_profile_idx").on(
      table.societyId,
      table.profileId,
    ),
  ],
);

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  type: venueTypeEnum("type").notNull(),
  capacity: integer("capacity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id")
    .notNull()
    .references(() => societies.id, { onDelete: "cascade" }),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  posterUrl: text("poster_url"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  registrationLimit: integer("registration_limit"),
  registrationDeadline: timestamp("registration_deadline", { withTimezone: true }),
  status: eventStatusEnum("status").notNull().default("pending_coordinator"),
  rejectionReason: text("rejection_reason"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  coordinatorApprovedBy: uuid("coordinator_approved_by").references(() => profiles.id),
  adminApprovedBy: uuid("admin_approved_by").references(() => profiles.id),
  attendanceFinalizedAt: timestamp("attendance_finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: registrationStatusEnum("status").notNull().default("registered"),
    qrToken: text("qr_token").notNull().unique(),
    attended: boolean("attended").notNull().default(false),
    attendedAt: timestamp("attended_at", { withTimezone: true }),
    certificateUrl: text("certificate_url"),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("registrations_event_profile_idx").on(table.eventId, table.profileId),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("feedback_event_profile_idx").on(table.eventId, table.profileId)],
);
