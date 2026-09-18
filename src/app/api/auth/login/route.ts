// POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Geçersiz email veya şifre' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Geçersiz email veya şifre' }, { status: 401 });
    }

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined,
    });

    await audit({
      userId: user.id,
      action: 'user.login',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ZodError') {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}