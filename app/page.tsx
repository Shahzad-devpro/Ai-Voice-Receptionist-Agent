import Link from "next/link";

const capabilities = [
  {
    number: "01",
    title: "Answer every conversation",
    description:
      "Give customers an immediate, professional first point of contact instead of sending them to voicemail.",
  },
  {
    number: "02",
    title: "Capture real opportunities",
    description:
      "Collect customer information, understand their request, create leads, and keep important details organized.",
  },
  {
    number: "03",
    title: "Turn conversations into actions",
    description:
      "Connect conversations with availability and appointment workflows so the receptionist can do more than simply talk.",
  },
];

const industries = [
  "HVAC",
  "Cleaning Services",
  "Dental Clinics",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fafafa] text-slate-950">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />

        <div className="absolute right-[-180px] top-[35%] h-[450px] w-[450px] rounded-full bg-violet-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] left-[-150px] h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-sm transition duration-300 group-hover:scale-105 group-hover:rotate-3">
              AI
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight">
                AI Voice Receptionist
              </p>

              <p className="hidden text-[11px] text-slate-500 sm:block">
                Intelligent business communications
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/demo-agent"
              className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:block"
            >
              Try the AI
            </Link>

            {/* Contact Us */}
            <Link
              href="/contact"
              className="hidden rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md sm:block"
            >
              Contact Us
            </Link>

            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Hero copy */}
            <div>
              <div className="animate-[fadeIn_0.7s_ease-out]">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>

                  AI receptionist infrastructure for businesses
                </div>
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                Never let a customer
                <span className="block bg-gradient-to-r from-slate-950 via-blue-700 to-violet-600 bg-clip-text text-transparent">
                  wait for an answer.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
                AI Voice Receptionist gives small businesses an
                intelligent first point of contact that can handle
                customer conversations, capture leads, answer
                business questions, and support appointment
                workflows.
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo-agent"
                  className="group inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition duration-300 hover:-translate-y-1 hover:bg-slate-800 hover:shadow-xl"
                >
                  Experience the AI Receptionist

                  <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
                >
                  Contact Us
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Browser-based demo • No phone setup required
              </p>

              {/* Trust indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
                <span>✓ Business-aware responses</span>
                <span>✓ Lead capture</span>
                <span>✓ Appointment workflows</span>
              </div>
            </div>

            {/* Animated product visual */}
            <div className="relative mx-auto w-full max-w-lg lg:mx-0">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/90 p-2 shadow-2xl shadow-slate-300/40 backdrop-blur">
                {/* Browser top */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />

                  <div className="ml-3 h-7 flex-1 rounded-lg bg-slate-50" />
                </div>

                {/* Agent interface */}
                <div className="p-5 sm:p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <span className="text-sm font-bold">
                          AI
                        </span>

                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          AI Receptionist
                        </p>

                        <p className="text-xs text-emerald-600">
                          Ready to help
                        </p>
                      </div>
                    </div>

                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      ONLINE
                    </div>
                  </div>

                  {/* Voice animation */}
                  <div className="my-10 flex h-28 items-center justify-center gap-1.5">
                    {[20, 35, 55, 80, 45, 70, 95, 55, 30, 65, 85, 40, 25].map(
                      (height, index) => (
                        <span
                          key={index}
                          className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 to-violet-500"
                          style={{
                            height: `${height}%`,
                            animation:
                              "voiceBar 1.2s ease-in-out infinite",
                            animationDelay: `${index * 70}ms`,
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Conversation */}
                  <div className="space-y-3">
                    <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-slate-950 px-4 py-3 text-sm text-white">
                      I need someone to look at my AC tomorrow.
                    </div>

                    <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      Absolutely. I can help with that. Let me
                      check the available appointment times.
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">
                      Checking business availability...
                    </span>

                    <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      Processing
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating card */}
              <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block animate-[float_4s_ease-in-out_infinite]">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Conversation outcome
                </p>

                <p className="mt-1 text-sm font-semibold">
                  Appointment workflow
                </p>

                <p className="mt-1 text-xs text-emerald-600">
                  ✓ Customer captured
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client-focused section */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Built for business owners
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your team should focus on the work.
                <span className="block text-slate-400">
                  Your receptionist handles the conversation.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600">
                We are building AI receptionist infrastructure
                specifically for small businesses that cannot afford
                to miss valuable customer conversations.
              </p>

              <Link
                href="/demo-agent"
                className="group mt-7 inline-flex items-center text-sm font-semibold text-slate-950"
              >
                See how it works

                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {capabilities.map((item) => (
                <div
                  key={item.number}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <span className="text-xs font-semibold text-slate-400">
                    {item.number}
                  </span>

                  <h3 className="mt-8 text-base font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Designed for real businesses
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                One platform.
                <span className="block text-slate-400">
                  Configured for your business.
                </span>
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-400">
                The receptionist is configured around each business&apos;s
                services, operating hours, policies, knowledge, and
                appointment rules.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {industries.map((industry) => (
                <div
                  key={industry}
                  className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition duration-300 hover:border-slate-500 hover:bg-slate-800"
                >
                  {industry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Approach section */}
      <section
        id="contact"
        className="relative overflow-hidden border-t border-slate-200 bg-white"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Let&apos;s talk
              </div>

              <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Want an AI receptionist
                <span className="block text-slate-400">
                  configured for your business?
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
                If you&apos;re interested in using an AI receptionist
                for your business, let us know. We can learn about
                your operation and approach you with the right setup
                for your needs.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-300 hover:-translate-y-1 hover:bg-slate-800"
                >
                  Request a Conversation
                </a>

                <Link
                  href="/demo-agent"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition duration-300 hover:-translate-y-1 hover:border-slate-400 hover:shadow-md"
                >
                  Try the AI First
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H10l-4.5 4v-4.75A2.5 2.5 0 0 1 4 11.75v-6.25Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    Tell us you&apos;re interested
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the contact option above and we&apos;ll know
                    that you want to discuss an AI receptionist for
                    your business.
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm text-emerald-600">
                    ✓
                  </span>

                  <span className="text-sm text-slate-700">
                    Business-specific AI configuration
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-sm text-blue-600">
                    ✓
                  </span>

                  <span className="text-sm text-slate-700">
                    Voice receptionist setup
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-sm text-violet-600">
                    ✓
                  </span>

                  <span className="text-sm text-slate-700">
                    Lead and appointment workflows
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strong client CTA */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center lg:py-32">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            For business owners
          </div>

          <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Stop losing customers
            <span className="block text-slate-400">
              because nobody answered.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
            See what an AI receptionist could look like for your
            business. Experience the system first, then talk to us
            about configuring it around your operation.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo-agent"
              className="group inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-300 hover:-translate-y-1 hover:bg-slate-800 sm:w-auto"
            >
              Experience the AI Receptionist

              <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-7 py-3.5 text-sm font-semibold text-blue-700 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md sm:w-auto"
            >
              Contact Us
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            Built for HVAC, cleaning services, dental clinics, and
            other service businesses.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            © {new Date().getFullYear()} AI Voice Receptionist
          </div>

          <div>
            AI-powered customer communication infrastructure
          </div>
        </div>
      </footer>

      {/* Page animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes voiceBar {
          0%,
          100% {
            transform: scaleY(0.55);
            opacity: 0.55;
          }

          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}