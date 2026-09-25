import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      duration_minutes,
      price,
      is_active,
      created_at,
      business_id,
      businesses (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Services
          </h1>

          <p className="mt-2 text-slate-600">
            Manage services available for each client business.
          </p>
        </div>

        <Link
          href="/admin/services/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Service
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Business
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Price
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {services?.map((service) => {
                const business = Array.isArray(service.businesses)
                  ? service.businesses[0]
                  : service.businesses;

                return (
                  <tr
                    key={service.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {service.name}
                        </p>

                        <p className="mt-1 max-w-md text-sm text-slate-500">
                          {service.description ?? "No description"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {business?.name ?? "Unknown business"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {service.duration_minutes} min
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {service.price !== null
                        ? Number(service.price).toFixed(2)
                        : "Inspection / quote"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          service.is_active
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {service.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                         <Link
                                    href={`/admin/services/${service.id}/edit`}
                                    className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                                            >
                            Edit
                        </Link>
                    </td>
                  </tr>
                );
              })}

              {(!services || services.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No services found.
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