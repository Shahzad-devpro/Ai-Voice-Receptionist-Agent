"use client";

import { useRef, useState } from "react";

import { createLiveSession } from "@/lib/ai/live-client";
import { startMicrophone } from "@/lib/ai/audio/microphone";
import { startAudioCapture } from "@/lib/ai/audio/capture";
import { createAudioPlayback } from "@/lib/ai/audio/playback";

type LiveSession = {
  sendRealtimeInput: (input: {
    audio: {
      data: string;
      mimeType: string;
    };
  }) => void;

  sendToolResponse: (response: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>;
  }) => void;

  close: () => void;
};

type LiveToolCall = {
  functionCalls?: Array<{
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }>;
};

type LiveMessage = {
  serverContent?: {
    inputTranscription?: {
      text?: string;
    };

    outputTranscription?: {
      text?: string;
    };

    modelTurn?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  };

  toolCall?: LiveToolCall;
};

type TranscriptSpeaker = "Customer" | "AI Receptionist";

type TranscriptEntry = {
  speaker: TranscriptSpeaker;
  text: string;
};

export default function VoiceTest() {
  const microphoneRef = useRef<{
    stop: () => void;
  } | null>(null);

  const captureRef = useRef<{
    stop: () => void;
  } | null>(null);

  const sessionRef =
    useRef<LiveSession | null>(null);

  const playbackRef = useRef<{
    play: (base64Audio: string) => void;
    stop: () => void;
  } | null>(null);

  const sessionIdRef =
    useRef<string | null>(null);

  const chunkCountRef =
    useRef(0);

  /*
   * Store the complete conversation as
   * speaker-separated transcript entries.
   *
   * Consecutive transcription events from
   * the same speaker are merged.
   */
  const transcriptRef =
    useRef<TranscriptEntry[]>([]);

  /*
   * Prevent multiple finalize requests
   * from running at the same time.
   */
  const finalizingRef =
    useRef(false);

  /*
   * Indicates that the user intentionally
   * stopped the voice session.
   */
  const intentionalCloseRef =
    useRef(false);

  /*
   * Prevent multiple disconnect handlers
   * from attempting to fail the same session.
   */
  const disconnectHandledRef =
    useRef(false);

  const [status, setStatus] =
    useState("Idle");

  const [chunkCount, setChunkCount] =
    useState(0);

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  function appendTranscript(
    speaker: TranscriptSpeaker,
    text: string
  ) {
    const cleaned = text.trim();

    if (!cleaned) {
      return;
    }

    const transcript =
      transcriptRef.current;

    const lastEntry =
      transcript[transcript.length - 1];

    /*
     * Gemini may send transcription
     * fragments separately.
     *
     * Merge consecutive fragments from
     * the same speaker instead of creating
     * a new transcript line for every event.
     */
    if (
      lastEntry &&
      lastEntry.speaker === speaker
    ) {
      const existingText =
        lastEntry.text.trim();

      /*
       * Avoid adding the exact same
       * transcription fragment twice.
       */
      if (
        existingText === cleaned ||
        existingText.endsWith(cleaned)
      ) {
        return;
      }

      /*
       * If the new transcription contains
       * the previous text as part of a longer
       * cumulative transcription, replace it
       * rather than duplicating it.
       */
      if (
        cleaned.startsWith(existingText)
      ) {
        lastEntry.text = cleaned;
        return;
      }

      /*
       * Otherwise append the new fragment
       * to the current speaker's turn.
       */
      lastEntry.text =
        `${existingText} ${cleaned}`.trim();

      return;
    }

    transcript.push({
      speaker,
      text: cleaned,
    });
  }

  function buildTranscript(): string {
    return transcriptRef.current
      .map(
        (entry) =>
          `${entry.speaker}: ${entry.text}`
      )
      .join("\n");
  }

  async function markSessionFailed(
    failedSessionId: string
  ) {
    try {
      await fetch(
        "/api/ai/live/session",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "fail",
            sessionId:
              failedSessionId,
          }),
        }
      );
    } catch (error) {
      console.error(
        "Failed to mark voice session as FAILED:",
        error
      );
    }
  }

  async function handleToolCall(
    session: LiveSession,
    toolCall: LiveToolCall
  ) {
    const functionCalls =
      toolCall.functionCalls ?? [];

    if (functionCalls.length === 0) {
      return;
    }

    for (const functionCall of functionCalls) {
      const toolName =
        functionCall.name;

      const toolCallId =
        functionCall.id;

      if (!toolName || !toolCallId) {
        console.error(
          "Invalid Gemini Live tool call:",
          functionCall
        );

        continue;
      }

      try {
        setStatus(
          `Running ${toolName}...`
        );

        const response =
          await fetch(
            "/api/ai/live/tool",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                sessionId:
                  sessionIdRef.current,

                toolCall: {
                  name: toolName,
                  args:
                    functionCall.args ??
                    {},
                },
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ??
              "Tool execution failed."
          );
        }

        if (
          finalizingRef.current
        ) {
          return;
        }

        session.sendToolResponse({
          functionResponses: [
            {
              id: toolCallId,
              name: toolName,
              response: data.result,
            },
          ],
        });

        if (
          sessionRef.current ===
            session &&
          !finalizingRef.current
        ) {
          setStatus(
            "Live microphone connected"
          );
        }
      } catch (error) {
        console.error(
          `Live tool "${toolName}" failed:`,
          error
        );

        if (
          finalizingRef.current
        ) {
          continue;
        }

        try {
          session.sendToolResponse({
            functionResponses: [
              {
                id: toolCallId,
                name: toolName,
                response: {
                  error:
                    error instanceof Error
                      ? error.message
                      : "Tool execution failed.",
                },
              },
            ],
          });
        } catch (sendError) {
          console.error(
            "Failed to send tool error response:",
            sendError
          );
        }

        if (
          !finalizingRef.current
        ) {
          setStatus(
            "Tool execution failed"
          );
        }
      }
    }
  }

  async function start() {
    if (sessionRef.current) {
      setStatus(
        "Voice agent is already running."
      );

      return;
    }

    if (finalizingRef.current) {
      setStatus(
        "Previous voice session is still finalizing."
      );

      return;
    }

    try {
      /*
       * Reset lifecycle state.
       */
      intentionalCloseRef.current =
        false;

      disconnectHandledRef.current =
        false;

      chunkCountRef.current = 0;

      setChunkCount(0);

      transcriptRef.current = [];

      setStatus(
        "Creating voice session..."
      );

      const sessionResponse =
        await fetch(
          "/api/ai/live/session",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "create",
            }),
          }
        );

      const sessionData =
        await sessionResponse.json();

      if (
        !sessionResponse.ok ||
        !sessionData.success ||
        !sessionData.session?.id
      ) {
        throw new Error(
          sessionData.error ??
            "Failed to create voice session."
        );
      }

      const newSessionId =
        sessionData.session.id;

      sessionIdRef.current =
        newSessionId;

      setSessionId(
        newSessionId
      );

      setStatus(
        "Loading business configuration..."
      );

      const configResponse =
        await fetch(
          "/api/ai/live/config"
        );

      const configData =
        await configResponse.json();

      if (
        !configResponse.ok ||
        !configData.success ||
        typeof configData.systemInstruction !==
          "string"
      ) {
        throw new Error(
          configData.error ??
            "Failed to load Live AI configuration."
        );
      }

      playbackRef.current =
        createAudioPlayback();

      setStatus(
        "Connecting to Gemini Live..."
      );

      const session =
        await createLiveSession(
          configData.systemInstruction,

          /*
           * Gemini Live opened.
           */
          () => {
            if (
              !finalizingRef.current
            ) {
              setStatus(
                "Gemini Live connected"
              );
            }
          },

          /*
           * Gemini Live message.
           */
          (message) => {
            console.log(
              "Live message:",
              message
            );

            const liveMessage =
              message as LiveMessage;

            /*
             * Ignore late messages after
             * finalization has started.
             */
            if (
              finalizingRef.current
            ) {
              return;
            }

            /*
             * Capture customer speech.
             */
            const inputText =
              liveMessage
                .serverContent
                ?.inputTranscription
                ?.text;

            if (
              typeof inputText ===
                "string" &&
              inputText.trim()
            ) {
              appendTranscript(
                "Customer",
                inputText
              );
            }

            /*
             * Capture AI speech.
             */
            const outputText =
              liveMessage
                .serverContent
                ?.outputTranscription
                ?.text;

            if (
              typeof outputText ===
                "string" &&
              outputText.trim()
            ) {
              appendTranscript(
                "AI Receptionist",
                outputText
              );
            }

            /*
             * Play Gemini's audio response.
             */
            const parts =
              liveMessage
                .serverContent
                ?.modelTurn
                ?.parts ?? [];

            for (const part of parts) {
              const audioData =
                part.inlineData?.data;

              if (!audioData) {
                continue;
              }

              playbackRef.current?.play(
                audioData
              );
            }

            /*
             * Handle Gemini tool calls.
             */
            if (
              liveMessage.toolCall
            ) {
              const currentSession =
                sessionRef.current;

              if (!currentSession) {
                console.error(
                  "Received a tool call without an active session."
                );

                return;
              }

              void handleToolCall(
                currentSession,
                liveMessage.toolCall
              );
            }
          },

          /*
           * Gemini Live error.
           */
          (error) => {
            console.error(
              "Gemini Live error:",
              error
            );

            if (
              !finalizingRef.current
            ) {
              setStatus(
                error.message
              );
            }
          },

          /*
           * Gemini Live closed.
           */
          () => {
            console.log(
              "Gemini Live connection closed."
            );

            /*
             * Normal Stop or finalization.
             */
            if (
              intentionalCloseRef.current ||
              finalizingRef.current
            ) {
              return;
            }

            /*
             * Prevent duplicate failure handling.
             */
            if (
              disconnectHandledRef.current
            ) {
              return;
            }

            disconnectHandledRef.current =
              true;

            const disconnectedSessionId =
              sessionIdRef.current;

            if (!disconnectedSessionId) {
              setStatus(
                "Gemini Live disconnected"
              );

              return;
            }

            setStatus(
              "Gemini Live disconnected unexpectedly"
            );

            /*
             * Stop local audio resources.
             */
            captureRef.current?.stop();

            microphoneRef.current?.stop();

            playbackRef.current?.stop();

            captureRef.current = null;

            microphoneRef.current = null;

            playbackRef.current = null;

            sessionRef.current = null;

            /*
             * Mark database session as FAILED.
             */
            void markSessionFailed(
              disconnectedSessionId
            );

            sessionIdRef.current =
              null;

            setSessionId(null);

            transcriptRef.current = [];
          }
        );

      sessionRef.current =
        session;

      setStatus(
        "Starting microphone..."
      );

      const microphone =
        await startMicrophone();

      microphoneRef.current =
        microphone;

      const capture =
        await startAudioCapture(
          microphone.stream,
          (base64Audio) => {
            const currentSession =
              sessionRef.current;

            if (
              !currentSession ||
              finalizingRef.current
            ) {
              return;
            }

            currentSession.sendRealtimeInput(
              {
                audio: {
                  data: base64Audio,
                  mimeType:
                    "audio/pcm;rate=16000",
                },
              }
            );

            chunkCountRef.current +=
              1;

            if (
              chunkCountRef.current %
                100 ===
              0
            ) {
              setChunkCount(
                chunkCountRef.current
              );
            }
          }
        );

      captureRef.current =
        capture;

      setStatus(
        "Live microphone connected"
      );
    } catch (error) {
      console.error(
        "Voice agent start failed:",
        error
      );

      /*
       * Stop resources that may
       * already have started.
       */
      captureRef.current?.stop();

      microphoneRef.current?.stop();

      playbackRef.current?.stop();

      sessionRef.current?.close();

      captureRef.current = null;

      microphoneRef.current = null;

      playbackRef.current = null;

      sessionRef.current = null;

      /*
       * Mark database session as FAILED
       * if one was already created.
       */
      const failedSessionId =
        sessionIdRef.current;

      if (failedSessionId) {
        await markSessionFailed(
          failedSessionId
        );
      }

      sessionIdRef.current =
        null;

      setSessionId(null);

      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to start voice agent."
      );
    }
  }

  async function stop() {
    /*
     * Prevent two Stop clicks from
     * starting two finalize requests.
     */
    if (finalizingRef.current) {
      return;
    }

    const currentSessionId =
      sessionIdRef.current;

    if (!currentSessionId) {
      setStatus(
        "No active voice session."
      );

      return;
    }

    finalizingRef.current =
      true;

    /*
     * Tell Gemini's onclose handler
     * this is an intentional close.
     */
    intentionalCloseRef.current =
      true;

    try {
      setStatus(
        "Finalizing voice session..."
      );

      /*
       * Stop browser audio.
       */
      captureRef.current?.stop();

      microphoneRef.current?.stop();

      playbackRef.current?.stop();

      captureRef.current = null;

      microphoneRef.current = null;

      playbackRef.current = null;

      /*
       * Close Gemini Live.
       */
      sessionRef.current?.close();

      sessionRef.current = null;

      /*
       * Build the transcript before
       * clearing the session state.
       */
      const transcript =
        buildTranscript();

      /*
       * Send the completed session
       * to the server.
       */
      const response =
        await fetch(
          "/api/ai/live/session/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sessionId:
                currentSessionId,

              transcript,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Failed to finalize voice session."
        );
      }

      console.log(
        "Voice session finalized:",
        data
      );

      setStatus(
        data.alreadyFinalized
          ? `Call already saved (${data.call.durationSeconds}s)`
          : `Call saved (${data.call.durationSeconds}s)`
      );
    } catch (error) {
      console.error(
        "Voice session finalization failed:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to finalize voice session."
      );
    } finally {
      finalizingRef.current =
        false;

      intentionalCloseRef.current =
        false;

      disconnectHandledRef.current =
        false;

      sessionIdRef.current =
        null;

      setSessionId(null);

      transcriptRef.current = [];
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          Gemini Live Voice Test
        </h1>

        <p className="mt-2 text-slate-600">
          Browser microphone → Gemini Live
        </p>

        <div className="mt-6 rounded-lg bg-slate-100 p-4">
          <p>
            <strong>Status:</strong>{" "}
            {status}
          </p>

          <p className="mt-2">
            <strong>
              Audio chunks:
            </strong>{" "}
            {chunkCount}
          </p>

          <p className="mt-2 break-all text-sm">
            <strong>
              Voice Session:
            </strong>{" "}
            {sessionId ??
              "Not started"}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={start}
            disabled={
              Boolean(
                sessionRef.current
              ) ||
              finalizingRef.current
            }
            className="rounded-lg bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Voice Agent
          </button>

          <button
            type="button"
            onClick={() => {
              void stop();
            }}
            disabled={
              !sessionId ||
              finalizingRef.current
            }
            className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      </div>
    </main>
  );
}
