"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, registrations, venues, type profiles } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { generateIcsFile } from "@/lib/calendar";
import { inngest } from "@/inngest/client";

async function notifyRegistration(
  profile: typeof profiles.$inferSelect,
  event: typeof events.$inferSelect,
  registration: typeof registrations.$inferSelect,
) {
  const [venue] = await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1);

  const isRegistered = registration.status === "registered";

  await sendEmail({
    to: profile.email,
    subject: isRegistered ? `You're registered: ${event.title}` : `You're on the waitlist: ${event.title}`,
    html: isRegistered
      ? `<p>You're registered for <strong>${event.title}</strong> on ${event.startAt.toLocaleString()} at ${venue?.name ?? "TBA"}.</p>`
      : `<p>You're on the waiting list for <strong>${event.title}</strong>. We'll register you automatically if a spot opens up.</p>`,
    attachments: isRegistered
      ? [
          {
            filename: "event.ics",
            content: Buffer.from(
              generateIcsFile({
                uid: `${event.id}@college-events-societies`,
                title: event.title,
                description: event.description,
                location: venue?.name ?? "TBA",
                startAt: event.startAt,
                endAt: event.endAt,
              }),
              "utf-8",
            ),
          },
        ]
      : undefined,
  });

  await inngest.send({
    name: "app/registration.created",
    data: { registrationId: registration.id },
  });
}

export async function registerForEvent(eventId: string) {
  const profile = await requireAuth();

  const result = await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event || event.status !== "approved") {
      throw new Error("This event is not open for registration.");
    }
    if (event.registrationDeadline && event.registrationDeadline < new Date()) {
      throw new Error("The registration deadline for this event has passed.");
    }

    const [{ registeredCount }] = await tx
      .select({ registeredCount: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")));

    const hasCapacity =
      event.registrationLimit == null || registeredCount < event.registrationLimit;

    const [registration] = await tx
      .insert(registrations)
      .values({
        eventId,
        profileId: profile.id,
        status: hasCapacity ? "registered" : "waitlisted",
        qrToken: crypto.randomUUID(),
      })
      .onConflictDoNothing()
      .returning();

    return { event, registration };
  });

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/registrations");

  if (result.registration) {
    await notifyRegistration(profile, result.event, result.registration);
  }
}

export async function cancelRegistration(eventId: string) {
  const profile = await requireAuth();

  await db.transaction(async (tx) => {
    const [registration] = await tx
      .select()
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.profileId, profile.id)))
      .limit(1);

    if (!registration || registration.status === "cancelled") return;

    const wasRegistered = registration.status === "registered";

    await tx
      .update(registrations)
      .set({ status: "cancelled" })
      .where(eq(registrations.id, registration.id));

    if (wasRegistered) {
      const [nextInLine] = await tx
        .select()
        .from(registrations)
        .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "waitlisted")))
        .orderBy(asc(registrations.registeredAt))
        .limit(1);

      if (nextInLine) {
        await tx
          .update(registrations)
          .set({ status: "registered" })
          .where(eq(registrations.id, nextInLine.id));
      }
    }
  });

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/registrations");
}
