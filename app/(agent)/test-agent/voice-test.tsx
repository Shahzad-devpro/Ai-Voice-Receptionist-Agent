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

return ( <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8"> <div className="mx-auto max-w-7xl">
{/* Header */} <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div> <div className="mb-2 flex items-center gap-2"> <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-950">
AI </span>


          <span className="text-sm font-medium text-slate-400">
            Voice Receptionist
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Live Voice Agent
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Test your AI receptionist in real time.
        </p>
      </div>

      <div
        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
          isConnected
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : statusIsError
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-slate-700 bg-slate-900 text-slate-400"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? "animate-pulse bg-emerald-400"
              : statusIsError
                ? "bg-red-400"
                : "bg-slate-500"
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
      {/* Main voice panel */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
        <div className="border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Voice workspace
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Receptionist conversation
              </h2>
            </div>

            {isConnected && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>

                Microphone active
              </div>
            )}
          </div>

          {/* Business selector */}
          {isPlatformAdmin && (
            <div className="mt-5">
              <label
                htmlFor="business"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Test business
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                <p className="mt-2 text-xs text-red-400">
                  No businesses are available.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="min-h-[360px] bg-slate-950/50 px-5 py-5 sm:min-h-[460px] sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Live transcript
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Conversation appears here as the call progresses.
              </p>
            </div>

            {transcript.length > 0 && (
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
                {transcript.length}{" "}
                {transcript.length === 1
                  ? "entry"
                  : "entries"}
              </span>
            )}
          </div>

          {transcript.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5 text-slate-500"
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

                <p className="text-sm font-medium text-slate-300">
                  No conversation yet
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
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
                        className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                          isCustomer
                            ? "rounded-br-md bg-white text-slate-900"
                            : "rounded-bl-md bg-slate-800 text-slate-200"
                        }`}
                      >
                        <div
                          className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${
                            isCustomer
                              ? "text-slate-500"
                              : "text-slate-500"
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
        <div className="border-t border-slate-800 bg-slate-900 px-5 py-5 sm:px-6">
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStarting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-950" />
                  Starting agent...
                </>
              ) : (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3 w-3"
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isFinalizing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
                  Saving call...
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  Stop & Save Call
                </>
              )}
            </button>
          </div>

          {/* Status */}
          <div
            className={`mt-4 rounded-xl border px-4 py-3 ${
              statusIsError
                ? "border-red-500/20 bg-red-500/5"
                : statusIsSuccess
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-950/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  statusIsError
                    ? "bg-red-400"
                    : statusIsSuccess
                      ? "bg-emerald-400"
                      : isStarting ||
                          isFinalizing
                        ? "animate-pulse bg-amber-400"
                        : "bg-slate-500"
                }`}
              />

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </p>

                <p
                  className={`mt-1 break-words text-sm ${
                    statusIsError
                      ? "text-red-300"
                      : statusIsSuccess
                        ? "text-emerald-300"
                        : "text-slate-300"
                  }`}
                >
                  {status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Runtime information */}
      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Runtime
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Session details
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Connection
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected
                      ? "bg-emerald-400"
                      : "bg-slate-600"
                  }`}
                />

                <p className="text-sm text-slate-300">
                  {isConnected
                    ? "Gemini Live connected"
                    : "Not connected"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Audio chunks
              </p>

              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {chunkCount.toLocaleString()}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                PCM audio frames sent
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Business
              </p>

              <p className="mt-1 break-words text-sm text-slate-300">
                {selectedBusinessId ||
                  "Not selected"}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Voice session
              </p>

              <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-400">
                {sessionId ??
                  "Not started"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            How it works
          </p>

          <div className="mt-5 space-y-5">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                1
              </span>

              <div>
                <p className="text-sm font-medium text-slate-200">
                  Start the agent
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The app creates a secure voice session and loads the selected business configuration.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                2
              </span>

              <div>
                <p className="text-sm font-medium text-slate-200">
                  Talk naturally
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your microphone audio is streamed to Gemini Live and the receptionist responds in real time.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                3
              </span>

              <div>
                <p className="text-sm font-medium text-slate-200">
                  Stop & save
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The completed voice session is finalized and saved as a call record.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4 text-slate-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86 2.82 17a2 2 0 0 0 1.74 3h14.88a2 2 0 0 0 1.74-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-200">
                Browser microphone required
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
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
