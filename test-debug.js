// Server log'daki hatayı görmek için hızlı test
async function debug() {
  const authRes = await fetch('http://localhost:3002/api/extension/sahibinden-auto-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sahibindenUserId: 'test-flow',
      email: 'test@leadseak.com',
      name: 'Test Agent',
    }),
  });
  const authData = await authRes.json();

  // Son listing'i kullan
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const listing = await prisma.listing.findFirst({
    where: { organizationId: authData.user.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.$disconnect();

  if (!listing) {
    console.log('Listing bulunamadı');
    return;
  }
  console.log('Listing:', listing.id, listing.title);

  // Şimdi WhatsApp endpoint'i çağır ve detaylı hata al
  const waRes = await fetch('http://localhost:3002/api/extension/whatsapp-auto-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.token}`,
    },
    body: JSON.stringify({ listingId: listing.id, sendWhatsApp: false }),
  });
  const waData = await waRes.json();
  console.log('Status:', waRes.status);
  console.log('Response:', JSON.stringify(waData, null, 2));
}

debug().catch(console.error);
