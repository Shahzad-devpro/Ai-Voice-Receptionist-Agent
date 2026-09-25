import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  toggleServiceStatus,
  updateService,
} from "../../actions";

type EditServicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditServicePage({
  params,
}: EditServicePageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: service, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      duration_minutes,
      price,
      is_active,
      businesses (
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !service) {
    notFound();
  }

  const business = Array.isArray(service.businesses)
    ? service.businesses[0]
    : service.businesses;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/services"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to services
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Edit Service
        </h1>

        <p className="mt-2 text-slate-600">
          Update the configuration for this service.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Business
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {business?.name ?? "Unknown business"}
        </p>
      </div>

      {/* Main service update form */}
      <form
        id="update-service-form"
        action={updateService}
        className="space-y-8"
      >
        <input
          type="hidden"
          name="service_id"
          value={service.id}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Service Information
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Service Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={service.name}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={service.description ?? ""}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="duration_minutes"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Duration (minutes)
                </label>

                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={service.duration_minutes}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Price
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    service.price !== null
                      ? String(service.price)
                      : ""
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Leave empty for inspection or custom quote.
                </p>
              </div>
            </div>
          </div>
        </section>
      </form>

      {/* Separate status form */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Service Status
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Inactive services should not be offered or booked by
          the AI receptionist.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">
              Current status
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {service.is_active
                ? "This service is active."
                : "This service is inactive."}
            </p>
          </div>

          <form action={toggleServiceStatus}>
            <input
              type="hidden"
              name="service_id"
              value={service.id}
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {service.is_active
                ? "Deactivate Service"
                : "Activate Service"}
            </button>
          </form>
        </div>
      </section>

      {/* Final page actions */}
      <div className="mt-8 flex justify-end gap-3">
        <Link
          href="/admin/services"
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          form="update-service-form"
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}