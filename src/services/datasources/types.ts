// Data Source interface - Tüm veri kaynakları bu interface'i implement eder
// Bu sayede Sahibinden'i değiştirdiğimizde sadece yeni bir adapter yazmamız yeterli

import type { ListingSource, PropertyType } from '@prisma/client';

export interface RawListing {
  externalId: string;
  source: ListingSource;
  url?: string;
  title: string;
  description?: string;
  propertyType: PropertyType;
  rooms?: string;
  sizeSqm: number;
  price: number;
  city: string;
  district: string;
  neighborhood?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  floor?: number;
  buildingAge?: number;
  heatingType?: string;
  furnished?: boolean;
  isOwner: boolean;
  daysOnMarket: number;
  priceHistory?: Array<{ date: string; price: number }>;
  viewCount?: number;
  contactPhone?: string;
  contactName?: string;
  rawData?: Record<string, unknown>;
}

export interface DataSourceAdapter {
  /** Adapter'ın adı */
  readonly name: string;
  /** Hangi kaynak tipini destekliyor */
  readonly source: ListingSource;
  /** Bu kaynak için geçerli olan ToS uyumluluk notu */
  readonly complianceNote: string;
  /** Veri çekme metodu */
  fetchListings(params: FetchParams): Promise<RawListing[]>;
  /** Sağlık kontrolü */
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
}

export interface FetchParams {
  city?: string;
  district?: string;
  neighborhood?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  isOwner?: boolean;
  sinceDays?: number;
  limit?: number;
}

/**
 * ÖNEMLİ YASAL UYARI:
 *
 * Bu sistem Sahibinden.com, Hepsiemlak vb. portallardan OTOMATİK veri çekmez.
 * Tüm veri kaynakları aşağıdaki yasal yöntemlerden biriyle çalışır:
 *
 * 1. MANUAL: Kullanıcının kendi eklediği ilanlar
 * 2. CSV_IMPORT: Kullanıcının portal'dan dışa aktardığı CSV dosyaları
 * 3. API_PARTNER: Portal'ın resmi API'si (yazılı izin ile)
 * 4. OTHER: Diğer yasal yöntemler
 *
 * Sahibinden.com'un kullanım koşulları otomatik veri çekmeyi açıkça yasaklamaktadır.
 * Bu nedenle sistem tasarım gereği "scraping" yapmaz.
 */