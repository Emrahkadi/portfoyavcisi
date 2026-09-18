// Lead Scoring Service
// İlan değerlendirme skorunu lead skoruna dönüştürür
// Sıcaklık (temperature) ve öncelik (priority) atar

import { prisma } from '@/lib/db';
import { LeadTemp, LeadStatus } from '@prisma/client';

export class LeadScorer {
  /**
   * Yeni ilan için lead oluştur ve skorla
   */
  async createLeadFromListing(listingId: string, organizationId?: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { lead: true },
    });

    if (!listing) throw new Error('Listing not found');
    if (listing.lead) return listing.lead; // Zaten var
    if (!listing.contactPhone) throw new Error('Listing has no contact phone');

    const score = Math.round(listing.aiScore || 0);
    const temperature = this.scoreToTemperature(score);
    const priority = this.scoreToPriority(score);
    const status = this.scoreToStatus(score);

    const lead = await prisma.lead.create({
      data: {
        listingId,
        contactPhone: listing.contactPhone,
        contactName: listing.contactName,
        organizationId: organizationId || listing.organizationId,
        score,
        temperature,
        priority,
        status,
        aiSummary: (listing.aiAnalysis as any)?.summary || listing.aiReasons?.join('. '),
        aiNextAction: (listing.aiAnalysis as any)?.nextAction,
      },
    });

    return lead;
  }

  /**
   * Skor -> Sıcaklık dönüşümü
   */
  private scoreToTemperature(score: number): LeadTemp {
    if (score >= 85) return LeadTemp.URGENT; // 🔥
    if (score >= 70) return LeadTemp.HOT; // 🟢
    if (score >= 50) return LeadTemp.WARM; // 🟡
    return LeadTemp.COLD; // ❌
  }

  /**
   * Skor -> Öncelik (1-5)
   */
  private scoreToPriority(score: number): number {
    if (score >= 85) return 5;
    if (score >= 70) return 4;
    if (score >= 50) return 3;
    if (score >= 30) return 2;
    return 1;
  }

  /**
   * Skor -> Başlangıç durumu
   */
  private scoreToStatus(score: number): LeadStatus {
    if (score >= 70) return LeadStatus.NEW; // Hemen iletişime geçilecek
    return LeadStatus.NEW;
  }

  /**
   * Gelen mesaja göre lead skorunu güncelle
   */
  async updateFromResponse(
    leadId: string,
    category: 'REJECTION' | 'COMMISSION' | 'INTERESTED' | 'APPOINTMENT' | 'INFO_REQUEST' | 'PRICE_INQUIRY' | 'OTHER'
  ) {
    const updates: Record<string, any> = {};

    switch (category) {
      case 'APPOINTMENT':
        updates.status = LeadStatus.APPOINTMENT_SET;
        updates.temperature = LeadTemp.URGENT;
        updates.score = { increment: 30 };
        break;
      case 'INTERESTED':
        updates.status = LeadStatus.ENGAGED;
        updates.temperature = LeadTemp.HOT;
        updates.score = { increment: 20 };
        break;
      case 'INFO_REQUEST':
      case 'PRICE_INQUIRY':
        updates.status = LeadStatus.ENGAGED;
        updates.temperature = LeadTemp.WARM;
        updates.score = { increment: 10 };
        break;
      case 'COMMISSION':
        updates.status = LeadStatus.CONTACTED;
        updates.temperature = LeadTemp.WARM;
        updates.score = { increment: 5 };
        break;
      case 'REJECTION':
        updates.status = LeadStatus.OPT_OUT;
        updates.temperature = LeadTemp.COLD;
        updates.optOutDate = new Date();
        break;
    }

    updates.lastContactAt = new Date();

    return prisma.lead.update({
      where: { id: leadId },
      data: updates,
    });
  }

  /**
   * Sıcak lead'leri getir (agent'a gönderilecek)
   */
  async getHotLeads(organizationId?: string) {
    return prisma.lead.findMany({
      where: {
        OR: [{ temperature: LeadTemp.HOT }, { temperature: LeadTemp.URGENT }],
        status: { notIn: [LeadStatus.OPT_OUT, LeadStatus.ARCHIVED, LeadStatus.LOST] },
        ...(organizationId ? { organizationId } : {}),
      },
      include: { listing: true },
      orderBy: [{ temperature: 'desc' }, { score: 'desc' }],
    });
  }
}

export const leadScorer = new LeadScorer();