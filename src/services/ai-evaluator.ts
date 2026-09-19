// AI Evaluator - İlan potansiyel skoru
// OpenAI uyumlu API kullanarak ilanın "kazanılabilirlik" potansiyelini değerlendirir

import OpenAI from 'openai';
import type { Listing } from '@prisma/client';
import { prisma } from '@/lib/db';
import { comparableEngine } from './comparable';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const openai = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export interface AIEvaluation {
  score: number; // 0-100
  reasons: string[];
  summary: string;
  nextAction: string;
  confidence: number;
}

export class AIEvaluator {
  /**
   * Kural-tabanlı hızlı değerlendirme (AI API'si olmadan da çalışır)
   */
  evaluateRuleBased(listing: Listing): AIEvaluation {
    const reasons: string[] = [];
    let score = 50; // Başlangıç skoru

    // 1. Sahibinden mi? (en önemli sinyal)
    if (listing.isOwner) {
      score += 20;
      reasons.push('İlan sahibinden, emlakçı komisyonu yok');
    } else {
      score -= 10;
      reasons.push('Emlakçı ilanı, komisyon beklentisi var');
    }

    // 2. Piyasa süresi
    if (listing.daysOnMarket > 60) {
      score += 15;
      reasons.push(`${listing.daysOnMarket} gündür yayında (çok uzun, motivasyon yüksek)`);
    } else if (listing.daysOnMarket > 30) {
      score += 10;
      reasons.push(`${listing.daysOnMarket} gündür yayında (uzun, motivasyon artmış olabilir)`);
    } else if (listing.daysOnMarket < 7) {
      score -= 5;
      reasons.push('Yeni ilan, henüz erken aşama');
    }

    // 3. Fiyat geçmişi (kaç kez düşürülmüş)
    const priceHistory = (listing.priceHistory as Array<{ date: string; price: number }>) || [];
    if (priceHistory.length >= 3) {
      score += 15;
      reasons.push(`Fiyat ${priceHistory.length} kez düşürülmüş`);
    } else if (priceHistory.length >= 2) {
      score += 10;
      reasons.push(`Fiyat ${priceHistory.length} kez düşürülmüş`);
    }

    // 4. Fiyat düşüş yüzdesi
    if (priceHistory.length >= 2) {
      const firstPrice = priceHistory[0].price;
      const lastPrice = priceHistory[priceHistory.length - 1].price;
      const dropPercent = ((firstPrice - lastPrice) / firstPrice) * 100;
      if (dropPercent > 15) {
        score += 10;
        reasons.push(`Toplam fiyat düşüşü: %${dropPercent.toFixed(1)}`);
      } else if (dropPercent > 5) {
        score += 5;
        reasons.push(`Fiyat düşüşü: %${dropPercent.toFixed(1)}`);
      }
    }

    // 5. Emsal karşılaştırma (varsa)
    // Bu kısım comparable engine tarafından async olarak eklenebilir

    // 6. Görüntülenme sayısı (yüksekse ilgi var ama satılmıyor)
    if (listing.viewCount > 500 && listing.daysOnMarket > 30) {
      score += 5;
      reasons.push(`${listing.viewCount} görüntülenme ama henüz satılmamış`);
    }

    // Skoru 0-100 aralığında tut
    score = Math.max(0, Math.min(100, score));

    const nextAction =
      score >= 80
        ? 'Acil iletişime geç - yüksek motivasyon'
        : score >= 60
        ? 'Takip listesine ekle, 24 saat içinde iletişim'
        : score >= 40
        ? 'Standart takip'
        : 'Düşük öncelik';

    return {
      score,
      reasons,
      summary: reasons.join('. '),
      nextAction,
      confidence: 0.7, // Kural tabanlı için orta güven
    };
  }

  /**
   * AI destekli değerlendirme (OpenAI API kullanır)
   * Kural tabanlı sonucu zenginleştirir
   */
  async evaluateWithAI(listing: Listing, ruleBased: AIEvaluation): Promise<AIEvaluation> {
    if (!openai) {
      return ruleBased;
    }

    try {
      const prompt = `Sen bir gayrimenkul portföy kazanım uzmanısın. Aşağıdaki ilanı analiz et ve "satıcıyı portföyümüze kazanma" potansiyelini değerlendir.

İLAN BİLGİLERİ:
- Başlık: ${listing.title}
- Tip: ${listing.propertyType}
- Oda: ${listing.rooms || 'Belirtilmemiş'}
- m²: ${listing.sizeSqm}
- Fiyat: ${listing.price.toLocaleString('tr-TR')} TL
- m² fiyatı: ${(listing.pricePerSqm || 0).toLocaleString('tr-TR')} TL
- Konum: ${listing.city}/${listing.district}/${listing.neighborhood || ''}
- Sahibinden mi: ${listing.isOwner ? 'Evet' : 'Hayır (emlakçı)'}
- Piyasa süresi: ${listing.daysOnMarket} gün
- Fiyat geçmişi: ${JSON.stringify(listing.priceHistory)}
- Görüntülenme: ${listing.viewCount}

KURAL TABANLI ÖN DEĞERLENDİRME:
- Skor: ${ruleBased.score}/100
- Tespit edilen sinyaller: ${ruleBased.reasons.join('; ')}

GÖREV:
1. Bu ilanın "satıcıyı kazanma" potansiyelini 0-100 arası puanla
2. En önemli 3-5 nedeni madde madde yaz
3. Satıcıyla iletişim stratejisi öner (1-2 cümle)
4. Güven seviyeni 0-1 arası belirt

JSON formatında yanıt ver:
{
  "score": <0-100>,
  "reasons": ["neden1", "neden2", ...],
  "strategy": "<iletişim stratejisi>",
  "confidence": <0-1>
}`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Sen bir gayrimenkul CRM uzmanısın. Verilen ilanları analiz edip portföy kazanım potansiyelini değerlendiriyorsun. Yanıtlarını her zaman geçerli JSON formatında ver.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return ruleBased;

      const aiResult = JSON.parse(content);

      // Kural tabanlı + AI sonucunu birleştir (ağırlıklı ortalama)
      const finalScore = Math.round(ruleBased.score * 0.4 + aiResult.score * 0.6);

      return {
        score: finalScore,
        reasons: aiResult.reasons || ruleBased.reasons,
        summary: aiResult.strategy || ruleBased.summary,
        nextAction:
          finalScore >= 80
            ? 'Acil iletişime geç'
            : finalScore >= 60
            ? '24 saat içinde iletişim'
            : 'Standart takip',
        confidence: aiResult.confidence || 0.8,
      };
    } catch (err) {
      console.error('AI evaluation failed, falling back to rule-based:', err);
      return ruleBased;
    }
  }

  /**
   * İlanı değerlendir ve DB'ye kaydet
   */
  async evaluateAndSave(listingId: string): Promise<AIEvaluation | null> {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return null;

    // 1. Emsal analizi
    const comparable = await comparableEngine.analyze(listing);

    // 2. Kural tabanlı değerlendirme
    const ruleBased = this.evaluateRuleBased(listing);

    // 3. Emsal bilgisini skora ekle
    if (comparable) {
      if (comparable.opportunityLevel === 'HIGH') {
        ruleBased.score += 10;
        ruleBased.reasons.push(
          `Bölge medyanından %${Math.abs(comparable.diffFromMedian).toFixed(1)} düşük`
        );
      } else if (comparable.opportunityLevel === 'OVERPRICED') {
        ruleBased.score -= 10;
        ruleBased.reasons.push(
          `Bölge medyanından %${comparable.diffFromMedian.toFixed(1)} yüksek`
        );
      }
    }

    // 4. AI ile zenginleştir
    const final = await this.evaluateWithAI(listing, ruleBased);

    // 5. DB'ye kaydet
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        aiScore: final.score,
        aiReasons: final.reasons,
        aiAnalysis: {
          summary: final.summary,
          nextAction: final.nextAction,
          confidence: final.confidence,
          comparable: comparable || null,
          evaluatedAt: new Date().toISOString(),
        } as any,
        aiEvaluatedAt: new Date(),
      },
    });

    return final;
  }
}

export const aiEvaluator = new AIEvaluator();