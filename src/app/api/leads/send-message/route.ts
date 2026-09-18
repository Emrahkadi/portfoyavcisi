// POST /api/leads/send-message - WhatsApp mesajı gönder
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { whatsappService } from '@/services/whatsapp';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { leadId, message } = await req.json();

    if (!leadId || !message) {
      return NextResponse.json({ error: 'leadId ve message gerekli' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead bulunamadı' }, { status: 404 });
    }

    // KVKK kontrolü
    if (!lead.consentGiven && process.env.CONSENT_REQUIRED === 'true') {
      return NextResponse.json(
        { error: 'Bu kişiye mesaj göndermek için önce onay alınmalı' },
        { status: 403 }
      );
    }

    const result = await whatsappService.sendMessage({
      to: lead.contactPhone,
      message,
      leadId,
      userId: session.userId,
    });

    if (result.success) {
      // Lead'in son iletişim zamanını güncelle
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          lastContactAt: new Date(),
          firstContactAt: lead.firstContactAt || new Date(),
          status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
        },
      });

      await audit({
        userId: session.userId,
        action: 'message.sent',
        entity: 'Lead',
        entityId: leadId,
        metadata: { channel: 'WHATSAPP', messageLength: message.length },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 });
  }
}