import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { HONEYPOT_FIELD } from '../../forms/constants.ts';
import { getPath, prune, setPath, validate, visitInputs } from '../../forms/logic.ts';
import type { Errors, FileRef, FormDef, RepeaterField, Value, Values } from '../../forms/types.ts';
import { FieldList, domId, type FieldContext } from './fields.tsx';

interface Props {
  form: FormDef;
  phone: string;
  phoneHref: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

const draftKey = (id: string) => `pf-draft:${id}`;

/** Values that are safe to keep in sessionStorage: no sensitive answers, signatures or uploads. */
function draftable(form: FormDef, values: Values): Values {
  let out = values;
  visitInputs(form, values, (f, _v, path) => {
    if (f.type === 'file' || f.type === 'signature' || f.type === 'secret' || ('sensitive' in f && f.sensitive)) out = setPath(out, path, undefined);
  });
  return out;
}

function initialValues(form: FormDef): Values {
  const values: Values = {};
  for (const step of form.steps) {
    for (const f of step.fields) {
      if (f.type === 'repeater' && !f.countFrom) values[f.name] = Array.from({ length: f.min }, () => ({}));
    }
  }
  return values;
}

export default function FormRenderer({ form, phone, phoneHref }: Props) {
  const [values, setValues] = useState<Values>(() => initialValues(form));
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileKey, setTurnstileKey] = useState('');
  const [, bump] = useState(0);

  const files = useRef(new Map<string, File[]>());
  const token = useRef<Promise<string> | null>(null);
  const turnstileToken = useRef('');
  const turnstileEl = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusError = useRef(false);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const effective = useMemo(() => prune(form, values), [form, values]);
  const multi = form.steps.length > 1;
  const last = step === form.steps.length - 1;

  const loadToken = () => {
    token.current = fetch('/api/forms/token/', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('token'))))
      .then((data: { token: string; turnstileSiteKey?: string }) => {
        if (data.turnstileSiteKey) setTurnstileKey(data.turnstileSiteKey);
        return data.token;
      })
      .catch(() => '');
  };

  useEffect(() => {
    setHydrated(true);
    loadToken();
    if (!form.draft) return;
    try {
      const saved = sessionStorage.getItem(draftKey(form.id));
      if (saved) {
        const parsed = JSON.parse(saved) as { values: Values; step: number };
        if (parsed && typeof parsed.values === 'object') {
          setValues({ ...initialValues(form), ...parsed.values });
          setStep(Math.min(Math.max(0, parsed.step | 0), form.steps.length - 1));
          setRestored(true);
        }
      }
    } catch {
      /* Storage unavailable: carry on without a draft. */
    }
  }, []);

  useEffect(() => {
    if (!form.draft || !hydrated || status === 'success') return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(draftKey(form.id), JSON.stringify({ values: draftable(form, values), step }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [values, step, hydrated, status]);

  useEffect(() => {
    if (!turnstileKey || !turnstileEl.current) return;
    const render = () => {
      if (!window.turnstile || !turnstileEl.current || turnstileEl.current.childElementCount) return;
      window.turnstile.render(turnstileEl.current, {
        sitekey: turnstileKey,
        callback: (t: string) => (turnstileToken.current = t),
        'expired-callback': () => (turnstileToken.current = ''),
      });
    };
    if (window.turnstile) return render();
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [turnstileKey, last]);

  useEffect(() => {
    if (!focusError.current) return;
    focusError.current = false;
    const el = root.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    const target = el.matches('fieldset, div') ? (el.querySelector<HTMLElement>('input, select, textarea, canvas') ?? el) : el;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.focus({ preventScroll: true });
  });

  const clearError = (path: string) =>
    setErrors((prev) => {
      const parent = path.split('.').slice(0, -1).join('.');
      if (!(path in prev) && !(parent in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      if (parent) delete next[parent];
      return next;
    });

  const ctx: FieldContext = {
    formId: form.id,
    errors,
    effective,
    today,
    set: (path, value) => {
      setValues((prev) => setPath(prev, path, value));
      clearError(path);
    },
    files: (path) => files.current.get(path) ?? [],
    setFiles: (path, list) => {
      if (list.length) files.current.set(path, list);
      else files.current.delete(path);
      const refs: FileRef[] = list.map((f) => ({ name: f.name, size: f.size }));
      setValues((prev) => setPath(prev, path, refs.length ? refs : undefined));
      clearError(path);
      bump((n) => n + 1);
    },
    addItem: (path, field: RepeaterField) =>
      setValues((prev) => {
        const current = (getPath(prev, path) as Values[] | undefined) ?? [];
        const padded = current.length < field.min ? [...current, ...Array.from({ length: field.min - current.length }, () => ({}))] : current;
        return padded.length >= field.max ? prev : setPath(prev, path, [...padded, {}] as Value);
      }),
    removeItem: (path, index) => {
      setValues((prev) => {
        const current = ((getPath(prev, path) as Values[] | undefined) ?? []).slice();
        current.splice(index, 1);
        return setPath(prev, path, current as Value);
      });
      // Uploads inside later items would shift position, so drop uploads held under this list.
      for (const key of [...files.current.keys()]) if (key.startsWith(`${path}.`)) files.current.delete(key);
      setErrors({});
    },
  };

  const scrollToTop = () => root.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  const stepOfPath = (path: string) => {
    const name = path.split('.')[0];
    const i = form.steps.findIndex((s) => s.fields.some((f) => f.name === name));
    return i < 0 ? 0 : i;
  };

  const showErrors = (errs: Errors) => {
    setErrors(errs);
    const first = Math.min(...Object.keys(errs).map(stepOfPath));
    if (Number.isFinite(first) && first !== step) setStep(first);
    focusError.current = true;
  };

  const goNext = () => {
    const errs = validate(form, effective, { step, today });
    if (Object.keys(errs).length) return showErrors(errs);
    setErrors({});
    setStep(step + 1);
    scrollToTop();
  };

  const goBack = () => {
    setErrors({});
    setStep(Math.max(0, step - 1));
    scrollToTop();
  };

  const startOver = () => {
    try {
      sessionStorage.removeItem(draftKey(form.id));
    } catch {
      /* ignore */
    }
    files.current.clear();
    setValues(initialValues(form));
    setErrors({});
    setStep(0);
    setRestored(false);
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (status === 'submitting') return;
    if (!last) return goNext();

    const errs = validate(form, effective, { today });
    if (Object.keys(errs).length) return showErrors(errs);

    setStatus('submitting');
    setMessage('');
    try {
      if (!token.current) loadToken();
      const body = new FormData();
      body.append(
        'payload',
        JSON.stringify({
          values: effective,
          token: await token.current,
          [HONEYPOT_FIELD]: honeypot,
          turnstileToken: turnstileToken.current,
          page: location.href,
        }),
      );
      visitInputs(form, effective, (f, _v, path) => {
        if (f.type !== 'file') return;
        for (const file of files.current.get(path) ?? []) body.append(`file:${path}`, file, file.name);
      });

      const res = await fetch(`/api/forms/${form.id}/`, { method: 'POST', body, headers: { Accept: 'application/json' } });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Errors; message?: string };

      if (res.ok && data.ok) {
        try {
          sessionStorage.removeItem(draftKey(form.id));
        } catch {
          /* ignore */
        }
        setStatus('success');
        requestAnimationFrame(() => {
          root.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          root.current?.querySelector<HTMLElement>('[data-success]')?.focus({ preventScroll: true });
        });
        return;
      }
      if (res.status === 422 && data.errors && Object.keys(data.errors).length) {
        setStatus('idle');
        showErrors(data.errors);
        return;
      }
      if (res.status === 403 || res.status === 400) loadToken();
      if (window.turnstile && turnstileKey) {
        window.turnstile.reset();
        turnstileToken.current = '';
      }
      setStatus('error');
      setMessage(data.message ?? '');
    } catch {
      setStatus('error');
      setMessage('');
    }
  };

  if (status === 'success') {
    return (
      <div ref={root}>
        <div data-success tabindex={-1} role="status" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center outline-none">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h3 class="mt-5 text-xl sm:text-2xl">{form.success.title}</h3>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-700">{form.success.message}</p>
        </div>
      </div>
    );
  }

  const current = form.steps[step];
  const errorCount = Object.keys(errors).length;
  const progress = Math.round(((step + 1) / form.steps.length) * 100);

  return (
    <div ref={root} class="scroll-mt-28">
      <form onSubmit={submit} noValidate aria-label={form.name} data-form={form.id} data-hydrated={hydrated ? '' : undefined}>
        {multi && (
          <div class="mb-8">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-brand-700 text-xs font-bold tracking-[0.16em] uppercase">
                  Step {step + 1} of {form.steps.length}
                </p>
                <h2 class="mt-1 text-xl sm:text-2xl" id={`${form.id}-step-title`}>
                  {current.title}
                </h2>
              </div>
              <span class="text-sm font-semibold text-slate-500 tabular-nums">{progress}%</span>
            </div>
            <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Form progress">
              <div class="from-brand-700 to-glow h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
            {current.description && <p class="mt-4 text-sm text-slate-600">{current.description}</p>}
          </div>
        )}

        {restored && (
          <div class="border-brand-200 bg-brand-50 text-brand-950 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
            <span>We restored the answers you entered earlier in this browser tab.</span>
            <button type="button" class="text-brand-700 min-h-9 font-semibold underline underline-offset-2" onClick={startOver}>
              Start over
            </button>
          </div>
        )}

        {errorCount > 0 && (
          <div class="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            {errorCount === 1 ? 'Please check the highlighted field.' : `Please check the ${errorCount} highlighted fields.`}
          </div>
        )}

        <FieldList key={current.id} fields={current.fields} prefix="" container={values} scope={{ root: effective }} ctx={ctx} />

        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label for={domId(form.id, HONEYPOT_FIELD)}>Leave this field empty</label>
          <input
            id={domId(form.id, HONEYPOT_FIELD)}
            type="text"
            name={HONEYPOT_FIELD}
            tabindex={-1}
            autocomplete="off"
            value={honeypot}
            onInput={(e) => setHoneypot((e.currentTarget as HTMLInputElement).value)}
          />
        </div>

        {last && turnstileKey && <div ref={turnstileEl} class="mt-6" />}

        {status === 'error' && (
          <div class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <strong class="font-semibold">We could not send your form.</strong>{' '}
            {message || 'Please try again in a moment.'} If the problem continues, call us at{' '}
            <a href={phoneHref} class="font-semibold underline underline-offset-2">
              {phone}
            </a>
            .
          </div>
        )}

        <div class={`mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${multi ? 'sm:justify-between' : ''}`}>
          {multi &&
            (step > 0 ? (
              <button type="button" class="btn btn-outline" onClick={goBack}>
                Back
              </button>
            ) : (
              <span />
            ))}
          <button type="submit" class={`btn btn-primary ${multi ? 'sm:min-w-40' : 'w-full sm:w-auto sm:min-w-44'}`} disabled={status === 'submitting'}>
            {status === 'submitting' ? (
              <>
                <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Sending…
              </>
            ) : last ? (
              <>
                {form.submitLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            ) : (
              <>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
        <p class="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
            <rect width="18" height="11" x="3" y="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Sent over an encrypted connection directly to the Pathfinder/LL&amp;D team.
        </p>
      </form>
    </div>
  );
}
