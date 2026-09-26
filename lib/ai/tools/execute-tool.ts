import { getBusinessInformation } from "./get-business-information";
import { getServices } from "./get-services";
import { searchKnowledgeBase } from "./search-knowledge-base";
import { findCustomer } from "./find-customer";
import { createCustomer } from "./create-customer";
import { createLead } from "./create-lead";
import { checkAvailability } from "./check-availability";
import { bookAppointment } from "./book-appointment";
import { saveCall } from "./save-call";

import type { ToolContext } from "./get-business-information";

type ToolArguments = Record<string, unknown>;

export async function executeTool(
  context: ToolContext,
  toolName: string,
  args: ToolArguments
) {
  switch (toolName) {
    case "getBusinessInformation":
      return getBusinessInformation(context);

    case "getServices":
      return getServices(context);

    case "searchKnowledgeBase":
      return searchKnowledgeBase(
        context,
        requireString(args.query, "query")
      );

    case "findCustomer":
      return findCustomer(
        context,
        requireString(args.phone, "phone")
      );

    case "createCustomer":
      return createCustomer(context, {
        name: requireString(args.name, "name"),
        phone: requireString(args.phone, "phone"),
        email: optionalString(args.email),
        address: optionalString(args.address),
      });

    case "createLead":
      return createLead(context, {
        customerId: requireString(
          args.customerId,
          "customerId"
        ),
        serviceRequested: requireString(
          args.serviceRequested,
          "serviceRequested"
        ),
        description: optionalString(args.description),
      });

    case "checkAvailability":
      return checkAvailability(context, {
        serviceId: requireString(
          args.serviceId,
          "serviceId"
        ),
        requestedDate: requireString(
          args.requestedDate,
          "requestedDate"
        ),
        requestedTime: requireString(
          args.requestedTime,
          "requestedTime"
        ),
      });

    case "bookAppointment":
      return bookAppointment(context, {
        serviceId: requireString(
          args.serviceId,
          "serviceId"
        ),
        customerId: requireString(
          args.customerId,
          "customerId"
        ),
        startTime: requireString(
          args.startTime,
          "startTime"
        ),
      });

          case "saveCall":
      return saveCall(context, {
        callerPhone: optionalString(args.callerPhone),
        customerId: optionalString(args.customerId),
        transcript: optionalString(args.transcript),
        summary: optionalString(args.summary),
        outcome: optionalString(args.outcome),
        appointmentId: optionalString(
          args.appointmentId
        ),
        leadId: optionalString(args.leadId),
        durationSeconds:
          args.durationSeconds === undefined
            ? undefined
            : Number(args.durationSeconds),
        startedAt: optionalString(args.startedAt),
        endedAt: optionalString(args.endedAt),
      });

    default:
      throw new Error(
        `Unknown AI tool: ${toolName}`
      );
  }
}

function requireString(
  value: unknown,
  fieldName: string
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `Tool argument "${fieldName}" is required.`
    );
  }

  return value.trim();
}

function optionalString(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const valueTrimmed = value.trim();

  return valueTrimmed || undefined;
}