# 🚀 MechQuote - Başlatma Rehberi

## 📋 Kullanıcı İçin Hızlı Başlangıç

### 🔹 Geliştirici Modu (Normal Kullanım)

**Çift tıkla:** `baslat-gelistirici.bat`

✅ **Otomatik olarak:**
1. Paketleri kontrol eder
2. Veritabanını hazırlar
3. **Elasticsearch'i kontrol eder** (Docker varsa)
4. **İlk kurulumda veri import eder**
5. Uygulamayı başlatır

---

### 🔹 Production Modu (Hızlı Kullanım)

**Çift tıkla:** `baslat-production.bat`

✅ **Otomatik olarak:**
1. Paketleri kontrol eder
2. Veritabanını hazırlar
3. **Elasticsearch'i kontrol eder** (Docker varsa)
4. **İlk kurulumda veri import eder**
5. Uygulamayı derler (build)
6. Production sunucusunu başlatır

---

## 🤔 Elasticsearch Nedir?

Elasticsearch, **süper hızlı arama** yapmak için kullanılan bir sistem.

### Avantajları:

| Özellik | Prisma (Eski) | Elasticsearch (Yeni) |
|---------|---------------|---------------------|
| **Ürün Arama** | 50ms | 5ms (%90 hızlı!) |
| **Yazım Hatası** | Bulamaz ✅ | Otomatik düzeltir ✅ |
| **Eş Anlamlı** | Yok | Var (musluk = vana) |
| **Türkçe Karakter** | Sorunlu | Tam destek |

---

## 📦 İlk Kurulum

### 1. Docker Desktop Gerekli

**İlk çalıştırmada** otomatik sorar:
```
Docker Desktop yüklemek istiyor musunuz? (E/H)
```

**E** dersen:
- Docker Desktop indirme sayfası açılır
- İndir ve kur (5 dakika)
- Bilgisayarı yeniden başlat
- `baslat-gelistirici.bat`'ı tekrar çalıştır

**H** dersen:
- Elasticsearch olmadan devam eder
- Arama daha yavaş çalışır (Prisma ile)

---

### 2. İlk Başlatma

```
[1/6] Paketler kontrol ediliyor...
[2/6] Veritabanı yapısı hazırlanıyor...
[3/6] Veritabanı tabloları kontrol ediliyor...
[4/6] Elasticsearch başlatılıyor...
      → Docker başlatılıyor
      → 30 saniye bekleniyor
      → Elasticsearch hazır!
[5/6] İlk kurulum - Veriler import ediliyor...
      → 4,477 ürün Elasticsearch'e ekleniyor
      → 1-2 dakika sürer
[6/6] Geliştirme sunucusu başlatılıyor...

✅ Uygulama hazır!
```

---

### 3. Sonraki Başlatmalar

```
[1/6] Paketler kontrol ediliyor...
[2/6] Veritabanı yapısı hazırlanıyor...
[3/6] Veritabanı tabloları kontrol ediliyor...
[4/6] Elasticsearch kontrol ediliyor...
      → ✅ Elasticsearch zaten çalışıyor!
[5/6] Geliştirme sunucusu başlatılıyor...

✅ Uygulama hazır!
```

**Artık her şey otomatik!** 🎉

---

## 🔧 Sorun Giderme

### Docker Bulunamadı Hatası

```
[UYARI] Docker Desktop bulunamadı!
```

**Çözüm:**
1. **E** tuşla → Docker Desktop indir
2. Kur ve bilgisayarı yeniden başlat
3. `baslat-gelistirici.bat`'ı tekrar çalıştır

**Veya:**
- **H** tuşla → Elasticsearch olmadan devam et
- Arama yavaş çalışır ama sistem çalışır

---

### Docker Çalışmıyor Hatası

```
[UYARI] Docker Desktop çalışmıyor!
Lütfen Docker Desktop'ı başlatın.
```

**Çözüm:**
1. Docker Desktop'u aç (manuel)
2. 10 saniye bekle
3. `baslat-gelistirici.bat`'ı tekrar çalıştır

---

### Elasticsearch Hazır Değil

```
[UYARI] Elasticsearch hazır değil.
Arama Prisma ile çalışacak.
```

**Çözüm:**
```bash
# Logları kontrol et
npm run docker:logs

# Elasticsearch'i yeniden başlat
npm run docker:down
npm run docker:up

# 30 saniye bekle ve tekrar dene
```

---

### Import Hatası (İlk Kurulumda)

```
[UYARI] Veriler import edilemedi.
```

**Çözüm:**
```bash
# Manuel import
npm run es:import

# Test et
npx tsx src/scripts/test-elasticsearch.ts
```

---

## 📊 Durum Kontrolü

### Elasticsearch Çalışıyor mu?

```bash
# Health check
npm run es:health
```

**Beklenen Çıktı:**
```
✅ Status: GREEN
✅ Elasticsearch is healthy!
✅ Ready for operations
```

---

### Docker Container'lar

```bash
# Çalışan container'ları gör
docker ps
```

**Beklenen Çıktı:**
```
CONTAINER ID   IMAGE                    STATUS
xxx            elasticsearch:8.11.0     Up 2 minutes
yyy            kibana:8.11.0            Up 2 minutes
```

---

### Kibana Dashboard

**Aç:** http://localhost:5601

Burada:
- Elasticsearch verilerini görebilirsin
- Arama yapabilirsin
- Index'leri yönetebilirsin

---

## 🎯 Özet

### Kullanıcı İçin:

| Durum | Ne Yapmalısın? |
|-------|----------------|
| **İlk kurulum** | `baslat-gelistirici.bat` → Docker kur → Bekle |
| **Her gün** | Sadece `baslat-gelistirici.bat` çift tıkla |
| **Docker yok** | **H** tuşla → Elasticsearch olmadan devam et |
| **Hata** | Batch dosyası ne yapman söyleyecek |

---

### Geliştirici İçin:

```bash
# Manuel komutlar
npm run docker:up        # Elasticsearch başlat
npm run docker:down      # Elasticsearch durdur
npm run docker:logs      # Logları gör
npm run es:import        # Veri import et
npm run es:health        # Health check
```

---

## 💡 İpuçları

1. **Docker'ı otomatik başlat:**
   - Docker Desktop ayarları → "Start Docker Desktop when you log in"

2. **Elasticsearch olmadan çalış:**
   - `.env` dosyasına ekle: `USE_ELASTICSEARCH=false`
   - Arama Prisma ile çalışır (yavaş ama çalışır)

3. **Performans:**
   - İlk import 1-2 dakika sürer
   - Sonraki aramalar 5ms (Elasticsearch ile)

4. **Veri koruması:**
   - Elasticsearch verisi Docker volume'de saklanır
   - Docker'ı restart etsen bile veri kaybolmaz

---

**Sorun mu var?**

Batch dosyası seni yönlendirecek. Endişelenme! 😊

**MechQuote** - v3.3 (Elasticsearch Enterprise Search)
