'use server';

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export interface HelpDoc {
    id: string;
    title: string;
    content: string;
    category: string;
    categoryLabel: string;
    path: string;
}

const CATEGORY_MAP: Record<string, string> = {
    '.': 'Genel',
    'baslangic': 'Hızlı Başlangıç',
    'crm': 'Müşteri Yönetimi (CRM)',
    'finans': 'Finans ve OCR',
    'merkezi-veri': 'Ürün ve Reçete Verileri',
    'operasyon': 'Proje ve Saha Operasyonu',
    'satis': 'Satış ve Teklif Süreci'
};

const DOCS_DIR = path.join(process.cwd(), 'docs');

function getFilesRecursively(dir: string): string[] {
    const files = fs.readdirSync(dir);
    let results: string[] = [];

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Skip hidden files and unwanted files
        if (file.startsWith('.') || file === 'blueprint.md' || file === 'USER_GUIDE.md' || file === 'backend.json') {
            return;
        }

        if (stat.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
        } else if (file.endsWith('.md')) {
            results.push(fullPath);
        }
    });

    return results;
}

export async function getHelpDocs(): Promise<{ success: boolean; data?: HelpDoc[]; error?: string }> {
    try {
        if (!fs.existsSync(DOCS_DIR)) {
            return { success: false, error: 'Dökümantasyon klasörü bulunamadı.' };
        }

        const files = getFilesRecursively(DOCS_DIR);
        const docs: HelpDoc[] = files.map(filePath => {
            const relativePath = path.relative(DOCS_DIR, filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Extract title from first H1 if exists
            const titleMatch = content.match(/^# (.*)/);
            const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');
            
            const category = path.dirname(relativePath).replace(/\\/g, '/');
            const categoryLabel = CATEGORY_MAP[category] || (category === '.' ? 'Genel' : category);

            return {
                id: relativePath.replace(/\\/g, '/'),
                title,
                content,
                category,
                categoryLabel,
                path: relativePath
            };
        });

        return { success: true, data: docs };
    } catch (error: any) {
        logger.error('Help docs fetch error:', error);
        return { success: false, error: error.message };
    }
}
