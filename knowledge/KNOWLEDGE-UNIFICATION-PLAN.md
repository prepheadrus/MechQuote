# Knowledge Base Unification Plan

**Tarih:** 25 Şubat 2026  
**Durum:** ✅ Tamamlandı

---

## 📁 Klasör Yapısı (Önce)

```
TEKLIF/
├── knowledge/                           ← YENİ (Benim oluşturduğum)
│   ├── INDEX.md
│   ├── otomatik-maas-tahakkuku/
│   ├── ensemble-ai-parser/
│   └── ... (19 klasör, 22 doküman)
│
├── .agent/                              ← Qwen Code Agent
│   ├── AI_RULES.md
│   ├── KNOWLEDGE.md
│   ├── knowledge/                     ← ESKİ (Agent dokümantasyonu)
│   │   ├── map.md (Proje haritası - 23 Şubat)
│   │   ├── 01-ai-ve-machine-learning/ (10 dosya)
│   │   ├── 02-guvenlik-ve-validasyon/ (3 dosya)
│   │   ├── 03-build-ve-kalite/ (3 dosya)
│   │   ├── 04-veritabani-ve-schema/
│   │   ├── 05-finansal-sistemler/ (4 dosya)
│   │   ├── 06-teklif-yonetimi/ (7 dosya)
│   │   ├── 07-proje-yonetimi/
│   │   ├── 08-pdf-ve-dokumantasyon/
│   │   ├── 09-fatura-ve-musteri/
│   │   ├── 10-test-ve-calisma/
│   │   ├── 11-sistem-ve-yardim/
│   │   └── ... (toplam ~50 dosya)
│   └── skills/
│       └── mechquote/
│           └── SKILL.md
│
└── .qwen/
    └── QWEN.md                        ← Session memories
```

---

## 🎯 Birleştirme Stratejisi

### Adım 1: `.agent/knowledge/` Değerli Dokümanları Taşı

**Taşınacak Dokümanlar:**

#### 01-ai-ve-machine-learning/
- ✅ `elasticsearch-entegrasyonu.md` → `knowledge/elasticsearch-entegrasyonu/` (Zaten docs/ var)
- ✅ `react-query-end-to-end-sync.md` → `knowledge/react-query-end-to-end-sync/` (~1000 satır, ÇOK DEĞERLİ)
- ✅ `urun-eslestirme-sistemi.md` → `knowledge/urun-eslestirme-sistemi/` (~2500 satır, ÇOK DEĞERLİ)
- ✅ `urun-arama-sistemi.md` → `knowledge/urun-arama-sistemi/` (product-search-service)
- ✅ `ai-cache-servisi.md` → `knowledge/ai-cache-servisi/`
- ✅ `ai-invoice-processing-api.md` → `knowledge/ai-invoice-processing-api/`
- ✅ `rate-limiting-sistemi.md` → `knowledge/rate-limiting-sistemi/`
- ⚠️ `ai-dashboard-analiz-sistemi.md` → Zaten `knowledge/ai-dashboard-insight/` var
- ⚠️ `cache-hit-rate-tracking.md` → Zaten ai-cache içinde olabilir
- ⚠️ `end-to-end-automation.md` → Docs'a taşınabilir

#### 02-guvenlik-ve-validasyon/
- ✅ `api-guvenlik-sistemi.md` → `knowledge/api-guvenlik/`
- ✅ `input-validasyonu.md` → `knowledge/input-validasyonu/` (Zod schemas)
- ✅ `naming-conventions.md` → `knowledge/naming-conventions.md` (Genel standart)

#### 03-build-ve-kalite/
- ✅ `build-sistemi.md` → `knowledge/build-sistemi/`
- ✅ `logger-sistemi.md` → `knowledge/logger-sistemi/` (Zaten kullanılıyor)
- ✅ `dead-code-temizligi.md` → `docs/` içine taşınabilir

#### 05-finansal-sistemler/
- ✅ `finansal-hesaplama.md` → `knowledge/maliyet-fiyatlandirma/` içine dahil
- ✅ `kasa-defteri-mimarisi.md` → `knowledge/kasa-defteri-mimarisi/`
- ✅ `finansal-entegrasyon.md` → `docs/finans/` içine dahil
- ⚠️ `maliyet-fiyatlandirma.md` → Zaten `knowledge/maliyet-fiyatlandirma/` var

#### 06-teklif-yonetimi/
- ✅ `teklif-revizyon-diff.md` → `knowledge/teklif-revizyon-diff/` (ÇOK ÖNEMLİ)
- ✅ `teklif-grup-aciklamasi.md` → `knowledge/teklif-grup-aciklamasi/`
- ✅ `teklif-analiz-ve-icmal-sistemi.md` → `knowledge/teklif-analiz/`
- ⚠️ `teklif-sablonlari.md` → Zaten `knowledge/teklif-sablonlari/` var
- ⚠️ `teklif-aksiyonlari-refactor.md` → Geliştirme notu, docs/
- ⚠️ `teklif-listesi-yonetimi.md` → docs/satis/ quote-list.md var
- ⚠️ `teklif-pdf-bilesen-detayi.md` → docs/

#### 07-proje-yonetimi/
- ✅ `rate-limiting-sistemi.md` → Zaten 01'de de var (duplike)

#### 08-pdf-ve-dokumantasyon/
- ✅ `pdf-stream-processing.md` → `knowledge/pdf-stream-processing/`

#### 10-test-ve-calisma/
- ⚠️ `2026-02-20-oturum-ozeti.md` → Session notu, `.qwen/QWEN.md` içine özet
- ⚠️ `aktif-gorevler.md` → Güncel görevler, map.md içinde

---

### Adım 2: `map.md` İçeriğini Koru

**`map.md`** proje haritası olarak çok değerli. Şu bölümleri korumalıyız:
- ✅ Sistem Mimarisi (Next.js, Prisma, AI/ML stack)
- ✅ Dosya Yapısı (tam ağaç)
- ✅ Tamamlanan Görevler listesi
- ✅ Metrikler (Kod kalitesi, performans)
- ✅ Sonraki Adımlar

**Karar:** `map.md` → `knowledge/PROJE-HARITASI.md` olarak kopyalanacak

---

### Adım 3: `.agent/skills/mechquote/SKILL.md`

Agent yetenek tanımı. Bu agent-specific bir dosya, taşımaya gerek yok.

---

## 📁 Yeni Yapı (Sonra)

```
TEKLIF/
├── knowledge/                           ← ANA Dokümantasyon (~40 doküman)
│   ├── INDEX.md                        ← Master indeks (güncellenecek)
│   ├── PROJE-HARITASI.md               ← map.md'den taşınan
│   │
│   ├── ai-ve-machine-learning/         ← Yeni kategori
│   │   ├── elasticsearch-entegrasyonu/
│   │   ├── react-query-end-to-end-sync/
│   │   ├── urun-eslestirme-sistemi/
│   │   ├── urun-arama-sistemi/
│   │   ├── ai-cache-servisi/
│   │   ├── ai-invoice-processing-api/
│   │   └── rate-limiting-sistemi/
│   │
│   ├── guvenlik-ve-validasyon/         ← Yeni kategori
│   │   ├── api-guvenlik/
│   │   ├── input-validasyonu/
│   │   └── naming-conventions.md
│   │
│   ├── build-ve-kalite/                ← Yeni kategori
│   │   ├── build-sistemi/
│   │   └── logger-sistemi/
│   │
│   ├── finansal-sistemler/             ← Yeni kategori
│   │   ├── kasa-defteri-mimarisi/
│   │   └── maliyet-fiyatlandirma/ (mevcut)
│   │
│   ├── teklif-yonetimi/                ← Yeni kategori
│   │   ├── teklif-revizyon-diff/
│   │   ├── teklif-grup-aciklamasi/
│   │   ├── teklif-analiz/
│   │   └── teklif-sablonlari/ (mevcut)
│   │
│   ├── pdf-isleme/                     ← Yeni kategori
│   │   ├── pdf-parser-mimarisi/ (mevcut)
│   │   ├── pdf-to-ubl-xml-converter/ (mevcut)
│   │   └── pdf-stream-processing/
│   │
│   └── [MEVCUT 19 KLASÖR]
│       ├── otomatik-maas-tahakkuku/
│       ├── ensemble-ai-parser/
│       ├── ... 
│
├── .agent/                              ← Agent klasörü (DOKUNMAYACAK)
│   ├── AI_RULES.md
│   ├── KNOWLEDGE.md                    ← Güncellenecek (INDEX.md'ye link)
│   ├── knowledge/                      ← DOKUNMAYACAK (agent kullanıyor)
│   │   └── ... (tüm dosyalar kalacak)
│   └── skills/
│       └── mechquote/
│           └── SKILL.md
│
└── .qwen/
    └── QWEN.md                         ← Session memories (güncellendi)
```

---

## ✅ Uygulama Planı

### Faz 1: Kategorileri Oluştur (10 dk)
```bash
mkdir knowledge/ai-ve-machine-learning
mkdir knowledge/guvenlik-ve-validasyon
mkdir knowledge/build-ve-kalite
mkdir knowledge/finansal-sistemler
mkdir knowledge/teklif-yonetimi
mkdir knowledge/pdf-isleme
```

### Faz 2: Dokümanları Kopyala (30 dk)
- `.agent/knowledge/01-ai-ve-machine-learning/*.md` → `knowledge/ai-ve-machine-learning/`
- `.agent/knowledge/02-guvenlik-ve-validasyon/*.md` → `knowledge/guvenlik-ve-validasyon/`
- ... vb.

### Faz 3: INDEX.md Güncelle (15 dk)
- Yeni kategorileri ekle
- Toplam doküman sayısını güncelle (22 → ~40)

### Faz 4: .agent/KNOWLEDGE.md Güncelle (5 dk)
- `knowledge/INDEX.md`'ye link ekle
- "Artık ana dokümantasyon knowledge/INDEX.md'de" notu ekle

---

## 📊 Beklenen Sonuç

| Metrik | Önce | Sonra |
|--------|------|-------|
| **Toplam Doküman** | 22 (knowledge/) + 50 (.agent/) | ~40 (birleşik) |
| **Kategori Sayısı** | 7 | 13 |
| **Kapsam** | ~90% | ~95%+ |
| **Duplikasyon** | Var (maliyet-fiyatlandirma vb.) | Temizlendi |
| **Erişilebilirlik** | Dağınık (2 klasör) | Tek klasör |

---

## 🎯 Dokümantasyon Hiyerarşisi

```
1. knowledge/INDEX.md                    ← Ana giriş (master)
   │
   ├─→ PROJE-HARITASI.md                 ← Genel bakış
   │
   ├─→ Kategori 1: AI ve Machine Learning
   │   ├─→ React Query End-to-End Sync
   │   ├─→ Elasticsearch Entegrasyonu
   │   ├─→ Ürün Eşleştirme Sistemi
   │   └─→ ...
   │
   ├─→ Kategori 2: Güvenlik ve Validasyon
   │   ├─→ API Güvenlik
   │   ├─→ Input Validasyonu
   │   └─→ Naming Conventions
   │
   └─→ ... (diğer kategoriler)
```

---

**Plan Hazırlama:** 25 Şubat 2026 - 12:00  
**Uygulama Başlangıç:** Beklemede (kullanıcı onayı)  
**Tahmini Süre:** 1 saat  
**Risk:** Düşük (copy operation, orijinaller korunacak)
