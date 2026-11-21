export interface EditorialCategoryItem {
  id: string;
  categoryId?: number;
  categorySlug?: string;
  title: string;
  modelCountLabel?: string;
  image: string;
  link: string;
  altText?: string;
  hidden?: boolean;
}

export interface CategoryEditorialRailSettings {
  enableWidget?: boolean;
  eyebrowText?: string;
  headingText?: string;
  showModelCount?: boolean;
  syncMode?: 'custom_order' | 'auto_sync_db';
  useLiveDbCounts?: boolean;
  ctaText?: string;
  accentColor?: string;
  backgroundColor?: string;
  highlightFirstByDefault?: boolean;
  items?: EditorialCategoryItem[];
}

export const DEFAULT_EDITORIAL_CATEGORY_ITEMS: EditorialCategoryItem[] = [
  {
    id: 'cat_ed_smartphones',
    categoryId: 1375,
    categorySlug: 'mobile-phones',
    title: 'Smartphones',
    modelCountLabel: '120+ models',
    image: '/images/categories/editorial_smartphones.jpg',
    link: '/product-category/mobile-phones/',
    altText: 'Smartphones repair, buyback and refurbished phones',
  },
  {
    id: 'cat_ed_tablets',
    categoryId: 53,
    categorySlug: 'tablets-and-ipads',
    title: 'Tablets & iPads',
    modelCountLabel: '45+ models',
    image: '/images/categories/editorial_tablets.jpg',
    link: '/product-category/tablets-and-ipads/',
    altText: 'Tablets & iPads repair, buyback and refurbished devices',
  },
  {
    id: 'cat_ed_laptops',
    categoryId: 55,
    categorySlug: 'laptop-and-pc',
    title: 'Laptops',
    modelCountLabel: '60+ models',
    image: '/images/categories/editorial_laptops.jpg',
    link: '/product-category/laptop-and-pc/',
    altText: 'Laptops and MacBooks repair and trade-in',
  },
  {
    id: 'cat_ed_headphones',
    categoryId: 59,
    categorySlug: 'earbuds-and-headphones',
    title: 'Headphones',
    modelCountLabel: '35+ models',
    image: '/images/categories/editorial_headphones.jpg',
    link: '/product-category/accessories/earbuds-and-headphones/',
    altText: 'Headphones and wireless audio earbuds',
  },
  {
    id: 'cat_ed_gaming',
    categoryId: 1347,
    categorySlug: 'gaming-accessories',
    title: 'Gaming',
    modelCountLabel: '28+ models',
    image: '/images/categories/editorial_gaming.jpg',
    link: '/product-category/gaming-accessories/',
    altText: 'Gaming consoles, controllers and accessories',
  },
  {
    id: 'cat_ed_smartwatches',
    categoryId: 136,
    categorySlug: 'apple-watches',
    title: 'Smartwatches',
    modelCountLabel: '30+ models',
    image: '/images/categories/editorial_smartwatches.jpg',
    link: '/product-category/accessories/apple-accessories/apple-watches/',
    altText: 'Apple Watches and smartwatches',
  },
  {
    id: 'cat_ed_cases',
    categoryId: 149,
    categorySlug: 'mobile-phone-cases',
    title: 'Cases & Covers',
    modelCountLabel: '80+ models',
    image: '/images/categories/editorial_cases.jpg',
    link: '/product-category/accessories/mobile-phone-cases/',
    altText: 'Protective phone cases and covers',
  },
  {
    id: 'cat_ed_chargers',
    categoryId: 1374,
    categorySlug: 'chargers-and-cables',
    title: 'Chargers & Cables',
    modelCountLabel: '50+ models',
    image: '/images/categories/editorial_chargers.jpg',
    link: '/product-category/accessories/chargers-and-cables/',
    altText: 'Fast wall chargers, MagSafe chargers and cables',
  },
];

export const CATEGORY_EDITORIAL_RAIL_DEFAULTS: CategoryEditorialRailSettings = {
  enableWidget: true,
  eyebrowText: 'REPAIR & BUYBACK DIRECTORY',
  headingText: 'Browse by Category',
  showModelCount: true,
  syncMode: 'custom_order',
  useLiveDbCounts: false,
  ctaText: 'Explore',
  accentColor: '#E6007E',
  backgroundColor: '#FFFFFF',
  highlightFirstByDefault: true,
  items: DEFAULT_EDITORIAL_CATEGORY_ITEMS,
};
