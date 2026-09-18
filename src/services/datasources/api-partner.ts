// API Partner data source
// SADECE portal'ın yazılı izin verdiği resmi API'ler için kullanılır
// Sahibinden'in resmi bir API'si yoktur, bu nedenle bu adapter varsayılan olarak devre dışıdır

import type { DataSourceAdapter, FetchParams, RawListing } from './types';
import { ListingSource } from '@prisma/client';

export interface ApiPartnerConfig {
  baseUrl: string;
  apiKey: string;
  partnerId: string;
}

export class ApiPartnerDataSource implements DataSourceAdapter {
  readonly name = 'API Partner';
  readonly source = ListingSource.API_PARTNER;
  readonly complianceNote =
    'Portal\'ın yazılı izin verdiği resmi API entegrasyonu. Sözleşme gerektirir.';

  constructor(private config: ApiPartnerConfig) {}

  async fetchListings(params: FetchParams): Promise<RawListing[]> {
    // NOT: Bu metod sadece resmi API sözleşmesi olan partner'lar için aktiftir.
    // Sahibinden.com'un resmi bir API'si yoktur.
    // Başka bir portal (örn. kendi CRM'iniz, resmi partner) ile entegrasyon için buraya implementasyon eklenir.

    if (!this.config.apiKey) {
      throw new Error('API Partner yapılandırılmamış. Lütfen geçerli bir API anahtarı girin.');
    }

    const url = new URL('/listings', this.config.baseUrl);
    if (params.city) url.searchParams.set('city', params.city);
    if (params.district) url.searchParams.set('district', params.district);
    if (params.limit) url.searchParams.set('limit', String(params.limit));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-Partner-Id': this.config.partnerId,
      },
    });

    if (!response.ok) {
      throw new Error(`API Partner error: ${response.status}`);
    }

    const data = await response.json();
    return data.listings as RawListing[];
  }

  async healthCheck() {
    if (!this.config.apiKey) {
      return { ok: false, message: 'API anahtarı eksik' };
    }
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return { ok: response.ok };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }
}