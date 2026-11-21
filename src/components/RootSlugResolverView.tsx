import React, { useState, useEffect } from 'react';
import { BlogPostDetailView } from './BlogPostDetailView';
import { DynamicPageRenderer } from './DynamicPageRenderer';
import { resolveSlugApi, ResolvedSlugInfo } from '../services/blogApi';
import { AlertCircle, Home, BookOpen, RefreshCw } from 'lucide-react';

interface RootSlugResolverViewProps {
  slug: string;
}

export const RootSlugResolverView: React.FC<RootSlugResolverViewProps> = ({ slug }) => {
  const [resolved, setResolved] = useState<ResolvedSlugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    resolveSlugApi(slug)
      .then((res) => {
        if (!active) return;
        setResolved(res);
        if (res.type === 'redirect' && res.redirectUrl) {
          window.location.replace(res.redirectUrl);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to resolve page');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 rounded-full border-3 border-[#DF0C88] border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Loading page...</span>
      </div>
    );
  }

  if (error || !resolved || resolved.type === 'not_found' || resolved.statusCode === 404 || resolved.statusCode === 410) {
    const isGone = resolved?.statusCode === 410;
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-black text-2xl shadow-xs">
          {isGone ? '410' : '404'}
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isGone ? 'This Content Has Been Removed' : 'Page Not Found'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            {isGone
              ? 'The article or page you requested has been permanently trashed or removed.'
              : `The path /${slug}/ does not exist on iRepair Mobiles UK.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </a>
          <a
            href="/blogs/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-50 text-[#DF0C88] border border-pink-200 font-bold text-xs hover:bg-pink-100 transition-all shadow-xs active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Blog Articles</span>
          </a>
        </div>
      </div>
    );
  }

  if (resolved.type === 'blog_post') {
    return <BlogPostDetailView slug={slug} />;
  }

  // Fallback to CMS page renderer
  return <DynamicPageRenderer slug={slug} />;
};
