import { createClient } from "@/lib/supabase/server";

import type { ToolContext } from "./get-business-information";

export type KnowledgeSearchResult = {
  results: {
    id: string;
    title: string;
    content: string;
  }[];
};

export async function searchKnowledgeBase(
  context: ToolContext,
  query: string
): Promise<KnowledgeSearchResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    throw new Error("Search query is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, content")
    .eq("business_id", context.businessId)
    .or(
      `title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`
    )
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return {
    results: data ?? [],
  };
}