import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const user = await getCurrentUser();

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.business_id) {
    throw new Error("Your account is not assigned to a business.");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select(`
      id,
      name,
      phone,
      email,
      address,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load customers: ${error.message}`
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Customers
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Customers captured through your AI receptionist.
          </p>
        </div>
      </div>

      {/* Customer table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {customers && customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Added
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {customer.name}
                      </Link>

                      {customer.address && (
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {customer.address}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.phone}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.email ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(
                        customer.created_at
                      ).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No customers yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Customers will appear here when your AI receptionist
              captures their information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}