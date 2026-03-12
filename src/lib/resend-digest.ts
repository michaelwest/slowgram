import { getEnv } from "./env";

export async function sendDigestMail(subject: string, html: string, text: string) {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.info("Skipping digest send because RESEND_API_KEY is not configured");
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [env.ALLOWED_EMAIL],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send digest email: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
