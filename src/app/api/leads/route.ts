// GET /api/leads - Lead'leri listele
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const temperature = searchParams.get('temperature');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';

    const where: any = {
      organizationId: session.organizationId,
    };
    if (status) where.status = status;
    if (temperature) where.temperature = temperature;
    if (assignedToMe) where.assignedAgentId = session.userId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        listing: true,
        assignedAgent: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true, appointments: true } },
      },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ leads });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}