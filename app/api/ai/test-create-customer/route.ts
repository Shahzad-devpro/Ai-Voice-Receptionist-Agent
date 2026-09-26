import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { createCustomer } from "@/lib/ai/tools/create-customer";

export async function POST(request: Request) {
  try {
    const context = await getAgentContext();

    const body = await request.json();

    const result = await createCustomer(
      {
        businessId: context.businessId,
      },
      {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
      }
    );

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Customer creation failed.",
      },
      { status: 500 }
    );
  }
}