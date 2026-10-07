"use server";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin, requireSocietyRole } from "@/lib/auth";

const createEventSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(20).max(4000),
  venueId: z.string().uuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  registrationLimit: z.coerce.number().int().positive().optional(),
  registrationDeadline: z.coerce.date().optional(),
  posterUrl: z.string().url().optional(),
});

export async function createEvent(societyId: string, formData: FormData) {
  const profile = await requireSocietyRole(societyId, ["head", "event_manager"]);

  const parsed = createEventSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    venueId: formData.get("venueId"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    registrationLimit: formData.get("registrationLimit") || undefined,
    registrationDeadline: formData.get("registrationDeadline") || undefined,
    posterUrl: formData.get("posterUrl") || undefined,
  });

  if (parsed.endAt <= parsed.startAt) {
    throw new Error("End time must be after the start time.");
  }

  const [event] = await db
    .insert(events)
    .values({ ...parsed, societyId, createdBy: profile.id })
    .returning();

  revalidatePath(`/dashboard/societies`);
  return event;
}

export async function getConflictingEvents(
  venueId: string,
  startAt: Date,
  endAt: Date,
  excludeEventId: string,
) {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.venueId, venueId),
        eq(events.status, "approved"),
        ne(events.id, excludeEventId),
        lt(events.startAt, endAt),
        gt(events.endAt, startAt),
      ),
    );
}

export async function getEventOrThrow(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("Event not found.");
  return event;
}

export async function approveEventByCoordinator(eventId: string) {
  const event = await getEventOrThrow(eventId);
  await requireSocietyRole(event.societyId, ["faculty_coordinator"]);

  await db
    .update(events)
    .set({ status: "pending_admin" })
    .where(and(eq(events.id, eventId), eq(events.status, "pending_coordinator")));

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function rejectEventByCoordinator(eventId: string, formData: FormData) {
  const reason = z.string().min(3).max(500).parse(formData.get("reason"));
  const event = await getEventOrThrow(eventId);
  await requireSocietyRole(event.societyId, ["faculty_coordinator"]);

  await db
    .update(events)
    .set({ status: "rejected", rejectionReason: reason })
    .where(and(eq(events.id, eventId), eq(events.status, "pending_coordinator")));

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function approveEventByAdmin(eventId: string) {
  const profile = await requireAdmin();
  const event = await getEventOrThrow(eventId);

  const conflicts = await getConflictingEvents(event.venueId, event.startAt, event.endAt, event.id);
  if (conflicts.length > 0) {
    throw new Error("This event conflicts with another approved event at the same venue.");
  }

  await db
    .update(events)
    .set({ status: "approved", adminApprovedBy: profile.id })
    .where(and(eq(events.id, eventId), eq(events.status, "pending_admin")));

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
}

export async function rejectEventByAdmin(eventId: string, formData: FormData) {
  const reason = z.string().min(3).max(500).parse(formData.get("reason"));
  await requireAdmin();

  await db
    .update(events)
    .set({ status: "rejected", rejectionReason: reason })
    .where(and(eq(events.id, eventId), eq(events.status, "pending_admin")));

  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function cancelEvent(eventId: string) {
  const event = await getEventOrThrow(eventId);
  await requireSocietyRole(event.societyId, ["head", "faculty_coordinator"]);

  await db
    .update(events)
    .set({ status: "cancelled" })
    .where(eq(events.id, eventId));

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
}
