import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import ServicesPageClient from "./services-page-client";

type ServicesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ServicesPage({
  params,
}: ServicesPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        industry,
        currency
      `)
      .eq("id", id)
      .single();

  if (businessError || !business) {
    notFound();
  }

  const { data: services, error: servicesError } =
    await supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        is_active
      `)
      .eq("business_id", business.id)
      .order("created_at", {
        ascending: true,
      });

  if (servicesError) {
    throw new Error(servicesError.message);
  }

  return (
    <ServicesPageClient
      businessId={business.id}
      businessName={business.name}
      industry={business.industry}
      currency={business.currency}
      services={services ?? []}
    />
  );
}