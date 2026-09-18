// AI Conversation Analyzer
// Gelen mesajları kategorize eder ve lead skorunu günceller
// "Emlakçı istemiyorum" → ❌ Kapat
// "Komisyon vermem" → 🟡 Takip
// "Alıcınız varsa getirin" → 🟢 Sıcak
// "Yarın görüşebiliriz" → 🔥 Acil lead

import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { MessageCategory } from '@prisma/client';
import { leadScorer } from './lead-scorer';

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const openai = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export interface ConversationAnalysis {
  category: MessageCategory;
  sentiment: number; // -1 ile 1 arası
  intent: string;
  confidence: number;
  suggestedAction: string;
  shouldNotifyAgent: boolean;
}

export class ConversationAnalyzer {
  /**
   * Kural tabanlı hızlı analiz (AI olmadan da çalışır)
   */
  analyzeRuleBased(message: string): ConversationAnalysis {
    const lower = message.toLowerCase();

    // Reddetme sinyalleri
    if (
      lower.includes('istemiyorum') ||
      lower.includes('ilgilenmiyorum') ||
      lower.includes('rahat etmeyin') ||
      lower.includes('yazmayın') ||
      lower.includes('mesaj atmayın')
    ) {
      return {
        category: MessageCategory.REJECTION,
        sentiment: -0.8,
        intent: 'İletişimi reddetme',
        confidence: 0.9,
        suggestedAction: 'Lead\'i kapat, bir daha mesaj gönderme',
        shouldNotifyAgent: false,
      };
    }

    // Komisyon sinyalleri
    if (
      lower.includes('komisyon') ||
      lower.includes('yüzde') ||
      lower.includes('%') ||
      lower.includes('ücret')
    ) {
      return {
        category: MessageCategory.COMMISSION,
        sentiment: -0.3,
        intent: 'Komisyon koşulu',
        confidence: 0.7,
        suggestedAction: 'Komisyon teklifi ile takip',
        shouldNotifyAgent: false,
      };
    }

    // Randevu sinyalleri
    if (
      lower.includes('yarın') ||
      lower.includes('bugün') ||
      lower.includes('görüş') ||
      lower.includes('gelin') ||
      lower.includes('buluşalım') ||
      lower.includes('müsait')
    ) {
      return {
        category: MessageCategory.APPOINTMENT,
        sentiment: 0.7,
        intent: 'Randevu talebi',
        confidence: 0.85,
        suggestedAction: 'Hemen randevu oluştur ve agent\'a bildir',
        shouldNotifyAgent: true,
      };
    }

    // İlgilenme sinyalleri
    if (
      lower.includes('alıcı') ||
      lower.includes('müşteri') ||
      lower.includes('getirin') ||
      lower.includes('varsa') ||
      lower.includes('düşünelim') ||
      lower.includes('değerlendirelim')
    ) {
      return {
        category: MessageCategory.INTERESTED,
        sentiment: 0.5,
        intent: 'İlgi gösterme',
        confidence: 0.75,
        suggestedAction: 'Detaylı bilgi gönder, takip planla',
        shouldNotifyAgent: true,
      };
    }

    // Fiyat sorusu
    if (
      lower.includes('fiyat') ||
      lower.includes('ne kadar') ||
      lower.includes('kaç') ||
      lower.includes('pazarlık')
    ) {
      return {
        category: MessageCategory.PRICE_INQUIRY,
        sentiment: 0.2,
        intent: 'Fiyat bilgisi',
        confidence: 0.7,
        suggestedAction: 'Fiyat detayı gönder',
        shouldNotifyAgent: false,
      };
    }

    // Bilgi talebi
    if (
      lower.includes('bilgi') ||
      lower.includes('detay') ||
      lower.includes('özellik') ||
      lower.includes('metrekare') ||
      lower.includes('oda')
    ) {
      return {
        category: MessageCategory.INFO_REQUEST,
        sentiment: 0.3,
        intent: 'Bilgi talebi',
        confidence: 0.7,
        suggestedAction: 'İlan detaylarını gönder',
        shouldNotifyAgent: false,
      };
    }

    return {
      category: MessageCategory.OTHER,
      sentiment: 0,
      intent: 'Belirsiz',
      confidence: 0.5,
      suggestedAction: 'Standart takip',
      shouldNotifyAgent: false,
    };
  }

  /**
   * AI destekli analiz
   */
  async analyzeWithAI(message: string, context?: string): Promise<ConversationAnalysis> {
    if (!openai) {
      return this.analyzeRuleBased(message);
    }

    try {
      const prompt = `Sen bir gayrimenkul CRM asistanısın. Bir ilan sahibinden gelen WhatsApp mesajını analiz et.

MESAJ: "${message}"
${context ? `\nBAĞLAM: ${context}` : ''}

GÖREV:
Mesajı aşağıdaki kategorilerden birine sınıfla:
- REJECTION: "Emlakçı istemiyorum", "İlgilenmiyorum" gibi reddetme
- COMMISSION: "Komisyon vermem", "%5 fazla" gibi komisyon koşulu
- INTERESTED: "Alıcınız varsa getirin", "Düşünelim" gibi ilgi
- APPOINTMENT: "Yarın görüşebiliriz", "Gelin bakalım" gibi randevu
- INFO_REQUEST: "Bilgi verir misiniz", "Detay nedir" gibi bilgi talebi
- PRICE_INQUIRY: "Fiyatta pazarlık var mı", "Son fiyat nedir" gibi fiyat sorusu
- OTHER: Diğer

Ayrıca:
- Sentiment (-1 ile 1 arası)
- Intent (kısa açıklama)
- Confidence (0-1 arası)
- SuggestedAction (agent için öneri)
- shouldNotifyAgent (boolean - acil bildirim gerekli mi?)

JSON formatında yanıt ver.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Sen bir mesaj analiz uzmanısın. WhatsApp mesajlarını kategorize edip sentiment analizi yapıyorsun. Yanıtlarını her zaman geçerli JSON formatında ver.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return this.analyzeRuleBased(message);

      const result = JSON.parse(content);

      return {
        category: result.category as MessageCategory,
        sentiment: result.sentiment || 0,
        intent: result.intent || '',
        confidence: result.confidence || 0.7,
        suggestedAction: result.suggestedAction || '',
        shouldNotifyAgent: result.shouldNotifyAgent || false,
      };
    } catch (err) {
      console.error('AI analysis failed:', err);
      return this.analyzeRuleBased(message);
    }
  }

  /**
   * Gelen mesajı analiz et, DB'ye kaydet, lead güncelle
   */
  async processIncomingMessage(messageId: string): Promise<ConversationAnalysis | null> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { lead: { include: { listing: true } } },
    });

    if (!message || message.direction !== 'INBOUND') return null;

    // Analiz yap
    const context = `İlan: ${message.lead.listing.title}, ${message.lead.listing.price} TL`;
    const analysis = await this.analyzeWithAI(message.content, context);

    // Mesajı güncelle
    await prisma.message.update({
      where: { id: messageId },
      data: {
        aiCategory: analysis.category,
        aiSentiment: analysis.sentiment,
        aiIntent: analysis.intent,
        aiConfidence: analysis.confidence,
      },
    });

    // Lead skorunu güncelle
    await leadScorer.updateFromResponse(message.leadId, analysis.category);

    return analysis;
  }
}

export const conversationAnalyzer = new ConversationAnalyzer();