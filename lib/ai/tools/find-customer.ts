import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";
import { normalizePhone } from "./normalize-phone";

export type FindCustomerInput = {
  phone: string;
};

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
  input: FindCustomerInput
): Promise<FindCustomerResult> {
  if (!context.businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  const supabase = await createClient();

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("country")
    .eq("id", context.businessId)
    .single();

  if (businessError || !business) {
    console.error(
      "Failed to load business country:",
      businessError
    );

    throw new Error(
      "Failed to load business information."
    );
  }

  const normalizedPhone = normalizePhone(
    input.phone,
    business.country
  );

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, address"
    )
    .eq(
      "business_id",
      context.businessId
    )
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to find customer:",
      error
    );

    throw new Error(
      "Failed to find customer."
    );
  }

  return {
    customer: data
      ? {
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
        }
      : null,
  };
}