import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import ClientUserPageClient from "./client-user-page-client";

type ClientUserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientUserPage({
  params,
}: ClientUserPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        industry
      `)
      .eq("id", id)
      .single();

  if (businessError || !business) {
    notFound();
  }

  const { data: clientUsers, error: usersError } =
    await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        role,
        created_at
      `)
      .eq("business_id", business.id)
      .eq("role", "CLIENT_USER")
      .order("created_at", {
        ascending: true,
      });

  if (usersError) {
    throw new Error(usersError.message);
  }

  return (
    <ClientUserPageClient
      businessId={business.id}
      businessName={business.name}
      industry={business.industry}
      clientUsers={clientUsers ?? []}
    />
  );
}