import { env } from "@/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  id: string;
  mocked: boolean;
}

/**
 * Sends transactional email via Resend when configured; otherwise logs a mock
 * invite (AGENTS.md §14 — acceptable for local dev and tests).
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Resend API error:", body);
      throw new Error("Failed to send email");
    }

    const data = (await response.json()) as { id?: string };
    return { id: data.id ?? "sent", mocked: false };
  }

  if (env.APP_ENV === "development") {
    console.info("[email mock]", {
      to: message.to,
      subject: message.subject,
    });
  }

  return { id: `mock-${crypto.randomUUID()}`, mocked: true };
}

export function buildInterviewInviteEmail(input: {
  recipientName: string | null;
  candidateName: string;
  jobTitle: string;
  interviewType: string;
  scheduledAt: Date;
  durationMins: number;
  location?: string | null;
  meetingUrl?: string | null;
  isCandidate: boolean;
}): EmailMessage {
  const when = input.scheduledAt.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const where = input.meetingUrl
    ? `<p><strong>Join:</strong> <a href="${input.meetingUrl}">${input.meetingUrl}</a></p>`
    : input.location
      ? `<p><strong>Location:</strong> ${input.location}</p>`
      : "";

  const greeting = input.recipientName ? `Hi ${input.recipientName},` : "Hi,";
  const roleLine = input.isCandidate
    ? `Your ${input.interviewType.toLowerCase()} interview for <strong>${input.jobTitle}</strong> is scheduled.`
    : `You are on the panel for a ${input.interviewType.toLowerCase()} interview with <strong>${input.candidateName}</strong> for <strong>${input.jobTitle}</strong>.`;

  return {
    to: "",
    subject: `${input.interviewType} interview — ${input.jobTitle}`,
    html: `
      <p>${greeting}</p>
      <p>${roleLine}</p>
      <p><strong>When:</strong> ${when} (${input.durationMins} minutes)</p>
      ${where}
      <p>— Privotage Consulting ATS</p>
    `.trim(),
  };
}
