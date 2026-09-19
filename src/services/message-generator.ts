// AI Message Generator
// Her ilana özel, kişiselleştirilmiş ilk temas mesajı oluşturur
// İlan sahibinin ismini, bölgeyi, fiyat geçmişini kullanır

import OpenAI from 'openai';
import type { Listing } from '@prisma/client';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const openai = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export class MessageGenerator {
  /**
   * Kural tabanlı mesaj oluştur (AI olmadan da çalışır)
   * İlan sahibinin ismini, bölgeyi, fiyat geçmişini kullanır
   */
  generateRuleBased(listing: Listing, agentName: string = 'Emlak Danışmanınız'): string {
    const priceHistory = (listing.priceHistory as Array<{ date: string; price: number }>) || [];
    const priceDrop = priceHistory.length >= 2
      ? priceHistory[0].price - priceHistory[priceHistory.length - 1].price
      : 0;

    const ownerName = listing.contactName || 'Sayın';
    const location = `${listing.district}${listing.neighborhood ? ' ' + listing.neighborhood : ''} mahallesi`;
    const rawData = (listing as any).rawData || {};
    const allFeatures: string[] = rawData.allFeatures || [];
    const description: string = (listing as any).description || '';

    // Özelliklerden vurgulanacakları seç
    const heating = allFeatures.find((f: string) => f.includes('Isınma'))?.replace(/^[^:]*:/, '').trim() || '';
    const buildingAge = allFeatures.find((f: string) => f.includes('Bina Yaşı'))?.replace(/^[^:]*:/, '').trim() || '';
    const floorInfo = allFeatures.find((f: string) => f.includes('Kat '))?.replace(/^[^:]*:/, '').trim() || '';
    const bathrooms = allFeatures.find((f: string) => f.includes('Banyo'))?.replace(/^[^:]*:/, '').trim() || '';

    let opener = `Merhaba ${ownerName},`;

    // Fiyat düşüşü varsa vurgula
    if (priceDrop > 0) {
      opener += ` ${location} bölgesindeki ilanınızın fiyat güncellemelerini takip ediyorum.`;
    } else if (listing.daysOnMarket > 30) {
      opener += ` ${location} bölgesindeki ilanınız ${listing.daysOnMarket} gündür yayında, ben de bu bölgede aktif çalışıyorum.`;
    } else {
      opener += ` ${location} bölgesindeki ilanınız ilgimi çekti.`;
    }

    let body = '';
    if (priceDrop > 0) {
      body += `İlanınızın fiyatında ${priceDrop.toLocaleString('tr-TR')} TL güncelleme yapıldığını görüyorum. `;
    }

    body += `Bu bölgede aktif alıcı portföyümüz bulunuyor. `;
    if (buildingAge && parseInt(buildingAge) > 5) {
      body += `Bölgedeki ${buildingAge} yaş üstü daireler için özellikle talep var. `;
    }
    body += `Size herhangi bir komisyon yükü getirmeden, sadece uygun alıcılarla buluşmanızı sağlayabiliriz. `;
    body += `5 dakikalık bir telefon görüşmesi için müsait misiniz?`;

    return `${opener}\n\n${body}\n\n${agentName}`;
  }

  /**
   * AI destekli kişiselleştirilmiş mesaj
   * İlan sahibinin ismini, bölgeyi, fiyat geçmişini, AI analizini kullanır
   */
  async generateWithAI(listing: Listing, agentName: string = 'Emlak Danışmanınız'): Promise<string> {
    if (!openai) {
      return this.generateRuleBased(listing, agentName);
    }

    try {
      const priceHistory = (listing.priceHistory as Array<{ date: string; price: number }>) || [];
      const priceDrop = priceHistory.length >= 2
        ? priceHistory[0].price - priceHistory[priceHistory.length - 1].price
        : 0;

      const analysis = listing.aiAnalysis as any;
      const comparable = analysis?.comparable;
      const rawData = (listing as any).rawData || {};
      const description = (listing as any).description || '';
      const allFeatures: string[] = rawData.allFeatures || [];
      const photoCount = (rawData.photos || []).length;

      const prompt = `Sen bir gayrimenkul danışmanısın. Aşağıdaki ilan sahibine WhatsApp üzerinden ilk temas mesajı yazacaksın.

İLAN BİLGİLERİ:
- İlan Sahibi: ${listing.contactName || 'Belirtilmemiş'}
- İlan Başlığı: ${listing.title}
- Konum: ${listing.district}/${listing.neighborhood || ''}
- Fiyat: ${listing.price.toLocaleString('tr-TR')} TL
- m²: ${listing.sizeSqm}
- m² Fiyatı: ${(listing.pricePerSqm || 0).toLocaleString('tr-TR')} TL
- Oda: ${listing.rooms || 'Belirtilmemiş'}
- Kat: ${(listing as any).floor ? `${(listing as any).floor}. kat` : 'Belirtilmemiş'}
- Bina Yaşı: ${(listing as any).buildingAge ? (listing as any).buildingAge + ' yıl' : 'Belirtilmemiş'}
- Isınma: ${(listing as any).heatingType || 'Belirtilmemiş'}
- Banyo: ${rawData.bathroomCount || 'Belirtilmemiş'}
- Balkon: ${rawData.balcony ? 'Var' : 'Yok/Belirtilmemiş'}
- Eşyalı: ${listing.furnished ? 'Evet' : 'Hayır'}
- Otopark: ${rawData.parking ? 'Var' : 'Yok'}
- Asansör: ${rawData.elevator ? 'Var' : 'Yok'}
- Site içi: ${rawData.inComplex ? 'Evet' : 'Hayır'}
- Fotoğraf Sayısı: ${photoCount}
- Piyasa süresi: ${listing.daysOnMarket} gün
- Fiyat geçmişi: ${JSON.stringify(listing.priceHistory)}
- Fiyat düşüşü: ${priceDrop > 0 ? priceDrop.toLocaleString('tr-TR') + ' TL' : 'Yok'}
- Sahibinden mi: ${listing.isOwner ? 'Evet' : 'Hayır (emlakçı)'}
- AI Skoru: ${listing.aiScore || 'Henüz hesaplanmadı'}/100
- AI Nedenler: ${(listing.aiReasons || []).join('; ')}
${comparable ? `- Bölge Medyanı: ${comparable.medianPricePerSqm?.toLocaleString('tr-TR')} TL/m²
- Fark: %${comparable.diffFromMedian?.toFixed(1)}` : ''}

İLAN AÇIKLAMASI:
${description ? description.substring(0, 500) : 'Açıklama belirtilmemiş'}

İLAN ÖZELLİKLERİ:
${allFeatures.length > 0 ? allFeatures.join(', ') : 'Belirtilmemiş'}

KURALLAR:
1. Mesaj kısa olsun (max 4-5 cümle, 3 paragraf)
2. İlan sahibinin ismini kullan (varsa)
3. Bölgeyi spesifik belirt (örn: "Pendik Yenişehir bölgesinde")
4. İlanın öne çıkan özelliğini vurgula (bina yaşı, kat, ısınma, vb.)
5. Fiyat düşüşü varsa nazikçe değin
6. Piyasa süresi uzunsa değer öner
7. "Emlakçıyım" gibi doğrudan ifadelerden kaçın, "danışman" veya "uzman" de
8. Değer öner: "Bölgede aktif alıcı portföyümüz var"
9. Komisyon konusuna değinme (henüz erken)
10. Nazik, profesyonel Türkçe
11. Emoji KULLANMA
12. Sonunda nazikçe telefon/randevu talep et
13. İmza: "${agentName}"

Sadece mesaj metnini yaz, başka açıklama ekleme.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Sen profesyonel bir gayrimenkul danışmanısın. Müşterilerine nazik, kişiselleştirilmiş ve değer odaklı mesajlar yazarsın. İlan sahibinin ismini, bölgesini ve ilan detaylarını kullanarak samimi ama profesyonel mesajlar oluşturursun.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || this.generateRuleBased(listing, agentName);
    } catch (err) {
      console.error('AI message generation failed:', err);
      return this.generateRuleBased(listing, agentName);
    }
  }
}

export const messageGenerator = new MessageGenerator();