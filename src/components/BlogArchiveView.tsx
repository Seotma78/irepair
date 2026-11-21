import React, { useState, useEffect } from 'react';
import {
  fetchBlogPosts,
  BlogPostListItem,
} from '../services/blogApi';
import {
  Calendar,
  Clock,
  ArrowRight,
  Folder,
  Tag,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface BlogArchiveViewProps {
  type: 'category' | 'tag' | 'author';
  slug: string;
}

export const BlogArchiveView: React.FC<BlogArchiveViewProps> = ({ type, slug }) => {
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const formattedTitle = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  useEffect(() => {
    setLoading(true);
    const params: any = { page: currentPage, perPage: 12 };
    if (type === 'category') params.category = slug;
    if (type === 'tag') params.tag = slug;
    if (type === 'author') params.author = slug;

    fetchBlogPosts(params)
      .then((data) => {
        setPosts(data.posts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        document.title = `${formattedTitle} - ${type.charAt(0).toUpperCase() + type.slice(1)} Archive | iRepair Mobiles UK`;
      })
      .catch((err) => console.error('Failed to load archive:', err))
      .finally(() => setLoading(false));
  }, [type, slug, currentPage]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white py-12 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <a href="/" className="hover:text-white">Home</a>
            <span>/</span>
            <a href="/blogs/" className="hover:text-white">Blogs</a>
            <span>/</span>
            <span className="text-[#DF0C88] font-bold capitalize">{type}: {formattedTitle}</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-[#DF0C88] flex items-center justify-center">
              {type === 'category' && <Folder className="w-5 h-5" />}
              {type === 'tag' && <Tag className="w-5 h-5" />}
              {type === 'author' && <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">
                {type} Archive
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                {formattedTitle}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Showing {total} articles under {type} "{formattedTitle}"
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <a
            href="/blogs/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#DF0C88] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Blogs</span>
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs animate-pulse space-y-4">
                <div className="w-full h-48 bg-slate-200 rounded-2xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">No articles found in this archive</h3>
            <a
              href="/blogs/"
              className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Browse all blogs
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
              >
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
                </a>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-[#DF0C88] transition-colors line-clamp-2 leading-snug mb-2.5">
                      <a href={`/${post.slug}/`}>{post.title}</a>
                    </h2>

                    {post.excerpt && (
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

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

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-600 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
