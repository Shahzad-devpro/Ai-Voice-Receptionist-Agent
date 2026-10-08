import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getPageNumber(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number(rawValue);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  await requireAdmin();

  const supabase = await createClient();

  const params = await searchParams;

  const currentPage = getPageNumber(params.page);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: appointments,
    error,
    count,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        start_time,
        end_time,
        status,
        created_at,
        businesses (
          name
        ),
        customers (
          name,
          phone
        ),
        services (
          name,
          duration_minutes
        )
      `,
      {
        count: "exact",
      }
    )
    .order("start_time", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to load appointments:", error);

    throw new Error("Failed to load appointments.");
  }

  const totalAppointments = count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalAppointments / PAGE_SIZE)
  );

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const firstItem =
    totalAppointments === 0
      ? 0
      : from + 1;

  const lastItem = Math.min(
    from + (appointments?.length ?? 0),
    totalAppointments
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Appointment Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Appointments
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              View appointments across all businesses.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total Appointments
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {totalAppointments}
            </p>
          </div>
        </div>

        {/* Appointment Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {appointments && appointments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Business
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Service
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Start
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        End
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((appointment) => {
                      const customer = Array.isArray(
                        appointment.customers
                      )
                        ? appointment.customers[0]
                        : appointment.customers;

                      const business = Array.isArray(
                        appointment.businesses
                      )
                        ? appointment.businesses[0]
                        : appointment.businesses;

                      const service = Array.isArray(
                        appointment.services
                      )
                        ? appointment.services[0]
                        : appointment.services;

                      return (
                        <tr
                          key={appointment.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5">
                            <Link
                              href={`/admin/appointments/${appointment.id}`}
                              className="font-semibold text-slate-900 transition hover:text-blue-600 hover:underline"
                            >
                              {customer?.name ??
                                "Unknown customer"}
                            </Link>

                            <p className="mt-1 text-sm text-slate-500">
                              {customer?.phone ??
                                "No phone"}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-700">
                            {business?.name ??
                              "Unknown business"}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-700">
                            {service?.name ??
                              "Unknown service"}
                          </td>

                          <td className="px-6 py-5 text-sm font-medium text-slate-700">
                            {formatDateTime(
                              appointment.start_time
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatDateTime(
                              appointment.end_time
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {appointment.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {firstItem}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {lastItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {totalAppointments}
                  </span>{" "}
                  appointments
                </p>

                <div className="flex items-center gap-2">
                  {hasPreviousPage ? (
                    <Link
                      href={`/admin/appointments?page=${currentPage - 1}`}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      ← Previous
                    </span>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    Page {currentPage} of {totalPages}
                  </div>

                  {hasNextPage ? (
                    <Link
                      href={`/admin/appointments?page=${currentPage + 1}`}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📅
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                No appointments yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Appointments created by the AI receptionist
                will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}