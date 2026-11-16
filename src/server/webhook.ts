import { createHmac } from 'node:crypto';
import { config } from './env.ts';
import type { DeliveryResult } from './hubspot.ts';

/**
 * Optional generic webhook. Receives every submission as JSON with sensitive
 * answers, signatures and uploads removed. When SUBMISSION_WEBHOOK_SECRET is
 * set the body is signed: `X-Pathfinder-Signature: sha256=<hex hmac of body>`.
 */
export async function sendWebhook(payload: Record<string, unknown>): Promise<DeliveryResult> {
  const { url, secret } = config().webhook;
  if (!url) return { status: 'skipped' };
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'pathfinder-website' };
  if (secret) headers['X-Pathfinder-Signature'] = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  let detail = 'unknown error';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000), redirect: 'error' });
      if (res.ok) return { status: 'sent' };
      detail = `webhook ${res.status}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      detail = err instanceof Error && err.name === 'TimeoutError' ? 'webhook timeout' : 'webhook network error';
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { status: 'failed', detail };
}
