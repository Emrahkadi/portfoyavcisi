// GET /api/listings/[id] - İlan detayı
// PUT /api/listings/[id] - İlan güncelle
// DELETE /api/listings/[id] - İlan sil

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: { lead: true, districtRef: true },
    });

    if (!listing || listing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Mevcut ilanı kontrol et
    const existing = await prisma.listing.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    // pricePerSqm yeniden hesapla
    if (body.price && body.sizeSqm) {
      body.pricePerSqm = body.price / body.sizeSqm;
    }

    const listing = await prisma.listing.update({
      where: { id: params.id },
      data: body,
    });

    await audit({
      userId: session.userId,
      action: 'listing.updated',
      entity: 'Listing',
      entityId: listing.id,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ listing });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const existing = await prisma.listing.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    // Önce lead'i sil (varsa)
    await prisma.lead.deleteMany({
      where: { listingId: params.id },
    });

    // Sonra ilanı sil
    await prisma.listing.delete({
      where: { id: params.id },
    });

    await audit({
      userId: session.userId,
      action: 'listing.deleted',
      entity: 'Listing',
      entityId: params.id,
      metadata: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}