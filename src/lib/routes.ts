// The indexable pages of the site, in one place, for the sitemap and llms.txt.

import { lines } from '../content/lines.ts';

export interface Route {
  path: string;
  title: string;
  summary: string;
  section: 'Main' | 'Business insurance' | 'Personal insurance' | 'Quotes and forms' | 'Company';
  priority: number;
  changefreq: 'weekly' | 'monthly' | 'yearly';
}

export const routes: Route[] = [
  { path: '/', title: 'Home', summary: 'Who Pathfinder/LL&D is, what we cover and how to reach us.', section: 'Main', priority: 1, changefreq: 'weekly' },
  {
    path: '/businesses/',
    title: 'Businesses',
    summary: 'Overview of insurance for businesses: energy, professional services, real estate, contractors, non-profits and employee benefits.',
    section: 'Main',
    priority: 0.9,
    changefreq: 'monthly',
  },
  {
    path: '/home-and-auto/',
    title: 'Home and Auto',
    summary: 'Overview of insurance for individuals and families: high-value home and auto, and collections.',
    section: 'Main',
    priority: 0.9,
    changefreq: 'monthly',
  },
  ...lines.map(
    (l): Route => ({
      path: l.path,
      title: l.heading,
      summary: l.blurb,
      section: l.group === 'business' ? 'Business insurance' : 'Personal insurance',
      priority: 0.8,
      changefreq: 'monthly',
    }),
  ),
  { path: '/get-a-quote/', title: 'Get a Quote', summary: 'All the ways to start a quote online or talk to the team.', section: 'Quotes and forms', priority: 0.8, changefreq: 'monthly' },
  { path: '/home-insurance-quote/', title: 'Home Quote', summary: 'Online homeowners insurance quote request.', section: 'Quotes and forms', priority: 0.8, changefreq: 'monthly' },
  { path: '/auto-quote/', title: 'Auto Quote', summary: 'Online auto insurance quote request.', section: 'Quotes and forms', priority: 0.8, changefreq: 'monthly' },
  {
    path: '/professional-liability-quote/',
    title: 'Professional Liability Quote',
    summary: "Online Lawyers' Professional Liability insurance application for law firms.",
    section: 'Quotes and forms',
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/make-a-payment/',
    title: 'Make a Payment',
    summary: 'Pay online through the ePay portal, by check draft authorization, by phone or by mail.',
    section: 'Quotes and forms',
    priority: 0.7,
    changefreq: 'yearly',
  },
  {
    path: '/make-a-payment/check-draft/',
    title: 'Check Draft Authorization',
    summary: 'Secure form to authorize a one-time check draft payment.',
    section: 'Quotes and forms',
    priority: 0.5,
    changefreq: 'yearly',
  },
  { path: '/our-team/', title: 'Our Team', summary: 'The owners, executives and specialists at Pathfinder/LL&D.', section: 'Company', priority: 0.7, changefreq: 'monthly' },
  { path: '/careers/', title: 'Careers', summary: 'Online application for employment.', section: 'Company', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact/', title: 'Contact', summary: 'Phone numbers, office address and a contact form.', section: 'Company', priority: 0.7, changefreq: 'yearly' },
  { path: '/resources/', title: 'Resources', summary: 'Links to quotes, payments and careers.', section: 'Company', priority: 0.5, changefreq: 'yearly' },
  {
    path: '/notice-of-data-security-incident/',
    title: 'Notice of Data Security Incident',
    summary: 'Notice posted July 29, 2026 about a data security incident, with the dedicated response line and protective steps.',
    section: 'Company',
    priority: 0.6,
    changefreq: 'yearly',
  },
  { path: '/attribution/', title: 'Attribution', summary: 'Credits for photography, typography and software.', section: 'Company', priority: 0.2, changefreq: 'yearly' },
];
