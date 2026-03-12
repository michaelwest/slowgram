import { getDigestDetail } from "./posts";
import { env } from "./env";
import { sendDigestMail } from "./resend-digest";

function truncateCaption(caption: string | null, maxLength = 140) {
  if (!caption) {
    return "";
  }
  if (caption.length <= maxLength) {
    return caption;
  }
  return `${caption.slice(0, maxLength - 1)}...`;
}

export async function renderDigestEmail(digestDate: string) {
  const digest = await getDigestDetail(digestDate);
  if (!digest) {
    throw new Error(`Digest ${digestDate} not found`);
  }

  const rows = digest.items
    .map(({ post }) => {
      const mediaPath = post.media_assets[0]?.local_path
        ? `${env.APP_BASE_URL}/media/${encodeURIComponent(post.media_assets[0].local_path)}`
        : "";
      const detailLink = `${env.APP_BASE_URL}/digests/${digestDate}`;
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #ddd;">
            <p style="margin:0 0 8px 0;font-weight:600;">@${post.source_username}</p>
            ${mediaPath ? `<img src="${mediaPath}" alt="" style="max-width:240px;border-radius:12px;display:block;margin-bottom:10px;" />` : ""}
            <p style="margin:0 0 8px 0;color:#333;">${truncateCaption(post.caption)}</p>
            <a href="${detailLink}">Open in Slowgram</a>
          </td>
        </tr>
      `;
    })
    .join("");

  return {
    subject: `Slowgram digest for ${digestDate}`,
    text: `Slowgram digest for ${digestDate}: ${digest.post_count} posts`,
    html: `
      <div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:24px;">
        <h1 style="margin-bottom:8px;">Slowgram digest</h1>
        <p style="margin-top:0;color:#444;">${digestDate} · ${digest.post_count} new posts</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
      </div>
    `
  };
}

export async function sendDigestEmail(digestDate: string) {
  const email = await renderDigestEmail(digestDate);
  await sendDigestMail(email.subject, email.html, email.text);
  return email.html;
}
