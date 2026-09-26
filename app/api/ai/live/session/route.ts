import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";

import {
  createVoiceSession,
  failVoiceSession,
  getVoiceSession,
  updateVoiceSession,
} from "@/lib/ai/voice-session";

export async function POST(
  request: Request
) {
  try {
    const context =
      await getAgentContext();

    const body = await request
      .json()
      .catch(() => ({}));

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "create";

    /*
     * CREATE
     *
     * Creates the authoritative database
     * voice session.
     */
    if (action === "create") {
      const session =
        await createVoiceSession(
          context.businessId
        );

      return NextResponse.json({
        success: true,
        session,
      });
    }

    const sessionId =
      typeof body.sessionId === "string"
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
     * GET
     *
     * Retrieves a session only if it belongs
     * to the authenticated user's business.
     */
    if (action === "get") {
      const session =
        await getVoiceSession(
          context.businessId,
          sessionId
        );

      return NextResponse.json({
        success: true,
        session,
      });
    }

    /*
     * UPDATE
     *
     * Stores the current conversation state.
     */
    if (action === "update") {
      const state =
        typeof body.state === "object" &&
        body.state !== null &&
        !Array.isArray(body.state)
          ? body.state
          : undefined;

      const session =
        await updateVoiceSession(
          context.businessId,
          sessionId,
          {
            customerId:
              typeof body.customerId ===
              "string"
                ? body.customerId.trim()
                : undefined,

            leadId:
              typeof body.leadId === "string"
                ? body.leadId.trim()
                : undefined,

            state,
          }
        );

      return NextResponse.json({
        success: true,
        session,
      });
    }

    /*
     * FAIL
     *
     * Used when the voice session fails
     * unexpectedly.
     *
     * Normal successful calls should NOT use
     * this action.
     */
    if (action === "fail") {
      const session =
        await failVoiceSession(
          context.businessId,
          sessionId
        );

      return NextResponse.json({
        success: true,
        session,
      });
    }

    /*
     * COMPLETE is intentionally NOT handled here.
     *
     * Successful completion must go through:
     *
     * /api/ai/live/session/finalize
     *
     * because finalization also:
     * - calculates duration
     * - records started_at
     * - records ended_at
     * - creates the calls record
     */
    if (action === "complete") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Use the voice session finalize endpoint to complete a successful call.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid session action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Voice session API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Voice session operation failed.",
      },
      { status: 500 }
    );
  }
}