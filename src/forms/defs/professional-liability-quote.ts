import type { Condition, FormDef } from '../types.ts';
import { CONTACT_METHODS, address, heading, is, note, select, yesNo } from './helpers.ts';

const thisYear = new Date().getFullYear();
const ESTABLISHED_YEARS = Array.from({ length: thisYear - 1799 }, (_, i) => String(thisYear - i));

const ATTORNEY_DESIGNATIONS = [
  'Associate',
  'Co-counsel',
  'Director',
  'Employee',
  'Independent Contractor',
  'Member of Firm',
  'Manager',
  'Owner',
  'Of Counsel',
  'Officer',
  'Solo Practitioner',
  'Special Counsel',
  'Staff Counsel',
  'Shareholder',
  'Stockholder',
];
const PARTNER_DESIGNATIONS = ['Equity Partner', 'Non-equity Partner', 'Partner', 'Limited Liability Partner', 'Retired Partner'];

const PRACTICE_AREAS = [
  'Admiralty / Marine — Defense',
  'Admiralty / Marine — Plaintiff',
  'Anti-Trust / Trade Regulation',
  'Banking / Financial Institutions',
  'Business Transaction - Commercial Law',
  'Civil / Commercial Litigation - Defense',
  'Civil / Commercial Litigation - Plaintiff',
  'Civil Rights / Discrimination',
  'Collection / Bankruptcy',
  'Construction (Building Contracts)',
  'Consumer Claims',
  'Corporate Business Organization',
  'Criminal',
  'Environmental',
  'Family Law',
  'Government Contracts / Claims',
  'Immigration / Naturalization',
  'Intellectual Property',
  'International Law',
  'Labor Management Rep',
  'Labor Union Rep',
  'Local Government',
  'Natural Resources / Oil & Gas',
  'Personal Injury / Property Damage — Defense',
  'Personal Injury / Property Damage — Plaintiff',
  'Real Estate / Title — Commercial',
  'Real Estate / Title — Residential',
  'Securities (S.E.C.)',
  'Taxation',
  'Wills, Estate, Trust & Probate',
  'Workers Comp — Defense',
  'Workers Comp — Plaintiff',
];
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SCOTT = 'Scott West at swest@pathfinderlld.com';
const supplement = (name: string) => `After completing this form, please contact ${SCOTT} to complete a ${name} supplement.`;

const engagementQuestions = ['engagementLetters', 'engagementIdentity', 'engagementScope', 'engagementFees', 'engagementTermination', 'engagementCountersigned'];
const anyEngagementNo: Condition = { any: engagementQuestions.map((q) => is(q, 'No')) };

export const professionalLiabilityQuote: FormDef = {
  id: 'professional-liability-quote',
  name: "Lawyer's Professional Liability Quote",
  envKey: 'PL_QUOTE',
  hubspotFormGuid: '1e1e285d-368c-48cf-8d31-fc6252a76f32',
  hubspotSummary: true,
  // Letterhead, engagement letter and signature are delivered by email only.
  emailRequired: true,
  draft: true,
  submitLabel: 'Submit',
  success: {
    title: 'Thank you. Your application has been submitted.',
    message: 'We have received your professional liability application and will be in touch about your quote.',
  },
  contact: { email: 'email', firstName: 'signatoryFirstName', lastName: 'signatoryLastName', phone: 'phone', company: 'firmName' },
  steps: [
    {
      id: 'firm',
      title: 'About the Firm',
      fields: [
        {
          type: 'text',
          name: 'firmName',
          label: "The precise registered name of the applicant firm to be insured, as reflected on the firm's letterhead:",
          required: true,
          autocomplete: 'organization',
          hubspot: 'company',
        },
        note(
          'letterheadNote',
          "Attach a sample of the firm's letterhead to this application using the field below. Inconsistencies between it and the application, including attorneys named, address, and other offices, etc. should be explained here.",
        ),
        { type: 'file', name: 'letterhead', label: 'Attach letterhead here.', required: true, maxFiles: 2 },
        { type: 'textarea', name: 'letterheadInconsistencies', label: 'Note any inconsistencies here:', rows: 3 },
        heading('locationHeading', 'Primary Location of the Firm'),
        ...address({ prefix: 'firm', required: true, autofill: true }),
        { type: 'email', name: 'email', label: 'Email', required: true, autocomplete: 'email', width: 'half', hubspot: 'email' },
        { type: 'tel', name: 'phone', label: 'Phone Number', required: true, autocomplete: 'tel', width: 'half', hubspot: 'phone' },
        { type: 'text', name: 'website', label: 'Website', autocomplete: 'url', maxLength: 200, width: 'half' },
        { type: 'checkbox-group', name: 'preferredContact', label: 'Preferred Contact Method', options: CONTACT_METHODS, columns: 2, width: 'half' },
        yesNo(
          'virtualOffice',
          'Is this location a work-at-home or virtual office arrangement (i.e. mailing address only, reserved office space on a shared basis)?',
          { required: true, columns: 2 },
        ),
        yesNo('meetsClientsHere', 'Is this location where the firm meets with clients?', { required: true, columns: 2 }),
        { type: 'textarea', name: 'meetsClientsExplain', label: 'Please explain:', required: true, rows: 3, showIf: is('meetsClientsHere', 'No') },
      ],
    },
    {
      id: 'coverage-info',
      title: 'Firm Coverage Information',
      fields: [
        { type: 'date', name: 'effectiveDate', label: 'Coverage is requested to be effective on:', required: true, width: 'half' },
        select('yearEstablished', 'Which year was the firm established?', ESTABLISHED_YEARS, { required: true, width: 'half' }),
        {
          type: 'radio',
          name: 'entityType',
          label: 'Type of entity:',
          options: ['Solo practitioner', 'Partnership', 'PC', 'PA', 'LLC', 'LLP', 'Individual attorney with employee attorney(s)', 'Other'],
          required: true,
          columns: 2,
        },
        { type: 'text', name: 'entityTypeOther', label: 'Other type of entity', required: true, showIf: is('entityType', 'Other') },
        yesNo('sharedOffice', 'Is the firm office or suites shared with attorneys other than firm members?', { required: true, columns: 2 }),
        yesNo('otherOffices', 'Does the firm have offices at locations other than the primary location listed above?', { required: true, columns: 2 }),
        yesNo('otherStates', 'Does the firm practice in states other than the primary location?', { required: true, columns: 2 }),
        note('otherStatesNote', "We'll reach out to you with an Out-of-State Supplemental Application for more information.", {
          showIf: is('otherStates', 'Yes'),
          tone: 'info',
        }),
        yesNo('staffRatio', 'Is the ratio of support staff to attorneys greater than 3 to 1?', { required: true, columns: 2 }),
        {
          type: 'number',
          name: 'yearsInsured',
          label: 'For how many years has the firm been continuously insured for malpractice claims?',
          required: true,
          min: 0,
          max: 200,
        },
        { type: 'date', name: 'priorActsExclusionDate', label: 'Provide the prior acts exclusion date, if applicable:', width: 'half' },
        {
          type: 'number',
          name: 'spinOffYearsInsured',
          label: 'If the firm is a spin-off from another firm, include the number of years that firm has been continuously insured:',
          min: 0,
          max: 200,
        },
        yesNo('extendedReporting', 'Has the firm ever purchased an Extended Reporting Period option?', { required: true, columns: 2 }),
        yesNo('coverageDeclined', "Has the firm's coverage ever been non-renewed, cancelled, rescinded, or declined by another carrier?", {
          required: true,
          columns: 2,
        }),
        yesNo(
          'predecessorCoverage',
          'Does the firm desire coverage for any previously-dissolved predecessor firms and those attorneys affiliated therewith?',
          { required: true, columns: 2 },
        ),
        yesNo('uncoveredAttorney', "Is there an attorney listed on the letterhead not covered by the firm's insurance?", { required: true, columns: 2 }),
        {
          type: 'table',
          name: 'insuranceHistory',
          label: "Enter the firm's insurance history for the last five years:",
          help: 'Every cell is required. Enter N/A where a year does not apply.',
          required: true,
          rows: [1, 2, 3, 4, 5].map((n) => ({ key: `year${n}`, label: `Year ${n}` })),
          columns: [
            { type: 'text', name: 'effDate', label: 'Eff Date (mm/dd/yyyy)', maxLength: 40 },
            { type: 'text', name: 'company', label: 'Insurance Company', maxLength: 120 },
            { type: 'text', name: 'limits', label: 'Limits (per claim/agg)', maxLength: 60 },
            { type: 'text', name: 'attorneys', label: 'Covered # of Attorneys', maxLength: 20 },
            { type: 'text', name: 'premium', label: 'Annual Premium', maxLength: 40 },
          ],
        },
      ],
    },
    {
      id: 'attorneys',
      title: 'Attorney Information',
      fields: [
        note(
          'attorneyIntro',
          "In the next sections, we'll ask you to build brief insurance profiles for each attorney at your firm (up to ten). Please complete each section to the best of your knowledge.",
        ),
        {
          type: 'repeater',
          name: 'attorneys',
          label: 'Attorneys',
          itemLabel: 'Attorney',
          min: 1,
          max: 10,
          addLabel: 'Add another attorney',
          fields: [
            { type: 'text', name: 'firstName', label: 'First Name', required: true, width: 'half' },
            { type: 'text', name: 'lastName', label: 'Last Name', required: true, width: 'half' },
            {
              type: 'checkbox-group',
              name: 'designations',
              label: 'Attorney Designations (check all that apply):',
              options: ATTORNEY_DESIGNATIONS,
              required: true,
              columns: 3,
            },
            {
              type: 'checkbox-group',
              name: 'partnerDesignations',
              label: 'Partner Designations (check all that apply):',
              options: PARTNER_DESIGNATIONS,
              columns: 3,
            },
            { type: 'number', name: 'hoursPerWeek', label: 'Average number of hours per week:', required: true, min: 0, max: 168, width: 'half' },
            { type: 'state', name: 'state1', label: 'State #1 licensed to practice law', required: true, width: 'half' },
            { type: 'state', name: 'state2', label: 'State #2 licensed to practice law', width: 'third' },
            { type: 'state', name: 'state3', label: 'State #3 licensed to practice law', width: 'third' },
            { type: 'state', name: 'state4', label: 'State #4 licensed to practice law', width: 'third' },
            { type: 'textarea', name: 'additionalStates', label: 'List additional states (if any):', rows: 2 },
            { type: 'number', name: 'yearsInPractice', label: 'Number of years in practice', required: true, min: 0, max: 90, width: 'third' },
            { type: 'number', name: 'yearsWithFirm', label: 'Number of years with firm', required: true, min: 0, max: 90, width: 'third' },
            {
              type: 'number',
              name: 'yearsCovered',
              label: 'Number of years with uninterrupted malpractice coverage',
              required: true,
              min: 0,
              max: 90,
              width: 'third',
            },
            { type: 'date', name: 'priorActsDate', label: 'Prior acts date:', required: true, width: 'half' },
            yesNo('stateBarMember', 'Is this attorney a member of a state bar?', { required: true, columns: 2, width: 'half' }),
          ],
        },
        note(
          'attorneyListNote',
          'If you prefer, you may instead attach a list of additional attorneys and relevant info using the tool below.',
        ),
        { type: 'file', name: 'attorneyList', label: 'Attach list of additional attorneys here (optional).', maxFiles: 2 },
        yesNo('moreThanTen', 'Do you want to add another attorney?', { columns: 2, showIf: { field: 'attorneys', gte: 10 } }),
        note(
          'moreThanTenNote',
          'After completing this form, please get in touch with Scott West directly at swest@pathfinderlld.com or (832) 428-8472 to discuss additional attorneys.',
          { showIf: is('moreThanTen', 'Yes'), tone: 'info' },
        ),
      ],
    },
    {
      id: 'practice',
      title: 'Areas of Practice',
      fields: [
        note(
          'practiceGuidelines',
          'Guidelines for completing this section: Express percentages of time devoted (billable hours) in each area during the previous year. Indicate percentages in whole numbers next to the type of law you practice, not the business client you represent. Be as accurate as possible, as casual estimates may cause inappropriate evaluation of your practice. All litigation should be coded as "civil litigation" with the exception of "criminal", "personal injury-plaintiff" and "intellectual property" which should be coded to their respective Area of Practice. Total of all fields must equal 100%.',
        ),
        {
          type: 'percent-group',
          name: 'practiceAreas',
          label: 'Areas of Practice',
          required: true,
          total: 100,
          items: [...PRACTICE_AREAS.map((label) => ({ key: slug(label), label })), { key: 'other', label: 'Other (describe below)' }],
        },
        { type: 'textarea', name: 'practiceOther', label: 'Other', rows: 3 },
      ],
    },
    {
      id: 'operations',
      title: 'Firm Operations and Management',
      fields: [
        yesNo('entertainmentClients', 'Does the firm or any attorney of the firm have clients in the entertainment industry?', {
          required: true,
          columns: 2,
        }),
        yesNo(
          'securitiesServices',
          'At any time in the past five years, has the firm, or any attorney of the firm (regardless of which firm they were with at the time) provided legal services in any way related to a security or securities transaction?',
          { required: true, columns: 2 },
        ),
        yesNo(
          'equityInterest',
          "Does the firm have any one client in which the firm's attorneys have an equity interest greater than 10% combined?",
          { required: true, columns: 2 },
        ),
        yesNo('clientConcentration', "Does the firm have any one client which represents more than 25% or more of the firm's billings?", {
          required: true,
          columns: 2,
        }),
        yesNo(
          'managementRole',
          'Does anyone in the firm serve as a director, officer or employee or in any other management capacity for a client?',
          { required: true, columns: 2 },
        ),
        yesNo(
          'conflictProcedures',
          'Does the firm have procedures for identifying and resolving potential or actual conflicts of interest, including cross-checking of former, existing or potential clients?',
          { required: true, columns: 2 },
        ),
        yesNo('docketControls', 'Does the firm have at least two independently maintained docket controls?', { required: true, columns: 2 }),

        heading('engagementHeading', 'Engagement letters'),
        yesNo('engagementLetters', 'Does the firm regularly confirm representations in writing via use of formal engagement letters?', {
          required: true,
          columns: 2,
        }),
        { type: 'file', name: 'engagementLetter', label: 'Please attach a sample engagement letter on firm letterhead here.', maxFiles: 2 },
        note('engagementIncludes', 'Does the engagement letter include the following?', { tone: 'plain' }),
        yesNo('engagementIdentity', 'Identity of the client?', { required: true, columns: 2, width: 'half' }),
        yesNo('engagementScope', 'Scope of Representation that includes key terms of legal representation?', {
          required: true,
          columns: 2,
          width: 'half',
        }),
        yesNo('engagementFees', 'Fee structures and billing agreements?', { required: true, columns: 2, width: 'half' }),
        yesNo('engagementTermination', 'Termination agreement that includes file retention and destruction terms?', {
          required: true,
          columns: 2,
          width: 'half',
        }),
        yesNo(
          'engagementCountersigned',
          'Does the firm ensure that a countersigned engagement letter is received from the client before work begins on a new matter?',
          { required: true, columns: 2 },
        ),
        {
          type: 'textarea',
          name: 'engagementExplain',
          label: 'Please explain any "no" answers in this subsection.',
          required: true,
          rows: 3,
          showIf: anyEngagementNo,
        },

        heading('proceduresHeading', 'Procedures and revenue'),
        yesNo('declinationLetters', 'Does the firm regularly acknowledge in writing the declination or termination of representations?', {
          required: true,
          columns: 2,
        }),
        yesNo('twoAttorneysInformed', 'Does the firm require that at least two attorneys in the firm be informed of the initiation of a representation?', {
          required: true,
          columns: 2,
          showIf: { field: 'attorneys', gte: 2 },
        }),
        yesNo(
          'soloProcedure',
          'If you are a solo practitioner, do you have a procedure in place regarding provisions of services if you are incapacitated or otherwise unavailable?',
          { columns: 2, requiredIf: is('entityType', 'Solo practitioner') },
        ),
        yesNo(
          'feeSuits',
          'Has the firm initiated lawsuits or arbitration procedures during the last two years to enforce the collection of unpaid fees for the firm?',
          { required: true, columns: 2 },
        ),
        note('feeSuitsNote', supplement('Fee Suit'), { showIf: is('feeSuits', 'Yes'), tone: 'info' }),
        yesNo(
          'sox',
          'Has the firm or any lawyer in the firm represented publicly traded clients with services rendered involving Sarbanes-Oxley Act (SOX) compliance including but not limited to securities, accounting, financial / investment services or tax work?',
          { required: true, columns: 2 },
        ),
        note('soxNote', supplement('Client Information'), { showIf: is('sox', 'Yes'), tone: 'info' }),
        yesNo('massTort', 'Has the firm been involved in any mass tort / class action cases within the past five years?', {
          required: true,
          columns: 2,
        }),
        note('massTortNote', supplement('Mass Tort / Class Action'), { showIf: is('massTort', 'Yes'), tone: 'info' }),
        {
          type: 'table',
          name: 'grossRevenues',
          label: "Provide the firm's gross revenues:",
          help: 'Every cell is required. Enter N/A where a year does not apply.',
          required: true,
          rows: [
            { key: 'current', label: 'Current Fiscal Year' },
            { key: 'prior', label: 'Prior Fiscal Year' },
            { key: 'twoPrior', label: '2 Years Prior' },
          ],
          columns: [
            { type: 'text', name: 'yearEnd', label: 'Year End Date', maxLength: 40 },
            { type: 'text', name: 'revenue', label: 'Gross Revenues', maxLength: 40 },
          ],
        },
        {
          type: 'percent',
          name: 'receivablesOver90',
          label: 'What percentage of accounts receivable are outstanding more than 90 days?',
          required: true,
          width: 'half',
        },
      ],
    },
    {
      id: 'claims',
      title: 'Claim / Incident / Disciplinary Information',
      fields: [
        note('claimsIntro', 'After inquiry, is any attorney in the firm aware of:', { tone: 'plain' }),
        yesNo(
          'claimMade',
          'A professional liability claim made in the past five years against them, the firm, any predecessor firm, or against any current or former attorney of the firm while affiliated with the firm?',
          { required: true, columns: 2 },
        ),
        yesNo(
          'potentialClaim',
          'An actual or alleged act, omission, circumstance, or breach of duty that a reasonable attorney would recognize might reasonably be expected to result in a claim being made against the firm, any predecessor firm, or against any attorney currently or formerly affiliated with the firm or any predecessor firm, regardless of whether any such claim would be meritorious?',
          { required: true, columns: 2 },
        ),
        note('claimsNote', supplement('Claims'), { showIf: { any: [is('claimMade', 'Yes'), is('potentialClaim', 'Yes')] }, tone: 'info' }),
        yesNo(
          'disciplinaryInquiry',
          'Within the past five years, has any attorney been subject to any disciplinary inquiry, complaint or proceeding for any reason including non-payment of dues?',
          { required: true, columns: 2 },
        ),
        yesNo(
          'disbarred',
          'Has any attorney ever been refused admission to practice, disbarred, suspended, formally reprimanded, or sanctioned in any other way?',
          { required: true, columns: 2 },
        ),
        note('disciplineNote', supplement('Claims'), {
          showIf: { any: [is('disciplinaryInquiry', 'Yes'), is('disbarred', 'Yes')] },
          tone: 'info',
        }),
      ],
    },
    {
      id: 'requested',
      title: 'Requested Coverage',
      fields: [
        note(
          'requestedNote',
          'Some limits / deductibles / optional coverages may not be available in all states and all are subject to underwriting qualification. Your quote will reflect the coverage and options for which your firm qualifies.',
        ),
        select(
          'limit',
          "Select your firm's desired Each Claim / Aggregate limit:",
          [
            '$100,000 / $300,000',
            '$250,000 / $500,000',
            '$500,000 / $500,000',
            '$500,000 / $1,000,000',
            '$1,000,000 / $1,000,000',
            '$1,000,000 / $2,000,000',
            '$2,000,000 / $2,000,000',
            '$2,000,000 / $4,000,000',
            '$3,000,000 / $3,000,000',
            'Other',
          ],
          { required: true, width: 'half' },
        ),
        select(
          'deductible',
          "Select your firm's desired Aggregate Deductible:",
          ['$1,000', '$2,000', '$2,500', '$3,000', '$4,000', '$5,000', '$10,000', '$15,000', '$25,000', '$50,000', '$75,000', '$100,000', 'Other'],
          { required: true, width: 'half' },
        ),
        {
          type: 'checkbox-group',
          name: 'optionalCoverages',
          label: 'Select optional coverages the firm desires (check all that apply):',
          options: ['Per Claim Deductible', 'Claims Expenses Outside Limit', 'First Dollar Defense', 'Title Insurance Agency'],
          columns: 2,
        },
      ],
    },
    {
      id: 'signature',
      title: 'Signature and Representation',
      fields: [
        note(
          'representation',
          "Applicant hereby represents, after inquiry, that the information contained herein and in any supplemental applications or forms required hereby, is true, accurate and complete and that no material facts have been suppressed or misstated. Applicant acknowledges a continuing obligation to report to the Company as soon as practicable any material changes in all such information, after signing the application and prior to issuance of the policy, and acknowledges that the Company shall have the right to withdraw or modify any outstanding quotations and/or authorization or agreement to bind the insurance based upon such changes.\n\nFurther, Applicant understands and acknowledges that:\n\nIf a policy is issued, the Company will have relied upon, as representations: this application, and any supplemental applications, and any other statements furnished to the Company in conjunction with this application, all of which are hereby incorporated by reference into this application and made a part hereof.\n\nThis application will be the basis of the contract and will be incorporated by reference into and made part of such policy.\n\nApplicant's failure to report to its current insurance company, during the current policy period, either any claim made against any insured, or any act or omission known to any insured that may reasonably be expected to be the basis of a claim against any insured may create a lack of coverage.\n\nAny attorney currently or formerly affiliated with the firm or any predecessor firm, has disclosed in this Application any actual or alleged, act, omission, circumstance or breach of duty that a reasonable attorney would recognize might reasonably be expected to result in a claim being made against the firm, any predecessor firm, or any attorney currently or formerly affiliated with the firm or any predecessor firm, regardless of whether any such claim would be meritorious.\n\nApplicant hereby authorizes the release of claim information to the Company from any current or prior insurer of the Applicant.",
          { tone: 'plain' },
        ),
        note(
          'fraudNotice',
          'FRAUD NOTICE — WHERE APPLICABLE UNDER THE LAW OF YOUR STATE\n\nAny person who knowingly and with intent to defraud any insurance company or other person files an application for insurance or statement of claim containing any materially false information, or conceals for the purpose of misleading, information concerning any fact material thereto, commits a fraudulent insurance act, which is a crime AND MAY BE SUBJECT TO CIVIL FINES AND CRIMINAL PENALTIES (for New York residents only: and shall also be subject to a civil penalty not to exceed five thousand dollars and the stated value of the claim for each such violation.) (For Pennsylvania Residents only: Any person who knowingly and with intent to injure or defraud any insurer files an application or claim containing any false, incomplete or misleading information shall, upon conviction, be subject to imprisonment for up to seven years and payment of a fine of up to $15,000.) (For Tennessee Residents only: Penalties include imprisonment, fines and denial of insurance benefits.)',
          { tone: 'warn' },
        ),
        { type: 'signature', name: 'signature', label: 'Signature of Officer or Partner of the Firm', required: true, sensitive: true },
        { type: 'text', name: 'signatoryFirstName', label: 'First Name of Signatory Officer or Partner', required: true, width: 'half', hubspot: 'firstname' },
        { type: 'text', name: 'signatoryLastName', label: 'Last Name of Signatory Officer or Partner', required: true, width: 'half', hubspot: 'lastname' },
        { type: 'date', name: 'signatureDate', label: 'Date', required: true, defaultToday: true, width: 'half' },
      ],
    },
  ],
};
