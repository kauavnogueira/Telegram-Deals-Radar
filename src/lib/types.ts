export interface Product {
  id: string;
  telegramMessageId?: number;
  channelName: string;
  channelId?: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  coupon?: string | null;
  url: string;
  store: string;
  rawText: string;
  imageUrl?: string | null;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  store: string;
  title: string;
  discountDescription?: string | null;
  minSpend?: number | null;
  channelName: string;
  url: string;
  rawText: string;
  createdAt: number;
}

export interface CouponFilterQuery {
  search?: string;
  store?: string;
  channel?: string;
  channels?: string[];
  limit?: number;
  offset?: number;
}

export type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc'
  | 'date_desc'
  | 'date_asc';

export interface ProductFilterQuery {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  channel?: string;
  channels?: string[];
  tab?: 'products' | 'coupons';
  hasCoupon?: boolean;
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
}

export interface CollectorStatus {
  isRunning: boolean;
  connected: boolean;
  channels: string[];
  totalCollected: number;
  lastCollectedAt?: number | null;
  error?: string | null;
}

export interface ProductStats {
  total: number;
  productsCount: number;
  withCouponCount: number;
  avgDiscount: number;
  avgPrice: number;
  maxPrice: number;
  stores: { store: string; count: number }[];
  channels: { channel: string; count: number }[];
}

export interface MonitoredChannel {
  id: string;
  username: string;
  title?: string;
  isActive: boolean;
  createdAt: number;
  productCount?: number;
}

