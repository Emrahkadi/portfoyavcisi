// POST /api/extension/generate-ai-message
// İlan eklendikten sonra AI otomatik kişiselleştirilmiş mesaj oluşturur

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyExtensionToken } from '@/lib/extension-auth';
import { messageGenerator } from '@/services/message-generator';
import { aiEvaluator } from '@/services/ai-evaluator';
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

    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: 'listingId gerekli' }, { status: 400 });
    }

    // İlanı bul
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { lead: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 });
    }

    // 1. AI değerlendirmesi yap (henüz yapılmadıysa)
    if (!listing.aiScore) {
      await aiEvaluator.evaluateAndSave(listingId);
    }

    // 2. Agent bilgilerini al
    const agent = await prisma.user.findUnique({
      where: { id: session.userId as string },
    });
    const agentName = agent?.name || 'Emlak Danışmanınız';

    // 3. AI ile kişiselleştirilmiş mesaj oluştur
    const message = await messageGenerator.generateWithAI(listing, agentName);

    // 4. Lead varsa, mesajı lead'e kaydet (henüz gönderme)
    if (listing.lead) {
      await prisma.lead.update({
        where: { id: listing.lead.id },
        data: {
          aiSummary: message,
          aiNextAction: 'Mesajı inceleyip WhatsApp ile gönderin',
        },
      });
    }

    await audit({
      userId: session.userId as string,
      action: 'extension.ai_message_generated',
      entity: 'Listing',
      entityId: listingId,
    });

    return NextResponse.json({
      success: true,
      message,
      listingId,
    });
  } catch (err) {
    console.error('AI message generation error:', err);
    return NextResponse.json({ error: 'Mesaj oluşturulamadı' }, { status: 500 });
  }
}