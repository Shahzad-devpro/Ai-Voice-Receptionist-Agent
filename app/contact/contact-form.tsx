"use client";

import { useActionState } from "react";
import { submitContactRequest } from "./actions";

const initialState = {
  success: false,
  message: "",
};

export default function ContactForm() {
  const [state, formAction, isPending] =
    useActionState(
      submitContactRequest,
      initialState
    );

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {/* Honeypot */}
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="website">
          Website
        </label>

        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          name="name"
          placeholder="John Smith"
          required
        />

        <Field
          label="Business name"
          name="business_name"
          placeholder="ABC HVAC Services"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="business_type"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Business type
          </label>

          <select
            id="business_type"
            name="business_type"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option
              value=""
              disabled
            >
              Select business type
            </option>

            <option value="HVAC">
              HVAC
            </option>

            <option value="Cleaning Services">
              Cleaning Services
            </option>

            <option value="Dental Clinic">
              Dental Clinic
            </option>

            <option value="Other Service Business">
              Other Service Business
            </option>
          </select>
        </div>

        <Field
          label="Country"
          name="country"
          placeholder="United States"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Email address"
          name="email"
          type="email"
          placeholder="john@business.com"
          required
        />

        <Field
          label="Phone / WhatsApp"
          name="phone"
          type="tel"
          placeholder="+1 555 123 4567"
        />
      </div>

      <div>
        <label
          htmlFor="interest"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          What are you interested in?
        </label>

        <select
          id="interest"
          name="interest"
          required
          defaultValue=""
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option
            value=""
            disabled
          >
            Select an option
          </option>

          <option value="AI Voice Receptionist">
            AI Voice Receptionist
          </option>

          <option value="AI Chatbot">
            AI Chatbot
          </option>

          <option value="Website + AI Receptionist">
            Website + AI Receptionist
          </option>

          <option value="AI Automation">
            AI Automation
          </option>

          <option value="Not Sure Yet">
            Not Sure Yet
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Tell us about your business
          <span className="ml-1 font-normal text-slate-400">
            (optional)
          </span>
        </label>

        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={3000}
          placeholder="Tell us what your business does, what you want the AI receptionist to handle, or what problem you are trying to solve..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      {state.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="group inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending
          ? "Sending request..."
          : "Request a Conversation"}

        {!isPending && (
          <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        )}
      </button>

      <p className="text-xs leading-5 text-slate-400">
        Your information is only used to respond to your
        inquiry and discuss the services you requested.
      </p>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
        {required && (
          <span className="ml-1 text-blue-600">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}