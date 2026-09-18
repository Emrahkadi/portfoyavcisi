// GET /api/dashboard/summary - Sabah raporu için özet veriler
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bugün eklenen ilanlar
    const todayListings = await prisma.listing.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: today },
      },
    });

    const ownerListings = todayListings.filter((l) => l.isOwner);
    const agentListings = todayListings.filter((l) => !l.isOwner);

    // Yüksek potansiyelli ilanlar (skor >= 70)
    const highPotential = await prisma.listing.findMany({
      where: {
        organizationId: orgId,
        aiScore: { gte: 70 },
        createdAt: { gte: today },
      },
      include: { lead: true },
      orderBy: { aiScore: 'desc' },
    });

    // Sıcak lead'ler
    const hotLeads = await prisma.lead.findMany({
      where: {
        organizationId: orgId,
        temperature: { in: ['HOT', 'URGENT'] },
        status: { notIn: ['OPT_OUT', 'ARCHIVED', 'LOST'] },
      },
      include: { listing: true },
      orderBy: [{ score: 'desc' }],
      take: 10,
    });

    // Son mesajlar
    const recentMessages = await prisma.message.findMany({
      where: {
        lead: { organizationId: orgId },
      },
      include: {
        lead: {
          include: { listing: { select: { title: true, contactName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // İstatistikler
    const stats = {
      totalListings: await prisma.listing.count({ where: { organizationId: orgId } }),
      totalLeads: await prisma.lead.count({ where: { organizationId: orgId } }),
      hotLeads: await prisma.lead.count({
        where: { organizationId: orgId, temperature: { in: ['HOT', 'URGENT'] } },
      }),
      wonLeads: await prisma.lead.count({
        where: { organizationId: orgId, status: 'WON' },
      }),
    };

    return NextResponse.json({
      today: {
        total: todayListings.length,
        owner: ownerListings.length,
        agent: agentListings.length,
        highPotential: highPotential.length,
      },
      highPotentialListings: highPotential,
      hotLeads,
      recentMessages,
      stats,
    });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}