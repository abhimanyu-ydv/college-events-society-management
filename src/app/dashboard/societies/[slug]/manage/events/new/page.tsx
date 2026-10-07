import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { societies, venues } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";
import { createEvent } from "@/actions/events";
import { PosterUpload } from "./poster-upload";
import { AiDraftButton } from "./ai-draft-button";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [society] = await db.select().from(societies).where(eq(societies.slug, slug)).limit(1);
  if (!society) notFound();

  await requireSocietyRole(society.id, ["head", "event_manager"]);

  const allVenues = await db.select().from(venues).orderBy(venues.name);

  async function submit(formData: FormData) {
    "use server";
    await createEvent(society.id, formData);
    redirect(`/dashboard/societies/${slug}/manage/events`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New event</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Submitted events go to your faculty coordinator for review, then the university administration.
        </p>
      </div>

      {allVenues.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          No venues have been added yet. Ask an administrator to add one under Admin → Venues before
          creating an event.
        </p>
      ) : (
        <form action={submit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={150}
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <AiDraftButton societyName={society.name} />

          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={4000}
              rows={5}
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="venueId" className="block text-sm font-medium">
              Venue
            </label>
            <select
              id="venueId"
              name="venueId"
              required
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            >
              {allVenues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} ({venue.type.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startAt" className="block text-sm font-medium">
                Start
              </label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                required
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="endAt" className="block text-sm font-medium">
                End
              </label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                required
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="registrationLimit" className="block text-sm font-medium">
                Registration limit <span className="text-foreground/50">(optional)</span>
              </label>
              <input
                id="registrationLimit"
                name="registrationLimit"
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="registrationDeadline" className="block text-sm font-medium">
                Registration deadline <span className="text-foreground/50">(optional)</span>
              </label>
              <input
                id="registrationDeadline"
                name="registrationDeadline"
                type="datetime-local"
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <PosterUpload />

          <button
            type="submit"
            className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Submit for approval
          </button>
        </form>
      )}
    </div>
  );
}
