import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, feedback, profiles, registrations, societies, venues } from "@/db/schema";

export async function getSocietyReport() {
  const allSocieties = await db.select().from(societies).orderBy(societies.name);

  const eventCounts = await db
    .select({ societyId: events.societyId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(events)
    .where(eq(events.status, "approved"))
    .groupBy(events.societyId);

  const registrationCounts = await db
    .select({ societyId: events.societyId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(eq(registrations.status, "registered"))
    .groupBy(events.societyId);

  const ratingStats = await db
    .select({
      societyId: events.societyId,
      avgRating: sql<number>`avg(${feedback.rating})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(feedback)
    .innerJoin(events, eq(feedback.eventId, events.id))
    .groupBy(events.societyId);

  const eventCountMap = new Map(eventCounts.map((r) => [r.societyId, r.count]));
  const regCountMap = new Map(registrationCounts.map((r) => [r.societyId, r.count]));
  const ratingMap = new Map(ratingStats.map((r) => [r.societyId, r]));

  return allSocieties.map((society) => ({
    society,
    eventCount: eventCountMap.get(society.id) ?? 0,
    registrationCount: regCountMap.get(society.id) ?? 0,
    avgRating: ratingMap.get(society.id)?.avgRating ?? null,
    feedbackCount: ratingMap.get(society.id)?.count ?? 0,
  }));
}

export async function getParticipationReport() {
  return db
    .select({
      branch: profiles.branch,
      year: profiles.year,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(registrations)
    .innerJoin(profiles, eq(registrations.profileId, profiles.id))
    .where(eq(registrations.status, "registered"))
    .groupBy(profiles.branch, profiles.year)
    .orderBy(profiles.branch, profiles.year);
}

export async function getVenueReport() {
  return db
    .select({
      venue: venues,
      eventCount: sql<number>`count(${events.id}) filter (where ${events.status} = 'approved')`.mapWith(Number),
    })
    .from(venues)
    .leftJoin(events, eq(events.venueId, venues.id))
    .groupBy(venues.id)
    .orderBy(venues.name);
}
