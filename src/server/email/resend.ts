import type { EmailMessage, EmailProvider, EmailResult } from './types.ts';

interface ResendOptions {
  apiKey: string;
  apiBase: string;
}

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

/** Resend over its REST API. https://resend.com/docs/api-reference/emails/send-email */
export function resendProvider({ apiKey, apiBase }: ResendOptions): EmailProvider {
  return {
    name: 'resend',
    async send(message: EmailMessage): Promise<EmailResult> {
      const body = JSON.stringify({
        from: message.from,
        to: message.to,
        ...(message.cc?.length ? { cc: message.cc } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content).toString('base64'),
                content_type: a.contentType,
              })),
            }
          : {}),
      });

      let lastError = 'unknown error';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${apiBase}/emails`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              // Lets Resend drop the duplicate if a retry follows a response we never saw.
              'Idempotency-Key': `pf-${message.meta.submissionId}`,
            },
            body,
            signal: AbortSignal.timeout(20_000),
          });
          if (res.ok) {
            const data = (await res.json().catch(() => ({}))) as { id?: string };
            return { ok: true, id: data.id };
          }
          const data = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
          lastError = `resend ${res.status}${data.name ? ` ${data.name}` : ''}`;
          if (!RETRY_STATUS.has(res.status)) break;
        } catch (err) {
          lastError = err instanceof Error && err.name === 'TimeoutError' ? 'resend timeout' : 'resend network error';
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      return { ok: false, error: lastError };
    },
  };
}
