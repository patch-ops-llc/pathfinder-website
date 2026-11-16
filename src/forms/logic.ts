// Shared form logic: conditional visibility, cleaning of untrusted input,
// validation and the readable summary. Runs unchanged in the browser and on
// the server, so both sides always agree on what a valid submission is.

import {
  DEFAULT_TEXTAREA_MAX,
  DEFAULT_TEXT_MAX,
  MAX_FILE_BYTES,
  MAX_SIGNATURE_CHARS,
  MAX_TOTAL_UPLOAD_BYTES,
  SIGNATURE_PREFIX,
  UPLOAD_EXTENSIONS,
  US_STATES,
} from './constants.ts';
import type {
  Condition,
  Errors,
  Field,
  FileRef,
  FormDef,
  GroupValue,
  InputField,
  Option,
  PercentGroupField,
  RepeaterField,
  TableField,
  TableValue,
  Value,
  Values,
} from './types.ts';

export interface Scope {
  root: Values;
  item?: Values;
  index?: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export const optionValue = (o: string | Option) => (typeof o === 'string' ? o : o.value);
export const optionLabel = (o: string | Option) => (typeof o === 'string' ? o : (o.label ?? o.value));

export function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (isObj(v)) return Object.values(v).some(isFilled);
  return false;
}

export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[$,%\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function lookup(field: string, scope: Scope): Value {
  if (field.startsWith('^')) return scope.root[field.slice(1)];
  return scope.item ? scope.item[field] : scope.root[field];
}

/** Inside a repeater item, a field name refers to the item; prefix with ^ for a top-level field. */
export function test(cond: Condition | undefined, scope: Scope): boolean {
  if (!cond) return true;
  if ('any' in cond) return cond.any.some((c) => test(c, scope));
  if ('all' in cond) return cond.all.every((c) => test(c, scope));
  if ('index' in cond) return scope.index != null && cond.index.includes(scope.index);
  if ('notIndex' in cond) return scope.index == null || !cond.notIndex.includes(scope.index);
  const v = lookup(cond.field, scope);
  if ('equals' in cond) {
    const s = str(v);
    return Array.isArray(cond.equals) ? cond.equals.includes(s) : s === cond.equals;
  }
  if ('notEquals' in cond) return str(v) !== cond.notEquals;
  if ('includes' in cond) return Array.isArray(v) && (v as unknown[]).includes(cond.includes);
  if ('gte' in cond) {
    // For a repeater, compares the number of items.
    if (Array.isArray(v)) return v.length >= cond.gte;
    const n = parseFloat(str(v).replace(/[$,%\s]/g, ''));
    return Number.isFinite(n) && n >= cond.gte;
  }
  return isFilled(v);
}

export function repeaterCount(f: RepeaterField, container: Values, scope: Scope): number {
  if (f.countFrom) {
    const raw = str(scope.root[f.countFrom.field]);
    if (!raw) return 0;
    const n = f.countFrom.map?.[raw] ?? parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(f.max, n)) : 0;
  }
  const arr = container[f.name];
  const len = Array.isArray(arr) ? arr.length : 0;
  return Math.max(f.min, Math.min(f.max, len));
}

export const allFields = (form: FormDef): Field[] => form.steps.flatMap((s) => s.fields);

export function isRequired(f: Field, scope: Scope): boolean {
  if (f.type === 'note' || f.type === 'heading' || f.type === 'repeater') return false;
  if (f.required) return true;
  return 'requiredIf' in f && f.requiredIf ? test(f.requiredIf, scope) : false;
}

// ---------------------------------------------------------------------------
// Cleaning: turn untrusted input into values that match the schema exactly.

function coerceString(raw: unknown, max: number, multiline = false): string | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  let s = String(raw).replace(/\u0000/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n') : s.replace(/[\r\n\t]+/g, ' ');
  s = s.trim().slice(0, max);
  return s === '' ? undefined : s;
}

function coerceField(f: Field, raw: unknown): Value {
  switch (f.type) {
    case 'note':
    case 'heading':
      return undefined;
    case 'text':
    case 'email':
    case 'tel':
    case 'secret':
      return coerceString(raw, f.maxLength ?? DEFAULT_TEXT_MAX);
    case 'textarea':
      return coerceString(raw, f.maxLength ?? DEFAULT_TEXTAREA_MAX, true);
    case 'number':
    case 'currency':
    case 'percent':
      return coerceString(raw, 40);
    case 'select':
    case 'radio':
    case 'state':
    case 'date':
      return coerceString(raw, 200);
    case 'checkbox-group': {
      if (!Array.isArray(raw)) return undefined;
      const out = [...new Set(raw.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 200)))];
      return out.length ? out.slice(0, f.options.length) : undefined;
    }
    case 'file': {
      if (!Array.isArray(raw)) return undefined;
      const out: FileRef[] = [];
      for (const x of raw.slice(0, 20)) {
        if (isObj(x) && typeof x.name === 'string' && typeof x.size === 'number' && Number.isFinite(x.size)) {
          out.push({ name: x.name.slice(0, 255), size: x.size });
        }
      }
      return out.length ? out : undefined;
    }
    case 'signature':
      return typeof raw === 'string' && raw !== '' ? raw : undefined;
    case 'consent':
      return raw === 'yes' ? 'yes' : undefined;
    case 'table': {
      if (!isObj(raw)) return undefined;
      const out: TableValue = {};
      for (const row of f.rows) {
        const r = raw[row.key];
        if (!isObj(r)) continue;
        const cells: Record<string, string> = {};
        for (const col of f.columns) {
          const v = coerceField(col, r[col.name]);
          if (typeof v === 'string') cells[col.name] = v;
        }
        if (Object.keys(cells).length) out[row.key] = cells;
      }
      return Object.keys(out).length ? out : undefined;
    }
    case 'percent-group': {
      if (!isObj(raw)) return undefined;
      const out: GroupValue = {};
      for (const item of f.items) {
        const v = coerceString(raw[item.key], 10);
        if (v !== undefined) out[item.key] = v;
      }
      return Object.keys(out).length ? out : undefined;
    }
    case 'repeater': {
      if (!Array.isArray(raw)) return undefined;
      return raw.slice(0, f.max).map((x) => coerceFields(f.fields, isObj(x) ? x : {}));
    }
  }
}

function coerceFields(fields: Field[], raw: Record<string, unknown>): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = coerceField(f, raw[f.name]);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

function pruneFields(fields: Field[], container: Values, scope: Scope, stats: { removed: number }): Values {
  const out: Values = {};
  for (const f of fields) {
    if (f.type === 'note' || f.type === 'heading') continue;
    const v = container[f.name];
    if (!test(f.showIf, scope)) {
      if (isFilled(v)) stats.removed++;
      continue;
    }
    if (f.type === 'repeater') {
      const count = repeaterCount(f, container, scope);
      const arr = Array.isArray(v) ? (v as Values[]) : [];
      if (arr.length > count && arr.slice(count).some(isFilled)) stats.removed++;
      const items: Values[] = [];
      for (let i = 0; i < count; i++) {
        const item = isObj(arr[i]) ? (arr[i] as Values) : {};
        items.push(pruneFields(f.fields, item, { root: scope.root, item, index: i }, stats));
      }
      out[f.name] = items;
      continue;
    }
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

/** Drop answers to questions that are not currently shown. Repeats until dependent questions settle. */
export function prune(form: FormDef, values: Values): Values {
  let current = values;
  for (let pass = 0; pass < 6; pass++) {
    const stats = { removed: 0 };
    current = pruneFields(allFields(form), current, { root: current }, stats);
    if (stats.removed === 0) break;
  }
  return current;
}

/** Coerce untrusted input to the schema, then drop anything not currently shown. */
export function clean(form: FormDef, raw: unknown): Values {
  return prune(form, coerceFields(allFields(form), isObj(raw) ? raw : {}));
}

// ---------------------------------------------------------------------------
// Traversal helpers.

export type Visitor = (field: InputField | TableField | PercentGroupField, value: Value, path: string, scope: Scope) => void;

function visitFields(fields: Field[], container: Values, scope: Scope, prefix: string, visit: Visitor) {
  for (const f of fields) {
    if (f.type === 'note' || f.type === 'heading') continue;
    if (!test(f.showIf, scope)) continue;
    const path = prefix + f.name;
    if (f.type === 'repeater') {
      const count = repeaterCount(f, container, scope);
      const arr = Array.isArray(container[f.name]) ? (container[f.name] as Values[]) : [];
      for (let i = 0; i < count; i++) {
        const item = isObj(arr[i]) ? (arr[i] as Values) : {};
        visitFields(f.fields, item, { root: scope.root, item, index: i }, `${path}.${i}.`, visit);
      }
      continue;
    }
    visit(f, container[f.name], path, scope);
  }
}

/** Visit every input that is currently shown, including inputs inside repeater items. */
export function visitInputs(form: FormDef, values: Values, visit: Visitor, stepIndex?: number) {
  const steps = stepIndex == null ? form.steps : [form.steps[stepIndex]];
  for (const step of steps) visitFields(step.fields, values, { root: values }, '', visit);
}

export function getPath(values: Values, path: string): Value {
  let cur: unknown = values;
  for (const key of path.split('.')) {
    if (Array.isArray(cur)) cur = cur[Number(key)];
    else if (isObj(cur)) cur = cur[key];
    else return undefined;
  }
  return cur as Value;
}

/** Returns a copy of `values` with `path` set. Intermediate containers are created as needed. */
export function setPath(values: Values, path: string, value: Value): Values {
  const keys = path.split('.');
  const assign = (cur: unknown, i: number): unknown => {
    const key = keys[i];
    const isIndex = /^\d+$/.test(key);
    if (isIndex) {
      const arr = Array.isArray(cur) ? [...cur] : [];
      const idx = Number(key);
      while (arr.length <= idx) arr.push({});
      arr[idx] = i === keys.length - 1 ? value : assign(arr[idx], i + 1);
      return arr;
    }
    const obj: Record<string, unknown> = isObj(cur) ? { ...cur } : {};
    if (i === keys.length - 1) {
      if (value === undefined) delete obj[key];
      else obj[key] = value;
    } else {
      obj[key] = assign(obj[key], i + 1);
    }
    return obj;
  };
  return assign(values, 0) as Values;
}

// ---------------------------------------------------------------------------
// Validation.

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:".]{2,}$/;
const STATE_CODES = new Set(US_STATES.map(([code]) => code));

export const MSG = {
  required: 'Please complete this required field.',
  email: 'Enter a valid email address, like name@example.com.',
  tel: 'Enter a valid phone number, including area code.',
  number: 'Enter a number.',
  integer: 'Enter a whole number.',
  option: 'Choose one of the listed options.',
  date: 'Enter a valid date.',
  consent: 'Please check the box to continue.',
  signature: 'Please sign before continuing.',
};

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function validateScalar(f: InputField, v: Value, today: string): string | undefined {
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'secret':
    case 'email':
    case 'tel': {
      const s = str(v);
      if (f.type === 'email' && (!EMAIL_RE.test(s) || s.length > 254)) return MSG.email;
      if (f.type === 'tel') {
        const digits = s.replace(/\D/g, '');
        if (!/^[\d\s().+\-x#/extEXT]+$/.test(s) || digits.length < 7 || s.length > 30) return MSG.tel;
      }
      if (f.minLength && s.length < f.minLength) return `Enter at least ${f.minLength} characters.`;
      if (f.pattern && !new RegExp(f.pattern).test(s)) return f.patternMessage ?? 'Check the format of this answer.';
      return undefined;
    }
    case 'number':
    case 'currency':
    case 'percent': {
      const n = parseNumber(str(v));
      if (n == null) return MSG.number;
      if (f.integer && !Number.isInteger(n)) return MSG.integer;
      const min = f.min ?? (f.type === 'number' ? undefined : 0);
      const max = f.max ?? (f.type === 'percent' ? 100 : 1e12);
      if (min != null && n < min) return `Enter ${min} or more.`;
      if (n > max) return `Enter ${max} or less.`;
      return undefined;
    }
    case 'select':
    case 'radio':
      return f.options.some((o) => optionValue(o) === v) ? undefined : MSG.option;
    case 'checkbox-group': {
      const allowed = new Set(f.options.map(optionValue));
      return Array.isArray(v) && (v as unknown[]).every((x) => typeof x === 'string' && allowed.has(x)) ? undefined : MSG.option;
    }
    case 'state':
      return STATE_CODES.has(str(v)) ? undefined : MSG.option;
    case 'date': {
      const s = str(v);
      if (!isValidDate(s)) return MSG.date;
      if (f.range === 'past' && s > today) return 'This date cannot be in the future.';
      if (f.range === 'future' && s < today) return 'This date cannot be in the past.';
      return undefined;
    }
    case 'file': {
      const files = (Array.isArray(v) ? v : []) as FileRef[];
      const max = f.maxFiles ?? 1;
      if (files.length > max) return max === 1 ? 'Attach one file only.' : `Attach up to ${max} files.`;
      const allowed: readonly string[] = f.extensions ?? UPLOAD_EXTENSIONS;
      for (const file of files) {
        if (!allowed.includes(extensionOf(file.name))) {
          return `"${file.name}" is not an accepted file type. Accepted: ${allowed.join(', ')}.`;
        }
        if (file.size > MAX_FILE_BYTES) return `"${file.name}" is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
        if (file.size <= 0) return `"${file.name}" is empty.`;
      }
      return undefined;
    }
    case 'signature': {
      const s = str(v);
      return s.startsWith(SIGNATURE_PREFIX) && s.length <= MAX_SIGNATURE_CHARS && /^[A-Za-z0-9+/=]+$/.test(s.slice(SIGNATURE_PREFIX.length))
        ? undefined
        : MSG.signature;
    }
    case 'consent':
      return v === 'yes' ? undefined : MSG.consent;
  }
}

export interface ValidateOptions {
  /** Validate one step only (browser "Next" button). */
  step?: number;
  /** YYYY-MM-DD used for date range checks. */
  today?: string;
}

/** Validate cleaned values. Returns a map of field path to message; empty when valid. */
export function validate(form: FormDef, values: Values, opts: ValidateOptions = {}): Errors {
  const errors: Errors = {};
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  let uploadBytes = 0;
  let lastFilePath = '';

  visitInputs(
    form,
    values,
    (f, v, path, scope) => {
      const required = isRequired(f, scope);

      if (f.type === 'table') {
        const table = (isObj(v) ? v : {}) as TableValue;
        for (const row of f.rows) {
          for (const col of f.columns) {
            const cell = table[row.key]?.[col.name];
            const cellPath = `${path}.${row.key}.${col.name}`;
            if (!isFilled(cell)) {
              if (col.required || (f.required && col.required !== false)) errors[cellPath] = MSG.required;
              continue;
            }
            const err = validateScalar(col, cell, today);
            if (err) errors[cellPath] = err;
          }
        }
        return;
      }

      if (f.type === 'percent-group') {
        const group = (isObj(v) ? v : {}) as GroupValue;
        let sum = 0;
        let any = false;
        let bad = false;
        for (const item of f.items) {
          const raw = group[item.key];
          if (!isFilled(raw)) continue;
          any = true;
          const n = parseNumber(raw);
          if (n == null || !Number.isInteger(n) || n < 0 || n > f.total) {
            errors[`${path}.${item.key}`] = `Enter a whole number from 0 to ${f.total}.`;
            bad = true;
          } else sum += n;
        }
        if (!any) {
          if (required) errors[path] = MSG.required;
        } else if (!bad && sum !== f.total) {
          errors[path] = `These must add up to ${f.total}%. The current total is ${sum}%.`;
        }
        return;
      }

      if (!isFilled(v)) {
        if (required) errors[path] = f.type === 'consent' ? MSG.consent : f.type === 'signature' ? MSG.signature : MSG.required;
        return;
      }
      const err = validateScalar(f, v, today);
      if (err) errors[path] = err;
      if (f.type === 'file') {
        for (const file of v as FileRef[]) uploadBytes += file.size;
        lastFilePath = path;
      }
    },
    opts.step,
  );

  if (uploadBytes > MAX_TOTAL_UPLOAD_BYTES && lastFilePath && !errors[lastFilePath]) {
    errors[lastFilePath] = `Attachments are limited to ${MAX_TOTAL_UPLOAD_BYTES / 1024 / 1024} MB in total.`;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Readable summary, used for the email alert, HubSpot and the webhook.

export interface SummaryRow {
  label: string;
  value: string;
  sensitive?: boolean;
  multiline?: boolean;
}
export interface SummaryGroup {
  title?: string;
  rows: SummaryRow[];
}
export interface SummarySection {
  title: string;
  groups: SummaryGroup[];
}

const usd = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function formatDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
}

function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function formatValue(f: InputField, v: Value): string {
  switch (f.type) {
    case 'currency': {
      const n = parseNumber(str(v));
      return n == null ? str(v) : usd(n);
    }
    case 'percent': {
      const n = parseNumber(str(v));
      return n == null ? str(v) : `${n}%`;
    }
    case 'date':
      return formatDate(str(v));
    case 'state':
      return US_STATES.find(([code]) => code === v)?.[1] ?? str(v);
    case 'select':
    case 'radio': {
      const o = f.options.find((x) => optionValue(x) === v);
      return o ? optionLabel(o) : str(v);
    }
    case 'checkbox-group':
      return Array.isArray(v) ? (v as string[]).join(', ') : '';
    case 'file':
      return ((Array.isArray(v) ? v : []) as FileRef[]).map((x) => `${x.name} (${formatBytes(x.size)})`).join(', ') + ' (attached to the email alert)';
    case 'signature':
      return 'Signed (image attached to the email alert)';
    case 'consent':
      return 'Agreed';
    default:
      return str(v);
  }
}

function summarizeFields(fields: Field[], container: Values, scope: Scope, groups: SummaryGroup[], titlePrefix = '') {
  let open: SummaryGroup | undefined;
  const rows = () => {
    if (!open) {
      open = { title: titlePrefix || undefined, rows: [] };
      groups.push(open);
    }
    return open.rows;
  };

  for (const f of fields) {
    if (f.type === 'note' || f.type === 'heading') continue;
    if (!test(f.showIf, scope)) continue;
    const v = container[f.name];

    if (f.type === 'repeater') {
      const count = repeaterCount(f, container, scope);
      const arr = Array.isArray(v) ? (v as Values[]) : [];
      for (let i = 0; i < count; i++) {
        const item = isObj(arr[i]) ? (arr[i] as Values) : {};
        const before = groups.length;
        summarizeFields(f.fields, item, { root: scope.root, item, index: i }, groups, `${f.itemLabel} ${i + 1}`);
        if (groups.length === before) groups.push({ title: `${f.itemLabel} ${i + 1}`, rows: [{ label: 'Details', value: 'Not provided' }] });
      }
      open = undefined;
      continue;
    }

    if (f.type === 'table') {
      const table = (isObj(v) ? v : {}) as TableValue;
      const group: SummaryGroup = { title: f.label, rows: [] };
      for (const row of f.rows) {
        const cells = f.columns
          .filter((c) => isFilled(table[row.key]?.[c.name]))
          .map((c) => `${c.label}: ${formatValue(c, table[row.key][c.name])}`);
        if (cells.length) group.rows.push({ label: row.label, value: cells.join(' | ') });
      }
      if (group.rows.length) {
        groups.push(group);
        open = undefined;
      }
      continue;
    }

    if (f.type === 'percent-group') {
      const g = (isObj(v) ? v : {}) as GroupValue;
      const group: SummaryGroup = { title: f.label, rows: [] };
      for (const item of f.items) {
        const n = parseNumber(g[item.key] ?? '');
        if (n) group.rows.push({ label: item.label, value: `${n}%` });
      }
      if (group.rows.length) {
        groups.push(group);
        open = undefined;
      }
      continue;
    }

    if (!isFilled(v)) continue;
    rows().push({
      label: f.label,
      value: formatValue(f, v),
      ...(f.sensitive ? { sensitive: true } : {}),
      ...(f.type === 'textarea' ? { multiline: true } : {}),
    });
  }
}

export function summarize(form: FormDef, values: Values): SummarySection[] {
  const sections: SummarySection[] = [];
  for (const step of form.steps) {
    const groups: SummaryGroup[] = [];
    summarizeFields(step.fields, values, { root: values }, groups);
    if (groups.length) sections.push({ title: step.title, groups });
  }
  return sections;
}

export const REDACTED = '[withheld: sent in the email alert only]';

/** Plain-text rendering. With `redact`, sensitive answers are replaced by a placeholder. */
export function summaryText(sections: SummarySection[], opts: { redact: boolean }): string {
  const lines: string[] = [];
  for (const section of sections) {
    if (sections.length > 1) lines.push(`== ${section.title} ==`);
    for (const group of section.groups) {
      if (group.title) lines.push(`-- ${group.title} --`);
      for (const row of group.rows) {
        const value = row.sensitive && opts.redact ? REDACTED : row.value;
        lines.push(row.multiline ? `${row.label}:\n${value}` : `${row.label}: ${value}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

// ---------------------------------------------------------------------------
// Contact details and CRM mapping.

export interface Contact {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
}

export function contactOf(form: FormDef, values: Values): Contact {
  const get = (path?: string) => (path ? str(getPath(values, path)) : '');
  let firstName = get(form.contact.firstName);
  let lastName = get(form.contact.lastName);
  if (!firstName && !lastName && form.contact.fullName) {
    const parts = get(form.contact.fullName).split(/\s+/).filter(Boolean);
    firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? '');
    lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  }
  return { email: get(form.contact.email), firstName, lastName, phone: get(form.contact.phone), company: get(form.contact.company) };
}

/** Top-level, non-sensitive answers mapped to HubSpot contact properties. */
export function hubspotFields(form: FormDef, values: Values): { name: string; value: string }[] {
  const out = new Map<string, string>();
  const scope: Scope = { root: values };
  for (const f of allFields(form)) {
    if (f.type === 'note' || f.type === 'heading' || f.type === 'repeater' || f.type === 'table' || f.type === 'percent-group') continue;
    if (!f.hubspot || f.sensitive || !test(f.showIf, scope)) continue;
    const v = values[f.name];
    if (!isFilled(v)) continue;
    out.set(f.hubspot, Array.isArray(v) ? (v as string[]).join(';') : str(v));
  }
  const c = contactOf(form, values);
  if (c.email && !out.has('email')) out.set('email', c.email);
  if (c.firstName && !out.has('firstname')) out.set('firstname', c.firstName);
  if (c.lastName && !out.has('lastname')) out.set('lastname', c.lastName);
  if (c.phone && !out.has('phone')) out.set('phone', c.phone);
  if (c.company && !out.has('company')) out.set('company', c.company);
  return [...out].map(([name, value]) => ({ name, value }));
}
