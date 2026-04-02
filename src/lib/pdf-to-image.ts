// PDF to Image Converter
// Converts the first page of a PDF to a base64-encoded PNG image for Gemini Vision API

import * as pdfjsLib from 'pdfjs-dist';

export const convertPdfToImage = async (file: File): Promise<string> => {
    // Dynamic import to ensure it only runs on client side
    const pdfjs = await import('pdfjs-dist');

    // Set worker source
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // Get first page only (invoices are typically single page or first page contains all data)
    const page = await pdf.getPage(1);

    // Use 2x scale for high resolution (better OCR accuracy)
    const viewport = page.getViewport({ scale: 2.0 });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Failed to get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
    }).promise;

    // Convert canvas to base64 PNG (remove data:image/png;base64, prefix)
    const base64Image = canvas.toDataURL('image/png').split(',')[1];

    return base64Image;
};
