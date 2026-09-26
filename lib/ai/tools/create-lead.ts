import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";

export type CreateLeadInput = {
  customerId: string;
  serviceRequested: string;
  description?: string;
};

export type CreateLeadResult = {
  lead: {
    id: string;
    customerId: string;
    serviceRequested: string;
    description: string | null;
    status: "NEW" | "BOOKED" | "COMPLETED" | "CANCELLED";
  };
};

export async function createLead(
  context: ToolContext,
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const customerId = input.customerId.trim();
  const serviceRequested = input.serviceRequested.trim();
  const description = input.description?.trim() || null;

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!serviceRequested) {
    throw new Error("Requested service is required.");
  }

  const supabase = await createClient();

  // Verify that the customer belongs to this business.
  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("business_id", context.businessId)
      .maybeSingle();

  if (customerError) {
    throw new Error(customerError.message);
  }

  if (!customer) {
    throw new Error(
      "Customer does not belong to this business."
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      business_id: context.businessId,
      customer_id: customerId,
      service_requested: serviceRequested,
      description,
      status: "NEW",
    })
    .select(
      "id, customer_id, service_requested, description, status"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    lead: {
      id: data.id,
      customerId: data.customer_id,
      serviceRequested: data.service_requested,
      description: data.description,
      status: data.status,
    },
  };
}