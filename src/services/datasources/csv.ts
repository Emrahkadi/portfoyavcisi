// CSV Import data source
// Kullanıcı Sahibinden/Hepsiemlak'tan "Favorilerim" veya arama sonuçlarını CSV olarak dışa aktarır
// Bu yöntem Sahibinden'in resmi "veri taşınabilirliği" özelliğidir ve ToS'a uygundur

import type { DataSourceAdapter, FetchParams, RawListing } from './types';
import { ListingSource, PropertyType } from '@prisma/client';

export interface CsvRow {
  'İlan No'?: string;
  'İlan Başlığı'?: string;
  'Fiyat'?: string;
  'm²'?: string;
  'Oda Sayısı'?: string;
  'İl'?: string;
  'İlçe'?: string;
  'Mahalle'?: string;
  'Sahibinden'?: string;
  'İlan Tarihi'?: string;
  'Telefon'?: string;
  'URL'?: string;
  [key: string]: string | undefined;
}

export class CsvDataSource implements DataSourceAdapter {
  readonly name = 'CSV Import';
  readonly source = ListingSource.CSV_IMPORT;
  readonly complianceNote =
    'Kullanıcının portal\'ın resmi CSV export özelliğinden aktardığı veriler. ToS uyumlu.';

  private rows: CsvRow[] = [];

  // CSV satırlarını set et
  setRows(rows: CsvRow[]) {
    this.rows = rows;
  }

  async fetchListings(params: FetchParams): Promise<RawListing[]> {
    return this.rows
      .filter((row) => this.matchesFilters(row, params))
      .map((row) => this.parseRow(row));
  }

  private matchesFilters(row: CsvRow, params: FetchParams): boolean {
    if (params.city && row['İl'] !== params.city) return false;
    if (params.district && row['İlçe'] !== params.district) return false;
    if (params.isOwner !== undefined) {
      const isOwner = row['Sahibinden'] === 'Evet';
      if (isOwner !== params.isOwner) return false;
    }
    return true;
  }

  private parseRow(row: CsvRow): RawListing {
    const price = this.parseNumber(row['Fiyat']) || 0;
    const sizeSqm = this.parseNumber(row['m²']) || 0;
    const pricePerSqm = sizeSqm > 0 ? price / sizeSqm : 0;

    return {
      externalId: row['İlan No'] || `csv-${Date.now()}-${Math.random()}`,
      source: ListingSource.CSV_IMPORT,
      url: row['URL'],
      title: row['İlan Başlığı'] || 'İlan',
      propertyType: this.detectPropertyType(row['İlan Başlığı'] || ''),
      rooms: row['Oda Sayısı'],
      sizeSqm,
      price,
      pricePerSqm,
      city: row['İl'] || '',
      district: row['İlçe'] || '',
      neighborhood: row['Mahalle'],
      isOwner: row['Sahibinden'] === 'Evet',
      daysOnMarket: this.calculateDaysOnMarket(row['İlan Tarihi']),
      contactPhone: row['Telefon'],
      rawData: row as Record<string, unknown>,
    };
  }

  private parseNumber(value: string | undefined): number {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  private detectPropertyType(title: string): PropertyType {
    const t = title.toLowerCase();
    if (t.includes('villa')) return PropertyType.VILLA;
    if (t.includes('daire') || t.includes('apartman')) return PropertyType.APARTMENT;
    if (t.includes('müstakil') || t.includes('ev')) return PropertyType.HOUSE;
    if (t.includes('ofis') || t.includes('büro')) return PropertyType.OFFICE;
    if (t.includes('arsa') || t.includes('tarla')) return PropertyType.LAND;
    if (t.includes('dükkan') || t.includes('mağaza')) return PropertyType.COMMERCIAL;
    return PropertyType.OTHER;
  }

  private calculateDaysOnMarket(dateStr: string | undefined): number {
    if (!dateStr) return 0;
    try {
      const date = new Date(dateStr);
      const diff = Date.now() - date.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  async healthCheck() {
    return { ok: true, message: `${this.rows.length} CSV satırı yüklü` };
  }
}