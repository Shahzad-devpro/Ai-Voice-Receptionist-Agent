import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import {
  getVoiceSession,
  updateVoiceSession,
} from "@/lib/ai/voice-session";
import { executeTool } from "@/lib/ai/tools/execute-tool";

type ToolRequest = {
  name?: unknown;
  args?: unknown;
};

function normalizeArgs(
  args: unknown
): Record<string, unknown> {
  if (
    typeof args !== "object" ||
    args === null ||
    Array.isArray(args)
  ) {
    return {};
  }

  return args as Record<string, unknown>;
}

function getRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value.trim() || undefined
    : undefined;
}

function getNestedRecord(
  value: unknown,
  key: string
): Record<string, unknown> | null {
  const record = getRecord(value);

  if (!record) {
    return null;
  }

  return getRecord(record[key]);
}

export async function POST(
  request: Request
) {
  try {
    const context =
      await getAgentContext();

    const body =
      await request
        .json()
        .catch(() => ({}));

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

    const session =
      await getVoiceSession(
        context.businessId,
        sessionId
      );

    if (
      session.sessionStatus !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Voice session is no longer active.",
        },
        { status: 409 }
      );
    }

    const toolCall =
      getRecord(body.toolCall);

    if (!toolCall) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tool call is required.",
        },
        { status: 400 }
      );
    }

    const toolName =
      getString(toolCall.name);

    if (!toolName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tool name is required.",
        },
        { status: 400 }
      );
    }

    /*
     * saveCall is intentionally handled by
     * the finalization endpoint.
     *
     * This prevents the Live model from creating
     * a second call record.
     */
    if (toolName === "saveCall") {
      return NextResponse.json({
        success: true,
        result: {
          handledAutomatically: true,
          message:
            "The call record is saved automatically when the voice session ends. Do not call saveCall again.",
        },
      });
    }

    const args =
      normalizeArgs(toolCall.args);

    /*
     * Execute the requested tool using the
     * authenticated business context.
     */
    const result =
      await executeTool(
        {
          businessId:
            context.businessId,
        },
        toolName,
        args
      );

    const returnedCustomer =
      getNestedRecord(
        result,
        "customer"
      );

    const returnedLead =
      getNestedRecord(
        result,
        "lead"
      );

    const returnedAppointment =
      getNestedRecord(
        result,
        "appointment"
      );

    /*
     * CUSTOMER
     */
    if (
      toolName === "findCustomer" ||
      toolName === "createCustomer"
    ) {
      const customerId =
        getString(
          returnedCustomer?.id
        );

      const customerName =
        getString(
          returnedCustomer?.name
        );

      const customerPhone =
        getString(
          returnedCustomer?.phone
        );

      if (customerId) {
        await updateVoiceSession(
          context.businessId,
          sessionId,
          {
            customerId,

            state: {
              customerId,
              ...(customerName
                ? { customerName }
                : {}),
              ...(customerPhone
                ? { customerPhone }
                : {}),
            },
          }
        );
      }
    }

    /*
     * LEAD
     */
    if (
      toolName === "createLead"
    ) {
      const leadId =
        getString(
          returnedLead?.id
        );

      if (leadId) {
        await updateVoiceSession(
          context.businessId,
          sessionId,
          {
            leadId,

            state: {
              leadId,
            },
          }
        );
      }
    }

    /*
     * APPOINTMENT
     *
     * bookAppointment() returns:
     *
     * {
     *   appointment: {
     *     id,
     *     businessId,
     *     customerId,
     *     serviceId,
     *     startTime,
     *     endTime,
     *     status
     *   }
     * }
     *
     * Therefore we must use camelCase here.
     */
    if (
      toolName === "bookAppointment"
    ) {
      const appointmentId =
        getString(
          returnedAppointment?.id
        );

      const serviceId =
        getString(
          returnedAppointment?.serviceId
        );

      const startTime =
        getString(
          returnedAppointment?.startTime
        );

      if (!appointmentId) {
        throw new Error(
          "Appointment was created but no appointment ID was returned."
        );
      }

      /*
       * Persist the appointment ID into the
       * persistent voice session state.
       *
       * updateVoiceSession() merges this state
       * with all previously stored state, so
       * customerId / leadId are preserved.
       */
      await updateVoiceSession(
        context.businessId,
        sessionId,
        {
          state: {
            appointmentId,

            ...(serviceId
              ? {
                  serviceId,
                }
              : {}),

            ...(startTime
              ? {
                  requestedTime:
                    startTime,
                }
              : {}),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Live AI tool execution failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Tool execution failed.",
      },
      { status: 500 }
    );
  }
}