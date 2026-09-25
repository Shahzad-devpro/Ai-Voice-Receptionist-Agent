import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminPage() {
  const { profile } = await requireAdmin();

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">
          Admin Overview
        </h1>

        <p className="mt-2 text-gray-600">
          Manage businesses, users, services, AI configuration,
          calls, and appointments.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/businesses"
          className="rounded-xl border bg-white p-6 transition hover:shadow-md"
        >
          <h2 className="font-semibold">
            Businesses
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Manage client businesses and tenant configuration.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-xl border bg-white p-6 transition hover:shadow-md"
        >
          <h2 className="font-semibold">
            Client Users
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Manage users assigned to businesses.
          </p>
        </Link>

        <Link
          href="/admin/services"
          className="rounded-xl border bg-white p-6 transition hover:shadow-md"
        >
          <h2 className="font-semibold">
            Services
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Configure services and appointment durations.
          </p>
        </Link>

        <Link
          href="/admin/knowledge-base"
          className="rounded-xl border bg-white p-6 transition hover:shadow-md"
        >
          <h2 className="font-semibold">
            Knowledge Base
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Manage business-specific AI knowledge.
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">
          Current Account
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Name
            </p>

            <p className="font-medium">
              {profile.name ?? "Not configured"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>

            <p className="font-medium">
              {profile.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Role
            </p>

            <p className="font-medium">
              {profile.role}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Business
            </p>

            <p className="font-medium">
              Platform-wide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}