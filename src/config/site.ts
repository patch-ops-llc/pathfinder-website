export const site = {
  name: 'Pathfinder/LL&D Insurance Group',
  shortName: 'Pathfinder/LL&D',
  legalName: 'Pathfinder LL&D Insurance Group, LLC',
  tagline: 'Find your path.',
  description:
    'Pathfinder/LL&D Insurance Group has guided businesses and families to field-tested insurance solutions since 1913. Based in Houston, Texas, our brokers serve clients across the country with coverage for energy, real estate, contractors, professional services, non-profits, employee benefits, high-value homes, autos and collections.',
  foundingYear: 1913,
  phone: { display: '(281) 556-9999', tel: '+12815569999' },
  otherPhones: [
    { display: '800-211-0317', tel: '+18002110317' },
    { display: '210-298-4777', tel: '+12102984777' },
    { display: '512-335-3535', tel: '+15123353535' },
  ],
  address: {
    street: '12141 Wickchester Lane, Suite 500',
    city: 'Houston',
    region: 'TX',
    regionName: 'Texas',
    postalCode: '77079',
    country: 'US',
  },
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=12141+Wickchester+Lane+Suite+500+Houston+TX+77079',
  paymentsMail: {
    name: 'Pathfinder LL&D Accounts Receivable',
    line1: 'P.O. Box 441587',
    line2: 'Houston, TX 77244',
  },
  epayUrl: 'https://pathfinderlld.epaypolicy.com/',
  social: {
    facebook: 'https://www.facebook.com/pathfinderlld',
    linkedin: 'https://www.linkedin.com/company/pathfinder-ll&d-insurance-group',
  },
  incidentNotice: {
    label: 'Notice of Data Security Incident',
    href: '/notice-of-data-security-incident/',
  },
} as const;

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  href?: string;
  items: NavItem[];
}

export const nav: NavGroup[] = [
  {
    label: 'Businesses',
    href: '/businesses/',
    items: [
      { label: 'Contractors Insurance', href: '/contractors-insurance/', description: 'Contract review, safety programs, certificates' },
      { label: 'Energy Insurance', href: '/energy-insurance/', description: 'Oil and gas property, liability, well control' },
      { label: 'Non-Profit Insurance', href: '/non-profit-insurance/', description: 'Programs for 501(c)(3) organizations' },
      { label: 'Professional Services Insurance', href: '/professional-services-insurance/', description: 'Law firms, agencies, engineers, accountants' },
      { label: 'Real Estate Insurance', href: '/real-estate-insurance/', description: 'Multifamily and commercial portfolios' },
      { label: 'Employee Benefits', href: '/employee-benefits-plans/', description: 'Group health, ancillary, compliance, HR' },
    ],
  },
  {
    label: 'Home and Auto',
    href: '/home-and-auto/',
    items: [
      { label: 'Home and Auto Insurance', href: '/home-and-auto-insurance/', description: 'High-value homes, vehicles, watercraft' },
      { label: 'Collections Insurance', href: '/collections-insurance/', description: 'Wine, fine art, minerals, memorabilia' },
      { label: 'Home Quote', href: '/home-insurance-quote/', description: 'Start a homeowners quote online' },
      { label: 'Auto Quote', href: '/auto-quote/', description: 'Start an auto quote online' },
    ],
  },
  {
    label: 'Resources',
    href: '/resources/',
    items: [
      { label: 'Careers', href: '/careers/', description: 'Apply to join our team' },
      { label: 'Make a Payment', href: '/make-a-payment/', description: 'Online, check draft, phone or mail' },
      { label: 'Professional Liability Quote', href: '/professional-liability-quote/', description: "Lawyers' professional liability application" },
    ],
  },
];

export const navLinks: NavItem[] = [{ label: 'Our Team', href: '/our-team/' }];

export const footerLinks: NavItem[] = [
  { label: 'Businesses', href: '/businesses/' },
  { label: 'Home and Auto', href: '/home-and-auto/' },
  { label: 'Home Quote', href: '/home-insurance-quote/' },
  { label: 'Auto Quote', href: '/auto-quote/' },
  { label: 'Make a Payment', href: '/make-a-payment/' },
  { label: 'Careers', href: '/careers/' },
];
