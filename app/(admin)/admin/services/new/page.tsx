import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createService } from "../actions";

export default async function NewServicePage() {
  const supabase = await createClient();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, industry")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

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
          Add Service
        </h1>

        <p className="mt-2 text-slate-600">
          Add a service that the AI receptionist can offer to
          customers.
        </p>
      </div>

      <form
        action={createService}
        className="space-y-8"
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Service Information
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="business_id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Business
              </label>

              <select
                id="business_id"
                name="business_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              >
                <option value="" disabled>
                  Select a business
                </option>

                {businesses?.map((business) => (
                  <option
                    key={business.id}
                    value={business.id}
                  >
                    {business.name} — {business.industry}
                  </option>
                ))}
              </select>
            </div>

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
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="AC Repair"
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="Repair service for residential air conditioning systems."
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="60"
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Price (optional)
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="Leave empty for inspection/quote"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Leave empty when the service requires an
                  inspection or custom quote.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/services"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create Service
          </button>
        </div>
      </form>
    </div>
  );
}