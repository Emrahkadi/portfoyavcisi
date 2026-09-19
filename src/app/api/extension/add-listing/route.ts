// POST /api/extension/add-listing - Extension'dan ilan ekleme
// Token-based auth kullanır (cookie değil)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyExtensionToken } from '@/lib/extension-auth';
import { aiEvaluator } from '@/services/ai-evaluator';
import { leadScorer } from '@/services/lead-scorer';
import { audit } from '@/lib/audit';

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    // Token'ı header'dan al
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401, headers: corsHeaders() });
    }

    const token = authHeader.substring(7);
    const session = await verifyExtensionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const {
      externalId,
      url,
      title,
      price,
      sizeSqm,
      rooms,
      city,
      district,
      neighborhood,
      isOwner,
      contactName,
      contactPhone,
      daysOnMarket = 0,
    } = body;

    // Validasyon
    const missing = [];
    if (!externalId) missing.push('externalId');
    if (!title) missing.push('title');
    if (!price || price <= 0) missing.push('price');
    if (!sizeSqm || sizeSqm <= 0) missing.push('sizeSqm');

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Eksik bilgi: ${missing.join(', ')}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    // pricePerSqm hesapla
    const pricePerSqm = sizeSqm > 0 ? price / sizeSqm : 0;

    // İlanı oluştur veya güncelle
    const listing = await prisma.listing.upsert({
      where: {
        source_externalId: {
          source: 'MANUAL',
          externalId,
        },
      },
      update: {
        title,
        price,
        pricePerSqm,
        sizeSqm,
        rooms,
        city,
        district,
        neighborhood,
        isOwner: isOwner ?? true,
        contactName,
        contactPhone,
        daysOnMarket,
        url,
      },
      create: {
        externalId,
        source: 'MANUAL',
        url,
        title,
        price,
        pricePerSqm,
        sizeSqm,
        rooms,
        city,
        district,
        neighborhood,
        isOwner: isOwner ?? true,
        contactName,
        contactPhone,
        daysOnMarket,
        propertyType: 'APARTMENT',
        organizationId: session.organizationId as string,
      },
    });

    // AI değerlendirmesi yap (async, response'u bloklamaz)
    aiEvaluator.evaluateAndSave(listing.id).then(async (evaluation) => {
      if (evaluation && listing.contactPhone) {
        await leadScorer.createLeadFromListing(listing.id, session.organizationId as string);
      }
    });

    await audit({
      userId: session.userId as string,
      action: 'extension.listing_added',
      entity: 'Listing',
      entityId: listing.id,
      metadata: { source: 'extension', externalId },
    });

    return NextResponse.json({
      success: true,
      listing: {
        id: listing.id,
        title: listing.title,
        aiScore: listing.aiScore,
      },
    }, { headers: corsHeaders() });
  } catch (err) {
    console.error('Extension add-listing error:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500, headers: corsHeaders() });
  }
}