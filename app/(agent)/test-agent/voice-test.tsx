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

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  function appendTranscript(
    speaker: TranscriptSpeaker,
    text: string
  ) {
    const cleaned = text.trim();

    if (!cleaned) {
      return;
    }

    const transcriptEntries = transcriptRef.current;

    const lastEntry =
      transcriptEntries[transcriptEntries.length - 1];

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
        setTranscript([...transcriptEntries]);
        return;
      }

      lastEntry.text = `${existingText} ${cleaned}`.trim();

      setTranscript([...transcriptEntries]);

      return;
    }

    transcriptEntries.push({
      speaker,
      text: cleaned,
    });

    setTranscript([...transcriptEntries]);
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

      setTranscript([]);

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

            setTranscript([]);
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

      setTranscript([]);
    }
  }

  const isConnected =
    isSessionActive &&
    !isFinalizing;

  const statusIsError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("error") ||
    status.toLowerCase().includes("disconnected");

  const statusIsSuccess =
    status.toLowerCase().includes("connected") ||
    status.toLowerCase().includes("saved");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                AI
              </span>

              <span className="text-sm font-semibold text-slate-500">
                AI Voice Receptionist
              </span>

              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
                Live Demo
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Live Voice Agent
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Experience your AI receptionist in a real conversation.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm ${
              isConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : statusIsError
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? "animate-pulse bg-emerald-500"
                  : statusIsError
                    ? "bg-red-500"
                    : "bg-slate-400"
              }`}
            />

            {isConnected
              ? "Live"
              : statusIsError
                ? "Attention required"
                : "Ready"}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">

          {/* Main Voice Panel */}
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">

            {/* Panel Header */}
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-5 py-6 text-white sm:px-7">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    Voice workspace
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Receptionist conversation
                  </h2>

                  <p className="mt-1 text-sm text-slate-300">
                    Speak naturally and let your AI handle the rest.
                  </p>
                </div>

                {isConnected && (
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-300">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>

                    Microphone active
                  </div>
                )}
              </div>
            </div>

            {/* Business Selector */}
            {isPlatformAdmin && (
              <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
                <label
                  htmlFor="business"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Test business
                </label>

                <select
                  id="business"
                  value={selectedBusinessId}
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    Select a business
                  </option>

                  {businesses.map(
                    (business) => (
                      <option
                        key={business.id}
                        value={business.id}
                      >
                        {business.name} —{" "}
                        {business.industry}
                      </option>
                    )
                  )}
                </select>

                {businesses.length ===
                  0 && (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    No businesses are available.
                  </p>
                )}
              </div>
            )}

            {/* Transcript */}
            <div className="bg-gradient-to-b from-slate-50/80 to-white px-5 py-6 sm:px-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Live transcript
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Conversation appears here as the call progresses.
                  </p>
                </div>

                {transcript.length > 0 && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                    {transcript.length}{" "}
                    {transcript.length === 1
                      ? "entry"
                      : "entries"}
                  </span>
                )}
              </div>

              {transcript.length === 0 ? (
                <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm sm:min-h-[420px]">
                  <div className="absolute -bottom-24 left-1/4 h-48 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
                  <div className="absolute -bottom-28 right-0 h-52 w-80 rounded-full bg-blue-100/50 blur-3xl" />

                  <div className="relative max-w-sm">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-7 w-7 text-indigo-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 0 0 6-6V6a6 6 0 0 0-12 0v6a6 6 0 0 0 6 6Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 12.75a7.5 7.5 0 0 1-15 0M12 22.5v-3.75"
                        />
                      </svg>
                    </div>

                    <p className="text-base font-semibold text-slate-800">
                      No conversation yet
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Start the voice agent and speak naturally to begin the test call.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                  {transcript.map(
                    (entry, index) => {
                      const isCustomer =
                        entry.speaker ===
                        "Customer";

                      return (
                        <div
                          key={`${entry.speaker}-${index}`}
                          className={`flex ${
                            isCustomer
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                              isCustomer
                                ? "rounded-br-md bg-gradient-to-br from-indigo-600 to-blue-600 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <div
                              className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${
                                isCustomer
                                  ? "text-indigo-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {entry.speaker}
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {entry.text}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="border-t border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row">
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
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isStarting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Starting agent...
                    </>
                  ) : (
                    <>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>

                      Start Voice Agent
                    </>
                  )}
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
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isFinalizing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                      Saving call...
                    </>
                  ) : (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      Stop & Save Call
                    </>
                  )}
                </button>
              </div>

              {/* Status */}
              <div
                className={`mt-4 rounded-2xl border px-4 py-3.5 ${
                  statusIsError
                    ? "border-red-100 bg-red-50/70"
                    : statusIsSuccess
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      statusIsError
                        ? "bg-red-500"
                        : statusIsSuccess
                          ? "bg-emerald-500"
                          : isStarting ||
                              isFinalizing
                            ? "animate-pulse bg-amber-500"
                            : "bg-slate-400"
                    }`}
                  />

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p
                      className={`mt-1 break-words text-sm font-medium ${
                        statusIsError
                          ? "text-red-600"
                          : statusIsSuccess
                            ? "text-emerald-600"
                            : "text-slate-600"
                      }`}
                    >
                      {status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* Runtime */}
            <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-xl shadow-slate-200/50">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                  >
                    <rect
                      width="18"
                      height="18"
                      x="3"
                      y="3"
                      rx="3"
                    />
                    <path
                      strokeLinecap="round"
                      d="M8 8h8M8 12h8M8 16h5"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Runtime
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-800">
                    Session details
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Connection
                  </p>

                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />

                    <p className="text-sm font-medium text-slate-600">
                      {isConnected
                        ? "Gemini Live connected"
                        : "Not connected"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Audio chunks
                  </p>

                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">
                    {chunkCount.toLocaleString()}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    PCM audio frames sent
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Business
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-600">
                    {selectedBusinessId ||
                      "Not selected"}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Voice session
                  </p>

                  <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-400">
                    {sessionId ??
                      "Not started"}
                  </p>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-xl shadow-slate-200/50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Experience
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-800">
                    How it works
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    1
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Start the agent
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      The app creates a secure voice session and loads the selected business configuration.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                    2
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Talk naturally
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Your microphone audio is streamed to Gemini Live and the receptionist responds in real time.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-600">
                    3
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Stop & save
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      The completed voice session is finalized and saved as a call record.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Privacy */}
            <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 12 1.7 1.7 3.5-3.5"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Your privacy matters
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Voice conversations are handled securely for testing and improvement purposes.
                  </p>
                </div>
              </div>
            </section>

            {/* Microphone */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 p-5 text-white shadow-xl shadow-indigo-900/10">
              <div className="absolute -bottom-16 -right-12 h-36 w-64 rounded-full border border-indigo-400/20" />
              <div className="absolute -bottom-24 right-0 h-40 w-72 rounded-full border border-blue-400/20" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5 text-white"
                  >
                    <rect
                      width="8"
                      height="13"
                      x="8"
                      y="2"
                      rx="4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Browser microphone required
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Allow microphone access when prompted. Use headphones when possible to reduce audio feedback.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}