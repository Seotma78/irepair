export interface BrightHeroSlide {
  id: string;
  headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'div' | 'p';
  heading: string;
  title: string;
  description: string;
  subtitle: string;
  ctaText: string;
  buttonText: string;
  ctaLink: string;
  buttonLink: string;
  image: string;
  fallbackImage?: string;
  badge: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorderColor?: string;
  buttonBg?: string;
  buttonTextColor?: string;
  buttonHoverBg?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  titleColor?: string;
  subtitleColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  overlayGradient?: string;
}

export interface HeroBrightSliderSettings {
  autoplaySpeed: number;
  pauseOnHover: boolean;
  showArrows: boolean;
  showDots: boolean;
  showQuoteBar: boolean;
  showSlideCta: boolean;
  scrimEnabled: boolean;
  scrimColor: string;
  eyebrowColor: string;
  headlineColor: string;
  subheadlineColor: string;
  ctaBgColor: string;
  ctaTextColor: string;
  quoteButtonText: string;
  slides: BrightHeroSlide[];
}

export const HERO_BRIGHT_SLIDER_SEEDED_SLIDES: BrightHeroSlide[] = [
  {
    id: 'slide_1',
    headingTag: 'h1',
    heading: 'Beach Day Gone Wrong?',
    title: 'Beach Day Gone Wrong?',
    description: '20% off on all mobile repairs',
    subtitle: '20% off on all mobile repairs',
    ctaText: 'Get a Free Quote!',
    buttonText: 'Get a Free Quote!',
    ctaLink: '/quote',
    buttonLink: '/quote',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2026/09/irepair-covers.webp',
    fallbackImage: '/images/hero/hero_slide_1.webp',
    badge: 'Summer Repair Special · 20% Off All Repairs',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_2',
    headingTag: 'h2',
    heading: 'Biggest Sale of the Year',
    title: 'Biggest Sale of the Year',
    description: 'Exclusive Black Friday Discounted Offers Now Live In Store',
    subtitle: 'Exclusive Black Friday Discounted Offers Now Live In Store',
    ctaText: 'Get a Free Quote!',
    buttonText: 'Get a Free Quote!',
    ctaLink: '/offers',
    buttonLink: '/offers',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/12/dESKTOP-Banner.webp',
    fallbackImage: '/images/hero/hero_slide_2.webp',
    badge: 'Biggest Sale Of The Year · In-Store Exclusives',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_3',
    headingTag: 'h2',
    heading: 'Fix it. Shop it. Love it.',
    title: 'Fix it. Shop it. Love it.',
    description: "UK's trusted destination for phone repairs, laptop services, and the latest tech deals.",
    subtitle: "UK's trusted destination for phone repairs, laptop services, and the latest tech deals.",
    ctaText: 'Get a Free Quote!',
    buttonText: 'Get a Free Quote!',
    ctaLink: '/quote',
    buttonLink: '/quote',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/10/irepaircover-1.webp',
    fallbackImage: '/images/hero/hero_slide_3.webp',
    badge: "UK's #1 Rated Tech Destination · 6-Month Warranty",
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_4',
    headingTag: 'h2',
    heading: 'Expert Phone Repairs At Exclusive Discounts',
    title: 'Expert Phone Repairs At Exclusive Discounts',
    description: 'We use high quality & genuine parts, offer same-day repairs, 6-month guarantees & a no-fix-no-fee policy, quality service you can trust.',
    subtitle: 'We use high quality & genuine parts, offer same-day repairs, 6-month guarantees & a no-fix-no-fee policy, quality service you can trust.',
    ctaText: 'Get a Free Quote!',
    buttonText: 'Get a Free Quote!',
    ctaLink: '/repairs',
    buttonLink: '/repairs',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/08/irepairbanner.jpg',
    fallbackImage: '/images/hero/hero_slide_4.jpg',
    badge: 'Certified Engineers · No Fix, No Fee Guarantee',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_5',
    headingTag: 'h2',
    heading: 'Accessories That Fit Your Mobile Life',
    title: 'Accessories That Fit Your Mobile Life',
    description: 'Reliable chargers, sturdy cases, and smart add-ons — the perfect extras for your everyday phone use.',
    subtitle: 'Reliable chargers, sturdy cases, and smart add-ons — the perfect extras for your everyday phone use.',
    ctaText: 'Buy Now!',
    buttonText: 'Buy Now!',
    ctaLink: '/accessories',
    buttonLink: '/accessories',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/08/irepair-cover.jpg',
    fallbackImage: '/images/hero/hero_slide_5.jpg',
    badge: 'Everyday Mobile Essentials · Fast UK Dispatch',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_6',
    headingTag: 'h2',
    heading: 'Spring into Savings',
    title: 'Spring into Savings',
    description: '20% OFF all Screen Repairs + FREE screen protector this March!',
    subtitle: '20% OFF all Screen Repairs + FREE screen protector this March!',
    ctaText: 'Get a Free Quote!',
    buttonText: 'Get a Free Quote!',
    ctaLink: '/quote',
    buttonLink: '/quote',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/03/desktpo-banner.jpg',
    fallbackImage: '/images/hero/hero_slide_6.jpg',
    badge: 'Spring Promo · Free Screen Protector Included',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
  {
    id: 'slide_7',
    headingTag: 'h2',
    heading: 'Find Your Perfect Case',
    title: 'Find Your Perfect Case',
    description: 'New Arrivals In-Store! Premium Protection & Stylish Designs - Buy Now & Get Discount!',
    subtitle: 'New Arrivals In-Store! Premium Protection & Stylish Designs - Buy Now & Get Discount!',
    ctaText: 'Buy Now!',
    buttonText: 'Buy Now!',
    ctaLink: '/cases',
    buttonLink: '/cases',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2025/02/Feel-the-Love-%E2%80%93-February-Deals-7-scaled.jpg',
    fallbackImage: '/images/hero/hero_slide_7.jpg',
    badge: 'New In-Store Arrivals · Impact Drop Protection',
    badgeColor: '#EC008C',
    buttonBg: '#EC008C',
    buttonTextColor: '#ffffff',
    buttonHoverBg: '#CE007A',
    titleColor: '#4A0456',
    subtitleColor: '#475569',
  },
];

export const HERO_BRIGHT_SLIDER_DEFAULTS: HeroBrightSliderSettings = {
  autoplaySpeed: 6500,
  pauseOnHover: true,
  showArrows: true,
  showDots: false,
  showQuoteBar: true,
  showSlideCta: false,
  scrimEnabled: true,
  scrimColor: '#FFFFFF',
  eyebrowColor: '#EC008C',
  headlineColor: '#4A0456',
  subheadlineColor: '#475569',
  ctaBgColor: '#EC008C',
  ctaTextColor: '#FFFFFF',
  quoteButtonText: 'Request Quote & Book',
  slides: HERO_BRIGHT_SLIDER_SEEDED_SLIDES,
};
