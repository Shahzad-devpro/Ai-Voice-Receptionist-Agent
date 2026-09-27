import { createClient } from "@/lib/supabase/server";

export type BusinessContext = {
  id: string;
  name: string;
  industry:
    | "HVAC"
    | "CLEANING"
    | "DENTAL";
  country: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  locale: string;
  serviceArea: string | null;
  businessHours: Record<
    string,
    unknown
  >;
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
  const normalizedBusinessId =
    businessId?.trim();

  if (!normalizedBusinessId) {
    throw new Error(
      "Business ID is required."
    );
  }

  const supabase =
    await createClient();

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      `
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
      `
    )
    .eq(
      "id",
      normalizedBusinessId
    )
    .single();

  if (
    businessError ||
    !business
  ) {
    if (businessError) {
      console.error(
        "Failed to load business:",
        businessError
      );
    }

    throw new Error(
      "Business not found."
    );
  }

  /*
   * Only active services are exposed to
   * the AI receptionist.
   */
  const {
    data: services,
    error: servicesError,
  } = await supabase
    .from("services")
    .select(
      `
        id,
        name,
        description,
        duration_minutes,
        price
      `
    )
    .eq(
      "business_id",
      normalizedBusinessId
    )
    .eq(
      "is_active",
      true
    )
    .order("name");

  if (servicesError) {
    console.error(
      "Failed to load business services:",
      servicesError
    );

    throw new Error(
      "Failed to load business services."
    );
  }

  const {
    data: knowledgeBase,
    error: knowledgeError,
  } = await supabase
    .from("knowledge_base")
    .select(
      `
        id,
        title,
        content
      `
    )
    .eq(
      "business_id",
      normalizedBusinessId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (knowledgeError) {
    console.error(
      "Failed to load business knowledge base:",
      knowledgeError
    );

    throw new Error(
      "Failed to load business knowledge base."
    );
  }

  /*
   * Validate the industry before exposing it
   * to the AI context.
   */
  const industry =
    business.industry;

  if (
    industry !== "HVAC" &&
    industry !== "CLEANING" &&
    industry !== "DENTAL"
  ) {
    throw new Error(
      "Business has an invalid industry configuration."
    );
  }

  /*
   * Validate timezone using Luxon indirectly
   * through a simple Intl check.
   *
   * This prevents obviously invalid timezone
   * configuration from silently reaching the AI.
   */
  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          business.timezone,
      }
    ).format();
  } catch (error) {
    console.error(
      "Invalid business timezone:",
      {
        businessId:
          normalizedBusinessId,
        timezone:
          business.timezone,
        error,
      }
    );

    throw new Error(
      "Business has an invalid timezone configuration."
    );
  }

  return {
    id: business.id,

    name: business.name,

    industry,

    country:
      business.country,

    phone:
      business.phone,

    email:
      business.email,

    address:
      business.address,

    timezone:
      business.timezone,

    currency:
      business.currency,

    locale:
      business.locale,

    serviceArea:
      business.service_area,

    businessHours:
      (business.business_hours as Record<
        string,
        unknown
      >) ?? {},

    aiInstructions:
      business.ai_instructions,

    services:
      (services ?? []).map(
        (service) => ({
          id: service.id,

          name: service.name,

          description:
            service.description,

          durationMinutes:
            Number(
              service.duration_minutes
            ),

          price:
            service.price ===
            null
              ? null
              : Number(
                  service.price
                ),
        })
      ),

    knowledgeBase:
      knowledgeBase ?? [],
  };
}