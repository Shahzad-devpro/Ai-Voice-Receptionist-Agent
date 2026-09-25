import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { updateAppointmentStatus } from "../actions";

type AppointmentDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AppointmentDetailsPage({
  params,
}: AppointmentDetailsPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      start_time,
      end_time,
      status,
      created_at,
      businesses (
        name,
        phone,
        email,
        address,
        timezone
      ),
      customers (
        name,
        phone,
        email,
        address
      ),
      services (
        name,
        description,
        duration_minutes,
        price
      )
    `)
    .eq("id", id)
    .single();

  if (error || !appointment) {
    notFound();
  }

  const business = Array.isArray(appointment.businesses)
    ? appointment.businesses[0]
    : appointment.businesses;

  const customer = Array.isArray(appointment.customers)
    ? appointment.customers[0]
    : appointment.customers;

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <Link
          href="/admin/appointments"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to appointments
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Appointment Details
        </h1>

        <p className="mt-2 text-slate-600">
          View appointment, customer, service, and business
          information.
        </p>
      </div>

      {/* Appointment information */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Appointment Information
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start
            </p>

            <p className="mt-1 text-slate-900">
              {formatDateTime(appointment.start_time)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              End
            </p>

            <p className="mt-1 text-slate-900">
              {formatDateTime(appointment.end_time)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>

            <p className="mt-1">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {appointment.status}
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Created
            </p>

            <p className="mt-1 text-slate-900">
              {formatDateTime(appointment.created_at)}
            </p>
          </div>
        </div>
      </section>

      {/* Customer */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Customer
        </h2>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </p>

            <p className="mt-1 text-slate-900">
              {customer?.name ?? "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone
            </p>

            <p className="mt-1 text-slate-900">
              {customer?.phone ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </p>

            <p className="mt-1 text-slate-900">
              {customer?.email ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Address
            </p>

            <p className="mt-1 text-slate-900">
              {customer?.address ?? "Not provided"}
            </p>
          </div>
        </div>
      </section>

      {/* Service */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Service
        </h2>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </p>

            <p className="mt-1 text-slate-900">
              {service?.name ?? "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </p>

            <p className="mt-1 text-slate-900">
              {service?.description ?? "No description"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Duration
            </p>

            <p className="mt-1 text-slate-900">
              {service?.duration_minutes ?? "—"} minutes
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Price
            </p>

            <p className="mt-1 text-slate-900">
              {service?.price !== null &&
              service?.price !== undefined
                ? `$${service.price}`
                : "Inspection / quote"}
            </p>
          </div>
        </div>
      </section>

      {/* Business */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Business
        </h2>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </p>

            <p className="mt-1 text-slate-900">
              {business?.name ?? "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone
            </p>

            <p className="mt-1 text-slate-900">
              {business?.phone ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </p>

            <p className="mt-1 text-slate-900">
              {business?.email ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Address
            </p>

            <p className="mt-1 text-slate-900">
              {business?.address ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Timezone
            </p>

            <p className="mt-1 text-slate-900">
              {business?.timezone ?? "Not configured"}
            </p>
          </div>
        </div>
      </section>

      {/* Status management */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Manage Status
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Update the operational status of this appointment.
        </p>

        <form
          action={updateAppointmentStatus}
          className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <input
            type="hidden"
            name="appointment_id"
            value={appointment.id}
          />

          <div className="flex-1">
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={appointment.status}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Update Status
          </button>
        </form>
      </section>
    </div>
  );
}