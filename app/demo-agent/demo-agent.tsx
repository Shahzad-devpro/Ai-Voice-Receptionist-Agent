"use client";

import { useRef, useState } from "react";

import { createDemoLiveSession } from "@/lib/ai/demo-live-client";
import { startMicrophone } from "@/lib/ai/audio/microphone";
import { startAudioCapture } from "@/lib/ai/audio/capture";
import { createAudioPlayback } from "@/lib/ai/audio/playback";

type Industry =
  | "HVAC"
  | "CLEANING"
  | "DENTAL";

type IndustryOption = {
  id: Industry;
  name: string;
  description: string;
};

const INDUSTRIES: IndustryOption[] = [
  {
    id: "HVAC",
    name: "HVAC",
    description:
      "Heating, cooling, repair, maintenance and service questions.",
  },
  {
    id: "CLEANING",
    name: "Cleaning Services",
    description:
      "Home, office, deep, move-out and recurring cleaning questions.",
  },
  {
    id: "DENTAL",
    name: "Dental Clinic",
    description:
      "Clinic information, services and general receptionist questions.",
  },
];

type DemoLiveSession = {
  sendRealtimeInput: (input: {
    audio: {
      data: string;
      mimeType: string;
    };
  }) => void;

  close: () => void;
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
};

type TranscriptSpeaker =
  | "Customer"
  | "AI Receptionist";

type TranscriptEntry = {
  speaker: TranscriptSpeaker;
  text: string;
};

export default function DemoAgent() {
  const [industry, setIndustry] =
    useState<Industry>("HVAC");

  const [status, setStatus] =
    useState("Ready");

  const [transcript, setTranscript] =
    useState<TranscriptEntry[]>([]);

  const [isSessionActive, setIsSessionActive] =
    useState(false);

  const [isStarting, setIsStarting] =
    useState(false);

  const [audioFrameCount, setAudioFrameCount] =
    useState(0);

  const sessionRef =
    useRef<DemoLiveSession | null>(null);

  const microphoneRef =
    useRef<{
      stop: () => void;
    } | null>(null);

  const captureRef =
    useRef<{
      stop: () => void;
    } | null>(null);

  const playbackRef =
    useRef<{
      play: (
        base64Audio: string
      ) => void;

      stop: () => void;
    } | null>(null);

  const transcriptRef =
    useRef<TranscriptEntry[]>([]);

  const audioFrameCountRef =
    useRef(0);

  const intentionalCloseRef =
    useRef(false);

  function appendTranscript(
    speaker: TranscriptSpeaker,
    text: string
  ) {
    const cleaned = text.trim();

    if (!cleaned) {
      return;
    }

    const entries =
      transcriptRef.current;

    const lastEntry =
      entries[entries.length - 1];

    if (
      lastEntry &&
      lastEntry.speaker === speaker
    ) {
      const existingText =
        lastEntry.text.trim();

      if (
        existingText === cleaned ||
        existingText.endsWith(cleaned)
      ) {
        return;
      }

      if (
        cleaned.startsWith(
          existingText
        )
      ) {
        lastEntry.text =
          cleaned;
      } else {
        lastEntry.text =
          `${existingText} ${cleaned}`.trim();
      }

      setTranscript([
        ...entries,
      ]);

      return;
    }

    entries.push({
      speaker,
      text: cleaned,
    });

    setTranscript([
      ...entries,
    ]);
  }

  function cleanup() {
    captureRef.current?.stop();
    microphoneRef.current?.stop();
    playbackRef.current?.stop();

    captureRef.current = null;
    microphoneRef.current = null;
    playbackRef.current = null;

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (error) {
        console.error(
          "Failed to close demo session:",
          error
        );
      }
    }

    sessionRef.current = null;

    setIsSessionActive(false);
  }

  async function start() {
    if (
      sessionRef.current ||
      isSessionActive
    ) {
      setStatus(
        "The demo agent is already running."
      );

      return;
    }

    if (isStarting) {
      return;
    }

    setIsStarting(true);

    intentionalCloseRef.current =
      false;

    transcriptRef.current = [];
    setTranscript([]);

    audioFrameCountRef.current = 0;
    setAudioFrameCount(0);

    try {
      setStatus(
        "Loading demo configuration..."
      );

      const configResponse =
        await fetch(
          `/api/ai/demo/config?industry=${encodeURIComponent(
            industry
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
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
            "Failed to load demo configuration."
        );
      }

      setStatus(
        "Preparing secure voice connection..."
      );

      playbackRef.current =
        createAudioPlayback();

      const session =
        await createDemoLiveSession(
          industry,
          {
            onOpen: () => {
              if (
                intentionalCloseRef.current
              ) {
                return;
              }

              setStatus(
                "AI receptionist connected"
              );
            },

            onMessage: (
              message
            ) => {
              if (
                intentionalCloseRef.current
              ) {
                return;
              }

              const liveMessage =
                message as LiveMessage;

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

              for (
                const part of parts
              ) {
                const audioData =
                  part.inlineData?.data;

                if (!audioData) {
                  continue;
                }

                playbackRef.current?.play(
                  audioData
                );
              }
            },

            onError: (
              error
            ) => {
              if (
                intentionalCloseRef.current
              ) {
                return;
              }

              console.error(
                "Public demo AI error:",
                error
              );

              setStatus(
                error.message ||
                  "AI connection error."
              );
            },

            onClose: () => {
              if (
                intentionalCloseRef.current
              ) {
                return;
              }

              captureRef.current?.stop();
              microphoneRef.current?.stop();
              playbackRef.current?.stop();

              captureRef.current = null;
              microphoneRef.current = null;
              playbackRef.current = null;

              sessionRef.current = null;

              setIsSessionActive(
                false
              );

              setStatus(
                "Demo connection closed."
              );
            },
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
          (
            base64Audio
          ) => {
            const currentSession =
              sessionRef.current;

            if (
              !currentSession ||
              intentionalCloseRef.current
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

            audioFrameCountRef.current +=
              1;

            if (
              audioFrameCountRef.current %
                100 ===
              0
            ) {
              setAudioFrameCount(
                audioFrameCountRef.current
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
        "Public demo start failed:",
        error
      );

      cleanup();

      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to start demo."
      );
    } finally {
      setIsStarting(false);
    }
  }

  function stop() {
    intentionalCloseRef.current =
      true;

    cleanup();

    setStatus(
      "Demo stopped. Nothing was saved."
    );
  }

  const selectedIndustry =
    INDUSTRIES.find(
      (item) =>
        item.id === industry
    )!;

  return (
    <main className="min-h-screen bg-[#08090c] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-4 flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black shadow-lg shadow-white/10">
                  AI
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Voice Receptionist
                  </p>

                  <p className="text-xs text-slate-500">
                    Interactive AI demo
                  </p>
                </div>

              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Experience the AI receptionist
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Choose an industry and have a
                real-time conversation with an AI
                receptionist. No account required.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
                isSessionActive
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSessionActive
                    ? "animate-pulse bg-emerald-400"
                    : "bg-slate-500"
                }`}
              />

              {isSessionActive
                ? "Live"
                : "Ready"}
            </div>

          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 backdrop-blur">

            <div className="border-b border-white/10 p-5 sm:p-6">

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Choose an industry
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Which receptionist would you like to test?
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-3">

                {INDUSTRIES.map(
                  (option) => {
                    const selected =
                      option.id ===
                      industry;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={
                          isSessionActive ||
                          isStarting
                        }
                        onClick={() =>
                          setIndustry(
                            option.id
                          )
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-white/30 bg-white text-slate-950 shadow-xl shadow-white/5"
                            : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between">

                          <span
                            className={`text-sm font-semibold ${
                              selected
                                ? "text-slate-950"
                                : "text-white"
                            }`}
                          >
                            {option.name}
                          </span>

                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">
                              ✓
                            </span>
                          )}

                        </div>

                        <p
                          className={`mt-2 text-xs leading-5 ${
                            selected
                              ? "text-slate-600"
                              : "text-slate-500"
                          }`}
                        >
                          {option.description}
                        </p>

                      </button>
                    );
                  }
                )}

              </div>
            </div>

            <div className="min-h-[430px] bg-black/20 p-5 sm:p-6">

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Live conversation
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {selectedIndustry.name} receptionist
                  </h2>
                </div>

                {transcript.length > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400">
                    {transcript.length} entries
                  </span>
                )}

              </div>

              {transcript.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">

                  <div className="max-w-md">

                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-7 w-7 text-slate-500"
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
                      Ready when you are
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Choose an industry, start the
                      receptionist, allow microphone
                      access, and speak naturally.
                    </p>

                  </div>

                </div>
              ) : (
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">

                  {transcript.map(
                    (
                      entry,
                      index
                    ) => {
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
                                ? "rounded-br-md bg-white text-slate-950"
                                : "rounded-bl-md bg-white/[0.07] text-slate-200"
                            }`}
                          >
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {entry.speaker}
                            </p>

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

            <div className="border-t border-white/10 bg-white/[0.02] p-5 sm:p-6">

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() => {
                    void start();
                  }}
                  disabled={
                    isSessionActive ||
                    isStarting
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-950 shadow-xl shadow-white/5 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isStarting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-950" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3 w-3"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>

                      Start AI Receptionist
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={stop}
                  disabled={
                    !isSessionActive
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

                  Stop Demo
                </button>

              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">

                <div className="flex items-start gap-3">

                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      isSessionActive
                        ? "animate-pulse bg-emerald-400"
                        : isStarting
                          ? "animate-pulse bg-amber-400"
                          : "bg-slate-500"
                    }`}
                  />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {status}
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </section>

          <aside className="space-y-5">

            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">

              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Selected demo
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                {selectedIndustry.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedIndustry.description}
              </p>

              <div className="mt-5 border-t border-white/10 pt-5">

                <p className="text-[11px] uppercase tracking-wider text-slate-600">
                  Live audio
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {audioFrameCount.toLocaleString()}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Audio frames streamed
                </p>

              </div>

            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">

              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Try saying
              </p>

              <div className="mt-4 space-y-2">

                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                  &quot;What services do you offer?&quot;
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                  &quot;What are your business hours?&quot;
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                  &quot;Can I book an appointment?&quot;
                </div>

              </div>

            </section>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.015] p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">

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
                    Public demonstration
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This demo uses static business
                    knowledge. Customers, leads,
                    appointments and calls are not
                    created or modified.
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

