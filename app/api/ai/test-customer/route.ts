import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { findCustomer } from "@/lib/ai/tools/find-customer";

export async function GET(request: Request) {
  try {
    const context = await getAgentContext();

    const { searchParams } = new URL(request.url);

    const phone = searchParams.get("phone") ?? "";

    const result = await findCustomer(
      {
        businessId: context.businessId,
      },
      phone
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Customer lookup failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Customer lookup failed.",
      },
      { status: 500 }
    );
  }
}