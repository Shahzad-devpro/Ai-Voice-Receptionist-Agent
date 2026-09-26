import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";

export type FindCustomerResult = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
};

export async function findCustomer(
  context: ToolContext,
  phone: string
): Promise<FindCustomerResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const cleanPhone = phone.trim();

  if (!cleanPhone) {
    throw new Error("Phone number is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address")
    .eq("business_id", context.businessId)
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    customer: data ?? null,
  };
}