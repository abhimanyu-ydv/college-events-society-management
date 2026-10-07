import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, registrations, venues } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { generateTicketQrDataUrl } from "@/lib/qr";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const profile = await requireAuth();

  const [row] = await db
    .select({ event: events, venue: venues, registration: registrations })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(eq(registrations.eventId, eventId), eq(registrations.profileId, profile.id)))
    .limit(1);

  if (!row || row.registration.status !== "registered") notFound();
  const { event, venue, registration } = row;

  const qrDataUrl = await generateTicketQrDataUrl(registration.qrToken);

  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-md border border-foreground/10 p-6 text-center">
      <h1 className="text-lg font-semibold">{event.title}</h1>
      <p className="text-sm text-foreground/70">
        {event.startAt.toLocaleString()} · {venue.name}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Entry QR ticket" className="mx-auto" width={240} height={240} />
      <p className="text-xs text-foreground/50">Show this code at the venue for attendance.</p>
      <Link
        href={`/dashboard/events/${event.id}/calendar.ics`}
        className="inline-block text-sm text-foreground/70 hover:text-foreground"
      >
        Add to calendar
      </Link>
      {registration.certificateUrl && (
        <a
          href={registration.certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          Download certificate
        </a>
      )}
    </div>
  );
}
