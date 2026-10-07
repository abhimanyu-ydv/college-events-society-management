import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, societies, societyMembers } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";
import { approveMember, rejectMember, removeMember, updateMemberRole } from "@/actions/societies";

const ASSIGNABLE_ROLES = ["member", "event_manager", "faculty_coordinator"] as const;

export default async function ManageSocietyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [society] = await db
    .select()
    .from(societies)
    .where(eq(societies.slug, slug))
    .limit(1);

  if (!society) notFound();

  await requireSocietyRole(society.id, ["head", "event_manager", "faculty_coordinator"]);

  const members = await db
    .select({ member: societyMembers, profile: profiles })
    .from(societyMembers)
    .innerJoin(profiles, eq(societyMembers.profileId, profiles.id))
    .where(eq(societyMembers.societyId, society.id));

  const pending = members.filter((m) => m.member.status === "pending");
  const approved = members.filter((m) => m.member.status === "approved");

  async function approve(memberId: string) {
    "use server";
    await approveMember(society.id, memberId);
  }

  async function reject(memberId: string) {
    "use server";
    await rejectMember(society.id, memberId);
  }

  async function remove(memberId: string) {
    "use server";
    await removeMember(society.id, memberId);
  }

  async function changeRole(memberId: string, formData: FormData) {
    "use server";
    await updateMemberRole(society.id, memberId, formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manage {society.name}</h1>
          <p className="mt-1 text-sm text-foreground/70">Review membership requests and manage your roster.</p>
        </div>
        <a
          href={`/dashboard/societies/${slug}/manage/members.csv`}
          className="text-sm text-foreground/70 hover:text-foreground"
        >
          Export members (CSV)
        </a>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Pending requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-foreground/60">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
            {pending.map(({ member, profile }) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{profile.fullName}</p>
                  <p className="text-xs text-foreground/60">{profile.email}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approve.bind(null, member.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={reject.bind(null, member.id)}>
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
        <h2 className="font-medium">Members ({approved.length})</h2>
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {approved.map(({ member, profile }) => (
            <li key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{profile.fullName}</p>
                <p className="text-xs text-foreground/60">
                  {profile.email} · {member.role.replace("_", " ")}
                </p>
              </div>
              {member.role !== "head" && (
                <div className="flex items-center gap-2">
                  <form action={changeRole.bind(null, member.id)} className="flex items-center gap-1">
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs"
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-2 py-1 text-xs font-medium transition hover:bg-foreground/5"
                    >
                      Save
                    </button>
                  </form>
                  <form action={remove.bind(null, member.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
