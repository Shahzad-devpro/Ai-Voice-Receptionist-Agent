import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { checkAvailability } from "@/lib/ai/tools/check-availability";

export async function GET(request: Request) {
  try {
    const context = await getAgentContext();

    const { searchParams } = new URL(request.url);

    const serviceId = searchParams.get("serviceId") ?? "";
    const requestedDate =
      searchParams.get("date") ?? "";
    const requestedTime =
      searchParams.get("time") ?? "";

    const result = await checkAvailability(
      {
        businessId: context.businessId,
      },
      {
        serviceId,
        requestedDate,
        requestedTime,
      }
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Availability check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Availability check failed.",
      },
      { status: 500 }
    );
  }
}