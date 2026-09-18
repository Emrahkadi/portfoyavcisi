# Mimari Dokümantasyonu

## Genel Bakış

Portfolio Intel, **katmanlı mimari** prensibiyle tasarlanmıştır. Her katmanın kendine ait sorumluluğu vardır ve katmanlar arası bağımlılık tek yönlüdür.

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Next.js)                    │
│  Dashboard • Listings • Leads • Messages • Auth          │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                    API Layer (REST)                      │
│  /api/auth/* • /api/listings/* • /api/leads/*           │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  Service Layer (Business Logic)         │
│  ComparableEngine • AIEvaluator • LeadScorer            │
│  WhatsAppService • ConversationAnalyzer                │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│              Data Source Layer (Pluggable)              │
│  ManualDataSource • CsvDataSource • ApiPartnerDataSource│
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)                  │
│  Prisma ORM • Audit Logs • KVKK Compliance              │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Data Source Layer

### Tasarım Prensibi
**Strategy Pattern** — Her veri kaynağı bir adapter'dır. Yeni kaynak eklemek için sadece `DataSourceAdapter` interface'ini implement etmek yeterli.

### Mevcut Adapter'lar

#### `ManualDataSource`
- Kullanıcının kendi eklediği ilanlar
- En güvenli yöntem
- ToS uyumluluğu: ✅ %100

#### `CsvDataSource`
- Kullanıcının portal'dan dışa aktardığı CSV dosyaları
- Sahibinden'in "Favorilerim" dışa aktarma özelliği kullanılabilir
- ToS uyumluluğu: ✅ %100 (kullanıcının kendi verisi)

#### `ApiPartnerDataSource`
- Portal'ın yazılı izin verdiği resmi API'ler
- Sahibinden'in resmi API'si yoktur
- ToS uyumluluğu: ✅ Sözleşmeye bağlı

### Yeni Adapter Eklemek

```typescript
// src/services/datasources/my-source.ts
import type { DataSourceAdapter } from './types';

export class MyDataSource implements DataSourceAdapter {
  readonly name = 'My Source';
  readonly source = ListingSource.OTHER;
  readonly complianceNote = '...';

  async fetchListings(params: FetchParams): Promise<RawListing[]> {
    // Implementasyon
  }

  async healthCheck() {
    return { ok: true };
  }
}

// src/services/datasources/index.ts
dataSourceRegistry.register(new MyDataSource());
```

---

## 2. Emsal Motoru (ComparableEngine)

### Algoritma

1. **Veri Toplama**: Aynı şehir/ilçe/mahalledeki tüm aktif ilanları çek
2. **İstatistik Hesaplama**:
   - Medyan (ortanca değer)
   - Ortalama
   - Min/Max
   - Örneklem büyüklüğü
3. **Karşılaştırma**: İlanın m² fiyatını medyan ile karşılaştır
4. **Fırsat Seviyesi**:
   - ≤ -10%: HIGH (yüksek fırsat)
   - -10% ile -5%: MEDIUM
   - -5% ile +5%: LOW (standart)
   - > +5%: OVERPRICED

### Performans
- Tüm hesaplamalar DB seviyesinde yapılır
- `District` tablosunda cache'lenir (`lastComputedAt`)
- Lazy update: yeni ilan eklendiğinde otomatik güncellenir

---

## 3. AI Değerlendirme (AIEvaluator)

### Hibrit Yaklaşım

**Kural Tabanlı** (hızlı, AI olmadan da çalışır):
- Sahibinden mi? (+20 puan)
- Piyasa süresi (>30 gün: +10, >60 gün: +15)
- Fiyat düşüş sayısı (2 kez: +10, 3+ kez: +15)
- Fiyat düşüş yüzdesi (>15%: +10)
- Emsal karşılaştırma (HIGH: +10, OVERPRICED: -10)

**AI Destekli** (OpenAI API):
- Kural tabanlı sonucu zenginleştirir
- Ağırlıklı ortalama: %40 kural + %60 AI
- JSON formatında structured output

### Neden Hibrit?
- **Maliyet**: AI API'si her ilan için pahalı, kural tabanlı ücretsiz
- **Hız**: Kural tabanlı <1ms, AI ~2-5 saniye
- **Güvenilirlik**: AI API'si çökerse sistem çalışmaya devam eder
- **Şeffaflık**: Kural tabanlı nedenler açık, AI kara kutu

---

## 4. Lead Scoring (LeadScorer)

### Sıcaklık Matrisi

| Skor | Sıcaklık | Emoji | Aksiyon |
|------|----------|-------|---------|
| 85+  | URGENT   | 🔥    | Hemen iletişim |
| 70-84| HOT      | 🟢    | 24 saat içinde |
| 50-69| WARM     | 🟡    | Takip listesine |
| <50  | COLD     | ❌    | Düşük öncelik |

### Dinamik Güncelleme

Gelen mesaj kategorisine göre lead skoru otomatik güncellenir:

| Kategori | Skor Değişimi | Yeni Durum |
|----------|---------------|------------|
| APPOINTMENT | +30 | APPOINTMENT_SET |
| INTERESTED | +20 | ENGAGED |
| INFO_REQUEST | +10 | ENGAGED |
| PRICE_INQUIRY | +10 | ENGAGED |
| COMMISSION | +5 | CONTACTED |
| REJECTION | -reset | OPT_OUT |

---

## 5. WhatsApp Entegrasyonu (WhatsAppService)

### Meta Cloud API

**Endpoint:** `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`

### Mesaj Türleri

1. **Template Messages** (24 saat kuralı dışında):
   - Önceden onaylanmış şablonlar
   - Parametreler ile kişiselleştirme
   - Pazarlama, utility, authentication kategorileri

2. **Free-form Messages** (24 saat window içinde):
   - Kullanıcı son 24 saat içinde mesaj attıysa
   - Serbest metin gönderilebilir

### Webhook Akışı

```
Meta → POST /api/webhooks/whatsapp
         ↓
WhatsAppService.handleIncomingMessage()
         ↓
DB'ye kaydet (Message tablosu)
         ↓
ConversationAnalyzer.processIncomingMessage()
         ↓
AI kategorizasyon + sentiment analizi
         ↓
LeadScorer.updateFromResponse()
         ↓
Lead skoru güncellenir
```

---

## 6. AI Görüşme (ConversationAnalyzer)

### Kategoriler

- **REJECTION**: "Emlakçı istemiyorum" → Lead kapatılır
- **COMMISSION**: "Komisyon vermem" → Takip
- **INTERESTED**: "Alıcınız varsa getirin" → Sıcak
- **APPOINTMENT**: "Yarın görüşebiliriz" → Acil
- **INFO_REQUEST**: Bilgi talebi
- **PRICE_INQUIRY**: Fiyat sorusu
- **OTHER**: Diğer

### Hibrit Analiz

**Kural Tabanlı** (regex/keyword):
- Hızlı (<1ms)
- Türkçe stopword'ler
- Yüksek güvenilirlik (%90+)

**AI Destekli** (OpenAI):
- Bağlam anlayışı
- Nüans tespiti
- Düşük güvenilirlik durumlarında fallback

---

## 7. Veritabanı Şeması

### Ana Tablolar

- **User**: Kullanıcılar (agent, manager, admin)
- **Organization**: Emlak ofisleri (multi-tenant)
- **Listing**: İlanlar (data source agnostic)
- **District**: Bölge emsal istatistikleri
- **Lead**: Satıcı adayları
- **Message**: Mesajlaşma geçmişi
- **Appointment**: Randevular
- **LeadNote**: Lead notları
- **AuditLog**: KVKK audit trail
- **DataSourceConfig**: Veri kaynağı konfigürasyonları

### İndeksler

Performans için kritik indeksler:
- `Listing(city, district)` — Bölge sorguları
- `Listing(aiScore)` — Yüksek potansiyel sorguları
- `Lead(temperature, status)` — Sıcak lead sorguları
- `Message(leadId, createdAt)` — Mesaj geçmişi
- `AuditLog(createdAt)` — Zaman bazlı audit sorguları

---

## 8. Güvenlik

### Authentication
- JWT (jose library)
- HttpOnly cookie
- 7 günlük session
- Bcrypt password hashing (10 rounds)

### Authorization
- Organization bazlı multi-tenancy
- Her sorguda `organizationId` filtresi
- Role-based access control (RBAC)

### KVKK Compliance
- `Lead.consentGiven` — Onay durumu
- `Lead.optOutDate` — Opt-out tarihi
- `AuditLog` — Tüm aksiyonlar loglanır
- Veri maskeleme (UI'da telefon maskeleme)
- Veri saklama süresi (`DATA_RETENTION_DAYS` env)

### API Güvenliği
- Zod validation (tüm input'lar)
- Rate limiting (TODO: production'da eklenmeli)
- CSRF protection (Next.js built-in)
- SQL injection koruması (Prisma ORM)

---

## 9. Deployment

### Önerilen Stack
- **Hosting:** Vercel / Railway / AWS
- **Database:** Neon / Supabase / RDS
- **AI:** OpenAI API
- **WhatsApp:** Meta Cloud API

### Environment Variables
Detaylar için `.env.example` dosyasına bakın.

### Production Checklist
- [ ] `JWT_SECRET` güçlü bir değere set edildi
- [ ] `DATABASE_URL` production database'e işaret ediyor
- [ ] WhatsApp webhook verify token set edildi
- [ ] OpenAI API key set edildi
- [ ] `CONSENT_REQUIRED=true`
- [ ] HTTPS aktif
- [ ] Rate limiting eklendi
- [ ] Monitoring (Sentry, LogRocket) eklendi
- [ ] Backup stratejisi belirlendi

---

## 10. Gelecek Geliştirmeler

### Kısa Vade
- [ ] CSV upload UI
- [ ] Toplu ilan ekleme
- [ ] E-posta bildirimleri
- [ ] Randevu takvimi entegrasyonu (Google Calendar)

### Orta Vade
- [ ] Multi-language support (İngilizce, Arapça)
- [ ] Mobile app (React Native)
- [ ] Gelişmiş raporlama (charts, exports)
- [ ] Team collaboration features

### Uzun Vade
- [ ] ML model training (kendi verilerimizle)
- [ ] Predictive analytics (hangi lead kazanılacak?)
- [ ] Automated A/B testing (mesaj varyasyonları)
- [ ] Integration marketplace (CRM, accounting, vs.)

---

**Son güncelleme:** 2026-09-19