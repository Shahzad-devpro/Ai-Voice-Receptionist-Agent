import { createClient } from "@/lib/supabase/server";

import VoiceTest from "./voice-test";

export default async function TestAgentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found.");
  }

  /*
   * CLIENT USER
   *
   * Their business is already defined
   * by profiles.business_id.
   */
  if (profile.role === "CLIENT_USER") {
    if (!profile.business_id) {
      throw new Error(
        "Client user is not assigned to a business."
      );
    }

    return (
      <VoiceTest
        businesses={[]}
        initialBusinessId={
          profile.business_id
        }
        isPlatformAdmin={false}
      />
    );
  }

  /*
   * PLATFORM ADMIN
   *
   * Load businesses so the admin can
   * explicitly choose a business.
   */
  if (profile.role === "PLATFORM_ADMIN") {
    const {
      data: businesses,
      error: businessesError,
    } = await supabase
      .from("businesses")
      .select(
        "id, name, industry, status"
      )
      .order("name", {
        ascending: true,
      });

    if (businessesError) {
      console.error(
        "Failed to load businesses:",
        businessesError
      );

      throw new Error(
        "Failed to load businesses."
      );
    }

    return (
      <VoiceTest
        businesses={businesses ?? []}
        initialBusinessId={
          businesses?.[0]?.id ?? ""
        }
        isPlatformAdmin={true}
      />
    );
  }

  throw new Error(
    "Unsupported user role."
  );
}