import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { deleteKnowledgeEntry, updateKnowledgeEntry } from "../../actions";

type EditKnowledgePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditKnowledgePage({
  params,
}: EditKnowledgePageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: entry, error } = await supabase
    .from("knowledge_base")
    .select(`
      id,
      title,
      content,
      businesses (
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !entry) {
    notFound();
  }

  const business = Array.isArray(entry.businesses)
    ? entry.businesses[0]
    : entry.businesses;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/knowledge-base"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to knowledge base
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Edit Knowledge
        </h1>

        <p className="mt-2 text-slate-600">
          Update the information available to the AI receptionist.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Business
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {business?.name ?? "Unknown business"}
        </p>
      </div>

      <form
        action={updateKnowledgeEntry}
        className="space-y-8"
      >
        <input
          type="hidden"
          name="entry_id"
          value={entry.id}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Knowledge Entry
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={entry.title}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="content"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Content
              </label>

              <textarea
                id="content"
                name="content"
                required
                rows={12}
                defaultValue={entry.content}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />

              <p className="mt-2 text-xs text-slate-500">
                Keep this information factual and specific to the
                selected business.
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/knowledge-base"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Changes
          </button>
        </div>
        
      </form>
      <section className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
  <h2 className="text-lg font-semibold text-red-900">
    Delete Knowledge Entry
  </h2>

  <p className="mt-2 text-sm text-red-700">
    Deleting this entry will permanently remove this information
    from the AI receptionist&apos;s knowledge base.
  </p>

  <form action={deleteKnowledgeEntry} className="mt-5">
    <input
      type="hidden"
      name="entry_id"
      value={entry.id}
    />

    <button
      type="submit"
      className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
    >
      Delete Knowledge
    </button>
  </form>
</section>
    </div>
  );
}