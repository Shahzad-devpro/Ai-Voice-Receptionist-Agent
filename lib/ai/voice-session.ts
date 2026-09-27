import { createClient } from "@/lib/supabase/server";

export type VoiceSessionState = {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  leadId?: string;

  serviceId?: string;
  serviceName?: string;

  problem?: string;

  requestedDate?: string;
  requestedTime?: string;

  appointmentId?: string;
};

export type VoiceSession = {
  id: string;
  businessId: string;
  customerId: string | null;
  leadId: string | null;
  sessionStatus: "ACTIVE" | "COMPLETED" | "FAILED";
  state: VoiceSessionState;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapVoiceSession(
  row: Record<string, unknown>
): VoiceSession {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    customerId:
      typeof row.customer_id === "string"
        ? row.customer_id
        : null,
    leadId:
      typeof row.lead_id === "string"
        ? row.lead_id
        : null,
    sessionStatus:
      row.session_status as VoiceSession[
        "sessionStatus"
      ],
    state:
      typeof row.state === "object" &&
      row.state !== null &&
      !Array.isArray(row.state)
        ? (row.state as VoiceSessionState)
        : {},
    startedAt: String(row.started_at),
    endedAt:
      typeof row.ended_at === "string"
        ? row.ended_at
        : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createVoiceSession(
  businessId: string
): Promise<VoiceSession> {
  if (!businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("voice_sessions")
    .insert({
      business_id: businessId,
      session_status: "ACTIVE",
      state: {},
    })
    .select(
      `
        id,
        business_id,
        customer_id,
        lead_id,
        session_status,
        state,
        started_at,
        ended_at,
        created_at,
        updated_at
      `
    )
    .single();

 if (error) {
  console.error(
    "Failed to create voice session:",
    error
  );

  throw new Error(
    "Failed to create voice session."
  );
}

  return mapVoiceSession(data);
}

export async function getVoiceSession(
  businessId: string,
  sessionId: string
): Promise<VoiceSession> {
  if (!businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Voice session ID is required."
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("voice_sessions")
    .select(
      `
        id,
        business_id,
        customer_id,
        lead_id,
        session_status,
        state,
        started_at,
        ended_at,
        created_at,
        updated_at
      `
    )
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .single();

  if (error || !data) {
    throw new Error(
      "Voice session not found."
    );
  }

  return mapVoiceSession(data);
}

export async function updateVoiceSession(
  businessId: string,
  sessionId: string,
  updates: {
    customerId?: string | null;
    leadId?: string | null;
    state?: VoiceSessionState;
  }
): Promise<VoiceSession> {
  if (!businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Voice session ID is required."
    );
  }

  const supabase = await createClient();

  const existing =
    await getVoiceSession(
      businessId,
      sessionId
    );

  if (
    existing.sessionStatus !==
    "ACTIVE"
  ) {
    throw new Error(
      "Voice session is no longer active."
    );
  }

  const updateData: Record<
    string,
    unknown
  > = {};

  if (
    updates.customerId !== undefined
  ) {
    updateData.customer_id =
      updates.customerId;
  }

  if (
    updates.leadId !== undefined
  ) {
    updateData.lead_id =
      updates.leadId;
  }

  if (updates.state !== undefined) {
    updateData.state = {
      ...existing.state,
      ...updates.state,
    };
  }

  if (
    Object.keys(updateData).length ===
    0
  ) {
    return existing;
  }

 updateData.updated_at =
  new Date().toISOString();

const { data, error } = await supabase
  .from("voice_sessions")
  .update(updateData)
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .select(
      `
        id,
        business_id,
        customer_id,
        lead_id,
        session_status,
        state,
        started_at,
        ended_at,
        created_at,
        updated_at
      `
    )
    .single();

  if (error || !data) {
  console.error(
    "Failed to update voice session:",
    error
  );

  throw new Error(
    "Failed to update voice session."
  );
}

  return mapVoiceSession(data);
}

export async function completeVoiceSession(
  businessId: string,
  sessionId: string,
  endedAt?: string
): Promise<VoiceSession> {
  if (!businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Voice session ID is required."
    );
  }

  const supabase = await createClient();

  const existing =
    await getVoiceSession(
      businessId,
      sessionId
    );

  if (
    existing.sessionStatus !==
    "ACTIVE"
  ) {
    return existing;
  }

 const completionTime =
  endedAt ?? new Date().toISOString();

const { data, error } = await supabase
  .from("voice_sessions")
  .update({
    session_status: "COMPLETED",
    ended_at: completionTime,
    updated_at: completionTime,
  })
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .select(
      `
        id,
        business_id,
        customer_id,
        lead_id,
        session_status,
        state,
        started_at,
        ended_at,
        created_at,
        updated_at
      `
    )
    .single();

  if (error || !data) {
  console.error(
    "Failed to complete voice session:",
    error
  );

  throw new Error(
    "Failed to complete voice session."
  );
}

  return mapVoiceSession(data);
}

export async function failVoiceSession(
  businessId: string,
  sessionId: string
): Promise<VoiceSession> {
  if (!businessId) {
    throw new Error(
      "Business context is required."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Voice session ID is required."
    );
  }

  const supabase = await createClient();

  const existing =
    await getVoiceSession(
      businessId,
      sessionId
    );

  if (
    existing.sessionStatus !==
    "ACTIVE"
  ) {
    return existing;
  }

  const { data, error } = await supabase
    .from("voice_sessions")
    .update({
  session_status: "FAILED",
  ended_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .select(
      `
        id,
        business_id,
        customer_id,
        lead_id,
        session_status,
        state,
        started_at,
        ended_at,
        created_at,
        updated_at
      `
    )
    .single();

 if (error || !data) {
  console.error(
    "Failed to fail voice session:",
    error
  );

  throw new Error(
    "Failed to fail voice session."
  );
}

  return mapVoiceSession(data);
}