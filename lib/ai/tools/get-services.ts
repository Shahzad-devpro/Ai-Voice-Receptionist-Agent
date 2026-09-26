import { getBusinessContext } from "@/lib/ai/get-business-context";

import type { ToolContext } from "./get-business-information";

export type ServicesResult = {
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: number | null;
    currency: string;
  }[];
};

export async function getServices(
  context: ToolContext
): Promise<ServicesResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const business = await getBusinessContext(context.businessId);

  return {
    services: business.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: business.currency,
    })),
  };
}