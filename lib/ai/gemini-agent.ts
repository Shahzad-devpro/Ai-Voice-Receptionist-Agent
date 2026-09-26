import { gemini } from "@/lib/ai/gemini";
import { AI_MODEL } from "@/lib/ai/config";
import { aiToolDefinitions } from "@/lib/ai/tools/definitions";
import { buildSystemPrompt } from "@/lib/ai/build-system-prompt";
import { getBusinessContext } from "@/lib/ai/get-business-context";
import { executeTool } from "@/lib/ai/tools/execute-tool";
import type { Content } from "@google/genai";

type ConversationMessage = {
  role: "user" | "model";
  text: string;
};

const MAX_TOOL_ROUNDS = 5;

export async function runGeminiAgent(
  businessId: string,
  message: string,
  conversation: ConversationMessage[] = []
) {
  if (!businessId) {
    throw new Error("Business ID is required.");
  }

  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error("Message is required.");
  }

  const business = await getBusinessContext(businessId);

  const contents: Content[] = [
    ...conversation.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    })),
    {
      role: "user" as const,
      parts: [{ text: cleanMessage }],
    },
  ];

  for (
    let round = 0;
    round < MAX_TOOL_ROUNDS;
    round++
  ) {
    const response = await gemini.models.generateContent({
      model: AI_MODEL,

      contents,

      config: {
        systemInstruction:
          buildSystemPrompt(business),

        tools: aiToolDefinitions,
      },
    });

    const functionCalls =
      response.functionCalls ?? [];

    // Gemini has finished reasoning and returned
    // a normal receptionist response.
    if (functionCalls.length === 0) {
      return {
        text: response.text ?? "",
      };
    }

    // Add Gemini's function-call response to the
    // conversation before sending tool results back.
    const modelContent = response.candidates?.[0]?.content;

if (!modelContent) {
  throw new Error(
    "Gemini returned a function call without response content."
  );
}

contents.push(modelContent);

    const toolResponseParts = [];

    for (const functionCall of functionCalls) {
      const toolName = functionCall.name;

      if (!toolName) {
        throw new Error(
          "Gemini returned a function call without a name."
        );
      }

      const args =
        (functionCall.args ?? {}) as Record<
          string,
          unknown
        >;

      try {
        const result = await executeTool(
          { businessId },
          toolName,
          args
        );

        toolResponseParts.push({
          functionResponse: {
            name: toolName,
            response: result,
          },
        });
      } catch (error) {
        toolResponseParts.push({
          functionResponse: {
            name: toolName,
            response: {
              error:
                error instanceof Error
                  ? error.message
                  : "Tool execution failed.",
            },
          },
        });
      }
    }

    contents.push({
      role: "user",
      parts: toolResponseParts,
    });
  }

  throw new Error(
    "AI agent exceeded the maximum number of tool rounds."
  );
}