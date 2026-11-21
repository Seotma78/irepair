import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PageType, DeviceCategory, Product, CartItem, RepairBooking, WordPressCategory, WordPressConfig, StoreLocation } from '../types';
import { PRODUCTS, DEMO_BOOKINGS, STORE_LOCATIONS } from '../data/mockData';
import { 
  getStoredWpConfig, 
  saveStoredWpConfig, 
  getStoredWpProducts, 
  saveStoredWpProducts,
  getStoredWpCategories, 
  saveStoredWpCategories,
  fetchWordPressProducts,
  purgeBloatedProductStorage 
} from '../services/wordpressApi';
import { 
  parseProductRoute, 
  buildProductHierarchicalUrl, 
  getProductCategoryPath 
} from '../utils/categoryUtils';

const DEFAULT_CATEGORIES: WordPressCategory[] = [
  { id: 1, name: 'Smartphones', slug: 'smartphones', parent: 0, count: 8 },
  { id: 2, name: 'Laptops', slug: 'laptops', parent: 0, count: 6 },
  { id: 3, name: 'Accessories', slug: 'accessories', parent: 0, count: 12 },
  { id: 4, name: 'Tablets', slug: 'tablets', parent: 0, count: 4 },
];

interface AppContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  selectedCategory: DeviceCategory;
  setSelectedCategory: (cat: DeviceCategory) => void;
  selectedBrand: string;
  setSelectedBrand: (b: string) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  selectedIssue: string;
  setSelectedIssue: (i: string) => void;
  preselectedStoreId: string;
  setPreselectedStoreId: (storeId: string) => void;
  
  // Store Locations (Dynamic CMS Stores)
  stores: StoreLocation[];
  refreshStores: () => Promise<void>;

  // Global Site Settings (Logos, Brand, Contact)
  siteSettings: Record<string, any>;
  refreshSiteSettings: () => Promise<void>;

  // Products & Categories (Dynamic WordPress / WooCommerce)
  products: Product[];
  categories: WordPressCategory[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  refreshCategories: () => Promise<void>;
  refreshProducts: () => Promise<void>;

  // Category page navigation
  currentCategoryPath: string;
  setCurrentCategoryPath: (path: string) => void;
  navigateToCategory: (catUrlOrPath: string) => void;
  
  // WordPress & Yoast Sync
  wpConfig: WordPressConfig;
  updateWpConfig: (cfg: WordPressConfig) => void;
  isSyncingWp: boolean;
  wpSyncStatus: { status: 'idle' | 'success' | 'error'; message?: string; lastSync?: string; error?: string };
  syncWordPressProducts: (overrideConfig?: WordPressConfig) => Promise<boolean>;
  showWpSyncModal: boolean;
  setShowWpSyncModal: (open: boolean) => void;
  
  // Cart
  cart: CartItem[];
  appliedCoupon: { code: string; discount: number; freeShipping?: boolean } | null;
  setAppliedCoupon: (coupon: { code: string; discount: number; freeShipping?: boolean } | null) => void;
  addToCart: (
    product: Product, 
    quantity?: number, 
    color?: string, 
    storage?: string,
    variationId?: number | string,
    attributes?: Record<string, string>,
    unitPrice?: number,
    variationSku?: string,
    variationImage?: string
  ) => void;
  removeFromCart: (indexOrProductId: string | number) => void;
  updateQuantity: (indexOrProductId: string | number, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  
  // Product Detail
  selectedProduct: Product | null;
  viewProductDetail: (product: Product) => void;
  
  // Shop Filters from Mega Menu
  shopBrandFilter: string;
  setShopBrandFilter: (b: string) => void;
  shopConditionFilter: string;
  setShopConditionFilter: (c: string) => void;
  
  // Bookings & Tracking
  bookings: RepairBooking[];
  addBooking: (booking: {
    category: DeviceCategory;
    brand: string;
    model: string;
    issue: string;
    price: number;
    method: 'walk-in' | 'mail-in' | 'call-out';
    storeLocationId?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    notes?: string;
  }) => RepairBooking;
  trackingQuery: string;
  setTrackingQuery: (q: string) => void;
  
  // Helper to start booking with preselected device/issue
  startRepairBooking: (options?: { category?: DeviceCategory; brand?: string; model?: string; issue?: string; storeId?: string }) => void;
  
  // Notifications
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  
  // Careers / Jobs
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  
  // WooCommerce sync simulation
  showWooModal: boolean;
  setShowWooModal: (show: boolean) => void;
  // Blog & Archives navigation
  blogPageNumber: number;
  setBlogPageNumber: (page: number) => void;
  blogArchiveType: 'category' | 'tag' | 'author' | null;
  blogArchiveSlug: string;
  setBlogArchive: (type: 'category' | 'tag' | 'author' | null, slug: string) => void;

  wooCommercePayload: any;
  setWooCommercePayload: (payload: any) => void;
}

export function getRouteFromPath(pathname: string): { 
  page: PageType; 
  productSlug?: string; 
  categoryPath?: string;
  blogPageNumber?: number;
  blogArchiveType?: 'category' | 'tag' | 'author';
  blogArchiveSlug?: string;
} {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return { page: 'home' };

  if (clean.startsWith('product/')) {
    const { productSlug, categoryPath } = parseProductRoute(clean);
    return { page: 'product-detail', productSlug, categoryPath };
  }

  if (clean.startsWith('product-category/')) {
    const cPath = clean.replace(/^product-category\//, '');
    return { page: 'product-category', categoryPath: cPath };
  }

  if (clean === 'blogs' || clean.startsWith('blogs/page/')) {
    let pageNum = 1;
    if (clean.startsWith('blogs/page/')) {
      const match = clean.match(/blogs\/page\/(\d+)/);
      if (match) pageNum = parseInt(match[1], 10) || 1;
    }
    return { page: 'blogs', blogPageNumber: pageNum };
  }

  if (clean.startsWith('blogs/') || clean.startsWith('blog/')) {
    const postSlug = clean.replace(/^(blogs|blog)\//, '');
    return { page: postSlug as PageType };
  }

  if (clean.startsWith('blog-category/') || clean.startsWith('category/')) {
    const slug = clean.replace(/^(blog-category|category)\//, '').replace(/\/+$/, '');
    return { page: 'blog-category-archive', blogArchiveType: 'category', blogArchiveSlug: slug };
  }

  if (clean.startsWith('tag/')) {
    const slug = clean.replace(/^tag\//, '').replace(/\/+$/, '');
    return { page: 'blog-tag-archive', blogArchiveType: 'tag', blogArchiveSlug: slug };
  }

  if (clean.startsWith('author/')) {
    const slug = clean.replace(/^author\//, '').replace(/\/+$/, '');
    return { page: 'blog-author-archive', blogArchiveType: 'author', blogArchiveSlug: slug };
  }

  if (clean === 'order-confirmation' || clean.startsWith('order-confirmation/')) {
    return { page: 'order-confirmation' };
  }

  if (clean === 'about' || clean === 'about-us') {
    return { page: 'about-us' };
  }

  if (clean === 'contact' || clean === 'contact-us') {
    return { page: 'contact-us' };
  }

  if (clean === 'terms' || clean === 'terms-of-use') {
    return { page: 'terms-of-use' };
  }

  if (clean === 'privacy' || clean === 'privacy-policy') {
    return { page: 'privacy-policy' };
  }

  if (clean === 'warranty' || clean === 'warranty-policy') {
    return { page: 'warranty-policy' };
  }

  if (clean === 'shipping-delivery-policy' || clean === 'shipping' || clean === 'shipping-and-delivery-policy') {
    return { page: 'shipping-delivery-policy' };
  }

  if (clean === 'return-cancellation-policy' || clean === 'returns' || clean === 'return-and-cancellation-policy' || clean === 'cancellation-policy') {
    return { page: 'return-cancellation-policy' };
  }

  if (clean === 'sell-my-phone' || clean === 'sell-your-devices' || clean === 'sell-device' || clean === 'sell-devices' || clean === 'sell-old-phone') {
    return { page: 'sell-my-phone' };
  }

  if (clean === 'career' || clean === 'careers' || clean === 'jobs') {
    return { page: 'career' };
  }

  if (clean === 'apply-now' || clean === 'apply' || clean === 'job-application') {
    return { page: 'apply-now' };
  }

  if (clean === 'mobile-phone-repair-shops-in-uk' || clean === 'mobile-phone-repair-shops' || clean === 'repair-shops-in-uk') {
    return { page: 'mobile-phone-repair-shops-in-uk' };
  }

  if (clean === 'mobile-phone-repair-shop-in-norwich' || clean === 'repair-shop-in-norwich' || clean === 'norwich-repair-shop') {
    return { page: 'mobile-phone-repair-shop-in-norwich' };
  }

  if (clean === 'mobile-phone-repair-basingstoke' || clean === 'repair-basingstoke' || clean === 'basingstoke-repair-shop') {
    return { page: 'mobile-phone-repair-basingstoke' };
  }

  if (clean === 'phone-repairing-services-southend' || clean === 'repair-southend' || clean === 'southend-repair-shop' || clean === 'mobile-phone-repair-southend') {
    return { page: 'phone-repairing-services-southend' };
  }

  if (clean === 'mobile-phone-repair-shop-eastbourne' || clean === 'repair-shop-eastbourne' || clean === 'eastbourne-repair-shop' || clean === 'mobile-phone-repair-eastbourne') {
    return { page: 'mobile-phone-repair-shop-eastbourne' };
  }

  if (clean === 'mobile-phone-repair-shop-in-reading' || clean === 'mobile-phone-repair-reading' || clean === 'repair-shop-in-reading' || clean === 'reading-repair-shop' || clean === 'repair-reading') {
    return { page: 'mobile-phone-repair-shop-in-reading' };
  }

  if (clean === 'mobile-phone-repair-service-solihull' || clean === 'mobile-phone-repair-solihull' || clean === 'repair-service-solihull' || clean === 'solihull-repair-shop' || clean === 'repair-solihull' || clean === 'mobile-phone-repair-shop-solihull') {
    return { page: 'mobile-phone-repair-service-solihull' };
  }

  if (clean === 'mobile-repair-shop-in-ipswich' || clean === 'mobile-phone-repair-shop-in-ipswich' || clean === 'repair-shop-in-ipswich' || clean === 'ipswich-repair-shop' || clean === 'repair-ipswich') {
    return { page: 'mobile-repair-shop-in-ipswich' };
  }

  return { page: clean as PageType };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCategoryPath, setCurrentCategoryPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const { categoryPath } = getRouteFromPath(window.location.pathname);
      return categoryPath || '';
    }
    return '';
  });

  const [currentPage, setCurrentPageState] = useState<PageType>(() => {
    if (typeof window !== 'undefined') {
      const { page } = getRouteFromPath(window.location.pathname);
      return page;
    }
    return 'home';
  });

  const [blogPageNumber, setBlogPageNumber] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const { blogPageNumber } = getRouteFromPath(window.location.pathname);
      return blogPageNumber || 1;
    }
    return 1;
  });

  const [blogArchiveType, setBlogArchiveType] = useState<'category' | 'tag' | 'author' | null>(() => {
    if (typeof window !== 'undefined') {
      const { blogArchiveType } = getRouteFromPath(window.location.pathname);
      return blogArchiveType || null;
    }
    return null;
  });

  const [blogArchiveSlug, setBlogArchiveSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const { blogArchiveSlug } = getRouteFromPath(window.location.pathname);
      return blogArchiveSlug || '';
    }
    return '';
  });

  const setBlogArchive = useCallback((type: 'category' | 'tag' | 'author' | null, slug: string) => {
    setBlogArchiveType(type);
    setBlogArchiveSlug(slug);
  }, []);

  const setCurrentPage = useCallback((page: PageType, pushState: boolean = true) => {
    if (typeof page === 'string' && page.startsWith('#')) {
      const el = document.getElementById(page.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const cleanSlug = typeof page === 'string' ? page.replace(/^\/+|\/+$/g, '') : '';
    let resolvedPage = (cleanSlug || 'home') as PageType;

    // Canonical slug normalization
    if (resolvedPage === 'about') resolvedPage = 'about-us';
    if (resolvedPage === 'contact') resolvedPage = 'contact-us';
    if (resolvedPage === 'terms') resolvedPage = 'terms-of-use';
    if (resolvedPage === 'privacy') resolvedPage = 'privacy-policy';
    if (resolvedPage === 'warranty') resolvedPage = 'warranty-policy';
    if (resolvedPage === 'shipping') resolvedPage = 'shipping-delivery-policy';
    if (resolvedPage === 'returns') resolvedPage = 'return-cancellation-policy';
    if (resolvedPage === 'sell-your-devices' || resolvedPage === 'sell-device' || resolvedPage === 'sell-devices' || resolvedPage === 'sell-old-phone') {
      resolvedPage = 'sell-my-phone';
    }
    if (resolvedPage === 'careers' || resolvedPage === 'jobs') {
      resolvedPage = 'career';
    }
    if (resolvedPage === 'apply' || resolvedPage === 'job-application') {
      resolvedPage = 'apply-now';
    }
    if (resolvedPage === 'mobile-phone-repair-shops' || resolvedPage === 'repair-shops-in-uk') {
      resolvedPage = 'mobile-phone-repair-shops-in-uk';
    }
    if (resolvedPage === 'repair-shop-in-norwich' || resolvedPage === 'norwich-repair-shop') {
      resolvedPage = 'mobile-phone-repair-shop-in-norwich';
    }
    if (resolvedPage === 'repair-basingstoke' || resolvedPage === 'basingstoke-repair-shop') {
      resolvedPage = 'mobile-phone-repair-basingstoke';
    }
    if (resolvedPage === 'repair-southend' || resolvedPage === 'southend-repair-shop' || resolvedPage === 'mobile-phone-repair-southend') {
      resolvedPage = 'phone-repairing-services-southend';
    }
    if (resolvedPage === 'repair-shop-eastbourne' || resolvedPage === 'eastbourne-repair-shop' || resolvedPage === 'mobile-phone-repair-eastbourne') {
      resolvedPage = 'mobile-phone-repair-shop-eastbourne';
    }
    if (resolvedPage === 'mobile-phone-repair-reading' || resolvedPage === 'repair-shop-in-reading' || resolvedPage === 'reading-repair-shop' || resolvedPage === 'repair-reading') {
      resolvedPage = 'mobile-phone-repair-shop-in-reading';
    }
    if (resolvedPage === 'mobile-phone-repair-solihull' || resolvedPage === 'repair-service-solihull' || resolvedPage === 'solihull-repair-shop' || resolvedPage === 'repair-solihull' || resolvedPage === 'mobile-phone-repair-shop-solihull') {
      resolvedPage = 'mobile-phone-repair-service-solihull';
    }
    if (resolvedPage === 'mobile-phone-repair-shop-in-ipswich' || resolvedPage === 'repair-shop-in-ipswich' || resolvedPage === 'ipswich-repair-shop' || resolvedPage === 'repair-ipswich') {
      resolvedPage = 'mobile-repair-shop-in-ipswich';
    }

    if (cleanSlug.startsWith('product-category/')) {
      resolvedPage = 'product-category';
      setCurrentCategoryPath(cleanSlug.replace(/^product-category\//, ''));
    } else if (cleanSlug === 'blogs' || cleanSlug.startsWith('blogs/page/')) {
      resolvedPage = 'blogs';
      if (cleanSlug.startsWith('blogs/page/')) {
        const match = cleanSlug.match(/blogs\/page\/(\d+)/);
        setBlogPageNumber(match ? parseInt(match[1], 10) || 1 : 1);
      } else {
        setBlogPageNumber(1);
      }
    } else if (cleanSlug.startsWith('blogs/') || cleanSlug.startsWith('blog/')) {
      resolvedPage = cleanSlug.replace(/^(blogs|blog)\//, '') as PageType;
    } else if (cleanSlug.startsWith('blog-category/') || cleanSlug.startsWith('category/')) {
      resolvedPage = 'blog-category-archive';
      const cSlug = cleanSlug.replace(/^(blog-category|category)\//, '').replace(/\/+$/, '');
      setBlogArchiveType('category');
      setBlogArchiveSlug(cSlug);
    } else if (cleanSlug.startsWith('tag/')) {
      resolvedPage = 'blog-tag-archive';
      const tSlug = cleanSlug.replace(/^tag\//, '').replace(/\/+$/, '');
      setBlogArchiveType('tag');
      setBlogArchiveSlug(tSlug);
    } else if (cleanSlug.startsWith('author/')) {
      resolvedPage = 'blog-author-archive';
      const aSlug = cleanSlug.replace(/^author\//, '').replace(/\/+$/, '');
      setBlogArchiveType('author');
      setBlogArchiveSlug(aSlug);
    }

    setCurrentPageState(resolvedPage);

    if (pushState && typeof window !== 'undefined') {
      let targetPath = resolvedPage === 'home' ? '/' : `/${resolvedPage}/`;
      if (cleanSlug.startsWith('product-category/') || cleanSlug.startsWith('blog-category/') || cleanSlug.startsWith('category/') || cleanSlug.startsWith('tag/') || cleanSlug.startsWith('author/') || cleanSlug.startsWith('blogs/page/')) {
        let normalizedSlug = cleanSlug;
        if (normalizedSlug.startsWith('category/')) {
          normalizedSlug = normalizedSlug.replace(/^category\//, 'blog-category/');
        }
        targetPath = `/${normalizedSlug}/`;
      }
      if (window.location.pathname !== targetPath && window.location.pathname !== targetPath.replace(/\/$/, '')) {
        window.history.pushState({ page: resolvedPage }, '', targetPath);
        window.dispatchEvent(new Event('locationchange'));
      }
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handleLocationSync = () => {
      const parsed = getRouteFromPath(window.location.pathname);
      setCurrentPageState(parsed.page);
      if (parsed.categoryPath !== undefined) {
        setCurrentCategoryPath(parsed.categoryPath);
      }
      if (parsed.blogPageNumber !== undefined) {
        setBlogPageNumber(parsed.blogPageNumber);
      }
      if (parsed.blogArchiveType !== undefined) {
        setBlogArchiveType(parsed.blogArchiveType);
      }
      if (parsed.blogArchiveSlug !== undefined) {
        setBlogArchiveSlug(parsed.blogArchiveSlug);
      }
    };

    window.addEventListener('popstate', handleLocationSync);
    window.addEventListener('locationchange', handleLocationSync);
    return () => {
      window.removeEventListener('popstate', handleLocationSync);
      window.removeEventListener('locationchange', handleLocationSync);
    };
  }, []);

  const navigateToCategory = useCallback((catUrlOrPath: string) => {
    let clean = catUrlOrPath.replace(/^\/+|\/+$/g, '');
    if (clean.startsWith('product-category/')) {
      clean = clean.replace(/^product-category\//, '');
    }
    setCurrentCategoryPath(clean);
    setCurrentPageState('product-category');
    if (typeof window !== 'undefined') {
      const targetPath = `/product-category/${clean}/`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page: 'product-category', categoryPath: clean }, '', targetPath);
        window.dispatchEvent(new Event('locationchange'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory>('smartphone');
  const [selectedBrand, setSelectedBrand] = useState<string>('apple');
  const [selectedModel, setSelectedModel] = useState<string>('iphone-14-pro');
  const [selectedIssue, setSelectedIssue] = useState<string>('screen');
  const [preselectedStoreId, setPreselectedStoreId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('jobId') || null;
    }
    return null;
  });
  const [stores, setStores] = useState<StoreLocation[]>(STORE_LOCATIONS);
  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({
    siteName: 'iRepair Mobiles UK',
    logoUrl: '/src/assets/images/irepair-logo.svg',
    logoWhiteUrl: '/src/assets/images/irepair-logo-white.svg',
  });

  const refreshSiteSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setSiteSettings(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch site settings:', err);
    }
  }, []);

  const refreshStores = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/collections/stores');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stores from CMS:', err);
    }
  }, []);

  useEffect(() => {
    refreshStores();
    refreshSiteSettings();
  }, [refreshStores, refreshSiteSettings]);

  // WordPress / WooCommerce Live Products & Categories
  const [products, setProducts] = useState<Product[]>(() => {
    return getStoredWpProducts() || PRODUCTS;
  });
  const [categories, setCategories] = useState<WordPressCategory[]>(() => {
    return getStoredWpCategories() || DEFAULT_CATEGORIES;
  });

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          saveStoredWpCategories(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch categories from API:', err);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/catalogue/products?limit=250');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          saveStoredWpProducts(data.products);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch catalogue products from local DB:', err);
    }
  }, []);

  useEffect(() => {
    purgeBloatedProductStorage();
    refreshCategories();
    refreshProducts();
  }, [refreshCategories, refreshProducts]);

  const [wpConfig, setWpConfig] = useState<WordPressConfig>(() => getStoredWpConfig());
  const [isSyncingWp, setIsSyncingWp] = useState(false);
  const [wpSyncStatus, setWpSyncStatus] = useState<{ status: 'idle' | 'success' | 'error'; message?: string; lastSync?: string; error?: string }>({
    status: getStoredWpProducts() ? 'success' : 'idle',
    lastSync: getStoredWpConfig()?.lastSyncedAt,
  });
  const [showWpSyncModal, setShowWpSyncModal] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('irepair_cart_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [appliedCoupon, setAppliedCouponState] = useState<{ code: string; discount: number; freeShipping?: boolean } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('irepair_cart_coupon_v1');
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('irepair_cart_v1', JSON.stringify(cart));
      } catch (_) {}
    }
  }, [cart]);

  const setAppliedCoupon = useCallback((coupon: { code: string; discount: number; freeShipping?: boolean } | null) => {
    setAppliedCouponState(coupon);
    if (typeof window !== 'undefined') {
      try {
        if (coupon) {
          localStorage.setItem('irepair_cart_coupon_v1', JSON.stringify(coupon));
        } else {
          localStorage.removeItem('irepair_cart_coupon_v1');
        }
      } catch (_) {}
    }
  }, []);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || PRODUCTS[0]);
  const [shopBrandFilter, setShopBrandFilter] = useState<string>('all');
  const [shopConditionFilter, setShopConditionFilter] = useState<string>('all');
  const [bookings, setBookings] = useState<RepairBooking[]>(DEMO_BOOKINGS);
  const [trackingQuery, setTrackingQuery] = useState<string>('IRM-78241');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showWooModal, setShowWooModal] = useState(false);
  const [wooCommercePayload, setWooCommercePayload] = useState<any>(null);

  const updateWpConfig = (newCfg: WordPressConfig) => {
    setWpConfig(newCfg);
    saveStoredWpConfig(newCfg);
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const syncWordPressProducts = useCallback(async (overrideConfig?: WordPressConfig): Promise<boolean> => {
    setIsSyncingWp(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Trigger server-side product sync
      const res = await fetch('/api/admin/products/sync/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'incremental' }),
      });

      if (res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        await Promise.all([refreshProducts(), refreshCategories()]);
        setWpSyncStatus({
          status: 'success',
          lastSync: new Date().toISOString(),
          message: 'Products & categories refreshed from local database.',
        });
        showNotification('Catalog synchronized with local database', 'success');
        return true;
      } else {
        // Fallback to direct client API if admin not logged in
        const fallbackRes = await fetchWordPressProducts(overrideConfig || wpConfig);
        if (fallbackRes.products && fallbackRes.products.length > 0) {
          setProducts(fallbackRes.products);
          saveStoredWpProducts(fallbackRes.products);
          setWpSyncStatus({
            status: 'success',
            lastSync: new Date().toISOString(),
            message: `Synchronized ${fallbackRes.products.length} products!`,
          });
          showNotification(`Successfully loaded ${fallbackRes.products.length} products`, 'success');
          return true;
        }
        throw new Error('Sync failed');
      }
    } catch (err: any) {
      console.error('Failed to sync products:', err);
      const errMsg = err.message || 'Failed to sync products';
      setWpSyncStatus({
        status: 'error',
        error: errMsg,
      });
      showNotification(errMsg, 'error');
      return false;
    } finally {
      setIsSyncingWp(false);
    }
  }, [refreshProducts, refreshCategories, wpConfig]);

  const addToCart = (
    product: Product, 
    quantity = 1, 
    color?: string, 
    storage?: string,
    variationId?: number | string,
    attributes?: Record<string, string>,
    unitPrice?: number,
    variationSku?: string,
    variationImage?: string
  ) => {
    const finalPrice = unitPrice !== undefined ? unitPrice : product.price;
    const formatted = attributes && Object.keys(attributes).length > 0 
      ? Object.entries(attributes).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(', ') 
      : undefined;

    setCart(prev => {
      const matchIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        String(item.selectedVariationId || '') === String(variationId || '') &&
        item.selectedStorage === storage && 
        item.selectedColor === color
      );
      if (matchIndex >= 0) {
        const copy = [...prev];
        copy[matchIndex] = {
          ...copy[matchIndex],
          quantity: copy[matchIndex].quantity + quantity,
          unitPrice: finalPrice,
          selectedAttributes: attributes || copy[matchIndex].selectedAttributes,
          variationSku: variationSku || copy[matchIndex].variationSku,
          variationImage: variationImage || copy[matchIndex].variationImage,
          formattedAttributes: formatted || copy[matchIndex].formattedAttributes,
        };
        return copy;
      }
      return [
        ...prev, 
        { 
          product, 
          quantity, 
          selectedColor: color, 
          selectedStorage: storage,
          selectedVariationId: variationId,
          selectedAttributes: attributes,
          unitPrice: finalPrice,
          variationSku,
          variationImage,
          formattedAttributes: formatted,
        }
      ];
    });
    showNotification(`Added "${product.title}" to cart!`);
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (indexOrProductId: string | number) => {
    if (typeof indexOrProductId === 'number') {
      setCart(prev => prev.filter((_, idx) => idx !== indexOrProductId));
    } else {
      setCart(prev => prev.filter(item => item.product.id !== indexOrProductId));
    }
    showNotification('Item removed from cart', 'info');
  };

  const updateQuantity = (indexOrProductId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(indexOrProductId);
      return;
    }
    if (typeof indexOrProductId === 'number') {
      setCart(prev => prev.map((item, idx) => idx === indexOrProductId ? { ...item, quantity } : item));
    } else {
      setCart(prev => prev.map(item => item.product.id === indexOrProductId ? { ...item, quantity } : item));
    }
  };

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('irepair_cart_v1');
        localStorage.removeItem('irepair_cart_coupon_v1');
      } catch (_) {}
    }
  }, [setAppliedCoupon]);

  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.unitPrice ?? item.product.price) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const viewProductDetail = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentPageState('product-detail');
    if (typeof window !== 'undefined') {
      const targetPath = buildProductHierarchicalUrl(product, categories);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page: 'product-detail', productSlug: product.slug || product.id }, '', targetPath);
        window.dispatchEvent(new Event('locationchange'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [categories]);

  useEffect(() => {
    const handleLocationSync = () => {
      const path = window.location.pathname;
      if (path === '/admin-login' || path.startsWith('/admin')) {
        return;
      }
      const route = getRouteFromPath(path);
      if (route.productSlug) {
        const found = products.find(
          (p) => p.slug === route.productSlug || p.id === route.productSlug || (p.wpId && String(p.wpId) === route.productSlug)
        );
        if (found) {
          setSelectedProduct(found);
          const canonicalProductUrl = buildProductHierarchicalUrl(found, categories);
          if (window.location.pathname !== canonicalProductUrl && !window.location.pathname.startsWith('/admin')) {
            window.history.replaceState({ page: 'product-detail', productSlug: found.slug }, '', canonicalProductUrl);
          }
        }
      }
      if (route.categoryPath) {
        setCurrentCategoryPath(route.categoryPath);
      }
      setCurrentPageState(route.page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handleLocationSync);
    window.addEventListener('locationchange', handleLocationSync);
    return () => {
      window.removeEventListener('popstate', handleLocationSync);
      window.removeEventListener('locationchange', handleLocationSync);
    };
  }, [products, categories]);

  // Initial load check if direct product or category URL was opened
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const route = getRouteFromPath(window.location.pathname);
      if (route.productSlug && products.length > 0) {
        const found = products.find(
          (p) => p.slug === route.productSlug || p.id === route.productSlug || (p.wpId && String(p.wpId) === route.productSlug)
        );
        if (found) {
          setSelectedProduct(found);
          setCurrentPageState('product-detail');
          const canonicalProductUrl = buildProductHierarchicalUrl(found, categories);
          if (window.location.pathname !== canonicalProductUrl && !window.location.pathname.startsWith('/admin')) {
            window.history.replaceState({ page: 'product-detail', productSlug: found.slug }, '', canonicalProductUrl);
          }
        }
      } else if (route.categoryPath) {
        setCurrentCategoryPath(route.categoryPath);
        setCurrentPageState('product-category');
      }
    }
  }, [products, categories]);

  const addBooking = (bookingData: {
    category: DeviceCategory;
    brand: string;
    model: string;
    issue: string;
    price: number;
    method: 'walk-in' | 'mail-in' | 'call-out';
    storeLocationId?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    notes?: string;
  }): RepairBooking => {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const newId = `IRM-${randomDigits}`;
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

    const newBooking: RepairBooking = {
      ...bookingData,
      id: newId,
      createdAt: dateStr,
      status: 'received',
      estimatedCompletion: bookingData.method === 'walk-in' ? 'Within 30–45 mins upon arrival' : '24–48 hours after receiving',
      trackingNumber: newId,
    };

    setBookings(prev => [newBooking, ...prev]);
    setTrackingQuery(newId);
    return newBooking;
  };

  const startRepairBooking = (options?: { category?: DeviceCategory; brand?: string; model?: string; issue?: string; storeId?: string }) => {
    if (options?.category) setSelectedCategory(options.category);
    if (options?.brand) setSelectedBrand(options.brand);
    if (options?.model) setSelectedModel(options.model);
    if (options?.issue) setSelectedIssue(options.issue);
    if (options?.storeId) setPreselectedStoreId(options.storeId);
    setCurrentPage('book-repair');
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        selectedCategory,
        setSelectedCategory,
        selectedBrand,
        setSelectedBrand,
        selectedModel,
        setSelectedModel,
        selectedIssue,
        setSelectedIssue,
        preselectedStoreId,
        setPreselectedStoreId,
        stores,
        refreshStores,
        siteSettings,
        refreshSiteSettings,
        products,
        setProducts,
        categories,
        refreshCategories,
        refreshProducts,
        currentCategoryPath,
        setCurrentCategoryPath,
        navigateToCategory,
        wpConfig,
        updateWpConfig,
        isSyncingWp,
        wpSyncStatus,
        syncWordPressProducts,
        showWpSyncModal,
        setShowWpSyncModal,
        cart,
        appliedCoupon,
        setAppliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubtotal,
        cartCount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        selectedProduct,
        viewProductDetail,
        shopBrandFilter,
        setShopBrandFilter,
        shopConditionFilter,
        setShopConditionFilter,
        bookings,
        addBooking,
        trackingQuery,
        setTrackingQuery,
        startRepairBooking,
        notification,
        showNotification,
        selectedJobId,
        setSelectedJobId,
        showWooModal,
        setShowWooModal,
        wooCommercePayload,
        setWooCommercePayload,
        blogPageNumber,
        setBlogPageNumber,
        blogArchiveType,
        blogArchiveSlug,
        setBlogArchive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
