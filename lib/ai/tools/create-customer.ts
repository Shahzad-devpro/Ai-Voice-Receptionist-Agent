
import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";
import { normalizePhone } from "./normalize-phone";

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

type BusinessIndustry =
  | "HVAC"
  | "CLEANING"
  | "DENTAL";

export async function createCustomer(
  context: ToolContext,
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  if (!context.businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  const name = input.name?.trim();

  if (!name) {
    throw new Error(
      "Customer name is required."
    );
  }

  const phoneInput = input.phone?.trim();

  if (!phoneInput) {
    throw new Error(
      "Customer phone number is required."
    );
  }

  const email =
    input.email?.trim() || null;

  const address =
    input.address?.trim() || null;

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

  const industry =
    business.industry as BusinessIndustry;

  if (
    industry !== "HVAC" &&
    industry !== "CLEANING" &&
    industry !== "DENTAL"
  ) {
    throw new Error(
      "Business industry is incorrectly configured."
    );
  }

  const requiresAddress =
    industry === "HVAC" ||
    industry === "CLEANING";

  if (
    requiresAddress &&
    !address
  ) {
    throw new Error(
      "A service address is required for this business. Collect the customer's service address before creating the customer."
    );
  }

  const phone = normalizePhone(
    phoneInput,
    business.country
  );

  const {
    data,
    error,
  } = await supabase
    .from("customers")
    .insert({
      business_id:
        context.businessId,
      name,
      phone,
      email,
      address,
    })
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
      "Failed to create customer:",
      error
    );

    throw new Error(
      "Failed to create customer."
    );
  }

  return {
    customer: data,
  };
}

