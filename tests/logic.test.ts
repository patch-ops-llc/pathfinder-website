import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoQuote } from '../src/forms/defs/auto-quote.ts';
import { careers } from '../src/forms/defs/careers.ts';
import { checkDraft } from '../src/forms/defs/check-draft.ts';
import { homeQuote } from '../src/forms/defs/home-quote.ts';
import { leadEnergy, leadHomeAuto } from '../src/forms/defs/leads.ts';
import { professionalLiabilityQuote } from '../src/forms/defs/professional-liability-quote.ts';
import { clean, contactOf, hubspotFields, parseNumber, REDACTED, summarize, summaryText, test as cond, validate } from '../src/forms/logic.ts';
import { forms } from '../src/forms/registry.ts';
import type { Field, FormDef, Values } from '../src/forms/types.ts';

const lead: Values = { firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', company: 'Analytical Engines', numemployees: '5-25', phone: '281-555-0100' };

test('conditions', () => {
  const scope = { root: { a: 'Yes', list: ['x', 'y'], n: '3' } as Values };
  assert.equal(cond(undefined, scope), true);
  assert.equal(cond({ field: 'a', equals: 'Yes' }, scope), true);
  assert.equal(cond({ field: 'a', equals: ['No', 'Maybe'] }, scope), false);
  assert.equal(cond({ field: 'a', notEquals: 'No' }, scope), true);
  assert.equal(cond({ field: 'list', includes: 'y' }, scope), true);
  assert.equal(cond({ field: 'n', gte: 2 }, scope), true);
  assert.equal(cond({ field: 'n', gte: 4 }, scope), false);
  assert.equal(cond({ field: 'missing', filled: true }, scope), false);
  assert.equal(cond({ any: [{ field: 'a', equals: 'No' }, { field: 'n', gte: 1 }] }, scope), true);
  assert.equal(cond({ all: [{ field: 'a', equals: 'Yes' }, { field: 'n', gte: 9 }] }, scope), false);
});

test('parseNumber accepts formatted money and rejects junk', () => {
  assert.equal(parseNumber('$1,250.50'), 1250.5);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(''), null);
});

test('every form has unique ids, an env key and reachable contact fields', () => {
  const ids = new Set<string>();
  const envKeys = new Set<string>();
  const names = (fields: Field[]): string[] => fields.flatMap((f) => (f.type === 'repeater' ? [f.name] : [f.name]));
  for (const form of forms) {
    assert.ok(!ids.has(form.id), `duplicate form id ${form.id}`);
    assert.ok(!envKeys.has(form.envKey), `duplicate env key ${form.envKey}`);
    ids.add(form.id);
    envKeys.add(form.envKey);
    assert.match(form.envKey, /^[A-Z_]+$/);
    const top = new Set(form.steps.flatMap((s) => names(s.fields)));
    assert.equal(top.size, form.steps.flatMap((s) => s.fields).length, `${form.id}: duplicate field names`);
    for (const [role, field] of Object.entries(form.contact)) {
      if (field) assert.ok(top.has(field), `${form.id}: contact.${role} points at unknown field ${field}`);
    }
  }
  assert.equal(forms.length, 14);
});

test('lead form: valid submission passes, required and format errors are reported', () => {
  assert.deepEqual(validate(leadEnergy, clean(leadEnergy, lead)), {});
  const errors = validate(leadEnergy, clean(leadEnergy, { ...lead, firstname: '  ', email: 'not-an-email', phone: '12' }));
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'firstname', 'phone']);
});

test('clean drops unknown keys and wrong types; options that are not offered fail validation', () => {
  const values = clean(leadEnergy, { ...lead, numemployees: 'a million', extra: 'x', company: { evil: true }, __proto__: { polluted: true } });
  assert.equal(values.extra, undefined);
  assert.equal(values.company, undefined);
  assert.deepEqual(Object.keys(validate(leadEnergy, values)).sort(), ['company', 'numemployees']);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.deepEqual(clean(leadEnergy, 'nonsense'), {});
  assert.deepEqual(clean(leadEnergy, null), {});
});

test('clean truncates over-long text instead of trusting the client', () => {
  const values = clean(leadEnergy, { ...lead, firstname: 'x'.repeat(5000) });
  assert.ok((values.firstname as string).length <= 200);
});

test('hidden answers are pruned so they are never delivered', () => {
  const base = clean(homeQuote, { currentlyInsured: 'No', currentProvider: 'Allstate', policyExpiration: '2027-01-01' });
  assert.equal(base.currentProvider, undefined, 'provider is only kept when currently insured');
  assert.equal(base.policyExpiration, undefined);
});

test('auto quote: driver and vehicle blocks follow the selected counts', () => {
  const values = clean(autoQuote, { driverCount: '2', vehicleCount: '1' });
  const errors = validate(autoQuote, values);
  const driverErrors = Object.keys(errors).filter((k) => k.startsWith('drivers.'));
  assert.ok(driverErrors.some((k) => k.startsWith('drivers.0.')));
  assert.ok(driverErrors.some((k) => k.startsWith('drivers.1.')));
  assert.ok(!driverErrors.some((k) => k.startsWith('drivers.2.')));
  assert.ok(Object.keys(errors).some((k) => k.startsWith('vehicles.0.')));
  assert.ok(!Object.keys(errors).some((k) => k.startsWith('vehicles.1.')));
});

test('per-step validation only reports the current step', () => {
  const all = validate(autoQuote, {});
  const first = validate(autoQuote, {}, { step: 0 });
  assert.ok(Object.keys(first).length > 0);
  assert.ok(Object.keys(first).length < Object.keys(all).length);
});

test('professional liability: practice areas must total 100%', () => {
  const field = professionalLiabilityQuote.steps.flatMap((s) => s.fields).find((f) => f.type === 'percent-group');
  assert.ok(field && field.type === 'percent-group');
  const [a, b] = field.items;
  const short = validate(professionalLiabilityQuote, clean(professionalLiabilityQuote, { [field.name]: { [a.key]: '40', [b.key]: '30' } }));
  assert.ok(short[field.name], 'a 70% total is rejected');
  const exact = validate(professionalLiabilityQuote, clean(professionalLiabilityQuote, { [field.name]: { [a.key]: '40', [b.key]: '60' } }));
  assert.equal(exact[field.name], undefined);
});

test('dates: impossible and out-of-range dates are rejected', () => {
  const values = clean(checkDraft, { date: '2026-02-31' });
  assert.ok(validate(checkDraft, values).date);
});

test('careers form never asks for a Social Security number by default', () => {
  const walk = (fields: Field[]): Field[] => fields.flatMap((f) => (f.type === 'repeater' ? [f, ...walk(f.fields)] : [f]));
  const all = walk(careers.steps.flatMap((s) => s.fields));
  assert.ok(!all.some((f) => /ssn|social/i.test(f.name)), 'SSN field is present');
});

const checkValues = (): Values => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  phone: '281-555-0101',
  policyNumber: 'POL-778899',
  checkNumber: '1042',
  paymentAmount: '1250.00',
  checkImage: [{ name: 'check.png', size: 1200 }],
  signature: 'data:image/png;base64,iVBORw0KGgo=',
  date: new Date().toISOString().slice(0, 10),
});

test('sensitive answers are redacted from the HubSpot summary but present for email', () => {
  const values = clean(checkDraft, checkValues());
  const sections = summarize(checkDraft, values);
  const forEmail = summaryText(sections, { redact: false });
  const forCrm = summaryText(sections, { redact: true });
  assert.match(forEmail, /check\.png/);
  assert.doesNotMatch(forCrm, /check\.png/);
  assert.ok(forCrm.includes(REDACTED));
  assert.match(forCrm, /POL-778899/);
  assert.doesNotMatch(forCrm, /iVBORw0KGgo/);
  assert.doesNotMatch(forEmail, /iVBORw0KGgo/, 'signature image data never appears in text');
});

test('hubspotFields maps contact properties and leaves sensitive fields out', () => {
  const fields = hubspotFields(checkDraft, clean(checkDraft, checkValues()));
  const byName = Object.fromEntries(fields.map((f) => [f.name, f.value]));
  assert.equal(byName.email, 'grace@example.com');
  assert.equal(byName.firstname, 'Grace');
  assert.equal(byName.lastname, 'Hopper');
  assert.ok(!fields.some((f) => /check\.png|iVBOR/.test(f.value)));

  const leadFields = Object.fromEntries(hubspotFields(leadEnergy, clean(leadEnergy, lead)).map((f) => [f.name, f.value]));
  assert.deepEqual(leadFields, { firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', company: 'Analytical Engines', numemployees: '5-25', phone: '281-555-0100' });
});

test('contactOf reads the fields each form declares', () => {
  const c = contactOf(leadHomeAuto, clean(leadHomeAuto, lead));
  assert.deepEqual(c, { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', phone: '281-555-0100', company: '' });
});

test('form definitions are JSON-serialisable (they are sent to the browser)', () => {
  for (const form of forms) {
    const copy = JSON.parse(JSON.stringify(form)) as FormDef;
    assert.deepEqual(copy, form);
  }
});
