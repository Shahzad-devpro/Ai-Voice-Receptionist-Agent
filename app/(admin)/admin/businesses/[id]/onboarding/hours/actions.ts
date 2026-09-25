"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

type DayHours = {
  open: string;
  close: string;
};

type BusinessHours = Record<string, DayHours | null>;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
}

export async function saveBusinessHours(
  businessId: string,
  formData: FormData
) {
  await requireAdmin();

  if (!businessId) {
    throw new Error("Business ID is required.");
  }

  const supabase = await createClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    throw new Error("Business not found.");
  }

  if (!isValidTimezone(business.timezone)) {
    throw new Error("The business has an invalid IANA timezone.");
  }

  const businessHours: BusinessHours = {};

  for (const day of DAYS) {
    const enabled = formData.get(`${day}_enabled`) === "on";

    if (!enabled) {
      businessHours[day] = null;
      continue;
    }

    const open = String(formData.get(`${day}_open`) ?? "").trim();
    const close = String(formData.get(`${day}_close`) ?? "").trim();

    if (!isValidTime(open) || !isValidTime(close)) {
      throw new Error(
        `Invalid opening or closing time for ${day}.`
      );
    }

    if (open >= close) {
      throw new Error(
        `Closing time must be later than opening time for ${day}.`
      );
    }

    businessHours[day] = {
      open,
      close,
    };
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      business_hours: businessHours,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(
    `/admin/businesses/${businessId}/onboarding`
  );

  revalidatePath(
    `/admin/businesses/${businessId}/onboarding/hours`
  );

  redirect(
    `/admin/businesses/${businessId}/onboarding/services`
  );
}