"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createDemoLiveSession } from "@/lib/ai/demo-live-client";
import { startMicrophone } from "@/lib/ai/audio/microphone";
import { startAudioCapture } from "@/lib/ai/audio/capture";
import { createAudioPlayback } from "@/lib/ai/audio/playback";
import Link from "next/link";

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

  const transcriptContainerRef =
    useRef<HTMLDivElement | null>(null);

  const audioFrameCountRef =
    useRef(0);

  const intentionalCloseRef =
    useRef(false);

  /*
   * Auto-scroll transcript to the
   * newest conversation entry.
   */
  useEffect(() => {
    const container =
      transcriptContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript]);

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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      {/* Premium background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="absolute right-[-180px] top-[20%] h-[500px] w-[500px] rounded-full bg-indigo-200/25 blur-3xl" />

        <div className="absolute bottom-[-250px] left-[30%] h-[500px] w-[500px] rounded-full bg-cyan-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-900/10">
                  AI
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-950">
                    Voice Receptionist
                  </p>

                  <p className="text-xs text-slate-500">
                    Interactive AI demo
                  </p>
                </div>

              </div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                LIVE AI DEMONSTRATION
              </div>

              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Experience your AI receptionist in action.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Choose an industry and have a real-time
                voice conversation with an AI receptionist.
                No account required.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">

              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Contact Us

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M4 10h11M11 5l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm ${
                  isSessionActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSessionActive
                      ? "animate-pulse bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />

                {isSessionActive
                  ? "Live"
                  : "Ready"}
              </div>

            </div>

          </div>
        </header>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">

          {/* Main card */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.06]">

            {/* Industry selector */}
            <div className="border-b border-slate-100 p-5 sm:p-7">

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Choose an industry
                </p>

                <h2 className="text-lg font-bold text-slate-950">
                  Select your receptionist
                </h2>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">

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
                        className={`group rounded-2xl border p-4 text-left transition-all duration-200 ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between">

                          <span
                            className={`text-sm font-bold ${
                              selected
                                ? "text-white"
                                : "text-slate-950"
                            }`}
                          >
                            {option.name}
                          </span>

                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-950">
                              ✓
                            </span>
                          )}

                        </div>

                        <p
                          className={`mt-2 text-xs leading-5 ${
                            selected
                              ? "text-slate-300"
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

            {/* Conversation */}
            <div className="bg-slate-50/70 p-5 sm:p-7">

              <div className="mb-5 flex items-center justify-between gap-4">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Live conversation
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    {selectedIndustry.name} receptionist
                  </h2>
                </div>

                {transcript.length > 0 && (
                  <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">
                    {transcript.length} entries
                  </span>
                )}

              </div>

              {transcript.length === 0 ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center shadow-sm">

                  <div className="max-w-md">

                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-7 w-7 text-slate-400"
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

                    <p className="text-sm font-bold text-slate-800">
                      Ready when you are
                    </p>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Choose an industry, start the
                      receptionist, allow microphone
                      access, and speak naturally.
                    </p>

                  </div>

                </div>
              ) : (
                <div
                  ref={
                    transcriptContainerRef
                  }
                  className="max-h-[460px] min-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm scroll-smooth sm:p-5"
                >

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
                            className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                              isCustomer
                                ? "rounded-br-md bg-slate-950 text-white"
                                : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800"
                            }`}
                          >
                            <p
                              className={`mb-1 text-[9px] font-bold uppercase tracking-wider ${
                                isCustomer
                                  ? "text-slate-400"
                                  : "text-slate-400"
                              }`}
                            >
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

            {/* Controls */}
            <div className="border-t border-slate-100 bg-white p-5 sm:p-7">

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
                  className="group flex flex-1 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isStarting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />

                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                  Stop Demo
                </button>

              </div>

              {/* Status */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">

                <div className="flex items-start gap-3">

                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      isSessionActive
                        ? "animate-pulse bg-emerald-500"
                        : isStarting
                          ? "animate-pulse bg-amber-500"
                          : "bg-slate-400"
                    }`}
                  />

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {status}
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* Sidebar */}
          <aside className="space-y-5">

            {/* Selected demo */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/[0.04] sm:p-6">

              <div className="flex items-center justify-between">

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Selected demo
                </p>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                  {industry}
                </span>

              </div>

              <h2 className="mt-3 text-xl font-bold text-slate-950">
                {selectedIndustry.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedIndustry.description}
              </p>

              <div className="mt-6 border-t border-slate-100 pt-5">

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Live audio
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {audioFrameCount.toLocaleString()}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Audio frames streamed
                </p>

              </div>

            </section>

            {/* Try saying */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/[0.04] sm:p-6">

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Try saying
              </p>

              <div className="mt-4 space-y-2">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-white">
                  &quot;What services do you offer?&quot;
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-white">
                  &quot;What are your business hours?&quot;
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-white">
                  &quot;Can I book an appointment?&quot;
                </div>

              </div>

            </section>

            {/* Contact CTA */}
            <section className="overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10">

              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.38 8.38 0 0 1-4.5-1.3L3 20l1.3-4.5A8.38 8.38 0 0 1 3 11a8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5Z"
                  />
                </svg>

              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Want this for your business?
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Let&apos;s build your AI receptionist.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Talk to us about deploying a custom
                AI receptionist for your business.
              </p>

              <Link
                href="/contact"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Contact Us

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M4 10h11M11 5l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

            </section>

            {/* Demo notice */}
            <section className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01M10.29 3.86 2.82 17a2 2 0 0 0 1.74 3h14.88a2 2 0 0 0 1.74-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    />
                  </svg>

                </div>

                <div>

                  <p className="text-sm font-bold text-slate-800">
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

        {/* Bottom contact strip */}
        <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-6">

          <div>
            <p className="text-sm font-bold text-slate-950">
              Like what you experienced?
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Let&apos;s discuss how an AI receptionist
              can work for your business.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            Talk to us

            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M4 10h11M11 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

        </div>

        <footer className="py-6 text-center text-[11px] text-slate-400">
          AI Voice Receptionist • Interactive demonstration
        </footer>

      </div>
    </main>
  );
}