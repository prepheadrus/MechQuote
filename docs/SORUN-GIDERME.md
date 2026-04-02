# 🔧 Sorun Giderme Rehberi

## 🚨 Batch Dosyası Çalışmıyor mu?

### Sorun: Terminal Hemen Kapanıyor

**Sebep:** `npm run dev` komutu ana terminal'i kapatıyor.

**Çözüm:** Artık otomatik düzeltildi! `baslat-gelistirici.bat`:
- ✅ Uygulamayı **yeni bir pencerede** başlatır
- ✅ Ana pencere açık kalır
- ✅ Hataları görebilirsin

---

### Sorun: "Docker Desktop bulunamadı" Hatası

```
[UYARI] Docker Desktop bulunamadı!

Ne yapmak istersiniz?
  1 - Docker Desktop yükle (öneri)
  2 - Elasticsearch olmadan devam et
```

**Çözüm:**

**Seçenek 1 - Docker Kur (Önerilen):**
1. **1** tuşla
2. Docker Desktop indirme sayfası açılır
3. İndir ve kur (5 dakika)
4. Bilgisayarı yeniden başlat
5. `baslat-gelistirici.bat`'ı tekrar çalıştır

**Seçenek 2 - Elasticsearch Olmadan Devam Et:**
1. **2** tuşla
2. Elasticsearch olmadan devam eder
3. Arama daha yavaş çalışır ama sistem çalışır

---

### Sorun: "npm install" Uzun Sürüyor

**İlk kurulumda normal:** 2-5 dakika sürebilir.

**Çözüm:**
- Bekle, ilk kurulumda normal
- Sonraki çalıştırmalarda çok daha hızlı olacak
- `--prefer-offline` flag'i eklendi, cache kullanıyor

---

### Sorun: "Prisma generate" Hatası

```
[UYARI] prisma generate hata verdi
```

**Çözüm:**
```bash
# Manuel olarak dene
npx prisma generate

# Hala hata veriyorsa
npx prisma db push
```

---

### Sorun: "npm run dev" Başlamıyor

**Çözüm:**
```bash
# Manuel başlat
npm run dev

# Port 9002 kullanımda mı kontrol et
netstat -ano | findstr :9002

# Kullanımdaysa, başka bir port kullan
# .env dosyasına ekle: PORT=9003
```

---

## 📊 Test Araçları

### Test Script (Yeni!)

**Çalıştır:**
```bash
.\test-baslatma.bat
```

**Ne yapar:**
- ✅ Node.js kurulu mu?
- ✅ npm çalışıyor mu?
- ✅ Paketler yüklü mü?
- ✅ Prisma kurulu mu?
- ✅ Docker kurulu mu? (opsiyonel)
- ✅ Docker çalışıyor mu?

**Çıktı:**
```
Test 1: Node.js kurulu mu?
[OK] Node.js kurulu

Test 2: npm çalışıyor mu?
[OK] npm çalışıyor

...

TEST TAMAMLANDI!
Elasticsearch ile çalışacak (hızlı arama)
```

---

## 🔍 Elasticsearch Sorunları

### Sorun: "Elasticsearch hazır değil"

```
[UYARI] Elasticsearch hazır değil.
Arama Prisma ile çalışacak.
```

**Çözüm 1 - Docker'ı Yeniden Başlat:**
```bash
npm run docker:down
npm run docker:up

# 30 saniye bekle
timeout /t 30

# Tekrar dene
.\baslat-gelistirici.bat
```

**Çözüm 2 - Logları Kontrol Et:**
```bash
npm run docker:logs
```

**Çözüm 3 - Manuel Import:**
```bash
npm run es:import
```

---

### Sorun: "Index not found" Hatası

**Çözüm:**
```bash
# Tüm index'leri yeniden oluştur
npm run es:import
```

---

### Sorun: "curl" Komutu Bulunamadı

Windows'ta `curl` varsayılan olarak yok.

**Çözüm 1 - PowerShell Kullan:**
```powershell
Invoke-WebRequest http://localhost:9200/_cluster/health
```

**Çözüm 2 - curl İndir:**
```bash
# https://curl.se/windows/ adresinden indir
```

**Çözüm 3 - Batch Dosyasını Güncelle:**
`curl` yerine PowerShell kullanıyoruz, otomatik düzeltildi.

---

## 🛠️ Manuel Komutlar

### Docker İşlemleri

```bash
# Elasticsearch başlat
npm run docker:up

# Elasticsearch durdur
npm run docker:down

# Logları gör
npm run docker:logs

# Health check
npm run es:health
```

### Elasticsearch İşlemleri

```bash
# Veri import et (ilk kurulum)
npm run es:import

# Test et
npx tsx src/scripts/test-elasticsearch.ts

# Cluster health
curl http://localhost:9200/_cluster/health
```

### Prisma İşlemleri

```bash
# Schema generate
npx prisma generate

# Database push
npx prisma db push

# Studio aç
npx prisma studio
```

---

## 📋 Log Dosyaları

### Uygulama Logları

```
# Console çıktısı
baslat-gelistirici.bat penceresi

# Next.js logları
npm run dev çıktısı
```

### Elasticsearch Logları

```bash
# Docker logları
npm run docker:logs

# Veya
docker logs mechquote-elasticsearch
```

---

## 🆘 Acil Durum

### Hiçbir Şey Çalışmıyor!

**Adım 1 - Temiz Başlangıç:**
```bash
# Her şeyi durdur
docker-compose down

# node_modules sil (opsiyonel)
rmdir /s /q node_modules

# Temiz kurulum
npm install
npx prisma generate
npx prisma db push
```

**Adım 2 - Test Et:**
```bash
.\test-baslatma.bat
```

**Adım 3 - Başlat:**
```bash
.\baslat-gelistirici.bat
```

---

### Build Hatası

```
[ERROR] Build failed
```

**Çözüm:**
```bash
# Manuel build dene
npm run build

# Hata mesajını oku
# Genellikle TypeScript hatasıdır

# Tip hatalarını göster
npm run typecheck
```

---

## 💡 İpuçları

1. **Her zaman `test-baslatma.bat` ile başla**
   - Sorunu tespit eder
   - Çözüm önerir

2. **Docker kurulumu önerilir**
   - Elasticsearch %90 daha hızlı
   - Daha iyi arama deneyimi

3. **İlk kurulum sabır gerektirir**
   - npm install: 2-5 dakika
   - ES import: 1-2 dakika
   - Sonraki çalıştırmalar: 10-20 saniye

4. **Hata mesajlarını oku**
   - Batch dosyası ne yapacağını söyler
   - Çoğu sorun otomatik çözülür

---

## 📞 Yardım

**Sorun çözülmedi mi?**

1. `test-baslatma.bat` çalıştır
2. Çıktıyı kaydet
3. Hata mesajlarını kontrol et
4. Docker loglarını kontrol et

**MechQuote** - v3.3 (Elasticsearch Enterprise Search)
