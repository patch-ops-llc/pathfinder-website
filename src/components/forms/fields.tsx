import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { MAX_FILE_BYTES, UPLOAD_EXTENSIONS, US_STATES } from '../../forms/constants.ts';
import { isRequired, optionLabel, optionValue, parseNumber, repeaterCount, test, type Scope } from '../../forms/logic.ts';
import type { Errors, Field, GroupValue, PercentGroupField, RepeaterField, TableField, TableValue, Value, Values, Width } from '../../forms/types.ts';
import SignaturePad from './SignaturePad.tsx';

export interface FieldContext {
  formId: string;
  errors: Errors;
  /** Values with hidden answers removed; drives visibility. */
  effective: Values;
  today: string;
  set: (path: string, value: Value) => void;
  files: (path: string) => File[];
  setFiles: (path: string, files: File[]) => void;
  addItem: (path: string, field: RepeaterField) => void;
  removeItem: (path: string, index: number) => void;
}

const SPAN: Record<Width, string> = {
  full: 'col-span-12',
  half: 'col-span-12 sm:col-span-6',
  third: 'col-span-12 sm:col-span-6 lg:col-span-4',
};

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 min-[420px]:grid-cols-2',
  3: 'grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3',
};

export const domId = (formId: string, path: string) => `${formId}-${path.replace(/\./g, '-')}`;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p class="field-error" id={id} role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span>{message}</span>
    </p>
  );
}

const RequiredMark = () => (
  <span class="text-red-600" aria-hidden="true">
    {' '}
    *
  </span>
);

const EMAIL_OR_PHONE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\(\d{3}\) \d{3}-\d{4})/g;

/** Turns email addresses and phone numbers inside guidance text into links. */
function linkify(text: string): ComponentChildren[] {
  return text.split(EMAIL_OR_PHONE).map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.includes('@') ? `mailto:${part}` : `tel:+1${part.replace(/\D/g, '')}`;
    return (
      <a href={href} class="text-brand-700 font-semibold underline underline-offset-2">
        {part}
      </a>
    );
  });
}

function Paragraphs({ text, class: className }: { text: string; class?: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p) => (
        <p class={className}>{linkify(p)}</p>
      ))}
    </>
  );
}

interface ViewProps {
  field: Field;
  path: string;
  container: Values;
  scope: Scope;
  ctx: FieldContext;
}

export function FieldList({ fields, prefix, container, scope, ctx }: { fields: Field[]; prefix: string; container: Values; scope: Scope; ctx: FieldContext }) {
  return (
    <div class="grid grid-cols-12 gap-x-5 gap-y-6">
      {fields.map((f) => (test(f.showIf, scope) ? <FieldView key={f.name} field={f} path={prefix + f.name} container={container} scope={scope} ctx={ctx} /> : null))}
    </div>
  );
}

function FieldView({ field: f, path, container, scope, ctx }: ViewProps) {
  const id = domId(ctx.formId, path);
  const span = SPAN[('width' in f && f.width) || 'full'];

  if (f.type === 'heading') {
    return (
      <div class="col-span-12 border-t border-slate-200 pt-6">
        <h3 class="text-lg">{f.label}</h3>
        {f.text && <p class="mt-1 text-sm text-slate-600">{f.text}</p>}
      </div>
    );
  }

  if (f.type === 'note') {
    const tone = f.tone ?? 'info';
    if (tone === 'plain') {
      return (
        <div class={`${span} space-y-3 text-sm leading-6 text-slate-700`}>
          <Paragraphs text={f.text ?? ''} />
        </div>
      );
    }
    const palette = tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-brand-200 bg-brand-50 text-brand-950';
    return (
      <div class={`${span} space-y-2 rounded-xl border px-4 py-3.5 text-sm leading-6 ${palette}`} role="note">
        <Paragraphs text={f.text ?? ''} />
      </div>
    );
  }

  if (f.type === 'repeater') return <RepeaterView field={f} path={path} container={container} scope={scope} ctx={ctx} />;
  if (f.type === 'table') return <TableView field={f} path={path} value={container[f.name]} ctx={ctx} />;
  if (f.type === 'percent-group') return <PercentGroupView field={f} path={path} value={container[f.name]} required={isRequired(f, scope)} ctx={ctx} />;

  const value = container[f.name];
  const error = ctx.errors[path];
  const required = isRequired(f, scope);
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [error ? errorId : '', f.help ? helpId : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name: path,
    'aria-invalid': error ? ('true' as const) : undefined,
    'aria-describedby': describedBy,
    'aria-required': required ? ('true' as const) : undefined,
  };
  const onText = (e: Event) => ctx.set(path, (e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
  const help = f.help ? (
    <p class="field-help" id={helpId}>
      {f.help}
    </p>
  ) : null;
  const label = (
    <label class="field-label" for={id}>
      {f.label}
      {required && <RequiredMark />}
    </label>
  );

  switch (f.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'secret':
      return (
        <div class={span}>
          {label}
          <input
            {...common}
            class="field-input"
            type={(f.type === 'secret' ? 'password' : f.type) as 'text'}
            value={str(value)}
            maxLength={f.maxLength ?? 200}
            placeholder={f.placeholder}
            autocomplete={f.type === 'secret' ? 'off' : f.autocomplete}
            inputMode={f.inputMode ?? (f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : undefined)}
            autocapitalize={f.type === 'email' ? 'off' : undefined}
            spellcheck={f.type === 'email' || f.type === 'secret' ? false : undefined}
            onInput={onText}
          />
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'textarea':
      return (
        <div class={span}>
          {label}
          <textarea {...common} class="field-input" rows={f.rows ?? 4} maxLength={f.maxLength ?? 5000} placeholder={f.placeholder} value={str(value)} onInput={onText} />
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'number':
    case 'currency':
    case 'percent':
      return (
        <div class={span}>
          {label}
          <div class="relative">
            {f.type === 'currency' && <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">$</span>}
            <input
              {...common}
              class={`field-input ${f.type === 'currency' ? 'pl-8' : ''} ${f.type === 'percent' ? 'pr-10' : ''}`}
              type="text"
              inputMode="decimal"
              maxLength={20}
              placeholder={f.placeholder}
              value={str(value)}
              onInput={onText}
            />
            {f.type === 'percent' && <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">%</span>}
          </div>
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'date':
      return (
        <div class={span}>
          {label}
          <input
            {...common}
            class="field-input"
            type="date"
            value={str(value)}
            min={f.range === 'future' ? ctx.today : '1900-01-01'}
            max={f.range === 'past' ? ctx.today : '2100-12-31'}
            autocomplete={f.autocomplete}
            onInput={onText}
          />
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'select':
    case 'state':
      return (
        <div class={span}>
          {label}
          <select {...common} class="field-input" value={str(value)} autocomplete={f.autocomplete} onChange={onText}>
            <option value="">{(f.type === 'select' && f.placeholder) || 'Please select'}</option>
            {f.type === 'state'
              ? US_STATES.map(([code, name]) => <option value={code}>{name}</option>)
              : f.options.map((o) => <option value={optionValue(o)}>{optionLabel(o)}</option>)}
          </select>
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'radio':
    case 'checkbox-group': {
      const multi = f.type === 'checkbox-group';
      const selected = multi ? ((Array.isArray(value) ? value : []) as string[]) : [str(value)];
      const toggle = (v: string) => {
        if (!multi) return ctx.set(path, v);
        const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
        ctx.set(path, next.length ? next : undefined);
      };
      return (
        <fieldset class={`${span} min-w-0`} id={id} aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined}>
          <legend class="field-label">
            {f.label}
            {required && <RequiredMark />}
          </legend>
          <div class={`grid gap-2.5 ${COLS[f.columns ?? 1]}`}>
            {f.options.map((o, i) => {
              const v = optionValue(o);
              return (
                <label class="choice">
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={path}
                    id={`${id}-${i}`}
                    value={v}
                    checked={selected.includes(v)}
                    required={!multi && required}
                    onChange={() => toggle(v)}
                  />
                  <span>{optionLabel(o)}</span>
                </label>
              );
            })}
          </div>
          {help}
          <ErrorText id={errorId} message={error} />
        </fieldset>
      );
    }

    case 'consent':
      return (
        <div class={span}>
          <p class="field-label" id={`${id}-title`}>
            {f.label}
            {required && <RequiredMark />}
          </p>
          {f.text && (
            <div
              class="mb-3 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              tabindex={0}
              role="region"
              aria-labelledby={`${id}-title`}
            >
              <Paragraphs text={f.text} />
            </div>
          )}
          <label class="choice">
            <input type="checkbox" {...common} checked={value === 'yes'} onChange={(e) => ctx.set(path, (e.currentTarget as HTMLInputElement).checked ? 'yes' : undefined)} />
            <span>{f.checkboxLabel}</span>
          </label>
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'signature':
      return (
        <div class={span}>
          <p class="field-label" id={`${id}-label`}>
            {f.label}
            {required && <RequiredMark />}
          </p>
          <div class="max-w-xl">
            <SignaturePad id={id} value={str(value)} invalid={!!error} describedBy={describedBy} onChange={(v) => ctx.set(path, v || undefined)} />
          </div>
          {help}
          <ErrorText id={errorId} message={error} />
        </div>
      );

    case 'file':
      return (
        <div class={span}>
          <FileInput
            id={id}
            label={f.label}
            required={required}
            help={f.help}
            helpId={helpId}
            error={error}
            errorId={errorId}
            maxFiles={f.maxFiles ?? 1}
            extensions={f.extensions ?? [...UPLOAD_EXTENSIONS]}
            files={ctx.files(path)}
            onFiles={(files) => ctx.setFiles(path, files)}
          />
        </div>
      );
  }
}

interface FileInputProps {
  id: string;
  label: string;
  required: boolean;
  help?: string;
  helpId: string;
  error?: string;
  errorId: string;
  maxFiles: number;
  extensions: string[];
  files: File[];
  onFiles: (files: File[]) => void;
}

function formatBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function FileInput({ id, label, required, help, helpId, error, errorId, maxFiles, extensions, files, onFiles }: FileInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const next = maxFiles === 1 ? Array.from(list).slice(0, 1) : [...files, ...Array.from(list)];
    onFiles(next);
    if (input.current) input.current.value = '';
  };
  const describedBy = [error ? errorId : '', helpId].join(' ').trim();
  return (
    <div>
      <label class="field-label" for={id}>
        {label}
        {required && <RequiredMark />}
      </label>
      <label
        for={id}
        class={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          over ? 'border-brand-500 bg-brand-50' : error ? 'border-red-400 bg-red-50/40' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
        } focus-within:outline-brand-500 focus-within:outline-2 focus-within:outline-offset-2`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer?.files ?? null);
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-brand-600" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <span class="text-ink text-sm font-semibold">
          <span class="text-brand-700 underline underline-offset-2">Choose {maxFiles === 1 ? 'a file' : 'files'}</span> or drag {maxFiles === 1 ? 'it' : 'them'} here
        </span>
        <span class="text-xs text-slate-500">
          {extensions.map((e) => e.toUpperCase()).join(', ')}. Up to {MAX_FILE_BYTES / 1024 / 1024} MB{maxFiles > 1 ? ` each, ${maxFiles} files max` : ''}.
        </span>
        <input
          ref={input}
          id={id}
          type="file"
          class="sr-only"
          multiple={maxFiles > 1}
          accept={extensions.map((e) => `.${e}`).join(',')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required ? 'true' : undefined}
          onChange={(e) => add((e.currentTarget as HTMLInputElement).files)}
        />
      </label>
      <p class="field-help" id={helpId}>
        {help ? `${help} ` : ''}Files are sent securely to our team and are not stored on this website.
      </p>
      {files.length > 0 && (
        <ul class="mt-3 space-y-2">
          {files.map((file, i) => (
            <li class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
              <span class="min-w-0">
                <span class="text-ink block truncate font-medium">{file.name}</span>
                <span class="text-xs text-slate-500">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                class="text-brand-700 min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold hover:underline"
                onClick={() => onFiles(files.filter((_, j) => j !== i))}
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorText id={errorId} message={error} />
    </div>
  );
}

function RepeaterView({ field: f, path, container, scope, ctx }: { field: RepeaterField; path: string; container: Values; scope: Scope; ctx: FieldContext }) {
  const count = repeaterCount(f, container, scope);
  const items = (Array.isArray(container[f.name]) ? container[f.name] : []) as Values[];
  const manual = !f.countFrom;
  if (count === 0) return null;
  return (
    <div class="col-span-12 space-y-5">
      {Array.from({ length: count }, (_, i) => {
        const item = items[i] ?? {};
        return (
          <fieldset key={i} class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6">
            <legend class="float-left mb-5 flex w-full items-center justify-between gap-3">
              <span class="text-ink flex items-center gap-2.5 text-base font-bold">
                <span class="bg-brand-700 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white">{i + 1}</span>
                {f.itemLabel} {i + 1}
              </span>
              {manual && count > f.min && (
                <button
                  type="button"
                  class="min-h-9 rounded-full px-3 text-xs font-semibold text-red-700 hover:underline"
                  onClick={() => ctx.removeItem(path, i)}
                  aria-label={`Remove ${f.itemLabel} ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </legend>
            <div class="clear-both">
              <FieldList fields={f.fields} prefix={`${path}.${i}.`} container={item} scope={{ root: scope.root, item, index: i }} ctx={ctx} />
            </div>
          </fieldset>
        );
      })}
      {manual && count < f.max && (
        <button type="button" class="btn btn-outline min-h-11 px-5 py-2" onClick={() => ctx.addItem(path, f)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          {f.addLabel ?? `Add another ${f.itemLabel.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}

function TableView({ field: f, path, value, ctx }: { field: TableField; path: string; value: Value; ctx: FieldContext }) {
  const table = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as TableValue;
  const id = domId(ctx.formId, path);
  const cols = f.columns.length;
  const grid = cols >= 4 ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2';
  return (
    <div class="col-span-12" role="group" aria-labelledby={`${id}-label`}>
      <p class="field-label" id={`${id}-label`}>
        {f.label}
        {f.required && <RequiredMark />}
      </p>
      {f.help && <p class="field-help mt-0 mb-3">{f.help}</p>}
      <div class="space-y-3">
        {f.rows.map((row) => (
          <fieldset class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <legend class="text-brand-800 float-left mb-3 w-full text-xs font-bold tracking-[0.14em] uppercase">{row.label}</legend>
            <div class={`clear-both grid grid-cols-1 gap-3 ${grid}`}>
              {f.columns.map((col) => {
                const cellPath = `${path}.${row.key}.${col.name}`;
                const cellId = domId(ctx.formId, cellPath);
                const error = ctx.errors[cellPath];
                return (
                  <div>
                    <label for={cellId} class="mb-1 block text-xs font-semibold text-slate-600">
                      {col.label}
                    </label>
                    <input
                      id={cellId}
                      name={cellPath}
                      class="field-input min-h-11 px-3 py-2 text-sm"
                      type={(col.type === 'date' ? 'date' : 'text') as 'text'}
                      inputMode={col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'decimal' : undefined}
                      maxLength={'maxLength' in col ? (col.maxLength ?? 200) : 40}
                      value={table[row.key]?.[col.name] ?? ''}
                      aria-invalid={error ? 'true' : undefined}
                      aria-describedby={error ? `${cellId}-error` : undefined}
                      onInput={(e) => ctx.set(cellPath, (e.currentTarget as HTMLInputElement).value)}
                    />
                    <ErrorText id={`${cellId}-error`} message={error} />
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function PercentGroupView({ field: f, path, value, required, ctx }: { field: PercentGroupField; path: string; value: Value; required: boolean; ctx: FieldContext }) {
  const group = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as GroupValue;
  const id = domId(ctx.formId, path);
  const total = f.items.reduce((sum, item) => sum + (parseNumber(group[item.key] ?? '') ?? 0), 0);
  const done = total === f.total;
  const error = ctx.errors[path];
  return (
    <div class="col-span-12" role="group" aria-labelledby={`${id}-label`} id={id} aria-describedby={error ? `${id}-error` : undefined}>
      <p class="field-label" id={`${id}-label`}>
        {f.label}
        {required && <RequiredMark />}
      </p>
      <ul class="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        {f.items.map((item) => {
          const itemPath = `${path}.${item.key}`;
          const itemId = domId(ctx.formId, itemPath);
          const itemError = ctx.errors[itemPath];
          return (
            <li class="border-b border-slate-200 py-2.5">
              <div class="flex items-center justify-between gap-4">
                <label for={itemId} class="text-ink text-sm font-medium">
                  {item.label}
                </label>
                <div class="relative w-24 shrink-0">
                  <input
                    id={itemId}
                    name={itemPath}
                    class="field-input min-h-11 py-2 pr-8 pl-3 text-right text-sm tabular-nums"
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="0"
                    value={group[item.key] ?? ''}
                    aria-invalid={itemError ? 'true' : undefined}
                    aria-describedby={itemError ? `${itemId}-error` : undefined}
                    onInput={(e) => ctx.set(itemPath, (e.currentTarget as HTMLInputElement).value.replace(/[^\d]/g, ''))}
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                </div>
              </div>
              <ErrorText id={`${itemId}-error`} message={itemError} />
            </li>
          );
        })}
      </ul>
      <div
        class={`sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
          done ? 'border-emerald-300 bg-emerald-50/95 text-emerald-900' : 'border-brand-200 text-brand-950 bg-white/95'
        }`}
        aria-live="polite"
      >
        <span>Total</span>
        <span class="tabular-nums">
          {total}% of {f.total}%{done ? ' ✓' : ''}
        </span>
      </div>
      <ErrorText id={`${id}-error`} message={error} />
    </div>
  );
}
