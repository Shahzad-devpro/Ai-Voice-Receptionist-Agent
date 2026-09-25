import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-lg font-bold text-slate-900">
            AI Voice Receptionist
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Platform Admin
          </p>
        </div>

        <nav className="px-3 py-5">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Management
          </p>

          <div className="space-y-1">
            <Link
              href="/admin"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Overview
            </Link>

            <Link
              href="/admin/businesses"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Businesses
            </Link>

            <Link
              href="/admin/users"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Client Users
            </Link>

            <Link
              href="/admin/services"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Services
            </Link>

            <Link
              href="/admin/knowledge-base"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Knowledge Base
            </Link>

            <Link
              href="/admin/calls"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Calls
            </Link>

            <Link
              href="/admin/appointments"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              Appointments
            </Link>
          </div>
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-200 bg-white p-4">
          <p className="truncate text-sm font-semibold text-slate-900">
            {profile.name ?? profile.email}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Platform Administrator
          </p>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Platform
              </p>

              <h2 className="text-lg font-bold text-slate-900">
                Administration
              </h2>
            </div>

            <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
              {profile.role}
            </span>
          </div>
        </header>

        <main className="p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}