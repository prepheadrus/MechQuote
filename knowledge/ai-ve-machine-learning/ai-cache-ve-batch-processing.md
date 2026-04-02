# AI Cache ve Batch Processing Sistemi

**Tarih:** 26 Şubat 2026  
**Durum:** ❌ Geliştirildi ama Uygulanmadı (Geri Alındı)  
**Versiyon:** 1.0 (Planlanmış)

---

## 📋 Özet

AI API çağrılarını optimize etmek için geliştirilen cache ve batch processing sistemi. Aynı çağrıları önbelleğe alarak API maliyetini düşürmek ve rate limit sorunlarını önlemek amaçlandı.

---

## 🎯 Amaçlar

1. **API Maliyeti Azaltma:**
   - Aynı AI çağrılarını önbelleğe almak
   - Tekrarlayan işlemleri 0 saniyeye indirmek

2. **Rate Limit Önleme:**
   - API çağrılarını gruplar halinde yapmak
   - İstekler arasında delay eklemek

3. **Performans İyileştirme:**
   - Sistem kapasitesine göre batch boyutu ayarlama
   - Düşük RAM'li makinelerde küçük batch'ler

---

## 🏗️ Mimari

### 1. AI Cache Servisi (`src/lib/ai-cache.ts`)

```typescript
// Kullanım örneği
import { withAICache } from '@/lib/ai-cache';

const result = await withAICache(
    'gemini-match',           // Kategori
    prompt,                    // Cache key (prompt)
    async () => await model.generateContent(prompt),
    { ttl: 30 * 24 * 60 * 60 * 1000 } // 30 gün cache
);
```

**Özellikler:**
- IndexedDB tabanlı önbellekleme
- SHA-256 hash ile cache key oluşturma
- TTL (Time To Live) desteği
- Otomatik cleanup (eski kayıtları silme)
- Max cache size limiti

**Cache Akışı:**
```
1. Prompt hash'lenir (SHA-256)
2. IndexedDB'de cache key ile aranır
3. HIT: Cache'den döner (0ms)
4. MISS: AI API çağrılır, sonuca cache'e kaydedilir
```

### 2. Batch Processing (`src/lib/ai-batch.ts`)

```typescript
// Kullanım örneği
import { processWithBatch } from '@/lib/ai-batch';

const results = await processWithBatch(
    products,
    async (product) => await aiMatch(product),
    {
        batchSize: 10,           // 10'arlı gruplar
        delayBetweenBatches: 500, // 500ms bekle
        onProgress: ({ processed, total }) => {
            console.log(`${processed}/${total}`);
        }
    }
);
```

**Özellikler:**
- Otomatik batch boyutu ayarlama
- Batch'ler arası delay
- Progress callback
- Hata yönetimi

**Batch Akışı:**
```
1. Ürün listesi batch'lere bölünür (örn: 50 ürün → 5 batch x 10)
2. Her batch içinde paralel işlem
3. Batch'ler arası delay (rate limit için)
4. Progress güncellemesi
```

### 3. Entegrasyon (`src/services/ai-semantic-matching.ts`)

Güncellenecek dosya:
```typescript
// matchWithGemini fonksiyonu içinde
const result = await withAICache(
    'gemini-match',
    prompt,
    async () => await model.generateContent(prompt),
    { ttl: 30 * 24 * 60 * 60 * 1000 }
);

// batchHybridMatch fonksiyonu içinde
await processWithBatch(items, processor, {
    batchSize: getAIBatchSize(), // Sistem profiline göre
    onProgress
});
```

---

## 📊 Beklenen Performans

### Senaryo: 100 Ürün AI Eşleştirme

**Önce (Cache Yok):**
```
100 ürün × 2s (AI API) = 200s (~3.3 dakika)
API maliyeti: 100 çağrı
Rate limit: Riskli
```

**Sonra (Cache + Batch):**
```
İlk çalıştırma:
- 50 ürün cache MISS → 50 × 2s = 100s
- 50 ürün cache HIT → 50 × 0s = 0s
- Batch delay: 5 batch × 0.5s = 2.5s
- Toplam: ~103s (~1.7 dakika)
- API maliyeti: 50 çağrı (%50 azalma)

İkinci çalıştırma (aynı ürünler):
- 100 ürün cache HIT → 100 × 0s = 0s
- Toplam: ~0s (anında)
- API maliyeti: 0 çağrı (%100 azalma)
```

---

## 🗄️ IndexedDB Schema

```javascript
Database: 'ai-cache'
Version: 1

Store: 'cache'
KeyPath: 'id' (string, hash)
Indexes:
  - timestamp (number, ascending)

Entry Structure:
{
    id: "abc123...",           // SHA-256 hash
    prompt: "Sen profesyonel...", // Orijinal prompt
    response: {...},            // AI response
    timestamp: 1234567890,      // Unix timestamp
    ttl: 2592000000             // 30 gün ms cinsinden
}
```

---

## ⚙️ Konfigürasyon

### Cache Ayarları

```typescript
interface AICacheOptions {
    ttl?: number;              // Default: 7 gün (ms)
    enabled?: boolean;         // Default: true
    maxSize?: number;          // Default: 1000 entry
}
```

### Batch Ayarları

```typescript
interface BatchOptions {
    batchSize?: number;        // Default: sistem profiline göre
    delayBetweenBatches?: number; // Default: 500ms
    onProgress?: (progress: {
        processed: number;
        total: number;
        currentBatch: number;
        totalBatches: number;
    }) => void;
}
```

### Sistem Profili Entegrasyonu

```typescript
// src/lib/system-profile.ts (planlanan)
const config = {
    aiBatchSize: isLowEnd ? 5 : isHighEnd ? 20 : 10,
    maxCacheSizeMB: isLowEnd ? 50 : isHighEnd ? 500 : 200,
};
```

---

## 🔍 Kullanım Örnekleri

### 1. Basit Cache

```typescript
import { withAICache } from '@/lib/ai-cache';

const match = await withAICache(
    'product-match',
    `Eşleştir: "${productName}"`,
    async () => await aiService.match(productName),
    { ttl: 7 * 24 * 60 * 60 * 1000 }
);
```

### 2. Batch Processing

```typescript
import { processWithBatch } from '@/lib/ai-batch';

const results = await processWithBatch(
    invoiceProducts,
    async (product) => {
        return await aiMatch(product, catalogProducts);
    },
    {
        batchSize: 10,
        delayBetweenBatches: 1000,
        onProgress: ({ processed, total }) => {
            updateProgressBar(processed / total);
        }
    }
);
```

### 3. Cache + Batch Kombinasyonu

```typescript
import { processWithCacheAndBatch } from '@/lib/ai-batch';

const results = await processWithCacheAndBatch(
    products,
    (product) => product.name, // Cache key fonksiyonu
    async (product) => await aiAnalyze(product),
    {
        batchSize: 10,
        cacheTTL: 30 * 24 * 60 * 60 * 1000,
        category: 'ai-analysis',
        onProgress: console.log
    }
);
```

---

## 🚨 Hata Yönetimi

### Cache Hataları (Kritik Değil)

```typescript
try {
    const cached = await cache.get(key);
} catch (error) {
    // Cache hatası → null dön, işlem devam etsin
    console.warn('Cache read error:', error);
    return null;
}
```

### Batch Hataları

```typescript
try {
    const results = await processWithBatch(items, processor);
} catch (error) {
    // Batch hatası → kullanıcı bilgilendir
    toast({
        title: 'Batch İşlem Hatası',
        description: error.message,
        variant: 'destructive'
    });
}
```

---

## 📈 Monitoring

### Cache Hit Rate Tracking

```typescript
// Planlanan: cache hit rate'i takip et
let cacheStats = { hits: 0, misses: 0 };

const cached = await cache.get(key);
if (cached) {
    cacheStats.hits++;
} else {
    cacheStats.misses++;
}

const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
console.log(`Cache Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
```

### Batch Performance

```typescript
// Planlanan: batch performans metrikleri
const batchMetrics = {
    totalBatches: 0,
    averageBatchTime: 0,
    totalErrors: 0,
};
```

---

## 🔄 Geri Alma Nedenleri

### 1. Karmaşıklık
- Çok fazla yeni dosya ve bağımlılık
- Comlink kütüphanesi gerekli
- Build konfigürasyonu zorlukları

### 2. Mevcut Sistem Yeterli
- Hybrid matching zaten string-first
- AI_SEMANTIC_ENABLED=false varsayılan
- Elasticsearch isteğe bağlı

### 3. API Maliyeti Zaten Düşük
- Gemini API ücretsiz tier yeterli
- Kullanıcı sayısı az
- Rate limit sorunu yok

### 4. Cache Yönetimi Zorluğu
- Cache invalidation stratejisi yok
- Eski cache'ler temizlenmeli
- Storage quota sorunları olabilir

---

## 📁 Dosyalar

**Oluşturuldu (Sonra Silindi):**
- `src/lib/ai-cache.ts`
- `src/lib/ai-batch.ts`
- `src/lib/system-profile.ts`

**Güncellendi (Sonra Geri Alındı):**
- `src/services/ai-semantic-matching.ts`
- `src/lib/pdf-parser.ts`

**Kuruldu (Sonra Kaldırıldı):**
- `comlink` npm paketi

---

## 🔮 Gelecek Öneriler

Eğer bu sistemi uygularsak:

1. **Aşamalı Rollout:**
   - Önce sadece cache
   - Sonra batch processing
   - En son sistem profili

2. **Monitoring Dashboard:**
   - Cache hit rate grafikleri
   - API maliyet tasarrufu
   - Batch performans metrikleri

3. **Kullanıcı Kontrolü:**
   - Ayarlarda "Cache Temizle" butonu
   - Cache boyutu limiti
   - TTL ayarları

4. **Fallback Stratejisi:**
   - IndexedDB yoksa memory cache
   - Cache hatası → direkt API
   - Graceful degradation

---

**Sonuç:** Cache ve batch processing sistemi geliştirildi ancak uygulanmadı. Mevcut AI sistemi yeterli bulundu.
