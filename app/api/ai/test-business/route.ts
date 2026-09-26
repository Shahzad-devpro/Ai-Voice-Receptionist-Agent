import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { getBusinessInformation } from "@/lib/ai/tools/get-business-information";

export async function GET() {
  try {
    const context = await getAgentContext();

    const result = await getBusinessInformation({
      businessId: context.businessId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Business information tool failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Business information tool failed.",
      },
      { status: 500 }
    );
  }
}