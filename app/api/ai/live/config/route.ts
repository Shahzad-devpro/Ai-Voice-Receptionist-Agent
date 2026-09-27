import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { getBusinessContext } from "@/lib/ai/get-business-context";
import { buildSystemPrompt } from "@/lib/ai/build-system-prompt";

export const runtime = "nodejs";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const requestedBusinessId =
      searchParams.get("businessId");

    const context =
      await getAgentContext(
        requestedBusinessId
      );

    const business =
      await getBusinessContext(
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
            : "Failed to load AI configuration.",
      },
      { status: 500 }
    );
  }
}