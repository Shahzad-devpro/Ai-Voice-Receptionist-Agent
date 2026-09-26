import { DateTime } from "luxon";

import { createClient } from "@/lib/supabase/server";
import type { ToolContext } from "./get-business-information";

export type BookAppointmentInput = {
  serviceId: string;
  customerId: string;
  startTime: string;
};

export type BookAppointmentResult = {
  appointment: {
    id: string;
    serviceId: string;
    customerId: string;
    startTime: string;
    endTime: string;
    status: "SCHEDULED";
    timezone: string;
  };
};

export async function bookAppointment(
  context: ToolContext,
  input: BookAppointmentInput
): Promise<BookAppointmentResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const serviceId = input.serviceId.trim();
  const customerId = input.customerId.trim();
  const startTime = input.startTime.trim();

  if (!serviceId) {
    throw new Error("Service ID is required.");
  }

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!startTime) {
    throw new Error("Appointment start time is required.");
  }

  const supabase = await createClient();

  // Get business configuration.
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("timezone, business_hours")
      .eq("id", context.businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Business not found.");
  }

  // Verify service belongs to this business.
  const { data: service, error: serviceError } =
    await supabase
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("business_id", context.businessId)
      .single();

  if (serviceError || !service) {
    throw new Error("Service not found for this business.");
  }

  if (!service.is_active) {
    throw new Error("The requested service is not active.");
  }

  // Verify customer belongs to this business.
  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("business_id", context.businessId)
      .single();

  if (customerError || !customer) {
    throw new Error("Customer not found for this business.");
  }

  const timezone = business.timezone;

  /*
   * startTime is expected to be an ISO timestamp
   * representing the customer's requested local time.
   *
   * Example:
   * 2026-09-28T10:00:00
   */

  const localStart = DateTime.fromISO(startTime, {
    zone: timezone,
  });

  if (!localStart.isValid) {
    throw new Error("Invalid appointment start time.");
  }

  const localEnd = localStart.plus({
    minutes: service.duration_minutes,
  });

  // Determine business day.
  const dayKey = localStart
    .toFormat("cccc")
    .toLowerCase();

  const businessHours =
    (business.business_hours as Record<
      string,
      { open: string; close: string } | null
    >) ?? {};

  const hours = businessHours[dayKey];

  if (!hours) {
    throw new Error(
      "The business is closed on the requested day."
    );
  }

  const open = DateTime.fromISO(
    `${localStart.toFormat("yyyy-MM-dd")}T${hours.open}`,
    { zone: timezone }
  );

  const close = DateTime.fromISO(
    `${localStart.toFormat("yyyy-MM-dd")}T${hours.close}`,
    { zone: timezone }
  );

  // Appointment must completely fit inside business hours.
  if (localStart < open || localEnd > close) {
    throw new Error(
      "The requested appointment is outside business hours."
    );
  }

  const utcStart = localStart.toUTC();
  const utcEnd = localEnd.toUTC();

  /*
   * FINAL CONFLICT CHECK
   *
   * Only SCHEDULED appointments block the slot.
   */
  const { data: conflictingAppointments, error: conflictError } =
    await supabase
      .from("appointments")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("status", "SCHEDULED")
      .lt("start_time", utcEnd.toISO()!)
      .gt("end_time", utcStart.toISO()!);

  if (conflictError) {
    throw new Error(conflictError.message);
  }

  if (
    conflictingAppointments &&
    conflictingAppointments.length > 0
  ) {
    throw new Error(
      "The requested appointment time is no longer available."
    );
  }

  // Create appointment using UTC timestamps.
  const { data: appointment, error: appointmentError } =
    await supabase
      .from("appointments")
      .insert({
        business_id: context.businessId,
        customer_id: customerId,
        service_id: serviceId,
        start_time: utcStart.toISO(),
        end_time: utcEnd.toISO(),
        status: "SCHEDULED",
      })
      .select(
        "id, service_id, customer_id, start_time, end_time, status"
      )
      .single();

  if (appointmentError || !appointment) {
    throw new Error(
      appointmentError?.message ??
        "Failed to create appointment."
    );
  }

  return {
    appointment: {
      id: appointment.id,
      serviceId: appointment.service_id,
      customerId: appointment.customer_id,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      status: appointment.status,
      timezone,
    },
  };
}