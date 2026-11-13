import { IMAGE_EXTENSIONS } from '../constants.ts';
import type { FormDef } from '../types.ts';
import { note } from './helpers.ts';

export const checkDraft: FormDef = {
  id: 'check-draft',
  name: 'Check Draft Authorization',
  envKey: 'CHECK_DRAFT',
  hubspotSummary: true,
  // The check image and signature are delivered by email only.
  emailRequired: true,
  submitLabel: 'Submit',
  success: {
    title: 'Thank you. Your check draft authorization was received.',
    message: 'Our accounting team will process your payment. Please contact your Account Manager if you have any questions.',
  },
  contact: { email: 'email', firstName: 'firstName', lastName: 'lastName', phone: 'phone' },
  steps: [
    {
      id: 'authorization',
      title: 'Pathfinder Check Draft Authorization Form',
      fields: [
        { type: 'text', name: 'firstName', label: 'First Name', required: true, autocomplete: 'given-name', width: 'half', hubspot: 'firstname' },
        { type: 'text', name: 'lastName', label: 'Last Name', required: true, autocomplete: 'family-name', width: 'half', hubspot: 'lastname' },
        {
          type: 'email',
          name: 'email',
          label: 'Email',
          required: true,
          autocomplete: 'email',
          width: 'half',
          hubspot: 'email',
          help: 'So we can confirm receipt or reach you about this payment.',
        },
        { type: 'tel', name: 'phone', label: 'Phone number', autocomplete: 'tel', width: 'half', hubspot: 'phone' },
        { type: 'text', name: 'policyNumber', label: 'Policy Number', required: true, maxLength: 60, width: 'third' },
        { type: 'text', name: 'checkNumber', label: 'Check Number', required: true, maxLength: 30, inputMode: 'numeric', width: 'third' },
        { type: 'currency', name: 'paymentAmount', label: 'Payment Amount', required: true, min: 0.01, max: 10_000_000, width: 'third' },
        {
          type: 'file',
          name: 'checkImage',
          label: 'Upload an image or scan of your check here.',
          help: 'Please be sure to sign the check before uploading.',
          required: true,
          sensitive: true,
          maxFiles: 2,
          extensions: [...IMAGE_EXTENSIONS],
        },
        note(
          'authorization',
          'I authorize Pathfinder LL&D Insurance Group, LLC to use the attached copy of my check as a check draft. This draft will be debited automatically from my account. I understand that I presently have these funds available in my account to process this draft. This is to be done on a one-time only basis.',
          { tone: 'plain' },
        ),
        { type: 'signature', name: 'signature', label: 'Signature', required: true, sensitive: true },
        { type: 'date', name: 'date', label: 'Date', required: true, defaultToday: true, width: 'half' },
      ],
    },
  ],
};
