"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, profiles, registrations, societies } from "@/db/schema";
import { requireSocietyRole } from "@/lib/auth";
import { getEventOrThrow } from "@/actions/events";
import { generateCertificatePdf } from "@/lib/certificate";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

async function assertAttendanceEditable(eventId: string) {
  const event = await getEventOrThrow(eventId);
  await requireSocietyRole(event.societyId, ["head", "event_manager", "faculty_coordinator"]);

  if (event.status !== "approved") {
    throw new Error("Attendance can only be taken for approved events.");
  }
  if (event.attendanceFinalizedAt) {
    throw new Error("Attendance has already been finalized for this event.");
  }

  return event;
}

export async function markAttendanceByToken(eventId: string, formData: FormData) {
  await assertAttendanceEditable(eventId);

  const qrToken = String(formData.get("qrToken") ?? "").trim();
  if (!qrToken) return;

  await db
    .update(registrations)
    .set({ attended: true, attendedAt: new Date() })
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.qrToken, qrToken),
        eq(registrations.status, "registered"),
      ),
    );

  revalidatePath(`/dashboard/events/${eventId}/attendance`);
}

export async function toggleAttendance(eventId: string, registrationId: string, present: boolean) {
  await assertAttendanceEditable(eventId);

  await db
    .update(registrations)
    .set({ attended: present, attendedAt: present ? new Date() : null })
    .where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId)));

  revalidatePath(`/dashboard/events/${eventId}/attendance`);
}

export async function finalizeAttendance(eventId: string) {
  const event = await assertAttendanceEditable(eventId);

  const [society] = await db.select().from(societies).where(eq(societies.id, event.societyId)).limit(1);

  const attendedRegistrations = await db
    .select({ registration: registrations, profile: profiles })
    .from(registrations)
    .innerJoin(profiles, eq(registrations.profileId, profiles.id))
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.status, "registered"),
        eq(registrations.attended, true),
      ),
    );

  const admin = createAdminClient();

  for (const { registration, profile } of attendedRegistrations) {
    const pdfBytes = await generateCertificatePdf({
      studentName: profile.fullName,
      eventTitle: event.title,
      societyName: society.name,
      eventDate: event.startAt,
    });

    const path = `${eventId}/${registration.id}.pdf`;
    const { error } = await admin.storage
      .from("certificates")
      .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

    if (error) continue;

    const { data } = admin.storage.from("certificates").getPublicUrl(path);
    await db
      .update(registrations)
      .set({ certificateUrl: data.publicUrl })
      .where(eq(registrations.id, registration.id));

    await sendEmail({
      to: profile.email,
      subject: `Your certificate for ${event.title}`,
      html: `<p>Thanks for attending <strong>${event.title}</strong>. Your certificate of participation is attached.</p>`,
      attachments: [
        { filename: `${profile.fullName} - ${event.title}.pdf`, content: Buffer.from(pdfBytes) },
      ],
    });
  }

  await db.update(events).set({ attendanceFinalizedAt: new Date() }).where(eq(events.id, eventId));

  revalidatePath(`/dashboard/events/${eventId}/attendance`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/registrations");
}
