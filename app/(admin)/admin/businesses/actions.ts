"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type CreateBusinessState = {
  error?: string;
  success?: boolean;
};

export async function createBusiness(
  _previousState: CreateBusinessState,
  formData: FormData
): Promise<CreateBusinessState> {
  await requireAdmin();

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  const serviceArea = String(formData.get("service_area") ?? "").trim();
  const aiInstructions = String(
    formData.get("ai_instructions") ?? ""
  ).trim();

  if (!name) {
    return { error: "Business name is required." };
  }

  if (!["HVAC", "CLEANING", "DENTAL"].includes(industry)) {
    return { error: "Invalid industry." };
  }

  if (!country) {
    return { error: "Country is required." };
  }

  if (!timezone) {
    return { error: "Timezone is required." };
  }

  if (!currency) {
    return { error: "Currency is required." };
  }

  if (!locale) {
    return { error: "Locale is required." };
  }

  const { error } = await supabase.from("businesses").insert({
    name,
    industry,
    country,
    phone: phone || null,
    email: email || null,
    address: address || null,
    timezone,
    currency,
    locale,
    service_area: serviceArea || null,
    business_hours: {
      monday: {
        open: "09:00",
        close: "17:00",
      },
      tuesday: {
        open: "09:00",
        close: "17:00",
      },
      wednesday: {
        open: "09:00",
        close: "17:00",
      },
      thursday: {
        open: "09:00",
        close: "17:00",
      },
      friday: {
        open: "09:00",
        close: "17:00",
      },
      saturday: null,
      sunday: null,
    },
    ai_instructions: aiInstructions || null,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidatePath("/admin/businesses");

  return {
    success: true,
  };
}