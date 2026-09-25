"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeState = {
  error?: string;
  success?: boolean;
};

export async function createKnowledgeEntry(
  businessId: string,
  _previousState: KnowledgeState,
  formData: FormData
): Promise<KnowledgeState> {
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
      .select("id")
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    return {
      error: "Business not found.",
    };
  }

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const content = String(
    formData.get("content") ?? ""
  ).trim();

  if (!title) {
    return {
      error: "Knowledge title is required.",
    };
  }

  if (!content) {
    return {
      error: "Knowledge content is required.",
    };
  }

  const { error: insertError } = await supabase
    .from("knowledge_base")
    .insert({
      business_id: businessId,
      title,
      content,
    });

  if (insertError) {
    return {
      error: insertError.message,
    };
  }

  revalidatePath(
    `/admin/businesses/${businessId}/onboarding/knowledge`
  );

  return {
    success: true,
  };
}