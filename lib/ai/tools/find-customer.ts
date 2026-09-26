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

  const normalizedPhone = normalizePhone(
    input.phone
  );

  const supabase = await createClient();

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
    throw new Error(error.message);
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