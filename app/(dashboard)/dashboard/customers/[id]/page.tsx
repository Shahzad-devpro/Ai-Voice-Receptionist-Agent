import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type CustomerDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function CustomerDetailsPage({
  params,
}: CustomerDetailsPageProps) {
  const user = await getCurrentUser();

  const { id } = await params;

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.business_id) {
    throw new Error("Your account is not assigned to a business.");
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select(`
      id,
      name,
      phone,
      email,
      address,
      created_at,
      leads (
        id,
        service_requested,
        description,
        status,
        created_at
      ),
      appointments (
        id,
        start_time,
        end_time,
        status,
        services (
          name
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/customers"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to customers
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Customer profile
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {customer.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Customer since {formatDate(customer.created_at)}
          </p>
        </div>
      </div>

      {/* Customer information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Contact Information
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer.phone}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer.email ?? "Not provided"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Address
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {customer.address ?? "Not provided"}
            </p>
          </div>
        </div>
      </section>

      {/* Leads */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Leads
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Service requests associated with this customer.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {customer.leads?.length ?? 0}
          </span>
        </div>

        {customer.leads && customer.leads.length > 0 ? (
          <div className="mt-6 divide-y divide-slate-200">
            {customer.leads.map((lead) => (
              <div
                key={lead.id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <p className="font-medium text-slate-900">
                      {lead.service_requested}
                    </p>

                    {lead.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {lead.description}
                      </p>
                    )}
                  </div>

                  <span className="h-fit w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            No leads recorded for this customer.
          </p>
        )}
      </section>

      {/* Appointments */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Appointments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Appointments associated with this customer.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {customer.appointments?.length ?? 0}
          </span>
        </div>

        {customer.appointments &&
        customer.appointments.length > 0 ? (
          <div className="mt-6 divide-y divide-slate-200">
            {customer.appointments.map((appointment) => {
              const service = Array.isArray(appointment.services)
                ? appointment.services[0]
                : appointment.services;

              return (
                <div
                  key={appointment.id}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div>
                      <p className="font-medium text-slate-900">
                        {service?.name ?? "Unknown service"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(appointment.start_time)}
                        {" — "}
                        {formatDate(appointment.end_time)}
                      </p>
                    </div>

                    <span className="h-fit w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {appointment.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            No appointments recorded for this customer.
          </p>
        )}
      </section>
    </div>
  );
}