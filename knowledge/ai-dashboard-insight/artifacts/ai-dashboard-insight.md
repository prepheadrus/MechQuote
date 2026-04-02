# AI Dashboard Insight Sistemi

## Genel Bakış

MechQuote'un AI destekli dashboard analiz sistemi, yönetim panelindeki finansal ve operasyonel verileri AI modelleri ile analiz ederek üst yönetime stratejik "Yönetici Özeti" sunar.

**Dosya:** `src/actions/ai-dashboard.ts` (244 satır)

---

## Özellikler

- ✅ **Çoklu AI Model Desteği:** Gemini, Qwen, DeepSeek, Kimi, GLM (fallback mekanizması)
- ✅ **Finansal Analiz:** Ciro, kâr, kâr marjı analizi
- ✅ **Operasyonel Metrikler:** Kazanma oranı, aylık hedef gerçekleşme
- ✅ **Proje Sağlık İzleyicisi:** Bütçe kullanım oranları ve durum tespiti
- ✅ **Nakit Akışı Öngörüsü:** 30 günlük gelir/gider tahmini
- ✅ **Email Entegrasyonu:** AI insight'ı email ile gönderme

---

## API Referansı

### `getDashboardAiInsight`

```typescript
async function getDashboardAiInsight(
  stats: {
    financials: {
      totalRevenue: number;      // Toplam ciro
      totalProfit: number;       // Toplam kâr
      margin: number;            // Kâr marjı (%)
    };
    operationalStats: {
      winRate: number;           // Kazanma oranı (%)
    };
    monthlyTarget: {
      realizedAmount: number;
      targetAmount: number;
    };
    projectHealth: Array<{
      name: string;
      percentage: number;        // Bütçe kullanım %
      status: string;
    }>;
    dashboardStats: {
      forecast?: Array<{
        income: number;
        expense: number;
      }>;
    };
  },
  keys: {
    gemini?: string;
    qwen?: string;
    deepseek?: string;
    kimi?: string;
    glm?: string;
  }
): Promise<{
  success: boolean;
  insight?: string;  // AI tarafından üretilen analiz metni
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { getDashboardAiInsight } from '@/actions/ai-dashboard';

const stats = {
  financials: {
    totalRevenue: 1250000,
    totalProfit: 187500,
    margin: 15.0
  },
  operationalStats: {
    winRate: 68.5
  },
  monthlyTarget: {
    realizedAmount: 850000,
    targetAmount: 1000000
  },
  projectHealth: [
    { name: 'ABC Projesi', percentage: 85.3, status: 'warning' },
    { name: 'XYZ Projesi', percentage: 45.2, status: 'normal' }
  ],
  dashboardStats: {
    forecast: [
      { income: 150000, expense: 80000 },
      { income: 200000, expense: 120000 }
    ]
  }
};

const result = await getDashboardAiInsight(stats, {
  gemini: process.env.GEMINI_API_KEY,
  qwen: process.env.QWEN_API_KEY
});

if (result.success) {
  console.log(result.insight);
  // "Sayın Yönetici,
  // 
  // FİNANSAL PERFORMANS:
  // Toplam cironuz 1,250,000 TL olup, 187,500 TL kâr elde edilmiştir..."
}
```

---

### `sendAiInsightByEmail`

AI insight'ını email olarak gönderir.

```typescript
async function sendAiInsightByEmail(
  insight: string,
  stats: any,
  targetEmail?: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

---

## AI Prompt Yapısı

### Sistem Prompt'u

```typescript
const prompt = `
Sen bir finansal danışman ve veri analistisin. Aşağıdaki detaylı şirket verilerini 
analiz et ve üst yönetime stratejik bir "Yönetici Özeti" sun.

### 1. GENEL FİNANSAL TABLO
- Toplam Ciro: ${stats.financials.totalRevenue} TL
- Toplam Kâr: ${stats.financials.totalProfit} TL
- Kar Marjı: %${stats.financials.margin.toFixed(2)}
- Kazanma Oranı: %${stats.operationalStats.winRate.toFixed(2)}
- Aylık Hedef Gerçekleşme: %${((stats.monthlyTarget.realizedAmount / stats.monthlyTarget.targetAmount) * 100).toFixed(1)}

### 2. PROJE DURUMLARI (BÜTÇE VS GERÇEKLEŞEN)
${stats.projectHealth.map((p: any) => `- ${p.name}: %${p.percentage.toFixed(1)} bütçe kullanımı (${p.status})`).join('\n')}

### 3. NAKİT AKIŞI ÖNGÖRÜSÜ (30 GÜNLÜK)
- Beklenen Toplam Giriş: ${stats.dashboardStats.forecast?.reduce((sum: number, f: any) => sum + f.income, 0) || 0} TL
- Planlanan Toplam Ödeme: ${stats.dashboardStats.forecast?.reduce((sum: number, f: any) => sum + f.expense, 0) || 0} TL

### ÇIKTI FORMATI:
1. FİNANSAL PERFORMANS (Ciro, Kâr, Marj analizi)
2. OPERASYONEL DURUM (Teklif kazanma, proje sağlığı)
3. NAKİT AKIŞI UYARILARI
4. STRATEJİK ÖNERİLER (Kısa ve uygulanabilir)

ÖNEMLİ:
- Pozitif trendleri vurgula
- Riskli durumları (>%80 bütçe kullanımı) açıkça belirt
- Somut, uygulanabilir öneriler ver
- Profesyonel ama anlaşılır dil kullan
`;
```

---

## Kullanım Senaryoları

### Senaryo 1: Dashboard Yönetici Özeti

```typescript
// app/dashboard/ai-insight-card.tsx
'use client';

import { useState } from 'react';
import { getDashboardAiInsight } from '@/actions/ai-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

export function AiInsightCard({ stats }: { stats: any }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  
  const generateInsight = async () => {
    setLoading(true);
    const result = await getDashboardAiInsight(stats, {
      gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY
    });
    
    if (result.success) {
      setInsight(result.insight || null);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Yönetici Özeti
        </CardTitle>
        <Button
          onClick={generateInsight}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Oluştur'}
        </Button>
      </CardHeader>
      <CardContent>
        {insight ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {insight}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Dashboard verilerinizi AI ile analiz etmek için "Oluştur" butonuna tıklayın.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Senaryo 2: Email ile Insight Gönderme

```typescript
// app/dashboard/send-insight-email.tsx
'use client';

import { useState } from 'react';
import { sendAiInsightByEmail } from '@/actions/ai-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

export function SendInsightEmail({ insight, stats }: { insight: string; stats: any }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSend = async () => {
    if (!email || !insight) return;
    
    setSending(true);
    const result = await sendAiInsightByEmail(insight, stats, email);
    
    if (result.success) {
      toast.success(`AI analizi ${email} adresine gönderildi`);
      setEmail('');
    } else {
      toast.error(result.error);
    }
    setSending(false);
  };
  
  return (
    <div className="flex gap-2 items-center">
      <Input
        type="email"
        placeholder="yonetici@sirket.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="max-w-xs"
      />
      <Button onClick={handleSend} disabled={sending || !insight}>
        <Mail className="h-4 w-4 mr-2" />
        Gönder
      </Button>
    </div>
  );
}
```

---

### Senaryo 3: Otomatik Haftalık Rapor

```typescript
// app/api/cron/weekly-insight/route.ts
import { NextResponse } from 'next/server';
import { getDashboardAiInsight } from '@/actions/ai-dashboard';
import { getDashboardStats } from '@/actions/dashboard-actions';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: Request) {
  // Auth kontrolü (cron secret)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Dashboard verilerini topla
  const stats = await getDashboardStats();
  
  // AI analizi oluştur
  const insightResult = await getDashboardAiInsight(stats, {
    gemini: process.env.GEMINI_API_KEY
  });
  
  if (insightResult.success) {
    // Yöneticilere email gönder
    const managers = ['ceo@company.com', 'cfo@company.com'];
    
    for (const manager of managers) {
      await sendEmail({
        to: manager,
        subject: 'Haftık Yönetici Özeti - MechQuote',
        html: `
          <h1>Haftalık AI Analizi</h1>
          <pre style="font-family: sans-serif; font-size: 14px;">
            ${insightResult.insight}
          </pre>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            Bu rapor MechQuote AI tarafından otomatik olarak oluşturulmuştur.
          </p>
        `
      });
    }
  }
  
  return NextResponse.json({ success: true });
}
```

---

## Multi-Provider Fallback Stratejisi

```typescript
// AI provider fallback sırası
const providers = [
  { name: 'Gemini', key: geminiKey, priority: 1 },
  { name: 'Qwen', key: qwenKey, priority: 2 },
  { name: 'DeepSeek', key: deepseekKey, priority: 3 },
  { name: 'Kimi', key: kimiKey, priority: 4 },
  { name: 'GLM', key: glmKey, priority: 5 }
];

// İlk mevcut provider'ı kullan
const availableProvider = providers.find(p => p.key);

if (!availableProvider) {
  return {
    success: false,
    error: 'Hiçbir AI anahtarı bulunamadı. Lütfen ayarlardan bir anahtar ekleyin.'
  };
}
```

---

## Çıktı Formatı Örneği

```
Sayın Yönetici,

FİNANSAL PERFORMANS
═══════════════════════════════════════════════════════

✓ Toplam cironuz 1,250,000 TL olup, 187,500 TL kâr elde edilmiştir.
✓ Kâr marjınız %15.00 ile sektör ortalamasının üzerindedir.
✓ Teklif kazanma oranınız %68.5 ile sağlıklı seviyededir.

⚠ Aylık hedef gerçekleşmeniz %85.0 - ay sonuna kadar %15'lik kısım bekliyor.

PROJE SAĞLIK DURUMU
═══════════════════════════════════════════════════════

🔴 ABC Projesi: %85.3 bütçe kullanımı (UYARI - Kritik seviyeye yakın)
🟢 XYZ Projesi: %45.2 bütçe kullanımı (Normal)

NAKİT AKIŞI ÖNGÖRÜSÜ (30 GÜNLÜK)
═══════════════════════════════════════════════════════

✓ Beklenen toplam giriş: 350,000 TL
✓ Planlanan toplam ödeme: 200,000 TL
✓ Net nakit akışı: +150,000 TL (Pozitif)

STRATEJİK ÖNERİLER
═══════════════════════════════════════════════════════

1. ABC Projesi'nde bütçe aşımı riski var. Acilen maliyet kontrolü yapın.
2. Kâr marjınızı %18'e çıkarmak için tedarikçi müzakerelerini gözden geçirin.
3. Aylık hedefi tutturmak için bu hafta en az 2 teklif daha kapatın.
4. Pozitif nakit akışını değerlendirerek erken ödeme iskontolarını kullanın.

───────────────────────────────────────────────────────
Bu rapor MechQuote AI tarafından otomatik olarak oluşturulmuştur.
```

---

## Sorun Giderme

### Hata: "Hiçbir AI anahtarı bulunamadı"

**Sebep:** Hiçbir API key tanımlanmamış.

**Çözüm:**
```typescript
// .env dosyasına ekle
GEMINI_API_KEY=AIzaSy...

// VEYA Settings sayfasından API key gir
```

---

### Hata: "AI yanıt oluşturamadı"

**Sebep:** API hatası veya timeout.

**Çözüm:**
```typescript
// Timeout süresini artır
const response = await fetch('https://api.gemini.ai/...', {
  signal: AbortSignal.timeout(30000) // 30 saniye
});
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/ai-dashboard.ts` | Ana AI insight fonksiyonları |
| `src/app/dashboard/page.tsx` | Dashboard (entegrasyon) |
| `src/actions/dashboard-actions.ts` | Dashboard veri toplama |

---

## Gelecek Geliştirmeler

- [ ] **Görsel Rapor:** AI insight'ı PDF olarak oluşturma
- [ ] **Sesli Özet:** Text-to-speech ile sesli rapor
- [ ] **Karşılaştırmalı Analiz:** Önceki dönemlerle karşılaştırma
- [ ] **Özelleştirilebilir Prompt:** Kullanıcı kendi prompt'unu yazabilsin
- [ ] **Çoklu Dil:** İngilizce, Almanca destek

---

**Son Güncelleme:** 25 Şubat 2026  
**Durum:** ✅ Dokümante Edildi
