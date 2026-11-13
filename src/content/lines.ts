// Line-of-business content. Body copy is carried over verbatim from the
// previous site; FAQ answers restate that copy and add nothing new.

export interface LineFeature {
  title: string;
  body?: string;
  icon: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Line {
  slug: string;
  path: string;
  group: 'business' | 'personal';
  /** Short label used on cards and in navigation. */
  name: string;
  /** Page <h1>. */
  heading: string;
  /** <title> text, without the site suffix. */
  title: string;
  metaDescription: string;
  /** Short blurb shown on the home page and hub cards. */
  blurb: string;
  /** Lead paragraph on the detail page. */
  intro: string;
  features: LineFeature[];
  formId: string;
  formHeading: string;
  cardImage: string;
  heroImage: string;
  imageAlt: string;
  icon: string;
  serviceType: string;
  cta?: { label: string; href: string }[];
  faqs: Faq[];
}

const talk = (subject: string) =>
  `Complete the "Let's Talk" form on this page or call (281) 556-9999. A Pathfinder/LL&D ${subject} will follow up with you.`;

export const lines: Line[] = [
  {
    slug: 'energy',
    path: '/energy-insurance/',
    group: 'business',
    name: 'Energy',
    heading: 'Energy Insurance',
    title: 'Energy Insurance for Oil and Gas Companies',
    metaDescription:
      'Energy insurance from oil and gas specialists: business property, well control, workers’ compensation, commercial vehicles, equipment, pollution and liability coverage.',
    blurb:
      'If you’re in the energy industry, our oil and gas specialists will discuss your exposures and offer solutions for business property, well control, workers’ compensation, commercial vehicles, equipment, and liability.',
    intro:
      'Our team of energy specialists will review and optimize your energy insurance solution. We’ve used decades of experience and a suite of field-tested solutions to balance coverage with cost for companies in almost every sector of the energy industry.',
    features: [
      {
        title: 'Property',
        icon: 'home',
        body: 'We analyze your property exposures and build a policy that mitigates the unique property risks associated with the energy industry.',
      },
      {
        title: 'Liability',
        icon: 'briefcase',
        body: 'Our liability coverage suite for the energy sector includes general liability, auto liability, excess liability, employment practices coverage, pollution, and workers’ compensation.',
      },
      {
        title: 'Supplemental',
        icon: 'compass',
        body: 'We analyze your property exposures and build a policy that mitigates the unique property risks associated with the energy industry.',
      },
    ],
    formId: 'lead-energy',
    formHeading: 'Find your path to better energy insurance',
    cardImage: 'energy',
    heroImage: 'energy-hero',
    imageAlt: 'Oil field worker in a hard hat operating a wellhead valve',
    icon: 'flame',
    serviceType: 'Energy insurance',
    faqs: [
      {
        q: 'What does energy insurance from Pathfinder/LL&D cover?',
        a: 'Our oil and gas specialists offer solutions for business property, well control, workers’ compensation, commercial vehicles, equipment, and liability. The liability suite for the energy sector includes general liability, auto liability, excess liability, employment practices coverage, pollution, and workers’ compensation.',
      },
      {
        q: 'Which energy companies does Pathfinder/LL&D work with?',
        a: 'We have used decades of experience and a suite of field-tested solutions to balance coverage with cost for companies in almost every sector of the energy industry.',
      },
      { q: 'How do I start an energy insurance review?', a: talk('energy specialist') },
    ],
  },
  {
    slug: 'professional-services',
    path: '/professional-services-insurance/',
    group: 'business',
    name: 'Professional Services',
    heading: 'Professional Services Insurance',
    title: 'Professional Services Insurance for Law Firms and Agencies',
    metaDescription:
      'Professional liability and risk management for law firms, medical billing and collection agencies, engineers, architects and accountants, from Pathfinder/LL&D.',
    blurb:
      'Firms that offer professional services require a particularly nuanced approach for proper insurance coverage and risk management.',
    intro:
      'Firms that offer professional services require a particularly nuanced approach for proper insurance coverage and risk management. We specialize in coverage for law firms and medical billing / collection agencies, but we also serve engineers, architects, accountants.',
    features: [
      {
        title: 'Serve',
        icon: 'handshake',
        body: 'We expedite the application process, assist with claims reporting and planning, strategically reduce your deductible, and advocate on your behalf in the event of a claim.',
      },
      {
        title: 'Plan',
        icon: 'map',
        body: 'We navigate and mitigate exclusions common to your particular field, such as alleged employee fraud, services rendered among employees, and conflicts of interest.',
      },
      {
        title: 'Adapt',
        icon: 'shield',
        body: 'We review emerging exposures related to increased integration of technology and confidential information, such as ransomware and social engineering.',
      },
    ],
    formId: 'lead-professional-services',
    formHeading: 'Find your path to better Professional Services insurance',
    cardImage: 'professional-services',
    heroImage: 'professional-services-hero',
    imageAlt: 'Gavel resting on an open law book',
    icon: 'scale',
    serviceType: 'Professional liability insurance',
    cta: [{ label: 'Lawyers’ professional liability quote', href: '/professional-liability-quote/' }],
    faqs: [
      {
        q: 'Which professional firms does Pathfinder/LL&D insure?',
        a: 'We specialize in coverage for law firms and medical billing / collection agencies, and we also serve engineers, architects and accountants.',
      },
      {
        q: 'How does Pathfinder/LL&D help when a professional liability claim happens?',
        a: 'We assist with claims reporting and planning, strategically reduce your deductible, and advocate on your behalf in the event of a claim.',
      },
      {
        q: 'Does Pathfinder/LL&D review cyber exposures such as ransomware?',
        a: 'Yes. We review emerging exposures related to increased integration of technology and confidential information, such as ransomware and social engineering.',
      },
      {
        q: 'Can a law firm apply for professional liability coverage online?',
        a: 'Yes. Law firms can complete the Lawyers’ Professional Liability Quote application on this site, or use the "Let’s Talk" form on this page to speak with us first.',
      },
    ],
  },
  {
    slug: 'real-estate',
    path: '/real-estate-insurance/',
    group: 'business',
    name: 'Real Estate',
    heading: 'Real Estate Insurance',
    title: 'Real Estate Insurance for Multifamily and Commercial Portfolios',
    metaDescription:
      'Property, liability and supplemental insurance for multifamily owners, operators and developers, covering coastal and non-coastal portfolios of every size.',
    blurb:
      'We tailor policies to fit precisely with the needs of multifamily and commercial portfolios. We’ll identify potential gaps in coverage, discuss current market offerings, and present a package that works for your budget.',
    intro:
      'Multifamily deals and management have lots of moving parts and stakeholders with different agendas. Our unique process involves close, systematic coordination among all these disparate players. We also don’t need to reinvent the wheel every time we write a new account — our product is unique, streamlined, and proven.',
    features: [
      {
        title: 'Property',
        icon: 'building',
        body: 'We protect small and large portfolios from the unique property risks that multifamily owners, operators, and developers face. We cover both coastal and non-coastal properties.',
      },
      {
        title: 'Liability',
        icon: 'briefcase',
        body: 'We provide liability coverage for all the major liability exposures that multifamily owners, operators, and developers commonly face. Our general and excess liability policies are field-tested and carefully optimized for the multifamily industry.',
      },
      {
        title: 'Supplemental',
        icon: 'compass',
        body: 'We also offer a variety of supplemental coverages that cover common risks to multifamily owners, operators, and developers: workers’ compensation, boiler and machinery breakdown, flood, commercial auto, and cyber liability.',
      },
    ],
    formId: 'lead-real-estate',
    formHeading: 'Find your path to better Real Estate insurance',
    cardImage: 'real-estate',
    heroImage: 'real-estate-hero',
    imageAlt: 'Modern multifamily apartment building under a blue sky',
    icon: 'building',
    serviceType: 'Real estate insurance',
    faqs: [
      {
        q: 'Does Pathfinder/LL&D insure multifamily properties on the coast?',
        a: 'Yes. We protect small and large portfolios and cover both coastal and non-coastal properties.',
      },
      {
        q: 'What liability coverage is available for multifamily owners and developers?',
        a: 'We provide coverage for all the major liability exposures that multifamily owners, operators, and developers commonly face. Our general and excess liability policies are field-tested and carefully optimized for the multifamily industry.',
      },
      {
        q: 'What supplemental coverages are offered for real estate portfolios?',
        a: 'Workers’ compensation, boiler and machinery breakdown, flood, commercial auto, and cyber liability.',
      },
      { q: 'How do I get a real estate insurance proposal?', a: talk('real estate specialist') },
    ],
  },
  {
    slug: 'contractors',
    path: '/contractors-insurance/',
    group: 'business',
    name: 'Contractors',
    heading: 'Contractors Insurance',
    title: 'Contractors Insurance and Risk Management',
    metaDescription:
      'Contractors insurance backed by over a century of combined experience: contract and indemnification review, workers’ compensation modifier analysis, safety programs and fast certificates.',
    blurb: 'Our team has over a century of combined experience serving contractors.',
    intro:
      'Our team has over a century of combined experience serving contractors. We have an intimate knowledge of the risks contractors have faced in the past, and we diligently observe and assess industry developments to anticipate risks in the future.',
    features: [
      {
        title: 'Optimization',
        icon: 'chart',
        body: 'We analyze your construction contracts, with a focus on insurance requirements and indemnification. We also review your workers’ compensation modifier to identify possible improvements.',
      },
      {
        title: 'Program Upgrades',
        icon: 'layers',
        body: 'We help you enhance your safety programs to reduce insurance cost. We also employ (when applicable) our specially-tailored programs for prime subcontractors.',
      },
      {
        title: 'Advocacy + Service',
        icon: 'handshake',
        body: 'In addition to prompt service for typical policy management, we advocate on your behalf in the event of a claim and expedite issuance of your insurance certificates.',
      },
    ],
    formId: 'lead-contractors',
    formHeading: 'Find your path to better Contractors insurance',
    cardImage: 'contractors',
    heroImage: 'contractors',
    imageAlt: 'Construction workers on a building frame at sunset',
    icon: 'hardhat',
    serviceType: 'Contractors insurance',
    faqs: [
      {
        q: 'How does Pathfinder/LL&D help contractors lower insurance cost?',
        a: 'We help you enhance your safety programs to reduce insurance cost, review your workers’ compensation modifier to identify possible improvements, and analyze your construction contracts with a focus on insurance requirements and indemnification.',
      },
      {
        q: 'Does Pathfinder/LL&D issue certificates of insurance for contractors?',
        a: 'Yes. In addition to prompt service for typical policy management, we expedite issuance of your insurance certificates and advocate on your behalf in the event of a claim.',
      },
      {
        q: 'Are there programs for subcontractors?',
        a: 'When applicable, we employ our specially-tailored programs for prime subcontractors.',
      },
      { q: 'How do I talk to a contractors insurance specialist?', a: talk('contractors specialist') },
    ],
  },
  {
    slug: 'non-profit',
    path: '/non-profit-insurance/',
    group: 'business',
    name: 'Non-Profits',
    heading: 'Non-Profit Insurance',
    title: 'Non-Profit Insurance for 501(c)(3) Organizations',
    metaDescription:
      'Insurance programs designed for 501(c)(3) organizations in Texas and beyond: churches, private schools, child care facilities and veteran support projects.',
    blurb: 'We will design an insurance program specifically for your 501(c)(3) organization.',
    intro:
      'We proudly serve the non-profit industry in Texas and beyond. Our field-tested programs have protected churches, private schools, child care facilities, and veteran support projects.',
    features: [
      {
        title: 'Property',
        icon: 'home',
        body: 'We analyze your property exposures and build a policy that mitigates the unique property risks associated with the nonprofit industry.',
      },
      {
        title: 'Liability',
        icon: 'briefcase',
        body: 'Our liability programs for nonprofits include general liability, auto liability, social service professional liability, sexual misconduct liability, and directors and officers liability.',
      },
      {
        title: 'Supplemental',
        icon: 'compass',
        body: 'We analyze your property exposures and build a policy that mitigates the unique property risks associated with the nonprofit industry.',
      },
    ],
    formId: 'lead-non-profit',
    formHeading: 'Find your path to better Nonprofit insurance',
    cardImage: 'non-profit',
    heroImage: 'non-profit-hall',
    imageAlt: 'White chapel with a steeple under a bright sky',
    icon: 'heart',
    serviceType: 'Non-profit insurance',
    faqs: [
      {
        q: 'What kinds of non-profits does Pathfinder/LL&D insure?',
        a: 'We serve the non-profit industry in Texas and beyond. Our field-tested programs have protected churches, private schools, child care facilities, and veteran support projects, and we design each program specifically for your 501(c)(3) organization.',
      },
      {
        q: 'What liability coverage is included in a non-profit program?',
        a: 'Our liability programs for nonprofits include general liability, auto liability, social service professional liability, sexual misconduct liability, and directors and officers liability.',
      },
      { q: 'How do I request a non-profit insurance program?', a: talk('non-profit specialist') },
    ],
  },
  {
    slug: 'employee-benefits',
    path: '/employee-benefits-plans/',
    group: 'business',
    name: 'Employee Benefits',
    heading: 'Employee Benefits',
    title: 'Employee Benefits and Group Health Insurance',
    metaDescription:
      'Group health and ancillary benefits, compliance, benefits technology and HR support: fully insured, alternative-funded or captive solutions designed around your workforce.',
    blurb:
      'Our team specializes in helping organizations design and implement the right group health insurance solution.',
    intro:
      'Our team specializes in helping organizations design and implement the right group health insurance solution. We customize benefit programs that support both your employees and your organization through fully insured, alternative-funded, or captive solutions—often introducing innovative strategies that think outside the box.',
    features: [
      {
        title: 'Group Health Insurance',
        icon: 'heart',
        body: 'Our team specializes in helping organizations design and implement the right group health insurance solution. We customize benefit programs that support both your employees and your organization through fully insured, alternative-funded, or captive solutions—often introducing innovative strategies that think outside the box.',
      },
      {
        title: 'Group Ancillary Insurance',
        icon: 'layers',
        body: 'Our team helps clients implement ancillary and supplemental insurance programs tailored to their industry and workforce. This includes a comprehensive review of our carrier partners, many of whom specialize in serving specific industries and professions.',
      },
      {
        title: 'Compliance Support',
        icon: 'shield',
        body: 'We offer comprehensive compliance solutions that keep your organization current and fully compliant with all carrier and governmental regulations, providing the assurance and peace of mind that your business is protected.',
      },
      {
        title: 'Technology Support',
        icon: 'cpu',
        body: 'We equip our clients with technology solutions that reduce administrative burdens, including benefits administration platforms and compliance hubs. We have developed strategic partnerships with numerous payroll and HCM providers and act as a liaison in finding the right provider for your needs.',
      },
      {
        title: 'HR Support',
        icon: 'users',
        body: 'Through our partnership with a qualified HR team, we extend your HR capabilities and provide guidance beyond insurance. From employee relations to policy development, we help you manage day-to-day HR challenges with confidence.',
      },
    ],
    formId: 'lead-employee-benefits',
    formHeading: 'Find your path to better employee Benefits',
    cardImage: 'people',
    heroImage: 'people',
    imageAlt: 'Advisor reviewing a benefits plan on a tablet with two colleagues',
    icon: 'users',
    serviceType: 'Employee benefits consulting',
    faqs: [
      {
        q: 'What funding options are available for group health insurance?',
        a: 'We customize benefit programs through fully insured, alternative-funded, or captive solutions, often introducing innovative strategies that think outside the box.',
      },
      {
        q: 'Does Pathfinder/LL&D help with benefits compliance?',
        a: 'Yes. We offer comprehensive compliance solutions that keep your organization current and fully compliant with all carrier and governmental regulations.',
      },
      {
        q: 'Is benefits administration technology included?',
        a: 'We equip clients with technology solutions that reduce administrative burdens, including benefits administration platforms and compliance hubs, and we act as a liaison with payroll and HCM providers to find the right one for your needs.',
      },
      {
        q: 'Can Pathfinder/LL&D support our HR team?',
        a: 'Through our partnership with a qualified HR team, we extend your HR capabilities and provide guidance beyond insurance, from employee relations to policy development.',
      },
    ],
  },
  {
    slug: 'home-and-auto',
    path: '/home-and-auto-insurance/',
    group: 'personal',
    name: 'High-Value Home & Auto',
    heading: 'Home and Auto Insurance',
    title: 'High-Value Home and Auto Insurance',
    metaDescription:
      'Home, auto and watercraft insurance for higher-end homes and vehicles, renovations, seasonal homes, classic cars, motorcycles, RVs, boats and yachts.',
    blurb:
      'Do you live in an upscale neighborhood? Have you recently installed custom cabinets or other improvements?',
    intro:
      'We live in the same communities as our clients, so nothing takes precedence over keeping homes and other valuables safe and covered. We specialize in higher-end homes and vehicles, renovations, seasonal homes, and similar assets that often end up under- or over-valued in insurance policies.',
    features: [
      {
        title: 'Home',
        icon: 'home',
        body: 'We cover dwellings and seasonal homes, condos and co-ops, and farms and ranches. We also offer special programs for flood insurance.',
      },
      {
        title: 'Auto',
        icon: 'car',
        body: 'We specialize in luxury vehicles and classic cars, but we cover them all! We also offer safe driving discounts and coverage for motorcycles, RVs, ATVs, and golf carts.',
      },
      {
        title: 'Watercraft',
        icon: 'sailboat',
        body: 'We cover ski and fishing boats, sailboats, personal watercraft, and even yachts!',
      },
    ],
    formId: 'lead-home-auto',
    formHeading: 'Find your path to better Home + Auto insurance',
    cardImage: 'home-interior',
    heroImage: 'home-and-auto',
    imageAlt: 'Renovated kitchen with custom cabinets and marble counters',
    icon: 'home',
    serviceType: 'Home and auto insurance',
    cta: [
      { label: 'Home Quote', href: '/home-insurance-quote/' },
      { label: 'Auto Quote', href: '/auto-quote/' },
    ],
    faqs: [
      {
        q: 'What kinds of homes does Pathfinder/LL&D insure?',
        a: 'We cover dwellings and seasonal homes, condos and co-ops, and farms and ranches, and we offer special programs for flood insurance. We specialize in higher-end homes, renovations, seasonal homes, and similar assets that often end up under- or over-valued in insurance policies.',
      },
      {
        q: 'Does Pathfinder/LL&D insure classic and luxury cars?',
        a: 'Yes. We specialize in luxury vehicles and classic cars, but we cover them all. We also offer safe driving discounts and coverage for motorcycles, RVs, ATVs, and golf carts.',
      },
      {
        q: 'Can I insure a boat or yacht?',
        a: 'Yes. We cover ski and fishing boats, sailboats, personal watercraft, and even yachts.',
      },
      {
        q: 'How do I get a home or auto insurance quote?',
        a: 'Start a Home Quote or an Auto Quote online, complete the "Let’s Talk" form on this page, or call (281) 556-9999.',
      },
    ],
  },
  {
    slug: 'collections',
    path: '/collections-insurance/',
    group: 'personal',
    name: 'Collections',
    heading: 'Collections Insurance',
    title: 'Collections Insurance for Wine, Art and Collectibles',
    metaDescription:
      'Expanded coverage and competitive rates for collections that homeowners policies may not cover: wine, fine art, minerals, coins, furniture and historical memorabilia.',
    blurb:
      'We offer expanded coverage and competitive rates for your collectibles, such as art, wine, coins, furniture, memorabilia, and statues.',
    intro:
      'Homeowners policies don’t always cover valuable collections of things like wine, fine art, minerals, historical memorabilia, etc. These unique items can prove tricky to properly value and price. Ask your Pathfinder representative if they can provide you with further information and quotes to insure your prized collections.',
    features: [
      { title: 'Wine', icon: 'wine' },
      { title: 'Art', icon: 'palette' },
      { title: 'Minerals', icon: 'gem' },
    ],
    formId: 'lead-collections',
    formHeading: 'Find your path to better Collections insurance',
    cardImage: 'collections',
    heroImage: 'collections-wine',
    imageAlt: 'Wine bottles stored in a wooden cellar rack',
    icon: 'gem',
    serviceType: 'Collections insurance',
    faqs: [
      {
        q: 'Does homeowners insurance cover a wine or art collection?',
        a: 'Homeowners policies don’t always cover valuable collections of things like wine, fine art, minerals and historical memorabilia. These unique items can prove tricky to properly value and price.',
      },
      {
        q: 'What collectibles can Pathfinder/LL&D insure?',
        a: 'We offer expanded coverage and competitive rates for collectibles such as art, wine, coins, furniture, memorabilia, and statues.',
      },
      {
        q: 'How do I get a quote for a collection?',
        a: 'Ask your Pathfinder representative for further information and quotes, complete the "Let’s Talk" form on this page, or call (281) 556-9999.',
      },
    ],
  },
];

export const businessLines = lines.filter((l) => l.group === 'business');
export const personalLines = lines.filter((l) => l.group === 'personal');
export const lineBySlug = (slug: string) => {
  const line = lines.find((l) => l.slug === slug);
  if (!line) throw new Error(`Unknown line: ${slug}`);
  return line;
};

/** Order used on the home page, matching the previous site. */
export const homeOrder = [
  'energy',
  'professional-services',
  'real-estate',
  'home-and-auto',
  'contractors',
  'non-profit',
  'employee-benefits',
  'collections',
];
