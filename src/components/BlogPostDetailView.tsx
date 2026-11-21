import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchBlogPostBySlug,
  fetchBlogPosts,
  fetchBlogCategories,
  BlogPostDetail,
  BlogPostListItem,
  BlogCategory,
} from '../services/blogApi';
import {
  Search,
  Mail,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Tag,
  Wrench,
  BookOpen,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Share2,
  Folder,
  CheckCircle2,
} from 'lucide-react';

interface BlogPostDetailViewProps {
  slug: string;
}

export const BlogPostDetailView: React.FC<BlogPostDetailViewProps> = ({ slug }) => {
  const { setCurrentPage } = useApp();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [prevPost, setPrevPost] = useState<any | null>(null);
  const [nextPost, setNextPost] = useState<any | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostListItem[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sidebar Search State
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Newsletter Subscription State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  // Related Posts Slider Ref
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // Fetch primary blog post data
    fetchBlogPostBySlug(slug)
      .then((data) => {
        if (!active) return;
        setPost(data.post);
        setPrevPost(data.prevPost);
        setNextPost(data.nextPost);
        setRelatedPosts(data.relatedPosts || []);
        document.title = data.post.seo_title || `${data.post.title} | iRepair Mobiles UK`;
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Article not found');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Fetch categories and recent posts for the sidebar
    fetchBlogCategories()
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => {});

    fetchBlogPosts({ perPage: 5 })
      .then((res) => {
        if (active) setRecentPosts(res.posts);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [slug]);

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy') => {
    const url = window.location.href;
    const title = post?.title || 'Check out this article on iRepair Mobiles UK';

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  const handleSidebarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebarSearch.trim()) return;
    setCurrentPage('blogs');
    // Allow query to be picked up
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/blogs/?search=${encodeURIComponent(sidebarSearch.trim())}`);
      window.dispatchEvent(new Event('locationchange'));
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) return;
    setNewsletterSubmitting(true);
    setTimeout(() => {
      setNewsletterSubmitting(false);
      setNewsletterSubmitted(true);
      setNewsletterEmail('');
    }, 600);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = sliderRef.current.clientWidth * 0.8;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-5 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="w-full h-80 bg-slate-200 rounded-3xl" />
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
              <div className="h-4 bg-slate-200 rounded w-4/6" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-32 bg-slate-200 rounded-3xl" />
            <div className="h-48 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-[60vh] bg-[#F8FAFC] flex items-center justify-center py-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-[#DF0C88] rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Article Not Found</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "The article you are looking for might have been moved or doesn't exist."}
          </p>
          <a
            href="/blogs/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Blogs</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Breadcrumb Navigation Strip */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            <a href="/" className="hover:text-slate-900 transition-colors font-medium">Home</a>
            <span className="text-slate-300">/</span>
            <a href="/blogs/" className="hover:text-slate-900 transition-colors font-medium">Blogs</a>
            {post.categories.length > 0 && (
              <>
                <span className="text-slate-300">/</span>
                <a
                  href={`/blog-category/${post.categories[0].slug}/`}
                  className="hover:text-slate-900 transition-colors font-medium"
                >
                  {post.categories[0].name}
                </a>
              </>
            )}
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs">{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Container: 2-Column Grid with Article + Sticky Right Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ============================================================ */}
          {/* LEFT / MAIN COLUMN (Article Content & Actions)                */}
          {/* ============================================================ */}
          <main className="lg:col-span-8 space-y-8">
            <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs">
              
              {/* Category Badge & Headline */}
              <div className="space-y-3 mb-6">
                {post.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.categories.map((c) => (
                      <a
                        key={c.id}
                        href={`/blog-category/${c.slug}/`}
                        className="px-3 py-1 rounded-full bg-pink-50 text-[#DF0C88] border border-pink-100 text-xs font-bold hover:bg-[#DF0C88] hover:text-white transition-colors"
                      >
                        {c.name}
                      </a>
                    ))}
                  </div>
                )}

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {post.title}
                </h1>
              </div>

              {/* Featured Image */}
              <div className="mb-8 rounded-2xl overflow-hidden shadow-sm bg-slate-100 aspect-16/9 relative group">
                <img
                  src={post.featured_image_url || '/uploads/blog/658de447_Thumbnail.jpg'}
                  alt={post.featured_image_alt || post.title}
                  width={1200}
                  height={675}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/uploads/blog/658de447_Thumbnail.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Excerpt Lead Paragraph if present */}
              {post.excerpt && (
                <div className="text-base text-slate-600 font-medium leading-relaxed pb-6 mb-6 border-b border-slate-100 italic">
                  {post.excerpt}
                </div>
              )}

              {/* Rich Post HTML Content with Full Table, Section Divider & Spacing Support */}
              <div
                className="blog-article-content max-w-none text-slate-800 text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Tags Section */}
              {post.tags.length > 0 && (
                <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
                    <Tag className="w-3.5 h-3.5" /> Tags:
                  </span>
                  {post.tags.map((t) => (
                    <a
                      key={t.id}
                      href={`/tag/${t.slug}/`}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      #{t.name}
                    </a>
                  ))}
                </div>
              )}
            </article>

            {/* ============================================================ */}
            {/* POST DETAILS FOOTER: BANNER + SOCIAL BUTTONS + GOOGLE LINKS */}
            {/* ============================================================ */}

            {/* 1. "Have Any Question? Feel Free To Ask" Grey Banner (Matching Screenshot) */}
            <div className="bg-[#B8B8B8] rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight text-center sm:text-left">
                Have Any Question? Feel Free To Ask
              </h3>
              <a
                href="/contact-us/"
                className="bg-black hover:bg-neutral-800 text-white font-bold text-sm px-7 py-2.5 rounded-full transition-all duration-200 hover:scale-105 shadow-md whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
              >
                <span>Contact Us</span>
              </a>
            </div>

            {/* 2. Social / Contact Buttons Strip (Matching Screenshot) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Facebook Button (#3B5998) */}
              <button
                onClick={() => handleShare('facebook')}
                className="bg-[#3B5998] hover:bg-[#324b80] text-white font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
                aria-label="Share or message on Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>

              {/* Twitter Button (#1DA1F2) */}
              <button
                onClick={() => handleShare('twitter')}
                className="bg-[#1DA1F2] hover:bg-[#0d8ddb] text-white font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
                aria-label="Share on Twitter"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/>
                </svg>
                <span>Twitter</span>
              </button>

              {/* LinkedIn Button (#0077B5) */}
              <button
                onClick={() => handleShare('linkedin')}
                className="bg-[#0077B5] hover:bg-[#005f93] text-white font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
                aria-label="Share on LinkedIn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span>LinkedIn</span>
              </button>

              {/* WhatsApp Button (#25D366) */}
              <button
                onClick={() => handleShare('whatsapp')}
                className="bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
                aria-label="Chat or share on WhatsApp"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp</span>
              </button>
            </div>

            {/* 3. Google Links for Queries (Reviews, Maps, Business Profile) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Google Verification &amp; Store Queries</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  4.9 / 5.0 Rated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Google Reviews Link */}
                <a
                  href="https://www.google.com/search?q=iRepair+Mobiles+UK+reviews"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors truncate">
                      Google Reviews
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">1,200+ 5-star ratings</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#DF0C88] ml-auto shrink-0 transition-colors" />
                </a>

                {/* Google Maps Store Link */}
                <a
                  href="/locations/"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-4 h-4 text-[#DF0C88]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors truncate">
                      Google Maps Stores
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">8 UK High Street Hubs</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#DF0C88] ml-auto shrink-0 transition-colors" />
                </a>

                {/* Google Business Profile / Help */}
                <a
                  href="/contact-us/"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors truncate">
                      Ask Any Question
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Live UK phone &amp; desk</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#DF0C88] ml-auto shrink-0 transition-colors" />
                </a>
              </div>
            </div>

            {/* Prev / Next Article Navigation */}
            {(prevPost || nextPost) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prevPost ? (
                  <a
                    href={prevPost.url}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#DF0C88] shadow-xs group transition-all"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous Article
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] line-clamp-1">
                      {prevPost.title}
                    </div>
                  </a>
                ) : <div />}

                {nextPost && (
                  <a
                    href={nextPost.url}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#DF0C88] shadow-xs group transition-all text-right"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-end gap-1 mb-1">
                      Next Article <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] line-clamp-1">
                      {nextPost.title}
                    </div>
                  </a>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* RELATED BLOG POSTS SLIDER AT THE BOTTOM                      */}
            {/* ============================================================ */}
            {relatedPosts.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#DF0C88]" />
                      <span>Related Guides &amp; Articles</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Explore more helpful hardware insights, troubleshooting steps, and buyer comparisons.
                    </p>
                  </div>

                  {/* Slider Arrow Navigation Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scrollSlider('left')}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollSlider('right')}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Slider Track */}
                <div
                  ref={sliderRef}
                  className="flex gap-5 overflow-x-auto scroll-smooth pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
                >
                  {relatedPosts.map((r) => (
                    <article
                      key={r.id}
                      className="min-w-[260px] sm:min-w-[280px] max-w-[280px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group snap-start"
                    >
                      {/* Image */}
                      <a
                        href={`/${r.slug}/`}
                        className="block aspect-16/10 relative overflow-hidden bg-slate-100"
                      >
                        <img
                          src={r.featured_image_url || '/uploads/blog/658de447_Thumbnail.jpg'}
                          alt={r.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/uploads/blog/658de447_Thumbnail.jpg';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </a>

                      {/* Content (NO author, NO date - clean design) */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors line-clamp-2 leading-snug mb-2">
                            <a href={`/${r.slug}/`}>{r.title}</a>
                          </h4>
                          {r.excerpt && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                              {r.excerpt}
                            </p>
                          )}
                        </div>

                        {/* Footer Link */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                          <a
                            href={`/${r.slug}/`}
                            className="text-xs font-bold text-[#DF0C88] flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                          >
                            <span>Read Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* ============================================================ */}
          {/* RIGHT SIDEBAR (Search, Newsletter, Categories, Recent Posts) */}
          {/* ============================================================ */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* 1. Search Box Widget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#DF0C88]" />
                <span>Search Articles</span>
              </h3>
              
              <form onSubmit={handleSidebarSearchSubmit} className="relative">
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search fixes, guides, tips..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:bg-white transition-all shadow-xs"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-[#DF0C88] transition-colors cursor-pointer"
                  aria-label="Submit search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Suggestion Pills */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {['iPhone 17', 'Screen Repair', 'Battery Life', 'Camera Review', 'Refurbished'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSidebarSearch(tag);
                      setCurrentPage('blogs');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/blogs/?search=${encodeURIComponent(tag)}`);
                        window.dispatchEvent(new Event('locationchange'));
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-pink-50 hover:text-[#DF0C88] text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Newsletter Subscription Widget */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#DF0C88] border border-white/10">
                <Mail className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Subscribe to Our Newsletter
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Get exclusive repair discounts, troubleshooting tips, and UK device release guides directly in your inbox.
                </p>
              </div>

              {newsletterSubmitted ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Thank you for subscribing! Check your inbox soon.</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2.5">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    placeholder="Enter your email address..."
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] focus:bg-white/15 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{newsletterSubmitting ? 'Subscribing...' : 'Subscribe Now'}</span>
                  </button>
                </form>
              )}
              <div className="text-[10px] text-slate-400">
                No spam ever. Unsubscribe at any time with one click.
              </div>
            </div>

            {/* 3. Categories Widget */}
            {categories.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#DF0C88]" />
                  <span>Blog Categories</span>
                </h3>
                <ul className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`/blog-category/${c.slug}/`}
                        className="py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-[#DF0C88] group transition-colors"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">{c.name}</span>
                        {c.count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 group-hover:bg-pink-100 group-hover:text-[#DF0C88] transition-colors">
                            {c.count}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. Recent Posts Widget */}
            {recentPosts.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#DF0C88]" />
                  <span>Recent Articles</span>
                </h3>
                <div className="space-y-3.5">
                  {recentPosts.slice(0, 4).map((rp) => (
                    <a
                      key={rp.id}
                      href={`/${rp.slug}/`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                        <img
                          src={rp.featured_image_url || '/uploads/blog/658de447_Thumbnail.jpg'}
                          alt={rp.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/uploads/blog/658de447_Thumbnail.jpg';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#DF0C88] line-clamp-2 leading-snug transition-colors">
                          {rp.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-[#DF0C88] inline-flex items-center gap-1 mt-0.5 group-hover:underline">
                          Read Guide &rarr;
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Express Repair Assistance CTA Card */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200/70 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DF0C88] text-white text-[10px] font-bold uppercase tracking-wider">
                <Wrench className="w-3 h-3" />
                <span>Express Service</span>
              </div>
              <h4 className="text-base font-black text-slate-900 leading-snug">
                Broken Screen or Dying Battery?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Walk into any of our 8 flagship England stores or book online. 20-minute turnaround with 6-month warranty.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="/book-repair/"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-all shadow-sm cursor-pointer"
                >
                  Book In-Store Repair
                </a>
                <a
                  href="tel:+447471485846"
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold text-center transition-all cursor-pointer"
                >
                  Call Technician: 07471 485846
                </a>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
};
