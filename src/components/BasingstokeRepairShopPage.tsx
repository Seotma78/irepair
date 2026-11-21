import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS } from '../data/mockData';
import { Product } from '../types';
import { 
  Wrench, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  Smartphone, 
  BatteryCharging, 
  Zap, 
  Camera, 
  Droplet, 
  Cpu, 
  Users, 
  Award, 
  Check, 
  X,
  Navigation,
  ArrowRight,
  MessageCircle,
  Laptop,
  CheckCircle,
  ChevronDown,
  ShoppingBag,
  Volume2,
  Tag
} from 'lucide-react';

interface QuoteBrandOption {
  id: string;
  name: string;
  logo: string;
}

const BRANDS_LIST: QuoteBrandOption[] = [
  { id: 'apple', name: 'Apple', logo: '' },
  { id: 'samsung', name: 'Samsung', logo: 'SAMSUNG' },
  { id: 'google', name: 'Google Pixel', logo: 'G' },
  { id: 'huawei', name: 'HUAWEI', logo: '🌸' },
  { id: 'oneplus', name: 'OnePlus', logo: '1+' },
  { id: 'xiaomi', name: 'Xiaomi', logo: 'mi' },
  { id: 'nokia', name: 'Nokia', logo: 'NOKIA' },
  { id: 'other', name: 'Other', logo: '🔧' },
];

interface RepairIssueOption {
  id: string;
  name: string;
  basePrice: number;
  time: string;
}

const ISSUES_LIST: RepairIssueOption[] = [
  { id: 'screen', name: 'Screen Replacement', basePrice: 59, time: '25 mins' },
  { id: 'battery', name: 'Battery Replacement', basePrice: 35, time: '20 mins' },
  { id: 'charging', name: 'Charging Port Repair', basePrice: 39, time: '30 mins' },
  { id: 'camera', name: 'Camera Lens & Sensor', basePrice: 45, time: '30 mins' },
  { id: 'backglass', name: 'Back Glass Repair', basePrice: 49, time: '45 mins' },
  { id: 'water', name: 'Liquid Damage Diagnostic', basePrice: 29, time: 'Same day' },
  { id: 'speaker', name: 'Ear Speaker & Mic', basePrice: 35, time: '30 mins' },
  { id: 'software', name: 'Software / OS Boot Loop', basePrice: 25, time: '30 mins' },
];

interface TestimonialItem {
  id: string;
  name: string;
  subtitle: string;
  review: string;
  rating: number;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Linda Martin',
    subtitle: 'Quick and Affordable iPhone 15 Pro Max Repair at iRepair Mobiles',
    review: 'I recently had an unfortunate accident with my iPhone 15 Pro Max while visiting Plantation Garden in Norwich. The back glass shattered, and I was worried about the repair cost. Luckily, I found iRepair and was pleasantly surprised by their quick and affordable service. The technicians were friendly, efficient, and the repair was done in no time. I would definitely recommend iRepair Mobiles to my friends and family.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Alex Turner',
    subtitle: 'Quick and Reliable iPhone Repair Near College Road Norwich',
    review: "I was having a terrible time with my iPhone and desperately needed a screen repair. Luckily, I found iRepair Mobiles near College Road in Norwich. They were quick, efficient, and fixed my phone perfectly. I'm so relieved and would highly recommend them to anyone in the area.",
    rating: 5,
  },
  {
    id: '3',
    name: 'Tom Anderson',
    subtitle: 'Unexpectedly Great iPhone 14 Pro Battery Replacement',
    review: "I was surprised at how quickly and efficiently iRepair Mobiles in Norwich replaced my fiancé's iPhone 14 Pro battery. The service was top-notch, and the price was very reasonable. We didn't expect such a smooth and hassle-free experience. I'm truly impressed and would highly recommend iRepair to anyone in Norwich.",
    rating: 5,
  },
  {
    id: '4',
    name: 'James Miller',
    subtitle: 'Top-Notch iPhone Screen Repair in Norwich',
    review: "Alright, so I needed a new screen for my iPhone and I was searching for the best phone repair shop near me in Norwich. Well, iRepair Mobiles definitely hit the spot! The technician knew his stuff and fixed my phone super quick. I'm really impressed with the service and would definitely recommend them to anyone in Norwich.",
    rating: 5,
  },
];

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'What types of devices do you repair?',
    a: "We specialize in repairing a wide range of devices, including smartphones, laptops, tablets, and more. Whether it’s a cracked screen, battery issue, or software problem, we’ve got you covered and we will bring it to optimal functionality with precision!",
  },
  {
    q: 'Do you offer a warranty on your repairs?',
    a: "Yes! We stand behind our work and offer a 6 Month warranty on all repairs. If you experience any issues with your device after a repair, just bring it back, and we’ll make it right. ( Excluding Physical Damage )",
  },
  {
    q: 'How long does a typical repair take?',
    a: "Most repairs can be completed within 30 minutes (Same Day Repairs), depending on the type of service needed. We strive for quick turnaround & convenient time while ensuring high-quality workmanship.",
  },
  {
    q: 'Can I get a quote before the repair?',
    a: "Absolutely! We provide free quotes for all repair services. Simply fill out our form or visit us in-store for an estimate. We will gonna repair your device while you wait.",
  },
  {
    q: 'What payment methods do you accept?',
    a: "We accept various secure payment methods, including cash, credit/debit cards, and digital wallets, making it easy for you to pay for your repair services.",
  },
  {
    q: 'Do I need an appointment for repairs?',
    a: "While appointments are not necessary, whether its a laptop, iPad, Mobile Phone or tablet repair but we recommend scheduling one for larger repairs to ensure timely service. Walk-ins are always welcome!",
  },
];

export const BasingstokeRepairShopPage: React.FC = () => {
  const { 
    setCurrentPage, 
    startRepairBooking, 
    addToCart, 
    showNotification,
    products,
    viewProductDetail 
  } = useApp();

  // Quote Form State
  const [selectedBrand, setSelectedBrand] = useState<string>('apple');
  const [phoneModel, setPhoneModel] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<string>('screen');
  const [showIssuePicker, setShowIssuePicker] = useState<boolean>(false);
  const [quoteCalculated, setQuoteCalculated] = useState<boolean>(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Store Front Image Fallback
  const [heroImgSrc, setHeroImgSrc] = useState<string>('https://irepair-mobiles.co.uk/wp-content/uploads/2023/12/Untitled-design-8.jpg');

  // CRITICAL SEO: Synchronize page title, meta description, canonical link, and JSON-LD schema
  useEffect(() => {
    const pageTitle = 'Your Trusted Mobile Phone Repair Shop in Basingstoke... | iRepair Mobiles';
    const pageDescription = 'In the heart of Basingstoke, iRepair Mobiles stands as your go-to Mobile Phone Repair Shop at Unit 14 Old Basing Mall, Basingstoke RG21 7AW. Fast same-day phone & laptop repairs, genuine parts, and 6-month warranty.';
    const canonicalHref = 'https://irepair-mobiles.co.uk/mobile-phone-repair-basingstoke/';

    document.title = pageTitle;

    // Meta Description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', pageDescription);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);

    // OpenGraph & Twitter tags
    const setMeta = (attr: string, key: string, content: string) => {
      let m = document.querySelector(`meta[${attr}="${key}"]`);
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute(attr, key);
        document.head.appendChild(m);
      }
      m.setAttribute('content', content);
    };

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:url', canonicalHref);
    setMeta('property', 'og:image', heroImgSrc);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDescription);
    setMeta('name', 'twitter:image', heroImgSrc);

    // Structured Data JSON-LD (LocalBusiness + FAQPage)
    const jsonLdScriptId = 'schema-basingstoke-repair-shop';
    let scriptTag = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = jsonLdScriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LocalBusiness',
          '@id': 'https://irepair-mobiles.co.uk/mobile-phone-repair-basingstoke/#localbusiness',
          'name': 'iRepair Mobiles - Basingstoke',
          'description': pageDescription,
          'url': canonicalHref,
          'telephone': '+44 7733 304047',
          'priceRange': '££',
          'image': 'https://irepair-mobiles.co.uk/wp-content/uploads/2023/12/Untitled-design-8.jpg',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'Unit 14 Old Basing Mall',
            'addressLocality': 'Basingstoke',
            'postalCode': 'RG21 7AW',
            'addressCountry': 'GB',
          },
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': 51.2667919,
            'longitude': -1.0877917,
          },
          'openingHoursSpecification': [
            {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              'opens': '08:30',
              'closes': '19:30',
            },
            {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': ['Sunday'],
              'opens': '09:30',
              'closes': '18:30',
            },
          ],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '5.0',
            'reviewCount': '642',
          },
        },
        {
          '@type': 'FAQPage',
          '@id': 'https://irepair-mobiles.co.uk/mobile-phone-repair-basingstoke/#faq',
          'mainEntity': FAQS.map((faq) => ({
            '@type': 'Question',
            'name': faq.q,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.a,
            },
          })),
        },
      ],
    };

    scriptTag.textContent = JSON.stringify(structuredData);

    return () => {
      const existingScript = document.getElementById(jsonLdScriptId);
      if (existingScript) existingScript.remove();
    };
  }, [heroImgSrc]);

  // Compute selected issue details
  const activeIssueObj = ISSUES_LIST.find((i) => i.id === selectedIssue) || ISSUES_LIST[0];
  const originalQuote = activeIssueObj.basePrice;
  const discountedQuote = Math.round(originalQuote * 0.8 * 100) / 100;

  const scrollToQuote = () => {
    const el = document.getElementById('quote-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBookFromQuote = () => {
    if (startRepairBooking) {
      startRepairBooking({
        category: 'smartphone',
        brand: selectedBrand,
        model: phoneModel || 'iPhone',
        issue: selectedIssue,
        storeId: 'basingstoke',
      });
    } else {
      setCurrentPage('book-repair');
    }
  };

  // Must-Haves Phones: only Discounted mobile phones available in-store with real images
  const discountedPhones = useMemo(() => {
    const list = products && products.length > 0 ? products : PRODUCTS;
    // Filter specifically for mobile phones with discounts (regularPrice > price)
    const phoneList = list.filter((p) => {
      const isPhone = p.category === 'smartphones' || p.category.includes('phone');
      const hasDiscount = p.regularPrice && p.regularPrice > p.price;
      return isPhone && hasDiscount;
    });

    if (phoneList.length > 0) return phoneList;
    // Fallback to all smartphone products
    return list.filter((p) => p.category === 'smartphones' || p.category.includes('phone'));
  }, [products]);

  // Carousel ref & scroll state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const el = carouselRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [discountedPhones]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-[#DF0C88] selection:text-white">

      {/* =========================================================================
          SECTION 1: HERO BANNER SECTION (Dark tech theme pattern with store photo)
          ========================================================================= */}
      <section className="relative bg-[#0B0F19] text-white pt-10 sm:pt-14 md:pt-16 pb-16 md:pb-20 overflow-hidden border-b border-slate-800">
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#DF0C88 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0B0F19 1px)`,
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Exactly One <h1> and Copy */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Mandatory Top <h1> Heading (Exact Word-for-Word) */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight font-heading">
                Your Trusted Mobile Phone Repair Shop in Basingstoke...
              </h1>

              {/* Exact Paragraph 1 (Word-for-Word) */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                In the heart of Basingstoke, iRepair Mobiles stands as your go-to Mobile Phone Repair Shop in Basingstoke, offering swift and reliable mobile repair services. Our team of expert technicians is dedicated to restoring your devices to their peak performance, ensuring that you stay connected without disruption.
              </p>

              {/* Exact Paragraph 2 (Word-for-Word) */}
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
                With over 15 years of experience in the mobile repair industry, iRepair Mobiles has established itself as a leading provider of exceptional repair services. We are committed to delivering top-notch solutions that bring your mobile devices back to life, restoring them to their optimal functionality swiftly and with precision.
              </p>

              {/* Hero CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={scrollToQuote}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center gap-2 border border-white hover:scale-[1.02] cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#DF0C88]" />
                  <span>Get a Free Quote!(20% Off)</span>
                </button>

                <a
                  href="https://wa.me/447733304047?text=Hi%20iRepair%20Basingstoke%2C%20I%20would%20like%20expert%20advice%20for%20a%20device%20repair"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Get Expert Advice</span>
                </a>
              </div>

              {/* Store trust tags */}
              <div className="flex flex-wrap items-center gap-4 pt-4 text-xs font-semibold text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-white font-bold">5.0</span>
                  <span className="text-slate-400">(642 Google Reviews)</span>
                </div>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300">Unit 14 Old Basing Mall, RG21 7AW</span>
                <span className="text-slate-700">•</span>
                <span className="text-emerald-400">Open Mon–Sat 8:30–19:30</span>
              </div>
            </div>

            {/* Right Column: Storefront Image with Get Directions Overlay */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800 group">
                <img
                  src={heroImgSrc}
                  alt="iRepair Mobiles Basingstoke Storefront at Unit 14 Old Basing Mall"
                  className="w-full h-[320px] sm:h-[380px] lg:h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => setHeroImgSrc('/images/outlets/basingstoke.jpg')}
                />
                
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                {/* Store Label */}
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>iRepair Mobiles Basingstoke Branch</span>
                </div>

                {/* Floating "Get Directions" Button overlay */}
                <div className="absolute bottom-5 right-5 left-5 sm:left-auto">
                  <a
                    href="https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm shadow-xl transition-all duration-200 inline-flex items-center justify-center gap-2 group-hover:scale-105"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Get Directions to Basingstoke Store</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: iRepair Mobiles Basingstoke Advantages Section
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white text-slate-900 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Section Title & Details below Heading */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              Why Choose iRepair Mobiles?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              When your beloved mobile device falls victim to a malfunction, the last thing you want to deal with is a lengthy repair process or the uncertainty of a shoddy repair job. That’s why iRepair Mobiles stands as your trusted partner for comprehensive and reliable repair services in Basingstoke.
            </p>
          </div>

          {/* 4 Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Feature 1: Fast Turnaround */}
            <div className="bg-[#F7F8FA] rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-pink-100/70 text-[#DF0C88] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Fast Turnaround
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your valuable time is our priority. We offer same-day repairs or flexible scheduling to suit your needs.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-[#DF0C88]">
                <span>Under 30 mins for most repairs</span>
              </div>
            </div>

            {/* Feature 2: Customer Satisfaction */}
            <div className="bg-[#F7F8FA] rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-7 h-7 fill-amber-400 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Customer Satisfaction
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Satisfaction guaranteed. Friendly technicians, warranty, and responsive support for a seamless repair experience.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <span>Over 640+ 5-star customer reviews</span>
              </div>
            </div>

            {/* Feature 3: Quality Parts */}
            <div className="bg-[#F7F8FA] rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Quality Parts
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Boost Your Phone's Lifespan with Premium Repairs. We use top-notch replacement parts to keep your phone humming for years to come.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span>OEM Grade &amp; Tested Parts</span>
              </div>
            </div>

            {/* Feature 4: Expert Technicians */}
            <div className="bg-[#F7F8FA] rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-100/70 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Expert Technicians
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  A Team of Experts at Your Fingertips. Our skilled technicians handle a wide range of mobile phone brands and models with expertise.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-purple-600">
                <span>15+ Years Industry Experience</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Scrolling Marquee Ticker */}
      <div className="bg-black py-3.5 border-y border-slate-800 text-xs sm:text-sm font-black tracking-widest uppercase overflow-hidden select-none">
        <div className="animate-marquee whitespace-nowrap flex items-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="inline-flex items-center mx-6 gap-3">
              <span className="text-white">NO REPAIR</span>
              <span className="text-[#DF0C88]">NO FEE POLICY ! 🤝</span>
              <span className="text-slate-600">•</span>
              <span className="text-white">6 MONTHS WARRANTY</span>
              <span className="text-emerald-400">SAME-DAY BASINGSTOKE REPAIRS</span>
              <span className="text-slate-600">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: We Repair All Major Brands Section
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#0B0F19] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Headings and Paragraphs */}
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
                We Repair All Major Brands
              </h2>
              
              <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                <p>
                  When your mobile phone breaks down, it can be a major inconvenience. But with our mobile phone shop, you can rest assured that your device is in good hands.
                </p>
                <p>
                  Our team of experienced technicians is dedicated to providing expert repairs for a wide range of mobile phone brands, including iPhone, Samsung, Google, and more.
                </p>
                <p className="text-slate-400">
                  We understand that your phone is an essential part of your everyday life, and we take pride in getting you back up and running as quickly as possible. Our phone repair service are done with meticulous attention to detail, using only genuine parts to ensure your device is restored to its original condition.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={scrollToQuote}
                  className="px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Select Your Brand Below</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Brand Logos Displayed */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto lg:max-w-none">
                
                {/* Apple iPhone */}
                <div 
                  onClick={() => { setSelectedBrand('apple'); scrollToQuote(); }}
                  className="bg-white rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-slate-900 hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-2xl font-black"></span>
                  <span className="text-base sm:text-lg font-bold tracking-tight">iPhone</span>
                </div>

                {/* Xiaomi / Mi */}
                <div 
                  onClick={() => { setSelectedBrand('xiaomi'); scrollToQuote(); }}
                  className="bg-[#FF6900] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-xl sm:text-2xl font-extrabold tracking-wider">mi</span>
                </div>

                {/* Samsung */}
                <div 
                  onClick={() => { setSelectedBrand('samsung'); scrollToQuote(); }}
                  className="bg-white rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-[#1428A0] hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-widest font-heading">SAMSUNG</span>
                </div>

                {/* HUAWEI */}
                <div 
                  onClick={() => { setSelectedBrand('huawei'); scrollToQuote(); }}
                  className="bg-white rounded-xl p-4 sm:p-5 flex items-center justify-center gap-2 text-[#CF0A2C] hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-xl">🌸</span>
                  <span className="text-base sm:text-lg font-black tracking-wider">HUAWEI</span>
                </div>

                {/* Google Pixel */}
                <div 
                  onClick={() => { setSelectedBrand('google'); scrollToQuote(); }}
                  className="bg-white rounded-xl p-4 sm:p-5 flex items-center justify-center gap-2 text-slate-800 hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-xl font-black text-blue-500">G</span>
                  <span className="text-base sm:text-lg font-bold text-slate-700">Pixel</span>
                </div>

                {/* OnePlus */}
                <div 
                  onClick={() => { setSelectedBrand('oneplus'); scrollToQuote(); }}
                  className="bg-[#EB0029] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-wider">ONEPLUS</span>
                </div>

                {/* Motorola */}
                <div 
                  onClick={() => { setSelectedBrand('other'); scrollToQuote(); }}
                  className="bg-white rounded-xl p-4 sm:p-5 flex items-center justify-center gap-2 text-slate-900 hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-lg font-black text-[#001428]">M</span>
                  <span className="text-base sm:text-lg font-bold tracking-tight">motorola</span>
                </div>

                {/* Nokia */}
                <div 
                  onClick={() => { setSelectedBrand('nokia'); scrollToQuote(); }}
                  className="bg-[#124191] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-widest font-heading">NOKIA</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: Get a Free Quote Today! (Repair Form Section)
          ========================================================================= */}
      <section id="quote-section" className="py-16 sm:py-20 bg-white text-slate-900 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              Get a Free Quote Today!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              When your mobile phone needs repair, trust iRepair Mobiles to get you back on the go. We’re the experts you can count on for reliable, quality repairs that restore your device’s functionality and extend its lifespan.
            </p>
          </div>

          {/* Interactive Quote Card */}
          <div className="bg-[#F8FAFC] border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-6">
              
              {/* Step 1: Select Brand */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Select Brand
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {BRANDS_LIST.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedBrand(brand.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedBrand === brand.id
                          ? 'border-[#DF0C88] bg-pink-50 text-[#DF0C88] font-bold shadow-sm ring-2 ring-[#DF0C88]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{brand.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Phone Model Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Device Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15 Pro, Samsung S23, Google Pixel 8..."
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DF0C88] text-slate-900"
                />
              </div>

              {/* Step 3: Select Repair Issue */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Select Repair Service
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ISSUES_LIST.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => {
                        setSelectedIssue(issue.id);
                        setQuoteCalculated(true);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedIssue === issue.id
                          ? 'border-[#DF0C88] bg-pink-50 text-[#DF0C88] font-bold shadow-sm ring-2 ring-[#DF0C88]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{issue.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{issue.time}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Quote Result Bar */}
              <div className="bg-white rounded-2xl p-5 border border-pink-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Estimated Repair Cost in Basingstoke:</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      £{discountedQuote.toFixed(2)}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      £{originalQuote.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-[#DF0C88] bg-pink-50 px-2 py-0.5 rounded-full">
                      20% OFF Special
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#DF0C88]" />
                    <span>Average repair turnaround: <strong>{activeIssueObj.time}</strong> at Unit 14 Old Basing Mall</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBookFromQuote}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-sm shadow-md transition-all hover:scale-105 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Book This Repair (20% Off)</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 5: iRepair Mobiles - Basingstoke (Location & Map Section)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#0B0F19] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Address, Phone, Subtitle & Description */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
                  iRepair Mobiles - Basingstoke 
                </h2>
                <h3 className="text-lg sm:text-xl font-bold text-[#DF0C88]">
                  Your Local Laptop and Phone Repair Shop in Basingstoke!.
                </h3>
              </div>

              {/* Description Paragraphs (Word-for-Word) */}
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                <p>
                  iRepair Mobiles is your trusted partner for hassle-free mobile repairs in Basingstoke. Our experienced technicians will restore your device to its optimal condition using genuine and high-quality replacement parts.
                </p>
                <p>
                  We offer same-day repairs for most common issues and competitive pricing. Let us keep you connected without worry.
                </p>
              </div>

              {/* Address and Contacts Card */}
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-start gap-3 text-slate-200">
                  <MapPin className="w-5 h-5 text-[#DF0C88] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">iRepair Mobiles Basingstoke</span>
                    <span>Unit 14 Old Basing Mall, Basingstoke RG21 7AW, UK</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-200">
                  <Phone className="w-5 h-5 text-[#DF0C88] shrink-0" />
                  <a href="tel:+447733304047" className="hover:text-[#DF0C88] transition-colors font-semibold">
                    +44 7733 304047 / 07733 304047
                  </a>
                </div>

                <div className="flex items-start gap-3 text-slate-200">
                  <Clock className="w-5 h-5 text-[#DF0C88] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Opening Hours:</span>
                    <span>Mon–Sat: 8:30 AM – 7:30 PM</span>
                    <span className="block text-slate-400">Sun: 9:30 AM – 6:30 PM</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#DF0C88]" />
                  <span>Open in Google Maps</span>
                </a>

                <a
                  href="tel:+447733304047"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-[#DF0C88]" />
                  <span>Call 07733 304047</span>
                </a>
              </div>

            </div>

            {/* Right Column: Interactive Embedded Map Card */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-2xl relative">
                
                {/* Header card overlay */}
                <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">iRepair Mobiles Basingstoke</h4>
                    <p className="text-xs text-slate-400">Unit 14 Old Basing Mall, Basingstoke RG21 7AW</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>5.0 (642)</span>
                  </div>
                </div>

                {/* Google Map iframe centered at Unit 14 Old Basing Mall */}
                <div className="w-full h-[320px] sm:h-[380px] bg-slate-900">
                  <iframe
                    title="iRepair Mobiles Basingstoke Map"
                    src="https://maps.google.com/maps?q=14%20Old%20Basing%20Mall,%20Basingstoke,%20RG21%207AW&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full border-0 filter contrast-105"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>

                {/* Bottom directions bar */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Walk-ins always welcome</span>
                  <a
                    href="https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#DF0C88] hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>Get Directions</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: Expert Laptop Repair Services Near You Section
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white text-slate-900 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Heading, Checklist & Copy */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
                  Fast, reliable laptop repairs for all makes and models.
                </h2>
                <h3 className="text-base sm:text-lg font-bold text-[#DF0C88]">
                  laptop repair Services
                </h3>
              </div>

              {/* 8-point Checklist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'Screen Replacement',
                  'Battery Replacement',
                  'Keyboard Repair',
                  'Overheating Fixes',
                  'Storage / RAM Upgrade',
                  'Other Software Issues',
                  'Certified Technicians',
                  '6 Months Repair Warranty',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                    <CheckCircle className="w-4 h-4 text-[#DF0C88] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Exact Description Paragraph (Word-for-Word) */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
                At iRepair, we specialize in fast, reliable, and affordable laptop repair services across the UK. With a network of outlets and a team of certified technicians, we handle everything from hardware repairs and software troubleshooting to data recovery. We’re dedicated to providing high-quality solutions to keep your laptop running smoothly, using top-grade parts and the latest tools.
              </p>

              {/* CTA Button */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    if (startRepairBooking) {
                      startRepairBooking({
                        category: 'laptop',
                        brand: 'apple',
                        model: 'MacBook Pro',
                        issue: 'screen',
                        storeId: 'basingstoke',
                      });
                    } else {
                      setCurrentPage('book-repair');
                    }
                  }}
                  className="px-6 py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-200 inline-flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Get Free Laptop Repair Quote!</span>
                </button>
              </div>

            </div>

            {/* Right Column: Laptop Visual with 20% OFF Badge */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-md">
                
                {/* 20% OFF Badge */}
                <div className="absolute -top-4 -right-2 sm:-top-6 sm:right-2 z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#DF0C88] text-white flex flex-col items-center justify-center shadow-xl border-4 border-white transform rotate-12 hover:rotate-0 transition-transform">
                  <span className="text-base sm:text-xl font-black leading-none">20%</span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">OFF</span>
                </div>

                {/* Laptop Graphic Container */}
                <div className="rounded-2xl bg-gradient-to-tr from-slate-100 to-pink-50/50 p-6 sm:p-8 border border-slate-200/80 shadow-xl flex flex-col items-center justify-center">
                  <div className="relative w-full aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl flex items-center justify-center">
                    <img
                      src="/src/assets/images/laptop_repair_service_1790843599871.jpg"
                      alt="Expert Laptop Repair Basingstoke"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-bold text-white">MacBook, Dell, HP, Lenovo &amp; Asus</span>
                    </div>
                  </div>
                  
                  {/* Laptop Base Mock */}
                  <div className="w-full h-2.5 bg-slate-300 rounded-b-xl -mt-0.5 border-t border-slate-400" />
                  <div className="w-20 h-1.5 bg-slate-400 rounded-b-md mx-auto" />
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: What Our Customers Say! (Testimonials)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
              What Our Customers Are Saying!
            </h2>
            <div className="space-y-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              <p>Hear from our satisfied customers and discover why they choose iRepair Mobiles.</p>
              <p>Their honest reviews speak to our exceptional Screen repair service, skilled technicians, and dedication to customer satisfaction.</p>
              <p>Let their experiences help you make the right choice for your mobile device repairs.</p>
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div 
                key={t.id}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                    "{t.review}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 font-heading">{t.name}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 8: Frequently Asked Questions (FAQ)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white text-slate-900 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
              Frequently Asked Questions (FAQ)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-2xl border border-slate-200/90 overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-3 hover:text-[#DF0C88] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="w-6 h-6 rounded-full bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-700">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed animate-in fade-in duration-200 border-t border-slate-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 9: Must-Haves Phones (Real Products Carousel - Discounted Phones)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header with Title, Subtitle, and Carousel Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/90 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" />
                <span>Basingstoke In-Store &amp; Online Specials</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
                Must-Haves Phones
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Elevate your style and functionality with essentials that complement your lifestyle seamlessly!
              </p>
            </div>

            {/* Carousel Navigation Buttons & Shop Link */}
            <div className="flex items-center gap-2.5 self-start md:self-end">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                aria-label="Previous mobile phones"
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? 'bg-white border-slate-300 text-slate-800 hover:bg-[#DF0C88] hover:text-white hover:border-[#DF0C88] shadow-sm active:scale-95 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                aria-label="Next mobile phones"
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                  canScrollRight
                    ? 'bg-white border-slate-300 text-slate-800 hover:bg-[#DF0C88] hover:text-white hover:border-[#DF0C88] shadow-sm active:scale-95 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('shop')}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold transition-all shadow-sm ml-2 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>View All Phones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real Products Carousel Track - Discounted Mobile Phones */}
          <div 
            ref={carouselRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {discountedPhones.map((product) => {
              const discountAmount = product.regularPrice ? (product.regularPrice - product.price) : 0;
              const discountPercent = product.regularPrice && product.regularPrice > product.price 
                ? Math.round(((product.regularPrice - product.price) / product.regularPrice) * 100) 
                : null;

              return (
                <div
                  key={product.id}
                  className="w-[280px] sm:w-[310px] md:w-[320px] shrink-0 snap-start bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Real Product Image Container */}
                    <div 
                      onClick={() => viewProductDetail?.(product)}
                      className="relative aspect-square rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden mb-3.5 flex items-center justify-center p-4 border border-slate-100 cursor-pointer"
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/src/assets/images/shop_refurbished_phones_1790843576058.jpg';
                        }}
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        {discountPercent && discountPercent > 0 && (
                          <span className="bg-[#DF0C88] text-white text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                            {discountPercent}% OFF
                          </span>
                        )}
                        <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                          {product.condition}
                        </span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="absolute bottom-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          Save £{discountAmount.toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* Brand & Ratings */}
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#DF0C88] uppercase tracking-wider text-[11px]">
                        {product.brand}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-800 text-xs">{product.rating}</span>
                        <span className="text-slate-400 text-[10px]">({product.reviewsCount})</span>
                      </div>
                    </div>

                    {/* Product Title */}
                    <h4 
                      onClick={() => viewProductDetail?.(product)}
                      className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-[#DF0C88] transition-colors cursor-pointer min-h-[2.5rem]"
                    >
                      {product.title}
                    </h4>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-2 pb-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">
                        £{product.price.toFixed(2)}
                      </span>
                      {product.regularPrice && product.regularPrice > product.price && (
                        <span className="text-xs text-slate-400 line-through">
                          £{product.regularPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Stock & Warranty Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pb-3">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{product.warrantyMonths ?? 12}M Warranty • Available In-Store Basingstoke</span>
                    </div>
                  </div>

                  {/* Actions: Add to Basket & View Details */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(product);
                        showNotification?.(`Added ${product.title} to your basket!`, 'success');
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold text-center transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to basket</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => viewProductDetail?.(product)}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="View product details"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Bottom Browse Button */}
          <div className="text-center sm:hidden pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage('shop')}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore All Phones &amp; Deals</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
