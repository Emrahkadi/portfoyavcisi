// Seed script - Sadece demo kullanıcı oluşturur
// Çalıştırmak için: npm run db:seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Emlak Ofisi',
      slug: 'demo-org',
      kvkkConsent: true,
    },
  });

  // Demo user
  const passwordHash = await bcrypt.hash('demo1234', 10);
  await prisma.user.upsert({
    where: { email: 'demo@portfoyavcisi.com' },
    update: {},
    create: {
      email: 'demo@portfoyavcisi.com',
      passwordHash,
      name: 'Demo Agent',
      role: 'AGENT',
      organizationId: org.id,
    },
  });

  console.log('✅ Seed completed!');
  console.log('📧 Demo login: demo@portfoyavcisi.com / demo1234');
  console.log('💡 Dashboard boş başlayacak, ilanları kendiniz ekleyeceksiniz');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });