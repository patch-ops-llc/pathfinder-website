import type { APIRoute } from 'astro';
import { config } from '../../../server/env.ts';
import { issueToken } from '../../../server/security.ts';

export const prerender = false;

export const GET: APIRoute = () => {
  const { turnstileSiteKey, turnstileSecretKey } = config().security;
  return new Response(
    JSON.stringify({
      token: issueToken(),
      ...(turnstileSiteKey && turnstileSecretKey ? { turnstileSiteKey } : {}),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
};
