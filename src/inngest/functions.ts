import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, profiles, registrations, venues } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { inngest } from "./client";

export const sendEventReminder = inngest.createFunction(
  { id: "send-event-reminder", triggers: [{ event: "app/registration.created" }] },
  async ({ event, step }) => {
    const { registrationId } = event.data as { registrationId: string };

    // Step output is JSON-serialized by Inngest and rehydrated on replay, so
    // dates are stored/read as ISO strings rather than Date instances here.
    const loaded = await step.run("load-registration", async () => {
      const [row] = await db
        .select({ registration: registrations, event: events, profile: profiles, venue: venues })
        .from(registrations)
        .innerJoin(events, eq(registrations.eventId, events.id))
        .innerJoin(profiles, eq(registrations.profileId, profiles.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(eq(registrations.id, registrationId))
        .limit(1);

      if (!row) return null;

      return {
        eventTitle: row.event.title,
        eventStartAt: row.event.startAt.toISOString(),
        venueName: row.venue.name,
        studentEmail: row.profile.email,
      };
    });

    if (!loaded) return;

    const startAt = new Date(loaded.eventStartAt);
    const reminderAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-until-reminder-time", reminderAt);

    const stillRegistered = await step.run("check-still-registered", async () => {
      const [current] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, registrationId))
        .limit(1);
      return current?.status === "registered";
    });

    if (!stillRegistered) return;

    await step.run("send-reminder-email", async () => {
      await sendEmail({
        to: loaded.studentEmail,
        subject: `Reminder: ${loaded.eventTitle} is coming up`,
        html: `<p>This is a reminder that <strong>${loaded.eventTitle}</strong> starts at ${startAt.toLocaleString()} at ${loaded.venueName}.</p>`,
      });
    });
  },
);
