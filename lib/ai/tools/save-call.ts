import { createClient } from "@/lib/supabase/server";
import type { ToolContext } from "./get-business-information";

export type SaveCallInput = {
  callerPhone?: string;
  customerId?: string;
  transcript?: string;
  summary?: string;
  outcome?: string;
  appointmentId?: string;
  leadId?: string;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
};

export type SaveCallResult = {
  call: {
    id: string;
    customerId: string | null;
    callerPhone: string | null;
    durationSeconds: number | null;
    transcript: string | null;
    summary: string | null;
    outcome: string | null;
    appointmentId: string | null;
    leadId: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
};

export async function saveCall(
  context: ToolContext,
  input: SaveCallInput
): Promise<SaveCallResult> {
  if (!context.businessId) {
    throw new Error("Business context is required.");
  }

  const callerPhone = input.callerPhone?.trim() || null;
  const transcript = input.transcript?.trim() || null;
  const summary = input.summary?.trim() || null;
  const outcome = input.outcome?.trim() || null;

  const customerId = input.customerId?.trim() || null;
  const appointmentId = input.appointmentId?.trim() || null;
  const leadId = input.leadId?.trim() || null;

  const durationSeconds =
    input.durationSeconds === undefined
      ? null
      : Number(input.durationSeconds);

  if (
    durationSeconds !== null &&
    (!Number.isInteger(durationSeconds) ||
      durationSeconds < 0)
  ) {
    throw new Error(
      "Duration must be a non-negative integer."
    );
  }

  const startedAt = input.startedAt?.trim() || null;
  const endedAt = input.endedAt?.trim() || null;

  const supabase = await createClient();

  if (customerId) {
    const { data: customer, error } =
      await supabase
        .from("customers")
        .select("id")
        .eq("id", customerId)
        .eq("business_id", context.businessId)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!customer) {
      throw new Error(
        "Customer does not belong to this business."
      );
    }
  }

  if (appointmentId) {
    const { data: appointment, error } =
      await supabase
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .eq("business_id", context.businessId)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!appointment) {
      throw new Error(
        "Appointment does not belong to this business."
      );
    }
  }

  if (leadId) {
    const { data: lead, error } =
      await supabase
        .from("leads")
        .select("id")
        .eq("id", leadId)
        .eq("business_id", context.businessId)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!lead) {
      throw new Error(
        "Lead does not belong to this business."
      );
    }
  }

  const { data, error } = await supabase
    .from("calls")
    .insert({
      business_id: context.businessId,
      customer_id: customerId,
      caller_phone: callerPhone,
      duration_seconds: durationSeconds,
      transcript,
      summary,
      outcome,
      appointment_id: appointmentId,
      lead_id: leadId,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .select(
      `
        id,
        customer_id,
        caller_phone,
        duration_seconds,
        transcript,
        summary,
        outcome,
        appointment_id,
        lead_id,
        started_at,
        ended_at
      `
    )
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Failed to save call."
    );
  }

  return {
    call: {
      id: data.id,
      customerId: data.customer_id,
      callerPhone: data.caller_phone,
      durationSeconds: data.duration_seconds,
      transcript: data.transcript,
      summary: data.summary,
      outcome: data.outcome,
      appointmentId: data.appointment_id,
      leadId: data.lead_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
    },
  };
}