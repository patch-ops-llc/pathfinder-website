import { site } from '../config/site.ts';
import type { Faq, Line } from '../content/lines.ts';
import type { TeamMember } from '../content/team.ts';

export type JsonLd = Record<string, unknown>;

const abs = (base: URL | string, path: string) => new URL(path, base).toString();

export const orgId = (base: URL | string) => abs(base, '/#organization');
export const websiteId = (base: URL | string) => abs(base, '/#website');

export function organizationSchema(base: URL | string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': ['InsuranceAgency', 'Organization'],
    '@id': orgId(base),
    name: site.name,
    legalName: site.legalName,
    alternateName: ['Pathfinder LL&D', 'Pathfinder Insurance', 'Pathfinder/LL&D'],
    url: abs(base, '/'),
    logo: abs(base, '/logo.png'),
    image: abs(base, '/og-default.png'),
    description: site.description,
    slogan: site.tagline,
    foundingDate: String(site.foundingYear),
    telephone: site.phone.tel,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    areaServed: { '@type': 'Country', name: 'United States' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: site.phone.tel,
        contactType: 'customer service',
        areaServed: 'US',
        availableLanguage: 'English',
      },
      ...site.otherPhones.map((p) => ({
        '@type': 'ContactPoint',
        telephone: p.tel,
        contactType: 'customer service',
        areaServed: 'US',
      })),
    ],
    sameAs: [site.social.facebook, site.social.linkedin],
    knowsAbout: [
      'Energy insurance',
      'Real estate insurance',
      'Contractors insurance',
      'Professional liability insurance',
      'Non-profit insurance',
      'Employee benefits',
      'Homeowners insurance',
      'Auto insurance',
      'Collections insurance',
    ],
  };
}

export function websiteSchema(base: URL | string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(base),
    url: abs(base, '/'),
    name: site.name,
    description: site.description,
    publisher: { '@id': orgId(base) },
    inLanguage: 'en-US',
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(base: URL | string, crumbs: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(base, c.path),
    })),
  };
}

export function faqSchema(faqs: Faq[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function serviceSchema(base: URL | string, line: Line): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': abs(base, `${line.path}#service`),
    name: line.heading,
    serviceType: line.serviceType,
    description: line.intro,
    url: abs(base, line.path),
    provider: { '@id': orgId(base) },
    areaServed: { '@type': 'Country', name: 'United States' },
    audience: {
      '@type': 'Audience',
      audienceType: line.group === 'business' ? 'Businesses' : 'Individuals and families',
    },
  };
}

export function webPageSchema(
  base: URL | string,
  page: { path: string; title: string; description: string; type?: string },
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': page.type ?? 'WebPage',
    '@id': abs(base, `${page.path}#webpage`),
    url: abs(base, page.path),
    name: page.title,
    description: page.description,
    isPartOf: { '@id': websiteId(base) },
    about: { '@id': orgId(base) },
    inLanguage: 'en-US',
  };
}

export function personSchema(base: URL | string, m: TeamMember): JsonLd {
  return {
    '@type': 'Person',
    name: m.name,
    jobTitle: m.title,
    ...(m.credentials ? { honorificSuffix: m.credentials } : {}),
    worksFor: { '@id': orgId(base) },
    ...(m.linkedin ? { sameAs: [m.linkedin] } : {}),
  };
}
