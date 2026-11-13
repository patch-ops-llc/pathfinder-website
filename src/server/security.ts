import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './env.ts';

// ---------------------------------------------------------------------------
// Signed time token. The browser fetches one when a form loads and returns it
// with the submission. It proves the sender ran our JavaScript and spent a
// human amount of time on the page. It is a speed bump for bots, not a login.

export const TOKEN_MIN_AGE_MS = 3_000;
export const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let processSecret: string | undefined;
function secret(): string {
  const configured = config().security.tokenSecret;
  if (configured) return configured;
  const generated = processSecret ?? randomBytes(32).toString('hex');
  processSecret = generated;
  return generated;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function issueToken(now = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(9).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck = 'ok' | 'missing' | 'invalid' | 'too-fast' | 'expired';

export function checkToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== 'string' || token === '') return 'missing';
  const parts = token.split('.');
  if (parts.length !== 3) return 'invalid';
  const [ts, nonce, sig] = parts;
  const expected = Buffer.from(sign(`${ts}.${nonce}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid';
  const issued = Number.parseInt(ts, 36);
  if (!Number.isFinite(issued)) return 'invalid';
  const age = now - issued;
  if (age < TOKEN_MIN_AGE_MS) return 'too-fast';
  if (age > TOKEN_MAX_AGE_MS) return 'expired';
  return 'ok';
}

// A token is good for one accepted submission, which stops a bot replaying a
// single token. It stays usable after a failed attempt so people can retry.
const usedTokens = new Map<string, number>();

export function isTokenUsed(token: string): boolean {
  return usedTokens.has(token);
}

export function markTokenUsed(token: string, now = Date.now()) {
  usedTokens.set(token, now);
  if (usedTokens.size > 50_000) {
    for (const [t, at] of usedTokens) {
      if (now - at > TOKEN_MAX_AGE_MS) usedTokens.delete(t);
    }
    if (usedTokens.size > 50_000) usedTokens.clear();
  }
}

// ---------------------------------------------------------------------------
// Per-address rate limit, held in memory. Enough for a single instance; a
// multi-instance deployment should front the site with an edge rate limit.

const hits = new Map<string, number[]>();
const MAX_TRACKED = 20_000;

export function rateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const { rateLimitMax, rateLimitWindowMs } = config().security;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < rateLimitWindowMs);
  if (recent.length >= rateLimitMax) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((rateLimitWindowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_TRACKED) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= rateLimitWindowMs)) hits.delete(k);
    }
    if (hits.size > MAX_TRACKED) hits.clear();
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit() {
  hits.clear();
}

// ---------------------------------------------------------------------------
// Request provenance.

export function clientIp(request: Request, fallback = 'unknown'): string {
  if (config().security.trustProxy) {
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
    // The right-most entry is the address our own proxy saw; entries to its
    // left are supplied by the client and cannot be trusted.
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      const last = forwarded.split(',').pop()?.trim();
      if (last) return last;
    }
  }
  return fallback;
}

/** Form posts must come from a page on this site. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    return request.headers.get('sec-fetch-site') === 'same-origin';
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const normalized = originUrl.origin.toLowerCase();
  if (config().allowedOrigins.includes(normalized)) return true;
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim().toLowerCase();
  return host !== '' && originUrl.host.toLowerCase() === host;
}

export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const { turnstileSecretKey } = config().security;
  if (!turnstileSecretKey) return true;
  if (typeof token !== 'string' || token === '') return false;
  try {
    const body = new URLSearchParams({ secret: turnstileSecretKey, response: token });
    if (ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
