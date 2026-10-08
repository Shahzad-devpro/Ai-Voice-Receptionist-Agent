import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";

  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

const adminSections = [
  {
    href: "/admin/businesses",
    title: "Businesses",
    description:
      "Manage client businesses and tenant configuration.",
    icon: "🏢",
  },
  {
    href: "/admin/users",
    title: "Client Users",
    description:
      "Manage users assigned to businesses.",
    icon: "👥",
  },
  {
    href: "/admin/services",
    title: "Services",
    description:
      "Configure services and appointment durations.",
    icon: "🛠️",
  },
  {
    href: "/admin/knowledge-base",
    title: "Knowledge Base",
    description:
      "Manage business-specific AI knowledge.",
    icon: "🧠",
  },
  {
    href: "/admin/contact-requests",
    title: "Contact Requests",
    description:
      "Review and manage requests from potential clients.",
    icon: "✉️",
  },
];

export default async function AdminPage() {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(124,58,237,0.08),_transparent_35%)]" />

          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Platform Admin
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Admin Overview
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Manage businesses, users, services, AI configuration,
                contact requests, calls, and appointments from one place.
              </p>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 8.25L21.75 12 18 15.75M21.75 12H9"
                  />
                </svg>

                Log Out
              </button>
            </form>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Platform Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage the core areas of your AI Voice Receptionist platform.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {adminSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-50 opacity-0 blur-2xl transition group-hover:opacity-100" />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl shadow-sm">
                      {section.icon}
                    </div>

                    <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500">
                      →
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-slate-950">
                    {section.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {section.description}
                  </p>

                  <div className="mt-5 text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                    Open section →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Account Card */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                A
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Current Account
                </h2>

                <p className="text-xs text-slate-500">
                  Your platform administrator account
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            <div className="bg-white px-6 py-5 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Name
              </p>

              <p className="mt-2 font-medium text-slate-900">
                {profile.name ?? "Not configured"}
              </p>
            </div>

            <div className="bg-white px-6 py-5 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-2 break-all font-medium text-slate-900">
                {profile.email}
              </p>
            </div>

            <div className="bg-white px-6 py-5 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Role
              </p>

              <div className="mt-2">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {profile.role}
                </span>
              </div>
            </div>

            <div className="bg-white px-6 py-5 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Business Access
              </p>

              <p className="mt-2 font-medium text-slate-900">
                Platform-wide
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>AI Voice Receptionist · Platform Administration</p>

          <Link
            href="/"
            className="font-medium text-slate-500 transition hover:text-blue-600"
          >
            Back to website →
          </Link>
        </div>
      </div>
    </div>
  );
}