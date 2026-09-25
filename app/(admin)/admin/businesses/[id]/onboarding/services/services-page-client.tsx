"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createOnboardingService,
  type CreateServiceState,
} from "./actions";

type ServicesPageProps = {
  businessId: string;
  businessName: string;
  industry: string;
  currency: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number | null;
    is_active: boolean;
  }[];
};

const initialState: CreateServiceState = {};

export default function ServicesPageClient({
  businessId,
  businessName,
  industry,
  currency,
  services,
}: ServicesPageProps) {
  const router = useRouter();

  const action = createOnboardingService.bind(
    null,
    businessId
  );

  const [state, formAction, pending] = useActionState(
    action,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link
          href={`/admin/businesses/${businessId}/onboarding/hours`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to business hours
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Step 3 of 5
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Services
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Configure the services that {businessName} offers
            to customers.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Business
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Name
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {businessName}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Industry
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {industry}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Currency
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {currency}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Add Service
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add a service that the AI receptionist can offer
            to customers.
          </p>
        </div>

        {state.error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Service added successfully.
          </div>
        )}

        <form
          action={formAction}
          className="mt-6 space-y-6"
        >
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
              placeholder="Example: AC Repair"
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
              placeholder="Describe what this service includes..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
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
                max="1440"
                step="1"
                required
                placeholder="60"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Price ({currency}) — Optional
              </label>

              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave empty if inspection/quote is required"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Adding..." : "Add Service"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Configured Services
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Services currently available for this business.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">
                      {service.name}
                    </h3>

                    <span
                      className={
                        service.is_active
                          ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700"
                          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"
                      }
                    >
                      {service.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  {service.description && (
                    <p className="mt-2 text-sm text-slate-500">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {service.duration_minutes} min
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {service.price !== null
                      ? `${currency} ${Number(
                          service.price
                        ).toFixed(2)}`
                      : "Quote required"}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No services configured yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add at least one service before continuing.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <Link
          href={`/admin/businesses/${businessId}/onboarding/knowledge`}
          className={
            services.length > 0
              ? "rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              : "pointer-events-none rounded-lg bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-400"
          }
        >
          Continue to Knowledge Base →
        </Link>
      </div>
    </div>
  );
}