# Hızlı Başlangıç

## 5 Dakikada Çalıştır

### 1. Bağımlılıkları Kur

```bash
cd portfolio-intel-platform
npm install
```

### 2. Environment Ayarla

```bash
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio_intel"
JWT_SECRET="super-secret-key-min-32-characters-long-please"
```

### 3. Veritabanı Hazırla

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Başlat

```bash
npm run dev
```

Tarayıcıda: [http://localhost:3000](http://localhost:3000)

**Demo giriş:**
- Email: `demo@portfolio-intel.com`
- Şifre: `demo1234`

---

## İlk Adımlar

### 1. Dashboard'u İncele

`/dashboard` — Sabah raporunu gör:
- Bugün kaç yeni ilan var
- Kaç tanesi yüksek potansiyelli
- Sıcak leadler

### 2. İlanları Gör

`/listings` — Tüm ilanlar AI skoruna göre sıralı.

Bir ilana tıkla → detay sayfasında:
- AI değerlendirmesi
- Emsal karşılaştırma
- Mesaj oluştur

### 3. Lead'leri Yönet

`/leads` — Tüm lead'ler.

Bir lead'e tıkla → mesajlaşma geçmişi, AI özeti, aksiyonlar.

### 4. Mesajları İzle

`/messages` — Tüm WhatsApp mesajları.

---

## Yeni İlan Ekleme

### Manuel (API)

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Cookie: pi_session=YOUR_TOKEN" \
  -d '{
    "externalId": "manual-001",
    "source": "MANUAL",
    "title": "Pendik Yenişehir 2+1",
    "propertyType": "APARTMENT",
    "rooms": "2+1",
    "sizeSqm": 105,
    "price": 5250000,
    "city": "İstanbul",
    "district": "Pendik",
    "neighborhood": "Yenişehir",
    "isOwner": true,
    "daysOnMarket": 37,
    "contactPhone": "+905551234567",
    "contactName": "Ahmet Yılmaz"
  }'
```

Sistem otomatik olarak:
1. AI değerlendirmesi yapar
2. Emsal karşılaştırması yapar
3. Lead oluşturur
4. Sıcaklık atar

---

## WhatsApp Kurulumu (Opsiyonel)

### 1. Meta Business Hesabı

[business.facebook.com](https://business.facebook.com) üzerinden hesap aç.

### 2. WhatsApp Business API

[developers.facebook.com](https://developers.facebook.com/docs/whatsapp/cloud-api) üzerinden:
- App oluştur
- WhatsApp product ekle
- Phone number doğrula
- Access token al

### 3. Environment'a Ekle

```env
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxx"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="random-string"
```

### 4. Webhook Ayarla

Meta dashboard'da webhook URL'i:
```
https://your-domain.com/api/webhooks/whatsapp
```

Verify token: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` değeriniz.

---

## OpenAI Kurulumu (Opsiyonel)

AI özellikleri olmadan da sistem çalışır (kural tabanlı fallback).

AI'ı aktifleştirmek için:

```env
OPENAI_API_KEY="sk-xxxxxxx"
OPENAI_MODEL="gpt-4o-mini"
```

---

## Production Checklist

- [ ] `JWT_SECRET` güçlü bir değere set edildi (min 32 karakter)
- [ ] `DATABASE_URL` production database'e işaret ediyor
- [ ] WhatsApp credentials set edildi
- [ ] OpenAI API key set edildi
- [ ] `CONSENT_REQUIRED=true`
- [ ] HTTPS aktif
- [ ] Domain webhook için yapılandırıldı
- [ ] Backup stratejisi belirlendi
- [ ] Monitoring eklendi (opsiyonel)

---

## Sorun Giderme

### "Database connection failed"
- PostgreSQL çalışıyor mu? `pg_isready`
- `.env`'deki `DATABASE_URL` doğru mu?

### "Unauthorized" hatası
- Login olmuş musunuz?
- Cookie silinmiş olabilir, tekrar login

### WhatsApp mesajları gelmiyor
- Webhook URL doğru mu?
- Verify token eşleşiyor mu?
- Meta dashboard'da webhook aktif mi?

### AI değerlendirme yavaş
- OpenAI API rate limit'e takılmış olabilir
- Kural tabanlı fallback otomatik devreye girer

---

**Son güncelleme:** 2026-09-19