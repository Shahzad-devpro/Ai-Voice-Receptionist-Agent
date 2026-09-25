import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";

export async function requireAdmin() {
  const user = await getCurrentUser();

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, business_id, name, email")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/dashboard");
  }

  if (profile.role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  return {
    user,
    profile,
  };
}