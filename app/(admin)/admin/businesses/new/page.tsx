"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createBusiness,
  type CreateBusinessState,
} from "../actions";

const initialState: CreateBusinessState = {};

export default function NewBusinessPage() {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    createBusiness,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.push("/admin/businesses");
    }
  }, [state.success, router]);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <Link
          href="/admin/businesses"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to businesses
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Add Business
        </h1>

        <p className="mt-2 text-slate-600">
          Create a new client business and configure its
          basic platform settings.
        </p>
      </div>

      {state.error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form
        action={formAction}
        className="space-y-8"
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Business Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Business Name
              </label>

              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="Example: Bright Dental Clinic"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Industry
              </label>

              <select
                id="industry"
                name="industry"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              >
                <option value="" disabled>
                  Select industry
                </option>
                <option value="HVAC">HVAC</option>
                <option value="CLEANING">Cleaning</option>
                <option value="DENTAL">Dental</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Country
              </label>

              <input
                id="country"
                name="country"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="US"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="+12125550123"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="hello@business.com"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Address
              </label>

              <input
                id="address"
                name="address"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="123 Main Street, New York, NY"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="service_area"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Service Area
              </label>

              <input
                id="service_area"
                name="service_area"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="New York City and surrounding areas"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Localization
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="timezone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Timezone
              </label>

              <input
                id="timezone"
                name="timezone"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="America/New_York"
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Currency
              </label>

              <input
                id="currency"
                name="currency"
                required
                maxLength={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 uppercase outline-none focus:border-slate-900"
                placeholder="USD"
              />
            </div>

            <div>
              <label
                htmlFor="locale"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Locale
              </label>

              <input
                id="locale"
                name="locale"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="en-US"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            AI Instructions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            These instructions will later be provided to the
            business's AI receptionist.
          </p>

          <textarea
            id="ai_instructions"
            name="ai_instructions"
            rows={6}
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            placeholder="Act as a professional receptionist. Never invent prices or availability..."
          />
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/businesses"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Business"}
          </button>
        </div>
      </form>
    </div>
  );
}