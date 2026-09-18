// Manuel data source - Kullanıcı kendi ilanlarını ekler
// En güvenli ve ToS-uyumlu yöntem

import type { DataSourceAdapter, FetchParams, RawListing } from './types';
import { ListingSource } from '@prisma/client';

export class ManualDataSource implements DataSourceAdapter {
  readonly name = 'Manual Entry';
  readonly source = ListingSource.MANUAL;
  readonly complianceNote = 'Kullanıcının kendi eklediği ilanlar. ToS uyumlu.';

  // Bu adapter veriyi DB'den okur, dış kaynakla iletişim kurmaz
  async fetchListings(_params: FetchParams): Promise<RawListing[]> {
    // Manuel eklenen ilanlar zaten DB'de. Bu metod sadece interface uyumluluğu için.
    // Asıl veri prisma üzerinden çekilir.
    return [];
  }

  async healthCheck() {
    return { ok: true, message: 'Manuel veri kaynağı her zaman kullanılabilir' };
  }
}