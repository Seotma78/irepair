export interface Home2HeroTrustBadge {
  icon: string;
  label: string;
  highlight?: string;
}

export interface Home2ServiceCard {
  icon: string;
  title: string;
  description: string;
  link: string;
  accent: 'pink' | 'emerald' | 'slate';
}

export interface Home2BrandPill {
  label: string;
  slug: string;
  link: string;
}

export interface Home2TabbedDeviceItem {
  tab: 'repairs' | 'buybacks' | 'refurbished';
  kicker: string;
  title: string;
  image: string;
  priceLabel: string;
  priceValue: string;
  ctaLabel: string;
  link: string;
  brand?: string;
  modelSlug?: string;
}

export interface Home2ProcessStep {
  stepNumber: string;
  icon: string;
  title: string;
  description: string;
}

export interface Home2DarkBenefit {
  icon: string;
  title: string;
  description: string;
  accentColor: 'pink' | 'emerald';
}

export interface Home2DarkStat {
  value: string;
  label: string;
  highlight: 'white' | 'emerald' | 'pink';
}

export interface Home2ModernReview {
  author: string;
  rating: number;
  quote: string;
  serviceTag: string;
  verified: boolean;
}

export interface Home2StoreLocationItem {
  id: string;
  name: string;
  city: string;
  postcode: string;
  address: string;
  hours: string;
  phone: string;
  mapLink: string;
  isOpen: boolean;
}

export interface Home2FaqItem {
  question: string;
  answer: string;
}

export const HERO_SPLIT_QUICK_QUOTE_DEFAULTS = {
  eyebrowText: 'Same-day walk-in & Royal Mail tracked nationwide',
  headline: 'Fast Repairs, Cash for Phones, Trusted Tech',
  subheadline:
    'Book a certified 45-minute repair, sell your phone directly via WeBuyYourTech.co.uk, or shop Grade-A refurbished devices across 24 UK high-street hubs.',
  primaryBtnLabel: 'Book a Repair',
  primaryBtnUrl: '/book-repair',
  secondaryBtnLabel: 'Sell Your Phone',
  secondaryBtnUrl: 'https://webuyyourtech.co.uk/',
  heroImage: '/images/home2/hero_devices.jpg',
  enable3DHero: true,
  livePricingBadge: 'Quote on Request',
  quoteMode: 'repair' as 'both' | 'repair' | 'buyback',
  trustBadges: [
    { icon: 'Star', label: '4.9 ★ Rating', highlight: '(18,420 reviews)' },
    { icon: 'Clock', label: 'Same-Day Service', highlight: '45-min repairs' },
    { icon: 'ShieldCheck', label: '12-Month Warranty', highlight: 'OEM parts' },
  ] as Home2HeroTrustBadge[],
};

export const QUICK_SERVICE_CARDS_STRIP_DEFAULTS = {
  cards: [
    {
      icon: 'Smartphone',
      title: 'Book Screen / Battery Repair',
      description: 'OEM-grade parts · 12-mo warranty',
      link: '/book-repair',
      accent: 'pink' as const,
    },
    {
      icon: 'Coins',
      title: 'Sell Your Phone for Cash',
      description: 'Same-day Faster Payments on WeBuyYourTech',
      link: 'https://webuyyourtech.co.uk/',
      accent: 'emerald' as const,
    },
    {
      icon: 'ShieldCheck',
      title: 'Buy Certified Devices',
      description: '70-point tested · Save up to 40%',
      link: '/shop',
      accent: 'slate' as const,
    },
  ] as Home2ServiceCard[],
  showBrandStrip: true,
  brandStripLabel: 'Supported devices:',
  syncBrandsFromDb: true,
  brands: [
    { label: 'Apple', slug: 'apple', link: '/shop' },
    { label: 'Samsung', slug: 'samsung', link: '/shop' },
    { label: 'Google', slug: 'google', link: '/shop' },
    { label: 'OnePlus', slug: 'oneplus', link: '/shop' },
    { label: 'iPad', slug: 'ipad', link: '/shop' },
    { label: 'MacBook', slug: 'macbook', link: '/shop' },
    { label: 'Smartwatches', slug: 'watch', link: '/shop' },
  ] as Home2BrandPill[],
};

export const TABBED_DEVICES_CAROUSEL_DEFAULTS = {
  title: 'Trending Devices & Services',
  subtitle: 'Fast UK repairs with tailored quotes after submission, plus certified Grade-A refurbished stock.',
  enableRepairsTab: true,
  enableBuybacksTab: false,
  enableRefurbishedTab: true,
  repairsTabLabel: 'Trending Repairs',
  buybacksTabLabel: 'Sell Your Phone',
  refurbishedTabLabel: 'New & Refurbished',
  autoPullFromDb: true,
  itemsLimit: 8,
  customItems: [
    {
      tab: 'repairs',
      kicker: 'OLED SCREEN & BATTERY',
      title: 'iPhone 16 Pro',
      image: '/images/home2/iphone_studio.jpg',
      priceLabel: 'Repair Quote',
      priceValue: 'After Submit',
      ctaLabel: 'Book Fix',
      link: '/book-repair',
      brand: 'apple',
      modelSlug: 'iphone-15-pro',
    },
    {
      tab: 'repairs',
      kicker: 'AMOLED DISPLAY',
      title: 'Galaxy S24 Ultra',
      image: '/images/home2/galaxy_studio.jpg',
      priceLabel: 'Repair Quote',
      priceValue: 'After Submit',
      ctaLabel: 'Book Fix',
      link: '/book-repair',
      brand: 'samsung',
      modelSlug: 'samsung-s24-ultra',
    },
    {
      tab: 'repairs',
      kicker: 'DISPLAY & LOGIC BOARD',
      title: 'MacBook Pro 14"',
      image: '/images/home2/macbook_studio.jpg',
      priceLabel: 'Repair Quote',
      priceValue: 'After Submit',
      ctaLabel: 'Book Fix',
      link: '/book-repair',
      brand: 'apple-laptop',
      modelSlug: 'macbook-pro-14-m3',
    },
    {
      tab: 'repairs',
      kicker: 'SCREEN & CHARGING PORT',
      title: 'Google Pixel 9 Pro',
      image: '/images/home2/pixel_studio.jpg',
      priceLabel: 'Repair Quote',
      priceValue: 'After Submit',
      ctaLabel: 'Book Fix',
      link: '/book-repair',
      brand: 'google',
      modelSlug: 'pixel-8-pro',
    },
    {
      tab: 'repairs',
      kicker: 'LASER BACK GLASS & OLED',
      title: 'iPhone 15 Pro Max',
      image: '/images/home2/iphone_studio.jpg',
      priceLabel: 'Repair Quote',
      priceValue: 'After Submit',
      ctaLabel: 'Book Fix',
      link: '/book-repair',
      brand: 'apple',
      modelSlug: 'iphone-15-pro-max',
    },
    {
      tab: 'buybacks',
      kicker: 'SELL YOUR PHONE',
      title: 'iPhone 16 Pro Max',
      image: '/images/home2/iphone_studio.jpg',
      priceLabel: 'Instant Valuation',
      priceValue: 'WeBuyYourTech',
      ctaLabel: 'Sell Now',
      link: 'https://webuyyourtech.co.uk/',
      brand: 'apple',
    },
    {
      tab: 'buybacks',
      kicker: 'SELL YOUR PHONE',
      title: 'Galaxy S24 Ultra',
      image: '/images/home2/galaxy_studio.jpg',
      priceLabel: 'Instant Valuation',
      priceValue: 'WeBuyYourTech',
      ctaLabel: 'Sell Now',
      link: 'https://webuyyourtech.co.uk/',
      brand: 'samsung',
    },
    {
      tab: 'buybacks',
      kicker: 'SELL YOUR PHONE',
      title: 'MacBook Pro 14" M2 Pro',
      image: '/images/home2/macbook_studio.jpg',
      priceLabel: 'Instant Valuation',
      priceValue: 'WeBuyYourTech',
      ctaLabel: 'Sell Now',
      link: 'https://webuyyourtech.co.uk/',
      brand: 'apple',
    },
    {
      tab: 'buybacks',
      kicker: 'SELL YOUR PHONE',
      title: 'Google Pixel 9 Pro XL',
      image: '/images/home2/pixel_studio.jpg',
      priceLabel: 'Instant Valuation',
      priceValue: 'WeBuyYourTech',
      ctaLabel: 'Sell Now',
      link: 'https://webuyyourtech.co.uk/',
      brand: 'google',
    },
    {
      tab: 'refurbished',
      kicker: 'GRADE-A PRISTINE · 12M WARRANTY',
      title: 'iPhone 15 Pro 256GB',
      image: '/images/home2/iphone_studio.jpg',
      priceLabel: 'Price from',
      priceValue: '£699',
      ctaLabel: 'Shop Device',
      link: '/shop',
      brand: 'apple',
    },
    {
      tab: 'refurbished',
      kicker: '70-POINT TESTED · UNLOCKED',
      title: 'Galaxy S24 Ultra 256GB',
      image: '/images/home2/galaxy_studio.jpg',
      priceLabel: 'Price from',
      priceValue: '£749',
      ctaLabel: 'Shop Device',
      link: '/shop',
      brand: 'samsung',
    },
    {
      tab: 'refurbished',
      kicker: 'APPLE SILICON · MINT BATTERY',
      title: 'MacBook Pro 14" M3',
      image: '/images/home2/macbook_studio.jpg',
      priceLabel: 'Price from',
      priceValue: '£1,199',
      ctaLabel: 'Shop Device',
      link: '/shop',
      brand: 'apple',
    },
    {
      tab: 'refurbished',
      kicker: 'SIM FREE · PRISTINE OLED',
      title: 'Google Pixel 8 Pro',
      image: '/images/home2/pixel_studio.jpg',
      priceLabel: 'Price from',
      priceValue: '£529',
      ctaLabel: 'Shop Device',
      link: '/shop',
      brand: 'google',
    },
  ] as Home2TabbedDeviceItem[],
};

export const PROCESS_STEPS_MODERN_DEFAULTS = {
  eyebrow: 'SIMPLE 3-STEP WORKFLOW',
  heading: 'How It Works',
  subtitle: 'From instant online quote to repaired device or same-day bank transfer in three straightforward steps.',
  steps: [
    {
      stepNumber: '01',
      icon: 'QrCode',
      title: 'Book or Quote',
      description:
        'Select your device and fault or condition to lock in a fixed, transparent UK price in under 30 seconds.',
    },
    {
      stepNumber: '02',
      icon: 'Truck',
      title: 'Drop Off or Mail In',
      description:
        'Visit any of our 24 UK stores for express walk-in service, or use our free insured Royal Mail Special Delivery pack.',
    },
    {
      stepNumber: '03',
      icon: 'CheckCircle2',
      title: 'Fast Fix or Same-Day Payout',
      description:
        'Collect your repaired device in 45 minutes with a 12-month warranty, or receive instant Faster Payments for buybacks.',
    },
  ] as Home2ProcessStep[],
};

export const WHY_CHOOSE_US_METRICS_DARK_DEFAULTS = {
  heading: 'Why Choose iRepair',
  subheadline: 'Precision diagnostics, genuine components, and bank-grade data erasure on every device we touch.',
  benefits: [
    {
      icon: 'Award',
      title: 'Certified Technicians',
      description: 'Apple & Samsung accredited engineers using micro-soldering and OEM-grade parts.',
      accentColor: 'pink',
    },
    {
      icon: 'BadgePoundSterling',
      title: 'Best Price Guarantee',
      description: 'Upfront quotes with zero hidden diagnostic fees, plus a 14-day buyback price lock.',
      accentColor: 'emerald',
    },
    {
      icon: 'ShieldCheck',
      title: 'Warranty Included',
      description: 'Every repair and certified refurbished device is backed by a 12-month UK warranty.',
      accentColor: 'pink',
    },
    {
      icon: 'Lock',
      title: 'Data Privacy First',
      description: 'GDPR-compliant workshops and certified Blancco data erasure on every trade-in.',
      accentColor: 'emerald',
    },
  ] as Home2DarkBenefit[],
  stats: [
    { value: '150k+', label: 'Devices Serviced', highlight: 'white' },
    { value: '45 min', label: 'Same-Day Turnaround', highlight: 'emerald' },
    { value: '24', label: 'UK Locations', highlight: 'white' },
    { value: '99.4%', label: 'Customer Satisfaction', highlight: 'emerald' },
  ] as Home2DarkStat[],
};

export const REVIEWS_CAROUSEL_MODERN_DEFAULTS = {
  ratingBadgeText: 'Rated 4.9 / 5.0 across 18,420 UK reviews',
  heading: 'Trusted by Thousands Across the UK',
  subheadline: 'Verified customer reviews across in-store express repairs, postal buybacks, and certified refurbished phones.',
  autoplay: true,
  autoplaySpeedMs: 5500,
  reviews: [
    {
      author: 'Oliver Bennett',
      rating: 5,
      quote:
        'Dropped my cracked iPhone 15 Pro at the Reading store on my lunch break and had it back in 35 minutes looking brand new.',
      serviceTag: 'iPhone Screen Repair',
      verified: true,
    },
    {
      author: 'Priya Patel',
      rating: 5,
      quote:
        'Used the mail-in buyback for my MacBook Pro. Free tracked label arrived next day and £980 hit my Monzo within hours of delivery.',
      serviceTag: 'MacBook Buyback',
      verified: true,
    },
    {
      author: 'Callum MacLeod',
      rating: 5,
      quote:
        'Bought a Grade-A refurbished Galaxy S24 Ultra. Battery health was 100%, spotless titanium frame, and saved £320 over retail.',
      serviceTag: 'Certified Tech',
      verified: true,
    },
    {
      author: 'Hannah Thornton',
      rating: 5,
      quote:
        'Norwich team fixed my dead charging port in 25 minutes when another shop said it needed a new motherboard. Saved me hundreds.',
      serviceTag: 'USB-C Port Repair',
      verified: true,
    },
    {
      author: 'Daniel Okafor',
      rating: 5,
      quote:
        'Sold two old iPhones at the Basingstoke hub. Inspected in 10 minutes flat and bank transfer landed before I walked out the door.',
      serviceTag: 'Same-Day Buyback',
      verified: true,
    },
    {
      author: 'Sophie Aldridge',
      rating: 5,
      quote:
        'Spilled coffee on my MacBook Air before exams. Ultrasonic clean recovered all my coursework and it still runs flawlessly 6 months on.',
      serviceTag: 'Liquid Damage Clean',
      verified: true,
    },
  ] as Home2ModernReview[],
};

export const STORE_LOCATIONS_WITH_TRACKER_DEFAULTS = {
  heading: 'Find a UK Store Near You',
  subtitle: 'Walk in for 45-minute express repairs or instant in-person buyback payouts.',
  syncStoresFromDb: true,
  showOrderTracker: true,
  trackerEyebrow: 'LIVE STATUS',
  trackerHeading: 'Track Your Order',
  trackerSubtitle: 'Check real-time bench diagnostics, courier progress, or buyback payout status.',
  locations: [
    {
      id: 'basingstoke',
      name: 'Basingstoke — Old Basing Mall',
      city: 'Basingstoke',
      postcode: 'RG21 7AW',
      address: '14 Old Basing Mall, RG21 7AW',
      hours: 'Mon–Sat 8:30–19:30',
      phone: '+447733304047',
      mapLink: 'https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9',
      isOpen: true,
    },
    {
      id: 'norwich',
      name: 'Norwich — Gentlemans Walk',
      city: 'Norwich',
      postcode: 'NR2 1NA',
      address: "25 Gentleman's Walk, NR2 1NA",
      hours: 'Mon–Sat 8:30–18:30',
      phone: '+447833203220',
      mapLink: 'https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9',
      isOpen: true,
    },
    {
      id: 'reading',
      name: 'Reading — Broad Street',
      city: 'Reading',
      postcode: 'RG1 2AA',
      address: '49 Broad Street, RG1 2AA',
      hours: 'Mon–Sat 8:00–19:45',
      phone: '+447922446999',
      mapLink: 'https://maps.app.goo.gl/hG6UXWUJVhHmXA5JA',
      isOpen: true,
    },
    {
      id: 'solihull',
      name: 'Solihull — High Street',
      city: 'Solihull',
      postcode: 'B91 3SW',
      address: '61 High Street, B91 3SW',
      hours: 'Mon–Sat 9:00–18:30',
      phone: '+441217042695',
      mapLink: 'https://maps.app.goo.gl/jabBhukACEBKP4qV9',
      isOpen: true,
    },
  ] as Home2StoreLocationItem[],
};

export const FAQ_TWO_COLUMN_ACCORDION_DEFAULTS = {
  eyebrow: 'SUPPORT & GUARANTEES',
  heading: 'Frequently Asked Questions',
  subtitle: 'Everything you need to know about turnaround times, warranties, and instant payouts.',
  ctaText: 'Visit the full Help Centre',
  ctaUrl: '/contact-us',
  faqs: [
    {
      question: 'How long does a same-day screen or battery repair take?',
      answer:
        'Most iPhone, Samsung Galaxy, and Google Pixel screen or battery replacements are completed in 30 to 45 minutes in-store. Mail-in repairs are turned around within 24 hours of arrival.',
    },
    {
      question: 'How fast do I get paid when selling my device?',
      answer:
        'In-store trade-ins are paid immediately via Faster Payments bank transfer or cash once our technician completes a 10-minute check. Mail-in buybacks are settled the same working day your parcel arrives.',
    },
    {
      question: 'What does your 12-month repair & device warranty cover?',
      answer:
        'Every repair part we fit and every Grade-A refurbished device we sell is protected for 12 months against manufacturing or component defects across all 24 UK branches.',
    },
    {
      question: 'Will my data stay safe during a repair or buyback?',
      answer:
        'Yes. Standard screen and battery repairs never require wiping your device. For trade-ins and buybacks, every handset undergoes GDPR-compliant Blancco cryptographic data erasure.',
    },
  ] as Home2FaqItem[],
};

export const HOME2_SEED_SECTIONS = [
  {
    id: 'sec_home2_hero',
    type: 'hero_split_quick_quote',
    order: 1,
    visible: true,
    settings: HERO_SPLIT_QUICK_QUOTE_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_services',
    type: 'quick_service_cards_strip',
    order: 2,
    visible: true,
    settings: QUICK_SERVICE_CARDS_STRIP_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_trending',
    type: 'tabbed_devices_carousel',
    order: 3,
    visible: true,
    settings: TABBED_DEVICES_CAROUSEL_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_process',
    type: 'process_steps_modern',
    order: 4,
    visible: true,
    settings: PROCESS_STEPS_MODERN_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_why_dark',
    type: 'why_choose_us_metrics_dark',
    order: 5,
    visible: true,
    settings: WHY_CHOOSE_US_METRICS_DARK_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_reviews',
    type: 'reviews_carousel_modern',
    order: 6,
    visible: true,
    settings: REVIEWS_CAROUSEL_MODERN_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_stores',
    type: 'store_locations_with_tracker',
    order: 7,
    visible: true,
    settings: STORE_LOCATIONS_WITH_TRACKER_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
  {
    id: 'sec_home2_faq',
    type: 'faq_two_column_accordion',
    order: 8,
    visible: true,
    settings: FAQ_TWO_COLUMN_ACCORDION_DEFAULTS,
    commonSettings: { containerWidth: 'full', paddingY: 'none' },
  },
];
