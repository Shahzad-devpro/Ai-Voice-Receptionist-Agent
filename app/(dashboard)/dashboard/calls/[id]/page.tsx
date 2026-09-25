import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type CallDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

export default async function CallDetailsPage({
  params,
}: CallDetailsPageProps) {
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

  const { data: call, error } = await supabase
    .from("calls")
    .select(`
      id,
      caller_phone,
      duration_seconds,
      transcript,
      summary,
      outcome,
      started_at,
      ended_at,
      customers (
        id,
        name,
        phone,
        email,
        address
      ),
      leads (
        id,
        service_requested,
        status
      ),
      appointments (
        id,
        start_time,
        status
      )
    `)
    .eq("id", id)
    .single();

  if (error || !call) {
    notFound();
  }

  const customer = Array.isArray(call.customers)
    ? call.customers[0]
    : call.customers;

  const lead = Array.isArray(call.leads)
    ? call.leads[0]
    : call.leads;

  const appointment = Array.isArray(call.appointments)
    ? call.appointments[0]
    : call.appointments;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/calls"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to calls
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Call review
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {customer?.name ?? call.caller_phone}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {formatDateTime(call.started_at)}
          </p>
        </div>
      </div>

      {/* Call overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Call Overview
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Caller
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {call.caller_phone}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Duration
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {formatDuration(call.duration_seconds)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Started
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {formatDateTime(call.started_at)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Outcome
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {call.outcome ?? "Not recorded"}
            </p>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          AI Summary
        </h2>

        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {call.summary ?? "No summary available."}
          </p>
        </div>
      </section>

      {/* Transcript */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Transcript
        </h2>

        <div className="mt-5 max-h-[600px] overflow-y-auto rounded-xl bg-slate-950 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">
            {call.transcript ?? "No transcript available."}
          </pre>
        </div>
      </section>

      {/* Related records */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Customer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Customer
          </h2>

          {customer ? (
            <div className="mt-5">
              <p className="font-semibold text-slate-900">
                {customer.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {customer.phone}
              </p>

              {customer.email && (
                <p className="mt-1 text-sm text-slate-500">
                  {customer.email}
                </p>
              )}

              <Link
                href={`/dashboard/customers/${customer.id}`}
                className="mt-5 inline-block text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                View customer →
              </Link>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No customer linked to this call.
            </p>
          )}
        </section>

        {/* Lead */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Lead
          </h2>

          {lead ? (
            <div className="mt-5">
              <p className="font-semibold text-slate-900">
                {lead.service_requested}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Status: {lead.status}
              </p>

              <Link
                href={`/dashboard/leads/${lead.id}`}
                className="mt-5 inline-block text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                View lead →
              </Link>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No lead was created from this call.
            </p>
          )}
        </section>
      </div>

      {/* Appointment */}
      {appointment && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Appointment
          </h2>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900">
                {formatDateTime(appointment.start_time)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Status: {appointment.status}
              </p>
            </div>

            <Link
              href={`/dashboard/appointments/${appointment.id}`}
              className="text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              View appointment →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}