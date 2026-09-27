import { NextResponse } from "next/server";

import {
  GoogleGenAI,
  Modality,
} from "@google/genai";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";
import { aiToolDefinitions } from "@/lib/ai/tools/definitions";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const body = await request
      .json()
      .catch(() => ({}));

    const requestedBusinessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : null;

    await getAgentContext(
      requestedBusinessId
    );

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "Gemini Live token creation failed: GEMINI_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "AI voice service is not configured.",
        },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({
      apiKey,
    });

    const expireTime = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const token =
      await client.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          liveConnectConstraints: {
            model: GEMINI_LIVE_MODEL,
            config: {
              sessionResumption: {},
              responseModalities: [
                Modality.AUDIO,
              ],
              tools: aiToolDefinitions,
            },
          },
        },
      });

    if (!token.name) {
      console.error(
        "Gemini Live token creation failed: Gemini returned no token name."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to create Live API token.",
        },
        { status: 500 }
      );
    }

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
          "Failed to initialize the AI voice service.",
      },
      { status: 500 }
    );
  }
}