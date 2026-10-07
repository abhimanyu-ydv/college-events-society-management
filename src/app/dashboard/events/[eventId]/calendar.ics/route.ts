import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, venues } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { generateIcsFile } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  await requireAuth();
  const { eventId } = await params;

  const [row] = await db
    .select({ event: events, venue: venues })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(eq(events.id, eventId), eq(events.status, "approved")))
    .limit(1);

  if (!row) {
    return new NextResponse("Event not found", { status: 404 });
  }

  const ics = generateIcsFile({
    uid: `${row.event.id}@college-events-societies`,
    title: row.event.title,
    description: row.event.description,
    location: row.venue.name,
    startAt: row.event.startAt,
    endAt: row.event.endAt,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${row.event.id}.ics"`,
    },
  });
}
