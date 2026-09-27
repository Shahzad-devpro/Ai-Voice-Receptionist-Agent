import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";
import { normalizePhone } from "./normalize-phone";

export type UpdateCustomerInput = {
  customerId: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type UpdateCustomerResult = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
};

export async function updateCustomer(
  context: ToolContext,
  input: UpdateCustomerInput
): Promise<UpdateCustomerResult> {
  if (!context.businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  const customerId =
    input.customerId?.trim();

  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  const supabase = await createClient();

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("country, industry")
    .eq("id", context.businessId)
    .single();

  if (businessError || !business) {
    console.error(
      "Failed to load business information:",
      businessError
    );

    throw new Error(
      "Failed to load business information."
    );
  }

  const {
    data: existingCustomer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, address"
    )
    .eq("id", customerId)
    .eq(
      "business_id",
      context.businessId
    )
    .maybeSingle();

  if (customerError) {
    console.error(
      "Failed to load customer:",
      customerError
    );

    throw new Error(
      "Failed to load customer information."
    );
  }

  if (!existingCustomer) {
    throw new Error(
      "Customer was not found for this business."
    );
  }

  const updates: {
    name?: string;
    phone?: string;
    email?: string | null;
    address?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name =
      input.name.trim();

    if (!name) {
      throw new Error(
        "Customer name is required."
      );
    }

    updates.name = name;
  }

  if (input.phone !== undefined) {
    const phoneInput =
      input.phone.trim();

    if (!phoneInput) {
      throw new Error(
        "Customer phone number is required."
      );
    }

    updates.phone =
      normalizePhone(
        phoneInput,
        business.country
      );
  }

  if (input.email !== undefined) {
    updates.email =
      input.email.trim() || null;
  }

  if (input.address !== undefined) {
    updates.address =
      input.address.trim() || null;
  }

  if (
    Object.keys(updates).length === 0
  ) {
    throw new Error(
      "At least one customer field must be provided for update."
    );
  }

  const requiresAddress =
    business.industry === "HVAC" ||
    business.industry === "CLEANING";

  const finalAddress =
    updates.address !== undefined
      ? updates.address
      : existingCustomer.address;

  if (
    requiresAddress &&
    !finalAddress?.trim()
  ) {
    throw new Error(
      "A service address is required for this business."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("customers")
    .update(updates)
    .eq(
      "id",
      customerId
    )
    .eq(
      "business_id",
      context.businessId
    )
    .select(
      "id, name, phone, email, address"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A customer with this phone number already exists for this business."
      );
    }

    console.error(
      "Failed to update customer:",
      error
    );

    throw new Error(
      "Failed to update customer."
    );
  }

  if (!data) {
    throw new Error(
      "Customer update returned no customer."
    );
  }

  return {
    customer: data,
  };
}

