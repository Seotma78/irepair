import React, { useState, useEffect } from 'react';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { SectionInstance } from '../widgets/types';
import { useApp } from '../context/AppContext';

interface DynamicPageRendererProps {
  slug: string;
  previewData?: {
    title: string;
    sections: SectionInstance[];
    seo?: any;
  };
}

export const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({ slug, previewData }) => {
  const [pageData, setPageData] = useState<any>(previewData || null);
  const [loading, setLoading] = useState(!previewData);

  useEffect(() => {
    if (previewData) {
      setPageData(previewData);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/cms/pages/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load page');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`Could not load CMS page for ${slug}:`, err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, previewData]);

  // Update document title & SEO tags
  useEffect(() => {
    if (!pageData) return;

    const seo = pageData.seo || {};
    const metaTitle = seo.metaTitle || pageData.title || 'iRepair Mobiles UK';
    const metaDescription = seo.metaDescription || '';

    document.title = metaTitle;

    let descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', metaDescription);
    }

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (seo.noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else if (robotsMeta) {
      robotsMeta.setAttribute('content', 'index, follow');
    }
  }, [pageData]);

  if (loading && !pageData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#DF0C88] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!pageData || !Array.isArray(pageData.sections)) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-black text-2xl shadow-xs">
          404
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Page Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            The page <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#DF0C88] font-mono font-bold">/{slug}</code> could not be found or is currently an unpublished draft.
          </p>
        </div>
        <a
          href="/"
          className="px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          Return to Homepage
        </a>
      </div>
    );
  }

  const sections: SectionInstance[] = [...pageData.sections].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="w-full">
      {sections.map((section) => {
        if (!section.visible && !previewData) {
          return null;
        }

        const widgetDef = WIDGET_REGISTRY[section.type];
        if (!widgetDef) {
          console.warn(`Unknown widget type: ${section.type}`);
          return null;
        }

        const WidgetComponent = widgetDef.component;
        const common = section.commonSettings || {};

        let paddingClass = 'py-0';
        if (common.paddingY === 'small') paddingClass = 'py-6';
        if (common.paddingY === 'medium') paddingClass = 'py-12';
        if (common.paddingY === 'large') paddingClass = 'py-20';

        let hideClass = '';
        if (common.hideOnMobile) hideClass += ' hidden sm:block';
        if (common.hideOnDesktop) hideClass += ' lg:hidden';

        const isFullWidth = common.containerWidth === 'full';
        let widthClass = 'w-full max-w-none px-0 mx-0';
        if (common.containerWidth === 'boxed') {
          widthClass = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
        } else if (common.containerWidth === 'narrow') {
          widthClass = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
        } else if (isFullWidth) {
          widthClass = 'w-full max-w-none px-0 mx-0';
        }

        return (
          <div
            key={section.id}
            id={common.anchorId || undefined}
            className={`relative isolate z-0 ${isFullWidth && (!common.paddingY || common.paddingY === 'none') ? 'py-0' : paddingClass} ${hideClass} ${common.customCssClass || ''} ${isFullWidth ? 'w-full overflow-hidden' : ''}`}
            style={{
              backgroundColor: common.backgroundColor || undefined,
              color: common.textColor || undefined,
            }}
          >
            <div className={widthClass}>
              <WidgetComponent
                settings={section.settings || {}}
                commonSettings={common}
                isPreview={Boolean(previewData)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
