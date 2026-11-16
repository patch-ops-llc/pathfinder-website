import { features } from '../../config/features.ts';
import type { Field, FormDef } from '../types.ts';
import { address, is, note, yesNo } from './helpers.ts';

const ssn: Field[] = features.collectSsnOnCareersForm
  ? [
      {
        type: 'secret',
        name: 'ssn',
        label: 'Social security number',
        required: true,
        sensitive: true,
        inputMode: 'numeric',
        maxLength: 11,
        pattern: '^\\d{3}-?\\d{2}-?\\d{4}$',
        patternMessage: 'Enter the nine digits of the number.',
        help: 'Sent to our hiring team only. It is not stored on this website.',
        width: 'half',
      },
    ]
  : [];

export const careers: FormDef = {
  id: 'careers',
  name: 'Application for Employment',
  envKey: 'CAREERS',
  hubspotSummary: true,
  // Resume, signature and personal details are delivered by email only.
  emailRequired: true,
  draft: true,
  submitLabel: 'Submit Your Application',
  success: {
    title: 'Thank you for applying.',
    message: 'We have received your application. Our team will review it and contact you if there is a fit.',
  },
  contact: { email: 'email', firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  steps: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { type: 'text', name: 'firstName', label: 'First Name', required: true, autocomplete: 'given-name', width: 'half', hubspot: 'firstname' },
        { type: 'text', name: 'lastName', label: 'Last Name', required: true, autocomplete: 'family-name', width: 'half', hubspot: 'lastname' },
        { type: 'email', name: 'email', label: 'Email', required: true, autocomplete: 'email', width: 'half', hubspot: 'email' },
        { type: 'tel', name: 'phone', label: 'Phone number', required: true, autocomplete: 'tel', width: 'half', hubspot: 'phone' },
        ...ssn,
        ...address({ prefix: 'address', required: true, autofill: true, line1Label: 'Current address' }),
        yesNo('workAuthorized', 'Are you legally authorized to work in the United States?', { required: true, columns: 2 }),
        yesNo('felony', 'Have you ever been convicted of a felony?', { required: true, columns: 2, sensitive: true }),
      ],
    },
    {
      id: 'desired',
      title: 'Employment Desired',
      fields: [
        { type: 'text', name: 'position', label: 'Position desired', required: true, width: 'half' },
        { type: 'text', name: 'salaryDesired', label: 'Salary desired', required: true, maxLength: 60, width: 'half' },
        { type: 'date', name: 'startDate', label: 'Date you can start', required: true, width: 'half' },
        { type: 'text', name: 'source', label: 'How did you learn about this opening?', required: true, width: 'half' },
      ],
    },
    {
      id: 'education',
      title: 'Education and Training',
      fields: [
        note(
          'schoolsNote',
          'Be sure to enter number of years completed into the Years field, NOT the actual date that you graduated or range of years during which you attended.',
        ),
        {
          type: 'repeater',
          name: 'schools',
          label: 'Schools attended',
          itemLabel: 'School',
          min: 1,
          max: 6,
          addLabel: 'Add another school',
          fields: [
            { type: 'text', name: 'school', label: 'School', width: 'half' },
            { type: 'text', name: 'degree', label: 'Degree', width: 'half' },
            { type: 'text', name: 'cityState', label: 'City and State', width: 'half' },
            { type: 'number', name: 'years', label: 'Years', min: 0, max: 30, width: 'half' },
          ],
        },
        {
          type: 'checkbox-group',
          name: 'licenses',
          label: 'Which insurance licenses do you hold (if any)?',
          options: ['Property and casualty', 'Life and health', 'Other'],
          columns: 3,
        },
        { type: 'text', name: 'licensesOther', label: 'Other insurance license', showIf: { field: 'licenses', includes: 'Other' } },
        {
          type: 'checkbox-group',
          name: 'designations',
          label: 'Which insurance professional designations do you hold (if any)?',
          options: ['CPCU', 'CIC', 'ARM', 'ACSR', 'CLU', 'CISR', 'AAI', 'CPS', 'Other'],
          columns: 3,
        },
        { type: 'text', name: 'designationsOther', label: 'Other professional designation', showIf: { field: 'designations', includes: 'Other' } },
        { type: 'text', name: 'licenseNumber', label: 'Insurance license number and state:' },
        { type: 'textarea', name: 'courses', label: 'List any insurance courses you are currently taking:', rows: 3 },
      ],
    },
    {
      id: 'history',
      title: 'Employment History',
      fields: [
        note(
          'employersNote',
          "Please list your previous employers from most recent to least recent. If you can't recall the exact day you were hired, use the first of the month as a placeholder.",
        ),
        {
          type: 'repeater',
          name: 'employers',
          label: 'Previous employers',
          itemLabel: 'Employer',
          min: 1,
          max: 3,
          addLabel: 'Add more work experience',
          fields: [
            { type: 'date', name: 'from', label: 'Employed from', required: true, range: 'past', width: 'half' },
            { type: 'date', name: 'to', label: 'Employed to', required: true, width: 'half' },
            { type: 'text', name: 'employer', label: 'Employer name', required: true, width: 'half' },
            { type: 'text', name: 'contact', label: 'Email / phone number', width: 'half' },
            { type: 'text', name: 'position', label: 'Position', required: true, width: 'half' },
            { type: 'text', name: 'salary', label: 'Salary', required: true, maxLength: 60, width: 'half' },
            { type: 'text', name: 'reasonForLeaving', label: 'Reason for leaving', required: true },
            yesNo('mayContact', 'May we contact this employer?', { required: true, columns: 2 }),
          ],
        },
      ],
    },
    {
      id: 'references',
      title: 'References & Authorization',
      fields: [
        note('referencesNote', 'Please list up to three professional references.'),
        {
          type: 'repeater',
          name: 'references',
          label: 'References',
          itemLabel: 'Reference',
          min: 1,
          max: 3,
          addLabel: 'Add another reference',
          fields: [
            { type: 'text', name: 'name', label: 'Name', required: true, width: 'half' },
            { type: 'text', name: 'company', label: 'Company', width: 'half' },
            { type: 'email', name: 'email', label: 'Email', width: 'half' },
            { type: 'tel', name: 'phone', label: 'Phone', width: 'half' },
          ],
        },
        yesNo('hasResume', 'Do you have a resume you would like to upload?', { required: true, columns: 2 }),
        {
          type: 'file',
          name: 'resume',
          label: 'Upload your resume',
          extensions: ['pdf', 'doc', 'docx', 'rtf', 'txt'],
          showIf: is('hasResume', 'Yes'),
        },
        {
          type: 'consent',
          name: 'agreement',
          label: 'Applicant statement',
          required: true,
          checkboxLabel: 'I have read and agree to the above statement.',
          text: 'Public law 91-508 requires that we advise you that an investigative consumer report may be made during our initial or subsequent processing of your employment application which will provide applicable information concerning your character, general reputation, personal characteristics and mode of living. Further information as to the nature and scope of such a report, if one is made, is available upon written request to our office.\n\nI certify that the answers given by me to all of the questions on this application and any attachments are to the best of my knowledge and belief true and correct and that I have not knowingly withheld any pertinent facts or circumstances. I understand that any omission or misrepresentation of facts in this application may result in refusal of or separation from employment upon discovery thereof.\n\nI hereby authorize Pathfinder LL&D Insurance Group, LLC to make any investigation of my background deemed necessary. I further authorize all persons, schools, companies, corporations, credit bureaus, and law enforcement agencies to supply all information concerning my background and to furnish reports thereon and I hereby release them and Pathfinder LL&D Insurance Group, LLC from any and all liability and responsibility arising from their doing so.\n\nI understand that employment is contingent upon passing a drug test and that if employed, the first ninety days of my employment will be on a probationary basis.',
        },
        { type: 'signature', name: 'signature', label: 'Signature', sensitive: true },
      ],
    },
  ],
};
