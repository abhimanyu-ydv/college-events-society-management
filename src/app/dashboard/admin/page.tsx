import Link from "next/link";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles, societies } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { approveSociety, rejectSociety } from "@/actions/societies";

export default async function AdminPage() {
  await requireAdmin();

  const pendingSocieties = await db
    .select({ society: societies, applicant: profiles })
    .from(societies)
    .innerJoin(profiles, eq(societies.createdBy, profiles.id))
    .where(eq(societies.status, "pending"));

  const otherSocieties = await db
    .select()
    .from(societies)
    .where(ne(societies.status, "pending"))
    .orderBy(societies.name);

  async function approve(societyId: string) {
    "use server";
    await approveSociety(societyId);
  }

  async function reject(societyId: string) {
    "use server";
    await rejectSociety(societyId);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <div className="flex gap-4">
          <Link href="/dashboard/admin/venues" className="text-sm text-foreground/70 hover:text-foreground">
            Manage venues →
          </Link>
          <Link href="/dashboard/admin/reports" className="text-sm text-foreground/70 hover:text-foreground">
            Reports →
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Pending society applications ({pendingSocieties.length})</h2>
        {pendingSocieties.length === 0 ? (
          <p className="text-sm text-foreground/60">No pending applications.</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
            {pendingSocieties.map(({ society, applicant }) => (
              <li key={society.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{society.name}</p>
                  <p className="text-xs text-foreground/60">
                    {society.category} · applied by {applicant.fullName} ({applicant.email})
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">{society.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approve.bind(null, society.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={reject.bind(null, society.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">All societies</h2>
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {otherSocieties.map((society) => (
            <li key={society.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{society.name}</span>
              <span className="text-xs text-foreground/60">{society.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
