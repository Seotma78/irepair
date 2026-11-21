import React from 'react';
import { WidgetRenderProps } from '../types';

export const RichTextWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const content = settings.content || '<p>Content goes here...</p>';

  return (
    <section className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {settings.title && (
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
            {settings.title}
          </h2>
        )}
        <div
          className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
};
