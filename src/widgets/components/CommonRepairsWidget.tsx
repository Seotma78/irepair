import React, { useState, useEffect, useRef } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { 
  Smartphone, 
  BatteryCharging, 
  Zap, 
  Droplets, 
  ShieldAlert, 
  Camera, 
  Volume2, 
  Cpu, 
  Database,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play
} from 'lucide-react';

// Swiper React & Modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, Keyboard, A11y } from 'swiper/modules';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

const iconMap: Record<string, React.ElementType> = {
  Smartphone,
  BatteryCharging,
  Zap,
  Droplets,
  ShieldAlert,
  Camera,
  Volume2,
  Cpu,
  Database,
};

const DEFAULT_REPAIRS = [
  {
    id: 'screen',
    name: 'Cracked Screen / OLED Replacement',
    description: 'Precision replacement for shattered glass, damaged OLED pixels, touch unresponsiveness, or vertical green lines.',
    basePrice: 59,
    durationMinutes: 30,
    iconName: 'Smartphone',
    image: '/images/repairs/screen_replacement.jpg',
  },
  {
    id: 'battery',
    name: 'Battery Replacement & Health Restore',
    description: 'High-capacity certified battery cells with battery health calibration to resolve fast battery drain and sudden shutdowns.',
    basePrice: 39,
    durationMinutes: 30,
    iconName: 'BatteryCharging',
    image: '/images/repairs/battery_replacement.jpg',
  },
  {
    id: 'charging-port',
    name: 'Charging Port & USB-C Flex Repair',
    description: 'Fix loose cables, slow charging, port dirt accumulation, or broken connector pins with genuine dock flex replacements.',
    basePrice: 45,
    durationMinutes: 30,
    iconName: 'Zap',
    image: '/images/repairs/charging_port.jpg',
  },
  {
    id: 'water-damage',
    name: 'Liquid & Water Damage Ultrasonic Clean',
    description: 'Specialist ultrasonic chemical bath deoxidization and PCB corrosion cleaning to revive submerged smartphones.',
    basePrice: 49,
    durationMinutes: 60,
    iconName: 'Droplets',
    image: '/images/repairs/water_damage.jpg',
  },
  {
    id: 'back-glass',
    name: 'Rear Back Glass Laser Housing Repair',
    description: 'Specialist cold-laser separation technology to safely replace shattered rear casing without opening the device.',
    basePrice: 49,
    durationMinutes: 45,
    iconName: 'ShieldAlert',
    image: '/images/repairs/back_glass_repair.jpg',
  },
  {
    id: 'camera',
    name: 'Camera Lens & Sensor Replacement',
    description: 'Restore blurry focus, cracked camera sapphire lens, camera shake jitter, or black viewfinder screens.',
    basePrice: 45,
    durationMinutes: 30,
    iconName: 'Camera',
    image: '/images/repairs/charging_port.jpg',
  },
  {
    id: 'speaker-mic',
    name: 'Earpiece Speaker & Microphone Repair',
    description: 'Solve muffled calls, distorted loudspeaker audio, low in-call volume, and microphone failure.',
    basePrice: 39,
    durationMinutes: 30,
    iconName: 'Volume2',
    image: '/images/repairs/screen_replacement.jpg',
  },
  {
    id: 'motherboard',
    name: 'Logic Board Micro-Soldering Diagnostics',
    description: 'Component-level trace repairs, audio IC replacements, power management chip fixes, and short-circuit recovery.',
    basePrice: 79,
    durationMinutes: 120,
    iconName: 'Cpu',
    image: '/images/repairs/water_damage.jpg',
  },
  {
    id: 'data-recovery',
    name: 'Emergency Data Recovery & Restore',
    description: 'Recover vital family photos, WhatsApp messages, contacts, and notes from dead, boot-looping, or waterlogged phones.',
    basePrice: 59,
    durationMinutes: 60,
    iconName: 'Database',
    image: '/images/repairs/laptop_repair.jpg',
  },
];

export const CommonRepairsWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { startRepairBooking } = useApp();
  const [items, setItems] = useState<any[]>(() => {
    if (settings.items && settings.items.length > 0) return settings.items;
    return DEFAULT_REPAIRS;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    if (settings.items && settings.items.length > 0) {
      setItems(settings.items);
      return;
    }

    fetch('/api/cms/collections/repair_items')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        } else {
          setItems(DEFAULT_REPAIRS);
        }
      })
      .catch(() => {
        setItems(DEFAULT_REPAIRS);
      });
  }, [settings.items]);

  const displayItems = items.length > 0 ? items : DEFAULT_REPAIRS;

  const toggleAutoplay = () => {
    if (!swiperRef.current) return;
    if (isPlaying) {
      swiperRef.current.autoplay?.stop();
      setIsPlaying(false);
    } else {
      swiperRef.current.autoplay?.start();
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    swiperRef.current?.slidePrev();
  };

  const handleNext = () => {
    swiperRef.current?.slideNext();
  };

  return (
    <section className="w-full py-8 sm:py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Title and Carousel Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#DF0C88] uppercase tracking-wider mb-2">
              <span>Diagnostic Excellence</span>
              <span aria-hidden="true">·</span>
              <span>Genuine OEM Components</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
              {settings.title || 'Common Repairs We Fix Daily'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              {settings.subtitle || 'Professional component-level repairs using state-of-the-art diagnostic machinery across all UK stores'}
            </p>
          </div>

          {/* Right Action & Carousel Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => startRepairBooking()}
              className="hidden lg:inline-flex items-center gap-2 text-xs font-bold text-[#DF0C88] hover:text-[#C50875] mr-2 transition-colors cursor-pointer"
            >
              <span>Custom Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={toggleAutoplay}
              title={isPlaying ? 'Pause auto-scrolling' : 'Play auto-scrolling'}
              aria-label={isPlaying ? 'Pause auto-scrolling' : 'Play auto-scrolling'}
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-[#DF0C88] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
            </button>

            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrev}
              title="Previous repairs"
              aria-label="Previous repairs"
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-[#DF0C88] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              title="Next repairs"
              aria-label="Next repairs"
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-[#DF0C88] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-Column Auto-Scrolling Swiper Carousel Strictly Bounded in Container */}
        <div className="relative w-full overflow-hidden">
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            modules={[Navigation, Autoplay, Keyboard, A11y]}
            slidesPerView={1.15}
            spaceBetween={14}
            loop={displayItems.length > 4}
            keyboard={{ enabled: true }}
            autoplay={{
              delay: 3400,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            speed={600}
            breakpoints={{
              640: {
                slidesPerView: 2.2,
                spaceBetween: 16,
              },
              1024: {
                slidesPerView: 4, // Exact 4 columns/cards strictly within container
                spaceBetween: 20,
              },
            }}
            className="w-full overflow-hidden"
          >
            {displayItems.map((item: any, idx: number) => {
              const Icon = iconMap[item.iconName || item.icon_name] || Smartphone;
              
              // Map to high-resolution repair photography
              const id = (item.id || item.slug || '').toLowerCase();
              const name = (item.name || '').toLowerCase();
              let repairImage = item.image || item.imageUrl || '/images/repairs/screen_replacement.jpg';
              if (id.includes('battery') || name.includes('battery')) {
                repairImage = '/images/repairs/battery_replacement.jpg';
              } else if (id.includes('water') || id.includes('liquid') || name.includes('water') || name.includes('liquid')) {
                repairImage = '/images/repairs/water_damage.jpg';
              } else if (id.includes('charging') || id.includes('port') || name.includes('charging') || name.includes('port')) {
                repairImage = '/images/repairs/charging_port.jpg';
              } else if (id.includes('back-glass') || name.includes('back') || name.includes('glass')) {
                repairImage = '/images/repairs/back_glass_repair.jpg';
              } else if (id.includes('laptop') || name.includes('laptop') || name.includes('macbook')) {
                repairImage = '/images/repairs/laptop_repair.jpg';
              } else if (idx === 1) {
                repairImage = '/images/repairs/battery_replacement.jpg';
              } else if (idx === 2) {
                repairImage = '/images/repairs/charging_port.jpg';
              } else if (idx === 3) {
                repairImage = '/images/repairs/water_damage.jpg';
              } else if (idx === 4) {
                repairImage = '/images/repairs/back_glass_repair.jpg';
              } else if (idx === 5) {
                repairImage = '/images/repairs/charging_port.jpg';
              }

              return (
                <SwiperSlide key={`${item.id || idx}`} className="!h-auto flex">
                  <div className="group w-full bg-white rounded-2xl border border-slate-200/90 hover:border-[#DF0C88]/50 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                      {/* Photo Header with 16:9 Aspect Ratio and Subtle Zoom */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        <img 
                          src={repairImage} 
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                        
                        {/* Floating Duration Tag */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                          <Clock className="w-3 h-3 text-[#DF0C88]" />
                          <span>{item.durationMinutes || item.duration_minutes || 30} mins</span>
                        </div>

                        {/* Floating Hardware Icon Badge */}
                        <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md text-[#DF0C88] flex items-center justify-center shadow-md">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 sm:p-5">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#DF0C88] transition-colors mb-1.5 leading-snug line-clamp-1" title={item.name}>
                          {item.name}
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2rem]">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Price & Book Repair CTA */}
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                          From Price
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                          £{(item.basePrice || item.base_price || 39).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => startRepairBooking({ issue: item.id })}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
                      >
                        Book Repair
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

      </div>
    </section>
  );
};

export default CommonRepairsWidget;
