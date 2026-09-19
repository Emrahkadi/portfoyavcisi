// POST /api/extension/whatsapp-auto-send
// İlan eklendikten sonra AI mesajı oluşturup WhatsApp'a otomatik gönder
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyExtensionToken } from '@/lib/extension-auth';
import { messageGenerator } from '@/services/message-generator';
import { whatsappService } from '@/services/whatsapp';
import { aiEvaluator } from '@/services/ai-evaluator';
import { leadScorer } from '@/services/lead-scorer';
import { audit } from '@/lib/audit';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz' }, {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const token = authHeader.substring(7);
    const session = await verifyExtensionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Geçersiz token' }, {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { listingId, sendWhatsApp = true } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: 'listingId gerekli' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // İlanı bul (tüm bilgilerle)
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { lead: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'İlan bulunamadı' }, {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 1. AI değerlendirmesi yap
    if (!listing.aiScore) {
      await aiEvaluator.evaluateAndSave(listingId);
    }

    // 2. Lead yoksa oluştur
    let lead = listing.lead;
    if (!lead && listing.contactPhone) {
      lead = await leadScorer.createLeadFromListing(listingId, session.organizationId as string);
    }

    // 3. Agent bilgilerini al
    const agent = await prisma.user.findUnique({
      where: { id: session.userId as string },
    });
    const agentName = agent?.name || 'Emlak Danışmanınız';

    // 4. AI ile kişiselleştirilmiş mesaj oluştur
    const message = await messageGenerator.generateWithAI(listing, agentName);

    // 5. Mesajı veritabanına kaydet
    let savedMessage;
    if (lead) {
      savedMessage = await prisma.message.create({
        data: {
          content: message,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          status: sendWhatsApp && whatsappService.isEnabled() ? 'SENT' : 'DRAFT',
          aiGenerated: true,
          aiCategory: 'FIRST_CONTACT',
          leadId: lead.id,
          userId: session.userId as string,
          sentAt: sendWhatsApp && whatsappService.isEnabled() ? new Date() : null,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          aiSummary: message,
          status: sendWhatsApp && whatsappService.isEnabled() ? 'CONTACTED' : 'NEW',
          contactedAt: sendWhatsApp && whatsappService.isEnabled() ? new Date() : lead.contactedAt,
        },
      });
    }

    // 6. WhatsApp'a gönder (eğer aktifse ve telefon varsa)
    let whatsappResult = null;
    if (sendWhatsApp && listing.contactPhone && whatsappService.isEnabled()) {
      whatsappResult = await whatsappService.sendMessage({
        to: listing.contactPhone,
        message,
        leadId: lead?.id || '',
        userId: session.userId as string,
      });

      if (whatsappResult.success && savedMessage) {
        await prisma.message.update({
          where: { id: savedMessage.id },
          data: {
            externalId: whatsappResult.messageId,
            status: 'SENT',
          },
        });
      }
    }

    await audit({
      userId: session.userId as string,
      action: 'whatsapp.auto_send',
      entity: 'Listing',
      entityId: listingId,
      metadata: {
        sent: !!whatsappResult?.success,
        whatsappEnabled: whatsappService.isEnabled(),
        hasPhone: !!listing.contactPhone,
      },
    });

    return NextResponse.json({
      success: true,
      message,
      messageId: savedMessage?.id,
      whatsapp: {
        enabled: whatsappService.isEnabled(),
        sent: !!whatsappResult?.success,
        error: whatsappResult?.error,
      },
      lead: lead ? {
        id: lead.id,
        status: lead.status,
        score: lead.score,
      } : null,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('WhatsApp auto-send error:', err);
    return NextResponse.json({
      error: 'Sunucu hatası: ' + (err as Error).message,
    }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
