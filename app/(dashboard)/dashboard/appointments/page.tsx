import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

function getStatusClasses(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardAppointmentsPage() {
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

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      start_time,
      end_time,
      status,
      created_at,
      customers (
        name,
        phone
      ),
      services (
        name,
        duration_minutes
      )
    `)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load appointments: ${error.message}`
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
            Scheduling
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Appointments
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage appointments scheduled by your AI receptionist.
          </p>
        </div>
      </div>

      {/* Appointment table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {appointments && appointments.length > 0 ? (
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
                    Start
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {appointments.map((appointment) => {
                  const customer = Array.isArray(
                    appointment.customers
                  )
                    ? appointment.customers[0]
                    : appointment.customers;

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
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/appointments/${appointment.id}`}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {customer?.name ?? "Unknown customer"}
                        </Link>

                        <p className="mt-1 text-xs text-slate-400">
                          {customer?.phone ?? "No phone"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {service?.name ?? "Unknown service"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDateTime(appointment.start_time)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDateTime(appointment.end_time)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/appointments/${appointment.id}`}
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
              No appointments yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Appointments created by your AI receptionist will
              appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}