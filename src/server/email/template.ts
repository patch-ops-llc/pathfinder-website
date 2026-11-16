import { summaryText, type Contact, type SummarySection } from '../../forms/logic.ts';

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Collapse to one printable line so user input can never add email headers. */
export const headerSafe = (s: string, max = 120) =>
  s
    .replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export interface AlertInput {
  formName: string;
  submissionId: string;
  submittedAt: Date;
  pageUrl: string;
  contact: Contact;
  sections: SummarySection[];
  attachmentNames: string[];
  /** Per-destination outcome notes, e.g. "HubSpot: sent". */
  notes?: string[];
}

export function alertSubject({ formName, contact }: Pick<AlertInput, 'formName' | 'contact'>): string {
  const who = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const parts = [`New website submission: ${formName}`];
  if (who) parts.push(who);
  if (contact.company) parts.push(contact.company);
  return headerSafe(parts.join(' | '), 200);
}

const when = (d: Date) =>
  d.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }) + ' Central';

export function alertText(input: AlertInput): string {
  const lines = [
    `New website submission: ${input.formName}`,
    `Received: ${when(input.submittedAt)}`,
    `Page: ${input.pageUrl}`,
    `Reference: ${input.submissionId}`,
    '',
    summaryText(input.sections, { redact: false }),
  ];
  if (input.attachmentNames.length) lines.push('', `Attachments: ${input.attachmentNames.join(', ')}`);
  if (input.notes?.length) lines.push('', ...input.notes);
  return lines.join('\n');
}

export function alertHtml(input: AlertInput): string {
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const row = (label: string, value: string, multiline?: boolean) =>
    `<tr><td style="${font}padding:8px 12px 8px 0;vertical-align:top;width:42%;color:#52607a;font-size:13px;line-height:19px;border-bottom:1px solid #edf1f6;">${escapeHtml(
      label,
    )}</td><td style="${font}padding:8px 0;vertical-align:top;color:#0a1628;font-size:14px;line-height:20px;border-bottom:1px solid #edf1f6;${
      multiline ? 'white-space:pre-wrap;' : ''
    }word-break:break-word;">${escapeHtml(value)}</td></tr>`;

  let body = '';
  const showSectionTitles = input.sections.length > 1;
  for (const section of input.sections) {
    if (showSectionTitles) {
      body += `<tr><td colspan="2" style="${font}padding:26px 0 8px;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#0051a0;border-bottom:2px solid #0051a0;">${escapeHtml(
        section.title,
      )}</td></tr>`;
    }
    for (const group of section.groups) {
      if (group.title) {
        body += `<tr><td colspan="2" style="${font}padding:16px 0 4px;font-size:14px;font-weight:700;color:#0a1628;">${escapeHtml(group.title)}</td></tr>`;
      }
      for (const r of group.rows) body += row(r.label, r.value, r.multiline);
    }
  }

  const who = [input.contact.firstName, input.contact.lastName].filter(Boolean).join(' ');
  const meta = [
    who ? `<strong style="color:#ffffff;">${escapeHtml(who)}</strong>` : '',
    input.contact.company ? escapeHtml(input.contact.company) : '',
    input.contact.email ? `<a href="mailto:${escapeHtml(input.contact.email)}" style="color:#9fd8ff;">${escapeHtml(input.contact.email)}</a>` : '',
    input.contact.phone ? escapeHtml(input.contact.phone) : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;&middot;&nbsp; ');

  const attachments = input.attachmentNames.length
    ? `<p style="${font}margin:22px 0 0;font-size:13px;line-height:20px;color:#52607a;"><strong style="color:#0a1628;">Attachments:</strong> ${input.attachmentNames
        .map(escapeHtml)
        .join(', ')}</p>`
    : '';
  const notes = input.notes?.length
    ? `<p style="${font}margin:14px 0 0;font-size:12px;line-height:18px;color:#7a869c;">${input.notes.map(escapeHtml).join('<br>')}</p>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.formName)}</title></head>
<body style="margin:0;padding:0;background:#f3f7fc;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7fc;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dfe7f1;">
<tr><td style="background:#061a33;padding:24px 28px;">
<p style="${font}margin:0;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:#45bdff;">New website submission</p>
<p style="${font}margin:6px 0 0;font-size:21px;line-height:27px;font-weight:700;color:#ffffff;">${escapeHtml(input.formName)}</p>
${meta ? `<p style="${font}margin:10px 0 0;font-size:13px;line-height:20px;color:#c6d6ea;">${meta}</p>` : ''}
</td></tr>
<tr><td style="padding:10px 28px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
${attachments}
<p style="${font}margin:22px 0 0;font-size:12px;line-height:18px;color:#7a869c;">Received ${escapeHtml(when(input.submittedAt))}<br>Page: ${escapeHtml(
    input.pageUrl,
  )}<br>Reference: ${escapeHtml(input.submissionId)}</p>
${notes}
</td></tr>
</table>
<p style="${font}margin:14px 0 0;font-size:11px;line-height:16px;color:#8d99ad;">Sent by the Pathfinder/LL&amp;D website. Reply to this email to answer the sender directly.</p>
</td></tr></table>
</body></html>`;
}
