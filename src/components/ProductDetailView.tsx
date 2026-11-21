import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Star, 
  Check, 
  Wrench, 
  Plus, 
  Minus, 
  ExternalLink, 
  Lock, 
  Battery, 
  Smartphone, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Shield,
  HelpCircle,
  Award,
  Clock,
  ThumbsUp,
  ZoomIn,
  X
} from 'lucide-react';
import { Product, ProductVariation, WooCommerceAttribute, TrustBadgesSettings } from '../types';
import { fetchProductVariations } from '../services/wordpressApi';
import { 
  getCategoryBreadcrumbs, 
  buildCategoryHierarchicalUrl, 
  getProductCategoryBreadcrumbs, 
  buildProductHierarchicalUrl,
  getProductCategoryPath,
  STORE_BASE_URL
} from '../utils/categoryUtils';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { 
  sanitizeProductShortDescriptionHtml, 
  isEmptyHtml, 
  getPlainTextSnippet 
} from '../utils/productDescriptionSanitizer';
import { StripeExpressCheckout } from './express-checkout/StripeExpressCheckout';

type TabType = 'technical' | 'about' | 'reviews' | 'shipment' | 'warranty' | 'additional';

export const COLOR_HEX_MAP: Record<string, { bg: string; border?: string; isLight?: boolean }> = {
  black: { bg: '#171717' },
  'space gray': { bg: '#4a4d52' },
  'space grey': { bg: '#4a4d52' },
  'space black': { bg: '#202022' },
  midnight: { bg: '#191f28' },
  white: { bg: '#f8fafc', border: '#cbd5e1', isLight: true },
  silver: { bg: '#e2e8f0', border: '#cbd5e1', isLight: true },
  starlight: { bg: '#f5f3ee', border: '#d6d3d1', isLight: true },
  gold: { bg: '#fcd34d' },
  'rose gold': { bg: '#e8a598' },
  yellow: { bg: '#facc15' },
  coral: { bg: '#f87171' },
  red: { bg: '#dc2626' },
  '(product)red': { bg: '#dc2626' },
  'product red': { bg: '#dc2626' },
  blue: { bg: '#2563eb' },
  'pacific blue': { bg: '#2c5282' },
  'sierra blue': { bg: '#93c5fd' },
  'sky blue': { bg: '#38bdf8' },
  'deep blue': { bg: '#1e3a8a' },
  green: { bg: '#16a34a' },
  'midnight green': { bg: '#273c33' },
  'alpine green': { bg: '#3e5641' },
  purple: { bg: '#9333ea' },
  'deep purple': { bg: '#581c87' },
  pink: { bg: '#f472b6' },
  'natural titanium': { bg: '#9ca3af' },
  'blue titanium': { bg: '#334155' },
  'white titanium': { bg: '#f1f5f9', border: '#cbd5e1', isLight: true },
  'black titanium': { bg: '#27272a' },
  'desert titanium': { bg: '#d4af87' },
  graphite: { bg: '#374151' },
  titanium: { bg: '#9ca3af' },
  bronze: { bg: '#92400e' },
  orange: { bg: '#ea580c' },
};

export function getColorStyle(colorName: string): { bg: string; border?: string; isLight?: boolean } {
  const norm = colorName.toLowerCase().trim();
  if (COLOR_HEX_MAP[norm]) return COLOR_HEX_MAP[norm];
  for (const [key, val] of Object.entries(COLOR_HEX_MAP)) {
    if (norm === key || norm.includes(key)) return val;
  }
  return { bg: '#DF0C88' };
}

export function normalizeAttrKey(name: string): string {
  let s = (name || '').toLowerCase().trim();
  s = s.replace(/^attribute_/, '').replace(/^pa_/, '');
  if (s === 'colour') s = 'color';
  return s;
}

export function normalizeOptionStr(val: string): string {
  return (val || '').toLowerCase().trim().replace(/[-_\s]+/g, '');
}

export function checkVariationAttrMatch(variationVal: string | undefined, selectedVal: string): boolean {
  if (!variationVal || variationVal === 'any' || variationVal === '') return true;
  return normalizeOptionStr(variationVal) === normalizeOptionStr(selectedVal);
}

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProduct, 
    setCurrentPage, 
    addToCart, 
    startRepairBooking, 
    wpConfig, 
    showNotification,
    products,
    viewProductDetail,
    categories,
    navigateToCategory,
  } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('technical');
  const [trustSettings, setTrustSettings] = useState<TrustBadgesSettings>({
    enabled: true,
    items: {
      delivery: { id: 'delivery', label: 'Delivery', icon: 'truck', fallbackText: 'Free Next-Day Tracked Delivery', enabled: true },
      warranty: { id: 'warranty', label: 'Warranty', icon: 'shield', fallbackText: '12 Months Hardware Guarantee', enabled: true },
      returns: { id: 'returns', label: 'Returns', icon: 'rotate-ccw', fallbackText: '14-Day Money Back Guarantee', enabled: true },
    },
  });
  const sliderRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  // Load trust badges settings from API
  useEffect(() => {
    fetch('/api/catalogue/trust-badges/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setTrustSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Live product + variations list (always refreshed from /api/catalogue/products/:slug)
  const [liveProduct, setLiveProduct] = useState<Product | null>(selectedProduct);
  const [variations, setVariations] = useState<ProductVariation[]>(() => {
    return selectedProduct?.variations || [];
  });
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);

  const activeProduct = liveProduct || selectedProduct;

  // Reset & sync product + variations whenever selectedProduct changes
  useEffect(() => {
    if (!selectedProduct) {
      setLiveProduct(null);
      setVariations([]);
      return;
    }

    let cancelled = false;
    setLiveProduct(selectedProduct);
    setVariations(selectedProduct.variations || []);
    setActiveImageIndex(0);
    setQuantity(1);

    // Reset selected attributes to URL query params only so previous product's selections never leak
    const initialFromUrl: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.forEach((val, key) => {
        if (key.startsWith('attribute_') || key.startsWith('attribute_pa_')) {
          const normKey = normalizeAttrKey(key);
          if (normKey && val) {
            initialFromUrl[normKey] = val;
          }
        }
      });
    }
    setSelectedAttributes(initialFromUrl);

    setIsLoadingVariations(true);
    fetch(`/api/catalogue/products/${encodeURIComponent(selectedProduct.slug || selectedProduct.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.product) {
          setLiveProduct(data.product);
          if (Array.isArray(data.product.variations) && data.product.variations.length > 0) {
            setVariations(data.product.variations);
          } else if (data.product.type === 'variable' && (data.product.wpId || selectedProduct.wpId)) {
            const wpId = data.product.wpId || selectedProduct.wpId;
            fetchProductVariations(wpId, wpConfig).then((vars) => {
              if (!cancelled && vars && vars.length > 0) setVariations(vars);
            });
          } else {
            setVariations([]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingVariations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id, wpConfig]);

  // Update Document Title, Meta Description, Canonical tag, OpenGraph, and Schema.org BreadcrumbList for Product
  useEffect(() => {
    if (!selectedProduct) return;

    const catPath = getProductCategoryPath(selectedProduct, categories);
    const hierarchicalUrl = buildProductHierarchicalUrl(selectedProduct, categories);
    const fullCanonical = `${STORE_BASE_URL}${hierarchicalUrl}`;
    const seoTitle = selectedProduct.yoastSeo?.title || `${selectedProduct.title} | iRepair Mobiles UK`;
    const rawSeoDesc = selectedProduct.yoastSeo?.description || selectedProduct.shortDescription || selectedProduct.description;
    const seoDesc = rawSeoDesc 
      ? getPlainTextSnippet(rawSeoDesc, 160) 
      : `Buy certified ${selectedProduct.title} online at iRepair Mobiles UK with 12-month warranty, express shipping, and 70-point diagnostics.`;

    document.title = seoTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seoDesc);

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
    ogTitle.setAttribute('content', seoTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', seoDesc);

    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', selectedProduct.image);

    // Inject BreadcrumbList and Product JSON-LD schema
    const crumbs = getProductCategoryBreadcrumbs(selectedProduct, categories);
    const breadcrumbListSchema = {
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
        ...crumbs.map((c, idx) => ({
          '@type': 'ListItem',
          position: idx + 3,
          name: c.name,
          item: `${STORE_BASE_URL}${c.url}`,
        })),
        {
          '@type': 'ListItem',
          position: crumbs.length + 3,
          name: selectedProduct.title,
          item: fullCanonical,
        },
      ],
    };

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: selectedProduct.title,
      image: selectedProduct.image,
      description: seoDesc,
      sku: selectedProduct.specifications?.['SKU'] || selectedProduct.slug,
      brand: {
        '@type': 'Brand',
        name: selectedProduct.brand || 'iRepair Mobiles',
      },
      offers: {
        '@type': 'Offer',
        url: fullCanonical,
        priceCurrency: 'GBP',
        price: selectedProduct.price,
        itemCondition: selectedProduct.condition?.includes('New') ? 'https://schema.org/NewCondition' : 'https://schema.org/RefurbishedCondition',
        availability: selectedProduct.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'iRepair Mobiles UK',
        },
      },
      category: crumbs.map(c => c.name).join(' > '),
    };

    let scriptTag = document.querySelector('script[data-seo="product-jsonld"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      scriptTag.setAttribute('data-seo', 'product-jsonld');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify([breadcrumbListSchema, productSchema]);
  }, [selectedProduct, categories]);

  // Extract selectable WooCommerce variation attributes
  const productAttributes = useMemo<WooCommerceAttribute[]>(() => {
    if (!activeProduct) return [];
    const productHasVariations = activeProduct.type === 'variable' || variations.length > 0;

    // Simple products with no variations do not have selectable variation options
    if (!productHasVariations) {
      return [];
    }

    if (activeProduct.attributes && activeProduct.attributes.length > 0) {
      const withOptions = activeProduct.attributes.filter(a => a.options && a.options.length > 0);
      const variationAttrs = withOptions.filter(a => a.variation !== false);
      if (variationAttrs.length > 0) return variationAttrs;
      if (variations.length === 0) return [];
    }

    // Extract dynamically from variations (normalizing keys like pa_color / colour -> color)
    if (variations.length > 0) {
      const attrMap: Record<string, { label: string; options: Set<string> }> = {};
      variations.forEach(v => {
        Object.entries(v.attributes).forEach(([k, val]) => {
          if (!val || val.toLowerCase() === 'any') return;
          const normKey = normalizeAttrKey(k);
          if (!normKey) return;
          if (!attrMap[normKey]) {
            const cleanLabel = normKey === 'color' ? 'Colour' : normKey.charAt(0).toUpperCase() + normKey.slice(1);
            attrMap[normKey] = { label: cleanLabel, options: new Set() };
          }
          attrMap[normKey].options.add(val);
        });
      });
      return Object.entries(attrMap).map(([slug, entry]) => ({
        name: entry.label,
        slug,
        variation: true,
        visible: true,
        options: Array.from(entry.options),
      }));
    }

    // Fallback to legacy variants:
    const legacyAttrs: WooCommerceAttribute[] = [];
    if (activeProduct.variants?.storage && activeProduct.variants.storage.length > 0) {
      legacyAttrs.push({
        name: 'Storage',
        slug: 'storage',
        variation: true,
        visible: true,
        options: activeProduct.variants.storage
      });
    }
    if (activeProduct.variants?.colors && activeProduct.variants.colors.length > 0) {
      legacyAttrs.push({
        name: 'Color',
        slug: 'color',
        variation: true,
        visible: true,
        options: activeProduct.variants.colors.map(c => c.name)
      });
    }
    return legacyAttrs;
  }, [activeProduct, variations]);

  // Current selections map: e.g. { storage: "128GB", condition: "A Grade", color: "Phantom Black" }
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.forEach((val, key) => {
        const normKey = normalizeAttrKey(key);
        if (normKey && val) {
          initial[normKey] = val;
        }
      });
    }
    return initial;
  });

  // Deep linking from URL, WooCommerce default_attributes, & single-option auto-selection
  useEffect(() => {
    if (!activeProduct || productAttributes.length === 0) return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

    setSelectedAttributes(prev => {
      const next = { ...prev };
      let updated = false;

      productAttributes.forEach(attr => {
        const normKey = normalizeAttrKey(attr.slug || attr.name);
        const rawKey = attr.slug || attr.name;

        // 1. Check URL parameters
        const paramVal = urlParams.get(`attribute_${normKey}`) ||
                         urlParams.get(`attribute_pa_${normKey}`) ||
                         urlParams.get(normKey) ||
                         urlParams.get(attr.slug?.toLowerCase() || '') ||
                         urlParams.get(attr.name.toLowerCase());

        if (paramVal) {
          const matchOpt = attr.options.find(opt => normalizeOptionStr(opt) === normalizeOptionStr(paramVal));
          if (matchOpt && next[normKey] !== matchOpt) {
            next[normKey] = matchOpt;
            updated = true;
          }
        } else if (!next[normKey] && activeProduct.defaultAttributes) {
          // 2. Fall back to WooCommerce defaultAttributes if not in URL
          const defVal = activeProduct.defaultAttributes[normKey] ||
                         activeProduct.defaultAttributes[rawKey.toLowerCase()] ||
                         activeProduct.defaultAttributes[attr.name.toLowerCase()];
          if (defVal) {
            const matchOpt = attr.options.find(opt => normalizeOptionStr(opt) === normalizeOptionStr(defVal));
            if (matchOpt) {
              next[normKey] = matchOpt;
              updated = true;
            }
          }
        }

        // 3. Auto-select when an attribute only has a single available option
        if (!next[normKey] && attr.options.length === 1) {
          next[normKey] = attr.options[0];
          updated = true;
        }
      });

      return updated ? next : prev;
    });
  }, [activeProduct, productAttributes]);

  // Sync selections to URL query parameters via history.replaceState
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedProduct) return;
    const url = new URL(window.location.href);
    let changed = false;

    // Remove existing attribute_* params
    Array.from(url.searchParams.keys()).forEach(k => {
      if (k.startsWith('attribute_') || k.startsWith('attribute_pa_')) {
        url.searchParams.delete(k);
        changed = true;
      }
    });

    // Set active attribute params
    Object.entries(selectedAttributes).forEach(([k, v]) => {
      if (v) {
        url.searchParams.set(`attribute_${k}`, v);
        changed = true;
      }
    });

    if (changed) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [selectedAttributes, selectedProduct]);

  // Validation: are all required attributes selected?
  const requiredAttrKeys = useMemo(() => {
    return productAttributes.map(a => normalizeAttrKey(a.slug || a.name));
  }, [productAttributes]);

  const isCompleteSelection = useMemo(() => {
    if (requiredAttrKeys.length === 0) return true;
    return requiredAttrKeys.every(k => Boolean(selectedAttributes[k]));
  }, [requiredAttrKeys, selectedAttributes]);

  const missingAttributes = useMemo(() => {
    return productAttributes.filter(a => !selectedAttributes[normalizeAttrKey(a.slug || a.name)]);
  }, [productAttributes, selectedAttributes]);

  // Dynamic combination availability check
  const isOptionPossible = (attrKey: string, optionValue: string): boolean => {
    if (variations.length === 0) return true;
    const targetNormKey = normalizeAttrKey(attrKey);

    return variations.some(v => {
      // Must match optionValue for targetNormKey
      const vValForTarget = v.attributes[targetNormKey] || v.attributes[attrKey.toLowerCase()] || v.attributes[attrKey];
      if (!checkVariationAttrMatch(vValForTarget, optionValue)) {
        return false;
      }

      // Must match already-chosen selections for OTHER attributes
      for (const [otherKey, otherVal] of Object.entries(selectedAttributes)) {
        if (!otherVal || otherKey === targetNormKey) continue;
        const vOtherVal = v.attributes[otherKey] || v.attributes[otherKey.toLowerCase()];
        if (!checkVariationAttrMatch(vOtherVal, otherVal)) {
          return false;
        }
      }

      // Variation must be published
      if (v.status && v.status !== 'publish') {
        return false;
      }

      return true;
    });
  };

  const isOptionInStock = (attrKey: string, optionValue: string): boolean => {
    if (variations.length === 0) return true;
    const targetNormKey = normalizeAttrKey(attrKey);

    const matchingVars = variations.filter(v => {
      const vValForTarget = v.attributes[targetNormKey] || v.attributes[attrKey.toLowerCase()] || v.attributes[attrKey];
      if (!checkVariationAttrMatch(vValForTarget, optionValue)) return false;

      for (const [otherKey, otherVal] of Object.entries(selectedAttributes)) {
        if (!otherVal || otherKey === targetNormKey) continue;
        const vOtherVal = v.attributes[otherKey] || v.attributes[otherKey.toLowerCase()];
        if (!checkVariationAttrMatch(vOtherVal, otherVal)) return false;
      }
      return v.status === 'publish' || !v.status;
    });

    if (matchingVars.length === 0) return false;
    return matchingVars.some(v => v.inStock || v.stockStatus === 'instock' || v.backorders === 'yes' || v.backorders === 'notify');
  };

  // Match the user's active attribute choices with a specific WooCommerce variation
  const matchedVariation = useMemo(() => {
    if (variations.length === 0 || !isCompleteSelection) return null;
    const match = variations.find(v => {
      if (v.status && v.status !== 'publish') return false;
      return Object.entries(selectedAttributes).every(([attrKey, attrVal]) => {
        if (!attrVal) return true;
        const normK = normalizeAttrKey(attrKey);
        const vVal = v.attributes[normK] || v.attributes[attrKey.toLowerCase()] || v.attributes[attrKey];
        return checkVariationAttrMatch(vVal, attrVal);
      });
    });
    return match || null;
  }, [variations, selectedAttributes, isCompleteSelection]);

  if (!selectedProduct || !activeProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-600 mb-4">No product selected.</p>
        <button 
          onClick={() => setCurrentPage('shop')}
          className="px-4 py-2 bg-[#DF0C88] text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Return to Shop Catalog
        </button>
      </div>
    );
  }

  const hasSelectableVariations = variations.length > 0 || productAttributes.length > 0;
  const isVariable = (activeProduct.type === 'variable' && hasSelectableVariations) || variations.length > 0;
  const activePrice = matchedVariation ? matchedVariation.price : (isVariable ? (activeProduct.minPrice || activeProduct.price) : activeProduct.price);
  const activeRegularPrice = matchedVariation?.regularPrice || activeProduct.regularPrice;
  const isVariationOnSale = matchedVariation ? Boolean(matchedVariation.onSale || (matchedVariation.regularPrice && matchedVariation.regularPrice > matchedVariation.price)) : Boolean((activeProduct as any).onSale || (activeProduct.regularPrice && activeProduct.regularPrice > activeProduct.price));
  const inStock = matchedVariation ? Boolean(matchedVariation.inStock || matchedVariation.stockStatus === 'instock' || matchedVariation.backorders === 'yes') : (isVariable ? true : activeProduct.inStock);
  const currentSku = matchedVariation?.sku || activeProduct.sku || activeProduct.specifications?.['SKU'] || `IR-${activeProduct.id}`;

  // Build full list of gallery images (including variation images)
  const allImages = useMemo(() => {
    const list: string[] = [activeProduct.image];
    if (activeProduct.gallery && activeProduct.gallery.length > 0) {
      activeProduct.gallery.forEach(img => {
        if (!list.includes(img)) list.push(img);
      });
    }
    variations.forEach(v => {
      if (v.image && !list.includes(v.image)) {
        list.push(v.image);
      }
    });
    return list;
  }, [activeProduct, variations]);

  // Main display image: priority given to matched variation image
  const currentMainImage = (matchedVariation?.image && matchedVariation.image.trim()) || allImages[activeImageIndex] || activeProduct.image;

  // Formatted price range
  const displayPriceRange = activeProduct.priceRange || (
    activeProduct.minPrice && activeProduct.maxPrice && activeProduct.minPrice !== activeProduct.maxPrice
      ? `£${activeProduct.minPrice.toFixed(2)} – £${activeProduct.maxPrice.toFixed(2)}`
      : `£${activeProduct.price.toFixed(2)}`
  );

  // Selected options summary text
  const selectedOptionsList = Object.entries(selectedAttributes)
    .map(([_, v]) => v)
    .filter(Boolean);
  const hasAnyAttributeSelected = selectedOptionsList.length > 0;
  const selectedOptionsSummary = selectedOptionsList.length > 0
    ? selectedOptionsList.join(' · ')
    : (activeProduct.condition || 'Standard Configuration');

  const handleSelectAttributeOption = (attrKey: string, optionValue: string) => {
    setSelectedAttributes(prev => {
      const next = { ...prev };
      const norm = normalizeAttrKey(attrKey);
      if (!optionValue) {
        delete next[norm];
      } else {
        next[norm] = optionValue;
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedAttributes({});
  };

  const handleAddToCart = () => {
    if (isVariable && (!isCompleteSelection || (variations.length > 0 && !matchedVariation))) {
      showNotification('Please select your preferred options before adding to cart', 'error');
      return;
    }
    if (!inStock) {
      showNotification('This item is currently out of stock', 'error');
      return;
    }
    addToCart(
      activeProduct,
      quantity,
      selectedAttributes['color'] || selectedAttributes['colour'] || undefined,
      selectedAttributes['storage'] || selectedAttributes['capacity'] || undefined,
      matchedVariation?.id,
      hasAnyAttributeSelected ? selectedAttributes : undefined,
      activePrice,
      matchedVariation?.sku,
      matchedVariation?.image
    );
  };

  // Related products query (same category or brand, excluding current product)
  const relatedProducts = useMemo(() => {
    const directMatches = products.filter(p => 
      p.id !== selectedProduct.id && 
      (p.category?.toLowerCase() === selectedProduct.category?.toLowerCase() || 
       p.brand?.toLowerCase() === selectedProduct.brand?.toLowerCase())
    );
    if (directMatches.length >= 8) {
      return directMatches.slice(0, 12);
    }
    const fillers = products.filter(p => p.id !== selectedProduct.id && !directMatches.some(m => m.id === p.id));
    return [...directMatches, ...fillers].slice(0, 12);
  }, [products, selectedProduct]);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // HTML Sanitizer that cleans scripts/styles/handlers while keeping tables, lists, images, and video embeds
  const sanitizeProductHtml = (rawHtml?: string): string => {
    if (!rawHtml) return '';
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"')
      .replace(/<iframe\b([^<]*)(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, (match) => {
        if (/src=["'](https?:)?\/\/(www\.)?(youtube\.com\/embed\/|player\.vimeo\.com\/video\/|youtu\.be\/)[^"']*["']/i.test(match)) {
          return `<div class="responsive-video-wrapper aspect-video w-full rounded-2xl overflow-hidden my-4 shadow-sm border border-slate-200">${match}</div>`;
        }
        return '';
      })
      .replace(/<table\b([^>]*)>/gi, '<div class="overflow-x-auto my-4 w-full border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse text-xs sm:text-sm text-slate-700 divide-y divide-slate-200" $1>')
      .replace(/<\/table>/gi, '</table></div>')
      .trim();
  };

  // Full sanitized description for the "About Product" / "Description" tab (distinct from short description)
  const fullDescriptionHtml = useMemo(() => {
    if (!selectedProduct) return '';
    const longDesc = (selectedProduct.longDescription || '').trim();
    const regDesc = (selectedProduct.description || '').trim();
    const shortDesc = (selectedProduct.shortDescription || '').trim();

    const normalizeText = (s: string) => 
      s.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

    const cleanShort = normalizeText(shortDesc);
    const cleanLong = normalizeText(longDesc);
    const cleanReg = normalizeText(regDesc);

    // Priority 1: longDescription if populated and text does not duplicate short description
    if (longDesc && cleanLong && cleanLong !== cleanShort) {
      return sanitizeProductHtml(longDesc);
    }
    // Priority 2: full description field if populated and text does not duplicate short description
    if (regDesc && cleanReg && cleanReg !== cleanShort) {
      return sanitizeProductHtml(regDesc);
    }
    return '';
  }, [selectedProduct]);

  const hasFullDescription = useMemo(() => {
    if (!fullDescriptionHtml) return false;
    const textOnly = fullDescriptionHtml.replace(/<[^>]+>/g, '').trim();
    return textOnly.length > 0;
  }, [fullDescriptionHtml]);

  // Dynamic Technical Specifications from WooCommerce attributes & physical properties
  const technicalData = useMemo(() => {
    if (!selectedProduct) return { html: null, rows: [] };

    // 1. Configurable custom field / meta key HTML takes highest priority if filled
    const techHtml = selectedProduct.customFields?.technical_details || selectedProduct.technicalDetailsHtml;
    if (techHtml && techHtml.trim()) {
      return {
        html: sanitizeProductHtml(techHtml),
        rows: [] as { label: string; value: string; isSelectedVariation?: boolean }[],
      };
    }

    // 2. Build clean 2-column label | value rows from real synced attributes & physical properties
    const rows: { label: string; value: string; isSelectedVariation?: boolean }[] = [];

    // Core identification & Physical specs
    const activeSku = matchedVariation?.sku || selectedProduct.sku || selectedProduct.specifications?.['SKU'];
    if (activeSku) {
      rows.push({ label: 'SKU', value: activeSku });
    }

    if (selectedProduct.brand) {
      rows.push({ label: 'Brand', value: decodeHtmlEntities(selectedProduct.brand) });
    }

    const activeCondition = selectedAttributes['condition'] || selectedProduct.condition;
    if (activeCondition) {
      rows.push({ label: 'Condition', value: decodeHtmlEntities(activeCondition) });
    }

    // Visible WooCommerce Attributes (Storage, Colour, RAM, Network, Screen Size, etc.)
    if (selectedProduct.attributes && Array.isArray(selectedProduct.attributes)) {
      selectedProduct.attributes.forEach((attr) => {
        if (attr.visible === false) return;
        const attrName = decodeHtmlEntities(attr.name || '').trim();
        if (!attrName) return;

        const lowerName = attrName.toLowerCase();
        if (lowerName === 'brand' || lowerName === 'condition') return;

        const key = (attr.slug || attr.name).toLowerCase();
        const selectedVal = selectedAttributes[key] || 
          (matchedVariation?.attributes && (matchedVariation.attributes[key] || matchedVariation.attributes[attr.name]));

        if (selectedVal && attr.variation) {
          rows.push({
            label: attrName,
            value: decodeHtmlEntities(selectedVal),
            isSelectedVariation: true,
          });
        } else if (attr.options && attr.options.length > 0) {
          const optStr = attr.options.map((o) => decodeHtmlEntities(o)).join(', ');
          rows.push({ label: attrName, value: optStr });
        }
      });
    }

    // Physical Weight (with units)
    const activeWeight = (matchedVariation as any)?.weight || selectedProduct.weight;
    if (activeWeight) {
      const weightStr = typeof activeWeight === 'number' || !isNaN(Number(activeWeight)) ? `${activeWeight} kg` : String(activeWeight);
      rows.push({ label: 'Weight', value: weightStr });
    }

    // Physical Dimensions (with units)
    const dims = selectedProduct.dimensions;
    if (dims && (dims.length || dims.width || dims.height)) {
      const l = dims.length || '-';
      const w = dims.width || '-';
      const h = dims.height || '-';
      rows.push({ label: 'Dimensions (L × W × H)', value: `${l} × ${w} × ${h} cm` });
    }

    // Any extra specs from specifications map
    if (selectedProduct.specifications && typeof selectedProduct.specifications === 'object') {
      Object.entries(selectedProduct.specifications).forEach(([k, v]) => {
        const cleanK = decodeHtmlEntities(k.trim());
        const cleanV = decodeHtmlEntities(v.trim());
        const lowerK = cleanK.toLowerCase();
        if (
          !rows.some((r) => r.label.toLowerCase() === lowerK) &&
          lowerK !== 'warranty' &&
          lowerK !== 'delivery' &&
          lowerK !== 'condition'
        ) {
          rows.push({ label: cleanK, value: cleanV });
        }
      });
    }

    // Warranty
    if (selectedProduct.warrantyMonths) {
      rows.push({
        label: 'Warranty',
        value: `${selectedProduct.warrantyMonths} Months Express UK Hardware Guarantee (Parts & Labour)`,
      });
    }

    return { html: null, rows };
  }, [selectedProduct, selectedAttributes, matchedVariation]);

  const hasTechnicalData = Boolean(technicalData.html || (technicalData.rows && technicalData.rows.length > 0));

  // Dynamic available tabs based on real data presence (hidden if data is empty)
  const availableTabs = useMemo(() => {
    const list: { id: TabType; label: string }[] = [];
    if (hasTechnicalData) {
      list.push({ id: 'technical', label: 'Technical Details' });
    }
    if (hasFullDescription) {
      list.push({ id: 'about', label: 'About Product' });
    }
    list.push({ id: 'reviews', label: 'Reviews' });
    list.push({ id: 'shipment', label: 'Shipment' });
    list.push({ id: 'warranty', label: 'Condition & Warranty' });
    list.push({ id: 'additional', label: 'Additional Info' });
    return list;
  }, [hasTechnicalData, hasFullDescription]);

  // ACF-powered Trust Badges for the product page (below Add to Basket button)
  const visibleTrustBadges = useMemo(() => {
    if (!trustSettings.enabled || !selectedProduct) return [];

    const cf = selectedProduct.customFields || {};
    const badges: { id: string; label: string; text: string; icon: string }[] = [];

    // 1. Delivery (delivery_text)
    const delConfig = trustSettings.items?.delivery;
    if (delConfig?.enabled !== false) {
      const text = (cf.delivery_text || (selectedProduct as any).delivery_text || delConfig?.fallbackText || '').trim();
      if (text) {
        badges.push({
          id: 'delivery',
          label: delConfig?.label || 'Delivery',
          text,
          icon: delConfig?.icon || 'truck',
        });
      }
    }

    // 2. Warranty (warranty_text)
    const warConfig = trustSettings.items?.warranty;
    if (warConfig?.enabled !== false) {
      const text = (cf.warranty_text || (selectedProduct as any).warranty_text || warConfig?.fallbackText || '').trim();
      if (text) {
        badges.push({
          id: 'warranty',
          label: warConfig?.label || 'Warranty',
          text,
          icon: warConfig?.icon || 'shield',
        });
      }
    }

    // 3. Returns (returns_) Note trailing underscore!
    const retConfig = trustSettings.items?.returns;
    if (retConfig?.enabled !== false) {
      const text = (cf.returns_ || cf.returns || (selectedProduct as any).returns_ || retConfig?.fallbackText || '').trim();
      if (text) {
        badges.push({
          id: 'returns',
          label: retConfig?.label || 'Returns',
          text,
          icon: retConfig?.icon || 'rotate-ccw',
        });
      }
    }

    return badges;
  }, [trustSettings, selectedProduct]);

  // Ensure active tab switches to a valid visible tab if current tab is hidden
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Keyboard navigation for accessible tabs (arrow key support)
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (currentIndex + 1) % availableTabs.length;
      setActiveTab(availableTabs[nextIdx].id);
      const nextBtn = document.getElementById(`tab-${availableTabs[nextIdx].id}`);
      nextBtn?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
      setActiveTab(availableTabs[prevIdx].id);
      const prevBtn = document.getElementById(`tab-${availableTabs[prevIdx].id}`);
      prevBtn?.focus();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <button 
          onClick={() => setCurrentPage('shop')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#DF0C88] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        {(() => {
          const crumbs = getProductCategoryBreadcrumbs(selectedProduct, categories);
          return (
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
              <a href="/" className="hover:text-slate-700">Home</a>
              <span>/</span>
              <a href="/shop" className="hover:text-slate-700">Shop</a>
              {crumbs.map((c) => (
                <React.Fragment key={c.id}>
                  <span>/</span>
                  <a
                    href={c.url}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToCategory(c.url);
                    }}
                    className="hover:text-[#DF0C88] text-slate-600 transition-colors font-medium"
                  >
                    {c.name}
                  </a>
                </React.Fragment>
              ))}
              <span>/</span>
              <span className="text-slate-700 font-semibold line-clamp-1 max-w-[200px] sm:max-w-none">{selectedProduct.title}</span>
            </div>
          );
        })()}
      </div>

      {/* Main Product Presentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Product Gallery ONLY (Square, uncropped, pure white background #FFFFFF) */}
        <div className="lg:col-span-6 space-y-4">
          <div 
            onClick={() => setIsLightboxOpen(true)}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden aspect-square relative flex items-center justify-center p-4 sm:p-8 shadow-xs select-none group cursor-zoom-in"
            title="Click to view full uncropped image"
          >
            <img 
              src={currentMainImage} 
              alt={selectedProduct.title}
              width={800}
              height={800}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105" 
            />
            
            {/* Condition badge */}
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-xl shadow-xs pointer-events-none">
              {selectedAttributes['condition'] || selectedProduct.condition}
            </div>

            {/* Discount / Save badge */}
            {activeRegularPrice && activeRegularPrice > activePrice && (
              <div className="absolute top-4 right-4 bg-[#DF0C88] text-white text-xs font-bold px-3 py-1 rounded-xl shadow-md pointer-events-none">
                Save £{(activeRegularPrice - activePrice).toFixed(0)}
              </div>
            )}

            {/* Variable indicator */}
            {isVariable && (
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none">
                <SlidersHorizontal className="w-3 h-3 text-pink-400" />
                <span>Customise below</span>
              </div>
            )}

            {/* Zoom hint badge */}
            <div className="absolute bottom-4 right-4 bg-white/95 text-slate-700 border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-semibold pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Click to Zoom</span>
            </div>
          </div>

          {/* Thumbnail Strip: Square, contain rule on pure white background */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {allImages.slice(0, 8).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`relative aspect-square w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-white p-1 flex items-center justify-center ${
                    currentMainImage === img ? 'border-[#DF0C88] ring-2 ring-[#DF0C88]/20 scale-102 shadow-xs' : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`${selectedProduct.title} thumbnail ${idx + 1}`} 
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain object-center" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Purchase Module & Information */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Header & Product Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#DF0C88]">
                {selectedProduct.brand} · {inStock ? 'In Stock (Ready to Dispatch)' : 'Out of Stock'}
              </span>

              {/* TrustScore Tag */}
              <a 
                href="https://www.trustpilot.com/review/irepair-mobiles.co.uk"
                target="_blank" 
                rel="noopener noreferrer"
                title="View iRepair Mobiles reviews on Trustpilot"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-full transition-all group cursor-pointer text-xs"
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-[#00b67a] flex items-center justify-center rounded-xs">
                      <Star className="w-2 h-2 fill-white text-white" />
                    </div>
                  ))}
                </div>
                <span className="font-bold text-[11px]">4.8 / 5 Trustpilot</span>
              </a>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading leading-tight">
              {selectedProduct.title}
            </h1>

            {/* Rating Stars & SKU */}
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-800">{selectedProduct.rating}</span>
                <span className="text-slate-400">({selectedProduct.reviewsCount} verified reviews)</span>
              </div>
              {currentSku && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    SKU: {currentSku}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 1. Price Range Display Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-pink-50/30 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span>{isVariable ? (!isCompleteSelection ? 'Price Range' : 'Selected Variation Price') : 'Online Price'}</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                VAT Included · Free UK Shipping
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {isVariable 
                  ? (!isCompleteSelection ? displayPriceRange : `£${activePrice.toFixed(2)}`)
                  : `£${activeProduct.price.toFixed(2)}`
                }
              </span>
              {(isVariable ? activeRegularPrice : activeProduct.regularPrice) && 
               ((isVariable ? activeRegularPrice : activeProduct.regularPrice)! > (isVariable ? activePrice : activeProduct.price)) && (
                <span className="text-base text-slate-400 line-through tabular-nums">
                  £{(isVariable ? activeRegularPrice! : activeProduct.regularPrice!).toFixed(2)}
                </span>
              )}
              {isVariable && isCompleteSelection && activeRegularPrice && activeRegularPrice > activePrice && (
                <span className="text-xs font-bold text-white bg-[#DF0C88] px-2 py-0.5 rounded-full shadow-xs">
                  Save £{(activeRegularPrice - activePrice).toFixed(2)}
                </span>
              )}
            </div>
            
            {isVariable && !isCompleteSelection && (
              <p className="text-xs text-slate-500">
                Choose your options below to see exact variation pricing and live warehouse stock.
              </p>
            )}
          </div>

          {/* 2. WooCommerce Variations Form */}
          {productAttributes.length > 0 && (
            <div className="space-y-5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Select Options
                  </span>
                  {!isCompleteSelection && (
                    <span className="text-[10px] font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                      Options required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {hasAnyAttributeSelected && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs text-slate-500 hover:text-[#DF0C88] underline transition-colors cursor-pointer"
                    >
                      Clear selection
                    </button>
                  )}
                  {isLoadingVariations && (
                    <span className="text-[11px] text-[#DF0C88] animate-pulse">
                      Updating variations...
                    </span>
                  )}
                </div>
              </div>

              {productAttributes.map((attr) => {
                const normKey = normalizeAttrKey(attr.slug || attr.name);
                const currentValue = selectedAttributes[normKey];
                const isColor = normKey.includes('color') || normKey.includes('colour');
                const hasManyOptions = attr.options.length > 6;

                return (
                  <div key={attr.name} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {attr.name}:
                      </span>
                      {currentValue ? (
                        <span className="font-bold text-[#DF0C88]">
                          {currentValue}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">
                          Please choose
                        </span>
                      )}
                    </div>

                    {/* Styled Dropdown if > 6 options */}
                    {hasManyOptions ? (
                      <div className="relative">
                        <select
                          value={currentValue || ''}
                          onChange={(e) => handleSelectAttributeOption(normKey, e.target.value)}
                          className="w-full appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/20 focus:border-[#DF0C88] cursor-pointer"
                        >
                          <option value="">-- Choose {attr.name} --</option>
                          {attr.options.map((opt) => {
                            const possible = isOptionPossible(normKey, opt);
                            const inStockOpt = isOptionInStock(normKey, opt);
                            let suffix = '';
                            if (!possible) suffix = ' (Unavailable)';
                            else if (!inStockOpt) suffix = ' (Out of stock)';
                            return (
                              <option key={opt} value={opt} disabled={!possible}>
                                {opt}{suffix}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    ) : isColor ? (
                      /* Circular Color Swatches */
                      <div 
                        role="radiogroup" 
                        aria-label={`Select ${attr.name}`} 
                        className="flex flex-wrap gap-2.5"
                      >
                        {attr.options.map((opt) => {
                          const isSelected = currentValue?.toLowerCase().trim() === opt.toLowerCase().trim();
                          const possible = isOptionPossible(normKey, opt);
                          const inStockOpt = isOptionInStock(normKey, opt);
                          const colorStyle = getColorStyle(opt);

                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-disabled={!possible}
                              disabled={!possible}
                              onClick={() => handleSelectAttributeOption(normKey, opt)}
                              title={`${opt}${!possible ? ' (Unavailable with current options)' : !inStockOpt ? ' (Out of stock)' : ''}`}
                              className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                !possible
                                  ? 'opacity-35 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 line-through'
                                  : isSelected
                                    ? 'border-[#DF0C88] bg-pink-50/60 text-[#DF0C88] ring-2 ring-[#DF0C88]/30 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <span 
                                className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-xs relative ${
                                  colorStyle.isLight ? 'border border-slate-300' : 'border border-black/15'
                                }`}
                                style={{ backgroundColor: colorStyle.bg }}
                              />
                              <span>{opt}</span>
                              {!inStockOpt && possible && (
                                <span className="text-[10px] text-slate-400 font-normal">(Out of stock)</span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#DF0C88]" />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Button Chips for <= 6 options (Storage, Condition, Network, etc.) */
                      <div 
                        role="radiogroup" 
                        aria-label={`Select ${attr.name}`} 
                        className="flex flex-wrap gap-2"
                      >
                        {attr.options.map((opt) => {
                          const isSelected = currentValue?.toLowerCase().trim() === opt.toLowerCase().trim();
                          const possible = isOptionPossible(normKey, opt);
                          const inStockOpt = isOptionInStock(normKey, opt);

                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-disabled={!possible}
                              disabled={!possible}
                              onClick={() => handleSelectAttributeOption(normKey, opt)}
                              title={`${opt}${!possible ? ' (Unavailable with current options)' : !inStockOpt ? ' (Out of stock)' : ''}`}
                              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                !possible
                                  ? 'opacity-35 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 line-through'
                                  : isSelected
                                    ? 'border-[#DF0C88] bg-pink-50 text-[#DF0C88] ring-2 ring-[#DF0C88]/20 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              {!inStockOpt && possible && (
                                <span className="text-[10px] text-slate-400 font-normal">(Out of stock)</span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-[#DF0C88]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Selected Variation / Product Availability Price Summary (Live Region) */}
          <div 
            aria-live="polite" 
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            {isVariable && !isCompleteSelection ? (
              <>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-pink-700 uppercase tracking-wider">
                    Required Options
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-700">
                    Please select: <span className="font-bold text-[#DF0C88]">{missingAttributes.map(a => a.name).join(', ')}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Price Range</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                    {displayPriceRange}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {isVariable && hasAnyAttributeSelected ? 'Selected Combination' : 'Availability'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{selectedOptionsSummary}</span>
                    {inStock ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ In Stock
                      </span>
                    ) : matchedVariation?.backorders === 'yes' ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Backorder Available
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-slate-400 font-medium">Total Price</div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums">
                    £{(activePrice * quantity).toFixed(2)}
                  </div>
                  {activeRegularPrice && activeRegularPrice > activePrice && (
                    <div className="text-xs text-slate-400 line-through tabular-nums">
                      £{(activeRegularPrice * quantity).toFixed(2)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 4. Quantity Stepper & Add to Basket + Express Payment Buttons */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center rounded-[5px] bg-[#F4F5F7] h-11 w-[112px] shrink-0 select-none">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-full flex items-center justify-center text-slate-700 hover:text-black transition-colors cursor-pointer"
                  title="Decrease quantity"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="flex-1 text-center font-semibold text-sm text-slate-900 tabular-nums">
                  {quantity}
                </span>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-full flex items-center justify-center text-slate-700 hover:text-black transition-colors cursor-pointer"
                  title="Increase quantity"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {isVariable && !isCompleteSelection ? (
                <button 
                  type="button"
                  disabled
                  className="h-11 px-6 bg-slate-200 text-slate-500 font-semibold rounded-[5px] flex items-center justify-center gap-2 text-sm cursor-not-allowed whitespace-nowrap"
                >
                  <span>Select {missingAttributes.map(a => a.name).join(', ') || 'Options'}</span>
                </button>
              ) : !inStock ? (
                <button 
                  type="button"
                  disabled
                  className="h-11 px-6 bg-slate-200 text-slate-500 font-semibold rounded-[5px] flex items-center justify-center gap-2 text-sm cursor-not-allowed whitespace-nowrap"
                >
                  <span>Out of stock</span>
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleAddToCart}
                  className="h-11 px-7 bg-[#1F1F1F] hover:bg-black text-white font-semibold rounded-[5px] flex items-center justify-center text-sm transition-colors active:scale-[0.99] cursor-pointer whitespace-nowrap"
                >
                  <span>Add to basket</span>
                </button>
              )}
            </div>

            {/* Row 2: Direct Stripe Checkout Payment Buttons (Apple Pay & Google Pay) */}
            <div className="w-full">
              <StripeExpressCheckout
                location="product"
                product={activeProduct}
                variationId={matchedVariation?.id}
                selectedAttributes={hasAnyAttributeSelected ? selectedAttributes : undefined}
                quantity={quantity}
                price={activePrice}
                isCompleteSelection={!isVariable || (isCompleteSelection && (variations.length === 0 || Boolean(matchedVariation)))}
                inStock={inStock}
              />
            </div>
          </div>

          {/* 5. ACF TRUST ICONS SECTION (Delivery, Warranty, Returns) */}
          {visibleTrustBadges.length > 0 && (
            <div 
              aria-label="Product assurances and delivery guarantees" 
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1"
            >
              {visibleTrustBadges.map((badge) => {
                const renderIcon = () => {
                  switch (badge.icon) {
                    case 'truck':
                      return <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-[#DF0C88] shrink-0" />;
                    case 'shield':
                      return <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#DF0C88] shrink-0" />;
                    case 'rotate-ccw':
                      return <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#DF0C88] shrink-0" />;
                    case 'package':
                      return <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#DF0C88] shrink-0" />;
                    default:
                      return <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#DF0C88] shrink-0" />;
                  }
                };

                return (
                  <div
                    key={badge.id}
                    title={badge.text}
                    className="p-3 sm:p-3.5 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center sm:flex-col sm:text-center gap-3 sm:gap-1.5 transition-all group"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {renderIcon()}
                    </div>
                    <div className="min-w-0 flex-1 sm:w-full">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {badge.label}
                      </div>
                      <div className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug break-words">
                        {badge.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 6. Trustpilot Banner Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00b67a] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Star className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Excellent 4.8 / 5</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[#00b67a] font-extrabold">Trustpilot</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Over 150+ verified customer reviews across the UK
                </div>
              </div>
            </div>

            <a 
              href="https://www.trustpilot.com/review/irepair-mobiles.co.uk"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Read reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 7. Product Short Description Summary (Preserves full rich WordPress formatting & lists; hides cleanly when empty) */}
          {(() => {
            const rawShortDesc = selectedProduct.shortDescription || selectedProduct.short_description;
            if (isEmptyHtml(rawShortDesc)) return null;

            const sanitizedHtml = sanitizeProductShortDescriptionHtml(rawShortDesc);
            if (isEmptyHtml(sanitizedHtml)) return null;

            return (
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div 
                  className="product-short-description"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              </div>
            );
          })()}

          {/* Payment & Security Reassurance */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Guaranteed Secure UK Checkout</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-3 flex-wrap">
              <span>Visa</span>
              <span>·</span>
              <span>Mastercard</span>
              <span>·</span>
              <span>Apple Pay</span>
              <span>·</span>
              <span>Google Pay</span>
              <span>·</span>
              <span>PayPal</span>
              <span>·</span>
              <span>Klarna (Pay in 3)</span>
              <span>·</span>
              <span>ClearPay</span>
            </div>
          </div>

          {/* Repair alternative option */}
          <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900">Already own this device?</div>
              <div className="text-slate-500">We offer screen, battery & camera repairs from £39.</div>
            </div>
            <button 
              onClick={() => startRepairBooking({ category: selectedProduct.category === 'laptops' ? 'laptop' : 'smartphone' })}
              className="bg-slate-900 hover:bg-[#DF0C88] text-white font-semibold py-2 px-3.5 rounded-lg shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-[#DF0C88]" />
              <span>Book Repair</span>
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* PRODUCT TABS SECTION (EXACTLY AS IN ATTACHED SCREENSHOT)                  */}
      {/* ========================================================================= */}
      <div className="space-y-6 pt-6">
        
        {/* Tab Buttons Row (Accessible Tablist) */}
        <div 
          ref={tabListRef}
          role="tablist"
          aria-label="Product Information Tabs"
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none"
        >
          {availableTabs.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#DF0C88] focus:ring-offset-2 ${
                  isSelected
                    ? 'bg-black text-white border-2 border-[#DF0C88] shadow-sm'
                    : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          
          {/* TAB 1: TECHNICAL DETAILS (Accessible 2-column table from real synced data or custom HTML) */}
          {activeTab === 'technical' && hasTechnicalData && (
            <div 
              id="tabpanel-technical"
              role="tabpanel"
              aria-labelledby="tab-technical"
              tabIndex={0}
              className="focus:outline-hidden"
            >
              {technicalData.html ? (
                <div 
                  className="p-6 sm:p-10 prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:py-3 [&_th]:px-4 [&_th]:bg-slate-50 [&_th]:font-bold [&_th]:text-slate-900 [&_td]:py-3 [&_td]:px-4 [&_td]:border-t [&_td]:border-slate-100"
                  dangerouslySetInnerHTML={{ __html: technicalData.html }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Technical specifications for {decodeHtmlEntities(selectedProduct.title)}</caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-white">
                        <th scope="col" className="py-4 px-6 sm:px-8 font-bold text-slate-900 text-xs sm:text-sm border-r border-slate-200 w-1/3 min-w-[140px]">
                          Specification
                        </th>
                        <th scope="col" className="py-4 px-6 sm:px-8 font-bold text-slate-900 text-xs sm:text-sm w-2/3">
                          Detail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {technicalData.rows.map((row, idx) => (
                        <tr 
                          key={row.label} 
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-pink-50/20 transition-colors flex flex-col sm:table-row`}
                        >
                          <th 
                            scope="row" 
                            className="py-3.5 sm:py-4 px-6 sm:px-8 font-bold text-slate-900 text-xs sm:text-sm sm:w-1/3 align-top border-b sm:border-b-0 border-slate-100 sm:border-r border-slate-200"
                          >
                            {row.label}
                          </th>
                          <td className="py-3.5 sm:py-4 px-6 sm:px-8 text-xs sm:text-sm text-slate-700 sm:w-2/3 align-top leading-relaxed">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{row.value}</span>
                              {row.isSelectedVariation && (
                                <span className="inline-flex items-center text-[10px] font-semibold text-[#DF0C88] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                                  Selected option
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ABOUT PRODUCT (Full sanitized description from WooCommerce) */}
          {activeTab === 'about' && hasFullDescription && (
            <div 
              id="tabpanel-about"
              role="tabpanel"
              aria-labelledby="tab-about"
              tabIndex={0}
              className="p-6 sm:p-10 space-y-8 focus:outline-hidden"
            >
              <div className="space-y-4 max-w-4xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xl font-bold text-slate-900 font-heading">
                    About {decodeHtmlEntities(selectedProduct.title)}
                  </h3>
                  <span className="text-xs font-semibold text-[#DF0C88] bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                    Official Product Overview
                  </span>
                </div>

                {/* Sanitized Full HTML Description */}
                <div 
                  className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 [&_h1]:text-lg sm:[&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-sm sm:[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-slate-700 [&_li::marker]:text-slate-900 [&_a]:text-[#DF0C88] [&_a]:font-semibold hover:[&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:mx-auto [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border [&_table]:border-slate-200 [&_table]:rounded-xl [&_th]:bg-slate-50 [&_th]:p-3 [&_th]:text-xs [&_th]:font-bold [&_th]:text-slate-900 [&_td]:p-3 [&_td]:text-xs [&_td]:border-t [&_td]:border-slate-100 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-xl [&_.video-container]:w-full [&_.video-container]:aspect-video [&_.video-container]:rounded-xl [&_.video-container]:overflow-hidden whitespace-normal"
                  dangerouslySetInnerHTML={{ __html: fullDescriptionHtml }} 
                />
              </div>

              {/* What's in the Box */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#DF0C88]" />
                  <span>What's In The Box</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Certified Device</div>
                      <div className="text-slate-500">Cleaned & sanitized</div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Fast Charging Cable</div>
                      <div className="text-slate-500">Braided USB-C / Lightning</div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">SIM Tray Key</div>
                      <div className="text-slate-500">Universal ejection pin</div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">iRepair Warranty Card</div>
                      <div className="text-slate-500">12M express coverage</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEWS */}
          {activeTab === 'reviews' && (
            <div 
              id="tabpanel-reviews"
              role="tabpanel"
              aria-labelledby="tab-reviews"
              tabIndex={0}
              className="p-6 sm:p-10 space-y-8 focus:outline-hidden"
            >
              {/* Trustpilot Score Summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">4.8</div>
                  <div>
                    <div className="flex items-center gap-1 text-[#00b67a]">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-5 h-5 bg-[#00b67a] flex items-center justify-center rounded-xs text-white">
                          <Star className="w-3.5 h-3.5 fill-white text-white" />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Based on 150+ verified UK customer reviews on Trustpilot
                    </div>
                  </div>
                </div>
                <a
                  href="https://www.trustpilot.com/review/irepair-mobiles.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#00b67a] hover:bg-[#009b67] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>Review on Trustpilot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Sample verified customer reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">David M.</span>
                    <span className="text-[10px] text-slate-400">Verified Purchase · 2 days ago</span>
                  </div>
                  <div className="flex text-[#00b67a] gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    "Phone arrived next morning in pristine condition without a mark. Battery health is at 98%. Excellent service by iRepair Mobiles."
                  </p>
                </div>

                <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Sarah K.</span>
                    <span className="text-[10px] text-slate-400">Verified Purchase · 1 week ago</span>
                  </div>
                  <div className="flex text-[#00b67a] gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    "Bought this for my daughter. Unlocked straight away with her O2 SIM. Saved over £200 compared to Apple store price!"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHIPMENT */}
          {activeTab === 'shipment' && (
            <div 
              id="tabpanel-shipment"
              role="tabpanel"
              aria-labelledby="tab-shipment"
              tabIndex={0}
              className="p-6 sm:p-10 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed focus:outline-hidden"
            >
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                UK Tracked Next-Day Delivery Policy
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <Clock className="w-5 h-5 text-[#DF0C88]" />
                  <div className="font-bold text-slate-900 text-sm">Order by 3 PM</div>
                  <p className="text-xs text-slate-500">Same-day dispatch Monday to Friday for immediate delivery.</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <div className="font-bold text-slate-900 text-sm">Royal Mail Tracked 24</div>
                  <p className="text-xs text-slate-500">Full GPS tracking code sent by SMS & email upon dispatch.</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <div className="font-bold text-slate-900 text-sm">Fully Insured Transit</div>
                  <p className="text-xs text-slate-500">All shipments are 100% insured against loss or transit damage.</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                <strong>Free UK Shipping:</strong> All tech orders qualify for complimentary Tracked Next-Day UK Shipping. Returns are free within 14 days of delivery.
              </div>
            </div>
          )}

          {/* TAB 5: CONDITION & WARRANTY */}
          {activeTab === 'warranty' && (
            <div 
              id="tabpanel-warranty"
              role="tabpanel"
              aria-labelledby="tab-warranty"
              tabIndex={0}
              className="p-6 sm:p-10 space-y-8 focus:outline-hidden"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                      Device Condition Grading & 12-Month Warranty
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Transparent grading standards for mobile phones and tech devices at iRepair Mobiles
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>12M Parts & Labour Guarantee</span>
                  </span>
                </div>

                {/* 5 Distinct Grading Cards for Mobile Phones */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#DF0C88]" />
                    <span>Mobile Phone Condition Standards</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3.5">
                    {/* Grade: New */}
                    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                            New
                          </span>
                          <span className="font-bold text-sm text-slate-900">Brand-New Sealed</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          100% Unused
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        A brand-new, unused, unopened item in its original packaging, never worn, used, or activated, with all original packaging intact.
                      </p>
                    </div>

                    {/* Grade: A Grade */}
                    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 bg-[#DF0C88] text-white font-black text-xs rounded-lg uppercase tracking-wider">
                            A Grade
                          </span>
                          <span className="font-bold text-sm text-slate-900">Pristine / Like New</span>
                        </div>
                        <span className="text-[11px] font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                          Retail Box Quality
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        The item appears as if it has just come out of a retail box. There are no signs of wear, and all original protective materials are intact. The item may have been opened or used very minimally but retains its pristine condition, and all original accessories are included.
                      </p>
                    </div>

                    {/* Grade: B Grade */}
                    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 bg-amber-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                            B Grade
                          </span>
                          <span className="font-bold text-sm text-slate-900">Excellent Condition</span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          100% Operational
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        The item shows minimal wear from general use and is 100% operational and functions as intended. It may have minor cosmetic imperfections but performs well, and may be missing non-essential accessories.
                      </p>
                    </div>

                    {/* Grade: C Grade */}
                    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                            C Grade
                          </span>
                          <span className="font-bold text-sm text-slate-900">Good Condition</span>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Fully Functional
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        The item is fully operational and functions as intended, but has noticeable wear from previous use. It may have aesthetic imperfections such as scratches or dents, and may be missing non-essential accessories.
                      </p>
                    </div>

                    {/* Grade: Fair */}
                    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-white border-slate-200 hover:border-slate-300">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 bg-slate-700 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                            Fair
                          </span>
                          <span className="font-bold text-sm text-slate-900">Fair / Value Grade</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Works Perfectly
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        The item is fairly worn but continues to work perfectly. Signs of wear can include aesthetic issues such as scratches, dents, and worn corners, and it may be missing non-essential accessories.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warranty & Service Policy Box */}
                <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>iRepair Mobiles Comprehensive Warranty Coverage</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>12M Warranty</span>
                      </div>
                      <div className="font-semibold text-slate-700">Parts & Labour</div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Full coverage on internal hardware, screen display controller, battery cells, audio components, and logic board.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                        <Truck className="w-4 h-4 text-[#DF0C88]" />
                        <span>Next-Day UK</span>
                      </div>
                      <div className="font-semibold text-slate-700">Royal Mail Tracked</div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Dispatch by 3 PM Monday to Friday with full GPS tracking and signature on delivery across the UK.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                        <RotateCcw className="w-4 h-4 text-amber-600" />
                        <span>14-Day Return</span>
                      </div>
                      <div className="font-semibold text-slate-700">Hassle-Free Policy</div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Test the device with your SIM. If you are not 100% satisfied, return it within 14 days for a replacement or full refund.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB 6: ADDITIONAL INFO */}
          {activeTab === 'additional' && (
            <div 
              id="tabpanel-additional"
              role="tabpanel"
              aria-labelledby="tab-additional"
              tabIndex={0}
              className="p-6 sm:p-10 space-y-6 focus:outline-hidden"
            >
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Product Details & Compliance Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">Brand:</span>
                  <span className="font-bold text-slate-900">{selectedProduct.brand}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">Model Name:</span>
                  <span className="font-bold text-slate-900">{selectedProduct.title}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">Category:</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedProduct.category}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">Network:</span>
                  <span className="font-bold text-emerald-700">Factory Unlocked (Worldwide)</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">IMEI Status:</span>
                  <span className="font-bold text-emerald-700">Clean & CheckMEND Verified</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl flex justify-between border border-slate-100">
                  <span className="font-semibold text-slate-500">VAT Status:</span>
                  <span className="font-bold text-slate-900">VAT Margin Scheme Invoice Included</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* RELATED PRODUCTS SLIDER (PER USER REQUEST)                                */}
      {/* ========================================================================= */}
      <div className="space-y-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Related Products
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers who viewed this item also explored these verified devices & accessories
            </p>
          </div>

          {/* Slider Prev / Next Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSlider('left')}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Previous products"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollSlider('right')}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Next products"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Slider */}
        <div 
          ref={sliderRef}
          className="flex items-stretch gap-6 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none snap-x snap-mandatory"
        >
          {relatedProducts.map((product) => {
            const isProdVariable = product.type === 'variable' || (product.variations && product.variations.length > 0);
            const priceRangeText = product.priceRange || (product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice
              ? `£${product.minPrice.toFixed(2)} – £${product.maxPrice.toFixed(2)}`
              : `£${product.price.toFixed(2)}`);

            return (
              <div 
                key={product.id}
                className="w-68 sm:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group snap-start"
              >
                <a 
                  href={buildProductHierarchicalUrl(product, categories)}
                  className="cursor-pointer block text-left"
                  onClick={(e) => {
                    e.preventDefault();
                    viewProductDetail(product);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="relative aspect-square w-full bg-white flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
                    <img 
                      src={product.image} 
                      alt={product.title}
                      loading="lazy"
                      width="600"
                      height="600"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded z-10">
                      {product.condition}
                    </div>
                    {isProdVariable ? (
                      <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs z-10">
                        Multiple Options
                      </div>
                    ) : product.regularPrice && (
                      <div className="absolute top-2.5 right-2.5 bg-[#DF0C88] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs z-10">
                        Save £{(product.regularPrice - product.price).toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#DF0C88] uppercase tracking-wider">
                        {product.brand}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        12M Warranty
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-[#DF0C88] transition-colors">
                      {product.title}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-700">{product.rating}</span>
                      <span className="text-slate-400">({product.reviewsCount})</span>
                    </div>

                    <div className="pt-2 flex items-baseline gap-2 flex-wrap">
                      {isProdVariable ? (
                        <span className="text-base font-black text-slate-900 tabular-nums">
                          {priceRangeText}
                        </span>
                      ) : (
                        <>
                          <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                            £{product.price.toFixed(2)}
                          </span>
                          {product.regularPrice && (
                            <span className="text-xs text-slate-400 line-through tabular-nums">
                              £{product.regularPrice.toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </a>

                <div className="p-4 pt-0">
                  {isProdVariable ? (
                    <button 
                      type="button"
                      onClick={() => {
                        viewProductDetail(product);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Select options</span>
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        addToCart(product);
                        showNotification(`Added ${product.title} to cart!`, 'success');
                      }}
                      className="w-full bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Lightbox Modal for uncropped high-resolution view */}
      {isLightboxOpen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Enlarged product image view"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer z-10"
              aria-label="Close zoom modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-square w-full max-h-[75vh] flex items-center justify-center bg-white overflow-hidden">
              <img
                src={currentMainImage}
                alt={selectedProduct.title}
                className="w-full h-full object-contain object-center"
              />
            </div>

            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-slate-900">{decodeHtmlEntities(selectedProduct.title)}</p>
              <p className="text-xs text-slate-500">Uncropped high-resolution view</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
