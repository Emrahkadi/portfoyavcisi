// POST /api/auth/logout
import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST() {
  const session = await getSession();
  if (session) {
    await audit({
      userId: session.userId,
      action: 'user.logout',
      entity: 'User',
      entityId: session.userId,
    });
  }
  await destroySession();
  return NextResponse.json({ success: true });
}