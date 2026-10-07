import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, registrations, venues } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export default async function MyRegistrationsPage() {
  const profile = await requireAuth();

  const myRegistrations = await db
    .select({ registration: registrations, event: events, venue: venues })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(registrations.profileId, profile.id));

  const active = myRegistrations.filter((r) => r.registration.status !== "cancelled");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">My registrations</h1>

      {active.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          You haven&apos;t registered for any events yet.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {active.map(({ registration, event, venue }) => (
            <li key={registration.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:underline">
                  {event.title}
                </Link>
                <p className="text-xs text-foreground/60">
                  {event.startAt.toLocaleString()} · {venue.name} ·{" "}
                  {registration.status === "registered" ? "Registered" : "Waitlisted"}
                </p>
              </div>
              <div className="flex gap-3">
                {registration.status === "registered" && (
                  <Link
                    href={`/dashboard/events/${event.id}/ticket`}
                    className="text-sm text-foreground/70 hover:text-foreground"
                  >
                    View ticket
                  </Link>
                )}
                {registration.certificateUrl && (
                  <a
                    href={registration.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground/70 hover:text-foreground"
                  >
                    Certificate
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
