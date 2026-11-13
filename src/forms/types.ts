// Declarative form schema. Definitions are plain JSON-serialisable data so the
// same object drives the browser renderer, client and server validation, the
// email alert layout and the HubSpot field mapping.

export type Condition =
  | { field: string; equals: string | string[] }
  | { field: string; notEquals: string }
  | { field: string; includes: string }
  | { field: string; gte: number }
  | { field: string; filled: true }
  /** Repeater item position, zero based. */
  | { index: number[] }
  | { notIndex: number[] }
  | { any: Condition[] }
  | { all: Condition[] };

export type Width = 'full' | 'half' | 'third';

interface BaseField {
  /** Key in the submitted values. Unique within its step list or repeater. */
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Required only while this condition holds. */
  requiredIf?: Condition;
  /** Field is rendered, validated and submitted only while this holds. */
  showIf?: Condition;
  width?: Width;
  /**
   * Sensitive values are delivered in the email alert only. They are never
   * sent to HubSpot or the webhook, never logged and never kept in the
   * browser draft.
   */
  sensitive?: boolean;
  /** HubSpot contact property this field maps to. */
  hubspot?: string;
}

export interface TextField extends BaseField {
  type: 'text' | 'email' | 'tel' | 'textarea' | 'secret';
  placeholder?: string;
  autocomplete?: string;
  maxLength?: number;
  minLength?: number;
  /** Regular expression source the value must match. */
  pattern?: string;
  patternMessage?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
  rows?: number;
}

export interface NumberField extends BaseField {
  type: 'number' | 'currency' | 'percent';
  placeholder?: string;
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface Option {
  value: string;
  label?: string;
}

export interface ChoiceField extends BaseField {
  type: 'select' | 'radio' | 'checkbox-group';
  options: (string | Option)[];
  placeholder?: string;
  /** Lay radio / checkbox options out in columns. */
  columns?: 1 | 2 | 3;
  autocomplete?: string;
}

export interface StateField extends BaseField {
  type: 'state';
  autocomplete?: string;
}

export interface DateField extends BaseField {
  type: 'date';
  /** 'past' rejects future dates, 'future' rejects past dates. */
  range?: 'past' | 'future';
  autocomplete?: string;
}

export interface FileField extends BaseField {
  type: 'file';
  maxFiles?: number;
  /** Restrict to a subset of the globally allowed extensions. */
  extensions?: string[];
}

export interface SignatureField extends BaseField {
  type: 'signature';
}

export interface ConsentField extends BaseField {
  type: 'consent';
  /** Statement the person is agreeing to. Paragraphs separated by blank lines. */
  text?: string;
  checkboxLabel: string;
}

/** Display-only text. Never submitted. */
interface DisplayField {
  name: string;
  label?: string;
  text?: string;
  tone?: 'info' | 'plain' | 'warn';
  showIf?: Condition;
  width?: Width;
}
export interface NoteField extends DisplayField {
  type: 'note';
}
export interface HeadingField extends DisplayField {
  type: 'heading';
}

export interface RepeaterField extends Omit<BaseField, 'hubspot' | 'sensitive' | 'required' | 'requiredIf'> {
  type: 'repeater';
  /** Singular item label, e.g. "Driver". Items render as "Driver 1", ... */
  itemLabel: string;
  min: number;
  max: number;
  /**
   * When set, the number of items follows another field's answer instead of
   * add / remove buttons. `map` converts answers such as "6+" to a count.
   */
  countFrom?: { field: string; map?: Record<string, number> };
  addLabel?: string;
  fields: Field[];
}

export interface TableField extends Omit<BaseField, 'hubspot' | 'sensitive' | 'requiredIf'> {
  type: 'table';
  rows: { key: string; label: string }[];
  columns: (TextField | NumberField | DateField)[];
}

export interface PercentGroupField extends Omit<BaseField, 'hubspot' | 'sensitive' | 'requiredIf'> {
  type: 'percent-group';
  items: { key: string; label: string }[];
  /** Sum the entries must reach. */
  total: number;
}

export type InputField =
  | TextField
  | NumberField
  | ChoiceField
  | StateField
  | DateField
  | FileField
  | SignatureField
  | ConsentField;

export type Field = InputField | NoteField | HeadingField | RepeaterField | TableField | PercentGroupField;

export interface Step {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
}

export interface FormDef {
  id: string;
  /** Name used in alert emails and logs. */
  name: string;
  steps: Step[];
  submitLabel: string;
  success: { title: string; message: string };
  /** Dot path of the fields that identify the sender, used for alert subject and reply-to. */
  contact: { email: string; firstName?: string; lastName?: string; fullName?: string; phone?: string; company?: string };
  /**
   * The email alert carries data that goes nowhere else (uploads, signatures,
   * sensitive answers), so a failed email fails the submission.
   */
  emailRequired?: boolean;
  /** Environment variable suffix for per-form settings, e.g. HOME_QUOTE. */
  envKey: string;
  /** HubSpot form GUID used when no HUBSPOT_FORM_<envKey> override is set. */
  hubspotFormGuid?: string;
  /** Send the readable summary of all answers to HubSpot as one long-text property. */
  hubspotSummary?: boolean;
  /** Keep a draft in sessionStorage so a refresh does not lose a long form. */
  draft?: boolean;
}

export type Scalar = string;
export type TableValue = Record<string, Record<string, string>>;
export type GroupValue = Record<string, string>;
export interface FileRef {
  name: string;
  size: number;
}
export type Value = Scalar | string[] | FileRef[] | GroupValue | TableValue | Values[] | undefined;
export interface Values {
  [key: string]: Value;
}

export type Errors = Record<string, string>;
