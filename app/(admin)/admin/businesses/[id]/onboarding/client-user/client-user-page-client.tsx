"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createOnboardingClientUser,
  type CreateClientUserState,
} from "./actions";

type ClientUserPageClientProps = {
  businessId: string;
  businessName: string;
  industry: string;
  clientUsers: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    created_at: string;
  }[];
};

const initialState: CreateClientUserState = {};

export default function ClientUserPageClient({
  businessId,
  businessName,
  industry,
  clientUsers,
}: ClientUserPageClientProps) {
  const router = useRouter();

  const action = createOnboardingClientUser.bind(
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
          href={`/admin/businesses/${businessId}/onboarding/knowledge`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to knowledge base
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Step 5 of 5
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Client User
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create the dashboard account for {businessName}.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Business
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Business
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
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Create Client Account
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            This account will only have access to this
            business's client dashboard.
          </p>
        </div>

        {state.error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Client account created successfully.
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
              Client Name
            </label>

            <input
              id="name"
              name="name"
              required
              placeholder="Sarah Johnson"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
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
              required
              placeholder="sarah@business.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Temporary Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />

            <p className="mt-2 text-xs text-slate-500">
              Give the client this temporary password securely.
              We can add a proper password-reset/invitation flow
              later.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "Creating..."
                : "Create Client Account"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Client Users
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Client accounts currently assigned to this
            business.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {clientUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {user.name ?? "Unnamed client"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {user.email}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {user.role}
                </span>
              </div>
            </div>
          ))}

          {clientUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No client account created yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/admin/businesses/${businessId}/onboarding/knowledge`}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </Link>

        <Link
          href={`/admin/businesses/${businessId}/onboarding`}
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Finish Onboarding →
        </Link>
      </div>
    </div>
  );
}