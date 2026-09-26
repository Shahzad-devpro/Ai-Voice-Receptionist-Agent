import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { getBusinessContext } from "@/lib/ai/get-business-context";
import { buildSystemPrompt } from "@/lib/ai/build-system-prompt";

export async function GET() {
  try {
    const context = await getAgentContext();

    const business = await getBusinessContext(
      context.businessId
    );

    const systemInstruction =
      buildSystemPrompt(business);

    return NextResponse.json({
      success: true,
      systemInstruction,
    });
  } catch (error) {
    console.error(
      "Failed to build Live AI config:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to build Live AI configuration.",
      },
      { status: 500 }
    );
  }
}