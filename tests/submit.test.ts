// End-to-end tests of the submission pipeline against local stand-ins for
// Resend and HubSpot. Nothing here talks to a real service.

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { resetConfig } from '../src/server/env.ts';
import { issueToken, resetRateLimit } from '../src/server/security.ts';
import { handleSubmission } from '../src/server/submit.ts';

interface Captured {
  url: string;
  headers: IncomingMessage['headers'];
  body: any;
  raw: string;
}

const resend: Captured[] = [];
const hubspot: Captured[] = [];
const webhook: Captured[] = [];
let resendStatus = 200;
let hubspotReply: (body: any) => { status: number; body: unknown } = () => ({ status: 200, body: { inlineMessage: 'Thanks' } });

function listen(handler: (c: Captured) => { status: number; body: unknown }): Promise<Server> {
  const server = createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const { status, body } = handler({ url: req.url ?? '', headers: req.headers, body: JSON.parse(raw || '{}'), raw });
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
const urlOf = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`;

let servers: Server[] = [];

before(async () => {
  const r = await listen((c) => {
    resend.push(c);
    return resendStatus === 200 ? { status: 200, body: { id: 'email_123' } } : { status: resendStatus, body: { name: 'validation_error', message: 'nope' } };
  });
  const h = await listen((c) => {
    hubspot.push(c);
    return hubspotReply(c.body);
  });
  const w = await listen((c) => {
    webhook.push(c);
    return { status: 200, body: {} };
  });
  servers = [r, h, w];
  Object.assign(process.env, {
    NODE_ENV: 'production',
    SITE_URL: 'https://www.pathfinderlld.com',
    FORM_TOKEN_SECRET: 'test-secret',
    RESEND_API_KEY: 're_test_key',
    RESEND_API_BASE: urlOf(r),
    EMAIL_FROM: 'Pathfinder Website <website@pathfinderlld.test>',
    ALERT_EMAIL_TO: 'alerts@pathfinderlld.test, second@pathfinderlld.test',
    ALERT_EMAIL_TO_CHECK_DRAFT: 'accounting@pathfinderlld.test',
    HUBSPOT_ENABLED: 'true',
    HUBSPOT_PORTAL_ID: '999',
    HUBSPOT_API_BASE: urlOf(h),
    HUBSPOT_FORM_CHECK_DRAFT: 'check-draft-guid',
    SUBMISSION_WEBHOOK_URL: `${urlOf(w)}/hook`,
    SUBMISSION_WEBHOOK_SECRET: 'hook-secret',
    RATE_LIMIT_MAX: '100',
  });
});

after(() => {
  for (const s of servers) s.close();
});

beforeEach(() => {
  resend.length = 0;
  hubspot.length = 0;
  webhook.length = 0;
  resendStatus = 200;
  hubspotReply = () => ({ status: 200, body: {} });
  resetConfig();
  resetRateLimit();
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
const SIGNATURE = `data:image/png;base64,${Buffer.from(PNG).toString('base64')}`;
const oldToken = () => issueToken(Date.now() - 10_000);

interface PostOptions {
  token?: string;
  honeypot?: string;
  files?: Record<string, { name: string; bytes: Uint8Array }[]>;
  headers?: Record<string, string>;
  page?: string;
}

function post(formId: string, values: unknown, opts: PostOptions = {}) {
  const data = new FormData();
  data.set(
    'payload',
    JSON.stringify({
      values,
      token: opts.token ?? oldToken(),
      company_website: opts.honeypot ?? '',
      page: opts.page ?? 'https://www.pathfinderlld.com/energy-insurance/?utm_source=x#lets-talk',
    }),
  );
  for (const [path, list] of Object.entries(opts.files ?? {})) {
    for (const f of list) data.append(`file:${path}`, new File([f.bytes], f.name));
  }
  // Serialise once so the request carries a real multipart body and length.
  const probe = new Request('http://internal/', { method: 'POST', body: data });
  return probe.arrayBuffer().then((buf) =>
    handleSubmission(
      new Request(`http://internal/api/forms/${formId}/`, {
        method: 'POST',
        headers: {
          'content-type': probe.headers.get('content-type')!,
          'content-length': String(buf.byteLength),
          origin: 'https://www.pathfinderlld.com',
          'x-forwarded-for': '203.0.113.9',
          ...opts.headers,
        },
        body: buf,
      }),
      formId,
      '127.0.0.1',
    ),
  );
}

const lead = { firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', company: 'Analytical Engines', numemployees: '5-25', phone: '281-555-0100' };

test('lead: delivered to HubSpot, the webhook and by email', async () => {
  const res = await post('lead-energy', lead);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; id: string };
  assert.equal(body.ok, true);
  assert.ok(body.id);

  assert.equal(hubspot.length, 1);
  assert.equal(hubspot[0].url, '/submissions/v3/integration/submit/999/8caa4b91-1d58-4300-9d76-0f8c1fc03b15');
  const fields = Object.fromEntries(hubspot[0].body.fields.map((f: any) => [f.name, f.value]));
  assert.deepEqual(fields, lead);
  assert.ok(hubspot[0].body.fields.every((f: any) => f.objectTypeId === '0-1'));
  assert.equal(hubspot[0].body.context.pageUri, 'https://www.pathfinderlld.com/energy-insurance/', 'query string and fragment are dropped');

  assert.equal(resend.length, 1);
  const mail = resend[0];
  assert.equal(mail.url, '/emails');
  assert.equal(mail.headers.authorization, 'Bearer re_test_key');
  assert.equal(mail.headers['idempotency-key'], `pf-${body.id}`);
  assert.deepEqual(mail.body.to, ['alerts@pathfinderlld.test', 'second@pathfinderlld.test']);
  assert.equal(mail.body.from, 'Pathfinder Website <website@pathfinderlld.test>');
  assert.equal(mail.body.reply_to, 'ada@example.com');
  assert.match(mail.body.subject, /Energy Insurance/);
  assert.match(mail.body.subject, /Ada Lovelace/);
  assert.match(mail.body.text, /Analytical Engines/);
  assert.match(mail.body.text, /HubSpot: sent\./);
  assert.match(mail.body.html, /ada@example\.com/);

  assert.equal(webhook.length, 1);
  assert.equal(webhook[0].body.form.id, 'lead-energy');
  assert.equal(webhook[0].body.values.email, 'ada@example.com');
  const { createHmac } = await import('node:crypto');
  assert.equal(webhook[0].headers['x-pathfinder-signature'], `sha256=${createHmac('sha256', 'hook-secret').update(webhook[0].raw).digest('hex')}`);
});

test('invalid input is rejected with field errors and nothing is delivered', async () => {
  const res = await post('lead-energy', { ...lead, email: 'nope', firstname: '' });
  assert.equal(res.status, 422);
  const body = (await res.json()) as { errors: Record<string, string> };
  assert.deepEqual(Object.keys(body.errors).sort(), ['email', 'firstname']);
  assert.equal(hubspot.length + resend.length + webhook.length, 0);
});

test('honeypot: bots get a fake success and nothing is delivered', async () => {
  const res = await post('lead-energy', lead, { honeypot: 'https://spam.example' });
  assert.equal(res.status, 200);
  assert.equal(hubspot.length + resend.length + webhook.length, 0);
});

test('token: missing, too-fast and replayed tokens are refused', async () => {
  assert.equal((await post('lead-energy', lead, { token: '' })).status, 403);
  assert.equal((await post('lead-energy', lead, { token: issueToken() })).status, 403);
  const token = oldToken();
  assert.equal((await post('lead-energy', lead, { token })).status, 200);
  assert.equal((await post('lead-energy', lead, { token })).status, 403, 'a token works once');
  assert.equal(resend.length, 1);
});

test('cross-site posts are refused', async () => {
  const res = await post('lead-energy', lead, { headers: { origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
  assert.equal(hubspot.length + resend.length, 0);
});

test('unknown form and wrong content type', async () => {
  assert.equal((await post('nope', lead)).status, 404);
  const res = await handleSubmission(
    new Request('http://internal/api/forms/lead-energy/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '2', origin: 'https://www.pathfinderlld.com' },
      body: '{}',
    }),
    'lead-energy',
  );
  assert.equal(res.status, 415);
});

test('rate limit applies per visitor address', async () => {
  process.env.RATE_LIMIT_MAX = '2';
  resetConfig();
  try {
    assert.equal((await post('lead-energy', lead)).status, 200);
    assert.equal((await post('lead-energy', lead)).status, 200);
    const blocked = await post('lead-energy', lead);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.equal((await post('lead-energy', lead, { headers: { 'x-forwarded-for': '198.51.100.7' } })).status, 200);
  } finally {
    process.env.RATE_LIMIT_MAX = '100';
  }
});

test('HubSpot failure: the lead is still accepted and the alert email says so', async () => {
  hubspotReply = () => ({ status: 500, body: {} });
  const res = await post('lead-energy', lead);
  assert.equal(res.status, 200);
  assert.equal(resend.length, 1);
  assert.match(resend[0].body.text, /HubSpot: NOT sent/);
});

test('HubSpot rejects an unknown field: it is dropped and the lead is retried', async () => {
  hubspotReply = (body) =>
    body.fields.some((f: any) => f.name === 'message')
      ? { status: 400, body: { errors: [{ message: "Error in 'fields.message'. Field not in form definition", errorType: 'FIELD_NOT_IN_FORM_DEFINITION' }] } }
      : { status: 200, body: {} };
  const res = await post('lead-contact', { ...lead, message: 'Hello there' });
  assert.equal(res.status, 200);
  assert.equal(hubspot.length, 2);
  assert.ok(!hubspot[1].body.fields.some((f: any) => f.name === 'message'));
  assert.match(resend[0].body.text, /Hello there/, 'the email still carries the full message');
});

test('email failure on a lead: accepted because HubSpot has it', async () => {
  resendStatus = 422;
  const res = await post('lead-energy', lead);
  assert.equal(res.status, 200);
});

test('nothing delivered: the visitor is told to call instead of seeing a false success', async () => {
  resendStatus = 422;
  hubspotReply = () => ({ status: 500, body: {} });
  const res = await post('lead-energy', lead);
  assert.equal(res.status, 502);
  assert.equal(((await res.json()) as { ok: boolean }).ok, false);
});

const checkDraft = () => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  policyNumber: 'POL-778899',
  checkNumber: '1042',
  paymentAmount: '1250.00',
  signature: SIGNATURE,
  date: new Date().toISOString().slice(0, 10),
});

test('check draft: check image and signature go by email only', async () => {
  const res = await post('check-draft', checkDraft(), { files: { checkImage: [{ name: '../my check.png', bytes: PNG }] } });
  assert.equal(res.status, 200);

  const mail = resend[0].body;
  assert.deepEqual(mail.to, ['accounting@pathfinderlld.test'], 'per-form recipients replace the default');
  const names = mail.attachments.map((a: any) => a.filename).sort();
  assert.deepEqual(names, ['my check.png', 'signature-signature.png']);
  assert.equal(mail.attachments.find((a: any) => a.filename === 'my check.png').content, Buffer.from(PNG).toString('base64'));
  assert.match(mail.text, /POL-778899/);

  assert.equal(hubspot.length, 1);
  assert.match(hubspot[0].url, /\/999\/check-draft-guid$/);
  const sent = JSON.stringify(hubspot[0].body);
  assert.doesNotMatch(sent, /my check\.png/);
  assert.doesNotMatch(sent, /iVBORw0KGgo/);
  assert.match(sent, /POL-778899/);

  const hook = JSON.stringify(webhook[0].body);
  assert.doesNotMatch(hook, /iVBORw0KGgo/);
  assert.doesNotMatch(hook, /my check\.png/);
  assert.equal(webhook[0].body.values.signature, undefined);
  assert.equal(webhook[0].body.values.checkImage, undefined);
});

test('check draft: a file whose content does not match its extension is rejected', async () => {
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);
  const res = await post('check-draft', checkDraft(), { files: { checkImage: [{ name: 'check.png', bytes: exe }] } });
  assert.equal(res.status, 422);
  const body = (await res.json()) as { errors: Record<string, string> };
  assert.ok(body.errors.checkImage);
  assert.equal(resend.length + hubspot.length, 0);
});

test('check draft: the upload is required and file claims in the payload are ignored', async () => {
  const res = await post('check-draft', { ...checkDraft(), checkImage: [{ name: 'claimed.png', size: 10 }] });
  assert.equal(res.status, 422);
  assert.ok(((await res.json()) as { errors: Record<string, string> }).errors.checkImage);
});

test('check draft: refused when the alert email cannot be sent, even if HubSpot succeeds', async () => {
  resendStatus = 422;
  const res = await post('check-draft', checkDraft(), { files: { checkImage: [{ name: 'check.png', bytes: PNG }] } });
  assert.equal(res.status, 502);
});

test('production without a Resend key: long forms are refused rather than lost', async () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  resetConfig();
  try {
    const res = await post('check-draft', checkDraft(), { files: { checkImage: [{ name: 'check.png', bytes: PNG }] } });
    assert.equal(res.status, 502);
    assert.equal(resend.length, 0);
  } finally {
    process.env.RESEND_API_KEY = saved;
  }
});

test('HubSpot stays off unless HUBSPOT_ENABLED is true', async () => {
  process.env.HUBSPOT_ENABLED = 'false';
  resetConfig();
  try {
    const res = await post('lead-energy', lead);
    assert.equal(res.status, 200);
    assert.equal(hubspot.length, 0);
    assert.match(resend[0].body.text, /HubSpot: not sent/);
  } finally {
    process.env.HUBSPOT_ENABLED = 'true';
  }
});
