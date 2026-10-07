"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

const createVenueSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["auditorium", "seminar_hall", "laboratory", "ground"]),
  capacity: z.coerce.number().int().positive().optional(),
});

export async function createVenue(formData: FormData) {
  await requireAdmin();

  const parsed = createVenueSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: formData.get("capacity") || undefined,
  });

  await db.insert(venues).values(parsed);

  revalidatePath("/dashboard/admin/venues");
}
