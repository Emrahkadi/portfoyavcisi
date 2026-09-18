# 🎯 Portföy Avcısı — Gayrimenkul Portföy Kazanım Platformu

> **Lead Intelligence & CRM sistemi.** Sahibinden'e bağımlı olmayan, modüler mimari.

**Domain:** `portfoyavcisi.com`

## 🎯 Problem

Emlak ofisleri her gün yüzlerce ilanla uğraşıyor. Hangi ilanın sahibinin "satmaya motive" olduğunu bulmak, onlara doğru zamanda doğru mesajla ulaşmak ve gelen cevapları akıllıca kategorize etmek — tüm bunlar manuel yapılınca saatler alıyor.

**LastMedia** gibi araçlar Sahibinden'den otomatik veri çekmeye çalışıyor. Ancak bu:
- Sahibinden'in kullanım koşullarına aykırı
- Hesap kapatma riski taşıyor
- Yasal değil

## 💡 Çözümümüz

**"Gayrimenkul Portföy Kazanım Platformu"** — Sahibinden'e bağımlı olmayan, modüler bir sistem:

```
Veri → Emsal Motoru → AI Değerlendirme → Lead Scoring → İletişim → AI Görüşme → CRM → Randevu → Portföy
```

Sahibinden sadece **bir veri kaynağı**. İsterseniz CSV, ister manuel, ister resmi API.

---

## 🏗️ Mimari

### Katmanlar

1. **Data Source Layer** (`src/services/datasources/`)
   - `ManualDataSource` — Kullanıcının kendi eklediği ilanlar
   - `CsvDataSource` — CSV import (Sahibinden'in resmi export özelliği)
   - `ApiPartnerDataSource` — Yazılı izinli resmi API entegrasyonları

2. **Emsal Motoru** (`src/services/comparable.ts`)
   - Bölge medyanı, ortalama, min/max hesaplama
   - Fiyat karşılaştırma ve fırsat tespiti

3. **AI Değerlendirme** (`src/services/ai-evaluator.ts`)
   - Kural tabanlı hızlı değerlendirme (AI olmadan da çalışır)
   - OpenAI ile zenginleştirilmiş analiz
   - 0-100 arası potansiyel skoru + nedenler

4. **Lead Scoring** (`src/services/lead-scorer.ts`)
   - 🔥 URGENT (85+) — Acil lead
   - 🟢 HOT (70-84) — Sıcak
   - 🟡 WARM (50-69) — Takip
   - ❌ COLD (<50) — Kapalı

5. **İletişim** (`src/services/whatsapp.ts`)
   - Meta WhatsApp Business API (Cloud API)
   - Template + serbest mesaj
   - 24 saat conversation window yönetimi

6. **AI Görüşme** (`src/services/conversation-analyzer.ts`)
   - Gelen mesajları kategorize eder
   - Sentiment analizi
   - Otomatik lead güncelleme

7. **AI Mesaj Üretimi** (`src/services/message-generator.ts`)
   - Her ilana özel kişiselleştirilmiş mesaj
   - Spam gibi görünmeyen, değer odaklı

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- (Opsiyonel) OpenAI API key
- (Opsiyonel) WhatsApp Business API erişimi

### Adımlar

```bash
# 1. Bağımlılıkları kur
npm install

# 2. Environment dosyası
cp .env.example .env
# .env dosyasını düzenle (DATABASE_URL, JWT_SECRET, vs.)

# 3. Veritabanı
npx prisma generate
npx prisma db push
npm run db:seed

# 4. Geliştirme sunucusu
npm run dev
```

Tarayıcıda: [http://localhost:3000](http://localhost:3000)

**Demo giriş:**
- Email: `demo@portfolio-intel.com`
- Şifre: `demo1234`

---

## 📊 Veri Akışı

```
1. Kullanıcı ilan ekler (Manuel/CSV/API)
         ↓
2. Sistem otomatik AI değerlendirmesi yapar
         ↓
3. Emsal motoru bölge ortalamasıyla karşılaştırır
         ↓
4. Lead oluşturulur, sıcaklık atanır
         ↓
5. Dashboard'da "Yüksek Potansiyelli İlanlar" listelenir
         ↓
6. Agent AI ile kişiselleştirilmiş mesaj oluşturur
         ↓
7. WhatsApp üzerinden gönderilir
         ↓
8. Gelen cevap AI ile kategorize edilir
         ↓
9. Lead skoru güncellenir (sıcak/soğuk)
         ↓
10. Sıcak lead'ler agent'a bildirilir
         ↓
11. Randevu → Portföy kazanımı 🎉
```

---

## ⚖️ Yasal Uyumluluk

Detaylar için [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) dosyasına bakın.

### Temel İlkeler

1. **Sahibinden/Hepsiemlak'tan otomatik scraping YAPILMAZ**
   - Sahibinden'in kullanım koşulları bunu açıkça yasaklıyor
   - Tüm veri kaynakları yasal yöntemlerle çalışır

2. **WhatsApp iletişimi Meta'nın resmi Business API'si üzerinden**
   - 24 saat conversation window kuralına uyumlu
   - Onaylı template mesajlar kullanılır

3. **KVKK uyumlu**
   - Onay yönetimi (`Lead.consentGiven`)
   - Audit log (tüm aksiyonlar loglanır)
   - Veri maskeleme (UI'da telefon maskeleme)
   - Opt-out mekanizması

---

## 🛠️ Teknoloji Stack

- **Framework:** Next.js 14 (App Router)
- **Veritabanı:** PostgreSQL + Prisma ORM
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Auth:** JWT (jose) + bcrypt
- **AI:** OpenAI uyumlu API (gpt-4o-mini default)
- **WhatsApp:** Meta Cloud API
- **Validation:** Zod
- **Type Safety:** TypeScript strict mode

---

## 📁 Proje Yapısı

```
portfolio-intel-platform/
├── prisma/
│   ├── schema.prisma          # Veritabanı şeması
│   └── seed.ts                # Demo veriler
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API route'ları
│   │   ├── dashboard/         # Sabah raporu
│   │   ├── listings/          # İlan yönetimi
│   │   ├── leads/             # Lead yönetimi
│   │   ├── messages/          # Mesajlaşma
│   │   ├── login/             # Giriş
│   │   └── register/          # Kayıt
│   ├── components/            # React componentleri
│   │   └── ui/                # shadcn/ui
│   ├── lib/                   # Core kütüphaneler
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # JWT auth
│   │   ├── utils.ts           # Yardımcılar
│   │   ├── validations.ts     # Zod şemaları
│   │   └── audit.ts           # Audit log
│   ├── services/              # İş mantığı
│   │   ├── datasources/       # Pluggable veri kaynakları
│   │   ├── comparable.ts      # Emsal motoru
│   │   ├── ai-evaluator.ts    # AI değerlendirme
│   │   ├── lead-scorer.ts     # Lead scoring
│   │   ├── whatsapp.ts        # WhatsApp API
│   │   ├── conversation-analyzer.ts  # AI görüşme
│   │   └── message-generator.ts      # AI mesaj
│   └── types/                 # TypeScript tipleri
└── docs/
    ├── ARCHITECTURE.md        # Mimari detayları
    └── COMPLIANCE.md          # Yasal uyumluluk
```

---

## 🎯 Fiyatlandırma Önerisi

LastMedia'nın zayıf noktaları:
- Yasal risk (scraping)
- KVKK uyumsuzluğu
- Spam mesajlaşma
- Akıllı yanıt kategorizasyonu yok

**Bizim farkımız:**
- ✅ Yasal uyumlu (veri kaynağı seçimi)
- ✅ KVKK uyumlu (onay, audit, opt-out)
- ✅ Kişiselleştirilmiş mesajlar
- ✅ Akıllı yanıt analizi
- ✅ Modüler mimari (Sahibinden'e bağımlı değil)

---

## 📝 Lisans

MIT

---

## 🤝 Katkıda Bulunma

PR'lar kabul edilir. Büyük değişiklikler için önce issue açın.

---

**Son güncelleme:** 2026-09-19