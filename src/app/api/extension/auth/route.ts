// POST /api/extension/auth - Extension için token-based auth
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production-min-32-chars';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email ve şifre gerekli' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Geçersiz email veya şifre' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Geçersiz email veya şifre' }, { status: 401 });
    }

    // Extension için JWT token oluştur (7 gün geçerli)
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      type: 'extension',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    await audit({
      userId: user.id,
      action: 'extension.login',
      entity: 'User',
      entityId: user.id,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    console.error('Extension auth error:', err);
    return NextResponse.json({ error: 'Giriş başarısız' }, { status: 500 });
  }
}