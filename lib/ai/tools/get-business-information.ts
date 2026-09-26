import {
  getBusinessContext,
  type BusinessContext,
} from "@/lib/ai/get-business-context";

export type ToolContext = {
  businessId: string;
};

export type BusinessInformationResult = {
  business: {
    name: string;
    industry: BusinessContext["industry"];
    country: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    timezone: string;
    currency: string;
    locale: string;
    serviceArea: string | null;
    businessHours: Record<string, unknown>;
  };
};

export async function getBusinessInformation(
  context: ToolContext
): Promise<BusinessInformationResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const business = await getBusinessContext(context.businessId);

  return {
    business: {
      name: business.name,
      industry: business.industry,
      country: business.country,
      phone: business.phone,
      email: business.email,
      address: business.address,
      timezone: business.timezone,
      currency: business.currency,
      locale: business.locale,
      serviceArea: business.serviceArea,
      businessHours: business.businessHours,
    },
  };
}