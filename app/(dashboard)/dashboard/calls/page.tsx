import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

export default async function CallsPage() {
  const user = await getCurrentUser();

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.business_id) {
    throw new Error(
      "Your account is not assigned to a business."
    );
  }

  const { data: calls, error } = await supabase
    .from("calls")
    .select(`
      id,
      caller_phone,
      duration_seconds,
      summary,
      outcome,
      started_at,
      ended_at,
      customers (
        id,
        name
      ),
      leads (
        id,
        service_requested,
        status
      ),
      appointments (
        id,
        start_time,
        status
      )
    `)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load calls: ${error.message}`
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Dashboard
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            AI receptionist activity
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Calls
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review conversations handled by your AI receptionist.
          </p>
        </div>
      </div>

      {/* Calls */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {calls && calls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Caller
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Started
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Outcome
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {calls.map((call) => {
                  const customer = Array.isArray(call.customers)
                    ? call.customers[0]
                    : call.customers;

                  return (
                    <tr
                      key={call.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer?.name ?? "Unknown caller"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {call.caller_phone}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDateTime(call.started_at)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDuration(call.duration_seconds)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {call.outcome ?? "Not recorded"}
                        </span>
                      </td>

                      <td className="max-w-sm px-6 py-4">
                        <p className="truncate text-sm text-slate-500">
                          {call.summary ?? "No summary available"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/calls/${call.id}`}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No calls yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Calls handled by your AI receptionist will appear
              here once the voice engine is connected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}