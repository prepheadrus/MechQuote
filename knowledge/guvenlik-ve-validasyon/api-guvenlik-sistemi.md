# API Güvenlik Sistemi

## 📋 Genel Bakış

**Amaç:** API anahtarlarını güvenli şekilde yönetmek, client-side erişimi önlemek.

**Sorun:** `NEXT_PUBLIC_GEMINI_API_KEY` client-side'da expose ediliyordu.

**Çözüm:** Server-side API route + Server Action pattern.

---

## 🏗️ Mimari

```
┌─────────────────┐
│  Client         │
│  (invoice-uploader.tsx) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Server Action  │
│  (ai-process.ts) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Route      │
│  (/api/ai/process) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini API     │
│  (server-side)  │
└─────────────────┘
```

---

## 📁 Dosyalar

### 1. API Route: `src/app/api/ai/process/route.ts`

**Görev:** Server-side Gemini Vision API çağrısı

**Özellikler:**
- ✅ API key sadece server-side'da
- ✅ Rate limiting (10 istek/dakika)
- ✅ IP-based throttling
- ✅ Error handling
- ✅ JSON validation

**Endpoint:** `POST /api/ai/process`

---

### 2. Server Action: `src/actions/ai-process.ts`

**Görev:** Client'tan gelen istekleri API route'a yönlendirir

**Fonksiyonlar:**
- `processInvoiceWithAI(params)` - Fatura işleme
- `checkAIHealth()` - API key kontrolü

---

### 3. Deprecated: `src/services/gemini-vision-service.ts`

**Durum:** ⚠️ Kullanılmıyor (deprecated)

**Yerine:** `src/actions/ai-process.ts`

---

## 🔒 Güvenlik Önlemleri

### 1. API Key Yönetimi

**Önceki Durum (Güvensiz):**
```typescript
// ❌ .env
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...

// ❌ Client-side
const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
```

**Şu Anki Durum (Güvenli):**
```typescript
// ✅ .env
GEMINI_API_KEY=AIzaSy...

// ✅ Server-side only
const apiKey = process.env.GEMINI_API_KEY;
```

---

### 2. Rate Limiting

```typescript
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 10) {
    return false; // Limit aşıldı
  }
  
  limit.count++;
  return true;
};
```

**Limit:** 10 istek / dakika / IP

---

### 3. Input Validation

```typescript
if (!imageBase64 || typeof imageBase64 !== 'string') {
  return NextResponse.json(
    { success: false, error: 'Geçersiz görüntü verisi' },
    { status: 400 }
  );
}
```

---

## 📊 İyileştirmeler

| Önce | Sonra |
|------|-------|
| ❌ API key client-side expose | ✅ API key sadece server-side |
| ❌ `NEXT_PUBLIC_` prefix | ✅ Sadece `GEMINI_API_KEY` |
| ❌ Rate limiting yok | ✅ 10/dk limit |
| ❌ localStorage'dan okunuyor | ✅ Server-side env kullanımı |

---

## 📅 Güncellemeler

| Tarih | Değişiklik |
|-------|------------|
| 20.02.2026 | İlk oluşturma - Görev #1 tamamlandı |

---

**Oluşturulma:** 20 Şubat 2026 Cuma - 20:30  
**Görev:** #1 - API Key Güvenlik Açığı ✅
