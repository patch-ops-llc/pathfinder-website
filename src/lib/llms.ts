// Plain-text summaries of the site for language models (llmstxt.org).
// Everything here is derived from the same content modules the pages use.

import { site } from '../config/site.ts';
import { homeFaqs, paymentFaqs, quoteFaqs } from '../content/faqs.ts';
import { lines } from '../content/lines.ts';
import { team, teamIntro } from '../content/team.ts';
import { routes, type Route } from './routes.ts';

const address = `${site.address.street}, ${site.address.city}, ${site.address.regionName} ${site.address.postalCode}`;

function header(): string[] {
  return [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `- Founded: ${site.foundingYear}`,
    `- Office: ${address}`,
    `- Phone: ${site.phone.display} (also ${site.otherPhones.map((p) => p.display).join(', ')})`,
    `- Payments by mail: ${site.paymentsMail.name}, ${site.paymentsMail.line1}, ${site.paymentsMail.line2}`,
    `- Online payments: ${site.epayUrl}`,
    `- Service area: based in Texas, serving people and businesses across the United States`,
    '',
  ];
}

export function llmsTxt(base: URL): string {
  const url = (path: string) => new URL(path, base).toString();
  const out = header();
  const sections: Route['section'][] = ['Main', 'Business insurance', 'Personal insurance', 'Quotes and forms', 'Company'];
  for (const section of sections) {
    out.push(`## ${section}`, '');
    for (const r of routes.filter((x) => x.section === section)) out.push(`- [${r.title}](${url(r.path)}): ${r.summary}`);
    out.push('');
  }
  out.push('## Optional', '', `- [Full text of the site for language models](${url('/llms-full.txt')}): coverage details, questions and answers, team and contact information in one file.`, '');
  return out.join('\n');
}

export function llmsFullTxt(base: URL): string {
  const url = (path: string) => new URL(path, base).toString();
  const out = header();

  out.push('## About', '', teamIntro, '');

  out.push('## Insurance coverage', '');
  for (const l of lines) {
    out.push(`### ${l.heading}`, '', `Page: ${url(l.path)}`, `For: ${l.group === 'business' ? 'businesses and organizations' : 'individuals and families'}`, '', l.intro, '');
    for (const f of l.features) out.push(f.body ? `- ${f.title}: ${f.body}` : `- ${f.title}`);
    out.push('');
    for (const f of l.faqs) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');
  }

  out.push('## Getting a quote', '');
  out.push(`- Home Quote: ${url('/home-insurance-quote/')}`, `- Auto Quote: ${url('/auto-quote/')}`, `- Lawyers' Professional Liability Quote: ${url('/professional-liability-quote/')}`, `- All options: ${url('/get-a-quote/')}`, '');
  for (const f of quoteFaqs) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');

  out.push('## Making a payment', '', `Page: ${url('/make-a-payment/')}`, '');
  for (const f of paymentFaqs) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');

  out.push('## General questions', '');
  for (const f of homeFaqs) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');

  out.push('## Team', '', `Page: ${url('/our-team/')}`, '');
  for (const m of team) out.push(`- ${m.name}${m.credentials ? `, ${m.credentials}` : ''}: ${m.title}`);
  out.push('');

  out.push('## Careers', '', `Apply online with the application for employment: ${url('/careers/')}`, '');

  out.push(
    '## Notice of data security incident',
    '',
    `Pathfinder LL&D Insurance Group posted a notice of a data security incident on July 29, 2026. The full notice, including the dedicated response line (855-726-7360, Monday through Friday, 9:00 a.m. to 9:00 p.m. Eastern time, excluding holidays), is at ${url(site.incidentNotice.href)}. Refer to that page for the authoritative wording.`,
    '',
  );
  return out.join('\n');
}
