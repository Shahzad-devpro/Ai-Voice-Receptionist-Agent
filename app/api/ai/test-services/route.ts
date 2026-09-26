import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { getServices } from "@/lib/ai/tools/get-services";

export async function GET() {
  try {
    const context = await getAgentContext();

    const result = await getServices({
      businessId: context.businessId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Services tool failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Services tool failed.",
      },
      { status: 500 }
    );
  }
}