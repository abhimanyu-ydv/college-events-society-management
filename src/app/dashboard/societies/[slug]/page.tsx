import { notFound } from "next/navigation";
import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { societies, societyMembers } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { requestToJoin } from "@/actions/societies";

export default async function SocietyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getCurrentProfile();

  const [society] = await db
    .select()
    .from(societies)
    .where(eq(societies.slug, slug))
    .limit(1);

  if (!society) notFound();

  const isOwnerOrAdmin = profile && (profile.isAdmin || profile.id === society.createdBy);
  if (society.status !== "active" && !isOwnerOrAdmin) notFound();

  const [{ memberCount }] = await db
    .select({ memberCount: count() })
    .from(societyMembers)
    .where(and(eq(societyMembers.societyId, society.id), eq(societyMembers.status, "approved")));

  const membership = profile
    ? (
        await db
          .select()
          .from(societyMembers)
          .where(
            and(eq(societyMembers.societyId, society.id), eq(societyMembers.profileId, profile.id)),
          )
          .limit(1)
      )[0]
    : undefined;

  const canManage =
    profile?.isAdmin ||
    (membership?.status === "approved" &&
      ["head", "event_manager", "faculty_coordinator"].includes(membership.role));

  async function join() {
    "use server";
    await requestToJoin(society.id);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{society.name}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {society.category} {society.department ? `· ${society.department}` : ""} · {memberCount} members
          </p>
          {society.status !== "active" && (
            <p className="mt-2 inline-block rounded-md bg-foreground/10 px-2 py-0.5 text-xs">
              {society.status === "pending" ? "Pending admin approval" : "Rejected"}
            </p>
          )}
        </div>
        {canManage && (
          <Link
            href={`/dashboard/societies/${society.slug}/manage`}
            className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5"
          >
            Manage
          </Link>
        )}
      </div>

      <p className="text-sm leading-relaxed text-foreground/80">{society.description}</p>

      {profile && society.status === "active" && !membership && (
        <form action={join}>
          <button
            type="submit"
            className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Request to join
          </button>
        </form>
      )}

      {membership && membership.status === "pending" && (
        <p className="text-sm text-foreground/60">Your request to join is pending approval.</p>
      )}
      {membership && membership.status === "rejected" && (
        <p className="text-sm text-foreground/60">Your request to join was not approved.</p>
      )}
    </div>
  );
}
