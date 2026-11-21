import React from 'react';
import { WidgetRenderProps } from '../types';

export const MapEmbedWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const embedUrl = settings.embedUrl || 'https://maps.google.com/maps?q=49%20Broad%20Street%2C%20Reading%2C%20RG1%202AA&t=&z=15&ie=UTF8&iwloc=&output=embed';

  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {settings.title && (
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">{settings.title}</h2>
        )}
        <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <iframe
            title="Location Map"
            src={embedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
};

export const VideoEmbedWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const videoUrl = settings.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';

  return (
    <section className="py-12 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {settings.title && (
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">{settings.title}</h2>
        )}
        {settings.subtitle && (
          <p className="text-sm text-slate-400 mb-8">{settings.subtitle}</p>
        )}
        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <iframe
            src={videoUrl}
            title={settings.title || 'Video'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
};

export const SpacerWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const height = settings.height || 48;
  const showDivider = settings.showDivider || false;

  return (
    <div style={{ height: `${height}px` }} className="w-full flex items-center justify-center">
      {showDivider && <hr className="w-full border-t border-slate-200/80" />}
    </div>
  );
};
