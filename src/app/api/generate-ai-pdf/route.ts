import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { rateLimit } from '@/lib/rate-limit';

// Puppeteer için rate limit: 5 istek/dakika (pahalı işlem)
const PUPPETEER_LIMIT = { limit: 5, window: 60 };

export async function POST(request: NextRequest) {
    // Rate limiting
    const limited = await rateLimit(request, PUPPETEER_LIMIT);
    if (limited) {
        return NextResponse.json(
            { error: 'Çok fazla istek. Lütfen bekleyin.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { insight, stats } = body;

        if (!insight) {
            return NextResponse.json({ error: 'Insight is required' }, { status: 400 });
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Construct the URL to the print page
        const protocol = request.nextUrl.protocol;
        const host = request.nextUrl.host;
        const statsEncoded = encodeURIComponent(JSON.stringify(stats));
        const insightEncoded = encodeURIComponent(insight);

        // We use a POST body usually, but Puppeteer needs a URL. 
        // For simplicity, we'll use a hidden route or pass minimal data.
        // Actually, we can use page.setContent if we want to be faster, but let's use the route we created.
        const printUrl = `${protocol}//${host}/dashboard-content/print-ai-analysis?headless=true`;

        // We can pass data via local storage or a session cookie, but URL is simplest for Puppeteer if not too long.
        // However, AI insights can be long. Let's use page.evaluate to inject data.

        await page.goto(printUrl, { waitUntil: 'networkidle0' });

        await page.evaluate((insight, stats) => {
            // This is a bit hacky but works: we find the component and update its state or just overwrite the DOM
            // Better: The page.tsx should listen for a window message or check a global variable
            (window as any).__AI_DATA__ = { insight, stats };
            // Trigger a re-render if it's a simple React app, or just wait for the page to handle it.
        }, insight, stats);

        // Let's refine the page.tsx to handle this.

        // Alternative: Just use a standard GET for the PDF gen and hope the URL isn't too long.
        // Most browsers support 32k+ characters. AI insight is usually < 2k.

        const finalUrl = `${protocol}//${host}/dashboard-content/print-ai-analysis?insight=${encodeURIComponent(insight)}&stats=${encodeURIComponent(JSON.stringify(stats))}`;

        await page.goto(finalUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000,
        });

        await page.setViewport({
            width: 794,
            height: 1123,
            deviceScaleFactor: 2,
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
            preferCSSPageSize: true,
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="AI-Analiz-Raporu.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('AI PDF Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate AI PDF', details: error.message }, { status: 500 });
    }
}
