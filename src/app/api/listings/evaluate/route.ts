// POST /api/listings/evaluate - İlanı AI ile değerlendir
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { aiEvaluator } from '@/services/ai-evaluator';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: 'listingId gerekli' }, { status: 400 });
    }

    const evaluation = await aiEvaluator.evaluateAndSave(listingId);

    await audit({
      userId: session.userId,
      action: 'listing.evaluated',
      entity: 'Listing',
      entityId: listingId,
      metadata: { score: evaluation?.score },
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Değerlendirme başarısız' }, { status: 500 });
  }
}