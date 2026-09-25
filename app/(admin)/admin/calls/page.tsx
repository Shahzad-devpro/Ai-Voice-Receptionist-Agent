import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CallsPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: calls, error } = await supabase
    .from("calls")
    .select(`
      id,
      caller_phone,
      duration_seconds,
      summary,
      outcome,
      started_at,
      created_at,
      businesses (
        name
      ),
      customers (
        name,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load calls: ${error.message}`
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Calls
        </h1>

        <p className="mt-2 text-slate-600">
          Review AI receptionist calls, summaries, outcomes,
          and caller information.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Caller
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Business
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Duration
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Outcome
                </th>

                <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {calls?.map((call) => {
                const business = Array.isArray(call.businesses)
                  ? call.businesses[0]
                  : call.businesses;

                const customer = Array.isArray(call.customers)
                  ? call.customers[0]
                  : call.customers;

                const duration = call.duration_seconds ?? 0;

                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;

                return (
                  <tr key={call.id}>
                    <td className="px-6 py-4">
  <Link
    href={`/admin/calls/${call.id}`}
    className="font-semibold text-slate-900 hover:text-slate-600"
  >
    {customer?.name ?? "Unknown caller"}
  </Link>

  <p className="mt-1 text-sm text-slate-500">
    {customer?.phone ??
      call.caller_phone ??
      "No phone"}
  </p>
</td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {business?.name ?? "Unknown business"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {minutes}m {seconds}s
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {call.outcome ?? "Not recorded"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(
                        call.created_at
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}

              {!calls?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No calls have been recorded yet.
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