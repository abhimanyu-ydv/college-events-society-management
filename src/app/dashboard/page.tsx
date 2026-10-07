import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { societies, societyMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export default async function DashboardHomePage() {
  const profile = await requireAuth();

  const memberships = await db
    .select({
      role: societyMembers.role,
      status: societyMembers.status,
      society: societies,
    })
    .from(societyMembers)
    .innerJoin(societies, eq(societyMembers.societyId, societies.id))
    .where(eq(societyMembers.profileId, profile.id));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {profile.fullName}</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Here&apos;s what&apos;s happening with your societies.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">My societies</h2>
          <Link href="/dashboard/societies" className="text-sm text-foreground/70 hover:text-foreground">
            Browse all societies →
          </Link>
        </div>

        {memberships.length === 0 ? (
          <p className="rounded-md border border-dashed border-foreground/20 px-4 py-6 text-center text-sm text-foreground/60">
            You haven&apos;t joined any societies yet.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
            {memberships.map(({ society, role, status }) => (
              <li key={society.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/dashboard/societies/${society.slug}`} className="font-medium hover:underline">
                    {society.name}
                  </Link>
                  <p className="text-xs text-foreground/60">
                    {role.replace("_", " ")} · {status}
                  </p>
                </div>
                {status === "approved" && (role === "head" || role === "event_manager" || role === "faculty_coordinator") && (
                  <Link
                    href={`/dashboard/societies/${society.slug}/manage`}
                    className="text-sm text-foreground/70 hover:text-foreground"
                  >
                    Manage
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
