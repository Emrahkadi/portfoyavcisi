// GET /api/listings - Tüm ilanları listele (filtreleme ile)
// POST /api/listings - Yeni ilan ekle
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { listingSchema } from '@/lib/validations';
import { aiEvaluator } from '@/services/ai-evaluator';
import { leadScorer } from '@/services/lead-scorer';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const city = searchParams.get('city');
    const district = searchParams.get('district');
    const minScore = searchParams.get('minScore');
    const isOwner = searchParams.get('isOwner');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      organizationId: session.organizationId,
    };
    if (city) where.city = city;
    if (district) where.district = district;
    if (minScore) where.aiScore = { gte: parseFloat(minScore) };
    if (isOwner !== null) where.isOwner = isOwner === 'true';
    if (source) where.source = source;

    const listings = await prisma.listing.findMany({
      where,
      include: { lead: true, districtRef: true },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({ listings });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = listingSchema.parse(body);

    // pricePerSqm hesapla
    const pricePerSqm = data.sizeSqm > 0 ? data.price / data.sizeSqm : 0;

    const listing = await prisma.listing.create({
      data: {
        ...data,
        pricePerSqm,
        organizationId: session.organizationId,
      },
    });

    // AI değerlendirmesi yap (async, response'u bloklamaz)
    aiEvaluator.evaluateAndSave(listing.id).then(async (evaluation) => {
      if (evaluation && listing.contactPhone) {
        // Lead oluştur
        await leadScorer.createLeadFromListing(listing.id, session.organizationId);
      }
    });

    await audit({
      userId: session.userId,
      action: 'listing.created',
      entity: 'Listing',
      entityId: listing.id,
      metadata: { source: data.source, city: data.city, district: data.district },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
  }
}