import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

function getStatusClasses(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";

    case "BOOKED":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";
  }
}

export default async function LeadsPage() {
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

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      service_requested,
      description,
      status,
      created_at,
      customers (
        name,
        phone,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load leads: ${error.message}`
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
            Sales pipeline
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Leads
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Service requests captured by your AI receptionist.
          </p>
        </div>
      </div>

      {/* Leads table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => {
                  const customer = Array.isArray(
                    lead.customers
                  )
                    ? lead.customers[0]
                    : lead.customers;

                  return (
                    <tr
                      key={lead.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer?.name ?? "Unknown customer"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {customer?.phone ?? "No phone"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {lead.service_requested}
                      </td>

                      <td className="max-w-xs px-6 py-4">
                        <p className="truncate text-sm text-slate-500">
                          {lead.description ?? "No description"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(
                          lead.created_at
                        ).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                          View →
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
              No leads yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              New service requests captured by the AI receptionist
              will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}