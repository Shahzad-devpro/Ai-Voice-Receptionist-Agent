import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function BusinessesPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(
      "id, name, industry, country, phone, email, timezone, currency, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Businesses
          </h1>

          <p className="mt-2 text-slate-600">
            Manage all businesses connected to the platform.
          </p>
        </div>

        <Link
  href="/admin/businesses/new"
  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
>
  Add Business
</Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Business
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Industry
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Country
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Timezone
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {businesses?.map((business) => (
                <tr
                  key={business.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {business.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {business.email ?? "No email"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700">
                    {business.industry}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700">
                    {business.country}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700">
                    {business.timezone}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={
                        business.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                          : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                      }
                    >
                      {business.status}
                    </span>
                  </td>
                </tr>
              ))}

              {(!businesses || businesses.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No businesses found.
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