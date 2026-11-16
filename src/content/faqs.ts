// Site-level questions and answers. Every answer restates facts already
// published on the site; nothing here introduces a new claim.

import { site } from '../config/site.ts';
import type { Faq } from './lines.ts';

const address = `${site.address.street}, ${site.address.city}, ${site.address.regionName} ${site.address.postalCode}`;

export const homeFaqs: Faq[] = [
  {
    q: 'What is Pathfinder/LL&D Insurance Group?',
    a: 'Pathfinder/LL&D Insurance Group is a team of seasoned insurance brokers and service representatives based in Houston, Texas. Since 1913 we have been guiding clients through the best and worst of times with field-tested insurance solutions.',
  },
  {
    q: 'What types of insurance does Pathfinder/LL&D offer?',
    a: 'For businesses: energy, professional services, real estate, contractors and non-profit insurance, plus employee benefits. For individuals and families: high-value home and auto insurance and coverage for collections such as wine, fine art and minerals.',
  },
  {
    q: 'Where is Pathfinder/LL&D located?',
    a: `Our office is at ${address}. You can reach us at ${site.phone.display}.`,
  },
  {
    q: 'Does Pathfinder/LL&D only work with clients in Texas?',
    a: 'No. We got our start in Texas, but we serve people and businesses across the country.',
  },
  {
    q: 'How do I get an insurance quote?',
    a: `Start a Home Quote, an Auto Quote or a Lawyers' Professional Liability Quote online, complete a "Let's Talk" form on any coverage page, or call ${site.phone.display}.`,
  },
  {
    q: 'How do I make a payment?',
    a: `You can pay online by credit card or ACH through our secure ePay portal, submit a check draft authorization, call your Account Manager, or mail a check or money order to ${site.paymentsMail.name}, ${site.paymentsMail.line1}, ${site.paymentsMail.line2}.`,
  },
];

export const paymentFaqs: Faq[] = [
  {
    q: 'How can I pay my Pathfinder/LL&D insurance premium?',
    a: 'There are four ways to pay: online by credit card or ACH through our secure ePay portal, by check draft authorization, by phone with your Account Manager, or by mail.',
  },
  {
    q: 'What is a check draft authorization?',
    a: 'Paying using a check draft authorization is quicker and more convenient than having to mail us a check. You complete a secure form and attach an image or scan of your signed check, and we use it as a one-time check draft.',
  },
  {
    q: 'Where do I mail a payment?',
    a: `Mail your check or money order to ${site.paymentsMail.name}, ${site.paymentsMail.line1}, ${site.paymentsMail.line2}. Please include your name and policy number.`,
  },
  {
    q: 'Who can I call about a payment?',
    a: `Contact your Account Manager by phone to discuss payment options. You can also call ${[site.phone.display.replace(/[()]/g, '').replace(' ', '-'), ...site.otherPhones.map((p) => p.display)].join(', ')} for assistance.`,
  },
];

export const quoteFaqs: Faq[] = [
  {
    q: 'Which quotes can I start online?',
    a: "You can start a Homeowners Quote, an Auto Quote and a Lawyers' Professional Liability Quote online. For every other line of coverage, complete a \"Let's Talk\" form and our team will follow up.",
  },
  {
    q: 'What happens after I submit a quote request?',
    a: "Once you've verified your information and submitted the form, we'll get in touch as soon as possible.",
  },
  {
    q: 'Can I talk to someone instead of filling in a form?',
    a: `Yes. Call us at ${site.phone.display}.`,
  },
];
