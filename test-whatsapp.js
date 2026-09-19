// Test WhatsApp auto-send endpoint
async function test() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // 1. Son listing'i bul
    const listing = await prisma.listing.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!listing) {
      console.log('Hiç ilan yok, önce bir ilan ekleyin');
      return;
    }

    console.log('Test edilecek ilan:', listing.id, '-', listing.title);

    // 2. Auto-auth yap (token al)
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
    if (!authData.token) {
      console.log('Token alınamadı:', authData);
      return;
    }
    console.log('Token alındı');

    // 3. WhatsApp auto-send çağır
    const waRes = await fetch('http://localhost:3002/api/extension/whatsapp-auto-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify({
        listingId: listing.id,
        sendWhatsApp: false,
      }),
    });
    const waData = await waRes.json();
    console.log('\n=== WHATSAPP AUTO-SEND SONUCU ===');
    console.log(JSON.stringify(waData, null, 2));

  } catch (err) {
    console.error('Hata:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
