import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function UsersPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      name,
      role,
      business_id,
      created_at,
      businesses (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Client Users
          </h1>

          <p className="mt-2 text-slate-600">
            Manage users who have access to client business dashboards.
          </p>
        </div>
        <Link
  href="/admin/users/new"
  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
>
  Add Client User
</Link>
       
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Business
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>

                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {users?.map((user) => {
                const business = Array.isArray(user.businesses)
                  ? user.businesses[0]
                  : user.businesses;

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {user.name ?? "Unnamed User"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {business?.name ?? "Platform-wide"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          user.role === "PLATFORM_ADMIN"
                            ? "rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
                            : "rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                        }
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}

              {(!users || users.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}