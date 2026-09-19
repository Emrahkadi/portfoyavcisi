// Gerçek telefon numarası ile test ilanı ekle
async function addRealListing() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // Önce test kullanıcısı oluştur
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('test1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@leadseak.com' },
    update: {},
    create: {
      email: 'test@leadseak.com',
      passwordHash,
      name: 'Test Agent',
      role: 'AGENT',
      organizationId: (await prisma.organization.upsert({
        where: { slug: 'test-org' },
        update: {},
        create: { name: 'Test Org', slug: 'test-org' },
      })).id,
    },
  });

  console.log('Test user:', user.email);

  // Gerçekçi ilan ekle
  const listing = await prisma.listing.create({
    data: {
      externalId: `real-test-${Date.now()}`,
      source: 'MANUAL',
      url: 'https://www.sahibinden.com/ilan/test',
      title: 'Pendik Yenişehirde 3+1 Satılık Daire',
      description: 'Yenişehir mahallesinde, asansörlü, otoparklı, site içerisinde, bakımlı daire. 3 yıllık bina. Doğalgaz kombi. Eşyalı değil. Balkonlu. Manzara güzel.',
      propertyType: 'APARTMENT',
      rooms: '3+1',
      sizeSqm: 120,
      price: 4500000,
      pricePerSqm: 37500,
      city: 'İstanbul',
      district: 'Pendik',
      neighborhood: 'Yenişehir',
      floor: 5,
      buildingAge: 3,
      heatingType: 'Kombi (Doğalgaz)',
      furnished: false,
      isOwner: true,
      daysOnMarket: 45,
      contactName: 'Mehmet Demir',
      contactPhone: '+905551234567',
      organizationId: user.organizationId,
      rawData: {
        photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        allFeatures: ['120 m²', '3+1', '5. Kat', 'Bina Yaşı: 3', 'Isınma: Doğalgaz (Kombi)', 'Balkon: Var', 'Asansör: Var', 'Otopark: Var', 'Site İçerisinde'],
        totalFloors: 10,
        bathroomCount: 1,
        balcony: true,
        parking: true,
        elevator: true,
        inComplex: true,
        location: 'İstanbul / Pendik / Yenişehir',
        priceText: '4.500.000 TL',
      },
    },
  });

  console.log('Listing:', listing.id, '-', listing.title);
  console.log('Org:', user.organizationId);

  await prisma.$disconnect();
}

addRealListing();
