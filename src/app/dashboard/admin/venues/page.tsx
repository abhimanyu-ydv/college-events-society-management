import { db } from "@/db";
import { venues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createVenue } from "@/actions/venues";

const VENUE_TYPES = ["auditorium", "seminar_hall", "laboratory", "ground"] as const;

export default async function AdminVenuesPage() {
  await requireAdmin();

  const allVenues = await db.select().from(venues).orderBy(venues.name);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold">Venues</h1>

      <form action={createVenue} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            required
            className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          >
            {VENUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium">
            Capacity <span className="text-foreground/50">(optional)</span>
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          Add venue
        </button>
      </form>

      {allVenues.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          No venues yet.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {allVenues.map((venue) => (
            <li key={venue.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{venue.name}</span>
              <span className="text-xs text-foreground/60">
                {venue.type.replace("_", " ")} {venue.capacity ? `· ${venue.capacity} seats` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
