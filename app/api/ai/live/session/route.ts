import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";

import {
  createVoiceSession,
  failVoiceSession,
  getVoiceSession,
  updateVoiceSession,
} from "@/lib/ai/voice-session";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const body = await request
      .json()
      .catch(() => ({}));

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "create";

    /*
     * Business context is required for
     * platform-admin testing.
     *
     * CLIENT_USER requests are still restricted
     * to their assigned business by getAgentContext().
     */
    const requestedBusinessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : null;

    const context =
      await getAgentContext(
        requestedBusinessId
      );

    /*
     * CREATE
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

    /*
     * All actions below require a session ID.
     */
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
              typeof body.leadId ===
              "string"
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
     * Successful completion must go through
     * the finalize endpoint.
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

    const message =
      error instanceof Error
        ? error.message
        : "Voice session operation failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}