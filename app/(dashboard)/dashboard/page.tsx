import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      email,
      role,
      business_id,
      businesses (
        id,
        name,
        industry,
        phone,
        email,
        address,
        timezone,
        currency,
        locale,
        status
      )
    `)
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Failed to load dashboard profile: ${
        profileError?.message ?? "Profile not found."
      }`
    );
  }

  if (!profile.business_id) {
    throw new Error(
      "Your account is not assigned to a business."
    );
  }

  const business = Array.isArray(profile.businesses)
    ? profile.businesses[0]
    : profile.businesses;

  if (!business) {
    throw new Error(
      "Your assigned business could not be found."
    );
  }

  const [
    { count: customerCount, error: customerError },
    { count: leadCount, error: leadError },
    { count: appointmentCount, error: appointmentError },
    { count: callCount, error: callError },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("leads")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("appointments")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("calls")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  const countError =
    customerError ||
    leadError ||
    appointmentError ||
    callError;

  if (countError) {
    throw new Error(
      `Failed to load dashboard statistics: ${countError.message}`
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">
          Welcome back
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {profile.name ?? profile.email}
        </h1>

        <p className="mt-2 text-slate-600">
          Manage your business's AI receptionist activity.
        </p>
      </div>

      {/* Business summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your Business
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {business.name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {business.industry}
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {business.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone
            </p>

            <p className="mt-1 text-sm text-slate-900">
              {business.phone ?? "Not configured"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </p>

            <p className="mt-1 text-sm text-slate-900">
              {business.email ?? "Not configured"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Timezone
            </p>

            <p className="mt-1 text-sm text-slate-900">
              {business.timezone}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Locale
            </p>

            <p className="mt-1 text-sm text-slate-900">
              {business.locale}
            </p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Customers
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {customerCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Leads
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {leadCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Appointments
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {appointmentCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Calls
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {callCount ?? 0}
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/customers"
            className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">
              View Customers
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Review customers captured by the receptionist.
            </p>
          </Link>

          <Link
            href="/dashboard/leads"
            className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">
              View Leads
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Review incoming service requests.
            </p>
          </Link>

          <Link
            href="/dashboard/appointments"
            className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">
              View Appointments
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Review scheduled appointments.
            </p>
          </Link>

          <Link
            href="/dashboard/calls"
            className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">
              View Calls
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Review receptionist calls and summaries.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}