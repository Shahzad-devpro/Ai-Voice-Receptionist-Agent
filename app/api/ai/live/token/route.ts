import { NextResponse } from "next/server";

import { GoogleGenAI, Modality } from "@google/genai";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";

import { aiToolDefinitions } from "@/lib/ai/tools/definitions";

export async function POST() {
  try {
    await getAgentContext();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const client = new GoogleGenAI({
      apiKey,
    });

    const expireTime = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
       liveConnectConstraints: {
  model: GEMINI_LIVE_MODEL,
  config: {
    sessionResumption: {},
    responseModalities: [Modality.AUDIO],
    tools: aiToolDefinitions,
  },
},
      },
    });

    return NextResponse.json({
      success: true,
      token: token.name,
    });
  } catch (error) {
    console.error(
      "Gemini Live token creation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Live API token.",
      },
      { status: 500 }
    );
  }
}