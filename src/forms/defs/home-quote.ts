import type { FormDef } from '../types.ts';
import { CARRIERS, QUOTE_REVIEW_NOTE, SEX, address, is, note, primaryContact, select, yesNo, yesNoMaybe } from './helpers.ts';

const thisYear = new Date().getFullYear();
const YEARS_BUILT = [...Array.from({ length: thisYear - 1899 }, (_, i) => String(thisYear - i)), 'Before 1900'];
const DEDUCTIBLES = ["1% of home's value", "2% of home's value", '$1,000'];

const notSameHolder = is('holderSameAsContact', 'No');
const married = is('married', 'Yes');
const insured = is('currentlyInsured', 'Yes');

export const homeQuote: FormDef = {
  id: 'home-quote',
  name: 'Homeowners Quote',
  envKey: 'HOME_QUOTE',
  // Until a dedicated HubSpot form exists, quote requests create or update the
  // contact through the Home and Auto "Let's Talk" form.
  hubspotFormGuid: '1ee9fcf7-712e-49d7-9010-29af6eb5f691',
  hubspotSummary: true,
  // Dates of birth travel in the alert email only.
  emailRequired: true,
  draft: true,
  submitLabel: 'Submit',
  success: {
    title: 'Thanks! Your home quote request is in.',
    message: "We've received your information and we'll get in touch ASAP.",
  },
  contact: { email: 'email', firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  steps: [
    { id: 'contact', title: 'Primary Contact Information', fields: primaryContact() },
    {
      id: 'holder',
      title: 'Primary Policy Holder',
      fields: [
        yesNo('holderSameAsContact', 'Will the primary policy holder be the same as the primary contact (previous section)?', { columns: 2 }),
        { type: 'text', name: 'holderFirstName', label: 'First Name', width: 'half', showIf: notSameHolder },
        { type: 'text', name: 'holderLastName', label: 'Last Name', width: 'half', showIf: notSameHolder },
        { type: 'radio', name: 'holderSex', label: 'Sex', options: SEX, columns: 2, showIf: notSameHolder },
        { type: 'date', name: 'holderDob', label: 'Date of Birth', range: 'past', width: 'half', sensitive: true },
        select('holderEducation', 'Highest Level of Education', ['High School Graduate', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'], {
          width: 'half',
        }),
        { type: 'text', name: 'holderOccupation', label: 'Occupation' },
        yesNo('holderCreditConsent', 'May we access your credit score?', { columns: 2 }),
      ],
    },
    {
      id: 'spouse',
      title: "Policy Holder's Spouse",
      fields: [
        yesNo('married', 'Are you married?', { columns: 2 }),
        { type: 'text', name: 'spouseFirstName', label: "Spouse's First Name", width: 'half', showIf: married },
        { type: 'text', name: 'spouseLastName', label: "Spouse's Last Name", width: 'half', showIf: married },
        { type: 'radio', name: 'spouseSex', label: "Spouse's Sex", options: SEX, columns: 2, showIf: married },
        { type: 'date', name: 'spouseDob', label: "Spouse's Date of Birth", range: 'past', width: 'half', showIf: married, sensitive: true },
        { type: 'text', name: 'spouseOccupation', label: "Spouse's Occupation", width: 'half', showIf: married },
        yesNo('spouseCreditConsent', 'May we access his/her credit score?', { columns: 2, showIf: married }),
      ],
    },
    {
      id: 'insurance',
      title: 'Home Address and Current Insurance',
      fields: [
        yesNo('homeSameAsContact', 'Is your home address the same as your primary contact address?', { columns: 2 }),
        ...address({ prefix: 'home', showIf: is('homeSameAsContact', 'No'), line1Label: 'Home Address' }),
        select('baseDeductible', 'Desired Base Deductible', DEDUCTIBLES, { width: 'half' }),
        select('windHailDeductible', 'Desired Wind/Hail Deductible', DEDUCTIBLES, { width: 'half' }),
        yesNoMaybe('floodCoverage', 'Are you interested in flood coverage?', { columns: 3 }),
        {
          type: 'textarea',
          name: 'pastClaims',
          label: "Please describe any home insurance claims you've filed in the past. Be as detailed as possible.",
        },
        yesNo('mortgage', 'Do you have a mortgage?', { columns: 2 }),
        yesNo('currentlyInsured', 'Do you currently have homeowners insurance?', { columns: 2 }),
        select('currentProvider', 'Insurance Provider', CARRIERS, { width: 'half', showIf: insured }),
        { type: 'date', name: 'policyExpiration', label: 'Policy Expiration Date', width: 'half', showIf: insured },
        { type: 'currency', name: 'dwellingCoverage', label: 'Dwelling Coverage (amount in dollars)', width: 'half', showIf: insured },
        { type: 'currency', name: 'liabilityCoverage', label: 'Liability Coverage (amount in dollars)', width: 'half', showIf: insured },
        yesNoMaybe(
          'valuablesCoverage',
          'Homeowners policies typically have exclusions for jewelry and fine art. Are you interested in coverage for these items?',
          { columns: 3 },
        ),
        {
          type: 'textarea',
          name: 'valuablesList',
          label:
            "Please list jewelry and/or fine art items you'd like to include in coverage, with a brief description and approximate value for each.",
          showIf: is('valuablesCoverage', 'Yes'),
        },
        yesNoMaybe('umbrella', 'Do you want umbrella excess liability insurance?', { columns: 3 }),
      ],
    },
    {
      id: 'home-1',
      title: 'Home Information: Part 1/2',
      fields: [
        select('yearBuilt', 'Year Built', YEARS_BUILT, { width: 'half' }),
        select('constructionType', 'Construction Type', ['Frame', 'Brick Veneer', 'Brick', 'Hardy Plank', 'Asbestos/Stucco'], { width: 'half' }),
        select('foundation', 'Foundation', ['Slab', 'Open', 'Pilings'], { width: 'half' }),
        select('occupancyType', 'Occupancy Type', ['Owner', 'Tenant', 'Vacant'], { width: 'half' }),
        select('plumbingType', 'Plumbing Type', ['Copper', 'PVC', 'Polyethylene (PEX)', 'Galvanized/Cast Iron'], { width: 'half' }),
        { type: 'number', name: 'roofAge', label: 'Age of Roof (in years, estimated)', min: 0, max: 200, width: 'half' },
        { type: 'text', name: 'squareFootage', label: 'Approximate Square Footage', inputMode: 'numeric', maxLength: 20, width: 'third' },
        { type: 'number', name: 'stories', label: 'Number of Stories', min: 0, max: 20, width: 'third' },
        { type: 'number', name: 'bathrooms', label: 'Number of Bathrooms', min: 0, max: 50, width: 'third' },
        {
          type: 'textarea',
          name: 'improvements',
          label: 'If your home is more than 15 years old, please describe all improvements in detail.',
        },
      ],
    },
    {
      id: 'home-2',
      title: 'Home Information: Part 2/2',
      fields: [
        { type: 'number', name: 'yearsAtResidence', label: 'How many years have you lived at this residence?', min: 0, max: 120 },
        yesNo('association', 'Is your home part of a homeowners or condo association?', { columns: 2 }),
        yesNo('overOneAcre', 'Is your home located on more than one acre?', { columns: 2 }),
        { type: 'text', name: 'acres', label: 'How many acres (approximately)?', maxLength: 40, showIf: is('overOneAcre', 'Yes') },
        yesNo('garage', 'Do you have a garage?', { columns: 2 }),
        yesNo('garageDetached', 'Is the garage detached?', { columns: 2, width: 'half', showIf: is('garage', 'Yes') }),
        select('garageSize', 'Garage Size', ['1 car', '2 cars', '3 cars', '4 cars', '5+ cars'], { width: 'half', showIf: is('garage', 'Yes') }),
        yesNo('porches', 'Do you have any porches or decks?', { columns: 2 }),
        { type: 'textarea', name: 'porchesDetail', label: 'Please list type and dimensions.', rows: 3, showIf: is('porches', 'Yes') },
        yesNo('detachedStructures', 'Do you have any other detached structures?', { columns: 2 }),
        {
          type: 'textarea',
          name: 'detachedStructuresDetail',
          label: 'Please provide a brief description of each.',
          rows: 3,
          showIf: is('detachedStructures', 'Yes'),
        },
        yesNo('trampoline', 'Do you have a trampoline?', { columns: 2, width: 'half' }),
        yesNo('watercraftRv', 'Do you own a watercraft and/or RV?', { columns: 2, width: 'half' }),
        yesNo('pool', 'Do you have a swimming pool?', { columns: 2 }),
        yesNo('poolDivingBoard', 'Does it have a diving board?', { columns: 2, width: 'half', showIf: is('pool', 'Yes') }),
        yesNo('poolFenced', 'Is it fenced in?', { columns: 2, width: 'half', showIf: is('pool', 'Yes') }),
        yesNo('cityLimits', 'Is your house within city limits?', { columns: 2 }),
        select('hydrantDistance', 'Distance to Fire Hydrant', ['Less than 1,000 feet', 'More than 1,000 feet'], { width: 'half' }),
        select('fireStationDistance', 'Distance to Fire Station', ['Less than five miles', 'More than five miles'], { width: 'half' }),
        yesNo('alarm', 'Do you have an alarm system?', { columns: 2, width: 'half' }),
        yesNo('alarmMonitored', 'Is it monitored?', { columns: 2, width: 'half', showIf: is('alarm', 'Yes') }),
        yesNo('pets', 'Do you own any pets and/or exotic animals?', { columns: 2 }),
        { type: 'textarea', name: 'petsDetail', label: 'Please list the species and breeds.', rows: 3, showIf: is('pets', 'Yes') },
        yesNo('otherProperty', 'Do you own other property?', { columns: 2 }),
        { type: 'textarea', name: 'otherPropertyDetail', label: 'Please provide a brief description.', rows: 3, showIf: is('otherProperty', 'Yes') },
        note('review', QUOTE_REVIEW_NOTE),
      ],
    },
  ],
};
