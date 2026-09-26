import { createClient } from "@/lib/supabase/server";

export type BusinessContext = {
  id: string;
  name: string;
  industry: "HVAC" | "CLEANING" | "DENTAL";
  country: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  locale: string;
  serviceArea: string | null;
  businessHours: Record<string, unknown>;
  aiInstructions: string | null;
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: number | null;
  }[];
  knowledgeBase: {
    id: string;
    title: string;
    content: string;
  }[];
};

export async function getBusinessContext(
  businessId: string
): Promise<BusinessContext> {
  if (!businessId) {
    throw new Error("Business ID is required.");
  }

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        industry,
        country,
        phone,
        email,
        address,
        timezone,
        currency,
        locale,
        service_area,
        business_hours,
        ai_instructions
      `)
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Business not found.");
  }

  const { data: services, error: servicesError } =
    await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price
      `)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");

  if (servicesError) {
    throw new Error(servicesError.message);
  }

  const {
    data: knowledgeBase,
    error: knowledgeError,
  } = await supabase
    .from("knowledge_base")
    .select(`
      id,
      title,
      content
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (knowledgeError) {
    throw new Error(knowledgeError.message);
  }

  return {
    id: business.id,
    name: business.name,
    industry: business.industry,
    country: business.country,
    phone: business.phone,
    email: business.email,
    address: business.address,
    timezone: business.timezone,
    currency: business.currency,
    locale: business.locale,
    serviceArea: business.service_area,
    businessHours:
      (business.business_hours as Record<string, unknown>) ?? {},
    aiInstructions: business.ai_instructions,

    services: (services ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      price:
        service.price === null
          ? null
          : Number(service.price),
    })),

    knowledgeBase: knowledgeBase ?? [],
  };
}