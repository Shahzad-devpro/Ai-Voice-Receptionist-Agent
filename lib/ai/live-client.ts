import {
  GoogleGenAI,
  Modality,
} from "@google/genai";

import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";

type LiveCallbacks = {
  onOpen?: () => void;
  onMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

/**
 * ============================================================
 * PRODUCTION LIVE SESSION
 * ============================================================
 *
 * Used by the authenticated /test-agent.
 *
 * IMPORTANT:
 * Do not change this flow.
 *
 * It requires a businessId because production AI sessions
 * are tenant/business specific.
 */
export async function createLiveSession(
  systemInstruction: string,
  businessId: string,
  onOpen?: () => void,
  onMessage?: (message: unknown) => void,
  onError?: (error: Error) => void,
  onClose?: () => void
) {
  try {
    const response = await fetch(
      "/api/ai/live/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
        }),
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.token
    ) {
      throw new Error(
        data.error ??
          "Failed to create Gemini Live token."
      );
    }

    const ai = new GoogleGenAI({
      apiKey: data.token,
      httpOptions: {
        apiVersion: "v1alpha",
      },
    });

    const session = await ai.live.connect({
      model: GEMINI_LIVE_MODEL,

      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction,
      },

      callbacks: {
        onopen: () => {
          console.log(
            "Gemini Live connection opened."
          );

          onOpen?.();
        },

        onmessage: (message) => {
          console.log(
            "Gemini Live message:",
            message
          );

          onMessage?.(message);
        },

        onerror: () => {
          const error = new Error(
            "Gemini Live connection error."
          );

          console.error(error);

          onError?.(error);
        },

        onclose: () => {
          console.log(
            "Gemini Live connection closed."
          );

          onClose?.();
        },
      },
    });

    return session;
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            "Failed to connect to Gemini Live."
          );

    console.error(normalizedError);

    onError?.(normalizedError);

    throw normalizedError;
  }
}

/**
 * ============================================================
 * PUBLIC DEMO LIVE SESSION
 * ============================================================
 *
 * Used ONLY by /demo-agent.
 *
 * IMPORTANT:
 *
 * - No businessId.
 * - No authenticated tenant.
 * - No customer lookup.
 * - No lead lookup.
 * - No appointment tools.
 * - No database tools.
 *
 * The demo API route issues a short-lived Gemini token.
 */
export async function createDemoLiveSession(
  systemInstruction: string,
  callbacks: LiveCallbacks = {}
) {
  try {
    const response = await fetch(
      "/api/ai/demo/live-token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          purpose: "public-demo",
        }),
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.token
    ) {
      throw new Error(
        data.error ??
          "Failed to create demo Gemini Live token."
      );
    }

    /*
     * Gemini ephemeral tokens are intended for
     * direct browser-to-Live-API connections.
     */
    const ai = new GoogleGenAI({
      apiKey: data.token,
      httpOptions: {
        apiVersion: "v1beta",
      },
    });

    const session = await ai.live.connect({
      model: GEMINI_LIVE_MODEL,

      config: {
        responseModalities: [
          Modality.AUDIO,
        ],

        inputAudioTranscription: {},

        outputAudioTranscription: {},

        systemInstruction,
      },

      callbacks: {
        onopen: () => {
          console.log(
            "Gemini Live demo connection opened."
          );

          callbacks.onOpen?.();
        },

        onmessage: (message) => {
          console.log(
            "Gemini Live demo message:",
            message
          );

          callbacks.onMessage?.(
            message
          );
        },

        onerror: () => {
          const error = new Error(
            "Gemini Live demo connection error."
          );

          console.error(error);

          callbacks.onError?.(
            error
          );
        },

        onclose: () => {
          console.log(
            "Gemini Live demo connection closed."
          );

          callbacks.onClose?.();
        },
      },
    });

    return session;
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            "Failed to connect to Gemini Live demo."
          );

    console.error(
      normalizedError
    );

    callbacks.onError?.(
      normalizedError
    );

    throw normalizedError;
  }
}

