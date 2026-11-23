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

export const NorwichRepairShopPage: React.FC = () => {
  const { 
    setCurrentPage, 
    startRepairBooking, 
    addToCart, 
    showNotification,
    products,
    viewProductDetail 
  } = useApp();

  // Real Limited Time Offer Products from AppContext / mockData
  const offerProducts = useMemo(() => {
    const list = products && products.length > 0 ? products : PRODUCTS;
    const discounted = list.filter((p) => p.regularPrice && p.regularPrice > p.price);
    return discounted.length >= 4 ? discounted : list;
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
  }, [offerProducts]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Quote Form State
  const [selectedBrand, setSelectedBrand] = useState<string>('apple');
  const [phoneModel, setPhoneModel] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<string>('screen');
  const [showIssuePicker, setShowIssuePicker] = useState<boolean>(false);
  const [quoteCalculated, setQuoteCalculated] = useState<boolean>(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Store Front Image Fallback
  const [heroImgSrc, setHeroImgSrc] = useState<string>('https://irepair-mobiles.co.uk/wp-content/uploads/2024/09/Shop-Photos-3.jpg');

  // CRITICAL SEO: Synchronize page title, meta description, canonical link, and JSON-LD schema
  useEffect(() => {
    const pageTitle = 'Best Mobile Phone Repair Shop in Norwich | iRepair Mobiles';
    const pageDescription = 'iRepair Mobiles Norwich is your trusted mobile phone & laptop repair shop at 25 Gentleman\'s Walk, Norwich NR2 1NA. Screen repair, battery replacements, 6-month warranty & same-day turnaround.';
    const canonicalHref = 'https://irepair-mobiles.co.uk/mobile-phone-repair-shop-in-norwich/';

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
    setMeta('property', 'og:image', 'https://irepair-mobiles.co.uk/wp-content/uploads/2024/09/Shop-Photos-3.jpg');

    // JSON-LD Structured Data for LocalBusiness & FAQPage
    const jsonLdScriptId = 'norwich-store-jsonld';
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
          '@id': 'https://irepair-mobiles.co.uk/mobile-phone-repair-shop-in-norwich/#localbusiness',
          'name': 'iRepair Mobiles Norwich',
          'url': 'https://irepair-mobiles.co.uk/mobile-phone-repair-shop-in-norwich/',
          'telephone': '+44 1603 620061',
          'image': 'https://irepair-mobiles.co.uk/wp-content/uploads/2024/09/Shop-Photos-3.jpg',
          'priceRange': '££',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': "25 Gentleman's Walk",
            'addressLocality': 'Norwich',
            'postalCode': 'NR2 1NA',
            'addressRegion': 'Norfolk',
            'addressCountry': 'GB',
          },
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': 52.6288,
            'longitude': 1.2933,
          },
          'hasMap': 'https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9',
          'openingHoursSpecification': [
            {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              'opens': '08:30',
              'closes': '18:30',
            },
            {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': ['Sunday'],
              'opens': '09:30',
              'closes': '17:30',
            },
          ],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '5.0',
            'reviewCount': '817',
          },
        },
        {
          '@type': 'FAQPage',
          '@id': 'https://irepair-mobiles.co.uk/mobile-phone-repair-shop-in-norwich/#faq',
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
  }, []);


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
        storeId: 'norwich',
      });
    } else {
      setCurrentPage('book-repair');
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
              
              {/* Mandatory Top <h1> Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight font-heading">
                Best Mobile Phone Repair Shop in Norwich...
              </h1>

              {/* Exact Paragraph 1 */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                iRepair Mobiles Norwich is your one-stop Mobile Phone Repair Shop in Norwich, offering complete solutions for all your mobile device and laptop repair needs. We specialize in a wide range of repairs, including iPhone, Samsung, Google Pixel, and more. With our expert technicians and state-of-the-art equipment, we provide fast, reliable, and affordable repairs to keep your devices running smoothly.
              </p>

              {/* Exact Paragraph 2 */}
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
                Our technicians are experts in their field, equipped with the latest state-of-the-art technology and precision tools to diagnose and repair your device efficiently. We understand how important your device is to you, and we’re committed to providing a fast and reliable repair service that exceeds your expectations.
              </p>

              {/* Hero CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={scrollToQuote}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center gap-2 border border-white hover:scale-[1.02]"
                >
                  <Smartphone className="w-4 h-4 text-[#DF0C88]" />
                  <span>Get Quote ( 20% OFF)</span>
                </button>

                <a
                  href="https://wa.me/447833203220?text=Hi%20iRepair%20Norwich%2C%20I%20would%20like%20expert%20advice%20for%20a%20device%20repair"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-[1.02]"
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
                  <span className="text-slate-400">(817 Google Reviews)</span>
                </div>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300">25 Gentleman's Walk, NR2 1NA</span>
                <span className="text-slate-700">•</span>
                <span className="text-emerald-400">Open Mon–Sat 8:30–18:30</span>
              </div>
            </div>

            {/* Right Column: Storefront Image with Get Directions Overlay */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800 group">
                <img
                  src={heroImgSrc}
                  alt="iRepair Mobiles Norwich Storefront at 25 Gentleman's Walk"
                  className="w-full h-[320px] sm:h-[380px] lg:h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => setHeroImgSrc('/images/outlets/norwich.jpg')}
                />
                
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                {/* Store Label */}
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>iRepair Mobiles Norwich Branch</span>
                </div>

                {/* Floating "Get Directions" Button overlay matching the screenshot */}
                <div className="absolute bottom-5 right-5 left-5 sm:left-auto">
                  <a
                    href="https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-xl transition-all duration-200 hover:scale-105 border border-slate-200"
                  >
                    <MapPin className="w-4 h-4 text-[#DF0C88]" />
                    <span>Get Directions</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Diagonal striped magenta bottom border */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 opacity-90"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #DF0C88, #DF0C88 12px, #0B0F19 12px, #0B0F19 24px)',
          }}
        />
      </section>

      {/* =========================================================================
          SECTION 2: iRepair Mobiles Norwich Advantages Section
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Exact Section Title */}
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              iRepair Mobiles Norwich Advantages
            </h2>
          </div>

          {/* 3 Key Feature Cards matching the design screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Feature 1: Customer Satisfaction */}
            <div className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-[#DF0C88] flex items-center justify-center text-white shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 font-heading">
                Customer Satisfaction
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We pride ourselves on providing excellent customer service. Our friendly and knowledgeable staff is here to answer your questions, offer advice, and ensure a hassle-free repair experience. We're committed to exceeding your expectations and building long-lasting relationships with our Norwich customers.
              </p>
            </div>

            {/* Feature 2: Expert Technicians */}
            <div className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-md">
                  <Users className="w-7 h-7" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 font-heading">
                Expert Technicians
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our skilled technicians are experts in repairing a wide range of devices, from the latest iPhones to older models. We understand the specific needs of Norwich residents and are committed to providing top-notch service.
              </p>
            </div>

            {/* Feature 3: Fast Turnaround - Same-Day Services */}
            <div className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-white flex items-center justify-center text-slate-900 shadow-md relative">
                  <span className="text-xs font-black">30</span>
                  <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-[#DF0C88]" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 font-heading">
                Fast Turnaround - Same-Day Services
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We know how important your devices are to you. That's why our mobile phone shop offer fast turnaround times and, in many cases, same-day service. Our efficient repair process ensures minimal downtime, so you can get back to what matters most.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Ticker / Running Marquee Bar */}
      <div className="py-3 bg-black border-y border-slate-800 text-xs sm:text-sm font-black tracking-widest uppercase overflow-hidden select-none">
        <div className="animate-marquee whitespace-nowrap flex items-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="inline-flex items-center mx-6 gap-3">
              <span className="text-white">NO REPAIR</span>
              <span className="text-[#DF0C88]">NO FEE POLICY ! 🤝</span>
              <span className="text-slate-600">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: We Repair All Major Brands (Dark tech theme)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#0B0F19] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Headings and Paragraphs */}
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
                We Repair All Major Brands
              </h2>
              
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Need a phone repair in Norwich? Look no further than iRepair Mobiles, your local experts in device repair. We specialize in fixing a wide range of smartphones and tablets, including iPhone, Samsung, OnePlus, Google Pixel, Xiaomi, Oppo, Nokia, Huawei, and more.
              </p>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Our experienced technicians use state-of-the-art tools and techniques to diagnose and repair your device quickly and efficiently. Whether you're dealing with a cracked screen, a faulty battery, or water damage, we've got you covered.
              </p>

              <div className="pt-2">
                <button
                  onClick={scrollToQuote}
                  className="px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2"
                >
                  <span>Select Your Brand Below</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Branded Badges Grid */}
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

                {/* OPPO */}
                <div 
                  onClick={() => { setSelectedBrand('other'); scrollToQuote(); }}
                  className="bg-[#008A4F] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-wider">oppo</span>
                </div>

                {/* OnePlus */}
                <div 
                  onClick={() => { setSelectedBrand('oneplus'); scrollToQuote(); }}
                  className="bg-[#EB0029] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-2 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-wider">ONEPLUS</span>
                </div>

                {/* Nokia */}
                <div 
                  onClick={() => { setSelectedBrand('nokia'); scrollToQuote(); }}
                  className="bg-[#124191] rounded-xl p-4 sm:p-5 flex items-center justify-center gap-3 text-white hover:scale-105 transition-transform duration-200 cursor-pointer shadow-lg"
                >
                  <span className="text-base sm:text-lg font-black tracking-widest">NOKIA</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: Get a Free Quote Today! Form
          ========================================================================= */}
      <section id="quote-section" className="py-16 sm:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/90 space-y-8">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
                Get a Free Quote Today!
              </h2>
              {/* Stepper bar */}
              <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-300"
                  style={{ width: showIssuePicker ? '100%' : '50%' }}
                />
              </div>
            </div>

            {/* Sub-heading */}
            <div className="pt-2">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Device Details
              </h3>
            </div>

            {/* Brand Selection Grid */}
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-800">
                Select Brand <span className="text-[#DF0C88]">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BRANDS_LIST.map((brand) => {
                  const isSelected = selectedBrand === brand.id;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedBrand(brand.id)}
                      className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-[#DF0C88] bg-pink-50/50 shadow-sm ring-2 ring-[#DF0C88]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-lg font-bold text-slate-800">{brand.logo}</span>
                      <span className="text-xs font-semibold text-slate-700">{brand.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Model Input */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800">
                Phone Model <span className="text-[#DF0C88]">*</span>
              </label>
              <input
                type="text"
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                placeholder="e.g. iPhone 14 Pro, Samsung Galaxy S23, Pixel 7..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#DF0C88] focus:ring-2 focus:ring-[#DF0C88]/20 text-slate-900 text-sm"
              />
            </div>

            {/* Action to show issues picker */}
            {!showIssuePicker ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssuePicker(true)}
                  className="px-6 py-3 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-sm shadow-md transition-all duration-200 inline-flex items-center gap-2"
                >
                  <span>Select Issue</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
                
                {/* Issue Selector */}
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-bold text-slate-800">
                    Select Repair Issue <span className="text-[#DF0C88]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ISSUES_LIST.map((issue) => {
                      const isSelected = selectedIssue === issue.id;
                      return (
                        <div
                          key={issue.id}
                          onClick={() => {
                            setSelectedIssue(issue.id);
                            setQuoteCalculated(true);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-[#DF0C88] bg-pink-50/60 shadow-sm ring-2 ring-[#DF0C88]/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900">{issue.name}</div>
                            <div className="text-[11px] text-slate-500">Est. turnaround: {issue.time}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-[#DF0C88]">Quote on Request</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quote Calculation Banner */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs mb-1">
                      Team Quote Provided After Submission
                    </span>
                    <h4 className="text-base sm:text-lg font-bold">
                      Repair Quote for Norwich Branch
                    </h4>
                    <p className="text-xs text-slate-400">
                      Our team will respond with your tailored repair price once your query is submitted. 6 months warranty included.
                    </p>
                  </div>

                  <div className="text-center sm:text-right shrink-0">
                    <div className="text-xs font-bold text-pink-300">
                      Price Confirmed in Response
                    </div>
                    <button
                      type="button"
                      onClick={handleBookFromQuote}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-1.5"
                    >
                      <span>Request Quote &amp; Book</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 5: iRepair Mobiles - Norwich (Location & Interactive Map)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#0B0F19] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Exact Store Details & Copy */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
                  iRepair Mobiles - Norwich
                </h2>
                <h3 className="text-base sm:text-lg font-semibold text-[#DF0C88]">
                  Swift & Affordable Repairs for Every Mobile Phone Brand.
                </h3>
              </div>

              {/* Exact Paragraph 1 */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                For over 16 years, iRepair Mobiles has been at the forefront of phone repair service. Now, we're proud to bring our expertise to Norwich. As your local tech experts, we specialize in repairing a wide range of devices, including smartphones, tablets, and laptops.
              </p>

              {/* Exact Paragraph 2 */}
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Our team of skilled technicians is dedicated to providing top-quality screen repair service at affordable prices. Whether you need a screen repair, battery replacement, or water damage restoration, we've got you covered.
              </p>

              {/* Contact & Hours Quick Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin className="w-4 h-4 text-[#DF0C88]" />
                    <span>Store Address</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    25 Gentleman's Walk
                  </p>
                  <p className="text-xs text-slate-400">
                    Norwich, NR2 1NA
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock className="w-4 h-4 text-[#DF0C88]" />
                    <span>Opening Hours</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Mon–Sat: 8:30 AM – 6:30 PM
                  </p>
                  <p className="text-xs text-slate-400">
                    Sun: 9:30 AM – 5:30 PM
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2 shadow-md"
                >
                  <MapPin className="w-4 h-4 text-[#DF0C88]" />
                  <span>Open in Google Maps</span>
                </a>

                <a
                  href="tel:01603620061"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-2 border border-slate-700"
                >
                  <Phone className="w-4 h-4 text-[#DF0C88]" />
                  <span>Call 01603 620061</span>
                </a>
              </div>

            </div>

            {/* Right Column: Interactive Embedded Map Card */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-2xl relative">
                
                {/* Header card overlay */}
                <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">iRepair Mobiles Norwich</h4>
                    <p className="text-xs text-slate-400">25 Gentleman's Walk, Norwich NR2 1NA</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>5.0 (817)</span>
                  </div>
                </div>

                {/* Google Map iframe */}
                <div className="w-full h-[320px] sm:h-[380px] bg-slate-900">
                  <iframe
                    title="iRepair Mobiles Norwich Map"
                    src="https://maps.google.com/maps?q=25%20Gentleman's%20Walk,%20Norwich,%20NR2%201NA&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full border-0 filter contrast-105"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>

                {/* Bottom directions bar */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Walk-ins always welcome</span>
                  <a
                    href="https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9"
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

        {/* Diagonal striped magenta bottom border */}
        <div 
          className="mt-16 h-2 opacity-90"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #DF0C88, #DF0C88 12px, #0B0F19 12px, #0B0F19 24px)',
          }}
        />
      </section>

      {/* =========================================================================
          SECTION 6: Expert Laptop Repair Services Near You
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white text-slate-900 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Heading, Checklist & Copy */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold text-[#DF0C88] tracking-wider uppercase">
                  Expert Laptop Repair Services Near You
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
                  Our Laptop Repair in Norwich
                </h2>
              </div>

              {/* 8-point Checklist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'Screen Replacement',
                  'Storage / RAM Upgrade',
                  'Battery Replacement',
                  'Other Software Issues',
                  'Keyboard Repair',
                  'Certified Technicians',
                  'Overheating Fixes',
                  '6 Months Repair Warranty',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                    <CheckCircle className="w-4 h-4 text-[#DF0C88] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Exact Description Paragraph */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
                Need a laptop repair in Norwich? Look no further. Our expert technicians can diagnose and fix a wide range of laptop issues, including screen repair, keyboard replacement, hard drive replacement, and software problems. We use high-quality parts and advanced techniques to ensure a fast and reliable repair.
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
                        storeId: 'norwich',
                      });
                    } else {
                      setCurrentPage('book-repair');
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-[#DF0C88] hover:bg-[#c50875] text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-200 inline-flex items-center gap-2 hover:scale-[1.02]"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Book Laptop Repair By Remote</span>
                </button>
              </div>

            </div>

            {/* Right Column: Modern Laptop Visual with 20% OFF Badge */}
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
                      src="/images/laptop_repair_service_1790843599871.jpg"
                      alt="Expert Laptop Repair Norwich"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-bold text-white">MacBook, Dell, HP, Lenovo & Asus</span>
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
              What Our Customers Say!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Read real customer reviews about iRepair Mobiles Norwich and see why we're the top choice for phone and laptop repair in the area.
            </p>
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
                    className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-3 hover:text-[#DF0C88] transition-colors"
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
          SECTION 9: Limited Time Offers (Real Products Carousel)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header with Title, Subtitle, and Carousel Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/90 text-[#DF0C88] text-xs font-bold uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" />
                <span>Norwich Store &amp; Online Deals</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
                Limited Time Offers
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Huge Discounts on Selected Models!
              </p>
            </div>

            {/* Carousel Navigation Buttons & Shop Link */}
            <div className="flex items-center gap-2.5 self-start md:self-end">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                aria-label="Previous products"
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
                aria-label="Next products"
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
                <span>View All Deals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real Products Carousel Track */}
          <div 
            ref={carouselRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {offerProducts.map((product) => {
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
                          // Fallback to local stock phone photo if external fails
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
                      <span>{product.warrantyMonths ?? 12}M Warranty • In Stock in Norwich</span>
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
              <span>Explore All Products &amp; Deals</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
