export interface BlogPostListItem {
  id: string;
  wp_id?: number | null;
  title: string;
  slug: string;
  url: string;
  excerpt: string;
  featured_image_url: string;
  featured_image_alt: string;
  published_at: string;
  reading_time: number;
  source: 'wordpress' | 'local';
  author: { name: string; slug: string; avatarUrl: string } | null;
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
}

export interface BlogPostDetail extends BlogPostListItem {
  content: string;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  og_image?: string;
  author: { name: string; slug: string; avatarUrl: string; bio?: string } | null;
}

export interface BlogCategory {
  id: string;
  wp_id?: number;
  parent_id?: string | null;
  name: string;
  slug: string;
  description: string;
  count: number;
  source: string;
}

export interface BlogTag {
  id: string;
  wp_id?: number;
  name: string;
  slug: string;
  source: string;
}

export async function fetchBlogPosts(params: {
  page?: number;
  perPage?: number;
  category?: string;
  tag?: string;
  author?: string;
  search?: string;
} = {}): Promise<{
  posts: BlogPostListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.category) query.set('category', params.category);
  if (params.tag) query.set('tag', params.tag);
  if (params.author) query.set('author', params.author);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`/api/blog/posts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
}

export async function fetchBlogPostBySlug(slug: string): Promise<{
  post: BlogPostDetail;
  prevPost: { title: string; slug: string; url: string; featured_image_url?: string } | null;
  nextPost: { title: string; slug: string; url: string; featured_image_url?: string } | null;
  relatedPosts: BlogPostListItem[];
}> {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  const res = await fetch(`/api/blog/posts/${clean}`);
  if (!res.ok) {
    if (res.status === 410) throw new Error('This post has been removed (410)');
    throw new Error('Post not found (404)');
  }
  return res.json();
}

export async function fetchBlogCategories(): Promise<BlogCategory[]> {
  const res = await fetch('/api/blog/categories');
  if (!res.ok) throw new Error('Failed to fetch blog categories');
  return res.json();
}

export async function fetchBlogTags(): Promise<BlogTag[]> {
  const res = await fetch('/api/blog/tags');
  if (!res.ok) throw new Error('Failed to fetch blog tags');
  return res.json();
}

export interface ResolvedSlugInfo {
  type: string;
  slug: string;
  statusCode: number;
  redirectUrl?: string;
  data?: any;
}

export async function resolveSlugApi(slug: string): Promise<ResolvedSlugInfo> {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  const res = await fetch(`/api/resolve-slug/${clean}`);
  return res.json();
}
