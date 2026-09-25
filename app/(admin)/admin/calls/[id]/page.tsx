import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

type CallDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CallDetailsPage({
  params,
}: CallDetailsPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

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
      created_at,
      businesses (
        name,
        phone,
        email
      ),
      customers (
        name,
        phone,
        email,
        address
      ),
      leads (
        id,
        service_requested,
        description,
        status
      ),
      appointments (
        id,
        start_time,
        end_time,
        status
      )
    `)
    .eq("id", id)
    .single();

  if (error || !call) {
    notFound();
  }

  const business = Array.isArray(call.businesses)
    ? call.businesses[0]
    : call.businesses;

  const customer = Array.isArray(call.customers)
    ? call.customers[0]
    : call.customers;

  const lead = Array.isArray(call.leads)
    ? call.leads[0]
    : call.leads;

  const appointment = Array.isArray(call.appointments)
    ? call.appointments[0]
    : call.appointments;

  const duration = call.duration_seconds ?? 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link
          href="/admin/calls"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to calls
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Call Details
        </h1>

        <p className="mt-2 text-slate-600">
          Review the details and conversation record for this call.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Caller */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Caller
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </p>

              <p className="mt-1 text-slate-900">
                {customer?.name ?? "Unknown caller"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </p>

              <p className="mt-1 text-slate-900">
                {customer?.phone ??
                  call.caller_phone ??
                  "Not recorded"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </p>

              <p className="mt-1 text-slate-900">
                {customer?.email ?? "Not recorded"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Address
              </p>

              <p className="mt-1 text-slate-900">
                {customer?.address ?? "Not recorded"}
              </p>
            </div>
          </div>
        </section>

        {/* Call information */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Call Information
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Business
              </p>

              <p className="mt-1 text-slate-900">
                {business?.name ?? "Unknown business"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Duration
              </p>

              <p className="mt-1 text-slate-900">
                {minutes}m {seconds}s
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Outcome
              </p>

              <p className="mt-1 text-slate-900">
                {call.outcome ?? "Not recorded"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Started
              </p>

              <p className="mt-1 text-slate-900">
                {call.started_at
                  ? new Date(call.started_at).toLocaleString()
                  : "Not recorded"}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* AI Summary */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          AI Summary
        </h2>

        <div className="mt-4 rounded-lg bg-slate-50 p-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {call.summary ?? "No summary recorded."}
          </p>
        </div>
      </section>

      {/* Lead */}
      {lead && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Lead
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service Requested
              </p>

              <p className="mt-1 text-slate-900">
                {lead.service_requested}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>

              <p className="mt-1 text-slate-900">
                {lead.status}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </p>

              <p className="mt-1 whitespace-pre-wrap text-slate-900">
                {lead.description ?? "No description recorded."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Appointment */}
      {appointment && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Appointment
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start
              </p>

              <p className="mt-1 text-slate-900">
                {new Date(
                  appointment.start_time
                ).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                End
              </p>

              <p className="mt-1 text-slate-900">
                {new Date(
                  appointment.end_time
                ).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>

              <p className="mt-1 text-slate-900">
                {appointment.status}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Transcript */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Transcript
        </h2>

        <div className="mt-4 max-h-[600px] overflow-y-auto rounded-lg bg-slate-50 p-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {call.transcript ?? "No transcript recorded."}
          </p>
        </div>
      </section>
    </div>
  );
}