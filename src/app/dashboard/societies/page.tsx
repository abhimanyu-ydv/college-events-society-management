import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { societies } from "@/db/schema";

export default async function SocietiesPage() {
  const activeSocieties = await db
    .select()
    .from(societies)
    .where(eq(societies.status, "active"))
    .orderBy(societies.name);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Societies</h1>
        <Link
          href="/dashboard/societies/new"
          className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
        >
          Apply to start a society
        </Link>
      </div>

      {activeSocieties.length === 0 ? (
        <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
          No active societies yet.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {activeSocieties.map((society) => (
            <li key={society.id} className="px-4 py-3">
              <Link href={`/dashboard/societies/${society.slug}`} className="font-medium hover:underline">
                {society.name}
              </Link>
              <p className="text-xs text-foreground/60">
                {society.category} {society.department ? `· ${society.department}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
