const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const l = await prisma.listing.findUnique({
      where: { id: 'cmu8evx2a000wz587werduwgj' },
      include: { lead: true },
    });
    console.log('Listing:', l?.title);
    console.log('Org:', l?.organizationId);
    console.log('Lead:', l?.lead?.id || 'YOK');

    // Mesajları kontrol et
    const messages = await prisma.message.findMany({
      where: { leadId: l?.lead?.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    console.log('\nMesajlar:', messages.length);
    messages.forEach(m => {
      console.log('-', m.status, '|', m.channel, '|', m.content?.substring(0, 80));
    });
  } catch (e) {
    console.error('Hata:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
