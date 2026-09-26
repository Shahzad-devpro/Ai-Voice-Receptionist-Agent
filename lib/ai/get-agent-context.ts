import { createClient } from "@/lib/supabase/server";

export type AgentContext = {
  userId: string;
  role: "PLATFORM_ADMIN" | "CLIENT_USER";
  businessId: string;
};

export async function getAgentContext(): Promise<AgentContext> {
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

    return {
      userId: user.id,
      role: "CLIENT_USER",
      businessId: profile.business_id,
    };
  }

  throw new Error(
    "Platform admin requires an explicit business context."
  );
}