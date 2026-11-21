import React, { useState, useEffect, useMemo } from 'react';
import { WidgetRenderProps } from '../types';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../../components/ProductCard';
import { isPhoneProduct } from './TrendingProductsShowcaseWidget';

export const ProductCarouselWidget: React.FC<WidgetRenderProps> = ({ settings = {} }) => {
  const { products, categories, addToCart, viewProductDetail, setCurrentPage, showNotification } = useApp();

  const eyebrowText =
    settings.eyebrowText !== undefined
      ? settings.eyebrowText
      : settings.eyebrow || 'Certified Refurbished & Tested';
  const title = settings.title || 'Featured Refurbished Tech';
  const subtitle = settings.subtitle || '100% Quality Checked with 12-Month Hardware Guarantee';
  const limit = Number(settings.limit) || 12;
  const pickerMode = settings.pickerMode || 'category';
  const categorySlugs = Array.isArray(settings.categorySlugs) ? settings.categorySlugs : [];
  const brands = Array.isArray(settings.brands) ? settings.brands.map((b: string) => b.toLowerCase()) : [];
  const condition = settings.condition || '';
  const manualProductIds = Array.isArray(settings.manualProductIds) ? settings.manualProductIds : [];
  const inStockOnly = Boolean(settings.inStockOnly);
  const onSaleOnly = Boolean(settings.onSaleOnly);
  const sortBy = settings.sortBy || 'popularity';
  const phonesOnly = Boolean(settings.phonesOnly) ||
    title.toLowerCase().includes('phone') ||
    title.toLowerCase().includes('iphone');

  const [carouselIndex, setCarouselIndex] = useState(0);

  // Responsive visible products count (2 on mobile, 4 on tablet, 5 on desktop)
  const visibleDesktop = Number(settings.visibleDesktop) && Number(settings.visibleDesktop) !== 4 ? Number(settings.visibleDesktop) : 5;
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveVisible = useMemo(() => {
    if (windowWidth < 640) return 2;
    if (windowWidth < 1024) return 4;
    return visibleDesktop;
  }, [windowWidth, visibleDesktop]);

  // Filter matched products based on settings
  let matched = products.filter((p: Product) => {
    if (phonesOnly && !isPhoneProduct(p)) return false;
    if (inStockOnly && !p.inStock) return false;
    if (onSaleOnly && (!p.regularPrice || p.price >= p.regularPrice)) return false;

    if (pickerMode === 'manual') {
      if (manualProductIds.length === 0) return true;
      return manualProductIds.includes(p.id) || (p.wpId && manualProductIds.includes(String(p.wpId)));
    }

    if (pickerMode === 'brand') {
      if (brands.length === 0) return true;
      const pBrand = (p.brand || '').toLowerCase().trim();
      return brands.some((b: string) => pBrand.includes(b) || b.includes(pBrand) || p.title.toLowerCase().includes(b));
    }

    if (pickerMode === 'category') {
      if (categorySlugs.length === 0) return true;
      const pCat = (p.category || '').toLowerCase().trim();
      return categorySlugs.some((c: string) => pCat.includes(c) || c.includes(pCat));
    }

    if (pickerMode === 'condition') {
      if (!condition) return true;
      return (p.condition || '').toLowerCase().includes(condition.toLowerCase());
    }

    if (pickerMode === 'filter') {
      let pass = true;
      if (brands.length > 0) {
        const pBrand = (p.brand || '').toLowerCase().trim();
        pass = pass && brands.some((b: string) => pBrand.includes(b) || b.includes(pBrand) || p.title.toLowerCase().includes(b));
      }
      if (categorySlugs.length > 0) {
        const pCat = (p.category || '').toLowerCase().trim();
        pass = pass && categorySlugs.some((c: string) => pCat.includes(c) || c.includes(pCat));
      }
      if (condition) {
        pass = pass && (p.condition || '').toLowerCase().includes(condition.toLowerCase());
      }
      return pass;
    }

    return true;
  });

  matched = [...matched].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'newest') return (b.wpId || 0) - (a.wpId || 0);
    return (b.reviewsCount || 0) - (a.reviewsCount || 0);
  });

  const displayList = matched.slice(0, limit);
  const maxIdx = Math.max(0, displayList.length - effectiveVisible);

  const handleAddToBasket = (product: Product) => {
    addToCart(product, 1);
    showNotification(`Added ${product.title} to basket!`, 'success');
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-[10px] sm:px-6 lg:px-8">
        {/* Editorial Header Row matching CategoryEditorialRailWidget & CommonRepairsWidget */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="min-w-0">
            {eyebrowText && (
              <p className="text-xs font-bold tracking-wider uppercase text-[#E6007E] mb-1.5">
                {eyebrowText}
              </p>
            )}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B0D12] tracking-tight font-heading leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage('shop')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#E6007E] hover:text-[#C50875] mr-1 group cursor-pointer transition-colors"
            >
              <span>View All Store Deals</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>

            {displayList.length > effectiveVisible && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
                  disabled={carouselIndex === 0}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                  aria-label="Previous"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.min(maxIdx, prev + 1))}
                  disabled={carouselIndex >= maxIdx}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#E6007E] hover:text-[#E6007E] disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6007E]"
                  aria-label="Next"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {displayList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-medium text-slate-500">No products currently match these filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden py-2 -my-2 -mx-[5px] sm:-mx-2">
            <div
              className="flex items-stretch transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${carouselIndex * (100 / effectiveVisible)}%)`,
              }}
            >
              {displayList.map((product, idx) => (
                <div
                  key={product.id}
                  className="shrink-0 px-[5px] sm:px-2 flex flex-col"
                  style={{
                    width: `calc(100% / ${effectiveVisible})`,
                    maxWidth: `${100 / effectiveVisible}%`,
                  }}
                >
                  <ProductCard
                    product={product}
                    categories={categories}
                    priority={idx < effectiveVisible}
                    onSelectProduct={viewProductDetail}
                    onAddToCart={handleAddToBasket}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
