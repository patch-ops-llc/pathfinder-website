import { autoQuote } from './defs/auto-quote.ts';
import { careers } from './defs/careers.ts';
import { checkDraft } from './defs/check-draft.ts';
import { homeQuote } from './defs/home-quote.ts';
import {
  leadCollections,
  leadContact,
  leadContractors,
  leadEmployeeBenefits,
  leadEnergy,
  leadHomeAuto,
  leadNonProfit,
  leadProfessionalServices,
  leadRealEstate,
} from './defs/leads.ts';
import { professionalLiabilityQuote } from './defs/professional-liability-quote.ts';
import type { FormDef } from './types.ts';

export const forms: FormDef[] = [
  leadEnergy,
  leadProfessionalServices,
  leadRealEstate,
  leadContractors,
  leadNonProfit,
  leadEmployeeBenefits,
  leadHomeAuto,
  leadCollections,
  leadContact,
  homeQuote,
  autoQuote,
  professionalLiabilityQuote,
  careers,
  checkDraft,
];

const byId = new Map(forms.map((f) => [f.id, f]));

export function getForm(id: string): FormDef | undefined {
  return byId.get(id);
}

export function requireForm(id: string): FormDef {
  const form = byId.get(id);
  if (!form) throw new Error(`Unknown form: ${id}`);
  return form;
}
