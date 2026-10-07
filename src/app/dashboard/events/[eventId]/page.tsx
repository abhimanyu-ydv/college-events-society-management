import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, feedback, societies, societyMembers, venues, registrations } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  approveEventByAdmin,
  approveEventByCoordinator,
  getConflictingEvents,
  rejectEventByAdmin,
  rejectEventByCoordinator,
  cancelEvent,
} from "@/actions/events";
import { registerForEvent, cancelRegistration } from "@/actions/registrations";
import { submitFeedback } from "@/actions/feedback";

const STATUS_LABELS: Record<string, string> = {
  pending_coordinator: "Pending coordinator review",
  pending_admin: "Pending admin approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const profile = await requireAuth();

  const [row] = await db
    .select({ event: events, society: societies, venue: venues })
    .from(events)
    .innerJoin(societies, eq(events.societyId, societies.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!row) notFound();
  const { event, society, venue } = row;

  const [membership] = await db
    .select()
    .from(societyMembers)
    .where(
      and(
        eq(societyMembers.societyId, society.id),
        eq(societyMembers.profileId, profile.id),
        eq(societyMembers.status, "approved"),
      ),
    )
    .limit(1);

  const isCoordinator = profile.isAdmin || membership?.role === "faculty_coordinator";
  const canCancelEvent =
    profile.isAdmin || membership?.role === "head" || membership?.role === "faculty_coordinator";

  const conflicts =
    event.status === "pending_admin"
      ? await getConflictingEvents(event.venueId, event.startAt, event.endAt, event.id)
      : [];

  const [registration] = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.eventId, event.id), eq(registrations.profileId, profile.id)))
    .limit(1);

  const deadlinePassed = !!event.registrationDeadline && event.registrationDeadline < new Date();
  const eventHasEnded = event.endAt < new Date();

  const [myFeedback] = eventHasEnded
    ? await db
        .select()
        .from(feedback)
        .where(and(eq(feedback.eventId, event.id), eq(feedback.profileId, profile.id)))
        .limit(1)
    : [];

  async function approveCoordinator() {
    "use server";
    await approveEventByCoordinator(eventId);
  }
  async function rejectCoordinator(formData: FormData) {
    "use server";
    await rejectEventByCoordinator(eventId, formData);
  }
  async function approveAdmin() {
    "use server";
    await approveEventByAdmin(eventId);
  }
  async function rejectAdmin(formData: FormData) {
    "use server";
    await rejectEventByAdmin(eventId, formData);
  }
  async function cancel() {
    "use server";
    await cancelEvent(eventId);
  }
  async function register() {
    "use server";
    await registerForEvent(eventId);
  }
  async function cancelMyRegistration() {
    "use server";
    await cancelRegistration(eventId);
  }
  async function leaveFeedback(formData: FormData) {
    "use server";
    await submitFeedback(eventId, formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/dashboard/societies/${society.slug}`} className="text-sm text-foreground/60 hover:underline">
          {society.name}
        </Link>
        <h1 className="text-xl font-semibold">{event.title}</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {event.startAt.toLocaleString()} – {event.endAt.toLocaleString()} · {venue.name}
        </p>
        <p className="mt-1 inline-block rounded-md bg-foreground/10 px-2 py-0.5 text-xs">
          {STATUS_LABELS[event.status]}
        </p>
        {event.status === "approved" && (
          <Link
            href={`/dashboard/events/${event.id}/calendar.ics`}
            className="mt-2 block text-sm text-foreground/70 hover:text-foreground"
          >
            Add to calendar
          </Link>
        )}
      </div>

      {event.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.posterUrl} alt={`${event.title} poster`} className="max-h-80 rounded-md border border-foreground/10" />
      )}

      <p className="text-sm leading-relaxed text-foreground/80">{event.description}</p>

      {event.status === "rejected" && event.rejectionReason && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Rejected: {event.rejectionReason}
        </p>
      )}

      {event.status === "pending_coordinator" && isCoordinator && (
        <div className="space-y-3 rounded-md border border-foreground/10 p-4">
          <h2 className="font-medium">Coordinator review</h2>
          <form action={approveCoordinator}>
            <button
              type="submit"
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              Approve → send to admin
            </button>
          </form>
          <form action={rejectCoordinator} className="flex gap-2">
            <input
              name="reason"
              placeholder="Reason for rejection"
              required
              className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {event.status === "pending_admin" && profile.isAdmin && (
        <div className="space-y-3 rounded-md border border-foreground/10 p-4">
          <h2 className="font-medium">Admin review</h2>
          {conflicts.length > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <p>Conflicts with the venue &quot;{venue.name}&quot; at an overlapping time:</p>
              <ul className="mt-1 list-disc pl-5">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.title} ({c.startAt.toLocaleString()} – {c.endAt.toLocaleString()})
                  </li>
                ))}
              </ul>
              <p className="mt-1">Approval is blocked until this is resolved. Reject this event if it can&apos;t proceed.</p>
            </div>
          ) : (
            <form action={approveAdmin}>
              <button
                type="submit"
                className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
              >
                Approve event
              </button>
            </form>
          )}
          <form action={rejectAdmin} className="flex gap-2">
            <input
              name="reason"
              placeholder="Reason for rejection"
              required
              className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {event.status === "approved" && (
        <div className="space-y-3 rounded-md border border-foreground/10 p-4">
          {canCancelEvent && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/events/${event.id}/attendance`}
                className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
              >
                Take attendance
              </Link>
              <form action={cancel}>
                <button
                  type="submit"
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
                >
                  Cancel event
                </button>
              </form>
            </div>
          )}

          {!registration && !deadlinePassed && (
            <form action={register}>
              <button
                type="submit"
                className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
              >
                Register
              </button>
            </form>
          )}

          {!registration && deadlinePassed && (
            <p className="text-sm text-foreground/60">Registration is closed for this event.</p>
          )}

          {registration && registration.status !== "cancelled" && (
            <div className="space-y-2">
              <p className="text-sm">
                You are {registration.status === "registered" ? "registered" : "on the waiting list"} for this event.
              </p>
              <div className="flex gap-2">
                {registration.status === "registered" && (
                  <Link
                    href={`/dashboard/events/${event.id}/ticket`}
                    className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
                  >
                    View ticket
                  </Link>
                )}
                <form action={cancelMyRegistration}>
                  <button
                    type="submit"
                    className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
                  >
                    Cancel registration
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {eventHasEnded && registration?.status === "registered" && (
        <div className="space-y-3 rounded-md border border-foreground/10 p-4">
          <h2 className="font-medium">{myFeedback ? "Update your feedback" : "Leave feedback"}</h2>
          <form action={leaveFeedback} className="space-y-3">
            <div>
              <label htmlFor="rating" className="block text-sm font-medium">
                Rating
              </label>
              <select
                id="rating"
                name="rating"
                defaultValue={myFeedback?.rating ?? 5}
                className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="comment" className="block text-sm font-medium">
                Comment <span className="text-foreground/50">(optional)</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                defaultValue={myFeedback?.comment ?? ""}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              {myFeedback ? "Update feedback" : "Submit feedback"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
