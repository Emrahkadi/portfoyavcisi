// POST /api/auth/register
import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations';
import { prisma } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Email zaten var mı?
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: 'Bu email zaten kayıtlı' }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    // Organization oluştur veya mevcut olanı kullan
    let organizationId: string;
    if (data.organizationName) {
      const slug = data.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const org = await prisma.organization.upsert({
        where: { slug },
        update: {},
        create: {
          name: data.organizationName,
          slug,
          kvkkConsent: true,
        },
      });
      organizationId = org.id;
    } else {
      // Default org
      const org = await prisma.organization.findFirst() || await prisma.organization.create({
        data: { name: 'Default Org', slug: 'default' },
      });
      organizationId = org.id;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: 'AGENT',
        organizationId,
      },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId,
    });

    await audit({
      userId: user.id,
      action: 'user.register',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 });
  }
}