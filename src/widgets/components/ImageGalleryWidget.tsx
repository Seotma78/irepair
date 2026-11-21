import React from 'react';
import { WidgetRenderProps } from '../types';

export const ImageGalleryWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const images = settings.images && settings.images.length > 0 ? settings.images : [
    { url: '/src/assets/images/hero_repair_specialist_1790843562093.jpg', caption: 'Clean Room Diagnostic Bench' },
    { url: '/src/assets/images/repair_screen_replacement_1790843586924.jpg', caption: 'Precision Laser Back Glass Removal' },
    { url: '/src/assets/images/laptop_repair_service_1790843599871.jpg', caption: 'MacBook Logic Board Ultrasound Cleaning' },
    { url: '/src/assets/images/store_cases_banner_1790854719466.jpg', caption: 'UK Flagship Store Interior' },
  ];

  return (
    <section className="py-14 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {settings.title && (
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{settings.title}</h2>
            {settings.subtitle && <p className="text-sm text-slate-500 mt-2">{settings.subtitle}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {images.map((img: any, idx: number) => (
            <div key={idx} className="group relative rounded-2xl overflow-hidden shadow-md aspect-4/3 bg-slate-200">
              <img
                src={img.url || img.image}
                alt={img.caption || `Gallery ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {img.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                  <p className="text-xs font-semibold text-white drop-shadow-sm">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
