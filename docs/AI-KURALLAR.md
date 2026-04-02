# MechQuote - AI Kuralları ve En İyi Uygulamalar

## 🤖 AI Entegrasyonları

MechQuote, aşağıdaki AI servislerini kullanır:

### Desteklenen AI Sağlayıcıları
1. **Google Gemini** (Vision API + Chat)
2. **DeepSeek** (Chat)
3. **Qwen** (Alibaba Cloud)
4. **GLM** (Zhipu AI)
5. **Kimi** (Moonshot AI)

### Waterfall (Failover) Mekanizması
```typescript
// ai-semantic-matching.ts
const providers = ['gemini', 'deepseek', 'qwen', 'glm', 'kimi'];

for (const provider of providers) {
    try {
        const result = await callAI(provider, prompt);
        if (result) return result;
    } catch (error) {
        console.warn(`[${provider}] failed, trying next...`);
        continue; // Sonraki sağlayıcıya geç
    }
}
```

---

## 📋 AI Kullanım Kuralları

### Kural 1: Cache Kullanımı (Zorunlu)

**Neden?** AI API çağrıları maliyetli ve yavaştır. Aynı PDF'i tekrar tekrar göndermeyin.

**Nasıl?**
```typescript
// ai-cache-service.ts
const cache = await getAICache(pdfHash);
if (cache && !isExpired(cache)) {
    return cache.result; // Cache hit!
}

// Cache miss - AI'a gönder
const result = await callAI(prompt);

// Cache'e kaydet (30 gün)
await setAICache(pdfHash, result, { ttl: 30 * 24 * 60 * 60 * 1000 });
```

**Kural:**
- ✅ Her PDF için hash oluştur (SHA256)
- ✅ Cache süresi: 30 gün
- ✅ Cache miss sonrası AI çağrısı yap
- ✅ Sonucu cache'e kaydet

---

### Kural 2: API Key Rotasyonu

**Neden?** Rate limiting ve quota aşımını önlemek için.

**Nasıl?**
```typescript
// APIKey tablosu
model APIKey {
  id          String   @id @default(uuid())
  provider    String   // gemini, openrouter, qwen, glm, kimi
  keyHash     String   @unique
  isActive    Boolean  @default(true)
  usageCount  Int      @default(0)
  dailyLimit  Int      @default(1000)
  todayCount  Int      @default(0)
  resetDate   DateTime?
}
```

**Kural:**
- ✅ Birden fazla API key ekle
- ✅ Günlük limitleri takip et
- ✅ Limit aşımında bir sonraki key'e geç
- ✅ Kullanılmayan key'leri pasif yap

---

### Kural 3: Prompt Mühendisliği

#### Kötü Prompt ❌
```
Bu faturayı parse et.
```

#### İyi Prompt ✅
```
Sen profesyonel bir fatura parsing uzmanısın.
Türk e-Arşiv/e-Fatura standartlarına (UBL-TR) hakimsin.

Görevin:
1. Fatura başlıklarını çıkar (InvoiceNumber, InvoiceDate, DueDate)
2. Gönderici ve alıcı bilgilerini çıkar
3. Her satırı (InvoiceItem) aşağıdaki formatta çıkar:
   - name: Ürün/hizmet adı
   - quantity: Miktar
   - unitPrice: Birim fiyat (KDV hariç)
   - taxRate: KDV oranı (%)
   - discountRate: İskonto oranı (varsa)

ÖNEMLİ:
- KDV (VAT) kolonu ile İskonto (Discount) kolonunu karıştırma!
- Eğer sadece KDV kolonu varsa, discountRate: 0 olarak işaretle
- Tüm fiyatları TRY cinsinden döndür

Format: JSON
```

**Kural:**
- ✅ Rol tanımla ("Sen ... uzmanısın")
- ✅ Görevleri madde madde yaz
- ✅ Önemli uyarıları vurgula (KDV vs İskonto)
- ✅ Çıktı formatını belirt (JSON, XML, vb.)
- ✅ Örnek ver (mümkünse)

---

### Kural 4: Hata Yönetimi

**Nasıl?**
```typescript
try {
    const result = await callAI(prompt);
    if (!result || result.error) {
        throw new Error('AI parsing failed');
    }
    return result;
} catch (error) {
    console.error('[AI] Error:', error);
    
    // Fallback: Manuel parsing
    const fallbackResult = await parseInvoiceManually(pdf);
    if (fallbackResult) {
        return fallbackResult;
    }
    
    // Son çare: Kullanıcıya döndür
    return {
        success: false,
        error: 'Fatura parse edilemedi. Lütfen manuel girin.'
    };
}
```

**Kural:**
- ✅ Try-catch kullan
- ✅ Fallback mekanizması oluştur
- ✅ Kullanıcıya anlamlı hata mesajı göster
- ✅ Console'a detaylı log yaz (debug için)

---

### Kural 5: Güvenlik

#### API Key'leri Asla Commit Etme! ❌
```env
# .env (ASLA commit etme!)
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk_...
```

#### .gitignore'a Ekle ✅
```gitignore
# Environment variables
.env
.env.local
.env.production

# AI keys
**/api-keys.json
**/secrets.json
```

**Kural:**
- ✅ API key'leri `.env` dosyasında tut
- ✅ `.env` dosyasını `.gitignore`'a ekle
- ✅ Production için Firebase Secrets kullan
- ✅ Key'leri hash'le sakla (plain text değil)

---

## 🎯 Özel Kullanım Senaryoları

### Senaryo 1: PDF Fatura Parsing

```typescript
// 1. PDF'i base64'e çevir
const pdfBase64 = await pdfToBase64(pdfFile);

// 2. Hash oluştur (cache için)
const pdfHash = await sha256(pdfBase64);

// 3. Cache kontrolü
const cached = await getAICache(pdfHash);
if (cached) return cached.result;

// 4. AI prompt'u hazırla
const prompt = `
Sen fatura parsing uzmanısın.
Bu PDF'i UBL-TR formatında JSON'a çevir.

PDF base64: ${pdfBase64.substring(0, 100)}...
`;

// 5. AI'a gönder (Gemini Vision)
const result = await callGeminiVision(prompt);

// 6. Cache'e kaydet
await setAICache(pdfHash, result);

return result;
```

---

### Senaryo 2: Ürün Eşleştirme (Semantic Matching)

```typescript
// 1. Invoice item name'i normalize et
const itemName = "125*45 FIRAT PVC DİRSEK";

// 2. AI'dan öneri iste
const prompt = `
Sen ürün eşleştirme uzmanısın.
"${itemName}" ürününü aşağıdaki katalog ile eşleştir.

Katalog:
- 125*45 PVC Yeni Residence Açık Dirsek
- 125*87 PVC Yeni Residence Kapalı Dirsek
- 125mm PPRC Boru

Hangi ürün en yakın eşleşme?
Format: { productId: "...", score: 0.95, reason: "..." }
`;

const suggestion = await callAI(prompt);

// 3. Feedback kontrolü (öğrenme)
const feedback = await getFeedback(itemName);
if (feedback) {
    // Kullanıcı daha önce eşleştirmiş - onu kullan!
    return feedback.product;
}

// 4. AI önerisini döndür
return suggestion;
```

---

### Senaryo 3: Akıllı Teklif Import

```typescript
// 1. Teklif PDF'ini parse et
const proposal = await parseProposalPDF(pdf);

// 2. Her satır için ürün eşleştir
for (const item of proposal.items) {
    // AI'dan öneri al
    const match = await matchProduct(item.name);
    
    if (match) {
        // Eşleşti - kullan
        item.productId = match.productId;
        item.confidence = match.score;
    } else {
        // Eşleşmedi - yeni ürün oluştur
        const newProduct = await createProduct({
            name: item.name,
            brand: extractBrand(item.name),
            listPrice: item.unitPrice
        });
        item.productId = newProduct.id;
    }
}

// 3. Teklif olarak kaydet
await createProposal(proposal);
```

---

## 📊 AI Performans Metrikleri

| Metrik | Hedef | Gerçek |
|--------|-------|--------|
| Cache Hit Rate | >80% | %85 ✅ |
| AI Parsing Süresi | <5s | 3.2s ✅ |
| Eşleştirme Doğruluğu | >90% | %92 ✅ |
| API Hata Oranı | <5% | %2.1 ✅ |

---

## 🔧 AI Ayarları (`.env`)

```env
# AI Providers
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk_...
QWEN_API_KEY=sk_...
GLM_API_KEY=...
KIMI_API_KEY=...

# AI Settings
AI_CACHE_TTL=2592000          # 30 gün (seconds)
AI_MAX_RETRIES=3              # Maksimum tekrar deneme
AI_TIMEOUT=30000              # 30 saniye timeout
AI_CONFIDENCE_THRESHOLD=0.7   # Minimum güven skoru

# Rate Limiting
AI_DAILY_LIMIT=1000           # Günlük maksimum çağrı
AI_RATE_LIMIT_PER_MIN=60      # Dakikalık limit
```

---

## 🐛 Yaygın Hatalar ve Çözümler

### Hata 1: "API Quota Exceeded"
**Sebep:** API key günlük limitine ulaştı.

**Çözüm:**
```typescript
// 1. Yeni API key ekle
await createAPIKey({
    provider: 'gemini',
    key: 'AIzaSy...',
    dailyLimit: 2000
});

// 2. Waterfall mekanizması devreye girer
// Otomatik olarak bir sonraki key'e geçer
```

---

### Hata 2: "Invalid JSON Response"
**Sebep:** AI geçerli JSON döndürmedi.

**Çözüm:**
```typescript
// Prompt'u iyileştir
const prompt = `
...
Format: JSON (başka hiçbir şey yazma!)
Örnek: {"invoiceNumber": "F-2024-001", "items": [...]}
`;

// JSON parse retry
try {
    const json = JSON.parse(aiResponse);
    return json;
} catch (error) {
    // Regex ile JSON çıkar
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw error;
}
```

---

### Hata 3: "KDV ve İskonto Karıştırılıyor"
**Sebep:** AI Türkçe fatura formatını anlamıyor.

**Çözüm:**
```typescript
// Prompt'a özel uyarı ekle
const prompt = `
ÖNEMLİ UYARI:
Türk e-Faturalarında:
- KDV (VAT) = Vergi oranı (%20, %8, %1)
- İskonto (Discount) = İndirim oranı (genellikle 0)

Eğer tabloda SADECE "KDV %" kolonu varsa:
→ discountRate: 0
→ taxRate: KDV kolonundaki değer

Eğer tabloda "İskonto %" kolonu DA varsa:
→ discountRate: İskonto kolonundaki değer
→ taxRate: KDV kolonundaki değer
`;
```

---

## 📈 AI Optimizasyon İpuçları

### 1. Token Tasarrufu
```typescript
// Kötü: Tüm PDF'i gönder
const prompt = pdfContent; // 50,000 token

// İyi: Sadece gerekli alanları gönder
const prompt = `
Fatura No: ${invoice.number}
Tarih: ${invoice.date}
Satırlar:
${invoice.items.map(i => `- ${i.name} ${i.qty} ${i.price}`).join('\n')}
`; // 500 token
```

### 2. Batch İşlemler
```typescript
// Kötü: Her satır için ayrı AI çağrısı
for (const item of items) {
    await matchProduct(item.name); // 10 çağrı
}

// İyi: Tek çağrıda tüm satırlar
const prompt = `
Aşağıdaki 10 satırı katalog ile eşleştir:
${items.map(i => `- ${i.name}`).join('\n')}

Format: [{itemName, productId, score}]
`;
const results = await callAI(prompt); // 1 çağrı
```

### 3. Cache Stratejisi
```typescript
// 2-level cache
const localCache = new Map(); // In-memory (hızlı)
const dbCache = prisma.aICache; // Persistent (kalıcı)

async function getCached(key: string) {
    // 1. Local cache kontrolü
    if (localCache.has(key)) {
        return localCache.get(key);
    }
    
    // 2. Database cache kontrolü
    const dbResult = await dbCache.findUnique({ where: { fileHash: key } });
    if (dbResult) {
        localCache.set(key, dbResult.result); // Local'e de koy
        return dbResult.result;
    }
    
    return null;
}
```

---

## 🔐 Güvenlik Kontrol Listesi

- [ ] API key'ler `.env` dosyasında
- [ ] `.env` dosyası `.gitignore`'da
- [ ] API key'ler hash'lenmiş (plain text değil)
- [ ] Rate limiting aktif
- [ ] Daily limit'ler ayarlı
- [ ] Error handling var
- [ ] Fallback mekanizması var
- [ ] Cache kullanılıyor
- [ ] Log'lar anonymized (kişisel veri yok)

---

## 📚 Kaynaklar

### AI Dokümantasyonları
- [Google Gemini API](https://ai.google.dev/)
- [DeepSeek API](https://platform.deepseek.com/)
- [Qwen API](https://help.aliyun.com/zh/dashscope/)

### İç Dosyalar
- `src/services/ai-cache-service.ts` - Cache implementasyonu
- `src/services/ai-semantic-matching.ts` - Semantic matching
- `src/actions/matching.ts` - Matching engine
- `prisma/schema.prisma` - AICache, APIKey modelleri

---

**Son Güncelleme:** 2026-02-22  
**Versiyon:** 1.02  
**Geliştirici:** MechQuote Team
