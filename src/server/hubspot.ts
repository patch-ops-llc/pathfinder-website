import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './env.ts';

export interface HubspotField {
  name: string;
  value: string;
}

export interface HubspotSubmission {
  submissionId: string;
  formId: string;
  formGuid: string;
  fields: HubspotField[];
  pageUri: string;
  pageName: string;
}

export interface DeliveryResult {
  status: 'sent' | 'skipped' | 'failed';
  /** Short reason, safe to log. */
  detail?: string;
}

const MAX_VALUE_CHARS = 60_000;

interface HubspotError {
  message?: string;
  errorType?: string;
}

/** Fields HubSpot rejected for reasons that should not block the lead itself. */
function droppableFields(errors: HubspotError[]): Set<string> {
  const names = new Set<string>();
  for (const e of errors) {
    if (!e.errorType || !/FIELD_NOT_IN_FORM_DEFINITION|VALUE_NOT_IN_FIELD_DEFINITION|INPUT_TOO_LARGE|INVALID_NUMBER|NUMBER_OUT_OF_RANGE/.test(e.errorType)) continue;
    const match = /fields\.([A-Za-z0-9_]+)/.exec(e.message ?? '');
    if (match && match[1] !== 'email') names.add(match[1]);
  }
  return names;
}

/**
 * Submit to a HubSpot form through the Forms API, the same endpoint the
 * embedded HubSpot forms used. No private key is involved: the portal ID and
 * form GUID identify the destination.
 * https://developers.hubspot.com/docs/api/marketing/forms
 */
export async function submitToHubspot(sub: HubspotSubmission): Promise<DeliveryResult> {
  const c = config();
  const fields = sub.fields
    .filter((f) => f.value !== '')
    .map((f) => ({ objectTypeId: '0-1', name: f.name, value: f.value.slice(0, MAX_VALUE_CHARS) }));

  if (!c.hubspot.enabled) {
    if (!c.isProd) {
      // Development fallback: record what would have been sent.
      try {
        const dir = join(c.dataDir, 'hubspot');
        await mkdir(dir, { recursive: true });
        await writeFile(
          join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${sub.formId}-${sub.submissionId}.json`),
          JSON.stringify({ formGuid: sub.formGuid || null, fields, context: { pageUri: sub.pageUri, pageName: sub.pageName } }, null, 2),
        );
      } catch {
        /* The dev record is a convenience only. */
      }
    }
    return { status: 'skipped', detail: 'HUBSPOT_ENABLED is not true' };
  }
  if (!c.hubspot.portalId) return { status: 'failed', detail: 'HUBSPOT_PORTAL_ID is not set' };
  if (!sub.formGuid) return { status: 'skipped', detail: 'no HubSpot form configured for this form' };

  const url = `${c.hubspot.apiBase}/submissions/v3/integration/submit/${encodeURIComponent(c.hubspot.portalId)}/${encodeURIComponent(sub.formGuid)}`;
  let current = fields;
  let detail = 'unknown error';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: current, context: { pageUri: sub.pageUri, pageName: sub.pageName } }),
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) return { status: 'sent' };

      const data = (await res.json().catch(() => ({}))) as { errors?: HubspotError[] };
      const types = (data.errors ?? []).map((e) => e.errorType).filter(Boolean);
      detail = `hubspot ${res.status}${types.length ? ` ${[...new Set(types)].join(',')}` : ''}`;

      if (res.status === 400) {
        const drop = droppableFields(data.errors ?? []);
        const next = current.filter((f) => !drop.has(f.name));
        if (drop.size && next.length < current.length && next.length > 0) {
          current = next;
          continue;
        }
        break;
      }
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      detail = err instanceof Error && err.name === 'TimeoutError' ? 'hubspot timeout' : 'hubspot network error';
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { status: 'failed', detail };
}
