import { createClient } from "@/lib/supabase/server";

export type AgentContext = {
  userId: string;
  role: "PLATFORM_ADMIN" | "CLIENT_USER";
  businessId: string;
};

export async function getAgentContext(
  requestedBusinessId?: string | null
): Promise<AgentContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    throw new Error("User profile not found.");
  }

  if (profile.role === "CLIENT_USER") {
    if (!profile.business_id) {
      throw new Error(
        "Client user is not assigned to a business."
      );
    }

    if (
      requestedBusinessId &&
      requestedBusinessId !== profile.business_id
    ) {
      throw new Error(
        "You are not authorized to use this business context."
      );
    }

    return {
      userId: user.id,
      role: "CLIENT_USER",
      businessId: profile.business_id,
    };
  }

  if (profile.role === "PLATFORM_ADMIN") {
    const businessId =
      requestedBusinessId?.trim();

    if (!businessId) {
      throw new Error(
        "Platform admin requires an explicit business context."
      );
    }

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Failed to verify business context:",
        businessError
      );

      throw new Error(
        "Failed to verify business context."
      );
    }

    if (!business) {
      throw new Error(
        "Selected business was not found."
      );
    }

    return {
      userId: user.id,
      role: "PLATFORM_ADMIN",
      businessId: business.id,
    };
  }

  throw new Error("Unsupported user role.");
}