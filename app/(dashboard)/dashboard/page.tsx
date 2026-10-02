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
    console.error(
      "Failed to load dashboard profile:",
      profileError
    );

    throw new Error(
      "Failed to load dashboard profile."
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
    console.error(
      "Failed to load dashboard statistics:",
      countError
    );

    throw new Error(
      "Failed to load dashboard statistics."
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-slate-100 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-sm">
                AI
              </span>

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Voice Receptionist
              </span>
            </div>

            <p className="text-sm font-medium text-slate-500">
              Welcome back
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {profile.name ?? profile.email}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your business&apos;s AI receptionist activity,
              leads, appointments, customers, and calls from one place.
            </p>
          </div>

          {/* Test AI Agent */}
          <Link
            href="/test-agent"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 5v14l11-7L8 5Z"
              />
            </svg>

            Test AI Receptionist

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M13 6l6 6-6 6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Business summary */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Your Business
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {business.name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {business.industry}
                </span>

                <span className="text-xs text-slate-400">
                  AI Receptionist
                </span>
              </div>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                business.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {business.status}
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <div className="bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phone
            </p>

            <p className="mt-2 break-words text-sm font-medium text-slate-900">
              {business.phone ?? "Not configured"}
            </p>
          </div>

          <div className="bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Email
            </p>

            <p className="mt-2 break-words text-sm font-medium text-slate-900">
              {business.email ?? "Not configured"}
            </p>
          </div>

          <div className="bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Timezone
            </p>

            <p className="mt-2 text-sm font-medium text-slate-900">
              {business.timezone}
            </p>
          </div>

          <div className="bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Locale
            </p>

            <p className="mt-2 text-sm font-medium text-slate-900">
              {business.locale}
            </p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Overview
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Business activity
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Customers */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  />
                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  />
                </svg>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Customers
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {customerCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Captured customer records
            </p>
          </div>

          {/* Leads */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4h16v16H4z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4 7 8 5 8-5"
                  />
                </svg>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Leads
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {leadCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Incoming service requests
            </p>
          </div>

          {/* Appointments */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                  />
                  <path
                    strokeLinecap="round"
                    d="M16 2v4M8 2v4M3 10h18"
                  />
                </svg>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Appointments
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {appointmentCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Scheduled appointments
            </p>
          </div>

          {/* Calls */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"
                  />
                </svg>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Calls
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {callCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Receptionist calls
            </p>
          </div>
        </div>
      </section>

      {/* Test agent CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl sm:p-7">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-slate-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-4 w-4 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2v20M2 12h20"
                  />
                </svg>
              </span>

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                AI Demo
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Want to hear your AI receptionist in action?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start a live voice conversation and test how the receptionist
              handles real customer requests.
            </p>
          </div>

          <Link
            href="/test-agent"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>

            Test AI Agent

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M13 6l6 6-6 6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Quick actions
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/customers"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  View Customers
                </p>

                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  Review customers captured by the receptionist.
                </p>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-slate-950 group-hover:text-white">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard/leads"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  View Leads
                </p>

                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  Review incoming service requests.
                </p>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-slate-950 group-hover:text-white">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard/appointments"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  View Appointments
                </p>

                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  Review scheduled appointments.
                </p>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-slate-950 group-hover:text-white">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard/calls"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  View Calls
                </p>

                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  Review receptionist calls and summaries.
                </p>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-slate-950 group-hover:text-white">
                →
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}