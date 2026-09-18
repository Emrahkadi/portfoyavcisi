# Extension Kurulum Rehberi

## 🚀 Hızlı Kurulum (2 dakika)

### Adım 1: Chrome'da Extensions Sayfasını Aç

```
chrome://extensions/
```

### Adım 2: Developer Mode'u Aç

Sağ üstteki **"Developer mode"** toggle'ını aç.

### Adım 3: Extension'ı Yükle

1. **"Load unpacked"** butonuna tıkla
2. Şu klasörü seç:
   ```
   c:\Users\PIT 170\portfolio-intel-platform\extension
   ```
3. **"Select Folder"** tıkla

### Adım 4: Extension'ı Kontrol Et

Extensions listesinde **"Portfolio Intel - Emlak Asistanı"** görmelisin.

## 🎯 İlk Kullanım

### 1. Dev Server'ın Çalıştığından Emin Ol

```bash
cd "c:\Users\PIT 170\portfolio-intel-platform"
npm run dev
```

### 2. Extension'ı Aç

Chrome toolbar'ında Portfolio Intel ikonuna tıkla (puzzle piece ikonu → Portfolio Intel).

### 3. Giriş Yap

- Email: `demo@portfolio-intel.com`
- Şifre: `demo1234`

### 4. Sahibinden'de Gezin

1. [sahibinden.com](https://www.sahibinden.com) aç
2. Bir arama yap (örn: İstanbul, Pendik, Satılık Daire)
3. Arama sonuçları sayfasında ol

### 5. Extension'ı Kullan

1. Extension popup'ını aç
2. Filtreleri ayarla:
   - Şehir: İstanbul
   - İlçe: Pendik
   - Mahalle: (opsiyonel)
3. **"Günlük İlanları Getir"** tıkla
4. Bugün eklenen ilanlar listelenir
5. İlginç ilanların yanındaki **"+ Ekle"** tıkla
6. İlan panele eklenir!

## 📊 Dashboard'da Kontrol Et

[http://localhost:3000/dashboard](http://localhost:3000/dashboard) adresinde yeni eklenen ilanı görebilirsin.

## 🛠️ Sorun mu Var?

**Extension görünmüyor:**
- `chrome://extensions/` → Developer mode açık mı?
- "Load unpacked" ile doğru klasörü seçtin mi?

**"Bağlı değil" gösteriyor:**
- Dev server çalışıyor mu?
- `http://localhost:3000` açılıyor mu?

**İlan bulunamıyor:**
- Sahibinden'de arama sonuçları sayfasında mısın?
- URL'de `/satilik` veya `/arama` var mı?

**Token hatası:**
- Extension popup'ında tekrar giriş yap

---

**Hazır!** Artık Sahibinden'deki günlük ilanları 1 tıkla portföyüne ekleyebilirsin. 🚀