import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, societies } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  pending_coordinator: "Pending coordinator review",
  pending_admin: "Pending admin approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default async function SocietyEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [society] = await db.select().from(societies).where(eq(societies.slug, slug)).limit(1);
  if (!society) notFound();

  await requireSocietyRole(society.id, ["head", "event_manager", "faculty_coordinator"]);

  const societyEvents = await db
    .select()
    .from(events)
    .where(eq(events.societyId, society.id))
    .orderBy(desc(events.startAt));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{society.name} — events</h1>
        <Link
          href={`/dashboard/societies/${slug}/manage/events/new`}
          className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
        >
          New event
        </Link>
      </div>

      {societyEvents.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          No events yet.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {societyEvents.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:underline">
                {event.title}
              </Link>
              <p className="text-xs text-foreground/60">
                {event.startAt.toLocaleString()} · {STATUS_LABELS[event.status]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
