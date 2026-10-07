import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, societies, societyMembers } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [society] = await db.select().from(societies).where(eq(societies.slug, slug)).limit(1);
  if (!society) {
    return new NextResponse("Society not found", { status: 404 });
  }

  await requireSocietyRole(society.id, ["head", "event_manager", "faculty_coordinator"]);

  const members = await db
    .select({ member: societyMembers, profile: profiles })
    .from(societyMembers)
    .innerJoin(profiles, eq(societyMembers.profileId, profiles.id))
    .where(and(eq(societyMembers.societyId, society.id), eq(societyMembers.status, "approved")));

  const csv = toCsv(
    members.map(({ member, profile }) => ({
      name: profile.fullName,
      email: profile.email,
      rollNumber: profile.rollNumber ?? "",
      branch: profile.branch ?? "",
      year: profile.year ?? "",
      role: member.role,
      joinedAt: member.joinedAt.toISOString().slice(0, 10),
    })),
    [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "rollNumber", label: "Roll number" },
      { key: "branch", label: "Branch" },
      { key: "year", label: "Year" },
      { key: "role", label: "Role" },
      { key: "joinedAt", label: "Joined" },
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-members.csv"`,
    },
  });
}
