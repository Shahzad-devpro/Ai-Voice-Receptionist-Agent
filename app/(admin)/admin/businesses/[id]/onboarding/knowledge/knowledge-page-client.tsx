"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createKnowledgeEntry,
  type KnowledgeState,
} from "./actions";

type KnowledgePageClientProps = {
  businessId: string;
  businessName: string;
  entries: {
    id: string;
    title: string;
    content: string;
    created_at: string;
  }[];
};

const initialState: KnowledgeState = {};

export default function KnowledgePageClient({
  businessId,
  businessName,
  entries,
}: KnowledgePageClientProps) {
  const router = useRouter();

  const action = createKnowledgeEntry.bind(
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
          href={`/admin/businesses/${businessId}/onboarding/services`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to services
        </Link>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">
            Step 4 of 5
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Knowledge Base
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Add information that the AI receptionist can use
            when answering customer questions for{" "}
            {businessName}.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Add Knowledge
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add FAQs, policies, service information, or other
            business-specific instructions.
          </p>
        </div>

        {state.error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Knowledge entry added successfully.
          </div>
        )}

        <form
          action={formAction}
          className="mt-6 space-y-6"
        >
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Title
            </label>

            <input
              id="title"
              name="title"
              required
              placeholder="Example: Emergency Service Policy"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Content
            </label>

            <textarea
              id="content"
              name="content"
              required
              rows={7}
              placeholder="Example: Emergency HVAC service is available Monday through Saturday..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "Adding..."
                : "Add Knowledge"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Knowledge Entries
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Information currently configured for this
            business.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-slate-200 p-5"
            >
              <h3 className="font-semibold text-slate-900">
                {entry.title}
              </h3>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {entry.content}
              </p>
            </article>
          ))}

          {entries.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No knowledge entries configured yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add FAQs and business policies above.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <Link
          href={`/admin/businesses/${businessId}/onboarding/client-user`}
          className={
            entries.length > 0
              ? "rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              : "pointer-events-none rounded-lg bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-400"
          }
        >
          Continue to Client User →
        </Link>
      </div>
    </div>
  );
}