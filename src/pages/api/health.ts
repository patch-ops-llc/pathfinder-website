import type { APIRoute } from 'astro';
import { config, configWarnings } from '../../server/env.ts';

export const prerender = false;

/** Liveness plus a secret-free view of how form delivery is configured. */
export const GET: APIRoute = () => {
  const c = config();
  return new Response(
    JSON.stringify({
      status: 'ok',
      email: c.email.provider,
      hubspot: c.hubspot.enabled && !!c.hubspot.portalId,
      webhook: !!c.webhook.url,
      turnstile: !!(c.security.turnstileSiteKey && c.security.turnstileSecretKey),
      warnings: configWarnings(c).length,
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
};
