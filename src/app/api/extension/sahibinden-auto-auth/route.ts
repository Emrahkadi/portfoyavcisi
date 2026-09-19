// POST /api/extension/sahibinden-auto-auth
// Sahibinden'deki kullanıcı bilgisi ile otomatik login/register
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production-min-32-chars';
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function createExtensionToken(payload: { userId: string; email: string; role: string; organizationId: string }): Promise<string> {
  return await new SignJWT({ ...payload, type: 'extension' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sahibindenUserId, sahibindenUsername, email, name } = body;

    if (!sahibindenUserId || !email) {
      return NextResponse.json(
        { error: 'Sahibinden kullanıcı bilgisi eksik' },
        { status: 400 }
      );
    }

    // Kullanıcı zaten var mı?
    let user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      // Yeni kullanıcı oluştur - şifre yok, sahibinden ile login olacak
      // Rastgele şifre oluştur (kimse bilmeyecek, sadece sahibinden auth kullanılacak)
      const randomPassword = Math.random().toString(36).slice(-16) + Date.now().toString(36);
      const passwordHash = await hashPassword(randomPassword);

      // Organization oluştur (her kullanıcı için ayrı org - leadseak modeli)
      const orgSlug = `sahibinden-${sahibindenUserId}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const organization = await prisma.organization.upsert({
        where: { slug: orgSlug },
        update: {},
        create: {
          name: `${name || sahibindenUsername} Emlak Ofisi`,
          slug: orgSlug,
          kvkkConsent: true,
        },
      });

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name || sahibindenUsername || 'Sahibinden Kullanıcısı',
          role: 'AGENT',
          organizationId: organization.id,
        },
        include: { organization: true },
      });
    }

    // Extension için özel token oluştur (type: 'extension' ile)
    const token = await createExtensionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        isNewUser: !user.createdAt || (Date.now() - new Date(user.createdAt).getTime() < 5000),
      },
    });
  } catch (err) {
    console.error('Sahibinden auto-auth error:', err);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
