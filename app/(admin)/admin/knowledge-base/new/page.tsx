import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createKnowledgeEntry } from "../actions";

export default async function NewKnowledgeBasePage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, industry, status")
    .order("name");

  if (error) {
    throw new Error(
      `Failed to load businesses: ${error.message}`
    );
  }

  const activeBusinesses =
    businesses?.filter(
      (business) => business.status === "ACTIVE"
    ) ?? [];

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
          Add Knowledge
        </h1>

        <p className="mt-2 text-slate-600">
          Add business information that the AI receptionist can
          use when answering customer questions.
        </p>
      </div>

      <form
        action={createKnowledgeEntry}
        className="space-y-8"
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Knowledge Entry
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="business_id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Business
              </label>

              <select
                id="business_id"
                name="business_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              >
                <option value="" disabled>
                  Select a business
                </option>

                {activeBusinesses.map((business) => (
                  <option
                    key={business.id}
                    value={business.id}
                  >
                    {business.name} ({business.industry})
                  </option>
                ))}
              </select>

              {activeBusinesses.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  No active businesses are available.
                </p>
              )}
            </div>

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
                placeholder="Example: Emergency HVAC Service"
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
                rows={10}
                placeholder="Example: Emergency HVAC service is available during normal business hours. Customers should provide their address and describe the issue."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />

              <p className="mt-2 text-xs text-slate-500">
                Write factual business information. The AI
                will use this content when answering customers.
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
            disabled={activeBusinesses.length === 0}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Knowledge
          </button>
        </div>
      </form>
    </div>
  );
}