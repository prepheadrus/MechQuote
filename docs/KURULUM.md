# 📦 MechQuote - Kurulum Rehberi

Bu rehber, MechQuote uygulamasını ilk kez kuracak kullanıcılar için adım adım talimatlar içerir.

---

## ⚡ Hızlı Kurulum (5 Dakika)

### Adım 1: Docker Desktop Kur

**Neden gerekli?** Elasticsearch (hızlı arama) için Docker gerekiyor.

1. **İndir:**
   - [Docker Desktop for Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)
   - Tıkla ve indir (yaklaşık 500 MB)

2. **Kur:**
   - İndirdiğin dosyayı çalıştır
   - "Next" → "Next" → "Install" → "Finish"
   - Bilgisayarı **yeniden başlat**

3. **Kontrol et:**
   - Docker Desktop'u aç
   - Sistem tepsisinde (saat yanı) Docker simgesi görünmeli
   - Yeşil ışık yanmalı

---

### Adım 2: Node.js Kur

**Neden gerekli?** Next.js uygulaması için Node.js gerekiyor.

1. **İndir:**
   - [Node.js LTS](https://nodejs.org/) (v18 veya üzeri)
   - "LTS" sürümünü indir

2. **Kur:**
   - İndirdiğin dosyayı çalıştır
   - Varsayılan ayarlarla kur

3. **Kontrol et:**
   ```bash
   node --version
   # v18.x.x veya üzeri olmalı
   ```

---

### Adım 3: Projeyi İndir

1. **GitHub'dan indir:**
   - Yeşil "Code" butonuna tıkla
   - "Download ZIP" seç
   - ZIP'i çıkar

2. **Veya Git ile:**
   ```bash
   git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
   cd REPO_ADINIZ
   ```

---

### Adım 4: İlk Başlatma

**Çift tıkla:**
```
baslat-gelistirici.bat
```

**Ne olacak:**
1. ✅ Docker kontrolü (otomatik)
2. ✅ Elasticsearch başlatma (otomatik)
3. ✅ Uygulama başlatma (otomatik)
4. ✅ Tarayıcı açılma (otomatik)

**İlk kurulumda ekstra adımlar:**

#### A) npm install (5-10 dakika)
```bash
npm install
```

#### B) Elasticsearch import (2 dakika)
```bash
npm run es:import
```

#### C) Veritabanı hazırlığı (1 dakika)
```bash
npx prisma generate
npx prisma db push
```

---

## ✅ Kurulum Tamamlandı!

Artık her gün sadece şunu yap:

```
Çift tıkla: baslat-gelistirici.bat
```

---

## 🔍 Detaylı Kurulum (Alternatif)

### Manuel Başlatma

Batch dosyası yerine komutlarla başlatmak istersen:

```bash
# 1. Docker'ı başlat
npm run docker:up

# 2. 30 saniye bekle
timeout /t 30

# 3. Elasticsearch import (ilk kurulumda)
npm run es:import

# 4. Veritabanı hazırlığı
npx prisma generate
npx prisma db push

# 5. Uygulamayı başlat
npm run dev
```

---

## 🐛 Sorun Giderme

### ❌ "Docker Desktop çalışmıyor"

**Sebep:** Docker Desktop açık değil.

**Çözüm:**
1. Docker Desktop'u aç
2. Sistem tepsisinde yeşil ışığı bekle
3. Tekrar dene

---

### ❌ "Elasticsearch hazır değil"

**Sebep:** Elasticsearch henüz başlamadı.

**Çözüm:**
```bash
# Container'ları yeniden başlat
npm run docker:down
npm run docker:up

# 30 saniye bekle
timeout /t 30

# Health check
curl http://localhost:9200/_cluster/health?pretty

# Status "green" olmalı
```

---

### ❌ "Port 9002 kullanımda"

**Sebep:** Başka bir uygulama 9002 portunu kullanıyor.

**Çözüm 1 - Port'u bul ve kapat:**
```bash
# Hangi uygulama kullanıyor?
netstat -ano | findstr :9002

# PID'yi buldun, kapat
taskkill /F /PID <PID>
```

**Çözüm 2 - Farklı port kullan:**
```bash
# .env dosyasını aç
# Ekle:
PORT=9003

# Tekrar başlat
npm run dev
```

---

### ❌ "npm install hata veriyor"

**Sebep:** Node.js sürümü eski veya internet bağlantısı yok.

**Çözüm:**
1. Node.js sürümünü kontrol et:
   ```bash
   node --version
   # v18.x.x veya üzeri olmalı
   ```

2. Node.js'i güncelle:
   - [nodejs.org](https://nodejs.org/) adresinden son sürümü indir

3. Tekrar dene:
   ```bash
   npm install --prefer-offline
   ```

---

### ❌ "Prisma db push başarısız"

**Sebep:** Veritabanı dosyası kilitli veya bozuk.

**Çözüm:**
```bash
# dev.db dosyasını sil
del prisma\dev.db

# Tekrar oluştur
npx prisma db push

# Seed data yükle (opsiyonel)
npx prisma db seed
```

---

## 📊 Performans İpuçları

### İlk Kurulum Sonrası Hızlandırma

**npm install hızlandır:**
```bash
npm install --prefer-offline
```

**Build cache kullan:**
```bash
# Build yap
npm run build

# Sonraki seferlere hızlı başlat
npm start
```

---

## 🎯 Günlük Kullanım

### Sabah:

```
1. Bilgisayarı aç
2. Docker Desktop otomatik başlar (ayarlandıysa)
3. Çift tıkla: baslat-gelistirici.bat
4. Tarayıcı açılır
```

### Akşam:

```
1. Next.js terminal penceresini kapat (Ctrl + C)
2. Docker Desktop'u kapat (opsiyonel)
3. Bilgisayarı kapat
```

---

## 📞 Yardım

**Sorun çözülmedi mi?**

1. **README.md** dosyasını oku
2. **docs/SORUN-GIDERME.md** dosyasını oku
3. **GitHub Issues** aç
4. **Discord/Slack** grubuna katıl

---

## ✅ Kurulum Kontrol Listesi

İlk kurulumdan sonra bunları kontrol et:

- [ ] Docker Desktop çalışıyor
- [ ] Elasticsearch container çalışıyor (`docker ps`)
- [ ] Next.js server çalışıyor (Port 9002)
- [ ] Tarayıcıda http://localhost:9002 açılıyor
- [ ] Dashboard görünüyor
- [ ] Arama çalışıyor (bir ürün ara)

**Hepsi ✅ ise:** Kurulum başarılı! 🎉

---

**Son Güncelleme:** 25 Şubat 2026
**Versiyon:** 3.3
