"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export type ContactFormState = {
  success: boolean;
  message: string;
};

const BUSINESS_TYPES = [
  "HVAC",
  "Cleaning Services",
  "Dental Clinic",
  "Other Service Business",
] as const;

const INTERESTS = [
  "AI Voice Receptionist",
  "AI Chatbot",
  "Website + AI Receptionist",
  "AI Automation",
  "Not Sure Yet",
] as const;

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function submitContactRequest(
  _previousState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  try {
    /*
     * Honeypot field.
     * Real users never see/fill this.
     * Basic bot protection without changing the normal UX.
     */
    const website = clean(
      formData.get("website")
    );

    if (website) {
      return {
        success: true,
        message:
          "Thanks. Your request has been received.",
      };
    }

    const name = clean(formData.get("name"));
    const businessName = clean(
      formData.get("business_name")
    );
    const businessType = clean(
      formData.get("business_type")
    );
    const email = clean(formData.get("email"));
    const phone = clean(formData.get("phone"));
    const country = clean(
      formData.get("country")
    );
    const interest = clean(
      formData.get("interest")
    );
    const message = clean(
      formData.get("message")
    );

    if (!name) {
      return {
        success: false,
        message: "Please enter your name.",
      };
    }

    if (!businessName) {
      return {
        success: false,
        message:
          "Please enter your business name.",
      };
    }

    if (
      !BUSINESS_TYPES.includes(
        businessType as (typeof BUSINESS_TYPES)[number]
      )
    ) {
      return {
        success: false,
        message:
          "Please select a valid business type.",
      };
    }

    if (!email) {
      return {
        success: false,
        message:
          "Please enter your email address.",
      };
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return {
        success: false,
        message:
          "Please enter a valid email address.",
      };
    }

    if (!country) {
      return {
        success: false,
        message: "Please enter your country.",
      };
    }

    if (
      !INTERESTS.includes(
        interest as (typeof INTERESTS)[number]
      )
    ) {
      return {
        success: false,
        message:
          "Please select what you are interested in.",
      };
    }

    if (name.length > 120) {
      return {
        success: false,
        message:
          "Name is too long.",
      };
    }

    if (businessName.length > 160) {
      return {
        success: false,
        message:
          "Business name is too long.",
      };
    }

    if (email.length > 254) {
      return {
        success: false,
        message:
          "Email address is too long.",
      };
    }

    if (phone.length > 40) {
      return {
        success: false,
        message:
          "Phone number is too long.",
      };
    }

    if (country.length > 100) {
      return {
        success: false,
        message:
          "Country name is too long.",
      };
    }

    if (message.length > 3000) {
      return {
        success: false,
        message:
          "Message is too long. Please keep it under 3000 characters.",
      };
    }

    const supabase = createAdminClient();

    /*
     * Save the inquiry first.
     *
     * We intentionally do not use the public Supabase client here.
     * The contact table is locked to anon/authenticated roles.
     */
    const { data: contactRequest, error } =
      await supabase
        .from("contact_requests")
        .insert({
          name,
          business_name: businessName,
          business_type: businessType,
          email,
          phone: phone || null,
          country,
          interest,
          message: message || null,
        })
        .select(
          "id,name,business_name,business_type,email,phone,country,interest,message,created_at"
        )
        .single();

    if (error || !contactRequest) {
      console.error(
        "Failed to create contact request:",
        error
      );

      return {
        success: false,
        message:
          "We couldn't submit your request right now. Please try again.",
      };
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const fromEmail =
      process.env.RESEND_FROM_EMAIL;

    const notificationEmail =
      process.env.CONTACT_NOTIFICATION_EMAIL;

    if (
      !resendApiKey ||
      !fromEmail ||
      !notificationEmail
    ) {
      console.error(
        "Contact email environment variables are not configured."
      );

      return {
        success: true,
        message:
          "Your request has been received. We'll be in touch soon.",
      };
    }

    const resend =
      new Resend(resendApiKey);

    const createdAt = new Date(
      contactRequest.created_at
    ).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const emailResult =
      await resend.emails.send({
        from: fromEmail,
        to: [notificationEmail],
        replyTo: email,
        subject: `New AI Receptionist Inquiry — ${businessName}`,
        html: `
          <!doctype html>
          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#f8fafc;
                font-family:Arial,Helvetica,sans-serif;
                color:#0f172a;
              "
            >
              <div
                style="
                  max-width:680px;
                  margin:40px auto;
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:20px;
                  overflow:hidden;
                "
              >
                <div
                  style="
                    padding:28px 32px;
                    background:linear-gradient(135deg,#020617,#1d4ed8,#7c3aed);
                    color:#ffffff;
                  "
                >
                  <div
                    style="
                      font-size:13px;
                      font-weight:600;
                      letter-spacing:0.08em;
                      text-transform:uppercase;
                      opacity:0.8;
                    "
                  >
                    AI Voice Receptionist
                  </div>

                  <h1
                    style="
                      margin:10px 0 0;
                      font-size:26px;
                      line-height:1.2;
                    "
                  >
                    New Contact Request
                  </h1>
                </div>

                <div style="padding:32px;">
                  <p
                    style="
                      margin:0 0 24px;
                      font-size:16px;
                      line-height:1.6;
                      color:#475569;
                    "
                  >
                    A potential client has requested a conversation
                    about your AI receptionist services.
                  </p>

                  <table
                    style="
                      width:100%;
                      border-collapse:collapse;
                      font-size:14px;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                          width:38%;
                        "
                      >
                        Name
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          font-weight:600;
                        "
                      >
                        ${escapeHtml(contactRequest.name)}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Business
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          font-weight:600;
                        "
                      >
                        ${escapeHtml(
                          contactRequest.business_name
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Business Type
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                        "
                      >
                        ${escapeHtml(
                          contactRequest.business_type
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Email
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                        "
                      >
                        <a
                          href="mailto:${escapeHtml(
                            contactRequest.email
                          )}"
                          style="color:#2563eb;"
                        >
                          ${escapeHtml(
                            contactRequest.email
                          )}
                        </a>
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Phone
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                        "
                      >
                        ${
                          contactRequest.phone
                            ? escapeHtml(
                                contactRequest.phone
                              )
                            : "Not provided"
                        }
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Country
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                        "
                      >
                        ${escapeHtml(
                          contactRequest.country
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                          color:#64748b;
                        "
                      >
                        Interested In
                      </td>
                      <td
                        style="
                          padding:12px 0;
                          border-bottom:1px solid #e2e8f0;
                        "
                      >
                        ${escapeHtml(
                          contactRequest.interest
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:12px 0;
                          color:#64748b;
                        "
                      >
                        Submitted
                      </td>
                      <td
                        style="padding:12px 0;"
                      >
                        ${escapeHtml(createdAt)}
                      </td>
                    </tr>
                  </table>

                  <div
                    style="
                      margin-top:28px;
                      padding:20px;
                      background:#f8fafc;
                      border:1px solid #e2e8f0;
                      border-radius:14px;
                    "
                  >
                    <div
                      style="
                        font-size:12px;
                        font-weight:700;
                        text-transform:uppercase;
                        letter-spacing:0.08em;
                        color:#64748b;
                      "
                    >
                      Message
                    </div>

                    <p
                      style="
                        margin:10px 0 0;
                        white-space:pre-wrap;
                        line-height:1.7;
                        color:#334155;
                      "
                    >
                      ${
                        contactRequest.message
                          ? escapeHtml(
                              contactRequest.message
                            )
                          : "No additional message."
                      }
                    </p>
                  </div>

                  <div
                    style="
                      margin-top:28px;
                      padding:16px 18px;
                      border-radius:12px;
                      background:#eff6ff;
                      color:#1e40af;
                      font-size:13px;
                      line-height:1.6;
                    "
                  >
                    Reply directly to this email to contact the
                    potential client.
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      });

    if (emailResult.error) {
      console.error(
        "Contact notification email failed:",
        emailResult.error
      );

      await supabase
        .from("contact_requests")
        .update({
          email_sent: false,
        })
        .eq(
          "id",
          contactRequest.id
        );

      return {
        success: true,
        message:
          "Your request has been received. We'll be in touch soon.",
      };
    }

    await supabase
      .from("contact_requests")
      .update({
        email_sent: true,
        email_sent_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        contactRequest.id
      );

    return {
      success: true,
      message:
        "Thanks! Your request has been received. We'll be in touch soon.",
    };
  } catch (error) {
    console.error(
      "Unexpected contact request error:",
      error
    );

    return {
      success: false,
      message:
        "Something went wrong. Please try again.",
    };
  }
}