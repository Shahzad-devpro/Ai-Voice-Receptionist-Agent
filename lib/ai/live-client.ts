import {
  GoogleGenAI,
  Modality,
} from "@google/genai";

import { GEMINI_LIVE_MODEL } from "@/lib/ai/config";

export async function createLiveSession(
  systemInstruction: string,
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