import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const proposalId = searchParams.get('proposalId');
    const isRFQ = searchParams.get('isRFQ') === 'true';
    const filename = searchParams.get('filename') || 'teklif.pdf';
    const rfqItems = searchParams.get('items'); // RFQ item IDs

    if (!proposalId) {
        return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Construct the URL to the print page
        // We use localhost since the server is running locally
        const protocol = request.nextUrl.protocol;
        const host = request.nextUrl.host;

        // Build URL with ALL parameters (including items for RFQ)
        const urlParams = new URLSearchParams();
        if (isRFQ) urlParams.set('rfq', 'true');
        if (rfqItems) urlParams.set('items', rfqItems);
        urlParams.set('headless', 'true');

        const printUrl = `${protocol}//${host}/quotes/${proposalId}/print?${urlParams.toString()}`;

        console.log('Generating PDF from URL:', printUrl);
        console.log('[PDF API] RFQ:', isRFQ, 'Items:', rfqItems);

        await page.goto(printUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000,
        });

        // Ensure all assets (fonts, images) are fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Set viewport to A4 size to ensure standard layout before PDF conversion
        await page.setViewport({
            width: 794, // 210mm at 96 DPI
            height: 1123, // 297mm at 96 DPI
            deviceScaleFactor: 2, // High quality
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
            preferCSSPageSize: true,
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
    }
}
