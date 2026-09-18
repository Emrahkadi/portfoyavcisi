# Portfolio Intel - Chrome Extension

Sahibinden'deki günlük ilanları portföyünüze ekleyen, AI analiz ve WhatsApp mesajı hazırlayan tarayıcı eklentisi.

## 🎯 Özellikler

- ✅ **Yasal**: Otomatik bot YOK, sen tıklarsın
- ✅ **Günlük İlanlar**: Sadece bugün eklenen ilanlar
- ✅ **Bölge Filtresi**: Şehir, ilçe, mahalle seçimi
- ✅ **1 Tıkla Ekleme**: İlanı portföye ekle
- ✅ **Hazır Mesaj Şablonları**: Kişiye özel değişkenler
- ✅ **WhatsApp Entegrasyonu**: Otomatik mesaj gönderimi

## 📦 Kurulum

### 1. Extension'ı Yükle

1. Chrome'da `chrome://extensions/` adresini aç
2. Sağ üstteki **"Developer mode"** aç
3. **"Load unpacked"** tıkla
4. Bu klasörü seç: `extension/`

### 2. Portfolio Intel'in Çalıştığından Emin Ol

Dev server çalışıyor olmalı:
```bash
cd "c:\Users\PIT 170\portfolio-intel-platform"
npm run dev
```

### 3. Extension'ı Kullan

1. Chrome toolbar'daki Portfolio Intel ikonuna tıkla
2. Demo hesabıyla giriş yap:
   - Email: `demo@portfolio-intel.com`
   - Şifre: `demo1234`
3. Filtreleri ayarla (şehir, ilçe)
4. Sahibinden'de bir arama sayfası aç
5. **"Günlük İlanları Getir"** tıkla
6. İlanlar listelenir
7. Her ilanın yanında **"+ Ekle"** butonu var
8. Tıkla → ilan panele eklenir

## 🎨 Kullanım Akışı

```
1. Sahibinden'de gezin (normal, insan gibi)
         ↓
2. Extension popup'ını aç
         ↓
3. Filtreleri ayarla (Pendik/Yenişehir gibi)
         ↓
4. "Günlük İlanları Getir" tıkla
         ↓
5. Bugün eklenen ilanlar listelenir
         ↓
6. İlginç ilanların yanındaki "+ Ekle" tıkla
         ↓
7. İlan panele eklenir, AI analiz başlar
         ↓
8. Dashboard'da ilanı gör, WhatsApp mesajı hazırla
         ↓
9. Mesajı onayla, gönder
```

## 📝 Hazır Mesaj Şablonu

Extension'da mesaj şablonu kaydedebilirsin. Değişkenler:

- `{isim}` — İlan sahibinin adı
- `{ilan_basligi}` — İlan başlığı
- `{ilan_fiyat}` — İlan fiyatı
- `{ilan_url}` — İlan URL'i
- `{agent_name}` — Senin adın

**Örnek şablon:**
```
Merhaba {isim},

{ilan_basligi} üzerine çalıştık. Burası benim uzmanlık bölgem. 
Bizimle çalışmak ister misiniz?

{agent_name}
```

## ⚖️ Yasal Uyumluluk

Bu extension:
- ❌ Otomatik gezinme YAPMAZ
- ❌ Veri çekme YAPMAZ
- ✅ Sadece sen tıkladığında çalışır
- ✅ Sahibinden'in ToS'una %100 uyumlu

**Sen tıklarsın, sistem ekler. Bu tamamen yasal.**

## 🛠️ Geliştirme

Extension'ı geliştirmek için:

1. `extension/` klasöründe dosyaları düzenle
2. `chrome://extensions/` → "Reload" tıkla
3. Test et

### Dosya Yapısı

```
extension/
├── manifest.json          # Extension manifest
├── popup/
│   ├── popup.html         # Ana UI
│   ├── popup.js           # UI logic
│   └── popup.css          # Stiller
├── content/
│   ├── content.js         # Sahibinden sayfa analizi
│   └── content.css        # Content stilleri
├── background/
│   └── background.js      # API iletişimi
└── icons/
    └── icon-*.png         # Extension ikonları
```

## 📊 API Endpoint'leri

Extension şu endpoint'leri kullanır:

- `POST /api/extension/auth` — Giriş
- `POST /api/extension/add-listing` — İlan ekle
- `POST /api/extension/send-message` — Mesaj gönder

## 🐛 Sorun Giderme

**"Bağlı değil" gösteriyor:**
- Dev server çalışıyor mu? `http://localhost:3000`
- CORS ayarları kontrol et

**"İlan bulunamadı":**
- Sahibinden'de doğru sayfada mısın? (arama sonuçları)
- Filtreler doğru mu?

**"Token geçersiz":**
- Tekrar giriş yap
- Token 7 gün geçerli

---

**Son güncelleme:** 2026-09-19