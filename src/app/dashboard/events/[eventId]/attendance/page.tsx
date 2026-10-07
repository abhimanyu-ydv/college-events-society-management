import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, profiles, registrations } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";
import { markAttendanceByToken, toggleAttendance, finalizeAttendance } from "@/actions/attendance";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) notFound();

  await requireSocietyRole(event.societyId, ["head", "event_manager", "faculty_coordinator"]);

  if (event.status !== "approved") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          Attendance can only be taken for approved events.
        </p>
      </div>
    );
  }

  const roster = await db
    .select({ registration: registrations, profile: profiles })
    .from(registrations)
    .innerJoin(profiles, eq(registrations.profileId, profiles.id))
    .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")))
    .orderBy(asc(profiles.fullName));

  const finalized = !!event.attendanceFinalizedAt;
  const presentCount = roster.filter((r) => r.registration.attended).length;

  async function scan(formData: FormData) {
    "use server";
    await markAttendanceByToken(eventId, formData);
  }

  async function markPresent(registrationId: string) {
    "use server";
    await toggleAttendance(eventId, registrationId, true);
  }

  async function markAbsent(registrationId: string) {
    "use server";
    await toggleAttendance(eventId, registrationId, false);
  }

  async function finalize() {
    "use server";
    await finalizeAttendance(eventId);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Attendance — {event.title}</h1>
        <p className="mt-1 text-sm text-foreground/70">
          {presentCount} of {roster.length} marked present
          {finalized && " · finalized, certificates generated"}
        </p>
      </div>

      {!finalized && (
        <form action={scan} className="flex gap-2">
          <input
            name="qrToken"
            placeholder="Scan or enter ticket code"
            autoFocus
            className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Mark present
          </button>
        </form>
      )}

      <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
        {roster.map(({ registration, profile }) => (
          <li key={registration.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{profile.fullName}</p>
              <p className="text-xs text-foreground/60">{profile.email}</p>
            </div>
            {finalized ? (
              <span className="text-xs text-foreground/60">
                {registration.attended ? "Present" : "Absent"}
              </span>
            ) : registration.attended ? (
              <form action={markAbsent.bind(null, registration.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                >
                  Present — mark absent
                </button>
              </form>
            ) : (
              <form action={markPresent.bind(null, registration.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                >
                  Mark present
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {!finalized && (
        <form action={finalize}>
          <button
            type="submit"
            className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Finalize attendance &amp; generate certificates
          </button>
        </form>
      )}
    </div>
  );
}
