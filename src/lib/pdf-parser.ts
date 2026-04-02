'use client';

type PdfTextItem = {
    str: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export function cleanOCRText(text: string): string {
    return text
        // l, I -> 1 (Rakam bağlamında)
        .replace(/(?<=\d)[lI](?=\d)/g, '1') // 5l5 -> 515
        .replace(/(?<=\d)[lI]\b/g, '1')     // 5l -> 51
        .replace(/\b[lI](?=\d)/g, '1')      // l5 -> 15

        // O, o -> 0 (Rakam bağlamında)
        .replace(/(?<=\d)[Oo](?=\d)/g, '0') // 5O5 -> 505
        .replace(/(?<=\d)[Oo]\b/g, '0')     // 5O -> 50
        .replace(/\b[Oo](?=\d)/g, '0')      // O5 -> 05

        // Birim bağlamında (örn: "l adet" -> "1 adet")
        .replace(/\b[lI]\s+(?=(?:ad|adet|m|mt|kg|gr|pcs|set|boy|koli|paket)\b)/gi, '1 ');
}

export async function extractTextFromPdf(file: File): Promise<{ text: string, lines: string[], items: PdfTextItem[] }> {
    // Dynamically import pdfjs-dist to avoid SSR errors
    const pdfjs = await import('pdfjs-dist');

    // In a real app, you might copy the worker file to the public directory.
    // For this example, we'll point to the unpkg CDN.
    // This needs to be set before getDocument is called.
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const allItems: PdfTextItem[] = [];


    // Helper interface for the shape we expect from PDFJS text items
    interface TextLayerItem {
        str: string;
        transform: number[];
        width: number;
        height: number;
        [key: string]: any;
    }

    // Guard function
    const isTextItem = (item: any): item is TextLayerItem => {
        return 'str' in item && 'transform' in item && Array.isArray(item.transform);
    };

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Explicitly cast to unknown first to avoid union type conflicts, then filter with guard
        const filteredItems = textContent.items.filter(isTextItem) as unknown as TextLayerItem[];

        const pageItems = filteredItems
            .map((item) => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                w: item.width,
                h: item.height || 10, // Fallback height
            }));
        allItems.push(...pageItems);

        const sortedItems = filteredItems
            .sort((a, b) => {
                if (Math.abs(b.transform[5] - a.transform[5]) > 4) { // y-threshold
                    return b.transform[5] - a.transform[5];
                }
                return a.transform[4] - b.transform[4];
            });

        let lastY = -1;
        let line = '';
        for (const item of sortedItems) {
            const y = item.transform[5];
            const text = item.str;

            if (lastY === -1) {
                lastY = y;
                line = text;
            } else if (Math.abs(y - lastY) > 6) { // New line threshold
                fullText += line + '\n';
                line = text;
                lastY = y;
            } else {
                line += ' ' + text;
            }
        }
        if (line) {
            fullText += line + '\n';
        }
    }

    // OCR Fallback: Eğer metin çok kısaysa (örn: < 50 karakter), taranmış belge olabilir.
    // Bu durumda Tesseract.js ile OCR işlemini başlatıyoruz.
    if (fullText.trim().length < 50) {
        try {
            const ocrText = await performOcr(pdf);
            if (ocrText.trim().length > 0) {
                fullText = ocrText;
            }
        } catch (error) {
            console.warn("OCR işlemi başarısız oldu veya Tesseract.js yüklü değil:", error);
        }
    }

    return {
        text: fullText,
        lines: fullText.split('\n'),
        items: allItems,
    };
}

export async function extractTextFromImage(file: File): Promise<{ text: string, lines: string[] }> {
    // Tesseract.js'i dinamik olarak import ediyoruz (Client-side only)
    const Tesseract = await import('tesseract.js');

    // createWorker fonksiyonunu alıyoruz (versiyon uyumluluğu için kontrol)
    const createWorker = Tesseract.createWorker || (Tesseract.default && Tesseract.default.createWorker);

    if (!createWorker) {
        throw new Error("Tesseract.js yüklenemedi.");
    }

    // Türkçe dil desteği ile worker oluşturuyoruz
    const worker = await createWorker('tur');

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    const cleanedText = cleanOCRText(text);

    return {
        text: cleanedText,
        lines: cleanedText.split('\n'),
    };
}

async function performOcr(pdf: any): Promise<string> {
    // Tesseract.js'i dinamik olarak import ediyoruz (Client-side only)
    const Tesseract = await import('tesseract.js');

    // createWorker fonksiyonunu alıyoruz (versiyon uyumluluğu için kontrol)
    const createWorker = Tesseract.createWorker || (Tesseract.default && Tesseract.default.createWorker);

    if (!createWorker) {
        throw new Error("Tesseract.js yüklenemedi.");
    }

    // Türkçe dil desteği ile worker oluşturuyoruz
    const worker = await createWorker('tur');
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // OCR başarısını artırmak için ölçeği büyütüyoruz (2.0 = %200)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const { data: { text } } = await worker.recognize(canvas);
            fullText += text + '\n\n';
        }
    }

    await worker.terminate();
    return cleanOCRText(fullText);
}