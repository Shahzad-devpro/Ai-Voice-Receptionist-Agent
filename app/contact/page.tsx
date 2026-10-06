import Link from "next/link";
import ContactForm from "./contact-form";

export const metadata = {
  title: "Contact Us",
  description:
    "Talk to us about configuring an AI Voice Receptionist for your business.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute right-[-180px] top-[35%] h-[450px] w-[450px] rounded-full bg-violet-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] left-[-150px] h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
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

          <Link
            href="/demo-agent"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            Try the AI
          </Link>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          {/* Left */}
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Let&apos;s talk
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Let&apos;s build a better
              <span className="block bg-gradient-to-r from-slate-950 via-blue-700 to-violet-600 bg-clip-text text-transparent">
                customer experience.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
              Tell us about your business and what you want
              an AI receptionist to handle. We&apos;ll review
              your request and reach out to discuss the right
              setup.
            </p>

            <div className="mt-8 space-y-4">
              <InfoItem
                title="Business-specific configuration"
                description="Services, hours, policies, knowledge and appointment workflows."
              />

              <InfoItem
                title="Voice-first customer experience"
                description="A professional AI receptionist that can handle real conversations."
              />

              <InfoItem
                title="Built for growing businesses"
                description="Designed around the operational needs of small service businesses."
              />
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Prefer to see it first?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try the browser-based AI receptionist demo
                before contacting us.
              </p>

              <Link
                href="/demo-agent"
                className="group mt-4 inline-flex items-center text-sm font-semibold text-slate-950"
              >
                Experience the AI

                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/50 sm:p-8 lg:p-10">
            <div className="mb-8 border-b border-slate-100 pb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Contact request
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Tell us what you need
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                We&apos;ll use these details to understand your
                business before reaching out.
              </p>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            © {new Date().getFullYear()} AI Voice Receptionist
          </div>

          <Link
            href="/"
            className="transition hover:text-slate-950"
          >
            Back to home
          </Link>
        </div>
      </footer>
    </main>
  );
}

function InfoItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-600">
        ✓
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}