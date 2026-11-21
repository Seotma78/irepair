import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MediaPickerModal } from '../components/MediaPickerModal';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  History,
  Copy,
  Check,
  Eye,
  Calendar,
  Tag,
  Folder,
  Layers,
  Save,
  X,
  Globe,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Code,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Heading3,
} from 'lucide-react';

interface AdminBlogPost {
  id: string;
  wp_id?: number | null;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled' | 'trashed';
  published_at: string;
  source: 'wordpress' | 'local';
  edited_locally: boolean;
  featured_image_url: string;
  reading_time: number;
  author_name?: string;
  author_id?: string;
  url: string;
  categories: { id: string; name: string; slug: string }[];
}

interface BlogCategoryItem {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  description: string;
  count: number;
  source: string;
}

interface BlogTagItem {
  id: string;
  name: string;
  slug: string;
  source: string;
}

interface BlogAuthorItem {
  id: string;
  name: string;
  slug: string;
}

const STORE_BASE_URL = 'https://irepair-mobiles.co.uk';

export const BlogManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'editor' | 'terms' | 'sync_history'>('posts');
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategoryItem[]>([]);
  const [tags, setTags] = useState<BlogTagItem[]>([]);
  const [authors, setAuthors] = useState<BlogAuthorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Bulk Actions
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkTargetCategory, setBulkTargetCategory] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<'new_updated' | 'full'>('new_updated');
  const [syncResultModal, setSyncResultModal] = useState<any | null>(null);
  const [lastSync, setLastSync] = useState<any | null>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // Post Editor State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFeaturedImage, setFormFeaturedImage] = useState('');
  const [formFeaturedAlt, setFormFeaturedAlt] = useState('');
  const [formAuthorId, setFormAuthorId] = useState('');
  const [formStatus, setFormStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formSelectedCats, setFormSelectedCats] = useState<string[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');
  const [formCanonicalUrl, setFormCanonicalUrl] = useState('');
  const [formOgImage, setFormOgImage] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editorSuccess, setEditorSuccess] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [htmlSourceMode, setHtmlSourceMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Terms manager
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Content editable ref for visual formatting
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        perPage: '20',
        status: statusFilter,
        category: categoryFilter,
        search,
      });
      const res = await fetch(`/api/admin/blog/posts?${q.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotalPages(data.totalPages);
        setTotalPosts(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch admin blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/blog/categories'),
        fetch('/api/blog/tags'),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (tagRes.ok) setTags(await tagRes.json());
    } catch (err) {
      console.error('Failed to fetch terms:', err);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/admin/blog/sync/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsSyncing(Boolean(data.isRunning));
        setLastSync(data.lastSync);
        setSyncHistory(data.history || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchTerms();
    fetchSyncStatus();
  }, []);

  // Trigger WordPress Sync
  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/blog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({ mode: syncMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      setSyncResultModal(data.summary);
      await fetchPosts();
      await fetchTerms();
      await fetchSyncStatus();
    } catch (err: any) {
      alert(`WordPress blog sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open editor for new post
  const openNewPost = () => {
    setEditingPostId(null);
    setFormTitle('');
    setFormSlug('');
    setOriginalSlug('');
    setFormExcerpt('');
    setFormContent('');
    setFormFeaturedImage('');
    setFormFeaturedAlt('');
    setFormAuthorId('');
    setFormStatus('published');
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
    setFormScheduledAt('');
    setFormSelectedCats([]);
    setFormTags([]);
    setFormMetaTitle('');
    setFormMetaDesc('');
    setFormCanonicalUrl('');
    setFormOgImage('');
    setEditorError('');
    setEditorSuccess('');
    setHasUnsavedChanges(false);
    setActiveTab('editor');
  };

  // Open editor for existing post
  const openEditPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/admin/blog/posts/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (!res.ok) throw new Error('Failed to load post');
      const data = await res.json();

      setEditingPostId(data.id);
      setFormTitle(data.title);
      setFormSlug(data.slug);
      setOriginalSlug(data.slug);
      setFormExcerpt(data.excerpt || '');
      setFormContent(data.content || '');
      setFormFeaturedImage(data.featured_image_url || '');
      setFormFeaturedAlt(data.featured_image_alt || '');
      setFormAuthorId(data.author_id || '');
      setFormStatus(data.status || 'published');
      setFormPublishedAt(data.published_at ? data.published_at.slice(0, 16) : '');
      setFormScheduledAt(data.scheduled_at ? data.scheduled_at.slice(0, 16) : '');
      setFormSelectedCats(data.categories || []);
      setFormTags(data.tags || []);
      setFormMetaTitle(data.seo_title || '');
      setFormMetaDesc(data.seo_description || '');
      setFormCanonicalUrl(data.canonical_url || '');
      setFormOgImage(data.og_image || '');
      setEditorError('');
      setEditorSuccess('');
      setHasUnsavedChanges(false);
      setActiveTab('editor');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save post
  const handleSavePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingPost(true);
    setEditorError('');
    setEditorSuccess('');

    try {
      const payload = {
        title: formTitle,
        slug: formSlug,
        excerpt: formExcerpt,
        content: formContent,
        featured_image_url: formFeaturedImage,
        featured_image_alt: formFeaturedAlt,
        author_id: formAuthorId || null,
        status: formStatus,
        published_at: formPublishedAt ? new Date(formPublishedAt).toISOString() : new Date().toISOString(),
        scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
        seo_title: formMetaTitle,
        seo_description: formMetaDesc,
        canonical_url: formCanonicalUrl,
        og_image: formOgImage || formFeaturedImage,
        categories: formSelectedCats,
        tags: formTags,
      };

      const url = editingPostId ? `/api/admin/blog/posts/${editingPostId}` : '/api/admin/blog/posts';
      const method = editingPostId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save post');
      }

      setEditorSuccess(
        editingPostId
          ? originalSlug !== formSlug
            ? `Post updated! Automatic 301 redirect created from /${originalSlug}/ to /${formSlug}/.`
            : 'Post updated successfully!'
          : 'New blog post published successfully!'
      );
      setOriginalSlug(formSlug);
      setHasUnsavedChanges(false);
      await fetchPosts();
    } catch (err: any) {
      setEditorError(err.message);
    } finally {
      setSavingPost(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string, permanent: boolean = false) => {
    if (!confirm(permanent ? 'Permanently delete this post?' : 'Move this post to trash?')) return;
    try {
      const res = await fetch(`/api/admin/blog/posts/${postId}?permanent=${permanent}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        await fetchPosts();
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Bulk actions handler
  const handleBulkAction = async () => {
    if (!bulkAction || selectedPostIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/blog/posts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          action: bulkAction,
          postIds: selectedPostIds,
          targetCategoryId: bulkTargetCategory,
        }),
      });
      if (res.ok) {
        setSelectedPostIds([]);
        setBulkAction('');
        await fetchPosts();
      }
    } catch (err: any) {
      alert('Bulk action failed');
    }
  };

  const copyPublicUrl = (slug: string) => {
    const url = `${STORE_BASE_URL}/${slug}/`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Rich Text Editor formatting helper
  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentAreaRef.current) {
      setFormContent(contentAreaRef.current.innerHTML);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#DF0C88]" />
            <span>WordPress Blog Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage synchronized WordPress articles, write local blog posts at root level (/{'{'}slug{'}'}/), and audit SEO canonicals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Last sync info */}
          {lastSync && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Synced:{' '}
                <strong className="text-slate-700">
                  {new Date(lastSync.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  lastSync.status === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {lastSync.status}
              </span>
            </div>
          )}

          {/* Sync Mode Dropdown + Button */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as any)}
              className="bg-transparent text-[11px] font-semibold text-slate-700 px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="new_updated">Sync New &amp; Updated</option>
              <option value="full">Full Resync</option>
            </select>
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isSyncing
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#DF0C88] hover:bg-[#C50875] text-white shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync from WP'}</span>
            </button>
          </div>

          {/* New Post Button */}
          <button
            onClick={openNewPost}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-[#DF0C88] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Articles ({totalPosts})
        </button>
        <button
          onClick={() => openNewPost()}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-[#DF0C88] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {editingPostId ? 'Edit Article' : 'Article Editor'}
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-[#DF0C88] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Categories &amp; Tags
        </button>
        <button
          onClick={() => setActiveTab('sync_history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sync_history'
              ? 'bg-[#DF0C88] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Sync History</span>
        </button>
      </div>

      {/* TAB 1: POSTS LIST */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Filters & Bulk Actions Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search articles..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="scheduled">Scheduled</option>
                <option value="trashed">Trashed</option>
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk actions */}
            {selectedPostIds.length > 0 && (
              <div className="flex items-center gap-2 bg-pink-50 p-1.5 rounded-xl border border-pink-100">
                <span className="text-xs font-bold text-[#DF0C88] px-2">
                  {selectedPostIds.length} selected
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-pink-200 rounded-lg text-xs font-semibold"
                >
                  <option value="">Bulk Actions</option>
                  <option value="publish">Publish</option>
                  <option value="unpublish">Unpublish (Draft)</option>
                  <option value="trash">Move to Trash</option>
                  <option value="delete">Permanently Delete</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  className="px-3 py-1 bg-[#DF0C88] text-white text-xs font-bold rounded-lg hover:bg-[#C50875] cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.length === posts.length && posts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPostIds(posts.map((p) => p.id));
                          else setSelectedPostIds([]);
                        }}
                        className="rounded text-[#DF0C88]"
                      />
                    </th>
                    <th className="py-3 px-4">Title &amp; Public URL</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Categories</th>
                    <th className="py-3 px-4 text-center">Source</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Published Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DF0C88]" />
                        <span>Loading articles...</span>
                      </td>
                    </tr>
                  ) : posts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No articles found. Click "Sync from WP" to import all existing WordPress articles.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedPostIds.includes(post.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPostIds((prev) => [...prev, post.id]);
                              else setSelectedPostIds((prev) => prev.filter((id) => id !== post.id));
                            }}
                            className="rounded text-[#DF0C88]"
                          />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-sm">
                          <div className="font-bold text-slate-900 line-clamp-1">{post.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-[#DF0C88]">
                            <a
                              href={`/${post.slug}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1 truncate max-w-[260px]"
                            >
                              <span>/{post.slug}/</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                            </a>
                            <button
                              onClick={() => copyPublicUrl(post.slug)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Copy URL"
                            >
                              {copiedSlug === post.slug ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {post.author_name || 'iRepair Team'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {post.categories?.map((c) => (
                              <span key={c.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {post.source === 'wordpress' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              WordPress
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Local
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              post.status === 'published'
                                ? 'bg-emerald-100 text-emerald-700'
                                : post.status === 'draft'
                                  ? 'bg-slate-100 text-slate-600'
                                  : post.status === 'scheduled'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(post.published_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditPost(post.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#DF0C88] hover:bg-pink-50 transition-colors cursor-pointer"
                              title="Edit Article"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id, post.status === 'trashed')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={post.status === 'trashed' ? 'Delete Permanently' : 'Move to Trash'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Showing page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ARTICLE EDITOR */}
      {activeTab === 'editor' && (
        <form onSubmit={handleSavePost} className="space-y-6">
          {/* Top save bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between sticky top-4 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {editingPostId ? 'Editing Article:' : 'Creating New Article:'}
              </span>
              <span className="text-xs font-black text-slate-900 truncate max-w-xs">
                {formTitle || 'Untitled'}
              </span>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Back to List
              </button>
              <button
                type="submit"
                disabled={savingPost}
                className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingPost ? 'Saving...' : 'Save & Publish'}</span>
              </button>
            </div>
          </div>

          {editorError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editorError}</span>
            </div>
          )}

          {editorSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{editorSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Title, Slug, Content, Excerpt */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Slug Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Article Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      setHasUnsavedChanges(true);
                      if (!editingPostId) {
                        const autoSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        setFormSlug(autoSlug);
                      }
                    }}
                    placeholder="e.g. 5 Common iPhone 14 Pro Max Problems and How to Fix Them"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                  />
                </div>

                {/* Slug with Namespace Notice */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Root-level Slug (/{formSlug || 'slug'}/)</label>
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Shares root namespace with CMS pages
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 select-none">
                      {STORE_BASE_URL}/
                    </span>
                    <input
                      type="text"
                      required
                      value={formSlug}
                      onChange={(e) => {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                        setHasUnsavedChanges(true);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-[#DF0C88] font-bold focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                    />
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 select-none">
                      /
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Slug uniqueness is strictly validated against reserved routes, CMS pages, and redirects. Changing this on an existing post will automatically create a 301 redirect.
                  </p>
                </div>
              </div>

              {/* Rich Content Editor */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <label className="text-xs font-bold text-slate-700">Article Content</label>
                  <button
                    type="button"
                    onClick={() => setHtmlSourceMode(!htmlSourceMode)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{htmlSourceMode ? 'Visual Mode' : 'HTML Source'}</span>
                  </button>
                </div>

                {!htmlSourceMode && (
                  <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                    <button
                      type="button"
                      onClick={() => execFormat('formatBlock', '<h2>')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs font-bold cursor-pointer"
                      title="Heading 2"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('formatBlock', '<h3>')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs font-bold cursor-pointer"
                      title="Heading 3"
                    >
                      <Heading3 className="w-4 h-4" />
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => execFormat('bold')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs font-bold cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('italic')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs font-bold cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => execFormat('insertUnorderedList')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs cursor-pointer"
                      title="Bullet list"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('insertOrderedList')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs cursor-pointer"
                      title="Numbered list"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('formatBlock', '<blockquote>')}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs cursor-pointer"
                      title="Blockquote"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                    <span className="w-px h-4 bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Enter hyperlink URL:');
                        if (url) execFormat('createLink', url);
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs cursor-pointer"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Enter image URL:');
                        if (url) execFormat('insertImage', url);
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-xs cursor-pointer"
                      title="Insert Image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {htmlSourceMode ? (
                  <textarea
                    rows={16}
                    value={formContent}
                    onChange={(e) => {
                      setFormContent(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                ) : (
                  <div
                    ref={contentAreaRef}
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: formContent }}
                    onInput={(e) => {
                      setFormContent((e.target as HTMLDivElement).innerHTML);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full min-h-[350px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88] prose prose-slate max-w-none"
                  />
                )}
              </div>

              {/* Excerpt */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Excerpt / Summary</label>
                <textarea
                  rows={3}
                  value={formExcerpt}
                  onChange={(e) => { setFormExcerpt(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="Short excerpt shown in blog cards and social previews..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#DF0C88] focus:outline-none"
                />
              </div>

              {/* Rank Math SEO Integration (Read-Only) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#DF0C88]" />
                    <span>Rank Math SEO (Managed in WordPress)</span>
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Rank Math Synced
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">Public URL Path</span>
                    <span className="text-[11px] font-mono text-slate-800">/{formSlug || 'slug'}/</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">Search Robots</span>
                    <span className="text-[11px] font-semibold text-emerald-700">Index, Follow</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed">
                  SEO meta titles, descriptions, OpenGraph cards, and schema graphs are edited directly in WordPress (Rank Math) to ensure ranking preservation.
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formSlug) return;
                      try {
                        const res = await fetch('/api/seo/sync-page', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path: `/${formSlug}/`, entity_type: 'post' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`SEO for /${formSlug}/ re-synchronized successfully from WordPress!`);
                        } else {
                          alert(`Re-sync failed: ${data.error}`);
                        }
                      } catch (err: any) {
                        alert(`Network error during SEO re-sync: ${err.message}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-sync SEO for this item
                  </button>

                  <a
                    href={`https://irepair-mobiles.co.uk/wp-admin/post.php?post=${posts.find((p) => p.id === editingPostId)?.wp_id || ''}&action=edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DF0C88] bg-pink-50 hover:bg-pink-100 rounded-lg transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Edit in WordPress (Rank Math)
                  </a>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Publishing Status, Categories, Tags, Featured Image */}
            <div className="space-y-6">
              {/* Publishing Options Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Publishing Settings
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => { setFormStatus(e.target.value as any); setHasUnsavedChanges(true); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {formStatus === 'scheduled' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={formScheduledAt}
                      onChange={(e) => { setFormScheduledAt(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={formPublishedAt}
                    onChange={(e) => { setFormPublishedAt(e.target.value); setHasUnsavedChanges(true); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Featured Image Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Featured Image
                </h3>

                {formFeaturedImage ? (
                  <div className="space-y-3">
                    <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={formFeaturedImage}
                        alt={formFeaturedAlt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFeaturedImage('')}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formFeaturedImage}
                      onChange={(e) => setFormFeaturedImage(e.target.value)}
                      placeholder="Paste image URL..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Choose from Media Library
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Image Alt Text</label>
                  <input
                    type="text"
                    value={formFeaturedAlt}
                    onChange={(e) => setFormFeaturedAlt(e.target.value)}
                    placeholder="Descriptive alt text for SEO..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Categories Selector */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>Categories</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('terms')}
                    className="text-[11px] text-[#DF0C88] font-bold hover:underline"
                  >
                    + Manage
                  </button>
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSelectedCats.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFormSelectedCats([...formSelectedCats, cat.id]);
                          else setFormSelectedCats(formSelectedCats.filter((id) => id !== cat.id));
                          setHasUnsavedChanges(true);
                        }}
                        className="rounded text-[#DF0C88]"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags Selector */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Article Tags
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTagInput.trim() && !formTags.includes(newTagInput.trim())) {
                          setFormTags([...formTags, newTagInput.trim()]);
                          setNewTagInput('');
                          setHasUnsavedChanges(true);
                        }
                      }
                    }}
                    placeholder="Add tag and press Enter..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTagInput.trim() && !formTags.includes(newTagInput.trim())) {
                        setFormTags([...formTags, newTagInput.trim()]);
                        setNewTagInput('');
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {formTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormTags(formTags.filter((tag) => tag !== t));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: CATEGORIES & TAGS MANAGER */}
      {activeTab === 'terms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Folder className="w-5 h-5 text-[#DF0C88]" />
              <span>Blog Categories</span>
            </h3>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2">
              {categories.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">/{c.slug}/</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {c.count} posts
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{c.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Tag className="w-5 h-5 text-[#DF0C88]" />
              <span>Blog Tags ({tags.length})</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 max-h-96 overflow-y-auto p-1">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-medium"
                >
                  #{t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYNC HISTORY */}
      {activeTab === 'sync_history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <History className="w-5 h-5 text-[#DF0C88]" />
            <span>WordPress Blog Sync History Log</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Breakdown</th>
                  <th className="py-3 px-4">Conflicts / Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {syncHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No sync logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  syncHistory.map((log) => {
                    let sum: any = null;
                    try { sum = JSON.parse(log.summary || '{}'); } catch (_) {}
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-800">
                          {new Date(log.started_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {sum?.durationMs ? `${sum.durationMs}ms` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {sum ? (
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              <span className="text-emerald-700 font-bold">+{sum.postsCreated || 0} created</span>
                              <span className="text-sky-700 font-bold">~{sum.postsUpdated || 0} updated</span>
                              <span className="text-rose-700 font-bold">-{sum.postsTrashed || 0} trashed</span>
                              <span className="text-slate-500 font-semibold">{sum.imagesDownloaded || 0} images</span>
                            </div>
                          ) : (
                            log.error || '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sum?.conflicts?.length > 0 ? (
                            <span className="text-amber-600 font-bold">
                              {sum.conflicts.length} slug conflicts
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">0 conflicts</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync Results Modal */}
      {syncResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">WordPress Blog Sync Completed</h3>
              </div>
              <button onClick={() => setSyncResultModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                Fetched and processed <strong>{syncResultModal.totalRemotePosts}</strong> posts in{' '}
                <strong>{syncResultModal.durationMs}ms</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Posts Created</div>
                  <div className="text-lg font-black text-emerald-700">{syncResultModal.postsCreated}</div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Posts Updated</div>
                  <div className="text-lg font-black text-sky-700">{syncResultModal.postsUpdated}</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Images Downloaded</div>
                  <div className="text-lg font-black text-purple-700">{syncResultModal.imagesDownloaded}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Terms Synced</div>
                  <div className="text-lg font-black text-slate-700">
                    {syncResultModal.categories} cats / {syncResultModal.tags} tags
                  </div>
                </div>
              </div>

              {/* Conflicts Report */}
              {syncResultModal.conflicts?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{syncResultModal.conflicts.length} Slug Conflicts Detected (Safely Protected)</span>
                  </div>
                  <div className="text-[11px] text-amber-700 space-y-1 max-h-32 overflow-y-auto">
                    {syncResultModal.conflicts.map((c: any, i: number) => (
                      <div key={i} className="font-mono bg-white/70 p-1 rounded">
                        <strong>/{c.slug}/</strong>: "{c.postTitle}" conflicts with {c.conflictingItem}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSyncResultModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerOpen && (
        <MediaPickerModal
          isOpen={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(url) => {
            setFormFeaturedImage(url);
            setMediaPickerOpen(false);
          }}
        />
      )}
    </div>
  );
};
