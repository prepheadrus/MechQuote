# MechQuote - AI Haritası (AI Knowledge Map)

> **Son Güncelleme:** 26 Şubat 2026 - OPTIMIZASYON ÇALIŞMALARI (Geri Alındı)
> **Versiyon:** 4.1 (Optimization Experiments)
> **Durum:** ✅ Production-Ready (Classic Stil Korundu)

---

## 🧠 AI Sistem Mimarisi

### AI/ML Stack

```
MechQuote AI System v4.0
├── 1. Fatura İşleme (Invoice Processing)
│   ├── Gemini Vision API (PDF → UBL-TR XML)
│   ├── Ensemble AI Parser (Multi-model)
│   ├── Local PDF Parser (Fallback)
│   └── UBL-TR XML Parser
│
├── 2. Ürün Eşleştirme (Product Matching)
│   ├── String Matching (Levenshtein, Jaccard)
│   ├── Token-Based Matching
│   ├── Critical Keywords Weighting
│   ├── Product Code Normalization
│   ├── Brand/Model Extraction (40+ marka)
│   ├── AI Semantic Matching (Fallback)
│   └── Cache System (50k entry, 24h TTL)
│
├── 3. Ürün Arama (Product Search)
│   ├── Elasticsearch 8.11.0 (Full-text)
│   ├── Turkish Analyzer
│   ├── Fuzzy Matching
│   ├── Highlighting
│   ├── Autocomplete
│   └── Fallback (Prisma)
│
├── 4. Dashboard AI
│   ├── Financial Analysis
│   ├── Operational Metrics
│   ├── Cash Flow Forecast
│   ├── Project Health Monitor
│   └── Email Insights
│
├── 5. Purchasing Insights
│   ├── Price Trend Analysis
│   ├── Supplier Comparison
│   ├── Price Volatility Detection
│   ├── AI Recommendations
│   └── Rule-based Advice (Offline)
│
└── 6. Rate Limiting & Caching
    ├── API Rate Limiting (10/dakika)
    ├── Similarity Cache (50k, 24h)
    ├── Match Result Cache (50k, 24h)
    ├── AI Terminology Cache (10k, 7d)
    └── Auto-cleanup (5 dakika)
```

---

## 📊 AI Metrikleri

### Performans

| Özellik | Metrik | Değer |
|---------|--------|-------|
| **Fatura Parsing** | Gemini Vision | 4-6 sn |
| **Ensemble AI** | 4 Model Parallel | 5-7 sn |
| **String Matching** | 100 kalem | 5s |
| **AI Semantic** | Fallback (düşük confidence) | +15s |
| **Elasticsearch** | Arama (4477 ürün) | 8ms |
| **Ürün Arama** | Basit AND filtre | 50-100ms |
| **Cache Hit Rate** | Similarity Cache | %80-90 |
| **Matching Accuracy** | String + AI | %95-98 |

### Maliyet

| AI Model | Cost/100 items | Kullanım |
|----------|----------------|----------|
| Gemini 1.5 Flash | ~$0.0015 | Primary |
| Qwen 2.5 | ~$0.002 | Fallback |
| GLM Edge | ~$0.0018 | Fallback |
| Kimi | ~$0.002 | Fallback |

**Ortalama maliyet:** $0.0015-0.002 / 100 fatura kalemi

---

## 🗺️ AI Doküman Haritası

### 1. Fatura İşleme (6 doküman)

```
knowledge/
├── pdf-to-ubl-xml-converter/
│   └── artifacts/pdf-to-ubl-xml-converter.md  ← Gemini Vision API
├── ensemble-ai-parser/
│   └── artifacts/ensemble-ai-parser.md        ← Multi-model parsing
├── pdf-parser-mimarisi/
│   └── artifacts/pdf-parser-mimarisi.md       ← Local fallback
├── pdf-isleme/
│   └── pdf-optimizasyonlari.md                ← Optimizasyonlar (YENİ)
├── ai-ve-machine-learning/
│   └── ai-invoice-processing-api.md           ← API route
└── finans/
    └── invoices-ocr.md                        ← OCR detayları
```

**Planlanan Optimizasyonlar (Uygulanmadı):**
- Web Worker ile OCR (ana thread'den izole)
- Sayfa sayfa işleme (bellek dostu)
- Progressive loading UI
- Batch processing (düşük RAM için)

**Kritik Kurallar:**
- KDV vs İskonto ayrımı (ÇOK ÖNEMLİ!)
- Tablo sütun hizalama
- KDV tutarı hesaplama (yoksa formülle)
- Markdown cleanup & XML validation

---

### 2. Ürün Eşleştirme (4 doküman)

```
knowledge/
├── ai-ve-machine-learning/
│   ├── urun-eslestirme-sistemi.md            ← Matching v2.0 (~2500 satır)
│   └── urun-arama-sistemi.md                 ← Basit AND filtre (~600 satır)
├── matching.ts                                ← 812 satır hybrid matching
└── TOPLU-URUN-ESLESTIRME.md                  ← Bulk matching UI
```

**Matching Stratejisi (Sıralı):**
1. Brand Check (CRITICAL) - Farklı marka → 0
2. Product Code Match - Kod eşleşmesi → 0.95
3. Combined Similarity - Token (40%) + Weighted (40%) + Code (20%)
4. AI Semantic (Fallback) - Confidence < 0.8 → AI call
5. Return Best Match - Score >= threshold

---

### 3. Elasticsearch (3 doküman)

```
knowledge/
├── ai-ve-machine-learning/
│   ├── elasticsearch-entegrasyonu.md         ← ~750 satır
│   └── urun-arama-sistemi.md                 ← Product search
└── docs/
    └── ELASTICSEARCH-INTEGRATION.md          ← Full integration
```

**Entegrasyonlar:**
- Products (4477 ürün)
- Customers
- Proposals
- Invoices
- Personnel
- Projects

**Performans:**
- Arama: 150ms → 8ms (18x hızlanma)
- Fuzzy: 500ms → 12ms (41x hızlanma)
- Cache hit: %85+

---

### 4. React Query End-to-End Sync (2 doküman)

```
knowledge/
└── ai-ve-machine-learning/
    └── react-query-end-to-end-sync.md        ← ~1000 satır
```

**7 Entity Hook:**
- use-customers
- use-products
- use-proposals
- use-invoices
- use-projects
- use-personnel
- use-assignments

**Özellikler:**
- Automatic Caching (5 dakika stale)
- Optimistic Updates (0ms UX)
- Background Refetch (auto-sync)
- Retry Logic (exponential backoff)
- DevTools (debug panel)

---

### 5. Dashboard AI (2 doküman)

```
knowledge/
├── ai-dashboard-insight/
│   └── artifacts/ai-dashboard-insight.md     ← AI insight
└── dashboard-analitik/
    └── artifacts/dashboard-analitik.md       ← Analytics
```

**Analiz Alanları:**
- Finansal Tablo (Ciro, Kâr, Marj)
- Operasyonel Durum (Kazanma oranı, hedef gerçekleşme)
- Proje Sağlığı (Bütçe kullanım %)
- Nakit Akışı Öngörüsü (30 günlük)

**Çıktı:**
- Yönetici Özeti (4 bölüm)
- Email ile gönderme
- PDF export (gelecek)

---

### 6. Purchasing Insights (1 doküman)

```
knowledge/
└── purchasing-analysis/
    └── artifacts/purchasing-analysis.md
```

**Özellikler:**
- Son 20 satın alma analizi
- Fiyat trendi (up/down/stable)
- En ucuz tedarikçi tespiti
- Fiyat volatilitesi (%)
- AI önerileri (Gemini)
- Offline destek (rule-based)

---

### 7. Cache & Rate Limiting (4 doküman)

```
knowledge/
├── ai-ve-machine-learning/
│   ├── ai-cache-servisi.md                   ← Cache system
│   ├── ai-cache-ve-batch-processing.md       ← Cache + Batch (YENİ)
│   ├── cache-hit-rate-tracking.md            ← Hit rate tracking
│   └── rate-limiting-sistemi.md              ← API rate limit
└── build-ve-kalite/
    └── logger-sistemi.md                     ← Production logging
```

**Cache Instance:**
- Similarity Cache (50k entry, 24h TTL)
- Match Result Cache (50k entry, 24h TTL)
- AI Terminology Cache (10k entry, 7d TTL)

**Planlanan (Uygulanmadı):**
- AI Cache Servisi (IndexedDB)
- Batch Processing (rate limit önleme)
- Cache + Batch kombinasyonu

**Rate Limiting:**
- AI API: 10/dakika
- Invoice Upload: 5/dakika
- Auto-increment counter (Redis-like)

---

## 🔧 AI Konfigürasyonu

### Environment Variables

```bash
# AI Providers
GEMINI_API_KEY=AIzaSy...
QWEN_API_KEY=sk-...
GLM_API_KEY=...
KIMI_API_KEY=...
DEEPSEEK_API_KEY=...

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=mechquote

# Feature Flags
AI_SEMANTIC_ENABLED=true
ELASTICSEARCH_ENABLED=true
CACHE_TTL_HOURS=24
```

### AI Provider Fallback Sırası

```
1. Gemini 1.5 Flash (Primary) - Hızlı, ucuz
2. Qwen 2.5 (Fallback 1) - Türkçe desteği
3. GLM Edge (Fallback 2) - Orta hız
4. Kimi (Fallback 3) - Yüksek doğruluk
5. DeepSeek (Fallback 4) - Backup
```

---

## 📈 AI Geliştirme Tarihi

### 26 Şubat 2026 - Optimizasyon Çalışmaları (Geri Alındı)
- ⚠️ **Düşük Konfigürasyon Optimizasyonları** - Geliştirildi, sonra iptal edildi
- ⚠️ **AI Cache ve Batch Processing** - Yazıldı, uygulanmadı
- ⚠️ **PDF İşleme Optimizasyonları** - Web Workers, bellek yönetimi
- ⚠️ **Futuristic UI Teması** - Classic ↔ Futuristic tema seçeneği
- ✅ **Belgelendirme** - 3 yeni knowledge base dokümanı
- ✅ **Geri Alma** - Tüm değişiklikler temizlendi, classic stile dönüldü

**Öğrenilen Dersler:**
- Özellik > Optimizasyon (kullanıcı tüm özelliklere erişebilmeli)
- Basitlik > Karmaşıklık (mevcut sistem yeterli)
- Classic stil daha profesyonel bulundu

**Oluşturulan Dokümanlar:**
- `knowledge/build-ve-kalite/dusuk-konfigurasyon-optimizasyonlari.md`
- `knowledge/ai-ve-machine-learning/ai-cache-ve-batch-processing.md`
- `knowledge/pdf-isleme/pdf-optimizasyonlari.md`

### 25 Şubat 2026 - Knowledge Base Birleştirme
- ✅ `.agent/` + `knowledge/` birleştirildi
- ✅ 58+ doküman tek klasörde
- ✅ AI dokümanları: 13 (AI ve Machine Learning)

### 23 Şubat 2026 - Elasticsearch Entegrasyonu
- ✅ Docker Compose (ES 8.11.0 + Kibana)
- ✅ 6 modül entegrasyonu
- ✅ Fallback mechanism
- ✅ ~4000 satır yeni kod

### 23 Şubat 2026 - React Query End-to-End Sync
- ✅ 7 entity hook
- ✅ 5 sayfa migration
- ✅ ~1000 satır dokümantasyon

### 21 Şubat 2026 - Matching System v2.0
- ✅ Token-Based Matching
- ✅ Critical Keywords
- ✅ Brand Extraction (40+ marka)
- ✅ AI Semantic Fallback
- ✅ Hybrid Approach
- ✅ 2500+ satır dokümantasyon

### 20 Şubat 2026 - Güvenlik & Performans
- ✅ Rate Limiting (10/dakika AI)
- ✅ Production Logging
- ✅ Zod Validation (7 schema)
- ✅ Financial Rounding (4 decimals → 2)
- ✅ N+1 Query Optimization

---

## 🎯 AI Sonraki Adımlar

### Kısa Vadeli (1-2 hafta)
- [ ] **AI Cost Tracking** - Aylık AI maliyet raporu
- [ ] **Cache Analytics** - Cache hit/miss dashboard
- [ ] **AI Error Handling** - Better fallback strategies
- [ ] **Prompt Library** - Reusable prompt templates

### Orta Vadeli (1 ay)
- [ ] **ML Model Training** - Historical data ile fine-tuning
- [ ] **User Feedback Loop** - AI doğruluğunu iyileştirme
- [ ] **Multi-language Support** - EN/DE/TR prompt'lar
- [ ] **AI Confidence UI** - Kullanıcıya güven gösterimi

### Uzun Vadeli (3-6 ay)
- [ ] **Custom ML Model** - Fine-tuned transformer
- [ ] **Voice Insights** - Text-to-speech raporlar
- [ ] **Predictive Analytics** - Gelecek tahminleri
- [ ] **Auto-categorization** - Otomatik kategori atama

---

## 📚 AI Dokümantasyon İndeksi

### AI ve Machine Learning (14 doküman)

| Doküman | Konum | Satır | Öncelik |
|---------|-------|-------|---------|
| React Query End-to-End Sync | ai-ve-machine-learning/ | ~1000 | 🔴 |
| Ürün Eşleştirme Sistemi | ai-ve-machine-learning/ | ~2500 | 🔴 |
| Elasticsearch Entegrasyonu | ai-ve-machine-learning/ | ~750 | 🔴 |
| Ensemble AI Parser | ensemble-ai-parser/ | ~350 | 🔴 |
| PDF → UBL-TR XML | pdf-to-ubl-xml-converter/ | ~400 | 🔴 |
| AI Cache ve Batch Processing | ai-ve-machine-learning/ | ~350 | 🟡 (YENİ) |
| Ürün Arama Sistemi | ai-ve-machine-learning/ | ~600 | 🟡 |
| AI Cache Servisi | ai-ve-machine-learning/ | ~200 | 🟡 |
| AI Invoice Processing API | ai-ve-machine-learning/ | ~150 | 🟡 |
| AI Dashboard Insight | ai-dashboard-insight/ | ~244 | 🟡 |
| Rate Limiting Sistemi | ai-ve-machine-learning/ | ~100 | 🟡 |
| Satın Alma Analizi | purchasing-analysis/ | ~117 | 🟡 |
| End-to-End Automation | ai-ve-machine-learning/ | ~100 | 🟡 |
| Cache Hit Rate Tracking | ai-ve-machine-learning/ | ~80 | 🟢 |

**Toplam:** ~6,850+ satır AI dokümantasyonu

### PDF İşleme (1 doküman - YENİ)

| Doküman | Konum | Satır | Öncelik |
|---------|-------|-------|---------|
| PDF Optimizasyonları | pdf-isleme/ | ~350 | 🟡 (YENİ) |

### Build ve Kalite (1 doküman - YENİ)

| Doküman | Konum | Satır | Öncelik |
|---------|-------|-------|---------|
| Düşük Konfigürasyon Optimizasyonları | build-ve-kalite/ | ~400 | 🟡 (YENİ) |

---

## 🔗 Hızlı Linkler

- [Ana İndeks](INDEX.md) - 60+ doküman
- [Proje Haritası](PROJE-HARITASI.md) - Genel bakış
- [Birleştirme Özeti](BIRLESTIRME-OZETI.md) - Knowledge base merge
- [AI Kuralları](agent-dokumantasyon/AI_RULES.md) - Agent protocol
- [Optimizasyon Raporu](build-ve-kalite/dusuk-konfigurasyon-optimizasyonlari.md) - 26 Şubat çalışmaları

---

**Harita Oluşturulma:** 25 Şubat 2026 - AI Haritası v4.0  
**Son Güncelleme:** 26 Şubat 2026 - Optimizasyon Çalışmaları (Geri Alındı)  
**Durum:** ✅ Production-Ready (Classic Stil Korundu)  
**AI Doküman Kapsamı:** ~98%+  
**Toplam Doküman:** 60+ (3 yeni eklendi)
