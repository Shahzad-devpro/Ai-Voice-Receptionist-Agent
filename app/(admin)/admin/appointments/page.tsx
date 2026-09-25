import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminAppointmentsPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
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
    `)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load appointments: ${error.message}`
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Appointments
        </h1>

        <p className="mt-2 text-slate-600">
          View appointments across all businesses.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {appointments && appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Customer
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Business
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Service
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Start
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    End
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    Status
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
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                       <Link
                         href={`/admin/appointments/${appointment.id}`}
                         className="font-medium text-slate-900 hover:underline"
                            >
                         {customer?.name ?? "Unknown customer"}
                        </Link>

                        <p className="mt-1 text-sm text-slate-500">
                          {customer?.phone ?? "No phone"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {business?.name ?? "Unknown business"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {service?.name ?? "Unknown service"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDateTime(
                          appointment.start_time
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDateTime(
                          appointment.end_time
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No appointments yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Appointments created by the AI receptionist will
              appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}