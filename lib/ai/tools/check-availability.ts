import { DateTime } from "luxon";

import { createClient } from "@/lib/supabase/server";
import type { ToolContext } from "./get-business-information";

export type CheckAvailabilityInput = {
  serviceId: string;
  requestedDate: string;
  requestedTime: string;
};

export type CheckAvailabilityResult = {
  available: boolean;
  requestedSlot: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  alternatives: {
    startTime: string;
    endTime: string;
  }[];
};

type BusinessHours = {
  open: string;
  close: string;
};

export async function checkAvailability(
  context: ToolContext,
  input: CheckAvailabilityInput
): Promise<CheckAvailabilityResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const requestedDate = input.requestedDate.trim();
  const requestedTime = input.requestedTime.trim();

  if (!requestedDate) {
    throw new Error("Requested date is required.");
  }

  if (!requestedTime) {
    throw new Error("Requested time is required.");
  }

  const supabase = await createClient();

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("timezone, business_hours")
      .eq("id", context.businessId)
      .single();

  if (businessError || !business) {
    throw new Error("Business not found.");
  }

  const { data: service, error: serviceError } =
    await supabase
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", input.serviceId)
      .eq("business_id", context.businessId)
      .single();

  if (serviceError || !service) {
    throw new Error("Service not found for this business.");
  }

  if (!service.is_active) {
    throw new Error("The requested service is not active.");
  }

  const timezone = business.timezone;

  const localStart = DateTime.fromISO(
    `${requestedDate}T${requestedTime}`,
    {
      zone: timezone,
    }
  );

  if (!localStart.isValid) {
    throw new Error("Invalid date or time.");
  }

  const localEnd = localStart.plus({
    minutes: service.duration_minutes,
  });

  const requestedSlot = {
    startTime: localStart.toISO()!,
    endTime: localEnd.toISO()!,
    timezone,
  };

  const businessHours =
    (business.business_hours as Record<
      string,
      BusinessHours | null
    >) ?? {};

  function getHours(dateTime: DateTime) {
    const dayKey = dateTime
      .toFormat("cccc")
      .toLowerCase();

    return businessHours[dayKey];
  }

  const requestedHours = getHours(localStart);

  // Business is closed on the requested day.
  if (!requestedHours) {
    return {
      available: false,
      requestedSlot,
      alternatives: [],
    };
  }

  const requestedOpen = DateTime.fromISO(
    `${requestedDate}T${requestedHours.open}`,
    { zone: timezone }
  );

  const requestedClose = DateTime.fromISO(
    `${requestedDate}T${requestedHours.close}`,
    { zone: timezone }
  );

  // Requested appointment must fit inside business hours.
  if (
    localStart < requestedOpen ||
    localEnd > requestedClose
  ) {
    return {
      available: false,
      requestedSlot,
      alternatives: [],
    };
  }

  const requestedStartUtc = localStart.toUTC().toISO()!;
  const requestedEndUtc = localEnd.toUTC().toISO()!;

  const dayStart = localStart.startOf("day").toUTC().toISO()!;
  const dayEnd = localStart.endOf("day").toUTC().toISO()!;

  // Get all scheduled appointments for the requested day.
  const { data: appointments, error: appointmentsError } =
    await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("business_id", context.businessId)
      .eq("status", "SCHEDULED")
      .lt("start_time", dayEnd)
      .gt("end_time", dayStart);

  if (appointmentsError) {
    throw new Error(appointmentsError.message);
  }

  const hasConflict = (
    start: DateTime,
    end: DateTime
  ) => {
    return (appointments ?? []).some((appointment) => {
      const appointmentStart = DateTime.fromISO(
        appointment.start_time
      );

      const appointmentEnd = DateTime.fromISO(
        appointment.end_time
      );

      return (
        appointmentStart < end.toUTC() &&
        appointmentEnd > start.toUTC()
      );
    });
  };

  const available = !hasConflict(
    localStart,
    localEnd
  );

  if (available) {
    return {
      available: true,
      requestedSlot,
      alternatives: [],
    };
  }

  // Search for nearby alternatives.
  const alternatives: {
    startTime: string;
    endTime: string;
  }[] = [];

  // Search up to 4 hours after the requested time.
  for (let minutes = 60; minutes <= 240; minutes += 60) {
    const candidateStart = localStart.plus({
      minutes,
    });

    const candidateEnd = candidateStart.plus({
      minutes: service.duration_minutes,
    });

    const candidateHours = getHours(candidateStart);

    if (!candidateHours) {
      continue;
    }

    const candidateOpen = DateTime.fromISO(
      `${candidateStart.toFormat("yyyy-MM-dd")}T${candidateHours.open}`,
      { zone: timezone }
    );

    const candidateClose = DateTime.fromISO(
      `${candidateStart.toFormat("yyyy-MM-dd")}T${candidateHours.close}`,
      { zone: timezone }
    );

    if (
      candidateStart < candidateOpen ||
      candidateEnd > candidateClose
    ) {
      continue;
    }

    if (
      !hasConflict(
        candidateStart,
        candidateEnd
      )
    ) {
      alternatives.push({
        startTime: candidateStart.toISO()!,
        endTime: candidateEnd.toISO()!,
      });
    }

    if (alternatives.length === 3) {
      break;
    }
  }

  return {
    available: false,
    requestedSlot,
    alternatives,
  };
}