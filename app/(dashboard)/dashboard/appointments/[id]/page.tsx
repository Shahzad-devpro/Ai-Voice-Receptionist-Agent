import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type AppointmentDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default async function AppointmentDetailsPage({
  params,
}: AppointmentDetailsPageProps) {
  const user = await getCurrentUser();

  const { id } = await params;

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

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      start_time,
      end_time,
      status,
      created_at,
      customers (
        id,
        name,
        phone,
        email,
        address
      ),
      services (
        id,
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

  const customer = Array.isArray(appointment.customers)
    ? appointment.customers[0]
    : appointment.customers;

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/appointments"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to appointments
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Appointment details
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {service?.name ?? "Appointment"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {formatDateTime(appointment.start_time)}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
              appointment.status
            )}`}
          >
            {appointment.status}
          </span>
        </div>
      </div>

      {/* Schedule */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Schedule
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Start
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {formatDateTime(appointment.start_time)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              End
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {formatDateTime(appointment.end_time)}
            </p>
          </div>
        </div>
      </section>

      {/* Customer */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">
            Customer
          </h2>

          {customer && (
            <Link
              href={`/dashboard/customers/${customer.id}`}
              className="text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              View customer →
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Name
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer?.name ?? "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer?.phone ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer?.email ?? "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Address
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer?.address ?? "Not provided"}
            </p>
          </div>
        </div>
      </section>

      {/* Service */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Service
        </h2>

        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Service
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {service?.name ?? "Unknown service"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {service?.description ?? "No description available."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Duration
              </p>

              <p className="mt-2 text-sm font-medium text-slate-800">
                {service?.duration_minutes ?? "—"} minutes
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Price
              </p>

              <p className="mt-2 text-sm font-medium text-slate-800">
                {service?.price !== null &&
                service?.price !== undefined
                  ? `$${service.price}`
                  : "Inspection / quote"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}