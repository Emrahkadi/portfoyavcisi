// GET /api/leads/[id] - Lead detayı
// PUT /api/leads/[id] - Lead güncelle
// DELETE /api/leads/[id] - Lead sil

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
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        listing: true,
        messages: { orderBy: { createdAt: 'desc' } },
        appointments: { orderBy: { scheduledAt: 'desc' } },
      },
    });

    if (!lead || lead.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ lead });
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

    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: body,
    });

    await audit({
      userId: session.userId,
      action: 'lead.updated',
      entity: 'Lead',
      entityId: lead.id,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ lead });
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

    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    // Önce mesajları sil
    await prisma.message.deleteMany({
      where: { leadId: params.id },
    });

    // Sonra randevuları sil
    await prisma.appointment.deleteMany({
      where: { leadId: params.id },
    });

    // Son olarak lead'i sil
    await prisma.lead.delete({
      where: { id: params.id },
    });

    await audit({
      userId: session.userId,
      action: 'lead.deleted',
      entity: 'Lead',
      entityId: params.id,
      metadata: { contactName: existing.contactName },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}