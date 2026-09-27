import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import {
  getVoiceSession,
  updateVoiceSession,
} from "@/lib/ai/voice-session";
import { executeTool } from "@/lib/ai/tools/execute-tool";

export const runtime = "nodejs";

type ToolRequest = {
  name?: unknown;
  args?: unknown;
  sessionId?: unknown;
  businessId?: unknown;
  toolCall?: unknown;
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

function isExpectedToolError(
  error: unknown
): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  const expectedMessages = [
    "required",
    "not found",
    "not active",
    "not currently available",
    "not available",
    "outside business hours",
    "closed on",
    "invalid",
    "already exists",
    "already has",
    "no longer available",
    "does not belong",
    "incorrectly configured",
    "cannot be",
  ];

  const message =
    error.message.toLowerCase();

  return expectedMessages.some(
    (keyword) =>
      message.includes(keyword)
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as ToolRequest;

    const businessId =
      getString(body.businessId);

    const context =
      await getAgentContext(
        businessId
      );

    const sessionId =
      getString(body.sessionId);

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

    let result: unknown;

    try {
      result =
        await executeTool(
          {
            businessId:
              context.businessId,
          },
          toolName,
          args
        );
    } catch (error) {
      if (isExpectedToolError(error)) {
        console.warn(
          "Live AI tool validation response:",
          {
            toolName,
            businessId:
              context.businessId,
            sessionId,
            error:
              error.message,
          }
        );

        return NextResponse.json({
          success: true,
          result: {
            success: false,
            error: error.message,
            requiresCustomerAction: true,
          },
        });
      }

      throw error;
    }

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
     * Keep the voice session synchronized
     * whenever a customer is found, created,
     * or updated.
     */
    if (
      toolName === "findCustomer" ||
      toolName === "createCustomer" ||
      toolName === "updateCustomer"
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

      const customerEmail =
        getString(
          returnedCustomer?.email
        );

      const customerAddress =
        getString(
          returnedCustomer?.address
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
                ? {
                    customerName,
                  }
                : {}),

              ...(customerPhone
                ? {
                    customerPhone,
                  }
                : {}),

              ...(customerEmail
                ? {
                    customerEmail,
                  }
                : {}),

              ...(customerAddress
                ? {
                    customerAddress,
                  }
                : {}),
            },
          }
        );
      }
    }

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

    if (
      toolName === "bookAppointment"
    ) {
      const appointmentId =
        getString(
          returnedAppointment
            ?.id
        );

      const serviceId =
        getString(
          returnedAppointment
            ?.serviceId
        );

      const startTime =
        getString(
          returnedAppointment
            ?.startTime
        );

      if (!appointmentId) {
        throw new Error(
          "Appointment was created but no appointment ID was returned."
        );
      }

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
          "The requested operation could not be completed.",
      },
      { status: 500 }
    );
  }
}
