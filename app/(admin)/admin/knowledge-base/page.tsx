import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function KnowledgeBasePage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("knowledge_base")
    .select(`
      id,
      title,
      content,
      created_at,
      businesses (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load knowledge base: ${error.message}`
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Knowledge Base
          </h1>

          <p className="mt-2 text-slate-600">
            Manage business information that the AI receptionist
            can use when answering customer questions.
          </p>
        </div>

        <Link
          href="/admin/knowledge-base/new"
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Knowledge
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Title
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Business
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Content
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Created
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                 Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {entries?.map((entry) => {
                const business = Array.isArray(entry.businesses)
                  ? entry.businesses[0]
                  : entry.businesses;

                return (
                  <tr key={entry.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {entry.title}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business?.name ?? "Unknown business"}
                    </td>

                    <td className="max-w-md px-6 py-4 text-sm text-slate-600">
                      <p className="line-clamp-2">
                        {entry.content}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(
                        entry.created_at
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                        <Link
                         href={`/admin/knowledge-base/${entry.id}/edit`}
                              className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                         >
                         Edit
                         </Link>
                    </td>
                  </tr>
                );
              })}

              {!entries?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No knowledge-base entries yet.
                  </td>
                  
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}