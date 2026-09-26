import { NextResponse } from "next/server";

import { getAgentContext } from "@/lib/ai/get-agent-context";
import { searchKnowledgeBase } from "@/lib/ai/tools/search-knowledge-base";

export async function GET(request: Request) {
  try {
    const context = await getAgentContext();

    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") ?? "";

    const result = await searchKnowledgeBase(
      {
        businessId: context.businessId,
      },
      query
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Knowledge search failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Knowledge search failed.",
      },
      { status: 500 }
    );
  }
}