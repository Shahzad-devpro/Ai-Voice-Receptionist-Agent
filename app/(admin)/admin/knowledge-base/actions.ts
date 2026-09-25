"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function createKnowledgeEntry(formData: FormData) {
  await requireAdmin();

  const supabase = await createClient();

  const businessId = String(
    formData.get("business_id") ?? ""
  ).trim();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const content = String(
    formData.get("content") ?? ""
  ).trim();

  if (!businessId) {
    throw new Error("Business is required.");
  }

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!content) {
    throw new Error("Content is required.");
  }

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name, status")
      .eq("id", businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Selected business does not exist.");
  }

  if (business.status !== "ACTIVE") {
    throw new Error(
      "Knowledge-base entries can only be added to active businesses."
    );
  }

  const { error } = await supabase
    .from("knowledge_base")
    .insert({
      business_id: businessId,
      title,
      content,
    });

  if (error) {
    throw new Error(
      `Failed to create knowledge-base entry: ${error.message}`
    );
  }

  revalidatePath("/admin/knowledge-base");

  redirect("/admin/knowledge-base");
}

export async function updateKnowledgeEntry(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const entryId = String(
    formData.get("entry_id") ?? ""
  ).trim();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const content = String(
    formData.get("content") ?? ""
  ).trim();

  if (!entryId) {
    throw new Error("Knowledge entry ID is required.");
  }

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!content) {
    throw new Error("Content is required.");
  }

  const { data: existingEntry, error: entryError } =
    await supabase
      .from("knowledge_base")
      .select("id")
      .eq("id", entryId)
      .single();

  if (entryError || !existingEntry) {
    throw new Error("Knowledge entry does not exist.");
  }

  const { error } = await supabase
    .from("knowledge_base")
    .update({
      title,
      content,
    })
    .eq("id", entryId);

  if (error) {
    throw new Error(
      `Failed to update knowledge entry: ${error.message}`
    );
  }

  revalidatePath("/admin/knowledge-base");

  redirect("/admin/knowledge-base");
}

export async function deleteKnowledgeEntry(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const entryId = String(
    formData.get("entry_id") ?? ""
  ).trim();

  if (!entryId) {
    throw new Error("Knowledge entry ID is required.");
  }

  const { data: existingEntry, error: entryError } =
    await supabase
      .from("knowledge_base")
      .select("id")
      .eq("id", entryId)
      .single();

  if (entryError || !existingEntry) {
    throw new Error("Knowledge entry does not exist.");
  }

  const { error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw new Error(
      `Failed to delete knowledge entry: ${error.message}`
    );
  }

  revalidatePath("/admin/knowledge-base");

  redirect("/admin/knowledge-base");
}