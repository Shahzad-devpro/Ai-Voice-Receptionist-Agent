import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type LeadDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getStatusClasses(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";

    case "BOOKED":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";

    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function LeadDetailsPage({
  params,
}: LeadDetailsPageProps) {
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

  const { data: lead, error } = await supabase
    .from("leads")
    .select(`
      id,
      service_requested,
      description,
      status,
      created_at,
      customers (
        id,
        name,
        phone,
        email,
        address
      )
    `)
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const customer = Array.isArray(lead.customers)
    ? lead.customers[0]
    : lead.customers;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/leads"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to leads
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Lead details
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {lead.service_requested}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Created {formatDate(lead.created_at)}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
              lead.status
            )}`}
          >
            {lead.status}
          </span>
        </div>
      </div>

      {/* Request */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Service Request
        </h2>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Requested Service
          </p>

          <p className="mt-2 font-medium text-slate-900">
            {lead.service_requested}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Description
          </p>

          <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {lead.description ?? "No description provided."}
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
    </div>
  );
}