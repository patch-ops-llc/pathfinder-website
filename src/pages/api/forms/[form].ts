import type { APIRoute } from 'astro';
import { handleSubmission } from '../../../server/submit.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  let address: string | undefined;
  try {
    address = clientAddress;
  } catch {
    address = undefined;
  }
  try {
    return await handleSubmission(request, params.form ?? '', address);
  } catch (err) {
    // Log the failure class only: the request holds personal data.
    console.error(`[form] unhandled error form=${params.form} type=${err instanceof Error ? err.name : 'unknown'}`);
    return new Response(JSON.stringify({ ok: false, message: 'Something went wrong on our side.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ ok: false, message: 'Method not allowed.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST', 'Cache-Control': 'no-store' },
  });
