// POST /api/leads/generate-message - Bir lead için AI mesajı oluştur
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { messageGenerator } from '@/services/message-generator';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { leadId } = await req.json();

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { listing: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead bulunamadı' }, { status: 404 });
    }

    const agent = await prisma.user.findUnique({ where: { id: session.userId } });
    const agentName = agent?.name || 'Emlak Danışmanınız';

    const message = await messageGenerator.generateWithAI(lead.listing, agentName);

    await audit({
      userId: session.userId,
      action: 'lead.message_generated',
      entity: 'Lead',
      entityId: leadId,
    });

    return NextResponse.json({ message });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Mesaj oluşturulamadı' }, { status: 500 });
  }
}