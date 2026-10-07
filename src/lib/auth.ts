import "server-only";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles, societyMembers, type societyMemberRoleEnum } from "@/db/schema";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return profile ?? null;
}

export async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin() {
  const profile = await requireAuth();
  if (!profile.isAdmin) redirect("/dashboard");
  return profile;
}

type SocietyMemberRole = (typeof societyMemberRoleEnum.enumValues)[number];

export async function requireSocietyRole(
  societyId: string,
  roles: SocietyMemberRole[],
) {
  const profile = await requireAuth();

  if (profile.isAdmin) return profile;

  const [membership] = await db
    .select()
    .from(societyMembers)
    .where(
      and(
        eq(societyMembers.societyId, societyId),
        eq(societyMembers.profileId, profile.id),
        eq(societyMembers.status, "approved"),
        inArray(societyMembers.role, roles),
      ),
    )
    .limit(1);

  if (!membership) redirect("/dashboard");

  return profile;
}
