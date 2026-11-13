import type { Condition, FormDef } from '../types.ts';
import { CARRIERS, QUOTE_REVIEW_NOTE, SEX, is, note, primaryContact, select, yesNo } from './helpers.ts';

const thisYear = new Date().getFullYear();
const MODEL_YEARS = Array.from({ length: thisYear + 1 - 1925 }, (_, i) => String(thisYear + 1 - i));
const SPLIT_LIMITS = ['$50,000 / $100,000', '$100,000 / $300,000', '$250,000 / $500,000', '$500,000 / $500,000'];
const PD_LIMITS = ['$50,000', '$100,000'];

const notSameHolder = is('holderSameAsContact', 'No');
const insured = is('currentlyInsured', 'Yes');
/** Driver 1's identity is already known when the primary driver is the primary contact. */
const driverIdentityNeeded: Condition = { any: [{ notIndex: [0] }, { field: '^primaryDriverSameAsContact', equals: 'No' }] };

export const autoQuote: FormDef = {
  id: 'auto-quote',
  name: 'Auto Quote',
  envKey: 'AUTO_QUOTE',
  hubspotFormGuid: '1ee9fcf7-712e-49d7-9010-29af6eb5f691',
  hubspotSummary: true,
  // Driver's licence numbers travel in the alert email only.
  emailRequired: true,
  draft: true,
  submitLabel: 'Submit',
  success: {
    title: 'Thanks! Your auto quote request is in.',
    message: "We've received your information and we'll get in touch ASAP.",
  },
  contact: { email: 'email', firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  steps: [
    {
      id: 'contact',
      title: 'Primary Contact Information',
      fields: [
        ...primaryContact().map((f) =>
          f.name === 'preferredContact' ? { ...f, required: false } : f.name === 'referralClient' ? { ...f, label: 'Name of Client' } : f.name === 'referralAgent' ? { ...f, label: 'Name of Agent' } : f,
        ),
        { type: 'number', name: 'yearsAtResidence', label: 'How many years have you lived at your current residence?', min: 0, max: 120 },
      ],
    },
    {
      id: 'holder',
      title: 'Primary Policy Holder',
      fields: [
        yesNo('holderSameAsContact', 'Will the primary policy holder be the same as the primary contact (previous section)?', { required: true, columns: 2 }),
        { type: 'text', name: 'holderFirstName', label: 'First Name', required: true, width: 'half', showIf: notSameHolder },
        { type: 'text', name: 'holderLastName', label: 'Last Name', required: true, width: 'half', showIf: notSameHolder },
        { type: 'radio', name: 'holderSex', label: 'Sex', options: SEX, required: true, columns: 2, showIf: notSameHolder },
        { type: 'date', name: 'holderDob', label: 'Date of Birth', range: 'past', required: true, width: 'half', sensitive: true },
        yesNo('holderCreditConsent', 'May we access your credit score?', { required: true, columns: 2 }),
      ],
    },
    {
      id: 'insurance',
      title: 'Current Auto Insurance',
      fields: [
        yesNo('currentlyInsured', 'Do you currently have auto insurance?', { required: true, columns: 2 }),
        select('currentProvider', 'Insurance Provider', CARRIERS, { required: true, width: 'half', showIf: insured }),
        { type: 'date', name: 'policyExpiration', label: 'Policy Expiration Date', required: true, width: 'half', showIf: insured },
        {
          type: 'textarea',
          name: 'pastClaims',
          label: "Please list and describe any auto insurance claims you've filed in the past. Try to be as detailed as possible.",
        },
        {
          type: 'textarea',
          name: 'tickets',
          label:
            'Please list and describe any traffic tickets received by any drivers in your household in the last five years. Try to be as detailed as possible.',
        },
      ],
    },
    {
      id: 'coverage',
      title: 'Desired Coverage',
      fields: [
        select('driverCount', 'How many drivers do you want to insure?', ['1', '2', '3', '4', '5', '6+'], { required: true, width: 'half' }),
        select('vehicleCount', 'How many vehicles?', ['1', '2', '3', '4', '5+'], { required: true, width: 'half' }),
        select('bodilyInjury', 'Bodily Injury Coverage', SPLIT_LIMITS, { required: true, width: 'half' }),
        select('propertyDamage', 'Property Damage to Others', PD_LIMITS, { required: true, width: 'half' }),
        select('pip', 'Personal Injury Protection', ['$5,000', '$10,000'], { required: true, width: 'half' }),
        select('umBodilyInjury', 'Uninsured / Under-insured Motorist Bodily Injury', SPLIT_LIMITS, { required: true, width: 'half' }),
        select('umPropertyDamage', 'Uninsured / Under-insured Motorist Property Damage', PD_LIMITS, { required: true, width: 'half' }),
        select('collisionDeductible', 'Collision Deductible', ['$250', '$500', '$1,000'], { required: true, width: 'half' }),
        select('comprehensiveDeductible', 'Other-than-collision Deductible', ['$50', '$100', '$250', '$500', '$1,000'], {
          required: true,
          width: 'half',
        }),
        yesNo('rental', 'Rental coverage?', { required: true, columns: 2, width: 'third' }),
        yesNo('towing', 'Towing coverage?', { required: true, columns: 2, width: 'third' }),
        yesNo('gap', 'Loan/lease gap coverage?', { required: true, columns: 2, width: 'third' }),
      ],
    },
    {
      id: 'drivers',
      title: 'Driver(s) Information',
      fields: [
        yesNo('primaryDriverSameAsContact', 'Will the primary driver be the same person as the primary contact (first section)?', {
          required: true,
          columns: 2,
        }),
        {
          type: 'repeater',
          name: 'drivers',
          label: 'Drivers',
          itemLabel: 'Driver',
          min: 1,
          max: 5,
          countFrom: { field: 'driverCount', map: { '6+': 5 } },
          fields: [
            { type: 'text', name: 'firstName', label: 'First Name', required: true, width: 'half', showIf: driverIdentityNeeded },
            { type: 'text', name: 'lastName', label: 'Last Name', required: true, width: 'half', showIf: driverIdentityNeeded },
            { type: 'radio', name: 'sex', label: 'Sex', options: SEX, required: true, columns: 2, width: 'half', showIf: driverIdentityNeeded },
            { type: 'date', name: 'dob', label: 'Date of Birth', range: 'past', required: true, width: 'half', sensitive: true, showIf: driverIdentityNeeded },
            {
              type: 'text',
              name: 'licenseNumber',
              label: "Driver's License Number",
              required: true,
              sensitive: true,
              maxLength: 25,
              pattern: '^[A-Za-z0-9][A-Za-z0-9 \\-]{3,24}$',
              patternMessage: 'Enter the licence number using letters and numbers only.',
              width: 'half',
            },
            { type: 'state', name: 'licenseState', label: "Driver's License State", required: true, width: 'half' },
            select(
              'education',
              'Highest Level of Education',
              ['Some High School', 'High School Graduate', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'PhD'],
              { required: true, showIf: { index: [0] } },
            ),
          ],
        },
        note('driversOverflow', "You picked six or more drivers! We'll get in touch for info for additional drivers.", {
          showIf: is('driverCount', '6+'),
          tone: 'info',
        }),
      ],
    },
    {
      id: 'vehicles',
      title: 'Vehicle(s) Information',
      fields: [
        {
          type: 'repeater',
          name: 'vehicles',
          label: 'Vehicles',
          itemLabel: 'Vehicle',
          min: 1,
          max: 4,
          countFrom: { field: 'vehicleCount', map: { '5+': 4 } },
          fields: [
            select('year', 'Year', MODEL_YEARS, { required: true, width: 'third' }),
            { type: 'text', name: 'make', label: 'Make', required: true, width: 'third', maxLength: 60 },
            { type: 'text', name: 'model', label: 'Model', required: true, width: 'third', maxLength: 60 },
            yesNo('alarm', 'Does it have an alarm?', { columns: 2, width: 'half' }),
            yesNo('abs', 'Does it have anti-lock brakes?', { columns: 2, width: 'half' }),
            {
              type: 'text',
              name: 'vin',
              label: 'Vehicle Identification Number',
              maxLength: 17,
              pattern: '^[A-Za-z0-9]{5,17}$',
              patternMessage: 'A VIN uses letters and numbers only, up to 17 characters.',
              width: 'third',
            },
            { type: 'text', name: 'lienHolder', label: 'Lien Holder', width: 'third' },
            { type: 'text', name: 'replacementCost', label: 'Vehicle Replacement Cost', maxLength: 40, width: 'third' },
          ],
        },
        note('vehiclesOverflow', "You picked five or more vehicles! We'll get in touch for info for additional vehicles.", {
          showIf: is('vehicleCount', '5+'),
          tone: 'info',
        }),
        note('review', QUOTE_REVIEW_NOTE),
      ],
    },
  ],
};
