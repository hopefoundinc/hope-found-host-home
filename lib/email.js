const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEmail({ to, cc, subject, html, text, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY or RESEND_FROM_EMAIL is not set');
  }

  const payload = { from, to, subject, html, text };
  if (cc && cc.length > 0) payload.cc = cc;
  if (attachments && attachments.length > 0) payload.attachments = attachments;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API failed: ${res.status} ${body}`);
  }

  return res.json();
}
