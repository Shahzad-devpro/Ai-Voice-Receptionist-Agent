import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import KnowledgePageClient from "./knowledge-page-client";

type KnowledgePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function KnowledgePage({
  params,
}: KnowledgePageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name
      `)
      .eq("id", id)
      .single();

  if (businessError || !business) {
    notFound();
  }

  const { data: entries, error: entriesError } =
    await supabase
      .from("knowledge_base")
      .select(`
        id,
        title,
        content,
        created_at
      `)
      .eq("business_id", business.id)
      .order("created_at", {
        ascending: true,
      });

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  return (
    <KnowledgePageClient
      businessId={business.id}
      businessName={business.name}
      entries={entries ?? []}
    />
  );
}