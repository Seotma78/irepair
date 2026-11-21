import React from 'react';
import { Star, ShoppingBag, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { Product, WordPressCategory } from '../types';
import { buildProductHierarchicalUrl } from '../utils/categoryUtils';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { getPlainTextSnippet } from '../utils/productDescriptionSanitizer';

interface ProductCardProps {
  product: Product;
  categories: WordPressCategory[];
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  priority?: boolean;
  showSnippet?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categories,
  onSelectProduct,
  onAddToCart,
  priority = false,
  showSnippet = false,
}) => {
  const isVariable = product.type === 'variable' || (product.variations && product.variations.length > 0);
  const effectiveMin = product.minPrice ?? (product.variations && product.variations.length > 0 ? Math.min(...product.variations.map(v => v.price).filter(p => p > 0)) : undefined);
  const effectiveMax = product.maxPrice ?? (product.variations && product.variations.length > 0 ? Math.max(...product.variations.map(v => v.price).filter(p => p > 0)) : undefined);
  
  const displayPriceRange = (() => {
    if (isVariable) {
      if (effectiveMin !== undefined && effectiveMax !== undefined && effectiveMin !== effectiveMax && effectiveMin > 0) {
        return `£${effectiveMin.toFixed(2)} – £${effectiveMax.toFixed(2)}`;
      }
      if (effectiveMin !== undefined && effectiveMin > 0) {
        return `From £${effectiveMin.toFixed(2)}`;
      }
      if (product.price > 0) {
        return `From £${product.price.toFixed(2)}`;
      }
    }
    const p = (product.price && product.price > 0) ? product.price : (effectiveMin || 0);
    return `£${p.toFixed(2)}`;
  })();

  const productUrl = buildProductHierarchicalUrl(product, categories);
  const title = decodeHtmlEntities(product.title);
  const brand = decodeHtmlEntities(product.brand || 'iRepair');
  const condition = decodeHtmlEntities(product.condition || 'Grade A - Pristine');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full group">
      <a
        href={productUrl}
        onClick={(e) => {
          e.preventDefault();
          onSelectProduct(product);
        }}
        className="block cursor-pointer flex-1 flex flex-col"
        title={title}
      >
        {/* Square Image Container: Pure White (#FFFFFF) background to blend seamlessly with white-background photos */}
        <div className="relative aspect-square w-full bg-white flex items-center justify-center overflow-hidden p-3 select-none">
          <img
            src={product.image}
            alt={title}
            width={600}
            height={600}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
          />

          {/* Condition Badge */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs ${
                condition.toLowerCase().includes('new')
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-900/90 text-white backdrop-blur-xs'
              }`}
            >
              {condition}
            </span>
          </div>

          {/* Top Right: Multiple Options or Save Badge */}
          <div className="absolute top-3 right-3 pointer-events-none">
            {isVariable ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/90 text-white shadow-2xs backdrop-blur-xs">
                Options
              </span>
            ) : product.regularPrice && product.regularPrice > product.price ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DF0C88] text-white shadow-2xs">
                Save £{(product.regularPrice - product.price).toFixed(0)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Card Body: Pure White (#FFFFFF) text area */}
        <div className="p-4 pt-1 flex-1 flex flex-col justify-between space-y-2 bg-white">
          <div className="space-y-1">
            {/* Brand & Warranty Tag */}
            <div className="flex items-center justify-between gap-1.5 text-[11px]">
              <span className="font-bold text-[#DF0C88] uppercase tracking-wider truncate">
                {brand}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                12M Warranty
              </span>
            </div>

            {/* Title clamped to 2 lines with min-height to maintain equal card row heights */}
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-[#DF0C88] transition-colors">
              {title}
            </h3>

            {/* Optional 2-line plain text snippet */}
            {showSnippet && (product.shortDescription || product.description) && (
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {getPlainTextSnippet(product.shortDescription || product.description, 110)}
              </p>
            )}

            {/* Reviews / Rating */}
            <div className="flex items-center gap-1 text-xs text-amber-500 pt-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-800">{(product.rating || 5.0).toFixed(1)}</span>
              <span className="text-slate-400 text-[11px]">({product.reviewsCount || 12})</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="pt-2 flex items-baseline gap-2 flex-wrap">
            {isVariable ? (
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
                {displayPriceRange}
              </span>
            ) : (
              <>
                <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                  £{product.price.toFixed(2)}
                </span>
                {product.regularPrice && product.regularPrice > product.price && (
                  <span className="text-xs text-slate-400 line-through tabular-nums">
                    £{product.regularPrice.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </a>

      {/* Button Row */}
      <div className="p-4 pt-0 bg-white">
        {isVariable ? (
          <button
            type="button"
            onClick={() => onSelectProduct(product)}
            className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Select Options</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAddToCart && onAddToCart(product)}
            className="w-full bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Basket</span>
          </button>
        )}
      </div>
    </div>
  );
};
