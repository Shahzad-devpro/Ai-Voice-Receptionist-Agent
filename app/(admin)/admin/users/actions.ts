"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClientUser(formData: FormData) {
  await requireAdmin();

  // Normal authenticated client.
  // This verifies the selected business using the same
  // authorization context as the admin dashboard.
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const name = String(formData.get("name") ?? "").trim();

  const password = String(formData.get("password") ?? "");

  const businessId = String(
    formData.get("business_id") ?? ""
  ).trim();

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!name) {
    throw new Error("Name is required.");
  }

  if (password.length < 8) {
    throw new Error(
      "Password must contain at least 8 characters."
    );
  }

  if (!businessId) {
    throw new Error("Business is required.");
  }

  // Verify business using the authenticated admin session.
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name, status")
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    throw new Error(
      `Selected business does not exist. ${
        businessError?.message ?? ""
      }`
    );
  }

  if (business.status !== "ACTIVE") {
    throw new Error(
      "The selected business is not active."
    );
  }

  // Service-role client is used only for privileged
  // Auth/profile operations.
  const supabaseAdmin = createAdminClient();

  const {
    data: authData,
    error: authError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(
      authError?.message ??
        "Failed to create authentication user."
    );
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: authData.user.id,
      business_id: businessId,
      email,
      name,
      role: "CLIENT_USER",
    });

  if (profileError) {
    // Roll back the Auth user if profile creation fails.
    await supabaseAdmin.auth.admin.deleteUser(
      authData.user.id
    );

    throw new Error(
      `User account could not be completed: ${profileError.message}`
    );
  }

  revalidatePath("/admin/users");

  redirect("/admin/users");
}