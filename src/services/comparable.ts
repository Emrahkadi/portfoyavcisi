// Emsal Motoru - Bölge medyanı, fiyat karşılaştırma, fırsat tespiti
// Bu servis ilanların bölge ortalamasına göre ne kadar fırsat olduğunu hesaplar

import { prisma } from '@/lib/db';
import type { Listing } from '@prisma/client';

export interface ComparableAnalysis {
  medianPricePerSqm: number;
  avgPricePerSqm: number;
  pricePerSqm: number;
  diffFromMedian: number; // Yüzde olarak
  diffFromAvg: number;
  opportunityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'OVERPRICED';
  sampleSize: number;
  recommendation: string;
}

export class ComparableEngine {
  /**
   * Bölge emsal istatistiklerini hesapla
   * Tüm aktif ilanlardan medyan, ortalama, min, max hesaplanır
   */
  async computeDistrictStats(city: string, district: string, neighborhood?: string) {
    const where: any = {
      city,
      district,
      pricePerSqm: { gt: 0 },
      sizeSqm: { gt: 0 },
    };
    if (neighborhood) where.neighborhood = neighborhood;

    const listings = await prisma.listing.findMany({
      where,
      select: { pricePerSqm: true },
    });

    if (listings.length === 0) {
      return null;
    }

    const prices = listings.map((l) => l.pricePerSqm).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);

    const stats = {
      medianPricePerSqm: this.median(prices),
      avgPricePerSqm: sum / prices.length,
      minPricePerSqm: prices[0],
      maxPricePerSqm: prices[prices.length - 1],
      sampleSize: prices.length,
    };

    // District tablosunu güncelle
    await prisma.district.upsert({
      where: {
        city_district_neighborhood: {
          city,
          district,
          neighborhood: neighborhood || '',
        },
      },
      update: {
        ...stats,
        lastComputedAt: new Date(),
      },
      create: {
        city,
        district,
        neighborhood: neighborhood || '',
        ...stats,
        lastComputedAt: new Date(),
      },
    });

    return stats;
  }

  /**
   * Bir ilanı bölge emsalleriyle karşılaştır
   */
  async analyze(listing: Listing): Promise<ComparableAnalysis | null> {
    // Önce stats'ı güncelle
    await this.computeDistrictStats(listing.city, listing.district, listing.neighborhood || undefined);

    const district = await prisma.district.findFirst({
      where: {
        city: listing.city,
        district: listing.district,
        neighborhood: listing.neighborhood || '',
      },
    });

    if (!district || !district.medianPricePerSqm) {
      return null;
    }

    const diffFromMedian = ((listing.pricePerSqm - district.medianPricePerSqm) / district.medianPricePerSqm) * 100;
    const diffFromAvg = ((listing.pricePerSqm - district.avgPricePerSqm!) / district.avgPricePerSqm!) * 100;

    let opportunityLevel: ComparableAnalysis['opportunityLevel'];
    let recommendation: string;

    if (diffFromMedian <= -10) {
      opportunityLevel = 'HIGH';
      recommendation = 'Bölge ortalamasından önemli ölçüde düşük. Yüksek fırsat.';
    } else if (diffFromMedian <= -5) {
      opportunityLevel = 'MEDIUM';
      recommendation = 'Bölge ortalamasının biraz altında. İyi fırsat.';
    } else if (diffFromMedian <= 5) {
      opportunityLevel = 'LOW';
      recommendation = 'Bölge ortalamasına yakın. Standart fiyat.';
    } else {
      opportunityLevel = 'OVERPRICED';
      recommendation = 'Bölge ortalamasının üstünde. Fiyat yüksek.';
    }

    return {
      medianPricePerSqm: district.medianPricePerSqm,
      avgPricePerSqm: district.avgPricePerSqm!,
      pricePerSqm: listing.pricePerSqm,
      diffFromMedian,
      diffFromAvg,
      opportunityLevel,
      sampleSize: district.sampleSize,
      recommendation,
    };
  }

  /**
   * Tüm ilanları toplu analiz et
   */
  async analyzeAll(): Promise<number> {
    const listings = await prisma.listing.findMany({
      where: { aiScore: null },
      take: 100,
    });

    let count = 0;
    for (const listing of listings) {
      await this.analyze(listing);
      count++;
    }
    return count;
  }

  private median(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 === 0
      ? (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2
      : sortedNumbers[mid];
  }
}

export const comparableEngine = new ComparableEngine();