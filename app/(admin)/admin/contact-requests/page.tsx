import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ContactRequestsPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: requests, error } =
    await supabase
      .from("contact_requests")
      .select(
        "id,name,business_name,business_type,email,phone,country,interest,message,status,email_sent,created_at"
      )
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(
      `Failed to load contact requests: ${error.message}`
    );
  }

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Sales inquiries
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Contact Requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Potential clients who asked to be contacted about
            AI receptionist or automation services.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          Back to Admin
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No contact requests yet
          </p>

          <p className="mt-2 text-sm text-slate-500">
            New inquiries will appear here when visitors submit
            the contact form.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Contact
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Business
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Interest
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Country
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-5 py-4 font-semibold text-slate-700">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {request.name}
                      </div>

                      <a
                        href={`mailto:${request.email}`}
                        className="mt-1 block text-xs text-blue-600 hover:underline"
                      >
                        {request.email}
                      </a>

                      {request.phone && (
                        <div className="mt-1 text-xs text-slate-500">
                          {request.phone}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {request.business_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {request.business_type}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {request.interest}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {request.country}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          request.status === "NEW"
                            ? "bg-blue-50 text-blue-700"
                            : request.status ===
                                "CONTACTED"
                              ? "bg-amber-50 text-amber-700"
                              : request.status ===
                                  "QUALIFIED"
                                ? "bg-violet-50 text-violet-700"
                                : request.status ===
                                    "CONVERTED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {request.status}
                      </span>

                      <div className="mt-2 text-[11px] text-slate-400">
                        Email{" "}
                        {request.email_sent
                          ? "sent"
                          : "not sent"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(
                        request.created_at
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}