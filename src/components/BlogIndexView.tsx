import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchBlogPosts,
  fetchBlogCategories,
  BlogPostListItem,
  BlogCategory,
} from '../services/blogApi';
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Folder,
  Sparkles,
} from 'lucide-react';

interface BlogIndexViewProps {
  initialPage?: number;
}

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({ initialPage = 1 }) => {
  const { setCurrentPage } = useApp();
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageNum, setCurrentPageNum] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load categories
  useEffect(() => {
    fetchBlogCategories()
      .then(setCategories)
      .catch((err) => console.error('Failed to load blog categories:', err));
  }, []);

  // Load posts whenever category, search, or page changes
  useEffect(() => {
    setLoading(true);
    fetchBlogPosts({
      page: currentPageNum,
      perPage: 9,
      category: selectedCategory || undefined,
      search: searchQuery || undefined,
    })
      .then((data) => {
        setPosts(data.posts);
        setTotalPages(data.totalPages);
        setTotalPosts(data.total);
      })
      .catch((err) => console.error('Failed to load posts:', err))
      .finally(() => setLoading(false));
  }, [currentPageNum, selectedCategory, searchQuery]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPageNum(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const newPath = newPage === 1 ? '/blogs/' : `/blogs/page/${newPage}/`;
    window.history.pushState({}, '', newPath);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white pt-12 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(223,12,136,0.15),transparent_60%)]" />
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span>/</span>
            <span className="text-[#DF0C88] font-bold">Blogs</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Official Repair &amp; Tech Guides</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
              iRepair Mobiles Blog
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Expert smartphone care advice, screen repair walkthroughs, refurbished device insights, and hardware troubleshooting guides written by certified UK technicians.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => { setSelectedCategory(''); setCurrentPageNum(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                !selectedCategory
                  ? 'bg-[#DF0C88] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Articles ({totalPosts})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.slug); setCurrentPageNum(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#DF0C88] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name} {cat.count > 0 && `(${cat.count})`}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPageNum(1); }}
              placeholder="Search guides & tips..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] shadow-xs"
            />
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs animate-pulse space-y-4">
                <div className="w-full h-48 bg-slate-200 rounded-2xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-12 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Articles Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find any articles matching your search query or selected category.
            </p>
            <button
              onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
              >
                {/* Image */}
                <a
                  href={`/${post.slug}/`}
                  className="block relative aspect-16/10 overflow-hidden bg-slate-100 shrink-0"
                >
                  <img
                    src={post.featured_image_url || '/uploads/blog/658de447_Thumbnail.jpg'}
                    alt={post.featured_image_alt || post.title}
                    width={600}
                    height={375}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/uploads/blog/658de447_Thumbnail.jpg';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {post.categories.length > 0 && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                      {post.categories[0].name}
                    </span>
                  )}
                </a>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors line-clamp-2 leading-snug mb-2.5">
                      <a href={`/${post.slug}/`}>{post.title}</a>
                    </h2>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end mt-auto">
                    <a
                      href={`/${post.slug}/`}
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPageNum - 1)}
              disabled={currentPageNum === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              if (
                p === 1 ||
                p === totalPages ||
                (p >= currentPageNum - 1 && p <= currentPageNum + 1)
              ) {
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPageNum === p
                        ? 'bg-[#DF0C88] text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              }
              if (p === 2 && currentPageNum > 3) {
                return <span key={p} className="text-slate-400 select-none px-1">...</span>;
              }
              if (p === totalPages - 1 && currentPageNum < totalPages - 2) {
                return <span key={p} className="text-slate-400 select-none px-1">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => handlePageChange(currentPageNum + 1)}
              disabled={currentPageNum === totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
