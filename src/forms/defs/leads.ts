import type { Field, FormDef } from '../types.ts';

// The "Let's Talk" forms. Field names, labels, options and required flags
// match the HubSpot forms that were embedded on the previous site, so
// submissions land in the same HubSpot forms with the same properties.

const EMPLOYEE_RANGES = ['1-5', '5-25', '25-50', '50-100', '100-500', '500-1000', '1000+'];

interface LeadOptions {
  id: string;
  name: string;
  envKey: string;
  guid: string;
  companyLabel?: string;
  business?: boolean;
  message?: boolean;
}

function lead({ id, name, envKey, guid, companyLabel = 'Company name', business = true, message = false }: LeadOptions): FormDef {
  const fields: Field[] = [
    { type: 'text', name: 'firstname', label: 'First name', required: true, autocomplete: 'given-name', width: 'half', hubspot: 'firstname' },
    { type: 'text', name: 'lastname', label: 'Last name', required: true, autocomplete: 'family-name', width: 'half', hubspot: 'lastname' },
    { type: 'email', name: 'email', label: 'Email', required: true, autocomplete: 'email', width: business ? 'full' : 'half', hubspot: 'email' },
  ];
  if (business) {
    fields.push(
      { type: 'text', name: 'company', label: companyLabel, required: true, autocomplete: 'organization', width: 'half', hubspot: 'company' },
      {
        type: 'select',
        name: 'numemployees',
        label: 'Number of employees',
        options: EMPLOYEE_RANGES,
        placeholder: 'Please select',
        width: 'half',
        hubspot: 'numemployees',
      },
    );
  }
  fields.push({
    type: 'tel',
    name: 'phone',
    label: 'Phone number',
    autocomplete: 'tel',
    width: business ? 'full' : 'half',
    hubspot: 'phone',
  });
  if (message) {
    fields.push({ type: 'textarea', name: 'message', label: 'How can we help?', rows: 4, maxLength: 3000, hubspot: 'message' });
  }
  return {
    id,
    name,
    envKey,
    hubspotFormGuid: guid,
    steps: [{ id: 'contact', title: "Let's Talk", fields }],
    submitLabel: 'Submit',
    success: { title: 'Thanks for submitting the form.', message: 'A member of our team will be in touch with you shortly.' },
    contact: { email: 'email', firstName: 'firstname', lastName: 'lastname', phone: 'phone', ...(business ? { company: 'company' } : {}) },
  };
}

const GENERAL = '8caa4b91-1d58-4300-9d76-0f8c1fc03b15';

export const leadEnergy = lead({ id: 'lead-energy', name: "Let's Talk: Energy Insurance", envKey: 'LEAD_ENERGY', guid: GENERAL });
export const leadContractors = lead({ id: 'lead-contractors', name: "Let's Talk: Contractors Insurance", envKey: 'LEAD_CONTRACTORS', guid: GENERAL });
export const leadEmployeeBenefits = lead({
  id: 'lead-employee-benefits',
  name: "Let's Talk: Employee Benefits",
  envKey: 'LEAD_EMPLOYEE_BENEFITS',
  guid: GENERAL,
});
export const leadProfessionalServices = lead({
  id: 'lead-professional-services',
  name: "Let's Talk: Professional Services Insurance",
  envKey: 'LEAD_PROFESSIONAL_SERVICES',
  guid: '1e1e285d-368c-48cf-8d31-fc6252a76f32',
});
export const leadRealEstate = lead({
  id: 'lead-real-estate',
  name: "Let's Talk: Real Estate Insurance",
  envKey: 'LEAD_REAL_ESTATE',
  guid: '3ef11237-ded5-4a16-a2bd-786aeacff00f',
});
export const leadNonProfit = lead({
  id: 'lead-non-profit',
  name: "Let's Talk: Non-Profit Insurance",
  envKey: 'LEAD_NON_PROFIT',
  guid: '9a452d3d-8d39-4881-ac75-9898726d56b2',
  companyLabel: 'Organization',
});
export const leadCollections = lead({
  id: 'lead-collections',
  name: "Let's Talk: Collections Insurance",
  envKey: 'LEAD_COLLECTIONS',
  guid: 'cb318bed-b081-46b7-ad09-bf779ef0fbf3',
});
export const leadHomeAuto = lead({
  id: 'lead-home-auto',
  name: "Let's Talk: Home and Auto Insurance",
  envKey: 'LEAD_HOME_AUTO',
  guid: '1ee9fcf7-712e-49d7-9010-29af6eb5f691',
  business: false,
});
/** General contact form. New on this site; it uses the general "Let's Talk" HubSpot form. */
export const leadContact = lead({ id: 'lead-contact', name: "Let's Talk: Contact", envKey: 'LEAD_CONTACT', guid: GENERAL, message: true });
