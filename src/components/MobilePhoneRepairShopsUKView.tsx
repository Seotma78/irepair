import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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
  ArrowRight
} from 'lucide-react';
import { STORE_LOCATIONS } from '../data/mockData';

interface StoreOutletDisplay {
  id: string;
  name: string;
  city: string;
  address: string;
  postcode: string;
  phone: string;
  image: string;
  mapLink: string;
  hours: string;
}

const OUTLETS_LIST: StoreOutletDisplay[] = [
  {
    id: 'norwich',
    name: 'iRepair Mobiles Norwich',
    city: 'Norwich',
    address: "25 Gentleman's Walk, Norwich",
    postcode: 'NR2 1NA',
    phone: '+44 7833 203220',
    image: '/images/outlets/norwich.jpg',
    mapLink: 'https://maps.app.goo.gl/M6Q7BXn78EbYKwgb9',
    hours: 'Mon-Sat: 8:30 AM–6:30 PM | Sun: 9:30 AM–5:30 PM',
  },
  {
    id: 'basingstoke',
    name: 'iRepair Mobiles Basingstoke',
    city: 'Basingstoke',
    address: '14 Old Basing Mall, Basingstoke',
    postcode: 'RG21 7AW',
    phone: '+44 7733 304047',
    image: '/images/outlets/basingstoke.jpg',
    mapLink: 'https://maps.app.goo.gl/kwgBgcgxCGsiy6zD9',
    hours: 'Mon-Sat: 8:30 AM–7:30 PM | Sun: 9:30 AM–6:30 PM',
  },
  {
    id: 'southend',
    name: 'iRepair Mobiles Southend',
    city: 'Southend',
    address: '150 High St, Southend',
    postcode: 'SS1 1JX',
    phone: '+44 7471 485846',
    image: '/images/outlets/southend.jpg',
    mapLink: 'https://maps.app.goo.gl/F67nZpBmL82umWWc9',
    hours: 'Mon-Sat: 8:30 AM–7:00 PM | Sun: 9:30 AM–5:30 PM',
  },
  {
    id: 'eastbourne',
    name: 'iRepair Mobiles Eastbourne',
    city: 'Eastbourne',
    address: '71-73 Terminus Rd, Eastbourne',
    postcode: 'BN21 3NJ',
    phone: '+44 7776 590246',
    image: '/images/outlets/eastbourne.jpg',
    mapLink: 'https://maps.app.goo.gl/VWeQrmh9mk1CA49e7',
    hours: 'Mon-Sat: 8:30 AM–7:30 PM | Sun: 9:30 AM–5:30 PM',
  },
  {
    id: 'reading',
    name: 'iRepair Mobiles Reading',
    city: 'Reading',
    address: '49 Broad St, Reading',
    postcode: 'RG1 2AA',
    phone: '+44 7922 446999',
    image: '/images/outlets/reading.jpg',
    mapLink: 'https://maps.app.goo.gl/hG6UXWUJVhHmXA5JA',
    hours: 'Mon-Sat: 8:00 AM–7:45 PM | Sun: 9:30 AM–6:30 PM',
  },
  {
    id: 'solihull',
    name: 'iRepair Mobiles Solihull',
    city: 'Solihull',
    address: '61 High St, Solihull',
    postcode: 'B91 3SW',
    phone: '+44 121 704 2695',
    image: '/images/outlets/solihull.jpg',
    mapLink: 'https://maps.app.goo.gl/jabBhukACEBKP4qV9',
    hours: 'Mon-Sat: 9:00 AM–6:30 PM | Sun: 9:30 AM–5:30 PM',
  },
  {
    id: 'ipswich',
    name: 'iRepair Mobiles Ipswich',
    city: 'Ipswich',
    address: '26 Tavern St, Ipswich',
    postcode: 'IP1 3AS',
    phone: '+44 7777 347524',
    image: 'https://irepair-mobiles.co.uk/wp-content/uploads/2024/09/Shop-Photos-2.jpg',
    mapLink: 'https://maps.app.goo.gl/PR6iNhAfppMVjJHj7',
    hours: 'Mon-Sat: 9:00 AM–7:00 PM | Sun: 10:00 AM–5:00 PM',
  },
  {
    id: 'newcastle',
    name: 'iRepair Mobiles Newcastle',
    city: 'Newcastle',
    address: '1A Northumberland St, Newcastle upon Tyne',
    postcode: 'NE1 7DA',
    phone: '+44 7497 675123',
    image: '/images/outlets/newcastle.jpg',
    mapLink: 'https://maps.app.goo.gl/YfqorZgUBPEjLpLi6',
    hours: 'Mon-Sat: 8:30 AM–6:00 PM | Sun: 10:00 AM–4:00 PM',
  },
];

interface UKTestimonial {
  id: string;
  name: string;
  subtitle: string;
  review: string;
  rating: number;
  outlet: string;
}

const TESTIMONIALS_UK: UKTestimonial[] = [
  {
    id: '1',
    name: 'Linda Martin',
    subtitle: 'Quick and Affordable iPhone 15 Pro Max Repair at iRepair Mobiles',
    review: 'I recently had an unfortunate accident with my iPhone 15 Pro Max while visiting Plantation Garden in Norwich. The back glass shattered, and I was worried about the repair cost. Luckily, I found iRepair and was pleasantly surprised by their quick and affordable service. The technicians were friendly, efficient, and the repair was done in no time. I would definitely recommend iRepair Mobiles to my friends and family.',
    rating: 5,
    outlet: 'Norwich Outlet',
  },
  {
    id: '2',
    name: 'Alex Turner',
    subtitle: 'Quick and Reliable iPhone Repair Near College Road Norwich',
    review: "I was having a terrible time with my iPhone and desperately needed a screen repair. Luckily, I found iRepair Mobiles near College Road in Norwich. They were quick, efficient, and fixed my phone perfectly. I'm so relieved and would highly recommend them to anyone in the area.",
    rating: 5,
    outlet: 'Norwich Outlet',
  },
  {
    id: '3',
    name: 'Tom Anderson',
    subtitle: 'Unexpectedly Great iPhone 14 Pro Battery Replacement',
    review: "I was surprised at how quickly and efficiently iRepair Mobiles in Norwich replaced my fiancé's iPhone 14 Pro battery. The service was top-notch, and the price was very reasonable. We didn't expect such a smooth and hassle-free experience. I'm truly impressed and would highly recommend iRepair to anyone in Norwich.",
    rating: 5,
    outlet: 'Norwich Outlet',
  },
  {
    id: '4',
    name: 'James Miller',
    subtitle: 'Top-Notch iPhone Screen Repair in Norwich',
    review: "Alright, so I needed a new screen for my iPhone and I was searching for the best phone repair shop near me in Norwich. Well, iRepair Mobiles definitely hit the spot! The technician knew his stuff and fixed my phone super quick. I'm really impressed with the service and would definitely recommend them to anyone in Norwich.",
    rating: 5,
    outlet: 'Norwich Outlet',
  },
];

export const MobilePhoneRepairShopsUKView: React.FC = () => {
  const { setCurrentPage, startRepairBooking } = useApp();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteBrand, setQuoteBrand] = useState('Apple');
  const [quoteIssue, setQuoteIssue] = useState('Screen Replacement');
  const [selectedOutlet, setSelectedOutlet] = useState<StoreOutletDisplay | null>(null);

  // CRITICAL SEO: Synchronize page title, meta description, canonical link, and JSON-LD schema
  useEffect(() => {
    const originalTitle = document.title;
    const pageTitle = 'Mobile Phone Repair Shops in UK | Express Same Day Service - iRepair Mobiles';
    const pageDescription = 'Looking for trusted mobile phone repair shops in the UK? Visit iRepair Mobiles in Reading, Norwich, Basingstoke, Southend, Solihull, Ipswich & Newcastle for same-day repairs.';
    const canonicalHref = 'https://irepair-mobiles.co.uk/mobile-phone-repair-shops-in-uk/';

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
    setMeta('property', 'og:site_name', 'iRepair Mobiles');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDescription);

    // Schema.org Structured Data
    const schemaData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://irepair-mobiles.co.uk/mobile-phone-repair-shops-in-uk/#webpage',
          'url': canonicalHref,
          'name': pageTitle,
          'description': pageDescription,
          'isPartOf': {
            '@type': 'WebSite',
            '@id': 'https://irepair-mobiles.co.uk/#website',
            'name': 'iRepair Mobiles',
            'url': 'https://irepair-mobiles.co.uk/'
          },
          'breadcrumb': {
            '@type': 'BreadcrumbList',
            'itemListElement': [
              {
                '@type': 'ListItem',
                'position': 1,
                'name': 'Home',
                'item': 'https://irepair-mobiles.co.uk/'
              },
              {
                '@type': 'ListItem',
                'position': 2,
                'name': 'Mobile Phone Repair Shops in UK',
                'item': canonicalHref
              }
            ]
          }
        },
        {
          '@type': 'LocalBusiness',
          '@id': 'https://irepair-mobiles.co.uk/#organization',
          'name': 'iRepair Mobiles',
          'url': 'https://irepair-mobiles.co.uk/',
          'logo': 'https://irepair-mobiles.co.uk/images/irepair-logo.svg',
          'image': 'https://irepair-mobiles.co.uk/images/outlets/reading.jpg',
          'telephone': '+447922446999',
          'priceRange': '££',
          'areaServed': {
            '@type': 'Country',
            'name': 'United Kingdom'
          },
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'reviewCount': '2450',
            'bestRating': '5',
            'worstRating': '1'
          },
          'department': OUTLETS_LIST.map((outlet) => ({
            '@type': 'MobilePhoneRepairStore',
            'name': outlet.name,
            'telephone': outlet.phone,
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': outlet.address,
              'addressLocality': outlet.city,
              'postalCode': outlet.postcode,
              'addressCountry': 'GB'
            }
          }))
        }
      ]
    };

    let scriptTag = document.getElementById('seo-schema-mobile-shops') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'seo-schema-mobile-shops';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schemaData);

    return () => {
      document.title = originalTitle;
      const scriptToRemove = document.getElementById('seo-schema-mobile-shops');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  const handleOpenQuote = (issueName?: string) => {
    if (issueName) {
      setQuoteIssue(issueName);
    }
    setQuoteModalOpen(true);
  };

  const handleProceedBooking = (storeId?: string, issue?: string) => {
    setQuoteModalOpen(false);
    startRepairBooking({
      storeId: storeId || 'reading',
      issue: issue || quoteIssue.toLowerCase().replace(/\s+/g, '-'),
    });
  };

  return (
    <div className="w-full bg-white text-slate-900 font-sans antialiased">
      
      {/* Breadcrumb Navigation Bar */}
      <div className="bg-slate-950/90 border-b border-slate-800 text-xs text-slate-400 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage('home')} 
            className="hover:text-white transition-colors"
          >
            Home
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-pink-400 font-medium">Mobile Phone Repair Shops in UK</span>
        </div>
      </div>

      {/* 1. Hero Banner Section: Dark tech theme pattern with overlay, single <h1> */}
      <section className="relative overflow-hidden bg-[#0A0D14] text-white pt-20 pb-28 md:py-32">
        {/* Dark Tech Hexagon Background Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-40 bg-cover bg-right md:bg-center pointer-events-none"
          style={{
            backgroundImage: `url('/assets/aistudio/image_062af09e.png')`,
          }}
        />

        {/* Brand Magenta Ambient Glow on Bottom-Right */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#DF0C88]/30 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Subtle Nationwide Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-pink-300">
            <span className="w-2 h-2 rounded-full bg-[#DF0C88] animate-ping" />
            <span>8 Walk-in Branches Across England &amp; Same-Day UK Mail-In</span>
          </div>

          {/* EXACT H1 Heading (Word-for-Word) */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-heading">
            Revive Your Device Fast, Professional, Affordable Repairs For All Brands.
          </h1>

          {/* EXACT Paragraph / Subheading (Word-for-Word) */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Welcome to iRepair Mobiles – Your Trusted Mobile Phone Repair Shop in UK. With our eight conveniently located outlets, we’re dedicated to resolving all your mobile phone issues promptly and efficiently. Whether it’s a cracked screen, battery problems, or software glitches, our expert technicians are here to provide reliable solutions.
          </p>

          {/* CTA Button: "Get a Free Quote" */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleOpenQuote()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-slate-950 font-bold text-base hover:bg-pink-50 hover:text-[#DF0C88] transition-all transform hover:-translate-y-0.5 shadow-2xl flex items-center justify-center gap-2"
            >
              <span>Get a Free Quote</span>
              <ArrowRight className="w-4 h-4 text-[#DF0C88]" />
            </button>

            <a
              href="#outlets-section"
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#DF0C88]" />
              <span>Find Nearest Store</span>
            </a>
          </div>

          {/* Quick Trust Highlights */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 bg-white/5 py-2 px-3 rounded-lg border border-white/10">
              <Clock className="w-4 h-4 text-[#DF0C88]" />
              <span>Under 30-Min Repairs</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 py-2 px-3 rounded-lg border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>6 Months Guarantee</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 py-2 px-3 rounded-lg border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>No Fix No Fee Policy</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 py-2 px-3 rounded-lg border border-white/10">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>4.9/5 Rating (2,450+ Reviews)</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Why Choose Us Section */}
      <section className="py-20 md:py-24 bg-white text-slate-900 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          
          {/* Section Header (Word-for-Word) */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              Why Choose Us For Your Mobile Phone Repairs?
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              At iRepair Mobiles, we pride ourselves on delivering exceptional repair services backed by years of expertise. Here’s why we stand out:
            </p>
          </div>

          {/* 4 Key Features Grid (Word-for-Word) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Feature 1: Fast Turnaround */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#DF0C88] mb-5 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">
                Fast Turnaround
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We understand the importance of your mobile device, so we strive for fast turnaround times without compromising quality.
              </p>
            </div>

            {/* Feature 2: Customer Satisfaction */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-5 group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8 fill-amber-400 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">
                Customer Satisfaction
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your satisfaction is our priority, and we aim to exceed your expectations with every repair.
              </p>
            </div>

            {/* Feature 3: Quality Repair */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#DF0C88] mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">
                Quality Repair
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                iRepair Reading, offers lightning-fast repairs in under 30 minutes for most common issues. Get your phone back up and running in record time so you can get back to what matters most.
              </p>
            </div>

            {/* Feature 4: Expert Technicians */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-pink-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-5 group-hover:scale-110 transition-transform">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">
                Expert Technicians
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                iRepair Reading, offers lightning-fast repairs in under 30 minutes for most common issues. Get your phone back up and running in record time so you can get back to what matters most.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Choose Your Nearest iRepair Mobiles Outlet Grid */}
      <section id="outlets-section" className="py-20 md:py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Section Header (Word-for-Word) */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
              Choose Your Nearest iRepair Mobiles Outlet
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              We have eight conveniently located outlets across Reading, Basingstoke, Ipswich, Eastbourne, Southend, Solihull, Norwich &amp; Newcastle to serve you better. Find your nearest iRepair Mobiles outlet:
            </p>
          </div>

          {/* Outlets Grid (3-3-2 Layout matching the screenshot exactly) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {OUTLETS_LIST.map((outlet, idx) => (
              <div 
                key={outlet.id} 
                className={`bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group border border-slate-800/80 ${
                  idx >= 6 ? 'lg:col-span-1' : ''
                }`}
              >
                {/* Storefront Photograph */}
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                  <img 
                    src={outlet.image} 
                    alt={`${outlet.name} storefront at ${outlet.address}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Open 7 Days</span>
                  </div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#DF0C88] text-[11px] font-bold text-white shadow-md">
                    Express Hub
                  </div>
                </div>

                {/* Outlet Name & Address Bar (exact layout matching screenshot) */}
                <div className="p-5 bg-white text-slate-900 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 
                      onClick={() => {
                        if (outlet.id === 'basingstoke') setCurrentPage('mobile-phone-repair-basingstoke');
                        else if (outlet.id === 'norwich') setCurrentPage('mobile-phone-repair-shop-in-norwich');
                        else if (outlet.id === 'southend') setCurrentPage('phone-repairing-services-southend');
                        else if (outlet.id === 'eastbourne') setCurrentPage('mobile-phone-repair-shop-eastbourne');
                        else if (outlet.id === 'reading') setCurrentPage('mobile-phone-repair-shop-in-reading');
                        else if (outlet.id === 'solihull') setCurrentPage('mobile-phone-repair-service-solihull');
                        else if (outlet.id === 'ipswich') setCurrentPage('mobile-repair-shop-in-ipswich');
                      }}
                      className={`text-base font-bold text-slate-900 tracking-tight font-heading group-hover:text-[#DF0C88] transition-colors ${
                        outlet.id === 'basingstoke' || outlet.id === 'norwich' || outlet.id === 'southend' || outlet.id === 'eastbourne' || outlet.id === 'reading' || outlet.id === 'solihull' || outlet.id === 'ipswich' ? 'cursor-pointer hover:underline' : ''
                      }`}
                    >
                      {outlet.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#DF0C88] shrink-0 mt-0.5" />
                      <span>{outlet.address}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 pl-5">
                      {outlet.hours}
                    </p>
                  </div>

                  {/* Actions: Call, Directions, Book */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <a
                      href={`tel:${outlet.phone.replace(/\s+/g, '')}`}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                      title={`Call ${outlet.name}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-[#DF0C88]" />
                      <span>Call</span>
                    </a>

                    <a
                      href={outlet.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                      title={`Google Maps directions to ${outlet.name}`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Map</span>
                    </a>

                    <button
                      onClick={() => handleProceedBooking(outlet.id)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold text-center flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <span>Book</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Under-Grid Subtext */}
          <div className="text-center max-w-3xl mx-auto pt-4">
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              At iRepair Mobiles, we focus on delivering reliable and effective solutions for all your mobile phone repair needs. Trust our expert technicians to handle your device with care and expertise, ensuring it's back in your hands in optimal condition.
            </p>
          </div>

        </div>

        {/* Scrolling Marquee Ticker Banner */}
        <div className="mt-14 py-4 bg-slate-950 border-y border-slate-800 overflow-hidden select-none">
          <div className="animate-marquee whitespace-nowrap flex items-center text-xs sm:text-sm md:text-base font-extrabold tracking-widest uppercase">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="inline-flex items-center mx-6 gap-3">
                <span className="text-white">NO REPAIR</span>
                <span className="text-[#DF0C88]">NO FEE POLICY !</span>
                <span className="text-slate-600">•</span>
                <span className="text-white">6 MONTHS WARRANTY</span>
                <span className="text-[#DF0C88]">GENUINE PARTS</span>
                <span className="text-slate-600">•</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Our Range of Services Section */}
      <section className="py-20 md:py-24 bg-white text-slate-900 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Section Header (Word-for-Word) */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              Our Range of Services
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              We offer a comprehensive range of repair services to address a multitude of issues
            </p>
          </div>

          {/* 6 Service Cards (Word-for-Word) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            
            {/* Service 1: Screen Replacement */}
            <div 
              onClick={() => handleOpenQuote('Screen Replacement')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Screen Replacement</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Repair shattered screens and restore your phone to its original condition
                </p>
                <div className="pt-2 text-xs font-semibold text-[#DF0C88] flex items-center gap-1">
                  <span>Under 30 Mins</span>
                  <span>•</span>
                  <span>OLED &amp; Original Specs</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#DF0C88] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Smartphone className="w-7 h-7" />
              </div>
            </div>

            {/* Service 2: Battery & Charging Repairs */}
            <div 
              onClick={() => handleOpenQuote('Battery & Charging Repairs')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Battery &amp; Charging Repairs</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Fix overheating or weak batteries for long-lasting performance.
                </p>
                <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <span>100% Health Guaranteed</span>
                  <span>•</span>
                  <span>Same-Day Swap</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <BatteryCharging className="w-7 h-7" />
              </div>
            </div>

            {/* Service 3: Charging Port Repair */}
            <div 
              onClick={() => handleOpenQuote('Charging Port Repair')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Charging Port Repair</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Fix charging or connection issues and stay connected.
                </p>
                <div className="pt-2 text-xs font-semibold text-blue-600 flex items-center gap-1">
                  <span>Lightning &amp; USB-C</span>
                  <span>•</span>
                  <span>Debris Cleanout &amp; Port Swap</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
            </div>

            {/* Service 4: Camera & Speaker Repair */}
            <div 
              onClick={() => handleOpenQuote('Camera & Speaker Repair')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Camera &amp; Speaker Repair</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Bring your Cameras, Speakers, and MP3 Player features back to life.
                </p>
                <div className="pt-2 text-xs font-semibold text-purple-600 flex items-center gap-1">
                  <span>Crystal Clear Audio</span>
                  <span>•</span>
                  <span>Focus Calibration</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-purple-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
            </div>

            {/* Service 5: Water Damage Fixes */}
            <div 
              onClick={() => handleOpenQuote('Water Damage Fixes')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Water Damage Fixes</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Recover damaged phones with advanced cleaning and restoration tools.
                </p>
                <div className="pt-2 text-xs font-semibold text-cyan-600 flex items-center gap-1">
                  <span>Ultrasonic Chemical Clean</span>
                  <span>•</span>
                  <span>Corrosion Removal</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-cyan-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Droplet className="w-7 h-7" />
              </div>
            </div>

            {/* Service 6: Software Troubleshooting */}
            <div 
              onClick={() => handleOpenQuote('Software Troubleshooting')}
              className="bg-[#F7F8FA] hover:bg-pink-50/40 p-6 sm:p-7 rounded-2xl border border-slate-200/70 hover:border-pink-300 transition-all duration-300 cursor-pointer flex items-center justify-between gap-5 group"
            >
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#DF0C88] transition-colors flex items-center gap-2">
                  <span>Software Troubleshooting</span>
                  <ChevronRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Resolve Software Issues, data recovery, and reset functions safely.
                </p>
                <div className="pt-2 text-xs font-semibold text-amber-600 flex items-center gap-1">
                  <span>iOS &amp; Android Specialists</span>
                  <span>•</span>
                  <span>Safe Data Retention</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Cpu className="w-7 h-7" />
              </div>
            </div>

          </div>

          {/* Under-Services Statement */}
          <div className="text-center max-w-3xl mx-auto pt-6">
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              At iRepair Mobiles, we focus on delivering reliable and effective solutions for all your mobile phone repair needs. Trust our expert technicians to handle your device with care and expertise, ensuring it’s back in your hands in optimal condition.
            </p>
          </div>

        </div>
      </section>

      {/* 5. Our Mission Section */}
      <section className="py-20 md:py-28 bg-black text-white relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#DF0C88]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Section Header (Word-for-Word) */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
            Our Mission
          </h2>

          {/* EXACT Paragraph 1 (Word-for-Word) */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            At iRepair Mobiles, we’re dedicated to restoring your mobile devices to their optimal functionality. With our commitment to quality repairs and customer satisfaction, trust us to handle all your mobile phone repair needs. Find your nearest outlet and experience our exceptional services today. Remember, for reliable, efficient, and prompt mobile phone repairs, iRepair Mobiles is your go-to destination!
          </p>

          {/* EXACT Paragraph 2 (Word-for-Word) */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            At iRepair Mobiles, we aim to be the go-to spot for mobile device repairs and accessories across the UK. With a 15-year legacy, our commitment is clear: delivering top-quality repair services to swiftly restore our customers’ mobile devices to peak performance. Our focus is on ensuring an exceptional customer experience by providing expert solutions that keep our clients connected and their devices in perfect condition. Our dedication lies in precision and efficiency, ensuring your devices get the care they deserve.
          </p>

          {/* Metric Stats Banner */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-slate-800 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#DF0C88] font-heading">15+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Years of Trust</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-heading">50K+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Repairs Completed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#DF0C88] font-heading">8</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">UK Storefronts</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-heading">6 Mo</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Free Warranty</div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Customer Testimonials Section */}
      <section className="py-20 md:py-24 bg-slate-50 text-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Section Header (Word-for-Word) */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              Customer Testimonials
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Discover what our satisfied customers have to say about their experienceswith our products and services. Read these testimonials to learn why they chose us for all their needs.
            </p>

            {/* Aggregated Rating Score */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <div className="flex items-center text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-bold text-slate-900 text-sm">4.9 / 5.0</span>
              <span className="text-xs text-slate-500">• Over 2,450 Verified UK Customer Reviews</span>
            </div>
          </div>

          {/* Testimonial Cards (Exact 4 Testimonials from prompt) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS_UK.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-md flex flex-col justify-between space-y-6 relative hover:shadow-lg transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Verified Customer
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed italic">
                    "{item.review}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-base font-heading">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#DF0C88] font-semibold">
                      {item.subtitle}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.outlet}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-5 border border-slate-800 shadow-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-white">
              Ready to restore your device?
            </h3>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Walk-in repairs welcome at all 8 stores across the UK with no appointment needed, or book online for express guaranteed priority queueing.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleOpenQuote()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>Get a Free Quote Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage('locations')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-pink-400" />
                <span>View All Store Addresses &amp; Hours</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Quick Quote Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative space-y-6">
            
            <button
              onClick={() => setQuoteModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close quote modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Online Repair Estimate</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Get a Free Quote
              </h3>
              <p className="text-xs text-slate-500">
                Select your device brand and repair service for instant estimate and branch booking.
              </p>
            </div>

            <div className="space-y-4">
              {/* Brand selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Device Brand:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Apple', 'Samsung', 'Google Pixel'].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setQuoteBrand(brand)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        quoteBrand === brand
                          ? 'border-[#DF0C88] bg-pink-50 text-[#DF0C88] ring-1 ring-[#DF0C88]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service issue selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Repair Required:
                </label>
                <select
                  value={quoteIssue}
                  onChange={(e) => setQuoteIssue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                >
                  <option value="Screen Replacement">Screen Replacement (Glass &amp; OLED)</option>
                  <option value="Battery & Charging Repairs">Battery &amp; Charging Repairs</option>
                  <option value="Charging Port Repair">Charging Port Repair</option>
                  <option value="Camera & Speaker Repair">Camera &amp; Speaker Repair</option>
                  <option value="Water Damage Fixes">Water Damage Fixes</option>
                  <option value="Software Troubleshooting">Software Troubleshooting</option>
                </select>
              </div>

              {/* Estimate Highlights */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Turnaround Time:</span>
                  <span className="font-bold text-slate-900">20–30 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Parts &amp; Labor Warranty:</span>
                  <span className="font-bold text-emerald-600">6 Months Included</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Policy:</span>
                  <span className="font-bold text-[#DF0C88]">No Fix, No Fee Guarantee</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleProceedBooking()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Continue to Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setQuoteModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
