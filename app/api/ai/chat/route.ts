import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { runGeminiAgent } from "@/lib/ai/gemini-agent";

export async function POST(request: Request) {
  try {
    const context = await getAgentContext();

    const body = await request.json();

    const message =
      typeof body.message === "string"
        ? body.message
        : "";

    const result = await runGeminiAgent(
      context.businessId,
      message
    );

    return NextResponse.json({
      success: true,
      result: {
        text: result.text,
      },
    });
  } catch (error) {
    console.error("AI chat failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "AI chat failed.",
      },
      { status: 500 }
    );
  }
}