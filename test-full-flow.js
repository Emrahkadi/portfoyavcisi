// Tam akış testi - ilan + WhatsApp + AI mesaj
async function testFull() {
  // 1. Auto-auth ile token al
  const authRes = await fetch('http://localhost:3002/api/extension/sahibinden-auto-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sahibindenUserId: 'test-flow',
      sahibindenUsername: 'flow_test',
      email: 'test@leadseak.com',
      name: 'Test Agent',
    }),
  });
  const authData = await authRes.json();
  console.log('1. Auth:', authData.user?.email, '- Org:', authData.user?.organizationName);

  // 2. Yeni ilan ekle
  const listingRes = await fetch('http://localhost:3002/api/extension/add-listing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.token}`,
    },
    body: JSON.stringify({
      externalId: `test-flow-${Date.now()}`,
      title: 'Kadıköy Moda da 2+1 Satılık Daire',
      description: 'Moda sahilde, yürüme mesafesinde. Kullanışlı daire. 1 yıllık bina.',
      price: 8500000,
      sizeSqm: 95,
      rooms: '2+1',
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Moda',
      isOwner: true,
      contactName: 'Ayşe Kaya',
      contactPhone: '+905559876543',
      url: 'https://www.sahibinden.com/test',
      propertyType: 'APARTMENT',
      daysOnMarket: 60,
      floor: 3,
      buildingAge: 1,
      heatingType: 'Doğalgaz (Kombi)',
      bathroomCount: 1,
      balcony: true,
      furnished: false,
      parking: false,
      elevator: true,
      inComplex: false,
      photos: ['p1.jpg', 'p2.jpg'],
      allFeatures: ['95 m²', '2+1', '3. Kat', 'Bina Yaşı: 1', 'Isınma: Doğalgaz (Kombi)', 'Balkon: Var', 'Asansör: Var'],
      priceText: '8.500.000 TL',
    }),
  });
  const listingData = await listingRes.json();
  console.log('\n2. Listing:', listingData.listing?.id, '-', listingData.listing?.title);

  // 3. WhatsApp auto-send
  const waRes = await fetch('http://localhost:3002/api/extension/whatsapp-auto-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.token}`,
    },
    body: JSON.stringify({
      listingId: listingData.listing.id,
      sendWhatsApp: false, // API yok, draft olarak kaydet
    }),
  });
  const waData = await waRes.json();
  console.log('\n3. WhatsApp Sonucu:');
  console.log('   AI Mesaj:', waData.message?.substring(0, 100) + '...');
  console.log('   WhatsApp gönderildi:', waData.whatsapp?.sent);
  console.log('   WhatsApp aktif:', waData.whatsapp?.enabled);
  console.log('   Lead:', waData.lead?.id, '- Status:', waData.lead?.status, '- Score:', waData.lead?.score);
}

testFull().catch(console.error);
