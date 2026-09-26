
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
    /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

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
  businessHours: BusinessHours | null | undefined,
  weekday: string
): BusinessHoursEntry | null {
  if (!businessHours) {
    return null;
  }

  /*
   * Support Monday / monday / MONDAY
   * and similar key casing.
   */
  const matchingKey =
    Object.keys(businessHours).find(
      (key) =>
        key.toLowerCase() ===
        weekday.toLowerCase()
    );

  if (!matchingKey) {
    return null;
  }

  const hours =
    businessHours[matchingKey];

  if (
    !hours ||
    typeof hours !== "object"
  ) {
    return null;
  }

  return hours;
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
   * Verify customer belongs to
   * the current business.
   */
  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq(
      "business_id",
      context.businessId
    )
    .maybeSingle();

  if (customerError) {
    throw new Error(
      customerError.message
    );
  }

  if (!customer) {
    throw new Error(
      "Customer does not belong to this business."
    );
  }

  /*
   * Verify service belongs to
   * the current business.
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
    .eq("id", serviceId)
    .eq(
      "business_id",
      context.businessId
    )
    .maybeSingle();

  if (serviceError) {
    throw new Error(
      serviceError.message
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
   * Parse requested time.
   *
   * The input may contain an offset/timezone.
   * We immediately convert it into the
   * business timezone.
   */
  let start =
    DateTime.fromISO(
      requestedStartTime,
      {
        setZone: true,
      }
    );

  if (!start.isValid) {
    throw new Error(
      "Invalid appointment start time."
    );
  }

  start =
    start.setZone(
      business.timezone
    );

  if (!start.isValid) {
    throw new Error(
      "Invalid business timezone."
    );
  }

  if (
    start.second !== 0 ||
    start.millisecond !== 0
  ) {
    throw new Error(
      "Appointments must start on a whole minute."
    );
  }

  const end =
    start.plus({
      minutes:
        durationMinutes,
    });

  /*
   * Luxon weekday values:
   *
   * Monday    = 1
   * Tuesday   = 2
   * Wednesday = 3
   * Thursday  = 4
   * Friday    = 5
   * Saturday  = 6
   * Sunday    = 7
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
    business.businessHours as unknown as
      | BusinessHours
      | null
      | undefined;

  /*
   * Find the business hours without
   * assuming the database key casing.
   */
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

  if (!openTime || !closeTime) {
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
   * Make sure the complete appointment
   * fits inside business hours.
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
   * Store appointment timestamps in UTC.
   */
  const startUtc =
    start.toUTC();

  const endUtc =
    end.toUTC();

  /*
   * Application-level conflict check.
   *
   * Only SCHEDULED appointments block
   * the requested time.
   */
  const {
    data: conflictingAppointment,
    error: conflictError,
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
      endUtc.toISO()
    )
    .gt(
      "end_time",
      startUtc.toISO()
    )
    .limit(1)
    .maybeSingle();

  if (conflictError) {
    throw new Error(
      conflictError.message
    );
  }

  if (conflictingAppointment) {
    throw new Error(
      "The requested appointment slot is no longer available. Please offer another available slot."
    );
  }

  /*
   * Prevent the same customer from
   * having duplicate appointments at
   * exactly the same start time.
   */
  const {
    data: duplicateAppointment,
    error: duplicateCheckError,
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
      startUtc.toISO()
    )
    .eq(
      "status",
      "SCHEDULED"
    )
    .limit(1)
    .maybeSingle();

  if (duplicateCheckError) {
    throw new Error(
      duplicateCheckError.message
    );
  }

  if (duplicateAppointment) {
    throw new Error(
      "This customer already has an appointment at the requested time."
    );
  }

  /*
   * Final insert.
   *
   * PostgreSQL exclusion constraint
   * provides the final concurrency
   * protection.
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
        startUtc.toISO(),

      end_time:
        endUtc.toISO(),

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

  if (
    insertError ||
    !appointment
  ) {
    /*
     * PostgreSQL exclusion constraint:
     * 23P01 = exclusion_violation
     */
    if (
      insertError?.code ===
      "23P01"
    ) {
      throw new Error(
        "The requested appointment slot is no longer available. Please offer another available slot."
      );
    }

    throw new Error(
      insertError?.message ??
        "Failed to book appointment."
    );
  }

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
