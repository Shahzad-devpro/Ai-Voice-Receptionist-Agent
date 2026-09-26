import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { createLead } from "@/lib/ai/tools/create-lead";

export async function POST(request: Request) {
  try {
    const context = await getAgentContext();

    const body = await request.json();

    const result = await createLead(
      {
        businessId: context.businessId,
      },
      {
        customerId: body.customerId,
        serviceRequested: body.serviceRequested,
        description: body.description,
      }
    );

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Lead creation failed.",
      },
      { status: 500 }
    );
  }
}