import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import {
  completeVoiceSession,
  getVoiceSession,
} from "@/lib/ai/voice-session";
import { createClient } from "@/lib/supabase/server";
import { gemini } from "@/lib/ai/gemini";
import { AI_MODEL } from "@/lib/ai/config";

function calculateDurationSeconds(
  startedAt: string,
  endedAt: string
): number {
  const startedMs = new Date(startedAt).getTime();
  const endedMs = new Date(endedAt).getTime();

  if (
    !Number.isFinite(startedMs) ||
    !Number.isFinite(endedMs)
  ) {
    throw new Error(
      "Invalid voice session timestamps."
    );
  }

  return Math.max(
    0,
    Math.floor((endedMs - startedMs) / 1000)
  );
}

function cleanTranscript(
  transcript: unknown
): string | null {
  if (typeof transcript !== "string") {
    return null;
  }

  const cleaned = transcript.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 12000);
}

type CallNotes = {
  summary: string | null;
  shortTranscript: string | null;
};

async function generateCallNotes(
  transcript: string | null
): Promise<CallNotes> {
  if (!transcript) {
    return {
      summary: null,
      shortTranscript: null,
    };
  }

  try {
    const response =
      await gemini.models.generateContent({
        model: AI_MODEL,
        contents: `
You are creating concise internal call notes for a business owner.

Analyze the receptionist call transcript and return ONLY valid JSON.

Required JSON format:
{
  "summary": "short factual summary",
  "shortTranscript": "short dialogue excerpt"
}

SUMMARY RULES:
- 1 to 3 short sentences.
- Maximum 40 words.
- Focus on the customer's request, important details, actions taken, appointment information, and outcome.
- Mention names, services, dates, times, locations, or other important details when actually stated.
- Do not include greetings or small talk.
- Do not invent information.

SHORT TRANSCRIPT RULES:
- Maximum 6 lines.
- Include ONLY the most important exchanges.
- Each line must begin with either "Customer:" or "AI:".
- Do not reproduce the full conversation.
- Remove greetings, repetition, filler, and unnecessary conversation.
- Keep each line short.
- Preserve important details such as service, name, appointment date/time, location, or outcome.
- Do not invent dialogue.
- If there is very little useful conversation, return only the useful lines.

Example:
{
  "summary": "Customer requested a service appointment and booked a Monday 10 AM slot.",
  "shortTranscript": "Customer: Requested service appointment.\\nAI: Confirmed availability.\\nCustomer: Chose Monday at 10 AM.\\nAI: Confirmed appointment."
}

Return JSON only.

Call transcript:

${transcript}
        `.trim(),
      });

    const rawText =
      response.text?.trim();

    if (!rawText) {
      return {
        summary: null,
        shortTranscript: null,
      };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch =
        rawText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error(
          "Gemini returned invalid call notes JSON:",
          rawText
        );

        return {
          summary: null,
          shortTranscript: null,
        };
      }

      try {
        parsed = JSON.parse(
          jsonMatch[0]
        );
      } catch {
        console.error(
          "Failed to parse Gemini call notes:",
          rawText
        );

        return {
          summary: null,
          shortTranscript: null,
        };
      }
    }

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return {
        summary: null,
        shortTranscript: null,
      };
    }

    const result =
      parsed as Record<
        string,
        unknown
      >;

    const summary =
      typeof result.summary ===
      "string"
        ? result.summary.trim()
        : null;

    const shortTranscript =
      typeof result.shortTranscript ===
      "string"
        ? result.shortTranscript.trim()
        : null;

    return {
      summary: summary
        ? summary.slice(0, 1000)
        : null,

      shortTranscript:
        shortTranscript
          ? shortTranscript.slice(
              0,
              2000
            )
          : null,
    };
  } catch (error) {
    /*
     * AI note generation must never
     * prevent the call from being saved.
     */
    console.error(
      "Call notes generation failed:",
      error
    );

    return {
      summary: null,
      shortTranscript: null,
    };
  }
}

type FinalizeRequest = {
  sessionId?: unknown;
  transcript?: unknown;
};

function mapCallResponse(
  call: Record<string, unknown>
) {
  return {
    id: call.id,
    customerId:
      call.customer_id,
    callerPhone:
      call.caller_phone,
    durationSeconds:
      call.duration_seconds,
    transcript:
      call.transcript,
    summary:
      call.summary,
    outcome:
      call.outcome,
    appointmentId:
      call.appointment_id,
    leadId:
      call.lead_id,
    startedAt:
      call.started_at,
    endedAt:
      call.ended_at,
  };
}

async function getExistingCall(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  businessId: string,
  sessionId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("calls")
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
    .eq(
      "voice_session_id",
      sessionId
    )
    .eq(
      "business_id",
      businessId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to check existing call: ${error.message}`
    );
  }

  return data;
}

export async function POST(
  request: Request
) {
  try {
    const context =
      await getAgentContext();

    const supabase =
      await createClient();

    const body =
      (await request
        .json()
        .catch(() => ({}))) as FinalizeRequest;

    const sessionId =
      typeof body.sessionId ===
      "string"
        ? body.sessionId.trim()
        : "";

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Voice session ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Verify tenant ownership before
     * touching any session/call data.
     */
    const session =
      await getVoiceSession(
        context.businessId,
        sessionId
      );

    /*
     * First idempotency check.
     */
    const existingCall =
      await getExistingCall(
        supabase,
        context.businessId,
        sessionId
      );

    if (existingCall) {
      /*
       * The call already exists, so the
       * session should be completed as well.
       *
       * This also repairs a partially completed
       * previous finalization safely.
       */
      if (
        session.sessionStatus ===
        "ACTIVE"
      ) {
        await completeVoiceSession(
          context.businessId,
          sessionId,
          existingCall.ended_at ??
            undefined
        );
      }

      return NextResponse.json({
        success: true,
        alreadyFinalized: true,
        call: mapCallResponse(
          existingCall
        ),
      });
    }

    if (
      session.sessionStatus !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Voice session is no longer active and has not produced a call.",
        },
        { status: 409 }
      );
    }

    const transcript =
      cleanTranscript(
        body.transcript
      );

    /*
     * Generate ONE final timestamp.
     */
    const endedAt =
      new Date().toISOString();

    const durationSeconds =
      calculateDurationSeconds(
        session.startedAt,
        endedAt
      );

    /*
     * Generate notes before database
     * finalization. Failure here is safe because
     * generateCallNotes() returns null values.
     */
    const callNotes =
      await generateCallNotes(
        transcript
      );

    const state =
      session.state;

    const customerId =
      session.customerId ??
      state.customerId ??
      null;

    const leadId =
      session.leadId ??
      state.leadId ??
      null;

    const appointmentId =
      state.appointmentId ??
      null;

    const callerPhone =
      state.customerPhone ??
      null;

    /*
     * IMPORTANT:
     *
     * Save the call FIRST.
     *
     * The voice session remains ACTIVE until
     * the call has successfully been persisted.
     *
     * This prevents:
     *
     * COMPLETED session + missing call
     */
    const {
      data: savedCall,
      error: saveError,
    } = await supabase
      .from("calls")
      .insert({
        business_id:
          context.businessId,

        voice_session_id:
          sessionId,

        customer_id:
          customerId,

        caller_phone:
          callerPhone,

        duration_seconds:
          durationSeconds,

        transcript:
          callNotes.shortTranscript,

        summary:
          callNotes.summary,

        outcome:
          appointmentId
            ? "Appointment booked"
            : "Call completed",

        appointment_id:
          appointmentId,

        lead_id:
          leadId,

        started_at:
          session.startedAt,

        ended_at:
          endedAt,
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

    if (
      saveError ||
      !savedCall
    ) {
      /*
       * Another finalize request may have
       * inserted the call concurrently.
       *
       * The unique partial index on
       * voice_session_id makes this safe.
       */
      if (
        saveError?.code ===
        "23505"
      ) {
        const duplicateCall =
          await getExistingCall(
            supabase,
            context.businessId,
            sessionId
          );

        if (duplicateCall) {
          /*
           * Make sure the session is completed
           * after the existing call is confirmed.
           */
          await completeVoiceSession(
            context.businessId,
            sessionId,
            duplicateCall.ended_at ??
              undefined
          );

          return NextResponse.json({
            success: true,
            alreadyFinalized: true,
            call: mapCallResponse(
              duplicateCall
            ),
          });
        }
      }

      /*
       * The call was NOT saved.
       *
       * Therefore we deliberately do NOT
       * mark the voice session COMPLETED.
       */
      throw new Error(
        saveError?.message ??
          "Failed to save completed call."
      );
    }

    /*
     * The call now exists successfully.
     *
     * Only now mark the voice session
     * COMPLETED using the exact same timestamp.
     */
    let completedSession;

    try {
      completedSession =
        await completeVoiceSession(
          context.businessId,
          sessionId,
          endedAt
        );
    } catch (completionError) {
      /*
       * The call is already safely persisted.
       *
       * If session completion fails, do NOT
       * create another call. A future finalize
       * request will detect the existing call
       * and safely repair the session state.
       */
      console.error(
        "Voice session completion failed after call save:",
        completionError
      );

      return NextResponse.json({
        success: true,
        alreadyFinalized: false,
        sessionCompletionPending:
          true,
        call: mapCallResponse(
          savedCall
        ),
      });
    }

    return NextResponse.json({
      success: true,
      alreadyFinalized: false,

      call: mapCallResponse(
        savedCall
      ),

      session:
        completedSession,
    });
  } catch (error) {
    console.error(
      "Voice session finalization failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to finalize voice session.",
      },
      { status: 500 }
    );
  }
}
