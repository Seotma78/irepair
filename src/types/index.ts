export type PageType = 
  | 'home' 
  | 'book-repair' 
  | 'shop' 
  | 'product-detail' 
  | 'services' 
  | 'locations' 
  | 'track-repair' 
  | 'about' 
  | 'about-us'
  | 'contact' 
  | 'contact-us'
  | 'checkout' 
  | 'terms'
  | 'terms-of-use'
  | 'privacy'
  | 'privacy-policy'
  | 'warranty'
  | 'warranty-policy'
  | 'shipping-delivery-policy'
  | 'return-cancellation-policy'
  | 'sell-my-phone'
  | 'career'
  | 'apply-now'
  | 'mobile-phone-repair-shops-in-uk'
  | 'mobile-phone-repair-shop-in-norwich'
  | 'mobile-phone-repair-basingstoke'
  | 'phone-repairing-services-southend'
  | 'mobile-phone-repair-shop-eastbourne'
  | 'mobile-phone-repair-shop-in-reading'
  | 'mobile-phone-repair-service-solihull'
  | 'mobile-repair-shop-in-ipswich'
  | (string & {});

export type DeviceCategory = 'smartphone' | 'tablet' | 'laptop' | 'smartwatch' | 'console';

export interface DeviceBrand {
  id: string;
  name: string;
  logo?: string;
  category: DeviceCategory;
}

export interface DeviceModel {
  id: string;
  brandId: string;
  name: string;
  category: DeviceCategory;
  image?: string;
  popular?: boolean;
}

export interface RepairIssue {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  iconName: string;
  popular?: boolean;
}

export type RepairMethod = 'walk-in' | 'mail-in' | 'call-out';

export interface StoreLocation {
  id: string;
  city: string;
  name: string;
  storeName?: string;
  address: string;
  streetAddress?: string;
  postcode: string;
  phone: string;
  email: string;
  openingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  workingHours?: {
    Monday?: string;
    Tuesday?: string;
    Wednesday?: string;
    Thursday?: string;
    Friday?: string;
    Saturday?: string;
    Sunday?: string;
    [key: string]: string | undefined;
  };
  features: string[];
  isExpressHub: boolean;
  latitude?: number;
  longitude?: number;
  mapLink?: string;
  mapUrl?: string;
  image?: string;
}

export interface RepairBooking {
  id: string; // IRM-XXXXX
  createdAt: string;
  category: DeviceCategory;
  brand: string;
  model: string;
  issue: string;
  price: number;
  method: RepairMethod;
  storeLocationId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  passcodeProvided?: boolean;
  status: 'received' | 'diagnosing' | 'in-progress' | 'testing' | 'ready' | 'collected';
  estimatedCompletion: string;
  trackingNumber?: string;
}

export type ProductCondition = 'Brand New' | 'Refurbished - Pristine (Grade A)' | 'Refurbished - Excellent (Grade B)';

export interface YoastSeoData {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  schema?: Record<string, any>;
  focusKeyword?: string;
  metaRobots?: string;
}

export interface CategorySeoData {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  permalink?: string;
  categoryUrl?: string;
  focusKeyword?: string;
  ogImage?: string;
  noindex?: boolean;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
  image?: string;
  hierarchicalUrl?: string;
  url?: string;
  seo?: CategorySeoData;
}

export interface WordPressConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  useProxy: boolean;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface WooCommerceAttribute {
  id?: number;
  name: string;
  slug?: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options: string[];
}

export interface ProductVariation {
  id: number | string;
  externalId?: number;
  productId?: string;
  sku?: string;
  name?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  onSale?: boolean;
  saleFrom?: string;
  saleTo?: string;
  attributes: Record<string, string>;
  rawAttributes?: { id?: number; name: string; slug?: string; option: string }[];
  image?: string;
  status?: string;
  inStock: boolean;
  stockStatus?: string;
  manageStock?: boolean;
  stockQuantity?: number | null;
  backorders?: string;
  weight?: string | number;
  dimensions?: { length?: string | number; width?: string | number; height?: string | number };
  description?: string;
  menuOrder?: number;
  customFields?: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  condition: ProductCondition;
  inStock: boolean;
  stockStatus?: string;
  stockCount: number;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  image: string;
  gallery?: string[];
  description: string;
  shortDescription?: string;
  short_description?: string;
  longDescription?: string;
  specifications: Record<string, string>;
  warrantyMonths: number;
  variants?: {
    storage?: string[];
    colors?: { name: string; hex: string }[];
  };
  wpId?: number;
  permalink?: string;
  yoastSeo?: YoastSeoData;
  type?: 'simple' | 'variable';
  priceHtml?: string;
  minPrice?: number;
  maxPrice?: number;
  minRegularPrice?: number;
  maxRegularPrice?: number;
  hasPriceRange?: boolean;
  anyOnSale?: boolean;
  priceRange?: string;
  attributes?: WooCommerceAttribute[];
  defaultAttributes?: Record<string, string>;
  variations?: ProductVariation[];
  categoryPath?: string;
  hierarchicalUrl?: string;
  canonicalUrl?: string;
  name?: string;
  sku?: string;
  weight?: string | number;
  dimensions?: { length?: string | number; width?: string | number; height?: string | number };
  customMeta?: Record<string, any>;
  customFields?: Record<string, string>;
  technicalDetailsHtml?: string;
  source?: 'local' | 'woocommerce';
  externalId?: number;
  lastSyncedAt?: string;
  localHidden?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedStorage?: string;
  selectedVariationId?: number | string;
  selectedAttributes?: Record<string, string>;
  unitPrice?: number;
  variationSku?: string;
  variationImage?: string;
  formattedAttributes?: string;
}

export interface Testimonial {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  review: string;
  deviceRepaired: string;
  verified: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
}

export interface JobOpening {
  id: string;
  title: string;
  location: string;
  vacancies: number;
  closing_date?: string;
  closingDate?: string;
  description: string;
  status: 'Active' | 'Closed';
  department?: string;
  salary_range?: string;
  salaryRange?: string;
  employment_type?: string;
  employmentType?: string;
  created_at?: string;
  updated_at?: string;
  applicants_count?: number;
}

export interface JobApplication {
  id: string;
  job_id: string;
  jobId?: string;
  full_name: string;
  fullName?: string;
  email: string;
  phone: string;
  education_level: string;
  educationLevel?: string;
  salary_expectations: number;
  salaryExpectations?: number;
  resume_url: string;
  resumeUrl?: string;
  resume_filename?: string;
  resumeFilename?: string;
  cover_letter_url?: string;
  coverLetterUrl?: string;
  cover_letter_filename?: string;
  coverLetterFilename?: string;
  status: 'new' | 'reviewed' | 'shortlisted' | 'interviewing' | 'rejected' | 'hired';
  notes?: string;
  created_at: string;
  createdAt?: string;
  job_title?: string;
  job_location?: string;
}

export interface CustomFieldMappingItem {
  role: 'delivery' | 'warranty' | 'returns' | 'technical_details';
  label: string;
  metaKey: string;
  type: 'text' | 'html';
  enabled: boolean;
}

export interface TrustBadgeItemSetting {
  id: 'delivery' | 'warranty' | 'returns';
  label: string;
  icon: string;
  customSvg?: string;
  fallbackText: string;
  enabled: boolean;
}

export interface TrustBadgesSettings {
  enabled: boolean;
  items: {
    delivery: TrustBadgeItemSetting;
    warranty: TrustBadgeItemSetting;
    returns: TrustBadgeItemSetting;
  };
}
