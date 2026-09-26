import { NextResponse } from "next/server";

import { gemini } from "@/lib/ai/gemini";
import { AI_MODEL } from "@/lib/ai/config";

export async function GET() {
  try {
    const response = await gemini.models.generateContent({
      model: AI_MODEL,
      contents:
        "Reply with exactly: AI receptionist connection successful.",
    });

    return NextResponse.json({
      success: true,
      model: AI_MODEL,
      response: response.text,
    });
  } catch (error) {
    console.error("Gemini test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gemini API request failed.",
      },
      { status: 500 }
    );
  }
}