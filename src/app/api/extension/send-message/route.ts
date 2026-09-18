// POST /api/extension/send-message - Extension'dan WhatsApp mesajı gönder
// Hazır şablonları kişiye özel değişkenlerle doldurur

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyExtensionToken } from '@/lib/extension-auth';
import { whatsappService } from '@/services/whatsapp';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await verifyExtensionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });
    }

    const { leadId, template } = await req.json();

    if (!leadId || !template) {
      return NextResponse.json({ error: 'leadId ve template gerekli' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { listing: true },
    });

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

    // Şablondaki değişkenleri değiştir
    const message = fillTemplate(template, {
      isim: lead.contactName || 'Sayın',
      ilan_basligi: lead.listing.title,
      ilan_fiyat: lead.listing.price.toLocaleString('tr-TR'),
      ilan_url: lead.listing.url || '',
      agent_name: session.email as string,
    });

    // WhatsApp ile gönder
    const result = await whatsappService.sendMessage({
      to: lead.contactPhone,
      message,
      leadId,
      userId: session.userId as string,
    });

    if (result.success) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          lastContactAt: new Date(),
          firstContactAt: lead.firstContactAt || new Date(),
          status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
        },
      });

      await audit({
        userId: session.userId as string,
        action: 'extension.message_sent',
        entity: 'Lead',
        entityId: leadId,
        metadata: { channel: 'WHATSAPP', template: template.substring(0, 50) },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Extension send-message error:', err);
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 });
  }
}

// Şablon değişkenlerini doldur
function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}