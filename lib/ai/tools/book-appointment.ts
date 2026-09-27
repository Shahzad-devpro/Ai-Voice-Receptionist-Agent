import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";

import type { ToolContext } from "./get-business-information";
import { getBusinessContext } from "../get-business-context";

type BookAppointmentInput = {
  serviceId: string;
  customerId: string;
  startTime: string;
};

type BookAppointmentResult = {
  appointment: {
    id: string;
    businessId: string;
    customerId: string;
    serviceId: string;
    startTime: string;
    endTime: string;
    status: string;
  };
};

type BusinessHoursEntry = {
  open?: string | null;
  close?: string | null;
};

type BusinessHours = Record<
  string,
  BusinessHoursEntry | null | undefined
>;

function parseTime(
  value: string
): {
  hour: number;
  minute: number;
} | null {
  const match =
    /^(\d{2}):(\d{2})$/.exec(
      value
    );

  if (!match) {
    return null;
  }

  const hour = Number(
    match[1]
  );

  const minute = Number(
    match[2]
  );

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
  };
}

function getBusinessDayHours(
  businessHours:
    | BusinessHours
    | null
    | undefined,
  weekday: string
): BusinessHoursEntry | null {
  if (!businessHours) {
    return null;
  }

  const matchingKey =
    Object.keys(
      businessHours
    ).find(
      (key) =>
        key.toLowerCase() ===
        weekday.toLowerCase()
    );

  if (!matchingKey) {
    return null;
  }

  const hours =
    businessHours[
      matchingKey
    ];

  if (
    !hours ||
    typeof hours !== "object"
  ) {
    return null;
  }

  return hours;
}

function parseAppointmentStart(
  value: string
): DateTime {
  const normalized =
    value.trim();

  /*
   * bookAppointment receives the exact ISO
   * timestamp returned by checkAvailability.
   *
   * We intentionally require ISO here instead of
   * accepting free-form "2 PM" text. This prevents
   * Gemini from changing the meaning of the selected slot
   * between availability checking and booking.
   */
  const parsed =
    DateTime.fromISO(
      normalized,
      {
        setZone: true,
      }
    );

  if (!parsed.isValid) {
    throw new Error(
      "Invalid appointment start time. The booking tool requires the exact ISO timestamp returned by checkAvailability."
    );
  }

  if (
    parsed.second !== 0 ||
    parsed.millisecond !== 0
  ) {
    throw new Error(
      "Appointments must start on a whole minute."
    );
  }

  return parsed;
}

export async function bookAppointment(
  context: ToolContext,
  input: BookAppointmentInput
): Promise<BookAppointmentResult> {
  if (!context.businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  const serviceId =
    input.serviceId?.trim();

  const customerId =
    input.customerId?.trim();

  const requestedStartTime =
    input.startTime?.trim();

  if (!serviceId) {
    throw new Error(
      "Service ID is required."
    );
  }

  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!requestedStartTime) {
    throw new Error(
      "Appointment start time is required."
    );
  }

  const business =
    await getBusinessContext(
      context.businessId
    );

  const supabase =
    await createClient();

  /*
   * Verify customer belongs to the current
   * authorized business.
   */
  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select(
      "id, name, phone, address"
    )
    .eq(
      "id",
      customerId
    )
    .eq(
      "business_id",
      context.businessId
    )
    .maybeSingle();

  if (customerError) {
    console.error(
      "Failed to verify appointment customer:",
      customerError
    );

    throw new Error(
      "Failed to verify customer information."
    );
  }

  if (!customer) {
    throw new Error(
      "Customer does not belong to this business."
    );
  }

  if (!customer.name?.trim()) {
    throw new Error(
      "Customer name is required before booking."
    );
  }

  if (!customer.phone?.trim()) {
    throw new Error(
      "Customer phone number is required before booking."
    );
  }

  /*
   * Industry-specific booking requirements.
   */
  const requiresAddress =
    business.industry ===
      "HVAC" ||
    business.industry ===
      "CLEANING";

  if (
    requiresAddress &&
    !customer.address?.trim()
  ) {
    throw new Error(
      "A service address is required before booking this appointment."
    );
  }

  /*
   * Verify service belongs to this business.
   */
  const {
    data: service,
    error: serviceError,
  } = await supabase
    .from("services")
    .select(
      `
        id,
        name,
        duration_minutes,
        is_active
      `
    )
    .eq(
      "id",
      serviceId
    )
    .eq(
      "business_id",
      context.businessId
    )
    .maybeSingle();

  if (serviceError) {
    console.error(
      "Failed to verify appointment service:",
      serviceError
    );

    throw new Error(
      "Failed to verify appointment service."
    );
  }

  if (!service) {
    throw new Error(
      "Service does not belong to this business."
    );
  }

  if (!service.is_active) {
    throw new Error(
      "The requested service is not currently available."
    );
  }

  const durationMinutes =
    Number(
      service.duration_minutes
    );

  if (
    !Number.isInteger(
      durationMinutes
    ) ||
    durationMinutes <= 0
  ) {
    throw new Error(
      "Service has an invalid appointment duration."
    );
  }

  /*
   * Parse the exact timestamp returned by
   * checkAvailability.
   */
  const suppliedStart =
    parseAppointmentStart(
      requestedStartTime
    );

  /*
   * Convert it into the business timezone.
   *
   * If Gemini supplies:
   *
   * 2026-09-29T14:00:00-04:00
   *
   * for an America/New_York business,
   * the business-local time remains 2 PM.
   */
  const start =
    suppliedStart.setZone(
      business.timezone
    );

  if (!start.isValid) {
    throw new Error(
      "Invalid business timezone."
    );
  }

  const end =
    start.plus({
      minutes:
        durationMinutes,
    });

  /*
   * Diagnostic logging for appointment debugging.
   *
   * This makes it immediately visible whether
   * Gemini supplied the wrong time or whether
   * the database conversion is wrong.
   */
  console.log(
    "Booking appointment:",
    {
      businessId:
        context.businessId,

      serviceId,

      customerId,

      suppliedStartTime:
        requestedStartTime,

      businessTimezone:
        business.timezone,

      businessLocalStart:
        start.toISO(),

      businessLocalEnd:
        end.toISO(),

      utcStart:
        start.toUTC().toISO(),

      utcEnd:
        end.toUTC().toISO(),
    }
  );

  /*
   * Reject malformed timestamps.
   */
  if (
    start.second !== 0 ||
    start.millisecond !== 0
  ) {
    throw new Error(
      "Appointments must start on a whole minute."
    );
  }

  /*
   * Determine business weekday.
   */
  const weekdayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const weekday =
    weekdayNames[
      start.weekday - 1
    ];

  if (!weekday) {
    throw new Error(
      "Unable to determine appointment weekday."
    );
  }

  const businessHours =
    business.businessHours as
      | BusinessHours
      | null
      | undefined;

  const hours =
    getBusinessDayHours(
      businessHours,
      weekday
    );

  if (
    !hours ||
    !hours.open ||
    !hours.close
  ) {
    throw new Error(
      `The business is closed on ${weekday}.`
    );
  }

  const openTime =
    parseTime(hours.open);

  const closeTime =
    parseTime(hours.close);

  if (
    !openTime ||
    !closeTime
  ) {
    throw new Error(
      `Business hours for ${weekday} are incorrectly configured.`
    );
  }

  const open =
    start
      .startOf("day")
      .set({
        hour: openTime.hour,
        minute: openTime.minute,
        second: 0,
        millisecond: 0,
      });

  const close =
    start
      .startOf("day")
      .set({
        hour: closeTime.hour,
        minute: closeTime.minute,
        second: 0,
        millisecond: 0,
      });

  /*
   * The entire appointment must fit inside
   * business hours.
   */
  if (
    start < open ||
    end > close
  ) {
    throw new Error(
      "The requested appointment is outside business hours."
    );
  }

  /*
   * Store database timestamps in UTC.
   */
  const startUtc =
    start.toUTC();

  const endUtc =
    end.toUTC();

  const startIso =
    startUtc.toISO();

  const endIso =
    endUtc.toISO();

  if (
    !startIso ||
    !endIso
  ) {
    throw new Error(
      "Failed to convert appointment time to UTC."
    );
  }

  /*
   * Application-level conflict check.
   */
  const {
    data:
      conflictingAppointment,
    error:
      conflictError,
  } = await supabase
    .from("appointments")
    .select("id")
    .eq(
      "business_id",
      context.businessId
    )
    .eq(
      "status",
      "SCHEDULED"
    )
    .lt(
      "start_time",
      endIso
    )
    .gt(
      "end_time",
      startIso
    )
    .limit(1)
    .maybeSingle();

  if (conflictError) {
    console.error(
      "Failed to check appointment conflicts:",
      conflictError
    );

    throw new Error(
      "Failed to check appointment availability."
    );
  }

  if (conflictingAppointment) {
    throw new Error(
      "The requested appointment slot is no longer available. Please offer another available slot."
    );
  }

  /*
   * Prevent duplicate appointment for the
   * same customer at the exact same time.
   */
  const {
    data:
      duplicateAppointment,
    error:
      duplicateCheckError,
  } = await supabase
    .from("appointments")
    .select("id")
    .eq(
      "business_id",
      context.businessId
    )
    .eq(
      "customer_id",
      customerId
    )
    .eq(
      "start_time",
      startIso
    )
    .eq(
      "status",
      "SCHEDULED"
    )
    .limit(1)
    .maybeSingle();

  if (duplicateCheckError) {
    console.error(
      "Failed to check duplicate appointment:",
      duplicateCheckError
    );

    throw new Error(
      "Failed to check existing appointments."
    );
  }

  if (duplicateAppointment) {
    throw new Error(
      "This customer already has an appointment scheduled for this time."
    );
  }

  /*
   * Final insert.
   *
   * PostgreSQL exclusion constraint remains the
   * final concurrency protection.
   */
  const {
    data: appointment,
    error: insertError,
  } = await supabase
    .from("appointments")
    .insert({
      business_id:
        context.businessId,

      customer_id:
        customerId,

      service_id:
        serviceId,

      start_time:
        startIso,

      end_time:
        endIso,

      status:
        "SCHEDULED",
    })
    .select(
      `
        id,
        business_id,
        customer_id,
        service_id,
        start_time,
        end_time,
        status
      `
    )
    .single();

  if (insertError) {
    console.error(
      "Failed to book appointment:",
      insertError
    );

    if (
      insertError.code ===
      "23P01"
    ) {
      throw new Error(
        "The requested appointment slot is no longer available. Please offer another available slot."
      );
    }

    throw new Error(
      "Failed to book appointment."
    );
  }

  if (!appointment) {
    console.error(
      "Appointment insert returned no appointment."
    );

    throw new Error(
      "Appointment was not created."
    );
  }

  console.log(
    "Appointment successfully booked:",
    {
      appointmentId:
        appointment.id,

      businessId:
        appointment.business_id,

      serviceId:
        appointment.service_id,

      customerId:
        appointment.customer_id,

      startTime:
        appointment.start_time,

      endTime:
        appointment.end_time,
    }
  );

  return {
    appointment: {
      id:
        appointment.id,

      businessId:
        appointment.business_id,

      customerId:
        appointment.customer_id,

      serviceId:
        appointment.service_id,

      startTime:
        appointment.start_time,

      endTime:
        appointment.end_time,

      status:
        appointment.status,
    },
  };
}