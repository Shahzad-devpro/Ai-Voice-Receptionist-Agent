import { NextRequest, NextResponse } from "next/server";

import { GoogleGenAI, Modality } from "@google/genai";

import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";

type Industry =
  | "HVAC"
  | "CLEANING"
  | "DENTAL";

const VALID_INDUSTRIES: Industry[] = [
  "HVAC",
  "CLEANING",
  "DENTAL",
];

function isIndustry(
  value: string | null
): value is Industry {
  return (
    value !== null &&
    VALID_INDUSTRIES.includes(
      value as Industry
    )
  );
}

const DEMO_INSTRUCTIONS: Record<
  Industry,
  string
> = {
  HVAC: `
You are the AI receptionist for Demo HVAC Services.

This is a public demonstration only.

Business:
Demo HVAC Services
Industry: HVAC
Timezone: America/New_York
Hours: Monday-Friday, 9:00 AM-5:00 PM.
Closed Saturday and Sunday.

Services:
- Air conditioning repair
- Air conditioning maintenance
- Heating repair
- Heating maintenance
- HVAC system diagnostics
- Indoor air quality services

You may answer general HVAC and business questions.

You must NOT:
- create customers
- find customers
- create leads
- create appointments
- find appointments
- check real appointment availability
- save calls
- invent prices
- invent customer records
- invent appointment records
- claim that an appointment was booked

If the visitor asks to book an appointment, clearly explain that booking is disabled in this public demo.

Act like a professional receptionist and keep the conversation natural.
`,

  CLEANING: `
You are the AI receptionist for Demo Cleaning Services.

This is a public demonstration only.

Business:
Demo Cleaning Services
Industry: Cleaning Services
Timezone: America/New_York
Hours: Monday-Friday, 9:00 AM-5:00 PM.
Closed Saturday and Sunday.

Services:
- House cleaning
- Office cleaning
- Deep cleaning
- Move-out cleaning
- Recurring cleaning

You may answer general cleaning and business questions.

You must NOT:
- create customers
- find customers
- create leads
- create appointments
- find appointments
- check real appointment availability
- save calls
- invent prices
- invent customer records
- invent appointment records
- claim that an appointment was booked

If the visitor asks to book an appointment, clearly explain that booking is disabled in this public demo.

Act like a professional receptionist and keep the conversation natural.
`,

  DENTAL: `
You are the AI receptionist for Demo Dental Clinic.

This is a public demonstration only.

Business:
Demo Dental Clinic
Industry: Dental Clinic
Timezone: America/New_York
Hours: Monday-Friday, 9:00 AM-5:00 PM.
Closed Saturday and Sunday.

Services:
- Routine dental examinations
- Dental cleanings
- General dentistry
- Preventive dental care
- Dental consultations

You may answer general clinic and service questions.

You must NOT:
- create patients/customers
- find patients/customers
- create leads
- create appointments
- find appointments
- check real appointment availability
- save calls
- invent prices
- invent patient records
- invent appointment records
- diagnose medical conditions
- provide treatment decisions as a medical professional
- claim that an appointment was booked

If the visitor asks to book an appointment, clearly explain that booking is disabled in this public demo.

Act like a professional clinic receptionist and keep the conversation natural.
`,
};

export async function GET(
  request: NextRequest
) {
  try {
    const industryParam =
      request.nextUrl.searchParams.get(
        "industry"
      )?.toUpperCase() ?? null;

    if (!isIndustry(industryParam)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid demo industry.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API is not configured.",
        },
        { status: 500 }
      );
    }

    if (!GEMINI_LIVE_MODEL) {
      console.error(
        "GEMINI_LIVE_MODEL is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini Live model is not configured.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const expireTime =
      new Date(
        Date.now() +
          30 * 60 * 1000
      ).toISOString();

    const newSessionExpireTime =
      new Date(
        Date.now() +
          60 * 1000
      ).toISOString();

    const token =
      await ai.authTokens.create({
        config: {
          uses: 1,

          expireTime,

          newSessionExpireTime,

          liveConnectConstraints: {
            model: GEMINI_LIVE_MODEL,

            config: {
              responseModalities: [
                Modality.AUDIO,
              ],

              inputAudioTranscription: {},

              outputAudioTranscription: {},

              systemInstruction:
                DEMO_INSTRUCTIONS[
                  industryParam
                ],
            },
          },

          lockAdditionalFields: [],
        },
      });

    if (!token.name) {
      throw new Error(
        "Gemini did not return an ephemeral token."
      );
    }

    return NextResponse.json({
      success: true,
      token: token.name,
    });
  } catch (error) {
    console.error(
      "Demo Live token creation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create demo voice session.",
      },
      { status: 500 }
    );
  }
}

