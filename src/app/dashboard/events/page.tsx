import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { events, societies, venues } from "@/db/schema";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ society?: string }>;
}) {
  const { society: societySlugFilter } = await searchParams;

  const allSocieties = await db.select().from(societies).where(eq(societies.status, "active")).orderBy(societies.name);

  const conditions = [eq(events.status, "approved"), gte(events.startAt, new Date())];

  const filterSociety = societySlugFilter
    ? allSocieties.find((s) => s.slug === societySlugFilter)
    : undefined;
  if (filterSociety) conditions.push(eq(events.societyId, filterSociety.id));

  const upcomingEvents = await db
    .select({ event: events, society: societies, venue: venues })
    .from(events)
    .innerJoin(societies, eq(events.societyId, societies.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(asc(events.startAt));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Upcoming events</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/dashboard/events"
          className={`rounded-md border px-3 py-1 ${!societySlugFilter ? "border-foreground bg-foreground/10" : "border-foreground/20"}`}
        >
          All societies
        </Link>
        {allSocieties.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/events?society=${s.slug}`}
            className={`rounded-md border px-3 py-1 ${societySlugFilter === s.slug ? "border-foreground bg-foreground/10" : "border-foreground/20"}`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {upcomingEvents.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          No upcoming events.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {upcomingEvents.map(({ event, society, venue }) => (
            <li key={event.id} className="px-4 py-3">
              <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:underline">
                {event.title}
              </Link>
              <p className="text-xs text-foreground/60">
                {event.startAt.toLocaleString()} · {venue.name} · {society.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
