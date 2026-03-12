import { env } from "./env";

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

async function sendEmail(payload: ResendPayload) {
  if (!env.RESEND_API_KEY) {
    console.info("Skipping email send because RESEND_API_KEY is not configured", payload.subject);
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Resend request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  return sendEmail({
    from: env.RESEND_FROM,
    to: [email],
    subject: "Your Slowgram sign-in link",
    text: `Use this link to sign in: ${magicLink}`,
    html: `<p>Use this link to sign in:</p><p><a href="${magicLink}">${magicLink}</a></p>`
  });
}
