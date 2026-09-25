import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import { getBusinessReadiness } from "@/lib/onboarding/get-business-readiness";

type OnboardingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OnboardingPage({
  params,
}: OnboardingPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      industry,
      country,
      timezone,
      currency,
      locale,
      status
    `)
    .eq("id", id)
    .single();

  if (error || !business) {
    notFound();
  }

  const readiness = await getBusinessReadiness(business.id);

  const steps = [
    {
      number: 1,
      title: "Business Information",
      description: "Basic business and localization settings.",
      href: `/admin/businesses/${business.id}/onboarding`,
      current: true,
    },
    {
      number: 2,
      title: "Business Hours",
      description: "Configure operating hours and availability.",
      href: `/admin/businesses/${business.id}/onboarding/hours`,
      current: false,
    },
    {
      number: 3,
      title: "Services",
      description: "Configure services offered by the business.",
      href: `/admin/businesses/${business.id}/onboarding/services`,
      current: false,
    },
    {
      number: 4,
      title: "Knowledge Base",
      description: "Add FAQs, policies, and business information.",
      href: `/admin/businesses/${business.id}/onboarding/knowledge`,
      current: false,
    },
    {
      number: 5,
      title: "Client User",
      description: "Create the client's dashboard account.",
      href: `/admin/businesses/${business.id}/onboarding/client-user`,
      current: false,
    },
  ];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/businesses"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to businesses
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Managed onboarding
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {business.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Configure this business before activating its AI receptionist.
          </p>
        </div>
      </div>

      {/* Business summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Business
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {business.name}
            </h2>
          </div>

          <span
            className={
              business.status === "ACTIVE"
                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
            }
          >
            {business.status}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Industry
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {business.industry}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Country
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {business.country}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Timezone
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {business.timezone}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Currency
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {business.currency}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        AI Receptionist Readiness
      </p>

      <h2 className="mt-1 text-xl font-semibold text-slate-950">
        {readiness.ready
          ? "Business is ready"
          : "Business needs setup"}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {readiness.ready
          ? "All required onboarding configuration is complete."
          : "Complete the remaining requirements before activating the AI receptionist."}
      </p>
    </div>

    <span
      className={
        readiness.ready
          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
      }
    >
      {readiness.ready
        ? "READY"
        : "NEEDS SETUP"}
    </span>
  </div>

  <div className="mt-6 grid gap-3 sm:grid-cols-2">
    {[
      {
        label: "Business active",
        complete: readiness.checks.businessActive,
      },
      {
        label: "Valid timezone",
        complete: readiness.checks.timezoneValid,
      },
      {
        label: "Business hours",
        complete: readiness.checks.hoursConfigured,
      },
      {
        label: "Active service",
        complete: readiness.checks.serviceConfigured,
      },
      {
        label: "Knowledge base",
        complete: readiness.checks.knowledgeConfigured,
      },
      {
        label: "Client user",
        complete: readiness.checks.clientUserConfigured,
      },
    ].map((check) => (
      <div
        key={check.label}
        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
      >
        <span className="text-sm font-medium text-slate-700">
          {check.label}
        </span>

        <span
          className={
            check.complete
              ? "text-sm font-semibold text-green-600"
              : "text-sm font-semibold text-red-600"
          }
        >
          {check.complete ? "Complete" : "Missing"}
        </span>
      </div>
    ))}
  </div>

  {!readiness.ready && (
    <div className="mt-5 rounded-lg bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">
        Remaining requirements
      </p>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {readiness.missing.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )}
</section>

      {/* Steps */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Onboarding Steps
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete the configuration in order.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className={
                step.current
                  ? "rounded-xl border border-slate-300 bg-slate-50 p-5"
                  : "rounded-xl border border-slate-200 p-5"
              }
            >
              <div className="flex items-start gap-4">
                <div
                  className={
                    step.current
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500"
                  }
                >
                  {step.number}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {step.description}
                  </p>
                </div>

                {step.current ? (
                  <span className="text-xs font-semibold text-slate-700">
                    Current
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    Upcoming
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation */}
      <div className="mt-6 flex justify-end">
        <Link
          href={`/admin/businesses/${business.id}/onboarding/hours`}
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to Business Hours →
        </Link>
      </div>
    </div>
  );
}