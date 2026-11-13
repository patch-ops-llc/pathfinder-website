import { randomBytes } from 'node:crypto';
import { HONEYPOT_FIELD, MAX_REQUEST_BYTES, SIGNATURE_PREFIX } from '../forms/constants.ts';
import { clean, contactOf, hubspotFields, setPath, summarize, summaryText, validate, visitInputs } from '../forms/logic.ts';
import { getForm } from '../forms/registry.ts';
import type { Errors, FileRef, FormDef, Values } from '../forms/types.ts';
import { getEmailProvider, type EmailAttachment } from './email/index.ts';
import { alertHtml, alertSubject, alertText, headerSafe } from './email/template.ts';
import { config } from './env.ts';
import { submitToHubspot, type DeliveryResult } from './hubspot.ts';
import { checkToken, clientIp, isSameOrigin, isTokenUsed, markTokenUsed, rateLimit, verifyTurnstile } from './security.ts';
import { contentMatchesExtension, contentTypeFor, safeFilename } from './uploads.ts';
import { sendWebhook } from './webhook.ts';

const json = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

const fail = (status: number, message: string, headers?: Record<string, string>) => json(status, { ok: false, message }, headers);

const RELOAD = 'Please reload the page and try again.';

function pageUrlFrom(candidate: unknown, request: Request): string {
  const site = config().siteUrl;
  for (const raw of [candidate, request.headers.get('referer')]) {
    if (typeof raw !== 'string' || raw === '') continue;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
      // Keep the path only: query strings and fragments can carry personal data.
      return headerSafe(`${url.origin}${url.pathname}`, 300);
    } catch {
      /* try the next candidate */
    }
  }
  return site;
}

/** Remove answers that must not leave through HubSpot, the webhook or logs. */
function withoutSensitive(form: FormDef, values: Values): Values {
  let out = values;
  visitInputs(form, values, (f, _v, path) => {
    if (f.type === 'file' || f.type === 'signature' || f.type === 'secret' || ('sensitive' in f && f.sensitive)) out = setPath(out, path, undefined);
  });
  return out;
}

function log(fields: Record<string, string | number>) {
  console.info(
    '[form] ' +
      Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join(' '),
  );
}

export async function handleSubmission(request: Request, formId: string, socketAddress?: string): Promise<Response> {
  const started = Date.now();
  const c = config();
  const form = getForm(formId);
  if (!form) return fail(404, 'Unknown form.');

  if (!isSameOrigin(request)) return fail(403, RELOAD);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return fail(415, RELOAD);
  const length = Number(request.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) return fail(411, RELOAD);
  if (length > MAX_REQUEST_BYTES) return fail(413, 'Your attachments are too large. Attachments are limited to 20 MB in total.');

  const ip = clientIp(request, socketAddress || 'unknown');
  const limit = rateLimit(ip);
  if (!limit.allowed) {
    log({ form: form.id, result: 'rate-limited' });
    return fail(429, 'Too many submissions from your network. Please wait a few minutes and try again.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  let data: FormData;
  let payload: Record<string, unknown>;
  try {
    data = await request.formData();
    const raw = data.get('payload');
    if (typeof raw !== 'string') throw new Error('payload');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('payload');
    payload = parsed as Record<string, unknown>;
  } catch {
    return fail(400, RELOAD);
  }

  // Decoy field: answer as if it worked so the bot learns nothing.
  if (typeof payload[HONEYPOT_FIELD] === 'string' && payload[HONEYPOT_FIELD] !== '') {
    log({ form: form.id, result: 'spam-honeypot' });
    return json(200, { ok: true });
  }

  const token = payload.token;
  const tokenState = checkToken(token);
  if (tokenState !== 'ok' || isTokenUsed(token as string)) {
    log({ form: form.id, result: `token-${tokenState === 'ok' ? 'reused' : tokenState}` });
    return fail(403, tokenState === 'too-fast' ? 'That was quick. Please wait a few seconds and submit again.' : `Your session expired. ${RELOAD}`);
  }

  if (!(await verifyTurnstile(payload.turnstileToken, ip))) {
    log({ form: form.id, result: 'turnstile-failed' });
    return fail(403, 'We could not confirm you are not a robot. Please try again.');
  }

  // --- Values and uploads ---------------------------------------------------
  let values = clean(form, payload.values);
  const uploads = new Map<string, { file: File; filename: string }[]>();
  visitInputs(form, values, (f, _v, path) => {
    if (f.type !== 'file') return;
    const parts = data.getAll(`file:${path}`).filter((p): p is File => typeof p !== 'string');
    uploads.set(
      path,
      parts.map((file) => ({ file, filename: safeFilename(file.name) })),
    );
  });
  // File names and sizes come from what was actually uploaded, never from the payload.
  for (const [path, list] of uploads) {
    const refs: FileRef[] = list.map(({ file, filename }) => ({ name: filename, size: file.size }));
    values = setPath(values, path, refs.length ? refs : undefined);
  }

  const errors: Errors = validate(form, values);

  const attachments: EmailAttachment[] = [];
  const usedNames = new Set<string>();
  const uniqueName = (name: string) => {
    let candidate = name;
    for (let n = 2; usedNames.has(candidate.toLowerCase()); n++) {
      const dot = name.lastIndexOf('.');
      candidate = dot > 0 ? `${name.slice(0, dot)}-${n}${name.slice(dot)}` : `${name}-${n}`;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  };

  for (const [path, list] of uploads) {
    if (errors[path]) continue;
    for (const { file, filename } of list) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!contentMatchesExtension(filename, bytes)) {
        errors[path] = `"${filename}" does not look like a valid file of that type. Please attach a different file.`;
        break;
      }
      attachments.push({ filename: uniqueName(filename), contentType: contentTypeFor(filename), content: bytes });
    }
  }

  visitInputs(form, values, (f, v, path) => {
    if (f.type !== 'signature' || typeof v !== 'string' || errors[path]) return;
    const bytes = new Uint8Array(Buffer.from(v.slice(SIGNATURE_PREFIX.length), 'base64'));
    if (!contentMatchesExtension('signature.png', bytes)) {
      errors[path] = 'Please sign again.';
      return;
    }
    attachments.push({ filename: uniqueName(`signature-${path.replace(/\./g, '-')}.png`), contentType: 'image/png', content: bytes });
  });

  if (Object.keys(errors).length) {
    log({ form: form.id, result: 'invalid', fields: Object.keys(errors).length });
    return json(422, { ok: false, errors, message: 'Please check the highlighted fields.' });
  }

  // --- Deliveries -----------------------------------------------------------
  const submissionId = randomBytes(6).toString('base64url');
  const submittedAt = new Date();
  const pageUrl = pageUrlFrom(payload.page, request);
  const contact = contactOf(form, values);
  const sections = summarize(form, values);
  const redactedSummary = summaryText(sections, { redact: true });

  const crmFields = hubspotFields(form, values);
  if (form.hubspotSummary) crmFields.push({ name: c.hubspot.summaryProperty, value: `${form.name}\n\n${redactedSummary}` });

  const [hubspot, webhook] = await Promise.all([
    submitToHubspot({
      submissionId,
      formId: form.id,
      formGuid: c.hubspot.formGuidFor(form.envKey, form.hubspotFormGuid),
      fields: crmFields,
      pageUri: pageUrl,
      pageName: form.name,
    }),
    sendWebhook({
      id: submissionId,
      submittedAt: submittedAt.toISOString(),
      form: { id: form.id, name: form.name },
      page: pageUrl,
      contact,
      values: withoutSensitive(form, values),
      summary: redactedSummary,
    }),
  ]);

  const notes: string[] = [];
  if (hubspot.status === 'sent') notes.push('HubSpot: sent.');
  else if (hubspot.status === 'failed') notes.push(`HubSpot: NOT sent (${hubspot.detail}). Please add this contact to HubSpot by hand.`);
  else notes.push(`HubSpot: not sent (${hubspot.detail}).`);

  let email: DeliveryResult;
  const provider = getEmailProvider();
  const to = c.email.toFor(form.envKey);
  if (!provider) email = { status: 'failed', detail: 'email is not configured' };
  else if (provider.name !== 'console' && (!c.email.from || to.length === 0)) email = { status: 'failed', detail: 'EMAIL_FROM or ALERT_EMAIL_TO is not set' };
  else {
    const input = { formName: form.name, submissionId, submittedAt, pageUrl, contact, sections, attachmentNames: attachments.map((a) => a.filename), notes };
    const result = await provider.send({
      from: c.email.from || 'Pathfinder Website <website@localhost>',
      to: to.length ? to : ['alerts@localhost'],
      cc: c.email.cc,
      replyTo: contact.email || undefined,
      subject: alertSubject(input),
      html: alertHtml(input),
      text: alertText(input),
      attachments,
      meta: { submissionId, formId: form.id },
    });
    email = result.ok ? { status: 'sent' } : { status: 'failed', detail: result.error };
  }

  const emailOk = email.status === 'sent';
  const accepted = form.emailRequired ? emailOk : emailOk || hubspot.status === 'sent';

  log({
    form: form.id,
    id: submissionId,
    result: accepted ? 'accepted' : 'undelivered',
    email: email.status + (email.detail ? `(${email.detail})` : ''),
    hubspot: hubspot.status + (hubspot.detail && hubspot.status === 'failed' ? `(${hubspot.detail})` : ''),
    webhook: webhook.status + (webhook.detail && webhook.status === 'failed' ? `(${webhook.detail})` : ''),
    files: attachments.length,
    ms: Date.now() - started,
  });

  if (!accepted) return fail(502, 'Our system could not deliver your form just now.');
  markTokenUsed(token as string);
  return json(200, { ok: true, id: submissionId });
}
