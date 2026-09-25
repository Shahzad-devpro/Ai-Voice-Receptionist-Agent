"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

type AppointmentStatus =
  (typeof ALLOWED_STATUSES)[number];

export async function updateAppointmentStatus(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const appointmentId = String(
    formData.get("appointment_id") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim() as AppointmentStatus;

  if (!appointmentId) {
    throw new Error("Appointment ID is required.");
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid appointment status.");
  }

  const { data: appointment, error: appointmentError } =
    await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .single();

  if (appointmentError || !appointment) {
    throw new Error("Appointment does not exist.");
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status,
    })
    .eq("id", appointmentId);

  if (error) {
    throw new Error(
      `Failed to update appointment status: ${error.message}`
    );
  }

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${appointmentId}`);

  redirect(`/admin/appointments/${appointmentId}`);
}