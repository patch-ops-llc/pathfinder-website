import type { ChoiceField, Condition, Field, HeadingField, NoteField, Width } from '../types.ts';

type Extra<T> = Partial<Omit<T, 'type' | 'name' | 'label'>>;

export const yesNo = (name: string, label: string, extra: Extra<ChoiceField> = {}): ChoiceField => ({
  type: 'radio',
  name,
  label,
  options: ['Yes', 'No'],
  ...extra,
});

export const yesNoMaybe = (name: string, label: string, extra: Extra<ChoiceField> = {}): ChoiceField => ({
  type: 'radio',
  name,
  label,
  options: ['Yes', 'No', 'Maybe'],
  ...extra,
});

export const select = (name: string, label: string, options: string[], extra: Extra<ChoiceField> = {}): ChoiceField => ({
  type: 'select',
  name,
  label,
  options,
  ...extra,
});

export const note = (name: string, text: string, extra: Partial<Omit<NoteField, 'type' | 'name' | 'text'>> = {}): NoteField => ({
  type: 'note',
  name,
  text,
  ...extra,
});

export const heading = (name: string, label: string, extra: Partial<Omit<HeadingField, 'type' | 'name' | 'label'>> = {}): HeadingField => ({
  type: 'heading',
  name,
  label,
  ...extra,
});

export const is = (field: string, equals: string | string[]): Condition => ({ field, equals });

interface AddressOptions {
  prefix: string;
  required?: boolean;
  showIf?: Condition;
  /** Use browser autofill hints. Only appropriate for the person's own address. */
  autofill?: boolean;
  line1Label?: string;
}

export function address({ prefix, required = false, showIf, autofill = false, line1Label = 'Street Address' }: AddressOptions): Field[] {
  const w = (width: Width) => ({ width, ...(showIf ? { showIf } : {}) });
  const ac = (token: string) => (autofill ? { autocomplete: token } : {});
  return [
    { type: 'text', name: `${prefix}Line1`, label: line1Label, required, ...ac('address-line1'), ...w('full') },
    { type: 'text', name: `${prefix}Line2`, label: 'Street Address Line 2', ...ac('address-line2'), ...w('full') },
    { type: 'text', name: `${prefix}City`, label: 'City', required, ...ac('address-level2'), ...w('third') },
    { type: 'state', name: `${prefix}State`, label: 'State', required, ...ac('address-level1'), ...w('third') },
    {
      type: 'text',
      name: `${prefix}Zip`,
      label: 'Zip Code',
      inputMode: 'numeric',
      pattern: '^\\d{5}(-\\d{4})?$',
      patternMessage: 'Enter a 5-digit zip code.',
      maxLength: 10,
      ...ac('postal-code'),
      ...w('third'),
    },
  ];
}

export const SEX = ['Male', 'Female'];
export const CONTACT_METHODS = ['Phone', 'Email'];
export const PAYMENT_METHODS = ['Pay in Full', 'Recurring Credit Card/EFT', 'Bill by Mail'];
export const REFERRAL_SOURCES = ['Client Referral', 'Agent Referral', 'Internet Search', 'Company Referral', 'Other'];

export const CARRIERS = [
  '21st Century',
  'Allied',
  'Allstate County Mutual',
  'Allstate Indemnity',
  'Civil Service',
  'Esurance',
  'Farmers Texas County Mutual',
  'Geico',
  'Hartford',
  'Home State County Mutual',
  'Liberty Mutual',
  'Mid Century Insurance Company',
  'Nationwide',
  'Progressive',
  'Safeco',
  'Southern Farm Bureau',
  'State Farm County Mutual',
  'State Farm Mutual',
  'Travelers',
  'Unigard',
  'USAA',
  'Other',
];

/** "Primary Contact Information" step shared by the home and auto quote forms. */
export function primaryContact(): Field[] {
  return [
    { type: 'text', name: 'firstName', label: 'First Name', required: true, autocomplete: 'given-name', width: 'half', hubspot: 'firstname' },
    { type: 'text', name: 'lastName', label: 'Last Name', required: true, autocomplete: 'family-name', width: 'half', hubspot: 'lastname' },
    { type: 'radio', name: 'sex', label: 'Sex', options: SEX, required: true, columns: 2 },
    ...address({ prefix: 'address', required: true, autofill: true }),
    { type: 'email', name: 'email', label: 'Email', required: true, autocomplete: 'email', width: 'half', hubspot: 'email' },
    { type: 'tel', name: 'phone', label: 'Phone Number', required: true, autocomplete: 'tel', width: 'half', hubspot: 'phone' },
    { type: 'checkbox-group', name: 'preferredContact', label: 'Preferred Contact Method', options: CONTACT_METHODS, required: true, columns: 2 },
    select('preferredPayment', 'Preferred Payment Method', PAYMENT_METHODS, { required: true, width: 'half' }),
    select('referralSource', 'How did you find us?', REFERRAL_SOURCES, { required: true, width: 'half' }),
    { type: 'text', name: 'referralClient', label: 'Client Name', showIf: is('referralSource', 'Client Referral') },
    { type: 'text', name: 'referralAgent', label: 'Agent Name', showIf: is('referralSource', 'Agent Referral') },
    { type: 'text', name: 'referralOther', label: 'Please enter the referral source here.', showIf: is('referralSource', 'Other') },
  ];
}

export const QUOTE_REVIEW_NOTE =
  "If you've verified all information in the previous sections is correct, please click Submit and we'll get in touch ASAP!";
