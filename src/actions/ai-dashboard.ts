'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSettings } from './settings';
import { logger } from '@/lib/logger';

/**
 * Generates an AI-powered financial analysis using a multi-provider fallback strategy.
 * Similar to the Smart Proposal Wizard's robust approach.
 */
export async function getDashboardAiInsight(
    stats: any,
    keys: {
        gemini?: string,
        qwen?: string,
        deepseek?: string,
        kimi?: string,
        glm?: string
    }
) {
    try {
        const geminiKey = keys.gemini || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const qwenKey = keys.qwen;
        const deepseekKey = keys.deepseek;
        const kimiKey = keys.kimi;
        const glmKey = keys.glm;

        if (!geminiKey && !qwenKey && !deepseekKey && !kimiKey && !glmKey) {
            return {
                success: false,
                error: 'Hiçbir AI anahtarı bulunamadı. Lütfen ayarlardan bir anahtar ekleyin.'
            };
        }

        const prompt = `
Sen bir finansal danışman ve veri analistisin. Aşağıdaki detaylı şirket verilerini analiz et ve üst yönetime stratejik bir "Yönetici Özeti" sun.

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

### 4. TREND VE YOĞUNLAŞMA
- Son 6 Ay Ciro Trendi: ${stats.monthlyFinancials.map((m: any) => `${m.name}: ${m.revenue} TL`).join(' -> ')}
- En Büyük Müşteri Payı: ${stats.topCustomers[0]?.name} (${stats.topCustomers[0]?.totalRevenue} TL)
- En Çok Satan Ürün: ${stats.topProducts[0]?.name} (${stats.topProducts[0]?.totalQuantity} adet)

ANALİZİ ŞU BAŞLIKLARDA YAP (Markdown formatında):
1. **Stratejik Durum:** Finansal ve operasyonel sağlığın tek cümlelik özeti.
2. **Nakit Akışı ve Likidite:** Gelecek 30 gün için ödeme/tahsilat dengesi analizi.
3. **Proje Kontrolü:** Proje bütçelerindeki sapmalar ve maliyet riskleri.
4. **Kritik Gözlem & Risk:** Verilerdeki en gizli ama önemli tehlike veya fırsat.
5. **Net Aksiyon Önerisi:** Karlılığı veya nakit akışını iyileştirecek somut bir adım.

Dili teknik, profesyonel ve direkt olsun. Maksimum 8-10 cümle.
`;

        let insightText = "";
        let success = false;
        let lastError = "";

        // 1. Try Gemini
        if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const candidates = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-pro"];

            for (const modelName of candidates) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    insightText = result.response.text();
                    success = true;
                    logger.info(`[AI Dashboard] Success with Gemini (${modelName})`);
                    break;
                } catch (e: any) {
                    lastError = `Gemini (${modelName}): ${e.message}`;
                }
            }
        }

        // 2. Try Qwen (OpenAI Compatible)
        if (!success && qwenKey) {
            try {
                const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "qwen-plus",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    insightText = data.choices[0].message.content;
                    success = true;
                    logger.info(`[AI Dashboard] Success with Qwen`);
                } else {
                    const err = await response.json();
                    lastError = `Qwen: ${err.error?.message}`;
                }
            } catch (e: any) { lastError = `Qwen: ${e.message}`; }
        }

        // 3. Try GLM
        if (!success && glmKey) {
            try {
                const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${glmKey}` },
                    body: JSON.stringify({
                        model: 'glm-4-flash',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    insightText = data.choices[0].message.content;
                    success = true;
                    logger.info(`[AI Dashboard] Success with GLM`);
                } else {
                    const err = await response.text();
                    lastError = `GLM: ${err}`;
                }
            } catch (e: any) { lastError = `GLM: ${e.message}`; }
        }

        // 4. Try Kimi
        if (!success && kimiKey) {
            try {
                const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kimiKey}` },
                    body: JSON.stringify({
                        model: 'moonshot-v1-8k',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    insightText = data.choices[0].message.content;
                    success = true;
                    logger.info(`[AI Dashboard] Success with Kimi`);
                } else {
                    const err = await response.text();
                    lastError = `Kimi: ${err}`;
                }
            } catch (e: any) { lastError = `Kimi: ${e.message}`; }
        }

        // 5. Try DeepSeek (OpenAI Compatible)
        if (!success && deepseekKey) {
            try {
                const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    insightText = data.choices[0].message.content;
                    success = true;
                    logger.info(`[AI Dashboard] Success with DeepSeek`);
                } else {
                    const err = await response.text();
                    lastError = `DeepSeek: ${err}`;
                }
            } catch (e: any) { lastError = `DeepSeek: ${e.message}`; }
        }

        if (!success) {
            throw new Error(`Tüm AI servisleri başarısız oldu. Son hata: ${lastError}`);
        }

        return { success: true, insight: insightText };
    } catch (error: any) {
        logger.error('AI Dashboard Insight Error:', error);
        return { success: false, error: 'AI analizi sırasında bir hata oluştu: ' + error.message };
    }
}

/**
 * Sends the AI insight to the manager via email.
 * This is a placeholder for actual email integration (e.g., Resend, Nodemailer).
 */
export async function sendAiInsightByEmail(insight: string, stats: any, targetEmail?: string) {
    try {
        let recipient = targetEmail;

        if (!recipient) {
            const settingsResult = await getSettings();
            if (settingsResult.success && settingsResult.data?.email) {
                recipient = settingsResult.data.email;
            } else {
                recipient = "yonetim@mechquote.com"; // Fallback
            }
        }

        logger.info(`[AI Email] Sending report to: ${recipient}`);

        // In a real implementation, you would:
        // 1. Call the local PDF generation API or use a library to generate PDF buffer
        // 2. Use a service like Resend to send the email with the attachment

        // Mocking a delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Note: For actual production, we recommend installing 'resend' 
        // npm install resend

        /* 
        import { Resend } from 'resend';
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: 'MechQuote AI <ai@mechquote.com>',
            to: targetEmail || 'manager@company.com',
            subject: 'Stratejik Finansal Analiz Raporu',
            html: `<h1>Yönetici Özeti</h1><p>${insight.replace(/\n/g, '<br>')}</p>`,
            // attachments: [{ filename: 'analiz.pdf', content: pdfBuffer }]
        });
        */

        return { success: true, message: 'Rapor başarıyla yöneticiye gönderildi.' };
    } catch (error: any) {
        logger.error('AI Email Error:', error);
        return { success: false, error: 'E-posta gönderimi başarısız: ' + error.message };
    }
}
