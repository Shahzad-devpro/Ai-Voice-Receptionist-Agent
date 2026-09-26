import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";

export type CreateCustomerInput = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export type CreateCustomerResult = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
};

export async function createCustomer(
  context: ToolContext,
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim() || null;
  const address = input.address?.trim() || null;

  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (!phone) {
    throw new Error("Customer phone number is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: context.businessId,
      name,
      phone,
      email,
      address,
    })
    .select("id, name, phone, email, address")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A customer with this phone number already exists for this business."
      );
    }

    throw new Error(error.message);
  }

  return {
    customer: data,
  };
}