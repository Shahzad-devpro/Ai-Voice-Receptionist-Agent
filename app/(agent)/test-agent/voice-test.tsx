"use client";

import { useRef, useState } from "react";

import { createLiveSession } from "@/lib/ai/live-client";
import { startMicrophone } from "@/lib/ai/audio/microphone";
import { startAudioCapture } from "@/lib/ai/audio/capture";
import { createAudioPlayback } from "@/lib/ai/audio/playback";

type TestBusiness = {
  id: string;
  name: string;
  industry: string;
  status: string;
};

type VoiceTestProps = {
  businesses: TestBusiness[];
  initialBusinessId: string;
  isPlatformAdmin: boolean;
};

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

export default function VoiceTest({
  businesses,
  initialBusinessId,
  isPlatformAdmin,
}: VoiceTestProps) {
  const microphoneRef = useRef<{
    stop: () => void;
  } | null>(null);

  const captureRef = useRef<{
    stop: () => void;
  } | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);

  const playbackRef = useRef<{
    play: (base64Audio: string) => void;
    stop: () => void;
  } | null>(null);

  const sessionIdRef = useRef<string | null>(null);

  const chunkCountRef = useRef(0);

  const transcriptRef = useRef<TranscriptEntry[]>([]);

  const finalizingRef = useRef(false);

  const intentionalCloseRef = useRef(false);

  const disconnectHandledRef = useRef(false);

  const [status, setStatus] = useState("Idle");

  const [chunkCount, setChunkCount] = useState(0);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isSessionActive, setIsSessionActive] = useState(false);

  const [isFinalizing, setIsFinalizing] = useState(false);

  const [isStarting, setIsStarting] = useState(false);

  const [selectedBusinessId, setSelectedBusinessId] =
    useState(initialBusinessId);

  function appendTranscript(
    speaker: TranscriptSpeaker,
    text: string
  ) {
    const cleaned = text.trim();

    if (!cleaned) {
      return;
    }

    const transcript = transcriptRef.current;

    const lastEntry = transcript[transcript.length - 1];

    if (lastEntry && lastEntry.speaker === speaker) {
      const existingText = lastEntry.text.trim();

      if (
        existingText === cleaned ||
        existingText.endsWith(cleaned)
      ) {
        return;
      }

      if (cleaned.startsWith(existingText)) {
        lastEntry.text = cleaned;
        return;
      }

      lastEntry.text = `${existingText} ${cleaned}`.trim();

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
      const response = await fetch(
        "/api/ai/live/session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "fail",
            sessionId: failedSessionId,
            businessId: selectedBusinessId,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          "Failed to mark voice session as FAILED:",
          await response.text()
        );
      }
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
      const toolName = functionCall.name;

      const toolCallId = functionCall.id;

      if (!toolName || !toolCallId) {
        console.error(
          "Invalid Gemini Live tool call:",
          functionCall
        );

        continue;
      }

      try {
        setStatus(`Running ${toolName}...`);

        /*
         * Log the exact tool arguments during development.
         *
         * This is especially important for appointment
         * debugging because the server must receive the
         * exact date/time selected by the customer.
         */
        console.log(
          "Gemini Live tool call:",
          {
            toolName,
            args: functionCall.args ?? {},
            businessId: selectedBusinessId,
            sessionId: sessionIdRef.current,
          }
        );

        const response = await fetch(
          "/api/ai/live/tool",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId:
                sessionIdRef.current,

              businessId:
                selectedBusinessId,

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

        console.log(
          "Gemini Live tool result:",
          {
            toolName,
            result: data.result,
          }
        );

        if (finalizingRef.current) {
          return;
        }

        session.sendToolResponse({
          functionResponses: [
            {
              id: toolCallId,
              name: toolName,
              response:
                data.result,
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

        if (finalizingRef.current) {
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
                    error instanceof
                    Error
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

        if (!finalizingRef.current) {
          setStatus(
            "Tool execution failed"
          );
        }
      }
    }
  }

  async function start() {
    if (
      sessionRef.current ||
      isSessionActive
    ) {
      setStatus(
        "Voice agent is already running."
      );

      return;
    }

    if (
      finalizingRef.current ||
      isFinalizing
    ) {
      setStatus(
        "Previous voice session is still finalizing."
      );

      return;
    }

    if (isStarting) {
      return;
    }

    if (!selectedBusinessId) {
      setStatus(
        "Please select a business before starting the voice agent."
      );

      return;
    }

    setIsStarting(true);

    try {
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
              businessId:
                selectedBusinessId,
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
          `/api/ai/live/config?businessId=${encodeURIComponent(
            selectedBusinessId
          )}`
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
          selectedBusinessId,

          () => {
            if (
              !finalizingRef.current
            ) {
              setStatus(
                "Gemini Live connected"
              );
            }
          },

          (message) => {
            console.log(
              "Live message:",
              message
            );

            const liveMessage =
              message as LiveMessage;

            if (
              finalizingRef.current
            ) {
              return;
            }

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

            const parts =
              liveMessage
                .serverContent
                ?.modelTurn
                ?.parts ?? [];

            for (const part of parts) {
              const audioData =
                part.inlineData
                  ?.data;

              if (!audioData) {
                continue;
              }

              playbackRef.current?.play(
                audioData
              );
            }

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

          () => {
            console.log(
              "Gemini Live connection closed."
            );

            if (
              intentionalCloseRef.current ||
              finalizingRef.current
            ) {
              return;
            }

            if (
              disconnectHandledRef.current
            ) {
              return;
            }

            disconnectHandledRef.current =
              true;

            const disconnectedSessionId =
              sessionIdRef.current;

            if (
              !disconnectedSessionId
            ) {
              setStatus(
                "Gemini Live disconnected"
              );

              setIsSessionActive(
                false
              );

              return;
            }

            setStatus(
              "Gemini Live disconnected unexpectedly"
            );

            captureRef.current?.stop();

            microphoneRef.current?.stop();

            playbackRef.current?.stop();

            captureRef.current = null;

            microphoneRef.current =
              null;

            playbackRef.current = null;

            sessionRef.current = null;

            setIsSessionActive(
              false
            );

            void markSessionFailed(
              disconnectedSessionId
            );

            sessionIdRef.current =
              null;

            setSessionId(null);

            transcriptRef.current =
              [];
          }
        );

      sessionRef.current =
        session;

      setIsSessionActive(true);

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

      captureRef.current?.stop();

      microphoneRef.current?.stop();

      playbackRef.current?.stop();

      sessionRef.current?.close();

      captureRef.current = null;

      microphoneRef.current =
        null;

      playbackRef.current = null;

      sessionRef.current = null;

      setIsSessionActive(false);

      const failedSessionId =
        sessionIdRef.current;

      if (failedSessionId) {
        await markSessionFailed(
          failedSessionId
        );
      }

      sessionIdRef.current = null;

      setSessionId(null);

      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to start voice agent."
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function stop() {
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

    finalizingRef.current = true;

    setIsFinalizing(true);

    intentionalCloseRef.current =
      true;

    try {
      setStatus(
        "Finalizing voice session..."
      );

      captureRef.current?.stop();

      microphoneRef.current?.stop();

      playbackRef.current?.stop();

      captureRef.current = null;

      microphoneRef.current =
        null;

      playbackRef.current = null;

      sessionRef.current?.close();

      sessionRef.current = null;

      setIsSessionActive(false);

      const transcript =
        buildTranscript();

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
              businessId:
                selectedBusinessId,
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
      finalizingRef.current = false;

      setIsFinalizing(false);

      intentionalCloseRef.current =
        false;

      disconnectHandledRef.current =
        false;

      sessionIdRef.current = null;

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

        {isPlatformAdmin && (
          <div className="mt-6">
            <label
              htmlFor="business"
              className="block text-sm font-medium text-slate-700"
            >
              Test Business
            </label>

            <select
              id="business"
              value={
                selectedBusinessId
              }
              onChange={(event) =>
                setSelectedBusinessId(
                  event.target.value
                )
              }
              disabled={
                isSessionActive ||
                isFinalizing ||
                isStarting
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                Select a business
              </option>

              {businesses.map(
                (business) => (
                  <option
                    key={business.id}
                    value={
                      business.id
                    }
                  >
                    {business.name} —{" "}
                    {business.industry}
                  </option>
                )
              )}
            </select>

            {businesses.length ===
              0 && (
              <p className="mt-2 text-sm text-red-600">
                No businesses are available.
              </p>
            )}
          </div>
        )}

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

          <p className="mt-2 break-all text-sm">
            <strong>
              Business:
            </strong>{" "}
            {selectedBusinessId ||
              "Not selected"}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              void start();
            }}
            disabled={
              isSessionActive ||
              isFinalizing ||
              isStarting ||
              !selectedBusinessId
            }
            className="rounded-lg bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting
              ? "Starting..."
              : "Start Voice Agent"}
          </button>

          <button
            type="button"
            onClick={() => {
              void stop();
            }}
            disabled={
              !sessionId ||
              isFinalizing
            }
            className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFinalizing
              ? "Stopping..."
              : "Stop"}
          </button>
        </div>
      </div>
    </main>
  );
}