// Runtime configuration. Everything is read from process.env when first
// needed, so one build can run in any environment. See .env.example.

import { existsSync } from 'node:fs';
import process from 'node:process';

export interface Config {
  isProd: boolean;
  siteUrl: string;
  allowedOrigins: string[];
  dataDir: string;
  email: {
    provider: 'resend' | 'console' | 'unconfigured';
    resendApiKey: string;
    resendApiBase: string;
    from: string;
    to: string[];
    cc: string[];
    toFor: (envKey: string) => string[];
  };
  hubspot: {
    enabled: boolean;
    portalId: string;
    apiBase: string;
    summaryProperty: string;
    formGuidFor: (envKey: string, fallback?: string) => string;
  };
  webhook: { url: string; secret: string };
  security: {
    tokenSecret: string;
    turnstileSiteKey: string;
    turnstileSecretKey: string;
    rateLimitMax: number;
    rateLimitWindowMs: number;
    trustProxy: boolean;
  };
}

let dotenvLoaded = false;
function loadDotEnv() {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  if (process.env.NODE_ENV === 'production' && !process.env.LOAD_DOTENV) return;
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
  } catch {
    /* A malformed .env should not take the site down. */
  }
}

const list = (v: string | undefined) =>
  (v ?? '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const bool = (v: string | undefined, fallback: boolean) => (v == null || v === '' ? fallback : /^(1|true|yes|on)$/i.test(v));
const int = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

let cached: Config | undefined;

export function config(): Config {
  if (cached) return cached;
  loadDotEnv();
  const env = process.env;
  const isProd = env.NODE_ENV === 'production';
  const siteUrl = (env.SITE_URL || 'https://www.pathfinderlld.com').replace(/\/+$/, '');

  const resendApiKey = env.RESEND_API_KEY ?? '';
  const requested = (env.EMAIL_PROVIDER ?? '').toLowerCase();
  let provider: Config['email']['provider'];
  if (requested === 'console') provider = 'console';
  else if (resendApiKey) provider = 'resend';
  // Without a key, local development falls back to the console outbox.
  // Production reports the alert as undelivered so nothing is lost silently.
  else provider = isProd ? 'unconfigured' : 'console';

  const to = list(env.ALERT_EMAIL_TO);

  cached = {
    isProd,
    siteUrl,
    allowedOrigins: [siteUrl, ...list(env.ALLOWED_ORIGINS)].map((o) => o.replace(/\/+$/, '').toLowerCase()),
    dataDir: env.DATA_DIR || '.data',
    email: {
      provider,
      resendApiKey,
      resendApiBase: (env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/+$/, ''),
      from: env.EMAIL_FROM ?? '',
      to,
      cc: list(env.ALERT_EMAIL_CC),
      toFor: (envKey) => {
        const specific = list(env[`ALERT_EMAIL_TO_${envKey}`]);
        return specific.length ? specific : to;
      },
    },
    hubspot: {
      // Off unless switched on, so local and preview runs never write to the CRM.
      enabled: bool(env.HUBSPOT_ENABLED, false),
      portalId: env.HUBSPOT_PORTAL_ID ?? '',
      apiBase: (env.HUBSPOT_API_BASE || 'https://api.hsforms.com').replace(/\/+$/, ''),
      summaryProperty: env.HUBSPOT_SUMMARY_PROPERTY || 'message',
      formGuidFor: (envKey, fallback = '') => env[`HUBSPOT_FORM_${envKey}`] || fallback,
    },
    webhook: { url: env.SUBMISSION_WEBHOOK_URL ?? '', secret: env.SUBMISSION_WEBHOOK_SECRET ?? '' },
    security: {
      tokenSecret: env.FORM_TOKEN_SECRET ?? '',
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '',
      turnstileSecretKey: env.TURNSTILE_SECRET_KEY ?? '',
      rateLimitMax: int(env.RATE_LIMIT_MAX, 10),
      rateLimitWindowMs: int(env.RATE_LIMIT_WINDOW_SECONDS, 600) * 1000,
      trustProxy: bool(env.TRUST_PROXY, true),
    },
  };
  if (!env.NODE_TEST_CONTEXT) for (const warning of configWarnings(cached)) console.warn(`[config] ${warning}`);
  return cached;
}

/** Test hook: forget cached configuration so the next call re-reads process.env. */
export function resetConfig() {
  cached = undefined;
}

/** Problems worth surfacing at startup and on the health endpoint. Never includes secret values. */
export function configWarnings(c: Config = config()): string[] {
  const out: string[] = [];
  if (c.email.provider === 'unconfigured') out.push('RESEND_API_KEY is not set: alert emails cannot be sent.');
  if (c.email.provider === 'console' && c.isProd) out.push('EMAIL_PROVIDER=console: alert emails are logged, not delivered.');
  if (c.email.provider === 'resend' && !c.email.from) out.push('EMAIL_FROM is not set.');
  if (c.email.provider === 'resend' && c.email.to.length === 0) out.push('ALERT_EMAIL_TO is not set.');
  if (!c.hubspot.enabled) out.push('HUBSPOT_ENABLED is not true: submissions are not sent to HubSpot.');
  if (c.hubspot.enabled && !c.hubspot.portalId) out.push('HUBSPOT_PORTAL_ID is not set.');
  if (c.isProd && !c.security.tokenSecret) out.push('FORM_TOKEN_SECRET is not set: form tokens reset on every restart.');
  return out;
}
