// Debug token - token içeriğini ve user eşleşmesini kontrol et
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // 1. Auto-auth ile token al
  const authRes = await fetch('http://localhost:3002/api/extension/sahibinden-auto-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sahibindenUserId: 'test123',
      sahibindenUsername: 'test',
      email: 'sahibinden-test123@leadseak.com',
      name: 'Test User',
    }),
  });
  const authData = await authRes.json();
  console.log('Auth response:', JSON.stringify(authData, null, 2));

  const token = authData.token;
  if (!token) return;

  // 2. Token'ı decode et
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  console.log('\nToken payload:', JSON.stringify(payload, null, 2));

  // 3. User'ı bul
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { organization: true },
  });
  console.log('\nUser:', user ? `${user.email} (${user.id})` : 'BULUNAMADI');
  console.log('Org:', user?.organization?.name);

  // 4. Listing'in org'unu kontrol et
  const listing = await prisma.listing.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { organization: true },
  });
  console.log('\nListing:', listing?.title);
  console.log('Listing Org:', listing?.organization?.name, '(', listing?.organizationId, ')');
  console.log('Match:', user?.organizationId === listing?.organizationId);

  await prisma.$disconnect();
}

debug();
