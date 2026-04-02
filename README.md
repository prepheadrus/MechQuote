# MechQuote - Mekanik Tesisat Firmaları için Modern Teklif Yönetim Sistemi

MechQuote, mekanik tesisat, ısıtma, soğutma ve havalandırma (HVAC) sektöründeki firmaların teklif hazırlama, maliyet analizi ve proje yönetimi süreçlerini dijitalleştirmek için tasarlanmış modern bir uygulamadır.

## 🚀 Hızlı Başlangıç

### Windows Kullanıcıları İçin (ÖNERİLEN)

**Tek tıkla başlat!**

1. **Docker Desktop'ı kur** (ilk kurulumda):
   - [Docker Desktop İndir](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)
   - Kur ve bilgisayarı yeniden başlat

2. **Uygulamayı başlat:**
   ```
   Çift tıkla: baslat-gelistirici.bat
   ```

3. **Tarayıcıda aç:**
   - Otomatik açılır: http://localhost:9002

**Bu kadar!** Uygulama çalışıyor.

---

## 📋 Detaylı Kurulum

### 1. Ön Koşullar

| Gereksinim | Sürüm | İndirme Linki |
|------------|-------|---------------|
| **Node.js** | v18.17.0+ | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Son sürüm | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Son sürüm | [git-scm.com](https://git-scm.com/) |

### 2. Projeyi İndir

```bash
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
cd REPO_ADINIZ
```

### 3. Bağımlılıkları Yükle

```bash
npm install
```

### 4. Docker'ı Başlat

**Docker Desktop'ı aç** ve çalıştığından emin ol (sistem tepsisinde Docker simgesi görünmeli).

### 5. Elasticsearch'i Başlat (İlk Kurulumda)

```bash
npm run docker:up
```

**Bekle:** 30-60 saniye (Elasticsearch ve Kibana başlatılıyor)

### 6. Verileri Elasticsearch'e Import Et (İlk Kurulumda)

```bash
npm run es:import
```

**Bekle:** 1-2 dakika (4,492 ürün import ediliyor)

### 7. Veritabanını Hazırla

```bash
npx prisma generate
npx prisma db push
```

### 8. Uygulamayı Başlat

**Geliştirme Modu:**
```bash
npm run dev
```

**Production Modu:**
```bash
npm run build
npm start
```

### 9. Tarayıcıda Aç

```
http://localhost:9002
```

---

## 🎯 Günlük Kullanım

### Her Gün Yapılacak:

**Tek yapman gereken:**
```
Çift tıkla: baslat-gelistirici.bat
```

**Ne olur:**
- ✅ Docker kontrolü
- ✅ Elasticsearch kontrolü
- ✅ Uygulama başlatılır
- ✅ Tarayıcı otomatik açılır

**Kapatmak için:**
- Açılan terminal penceresinde `Ctrl + C`

---

## 📦 Batch Dosyaları

| Dosya | Ne İşe Yarar | Ne Zaman Kullanılır |
|-------|--------------|---------------------|
| **baslat-gelistirici.bat** | Geliştirme modunu başlatır | Her gün, normal kullanım |
| **baslat-production.bat** | Production build başlatır | Canlı ortam için |

---

## 🔧 Mevcut Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (Port 9002) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run docker:up` | Elasticsearch + Kibana başlat |
| `npm run docker:down` | Docker container'ları durdur |
| `npm run es:import` | Verileri Elasticsearch'e import et |
| `npm run es:health` | Elasticsearch sağlık kontrolü |

---

## 🏗️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Backend** | Next.js API Routes, Server Actions |
| **Veritabanı** | SQLite + Prisma ORM |
| **Arama** | Elasticsearch 8.x |
| **UI** | shadcn/ui, Tailwind CSS |
| **State** | React Query (TanStack) |

---

## 📊 Özellikler

### ✅ Teklif Yönetimi
- Akıllı teklif oluşturma
- Revizyon takibi
- Şablon yönetimi
- PDF export

### ✅ Müşteri Yönetimi (CRM)
- Müşteri kayıtları
- Etkileşim geçmişi
- Notlar ve hatırlatmalar

### ✅ Ürün Kataloğu
- 4,492+ ürün
- Kategori bazlı arama
- Elasticsearch ile hızlı arama
- Toplu ürün import

### ✅ Proje Yönetimi
- Proje takibi
- İş atamaları
- Hakediş takibi

### ✅ Finans
- Fatura yönetimi
- Kasa takibi
- Döviz kurları (TCMB)

### ✅ Modüler Component Mimarisi (YENİ!)
- 149 modüler component (35 yeni)
- Ortalama %55 kod azaltma
- Build süresi 47s → 11s (%77 iyileşme)
- Tekrar kullanılabilir component'ler
- Kolay bakım ve test

---

## 🐛 Sorun Giderme

### Docker Çalışmıyor

**Hata:** `Docker Desktop calismiyor!`

**Çözüm:**
1. Docker Desktop'ı aç
2. Sistem tepsisinde Docker simgesini kontrol et
3. Bekle (yeşil ışık yanmalı)
4. Tekrar dene

---

### Elasticsearch Başlamıyor

**Hata:** `Elasticsearch hazir degil`

**Çözüm:**
```bash
# Container'ları yeniden başlat
npm run docker:down
npm run docker:up

# 30 saniye bekle
# Tekrar dene
```

---

### Port 9002 Kullanımda

**Hata:** `Port 9002 is already in use`

**Çözüm:**
```bash
# Port'u kullanan uygulamayı bul
netstat -ano | findstr :9002

# Process'i kapat (PID yerine gerçek PID yaz)
taskkill /F /PID <PID>

# Veya farklı port kullan
# .env dosyasına ekle: PORT=9003
```

---

### Next.js Başlamıyor

**Hata:** `npm run dev` çalışmıyor

**Çözüm:**
```bash
# .next klasörünü sil
rmdir /s /q .next

# Tekrar başlat
npm run dev
```

---

### Elasticsearch Arama Çalışmıyor

**Hata:** Arama sonuçları gelmiyor

**Çözüm:**
```bash
# Elasticsearch health check
curl http://localhost:9200/_cluster/health?pretty

# Status "green" olmalı
# Değilse:
npm run docker:down
npm run docker:up
npm run es:import
```

---

## 📁 Proje Yapısı

```
TEKLIF/
├── baslat-gelistirici.bat    # Geliştirme başlatıcı
├── baslat-production.bat     # Production başlatıcı
├── docker-compose.yml         # Elasticsearch config
├── .env                       # Ortam değişkenleri
├── prisma/
│   ├── schema.prisma         # Veritabanı şeması
│   └── dev.db                # SQLite veritabanı
├── src/
│   ├── app/                  # Next.js pages
│   ├── components/           # React components
│   ├── actions/              # Server actions
│   ├── hooks/                # React hooks
│   └── lib/                  # Utilities
└── docs/                     # Dokümantasyon
```

---

## 🔐 Ortam Değişkenleri

`.env` dosyası:

```env
# Veritabanı
DATABASE_URL="file:./dev.db"

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
USE_ELASTICSEARCH=true

# AI (Opsiyonel)
GEMINI_API_KEY=xxxxx
```

---

## 📞 Destek

**Sorun mu var?**

1. [GitHub Issues](https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ/issues) aç
2. Hata mesajını ekle
3. Ne yaparken olduğunu açıkla

---

## 📝 Lisans

Bu proje [LİSANS ADI] altında lisanslanmıştır.

---

## 🎉 İlk Adımlar

**Yeni başladıysan:**

1. ✅ Docker Desktop kur
2. ✅ `baslat-gelistirici.bat`'a çift tıkla
3. ✅ Tarayıcıda http://localhost:9002 aç
4. ✅ Kullanmaya başla!

**Her şey hazır!** 🚀

---

**Son Güncelleme:** 25 Şubat 2026
**Versiyon:** 3.4 (Modüler Component Mimarisi)
