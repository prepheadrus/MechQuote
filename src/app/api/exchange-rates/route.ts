
import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { rateLimit } from '@/lib/rate-limit';

// Döviz kurları için rate limit: 30 istek/dakika
const EXCHANGE_LIMIT = { limit: 30, window: 60 };

export async function GET(request: Request) {
    // Rate limiting (basit - IP yok, sadece istek sayısı)
    // Production'da IP-based rate limit kullan

    try {
        // TCMB sometimes blocks standard Fetch headers, adding a dummy User-Agent
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`TCMB sunucusuna ulaşılamadı. HTTP ${response.status}`);
        }

        const xmlText = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
        });

        const jsonObj = parser.parse(xmlText);

        if (!jsonObj?.Tarih_Date?.Currency) {
            throw new Error('XML verisi beklenen formatta değil (Tarih_Date.Currency bulunamadı).');
        }

        const currencies = Array.isArray(jsonObj.Tarih_Date.Currency)
            ? jsonObj.Tarih_Date.Currency
            : [jsonObj.Tarih_Date.Currency];

        const findRate = (code: string) => {
            const currency = currencies.find((c: any) =>
                c['@_Kod'] === code || c['Kod'] === code || c['@_CurrencyCode'] === code || c['CurrencyCode'] === code
            );
            // TCMB exposes Buying, Selling, ForexBuying, ForexSelling. We usually want ForexSelling.
            return currency?.ForexSelling || currency?.ForexBuying || currency?.Selling || currency?.Buying;
        };

        const usdRateRaw = findRate('USD');
        const eurRateRaw = findRate('EUR');

        if (!usdRateRaw || !eurRateRaw) {
            throw new Error(`USD veya EUR bulunamadı. USD: ${usdRateRaw || 'Eksik'}, EUR: ${eurRateRaw || 'Eksik'}`);
        }

        const USD = typeof usdRateRaw === 'number' ? usdRateRaw : parseFloat(String(usdRateRaw).replace(',', '.'));
        const EUR = typeof eurRateRaw === 'number' ? eurRateRaw : parseFloat(String(eurRateRaw).replace(',', '.'));

        if (isNaN(USD) || isNaN(EUR)) {
            throw new Error(`Sayı dönüşüm hatası. USD: ${usdRateRaw}, EUR: ${eurRateRaw}`);
        }

        return NextResponse.json({ USD, EUR, source: 'TCMB', date: jsonObj.Tarih_Date['@_Date'] });

    } catch (error: any) {
        console.error("Exchange Rate API Error:", error.message);
        return NextResponse.json(
            { error: 'Kurlar alınamadı.', details: error.message },
            { status: 500 }
        );
    }
}

// Ensure this route is always processed dynamically
export const dynamic = 'force-dynamic';
