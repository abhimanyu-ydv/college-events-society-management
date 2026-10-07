"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { societies, societyMembers } from "@/db/schema";
import { requireAdmin, requireAuth, requireSocietyRole } from "@/lib/auth";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createSocietySchema = z.object({
  name: z.string().min(3).max(100),
  category: z.enum([
    "technical",
    "cultural",
    "sports",
    "literary",
    "departmental",
  ]),
  department: z.string().max(100).optional(),
  description: z.string().min(20).max(2000),
});

export async function createSocietyApplication(formData: FormData) {
  const profile = await requireAuth();

  const parsed = createSocietySchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    department: formData.get("department") || undefined,
    description: formData.get("description"),
  });

  const baseSlug = slugify(parsed.name);
  let slug = baseSlug;
  let suffix = 1;
  while (
    await db.query.societies.findFirst({ where: eq(societies.slug, slug) })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const [society] = await db
    .insert(societies)
    .values({ ...parsed, slug, createdBy: profile.id })
    .returning();

  revalidatePath("/dashboard/societies");
  revalidatePath("/dashboard/admin");
  return society;
}

export async function approveSociety(societyId: string) {
  await requireAdmin();

  const [society] = await db
    .update(societies)
    .set({ status: "active" })
    .where(eq(societies.id, societyId))
    .returning();

  if (society) {
    await db
      .insert(societyMembers)
      .values({
        societyId: society.id,
        profileId: society.createdBy,
        role: "head",
        status: "approved",
      })
      .onConflictDoNothing();
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/societies");
}

export async function rejectSociety(societyId: string) {
  await requireAdmin();

  await db
    .update(societies)
    .set({ status: "rejected" })
    .where(eq(societies.id, societyId));

  revalidatePath("/dashboard/admin");
}

export async function requestToJoin(societyId: string) {
  const profile = await requireAuth();

  await db
    .insert(societyMembers)
    .values({ societyId, profileId: profile.id, role: "member", status: "pending" })
    .onConflictDoNothing();

  revalidatePath(`/dashboard/societies`);
}

export async function approveMember(societyId: string, memberId: string) {
  await requireSocietyRole(societyId, ["head", "event_manager", "faculty_coordinator"]);

  await db
    .update(societyMembers)
    .set({ status: "approved" })
    .where(
      and(eq(societyMembers.id, memberId), eq(societyMembers.societyId, societyId)),
    );

  revalidatePath(`/dashboard/societies`);
}

export async function rejectMember(societyId: string, memberId: string) {
  await requireSocietyRole(societyId, ["head", "event_manager", "faculty_coordinator"]);

  await db
    .update(societyMembers)
    .set({ status: "rejected" })
    .where(
      and(eq(societyMembers.id, memberId), eq(societyMembers.societyId, societyId)),
    );

  revalidatePath(`/dashboard/societies`);
}

export async function removeMember(societyId: string, memberId: string) {
  await requireSocietyRole(societyId, ["head", "faculty_coordinator"]);

  await db
    .delete(societyMembers)
    .where(
      and(eq(societyMembers.id, memberId), eq(societyMembers.societyId, societyId)),
    );

  revalidatePath(`/dashboard/societies`);
}

const memberRoleSchema = z.enum(["member", "event_manager", "faculty_coordinator"]);

export async function updateMemberRole(societyId: string, memberId: string, formData: FormData) {
  await requireSocietyRole(societyId, ["head"]);

  const role = memberRoleSchema.parse(formData.get("role"));

  await db
    .update(societyMembers)
    .set({ role })
    .where(
      and(
        eq(societyMembers.id, memberId),
        eq(societyMembers.societyId, societyId),
        eq(societyMembers.status, "approved"),
      ),
    );

  revalidatePath(`/dashboard/societies`);
}
