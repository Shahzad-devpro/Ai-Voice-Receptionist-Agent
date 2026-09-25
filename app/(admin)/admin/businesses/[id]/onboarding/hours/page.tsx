import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import { saveBusinessHours } from "./actions";

type HoursPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type DayHours = {
  open: string;
  close: string;
};

type BusinessHours = {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
};

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "17:00" },
  tuesday: { open: "09:00", close: "17:00" },
  wednesday: { open: "09:00", close: "17:00" },
  thursday: { open: "09:00", close: "17:00" },
  friday: { open: "09:00", close: "17:00" },
  saturday: null,
  sunday: null,
};

function getBusinessHours(value: unknown): BusinessHours {
  if (!value || typeof value !== "object") {
    return DEFAULT_HOURS;
  }

  const source = value as Record<string, unknown>;

  return Object.fromEntries(
    DAYS.map(({ key }) => {
      const day = source[key];

      if (
        day &&
        typeof day === "object" &&
        "open" in day &&
        "close" in day
      ) {
        const hours = day as {
          open?: unknown;
          close?: unknown;
        };

        if (
          typeof hours.open === "string" &&
          typeof hours.close === "string"
        ) {
          return [
            key,
            {
              open: hours.open,
              close: hours.close,
            },
          ];
        }
      }

      return [key, null];
    })
  ) as BusinessHours;
}

export default async function BusinessHoursPage({
  params,
}: HoursPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      timezone,
      business_hours
    `)
    .eq("id", id)
    .single();

  if (error || !business) {
    notFound();
  }

  const hours = getBusinessHours(business.business_hours);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/businesses/${business.id}/onboarding`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to onboarding
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Step 2 of 5
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Business Hours
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Configure when {business.name} is available for customers.
          </p>
        </div>
      </div>

      {/* Timezone */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Timezone
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          All appointment times will be interpreted using this business timezone.
        </p>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            {business.timezone}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            IANA timezone
          </p>
        </div>
      </section>

      {/* Hours */}
     <form
  action={saveBusinessHours.bind(null, business.id)}
  className="mt-6"
>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Operating Hours
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enable a day and choose its opening and closing time.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              const isOpen = day !== null;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex w-36 items-center gap-3">
                      <input
                        type="checkbox"
                        name={`${key}_enabled`}
                        defaultChecked={isOpen}
                        className="h-4 w-4 rounded border-slate-300"
                      />

                      <span className="text-sm font-semibold text-slate-800">
                        {label}
                      </span>
                    </div>

                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex-1">
                        <label
                          htmlFor={`${key}_open`}
                          className="mb-1 block text-xs font-medium text-slate-500"
                        >
                          Opens
                        </label>

                        <input
                          id={`${key}_open`}
                          name={`${key}_open`}
                          type="time"
                          defaultValue={day?.open ?? "09:00"}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>

                      <span className="mt-5 text-slate-400">
                        →
                      </span>

                      <div className="flex-1">
                        <label
                          htmlFor={`${key}_close`}
                          className="mb-1 block text-xs font-medium text-slate-500"
                        >
                          Closes
                        </label>

                        <input
                          id={`${key}_close`}
                          name={`${key}_close`}
                          type="time"
                          defaultValue={day?.close ?? "17:00"}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href={`/admin/businesses/${business.id}/onboarding`}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save & Continue →
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}