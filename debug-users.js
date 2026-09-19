const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    include: { organization: true }
  });
  console.log('=== KULLANICILAR ===');
  users.forEach(u => {
    console.log('ID:', u.id, '| Email:', u.email, '| Name:', u.name, '| Org:', u.organization.name, '(', u.organizationId, ')');
  });

  const listings = await prisma.listing.findMany({
    include: { organization: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\n=== SON 10 ILAN ===');
  listings.forEach(l => {
    console.log(l.title.substring(0, 40), '| Org:', l.organization.name, '| Source:', l.source, '|', l.createdAt.toISOString().split('T')[0]);
  });

  await prisma.$disconnect();
})();
