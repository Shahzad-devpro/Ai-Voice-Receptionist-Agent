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
   * UX ONLY:
   * Keep the latest transcript message visible.
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
      {/* Premium ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        {/* Header */}
        <header className="mb-8 lg:mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-5 flex items-center gap-3">

                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-500/20">
                  AI
                </div>

                <div>
                  <p className="text-sm font-bold tracking-tight text-slate-900">
                    Voice Receptionist
                  </p>

                  <p className="text-xs text-slate-500">
                    Interactive AI demonstration
                  </p>
                </div>

              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                LIVE AI EXPERIENCE
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Experience your next AI receptionist.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Choose an industry and have a real-time
                conversation with an AI receptionist.
                No account required.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-sm ${
                isSessionActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isStarting
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSessionActive
                    ? "animate-pulse bg-emerald-500"
                    : isStarting
                      ? "animate-pulse bg-amber-500"
                      : "bg-slate-400"
                }`}
              />

              {isSessionActive
                ? "Live"
                : isStarting
                  ? "Connecting"
                  : "Ready"}
            </div>

          </div>
        </header>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">

          {/* Main card */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.25)]">

            {/* Industry selector */}
            <div className="border-b border-slate-100 p-5 sm:p-7">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">
                    Choose an industry
                  </p>

                  <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                    Which receptionist would you like to test?
                  </h2>
                </div>

                <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400 sm:block">
                  3 DEMOS
                </div>

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
                            ? "border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-md shadow-violet-500/10"
                            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:bg-slate-50 hover:shadow-md"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between">

                          <span
                            className={`text-sm font-bold ${
                              selected
                                ? "text-violet-700"
                                : "text-slate-800"
                            }`}
                          >
                            {option.name}
                          </span>

                          {selected && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[10px] font-bold text-white shadow-sm">
                              ✓
                            </span>
                          )}

                        </div>

                        <p
                          className={`mt-2 text-xs leading-5 ${
                            selected
                              ? "text-violet-700/70"
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

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                      Live conversation
                    </p>

                    {isSessionActive && (
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Listening
                      </span>
                    )}
                  </div>

                  <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                    {selectedIndustry.name} receptionist
                  </h2>
                </div>

                {transcript.length > 0 && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">
                    {transcript.length} entries
                  </span>
                )}

              </div>

              {transcript.length === 0 ? (
                <div className="flex min-h-[330px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center shadow-sm">

                  <div className="max-w-md">

                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-7 w-7 text-violet-500"
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

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Choose an industry, start the
                      receptionist, allow microphone
                      access, and speak naturally.
                    </p>

                  </div>

                </div>
              ) : (
                <div
                  ref={transcriptContainerRef}
                  className="max-h-[460px] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-inner shadow-slate-100 sm:p-5"
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
                            className={`max-w-[92%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${
                              isCustomer
                                ? "rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/10"
                                : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="mb-1.5 flex items-center gap-2">

                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isCustomer
                                    ? "text-violet-100"
                                    : "text-violet-500"
                                }`}
                              >
                                {entry.speaker}
                              </span>

                              {!isCustomer && (
                                <span className="h-1 w-1 rounded-full bg-violet-300" />
                              )}

                            </div>

                            <p
                              className={`whitespace-pre-wrap text-sm leading-6 ${
                                isCustomer
                                  ? "text-white"
                                  : "text-slate-700"
                              }`}
                            >
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
                  className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isStarting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                  Stop Demo
                </button>

              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">

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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {status}
                    </p>
                  </div>

                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Audio
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {audioFrameCount.toLocaleString()}
                  </p>
                </div>

              </div>

            </div>

          </section>

          {/* Sidebar */}
          <aside className="space-y-5">

            {/* Selected demo */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-25px_rgba(15,23,42,0.2)]">

              <div className="flex items-center justify-between">

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  Selected demo
                </p>

                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-bold text-violet-600">
                  LIVE AI
                </span>

              </div>

              <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                {selectedIndustry.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedIndustry.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Audio
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {audioFrameCount.toLocaleString()}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    frames streamed
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Session
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {isSessionActive
                      ? "Active"
                      : "Ready"}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    live status
                  </p>
                </div>

              </div>

            </section>

            {/* Try saying */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-25px_rgba(15,23,42,0.2)]">

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                Try saying
              </p>

              <h3 className="mt-1 text-base font-bold text-slate-900">
                Start a natural conversation
              </h3>

              <div className="mt-4 space-y-2.5">

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-sm font-medium text-slate-600 transition hover:border-violet-100 hover:bg-violet-50/50">
                  &quot;What services do you offer?&quot;
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-sm font-medium text-slate-600 transition hover:border-violet-100 hover:bg-violet-50/50">
                  &quot;What are your business hours?&quot;
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-sm font-medium text-slate-600 transition hover:border-violet-100 hover:bg-violet-50/50">
                  &quot;Can I book an appointment?&quot;
                </div>

              </div>

            </section>

            {/* Contact CTA */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 text-white shadow-xl shadow-indigo-500/20">

              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

              <div className="relative">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                    />
                  </svg>
                </div>

                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100">
                  Want this for your business?
                </p>

                <h2 className="mt-2 text-xl font-bold tracking-tight">
                  Turn every call into an opportunity.
                </h2>

                <p className="mt-2 text-sm leading-6 text-violet-100">
                  Talk to us about building an AI receptionist
                  tailored to your business.
                </p>

                <Link
                  href="/#contact"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Contact Us

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M13 6l6 6-6 6"
                    />
                  </svg>
                </Link>

              </div>

            </section>

            {/* Demo notice */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4 text-amber-600"
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
                    This demo uses static business knowledge.
                    Customers, leads, appointments and calls
                    are not created or modified.
                  </p>
                </div>

              </div>

            </section>

          </aside>

        </div>

        {/* Bottom contact strip */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:px-6">

          <div>
            <p className="text-sm font-bold text-slate-800">
              Ready to put an AI receptionist on your business line?
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Let&apos;s build a system around your business workflow.
            </p>
          </div>

          <Link
            href="/#contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
          >
            Contact Us

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M13 6l6 6-6 6"
              />
            </svg>
          </Link>

        </div>

      </div>
    </main>
  );
}