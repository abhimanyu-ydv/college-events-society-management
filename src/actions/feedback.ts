"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events, feedback, registrations } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function submitFeedback(eventId: string, formData: FormData) {
  const profile = await requireAuth();

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.endAt >= new Date()) {
    throw new Error("Feedback can only be submitted after an event has ended.");
  }

  const [registration] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.profileId, profile.id),
        eq(registrations.status, "registered"),
      ),
    )
    .limit(1);
  if (!registration) {
    throw new Error("Only registered attendees can leave feedback for this event.");
  }

  const parsed = feedbackSchema.parse({
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });

  await db
    .insert(feedback)
    .values({ eventId, profileId: profile.id, ...parsed })
    .onConflictDoUpdate({
      target: [feedback.eventId, feedback.profileId],
      set: parsed,
    });

  revalidatePath(`/dashboard/events/${eventId}`);
}
