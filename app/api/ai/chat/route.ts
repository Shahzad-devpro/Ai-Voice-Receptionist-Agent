import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { runGeminiAgent } from "@/lib/ai/gemini-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await getAgentContext();

    const body = await request.json().catch(() => ({}));

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required.",
        },
        { status: 400 }
      );
    }

    if (message.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is too long.",
        },
        { status: 400 }
      );
    }

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
        error: "AI chat failed. Please try again.",
      },
      { status: 500 }
    );
  }
}