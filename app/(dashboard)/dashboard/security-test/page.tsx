"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  name: string;
  industry: string;
};

type Service = {
  id: string;
  name: string;
  business_id: string;
};

export default function SecurityTestPage() {
  const supabase = createClient();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("No authenticated user.");
        return;
      }

      setUserEmail(user.email ?? "");

      const businessesResult = await supabase
        .from("businesses")
        .select("id, name, industry")
        .order("name");

      if (businessesResult.error) {
        setError(businessesResult.error.message);
        return;
      }

      const servicesResult = await supabase
        .from("services")
        .select("id, name, business_id")
        .order("name");

      if (servicesResult.error) {
        setError(servicesResult.error.message);
        return;
      }

      setBusinesses(businessesResult.data ?? []);
      setServices(servicesResult.data ?? []);
    }

    loadData();
  }, [supabase]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            Multi-Tenant Security Test
          </h1>

          <p className="mt-2 text-gray-600">
            Logged in as: {userEmail || "Loading..."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Businesses Visible to This User
          </h2>

          {businesses.length === 0 ? (
            <p className="text-gray-500">
              No businesses visible.
            </p>
          ) : (
            <div className="space-y-3">
              {businesses.map((business) => (
                <div
                  key={business.id}
                  className="rounded-lg border p-4"
                >
                  <p className="font-semibold">
                    {business.name}
                  </p>

                  <p className="text-sm text-gray-600">
                    Industry: {business.industry}
                  </p>

                  <p className="mt-1 break-all text-xs text-gray-500">
                    ID: {business.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Services Visible to This User
          </h2>

          {services.length === 0 ? (
            <p className="text-gray-500">
              No services visible.
            </p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg border p-4"
                >
                  <p className="font-semibold">
                    {service.name}
                  </p>

                  <p className="mt-1 break-all text-xs text-gray-500">
                    Business ID: {service.business_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}