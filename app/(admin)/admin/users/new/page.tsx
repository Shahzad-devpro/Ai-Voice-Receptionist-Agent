import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createClientUser } from "../actions";

export default async function NewClientUserPage() {
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
          href="/admin/users"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to client users
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Add Client User
        </h1>

        <p className="mt-2 text-slate-600">
          Create a login account and assign the user to a
          business.
        </p>
      </div>

      <form
        action={createClientUser}
        className="space-y-8"
      >
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            User Information
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full Name
              </label>

              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="John Smith"
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="john@business.com"
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="At least 8 characters"
              />

              <p className="mt-2 text-xs text-slate-500">
                Give the client a secure temporary password.
                We can add password-reset onboarding later.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Business Assignment
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            This determines which business data the client can
            access.
          </p>

          <div className="mt-5">
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
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/users"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create Client User
          </button>
        </div>
      </form>
    </div>
  );
}