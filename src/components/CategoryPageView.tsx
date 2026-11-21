import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { WordPressCategory, Product } from '../types';
import {
  resolveCategoryFromPath,
  filterProductsByCategory,
  buildCategoryHierarchicalUrl,
  buildProductHierarchicalUrl,
  STORE_BASE_URL,
} from '../utils/categoryUtils';
import { ProductCard } from './ProductCard';
import {
  ShoppingBag,
  Star,
  Search,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  Home,
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  Sparkles,
  AlertCircle,
  Tag,
  FolderTree,
} from 'lucide-react';

interface CategoryPageViewProps {
  categoryPath: string;
}

export const CategoryPageView: React.FC<CategoryPageViewProps> = ({ categoryPath }) => {
  const {
    categories,
    products,
    addToCart,
    viewProductDetail,
    setCurrentPage,
  } = useApp();

  // Filters & Sorting state
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popular');

  // Resolve the category and hierarchy from current path
  const resolution = useMemo(() => {
    return resolveCategoryFromPath(categoryPath, categories);
  }, [categoryPath, categories]);

  const { category, breadcrumbs, isRedirect, canonicalUrl } = resolution;

  // Handle client-side canonical redirect if old flat URL or alias was loaded
  useEffect(() => {
    if (isRedirect && canonicalUrl && typeof window !== 'undefined') {
      if (window.location.pathname !== canonicalUrl) {
        window.history.replaceState({ page: 'product-category' }, '', canonicalUrl);
      }
    }
  }, [isRedirect, canonicalUrl]);

  // Update Document Title, Meta Description, Canonical tag and Schema.org
  useEffect(() => {
    if (!category) {
      document.title = 'Category Not Found | iRepair Mobiles UK';
      return;
    }

    const title = category.seo?.metaTitle || `${category.name} | iRepair Mobiles UK`;
    const desc =
      category.seo?.metaDescription ||
      category.description ||
      `Shop certified ${category.name} at iRepair Mobiles UK with 12-month warranty, express delivery, and 70-point diagnostics.`;
    const fullCanonical = `${STORE_BASE_URL}${canonicalUrl}`;

    document.title = title;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);

    // Update canonical link tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', fullCanonical);

    // Update og tags
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', fullCanonical);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', desc);

    // Insert BreadcrumbList Schema.org JSON-LD
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: STORE_BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shop',
          item: `${STORE_BASE_URL}/shop`,
        },
        ...breadcrumbs.map((crumb, idx) => ({
          '@type': 'ListItem',
          position: idx + 3,
          name: crumb.name,
          item: `${STORE_BASE_URL}${crumb.url}`,
        })),
      ],
    };

    let schemaScript = document.getElementById('category-breadcrumb-schema') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'category-breadcrumb-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(breadcrumbSchema);

    return () => {
      const el = document.getElementById('category-breadcrumb-schema');
      if (el) el.remove();
    };
  }, [category, canonicalUrl, breadcrumbs]);

  // Child categories of the current category for subcategory chips
  const childCategories = useMemo(() => {
    if (!category) return [];
    return categories
      .filter((c) => c.parent === category.id)
      .map((c) => ({
        ...c,
        hierarchicalUrl: buildCategoryHierarchicalUrl(c, categories),
      }));
  }, [category, categories]);

  // Category products matching current category and any descendants
  const categoryProducts = useMemo(() => {
    if (!category) return [];
    return filterProductsByCategory(products, category, categories);
  }, [category, products, categories]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    return categoryProducts
      .filter((product) => {
        // Condition filter
        if (selectedCondition !== 'all') {
          if (selectedCondition === 'refurbished' && !product.condition.includes('Refurbished')) return false;
          if (selectedCondition === 'new' && product.condition !== 'Brand New') return false;
        }

        // Brand filter
        if (selectedBrand !== 'all') {
          if (product.brand?.toLowerCase() !== selectedBrand.toLowerCase()) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = product.title.toLowerCase().includes(q);
          const matchesBrand = product.brand?.toLowerCase().includes(q);
          const matchesDesc = product.description?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesBrand && !matchesDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [categoryProducts, selectedCondition, selectedBrand, searchQuery, sortBy]);

  // Available brands in this category for filter pills
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    categoryProducts.forEach((p) => {
      if (p.brand) brandsSet.add(p.brand);
    });
    return Array.from(brandsSet).sort();
  }, [categoryProducts]);

  // 404 State when category does not exist
  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 text-[#DF0C88] flex items-center justify-center shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
            Category Not Found
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The category requested at <code className="bg-slate-100 text-pink-600 px-2 py-0.5 rounded font-mono text-xs">/product-category/{categoryPath}/</code> does not exist or may have been reorganized.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <a
            href="/shop"
            className="px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold transition-all shadow-md"
          >
            Browse All Products
          </a>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* 1. BREADCRUMBS WITH HIERARCHICAL LINKS */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 overflow-x-auto pb-1">
        <ol className="flex items-center gap-1.5 whitespace-nowrap">
          <li className="flex items-center gap-1">
            <a href="/" className="hover:text-[#DF0C88] flex items-center gap-1 text-slate-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </li>
          <li className="flex items-center gap-1">
            <a href="/shop" className="hover:text-[#DF0C88] text-slate-600 transition-colors">
              Shop
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </li>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <li key={crumb.id} className="flex items-center gap-1">
                {isLast ? (
                  <span className="font-bold text-slate-900" aria-current="page">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <a href={crumb.url} className="hover:text-[#DF0C88] text-slate-600 transition-colors">
                      {crumb.name}
                    </a>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* 2. CATEGORY HERO HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl">
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#DF0C88]" />
            <span>Certified 12-Month UK Warranty Included</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-white tracking-tight">
            {category.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {category.description ||
              `Explore genuine ${category.name} inspected with 70-point quality testing. Unlocked to all UK networks, pristine condition, and dispatched rapidly with tracking.`}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>{categoryProducts.length} Devices in this Category</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-[11px] text-pink-300">
              Canonical URL: {canonicalUrl}
            </span>
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gradient-to-tr from-[#DF0C88]/20 to-transparent rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3. SUBCATEGORY PILLS (IF CURRENT CATEGORY HAS CHILDREN) */}
      {childCategories.length > 0 && (
        <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <FolderTree className="w-4 h-4 text-[#DF0C88]" />
            <span>Subcategories in {category.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {childCategories.map((sub) => (
              <a
                key={sub.id}
                href={sub.hierarchicalUrl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:border-[#DF0C88] hover:text-[#DF0C88] hover:bg-pink-50/50 transition-all cursor-pointer"
              >
                <span>{sub.name}</span>
                {sub.count !== undefined && sub.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                    {sub.count}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN LAYOUT: FILTERS & PRODUCTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 self-start shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-heading">
              <SlidersHorizontal className="w-4 h-4 text-[#DF0C88]" />
              <span>Filters</span>
            </div>
            {(selectedCondition !== 'all' || selectedBrand !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCondition('all');
                  setSelectedBrand('all');
                  setSearchQuery('');
                }}
                className="text-[11px] text-[#DF0C88] font-semibold hover:underline cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Search within Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Search in {category.name}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Model, spec, color..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#DF0C88] focus:border-[#DF0C88] focus:outline-none"
              />
            </div>
          </div>

          {/* Condition Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Device Condition</label>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Conditions' },
                { id: 'refurbished', label: 'Certified Refurbished (Grade A)' },
                { id: 'new', label: 'Brand New Factory Sealed' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCondition(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    selectedCondition === c.id
                      ? 'bg-pink-50 text-[#DF0C88] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.label}</span>
                  {selectedCondition === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#DF0C88]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          {availableBrands.length > 1 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Brand</label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedBrand('all')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedBrand === 'all'
                      ? 'bg-pink-50 text-[#DF0C88] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Brands
                </button>
                {availableBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors capitalize cursor-pointer ${
                      selectedBrand.toLowerCase() === b.toLowerCase()
                        ? 'bg-pink-50 text-[#DF0C88] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Help box */}
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              iRepair Assurance
            </span>
            <p className="text-[11px] leading-relaxed">
              Every unit includes battery health ≥85%, genuine parts, and free next-day UK tracked delivery.
            </p>
          </div>
        </div>

        {/* Products Grid & Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Bar: Count & Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-700">
              Showing <span className="text-[#DF0C88] font-bold">{filteredProducts.length}</span> results in{' '}
              <span className="font-bold text-slate-900">{category.name}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500 whitespace-nowrap">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Customer Rated</option>
              </select>
            </div>
          </div>

          {/* Empty state if 0 filtered */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                No products found matching your filter criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try resetting your brand, condition or search query to browse all devices in {category.name}.
              </p>
              <button
                onClick={() => {
                  setSelectedCondition('all');
                  setSelectedBrand('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            /* Product Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categories={categories}
                  priority={idx < 6}
                  onSelectProduct={viewProductDetail}
                  onAddToCart={(p) => {
                    addToCart(p);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
