# Yasal Uyumluluk Dokümantasyonu

> **Bu doküman, sistemin yasal çerçevesini ve uyumluluk stratejilerini açıklar.**

---

## ⚖️ Temel İlke

**Bu sistem Sahibinden.com, Hepsiemlak vb. portallardan otomatik veri çekmez.**

Sahibinden.com'un kullanım koşulları açıkça şunları yasaklamaktadır:
- Otomatik program, robot, crawler kullanımı
- Data mining / data crawling
- Screen scraping
- Yapay zekâ uygulamaları ile otomatik erişim

Bu nedenle sistem tasarım gereği **scraping yapmaz**.

---

## 1. Veri Toplama Yöntemleri

### ✅ Yasal Yöntemler

#### 1.1 Manuel Giriş
- Kullanıcı kendi ilanlarını sisteme ekler
- ToS uyumluluğu: ✅ %100
- KVKK: Kullanıcı kendi verisini işliyor

#### 1.2 CSV Import
- Kullanıcı Sahibinden/Hepsiemlak'tan "Favorilerim" veya arama sonuçlarını CSV olarak dışa aktarır
- Bu, Sahibinden'in resmi "veri taşınabilirliği" özelliğidir
- ToS uyumluluğu: ✅ %100 (kullanıcının kendi verisi)
- CSV formatı: `src/services/datasources/csv.ts`

#### 1.3 Resmi API (Yazılı İzin ile)
- Portal'ın yazılı izin verdiği API entegrasyonları
- Sahibinden'in resmi bir API'si **yoktur**
- Başka bir portal ile sözleşme yapılırsa kullanılabilir
- ToS uyumluluğu: ✅ Sözleşmeye bağlı

### ❌ Yasal Olmayan Yöntemler (Sistemde Yok)

- ❌ Otomatik scraping (Puppeteer, Playwright, vs.)
- ❌ Sahibinden'in kendi mesajlaşma sistemi üzerinden otomatik mesaj
- ❌ Crawler / bot ile veri toplama
- ❌ API anahtarı olmadan erişim

---

## 2. WhatsApp İletişimi

### Meta Cloud API (Business API)

**Kullanılan:** Resmi Meta WhatsApp Business API
**Endpoint:** `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`

### 2.1 24 Saat Conversation Window

Meta'nın kuralı:
- Kullanıcı son 24 saat içinde size mesaj attıysa → serbest metin gönderebilirsiniz
- 24 saatten sonra → sadece onaylı template mesajlar

**Sistemimizde:**
- `WhatsAppService.sendMessage()` — Serbest metin (window içinde)
- `WhatsAppService.sendTemplate()` — Onaylı template (her zaman)

### 2.2 Template Mesajlar

Meta'dan önceden onaylanmış şablonlar gerekir. Örnekler:

```
portfolio_intro (tr):
"Merhaba {{1}}, {{2}} bölgesindeki ilanınızı takip ediyorum. 
Bölgede aktif alıcı portföyümüz var. 5 dakikalık görüşme için müsait misiniz?"
```

### 2.3 Rate Limiting

Meta'nın kendi limitleri:
- Yeni numara: 1,000 unique users / 24 saat
- Tier 1: 10,000 unique users / 24 saat
- Tier 2: 100,000 unique users / 24 saat
- Tier 3: Sınırsız

**Sistemimizde:**
- Her lead için günlük max mesaj sayısı: 3 (önerilen)
- Aynı lead'e 7 gün içinde max 5 mesaj
- Opt-out olan lead'lere mesaj gönderilmez

---

## 3. KVKK (Türkiye) Uyumluluğu

### 3.1 Veri İşleme İlkeleri

KVKK Madde 5 uyarınca, kişisel verilerin işlenmesi için **açık rıza** gerekir.

**Sistemimizde:**
- `Lead.consentGiven: Boolean` — Onay durumu
- `Lead.consentDate: DateTime` — Onay tarihi
- `Lead.consentMethod: String` — Onay yöntemi ("whatsapp_opt_in", "verbal", "written")
- `Lead.optOutDate: DateTime` — Opt-out tarihi

### 3.2 Onay Alma Akışı

```
1. İlk mesajda onay iste:
   "Merhaba, ilanınızı takip ediyorum. 
    Size uygun alıcılarla buluşmak için iletişim kurmamı onaylıyor musunuz?
    [EVET] [HAYIR]"

2. Kullanıcı "EVET" derse → consentGiven = true
3. "HAYIR" derse → optOutDate = now, status = OPT_OUT
```

### 3.3 Veri Saklama

- `DATA_RETENTION_DAYS` env variable (varsayılan: 365 gün)
- 365 günden eski veriler otomatik silinir (cron job ile)
- Kullanıcı talep ederse verileri hemen silinir

### 3.4 Veri Maskeleme

UI'da hassas veriler maskelenir:
- Telefon: `+90555***567`
- E-posta: `de***@example.com`

`src/lib/utils.ts` → `maskPhone()`, `maskEmail()`

### 3.5 Audit Log

Tüm veri işleme aksiyonları loglanır:
- `AuditLog` tablosu
- Kim, ne zaman, neyi, neden işledi
- IP adresi, user agent
- KVKK denetimleri için kanıt

`src/lib/audit.ts` → `audit()` fonksiyonu

---

## 4. Elektronik Ticari İleti (ETBİ)

### 4.1 Onay

Ticari elektronik ileti göndermek için **alıcının önceden onayı** gerekir.

**Sistemimizde:**
- WhatsApp mesajları "ticari ileti" kapsamında değerlendirilebilir
- Bu nedenle `consentGiven` kontrolü zorunlu
- `CONSENT_REQUIRED=true` ise onay olmadan mesaj gönderilemez

### 4.2 İçerik Kuralları

- Gönderici kimliği açık olmalı
- İletişim amacı belirgin olmalı
- Reddetme (opt-out) mekanizması sunulmalı
- "İstemiyorum" cevabı geldiğinde otomatik opt-out

---

## 5. Sahibinden'in Kendi Mesajlaşma Sistemi

### ⚠️ Dikkat

Sahibinden'in kendi mesajlaşma sistemi üzerinden otomatik mesaj göndermek:
- Sahibinden'in ToS'una aykırı
- Hesap kapatma riski
- 24 saatte max 100 mesaj limiti var

**Sistemimizde:**
- Sahibinden'in mesajlaşma sistemi **kullanılmaz**
- Tüm iletişim WhatsApp Business API üzerinden
- Bu, Sahibinden'in ToS'una %100 uyumlu

---

## 6. Veri Kaynağı Değiştirme

Sistem **Sahibinden'e bağımlı değildir**. Veri kaynağını değiştirmek için:

1. Yeni bir `DataSourceAdapter` implementasyonu yaz
2. `src/services/datasources/index.ts`'e register et
3. UI'da kaynak seçimi ekle

Örnekler:
- Hepsiemlak CSV export → `CsvDataSource` (zaten var)
- Kendi CRM'iniz → `ApiPartnerDataSource`
- Manuel portföy → `ManualDataSource`

---

## 7. Yasal Sorumluluk Reddi

Bu sistem bir **araçtır**. Yasal uyumluluk sorumluluğu kullanıcıya aittir.

**Kullanıcının sorumlulukları:**
- WhatsApp mesajları için alıcıdan onay almak
- KVKK kapsamında veri işleme
- Sahibinden/Hepsiemlak kullanım koşullarına uyum
- Yerel düzenlemelere uyum

**Sistemin sorumlulukları:**
- Teknik olarak yasal yöntemler sunmak
- Onay mekanizması sağlamak
- Audit log tutmak
- Veri maskeleme uygulamak

---

## 8. Kontrol Listesi

### Sistemi Kullanmadan Önce

- [ ] WhatsApp Business API hesabı açıldı
- [ ] Meta'dan onaylı template mesajlar alındı
- [ ] KVKK aydınlatma metni hazırlandı
- [ ] Veri saklama politikası belirlendi
- [ ] Opt-out mekanizması test edildi
- [ ] Audit log aktif

### Her Mesaj Göndermeden Önce

- [ ] Alıcının onayı var mı? (`consentGiven`)
- [ ] Opt-out olmamış mı? (`optOutDate`)
- [ ] 24 saat window kuralına uyuluyor mu?
- [ ] Mesaj içeriği yasal mı?

### Periyodik Kontroller

- [ ] Eski veriler siliniyor mu? (retention policy)
- [ ] Audit log'lar yedekleniyor mu?
- [ ] WhatsApp API limitleri kontrol ediliyor mu?
- [ ] Template mesajlar Meta tarafından onaylı mı?

---

## 9. İletişim

Yasal sorularınız için:
- KVKK: [KVKK Kurumu](https://kvkk.gov.tr)
- WhatsApp Business: [Meta Business Help Center](https://business.facebook.com/business/help)
- Sahibinden ToS: [sahibinden.com/kullanici-sozlesmesi](https://www.sahibinden.com/kullanici-sozlesmesi)

---

**Son güncelleme:** 2026-09-19

> **Not:** Bu doküman hukuki tavsiye değildir. Kesin uyumluluk için bir avukata danışın.