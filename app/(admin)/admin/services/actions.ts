"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function createService(formData: FormData) {
  await requireAdmin();

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const businessId = String(
    formData.get("business_id") ?? ""
  ).trim();

  const durationRaw = String(
    formData.get("duration_minutes") ?? ""
  ).trim();

  const priceRaw = String(
    formData.get("price") ?? ""
  ).trim();

  if (!name) {
    throw new Error("Service name is required.");
  }

  if (!businessId) {
    throw new Error("Business is required.");
  }

  const durationMinutes = Number(durationRaw);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new Error(
      "Duration must be a positive whole number."
    );
  }

  let price: number | null = null;

  if (priceRaw) {
    price = Number(priceRaw);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(
        "Price must be a valid non-negative number."
      );
    }
  }

  // Verify that the selected business exists and is active.
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name, status")
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Selected business does not exist.");
  }

  if (business.status !== "ACTIVE") {
    throw new Error(
      "Services can only be added to active businesses."
    );
  }

  const { error } = await supabase
    .from("services")
    .insert({
      business_id: businessId,
      name,
      description: description || null,
      duration_minutes: durationMinutes,
      price,
      is_active: true,
    });

  if (error) {
    throw new Error(
      `Failed to create service: ${error.message}`
    );
  }

  revalidatePath("/admin/services");

  redirect("/admin/services");
}

export async function updateService(formData: FormData) {
  await requireAdmin();

  const supabase = await createClient();

  const serviceId = String(
    formData.get("service_id") ?? ""
  ).trim();

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const durationRaw = String(
    formData.get("duration_minutes") ?? ""
  ).trim();

  const priceRaw = String(
    formData.get("price") ?? ""
  ).trim();

  if (!serviceId) {
    throw new Error("Service ID is required.");
  }

  if (!name) {
    throw new Error("Service name is required.");
  }

  const durationMinutes = Number(durationRaw);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new Error(
      "Duration must be a positive whole number."
    );
  }

  let price: number | null = null;

  if (priceRaw) {
    price = Number(priceRaw);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(
        "Price must be a valid non-negative number."
      );
    }
  }

  const { data: existingService, error: serviceError } =
    await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .single();

  if (serviceError || !existingService) {
    throw new Error("Service does not exist.");
  }

  const { error } = await supabase
    .from("services")
    .update({
      name,
      description: description || null,
      duration_minutes: durationMinutes,
      price,
    })
    .eq("id", serviceId);

  if (error) {
    throw new Error(
      `Failed to update service: ${error.message}`
    );
  }

  revalidatePath("/admin/services");

  redirect("/admin/services");
}

export async function toggleServiceStatus(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const serviceId = String(
    formData.get("service_id") ?? ""
  ).trim();

  if (!serviceId) {
    throw new Error("Service ID is required.");
  }

  const { data: service, error: serviceError } =
    await supabase
      .from("services")
      .select("id, is_active")
      .eq("id", serviceId)
      .single();

  if (serviceError || !service) {
    throw new Error("Service does not exist.");
  }

  const { error } = await supabase
    .from("services")
    .update({
      is_active: !service.is_active,
    })
    .eq("id", serviceId);

  if (error) {
    throw new Error(
      `Failed to update service status: ${error.message}`
    );
  }

  revalidatePath("/admin/services");
}