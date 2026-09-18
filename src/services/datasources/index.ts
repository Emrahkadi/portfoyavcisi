// Data Source Registry - Tüm adapter'ları yönet
// Yeni bir kaynak eklemek için sadece buraya register et

import type { DataSourceAdapter } from './types';
import { ManualDataSource } from './manual';
import { CsvDataSource } from './csv';
import { ApiPartnerDataSource } from './api-partner';
import { ListingSource } from '@prisma/client';

class DataSourceRegistry {
  private adapters = new Map<ListingSource, DataSourceAdapter>();

  register(adapter: DataSourceAdapter) {
    this.adapters.set(adapter.source, adapter);
  }

  get(source: ListingSource): DataSourceAdapter | undefined {
    return this.adapters.get(source);
  }

  list(): DataSourceAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const dataSourceRegistry = new DataSourceRegistry();

// Default adapter'ları register et
dataSourceRegistry.register(new ManualDataSource());
dataSourceRegistry.register(new CsvDataSource());
// API Partner sadece config varsa register edilir
if (process.env.PARTNER_API_URL && process.env.PARTNER_API_KEY) {
  dataSourceRegistry.register(
    new ApiPartnerDataSource({
      baseUrl: process.env.PARTNER_API_URL,
      apiKey: process.env.PARTNER_API_KEY,
      partnerId: process.env.PARTNER_ID || '',
    })
  );
}

export type { DataSourceAdapter, RawListing, FetchParams } from './types';