"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateClientUserState = {
  error?: string;
  success?: boolean;
};

export async function createOnboardingClientUser(
  businessId: string,
  _previousState: CreateClientUserState,
  formData: FormData
): Promise<CreateClientUserState> {
  await requireAdmin();

  if (!businessId) {
    return {
      error: "Business ID is required.",
    };
  }

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    return {
      error: "Business not found.",
    };
  }

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  ).trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  if (!name) {
    return {
      error: "Client name is required.",
    };
  }

  if (!email) {
    return {
      error: "Client email is required.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "Please enter a valid email address.",
    };
  }

  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
    };
  }

  const adminSupabase = createAdminClient();

  // Create the authentication account using the service role.
  const {
    data: authData,
    error: authError,
  } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return {
      error:
        authError?.message ??
        "Failed to create authentication account.",
    };
  }

  const userId = authData.user.id;

  // Create the application profile.
  const { error: profileError } =
    await adminSupabase
      .from("profiles")
      .insert({
        id: userId,
        business_id: businessId,
        email,
        name,
        role: "CLIENT_USER",
      });

  if (profileError) {
    // Roll back the Auth account if profile creation fails.
    await adminSupabase.auth.admin.deleteUser(userId);

    return {
      error:
        profileError.message ??
        "Failed to create client profile.",
    };
  }

  revalidatePath("/admin/users");

  revalidatePath(
    `/admin/businesses/${businessId}/onboarding/client-user`
  );

  return {
    success: true,
  };
}