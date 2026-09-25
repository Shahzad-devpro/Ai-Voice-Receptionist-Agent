"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type CreateServiceState = {
  error?: string;
  success?: boolean;
};

export async function createOnboardingService(
  businessId: string,
  _previousState: CreateServiceState,
  formData: FormData
): Promise<CreateServiceState> {
  await requireAdmin();

  if (!businessId) {
    return {
      error: "Business ID is required.",
    };
  }

  const supabase = await createClient();

  // Verify the business exists.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    return {
      error: "Business not found.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const durationRaw = String(
    formData.get("duration_minutes") ?? ""
  ).trim();

  const priceRaw = String(
    formData.get("price") ?? ""
  ).trim();

  if (!name) {
    return {
      error: "Service name is required.",
    };
  }

  const duration = Number(durationRaw);

  if (
    !Number.isInteger(duration) ||
    duration <= 0 ||
    duration > 1440
  ) {
    return {
      error: "Duration must be a whole number between 1 and 1440 minutes.",
    };
  }

  let price: number | null = null;

  if (priceRaw) {
    price = Number(priceRaw);

    if (!Number.isFinite(price) || price < 0) {
      return {
        error: "Price must be a valid non-negative number.",
      };
    }

    price = Math.round(price * 100) / 100;
  }

  const { error: insertError } = await supabase
    .from("services")
    .insert({
      business_id: businessId,
      name,
      description: description || null,
      duration_minutes: duration,
      price,
      is_active: true,
    });

  if (insertError) {
    return {
      error: insertError.message,
    };
  }

  revalidatePath(
    `/admin/businesses/${businessId}/onboarding/services`
  );

  return {
    success: true,
  };
}