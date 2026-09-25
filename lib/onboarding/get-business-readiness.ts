import { createClient } from "@/lib/supabase/server";

type BusinessHours = Record<
  string,
  {
    open: string;
    close: string;
  } | null
>;

export type BusinessReadiness = {
  ready: boolean;
  checks: {
    businessActive: boolean;
    timezoneValid: boolean;
    hoursConfigured: boolean;
    serviceConfigured: boolean;
    knowledgeConfigured: boolean;
    clientUserConfigured: boolean;
  };
  missing: string[];
};

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
}

function hasOperatingHours(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const hours = value as BusinessHours;

  return Object.values(hours).some(
    (day) =>
      day !== null &&
      typeof day.open === "string" &&
      typeof day.close === "string"
  );
}

export async function getBusinessReadiness(
  businessId: string
): Promise<BusinessReadiness> {
  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(`
        id,
        status,
        timezone,
        business_hours
      `)
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Business not found.");
  }

  const { count: serviceCount, error: serviceError } =
    await supabase
      .from("services")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId)
      .eq("is_active", true);

  if (serviceError) {
    throw new Error(serviceError.message);
  }

  const {
    count: knowledgeCount,
    error: knowledgeError,
  } = await supabase
    .from("knowledge_base")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", businessId);

  if (knowledgeError) {
    throw new Error(knowledgeError.message);
  }

  const {
    count: clientUserCount,
    error: clientUserError,
  } = await supabase
    .from("profiles")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", businessId)
    .eq("role", "CLIENT_USER");

  if (clientUserError) {
    throw new Error(clientUserError.message);
  }

  const businessActive = business.status === "ACTIVE";

  const timezoneValid =
    typeof business.timezone === "string" &&
    business.timezone.length > 0 &&
    isValidTimezone(business.timezone);

  const hoursConfigured = hasOperatingHours(
    business.business_hours
  );

  const serviceConfigured = (serviceCount ?? 0) > 0;

  const knowledgeConfigured =
    (knowledgeCount ?? 0) > 0;

  const clientUserConfigured =
    (clientUserCount ?? 0) > 0;

  const missing: string[] = [];

  if (!businessActive) {
    missing.push("Business must be active");
  }

  if (!timezoneValid) {
    missing.push("Valid timezone");
  }

  if (!hoursConfigured) {
    missing.push("Business hours");
  }

  if (!serviceConfigured) {
    missing.push("At least one active service");
  }

  if (!knowledgeConfigured) {
    missing.push("At least one knowledge-base entry");
  }

  if (!clientUserConfigured) {
    missing.push("Client user");
  }

  return {
    ready: missing.length === 0,

    checks: {
      businessActive,
      timezoneValid,
      hoursConfigured,
      serviceConfigured,
      knowledgeConfigured,
      clientUserConfigured,
    },

    missing,
  };
}