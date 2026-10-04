import {
  GoogleGenAI,
  Modality,
} from "@google/genai";

import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";

type DemoLiveSession = {
  sendRealtimeInput: (input: {
    audio: {
      data: string;
      mimeType: string;
    };
  }) => void;

  close: () => void;
};

type DemoLiveCallbacks = {
  onOpen?: () => void;
  onMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

export async function createDemoLiveSession(
  industry: string,
  callbacks: DemoLiveCallbacks = {}
): Promise<DemoLiveSession> {
  try {
    const response = await fetch(
      `/api/ai/demo/live-token?industry=${encodeURIComponent(
        industry
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      typeof data.token !== "string" ||
      !data.token
    ) {
      throw new Error(
        data.error ??
          "Failed to create demo Gemini Live token."
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

        /*
         * The demo token is created server-side with
         * the demo configuration.
         *
         * We intentionally do not send:
         *
         * - businessId
         * - customerId
         * - sessionId
         * - tool configuration
         */
      },

      callbacks: {
        onopen: () => {
          console.log(
            "Gemini Live public demo connection opened."
          );

          callbacks.onOpen?.();
        },

        onmessage: (message) => {
          callbacks.onMessage?.(message);
        },

        onerror: () => {
          const error = new Error(
            "Gemini Live demo connection error."
          );

          console.error(error);

          callbacks.onError?.(error);
        },

        onclose: () => {
          console.log(
            "Gemini Live public demo connection closed."
          );

          callbacks.onClose?.();
        },
      },
    });

    return session as DemoLiveSession;
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            "Failed to connect to Gemini Live demo."
          );

    console.error(
      "Demo Gemini Live connection failed:",
      normalizedError
    );

    callbacks.onError?.(normalizedError);

    throw normalizedError;
  }
}

