import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { resetConfig } from '../src/server/env.ts';
import { checkToken, clientIp, isSameOrigin, issueToken, isTokenUsed, markTokenUsed, rateLimit, resetRateLimit, TOKEN_MAX_AGE_MS } from '../src/server/security.ts';
import { contentMatchesExtension, contentTypeFor, safeFilename } from '../src/server/uploads.ts';
import { alertHtml, alertSubject, escapeHtml, headerSafe } from '../src/server/email/template.ts';

beforeEach(() => {
  process.env.SITE_URL = 'https://www.pathfinderlld.com';
  process.env.FORM_TOKEN_SECRET = 'test-secret';
  process.env.RATE_LIMIT_MAX = '3';
  process.env.RATE_LIMIT_WINDOW_SECONDS = '60';
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.TRUST_PROXY;
  resetConfig();
  resetRateLimit();
});

test('token: valid only between the minimum and maximum age', () => {
  const now = Date.now();
  const token = issueToken(now);
  assert.equal(checkToken(token, now + 500), 'too-fast');
  assert.equal(checkToken(token, now + 5_000), 'ok');
  assert.equal(checkToken(token, now + TOKEN_MAX_AGE_MS + 1), 'expired');
});

test('token: missing, malformed and forged tokens are rejected', () => {
  const now = Date.now();
  assert.equal(checkToken(undefined), 'missing');
  assert.equal(checkToken(''), 'missing');
  assert.equal(checkToken({}), 'missing');
  assert.equal(checkToken('a.b'), 'invalid');
  const [ts, nonce, sig] = issueToken(now - 10_000).split('.');
  assert.equal(checkToken(`${ts}.${nonce}.${sig.slice(0, -2)}xx`), 'invalid');
  // Back-dating the timestamp must invalidate the signature.
  assert.equal(checkToken(`${(now - 20_000).toString(36)}.${nonce}.${sig}`), 'invalid');
});

test('token: signed with FORM_TOKEN_SECRET', () => {
  const token = issueToken(Date.now() - 10_000);
  process.env.FORM_TOKEN_SECRET = 'a-different-secret';
  resetConfig();
  assert.equal(checkToken(token), 'invalid');
});

test('token: single use after an accepted submission', () => {
  const token = issueToken(Date.now() - 10_000);
  assert.equal(isTokenUsed(token), false);
  markTokenUsed(token);
  assert.equal(isTokenUsed(token), true);
});

test('rate limit: blocks after the maximum and recovers after the window', () => {
  const now = Date.now();
  for (let i = 0; i < 3; i++) assert.equal(rateLimit('1.2.3.4', now + i).allowed, true);
  const blocked = rateLimit('1.2.3.4', now + 10);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);
  assert.equal(rateLimit('5.6.7.8', now + 10).allowed, true, 'other addresses are unaffected');
  assert.equal(rateLimit('1.2.3.4', now + 61_000).allowed, true);
});

const req = (headers: Record<string, string>) => new Request('http://internal/api/forms/lead-energy/', { method: 'POST', headers });

test('origin: accepts the configured site, the request host and extra allowed origins only', () => {
  assert.equal(isSameOrigin(req({ origin: 'https://www.pathfinderlld.com' })), true);
  assert.equal(isSameOrigin(req({ origin: 'https://evil.example', host: 'www.pathfinderlld.com' })), false);
  assert.equal(isSameOrigin(req({ origin: 'http://localhost:4321', host: 'localhost:4321' })), true);
  assert.equal(isSameOrigin(req({ origin: 'https://preview.up.railway.app', 'x-forwarded-host': 'preview.up.railway.app', host: 'internal' })), true);
  assert.equal(isSameOrigin(req({ origin: 'null' })), false);
  assert.equal(isSameOrigin(req({})), false);
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'same-origin' })), true);
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(isSameOrigin(req({ origin: 'not a url' })), false);

  process.env.ALLOWED_ORIGINS = 'https://staging.example.com';
  resetConfig();
  assert.equal(isSameOrigin(req({ origin: 'https://staging.example.com', host: 'internal' })), true);
});

test('client address: uses the proxy-supplied address, never a client-supplied one', () => {
  assert.equal(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1' }), 'sock'), '10.0.0.1');
  assert.equal(clientIp(req({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '6.6.6.6' }), 'sock'), '9.9.9.9');
  assert.equal(clientIp(req({}), 'sock'), 'sock');
  process.env.TRUST_PROXY = 'false';
  resetConfig();
  assert.equal(clientIp(req({ 'x-forwarded-for': '6.6.6.6' }), 'sock'), 'sock');
});

test('uploads: content must match the extension', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const pdf = new TextEncoder().encode('%PDF-1.7\n...');
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
  assert.equal(contentMatchesExtension('check.png', png), true);
  assert.equal(contentMatchesExtension('resume.pdf', pdf), true);
  assert.equal(contentMatchesExtension('resume.pdf', exe), false, 'an executable renamed to .pdf is rejected');
  assert.equal(contentMatchesExtension('check.png', pdf), false);
  assert.equal(contentMatchesExtension('run.exe', exe), false, 'unknown extensions are rejected');
  assert.equal(contentMatchesExtension('empty.png', new Uint8Array()), false);
  assert.equal(contentTypeFor('a.PDF'), 'application/pdf');
  assert.equal(contentTypeFor('a.unknown'), 'application/octet-stream');
});

test('uploads: file names are reduced to a safe base name', () => {
  assert.equal(safeFilename('../../etc/passwd'), 'passwd');
  assert.equal(safeFilename('C:\\Users\\me\\My Resume.pdf'), 'My Resume.pdf');
  assert.equal(safeFilename('a"b<c>.png'), 'abc.png');
  assert.equal(safeFilename('...hidden'), 'hidden');
  assert.equal(safeFilename(''), 'upload');
  assert.ok(safeFilename(`${'x'.repeat(300)}.pdf`).length <= 120);
  assert.ok(safeFilename(`${'x'.repeat(300)}.pdf`).endsWith('.pdf'));
});

test('email: user input cannot inject headers or HTML', () => {
  assert.equal(headerSafe('Ada\r\nBcc: attacker@example.com'), 'Ada Bcc: attacker@example.com');
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  const input = {
    formName: "Let's Talk: Energy Insurance",
    submissionId: 'abc123',
    submittedAt: new Date('2026-11-13T12:00:00Z'),
    pageUrl: 'https://www.pathfinderlld.com/energy-insurance/',
    contact: { email: 'ada@example.com', firstName: '<script>alert(1)</script>', lastName: 'Lovelace\r\nBcc: x@example.com', phone: '', company: '' },
    sections: [{ title: 'Contact', groups: [{ rows: [{ label: 'First name', value: '<script>alert(1)</script>' }] }] }],
    attachmentNames: [],
    notes: ['HubSpot: sent.'],
  };
  assert.doesNotMatch(alertSubject(input), /[\r\n]/);
  const html = alertHtml(input);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
