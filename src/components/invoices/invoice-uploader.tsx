'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Bot, Key, Terminal, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromPdf } from '@/lib/pdf-parser';
import { smartParseInvoice } from '@/lib/smart-parser';
import { parseInvoiceXml } from '@/lib/xml-parser';
import { convertPdfToImage } from '@/lib/pdf-to-image';
import { extractInvoiceWithGemini } from '@/services/gemini-vision-service';
import { parseWithGLMClient } from '@/services/glm-client';
import { parseWithKimiClient } from '@/services/kimi-client';
import { parseWithEnsembleAI } from '@/services/ensemble-ai-parser';
import { useToast } from '@/hooks/use-toast';
import { createInvoice, findOrCreateCustomerFromInvoice } from '@/actions/invoices';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InvoicePreviewDialog } from './invoice-preview-dialog';
import { XmlFormatGuideDialog } from './xml-guide-dialog';
import { BulkProductMatcher } from '@/components/products/bulk-product-matcher';
import { AISemanticSettings } from '@/components/settings/ai-semantic-settings';

export function InvoiceUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [useAI, setUseAI] = useState(false);
    const [useEnsemble, setUseEnsemble] = useState(true); // NEW: Ensemble mode
    const [apiKey, setApiKey] = useState('');
    const [qwenApiKey, setQwenApiKey] = useState('');
    const [glmApiKey, setGlmApiKey] = useState('');
    const [kimiApiKey, setKimiApiKey] = useState('');
    const [deepseekApiKey, setDeepseekApiKey] = useState('');
    const [workingModel, setWorkingModel] = useState('gemini-2.0-flash'); // Default, will update
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Preview & Approval State
    const [previewData, setPreviewData] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingMethod, setPendingMethod] = useState('');

    // Bulk Matching State
    const [bulkMatcherOpen, setBulkMatcherOpen] = useState(false);
    const [pendingInvoiceItems, setPendingInvoiceItems] = useState<any[]>([]);

    const { toast } = useToast();

    // Load API Key from LocalStorage on mount
    useEffect(() => {
        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        const storedQwenKey = localStorage.getItem('QWEN_API_KEY');
        const storedGlmKey = localStorage.getItem('GLM_API_KEY');
        const storedKimiKey = localStorage.getItem('KIMI_API_KEY');
        const storedDeepseekKey = localStorage.getItem('DEEPSEEK_API_KEY');
        const storedModel = localStorage.getItem('GEMINI_MODEL');

        if (storedKey) setApiKey(storedKey);
        if (storedQwenKey) setQwenApiKey(storedQwenKey);
        if (storedGlmKey) setGlmApiKey(storedGlmKey);
        if (storedKimiKey) setKimiApiKey(storedKimiKey);
        if (storedDeepseekKey) setDeepseekApiKey(storedDeepseekKey);

        if (storedModel) setWorkingModel(storedModel);
    }, []);

    const saveApiKey = () => {
        if (apiKey.trim()) localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
        if (qwenApiKey.trim()) localStorage.setItem('QWEN_API_KEY', qwenApiKey.trim());
        if (glmApiKey.trim()) localStorage.setItem('GLM_API_KEY', glmApiKey.trim());
        if (kimiApiKey.trim()) localStorage.setItem('KIMI_API_KEY', kimiApiKey.trim());
        if (deepseekApiKey.trim()) localStorage.setItem('DEEPSEEK_API_KEY', deepseekApiKey.trim());

        localStorage.setItem('GEMINI_MODEL', workingModel);
        setShowApiKeyDialog(false);
        setUseAI(true);

        const backups = [];
        if (qwenApiKey) backups.push('Qwen');
        if (glmApiKey) backups.push('GLM-4');
        if (kimiApiKey) backups.push('Kimi');
        if (deepseekApiKey) backups.push('DeepSeek');
        const backupText = backups.length > 0 ? `Yedek: ${backups.join(', ')}` : 'Yedek: Yok';

        toast({ title: "Ayarlar Kaydedildi", description: `AI Modeli: ${workingModel} (${backupText})` });
    };

    // Robust Auto-Discovery Test
    const testConnection = async () => {
        if (!apiKey) {
            setTestStatus('error');
            setTestMessage('API Anahtarı girilmedi.');
            return;
        }

        setTestStatus('testing');
        setTestMessage('En uygun model aranıyor ve test ediliyor...');

        const genAI = new GoogleGenerativeAI(apiKey);
        const candidates = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-001',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest'
        ];

        let successModel = '';
        let lastError = '';

        console.log("----- Model Testi Başlıyor -----");

        // 1. Try candidates
        for (const modelName of candidates) {
            try {
                console.log(`Testing model: ${modelName} on v1beta...`);
                // Asking for model without specific API version (SDK handles it)
                const model = genAI.getGenerativeModel({
                    model: modelName
                });

                // Simple handshake
                const result = await model.generateContent("Merhaba, test 1-2");
                const responseText = result.response.text();

                console.log(`SUCCESS with ${modelName}:`, responseText);
                successModel = modelName;
                break; // Found one!
            } catch (e: any) {
                lastError = e?.message || 'Unknown error';
                console.warn(`FAIL ${modelName}:`, lastError);
            }
        }

        if (successModel) {
            setWorkingModel(successModel);
            setTestStatus('success');
            setTestMessage(`Bağlantı Başarılı! Çalışan Model: ${successModel}`);
            // Auto-save the working configuration
            localStorage.setItem('GEMINI_MODEL', successModel);
        } else {
            console.error("All candidates failed. Last error:", lastError);
            // 2. If all failed, try to list models essentially to tell user what they HAVE
            try {
                setTestMessage('Modeller yanıt vermedi, mevcut yetkiler kontrol ediliyor...');
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await response.json();

                if (data.models) {
                    const availableModels = data.models
                        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                        .map((m: any) => m.name.split('/').pop());

                    // Fallback Strategy: Pick the first available "flash" or "pro" model automatically
                    const emergencyFallback = availableModels.find((m: string) => m.includes('2.5-flash') || m.includes('2.0-flash'))
                        || availableModels.find((m: string) => m.includes('flash'))
                        || availableModels.find((m: string) => m.includes('pro'))
                        || availableModels[0];

                    if (emergencyFallback) {
                        setWorkingModel(emergencyFallback);
                        localStorage.setItem('GEMINI_MODEL', emergencyFallback);
                        setTestStatus('success');
                        setTestMessage(`Önerilen modeller bulunamadı ancak alternatif bir model seçildi: ${emergencyFallback}`);
                        toast({
                            title: "Alternatif Model Seçildi",
                            description: `Listenizdeki ${emergencyFallback} modeli kullanılıyor.`,
                        });
                    } else {
                        const availableNames = availableModels.join(', ');
                        setTestStatus('error');
                        setTestMessage(`HATA: İstediğimiz modeller bulunamadı. Sizin kullanabileceğiniz modeller: ${availableNames}`);
                    }
                } else {
                    throw new Error(data.error?.message || lastError);
                }
            } catch (finalError: any) {
                setTestStatus('error');
                setTestMessage(`KRİTİK HATA: Hiçbir modele erişilemedi. API Anahtarınızın "Generative Language API" yetkisi olduğundan emin olun. Hata detayı: ${finalError.message}`);
            }
        }
    };

    // Qwen Client (OpenAI-Compatible)
    const parseWithQwenClient = async (text: string, qwenKey: string) => {
        const prompt = `Sen uzman bir fatura analiz yapay zekasısın. 
        Aşağıdaki fatura metnini analiz et ve istenen verileri JSON formatında çıkar.
        
        FATURA METNİ:
        ${text.substring(0, 20000)}

        İSTENEN ÇIKTI FORMATI (JSON):
        {
            "invoiceNumber": "Fatura Numarası / Belge No (Örn: ABC2023...)",
            "ettsn": "ETTN (UUID formatında: xxxxxxxx-xxxx-...)",
            "invoiceDate": "Fatura Tarihi / Düzenleme Tarihi (YYYY-MM-DD)",
            "senderTaxId": "Vergi Kimlik No (VKN veya TCKN) - KESİNLİKLE DOLDUR",
            "taxOffice": "Vergi Dairesi",
            "senderName": "Satıcı Firma Adı (Tam Ünvan)",
            "senderAddress": "Satıcı Adresi",
            "senderPhone": "Satıcı Telefon",
            "receiverName": "Alıcı Firma Adı",
            "currency": "TRY, USD veya EUR",
            "totalAmount": 0.00,
            "subTotal": 0.00,
            "totalDiscountAmount": 0.00,
            "totalTaxAmount": 0.00,
            "items": [
                {
                    "name": "Ürün/Hizmet Adı ('Mal Hizmet' sütunu)",
                    "quantity": 0,
                    "unit": "Birim ('Adet', 'Kg' vb.)",
                    "unitPrice": 0.00, // 'Birim Fiyat' sütunu
                    "unitListPrice": 0.00, // Varsa iskonto öncesi fiyat
                    "discountRate": 0, // 'İskonto Oranı' sütunu
                    "discountAmount": 0.00, // 'İskonto Tutarı' sütunu
                    "taxRate": 0, // 'KDV Oranı' (%1, %10, %20)
                    "taxAmount": 0.00, // 'KDV Tutarı' sütunu
                    "totalPrice": 0.00 // 'Mal Hizmet Tutarı' (Satır Toplamı)
                }
            ]
        }
        
        Sadece saf JSON döndür. Markdown bloğu kullanma.
        
        ÖNEMLİ SÜTUN EŞLEŞTİRME KURALLARI:
        Tablodaki sütunları şu şekilde eşleştir:
        - "Mal Hizmet" -> name
        - "Miktar" -> quantity
        - "Birim" -> unit
        - "Birim Fiyat" -> unitPrice
        
        
        KRİTİK MANTIK KURALLARI (Bunu Kesinlikle Uygula):
        1. "senderName" (Satıcı): Faturanın EN ÜST KISMINDAKİ logoda veya başlıkta yazan firmadır. ŞAHIS ŞİRKETİ OLABİLİR. Başındaki "MERKEZ", "ŞUBE" gibi yer bildiren kelimeleri isme dahil ETME.
        2. "senderTaxId" (VKN/TCKN): Faturada "VKN", "Vergi No", "TC Kimlik No" veya "Mersis No" etiketini bul. Yanındaki 10 veya 11 haneli numarayı KESİNLİKLE al. ASLA BOŞ BIRAKMA.
        3. "senderAddress", "taxOffice": Bu bilgiler Genelde "senderName"in hemen altında yazar. Lütfen atlamadan al.
        4. SÜTUN KAYMASI UYARISI: Tabloda "Açıklamalar" diye BOŞ bir sütun olabilir. Bunu "Birim" veya "Miktar" ile karıştırma.
        5. "Birim Fiyat" (Unit Price): Genelde bol sıfırlı olabilir (Örn: 31.900,0000). Bunu doğru formatta sayıya çevir.
        6. "receiverName" (Alıcı): "SAYIN" veya "ALICI" kelimesinden sonra gelen firmadır.
        7. ÇOK ÖNEMLİ: "SAYIN" kelimesinden sonra gelen isim ASLA "senderName" OLAMAZ.
        8. EĞER SATIRDA SADECE BİR TANE YÜZDE (%) DEĞERİ VARSA, BU KESİNLİKLE "KDV ORANI"DIR. "İSKONTO" DEĞİLDİR.

        - "İskonto Oranı" -> discountRate (Emin değilsen veya boşsa 0 yaz)
        - "İskonto Tutarı" -> discountAmount (Boşsa 0)
        - "KDV Oranı" -> taxRate (Genelde %1, %10 veya %20)
        - "KDV Tutarı" -> taxAmount
        - "Mal Hizmet Tutarı" -> totalPrice`;

        try {
            const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${qwenKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "qwen-plus",
                    messages: [
                        { role: "system", content: "You are a helpful assistant that extracts data from invoices as JSON." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Qwen API Error: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            let content = data.choices[0]?.message?.content || "{}";
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(content);
        } catch (e) {
            console.error("Qwen Parsing Failed:", e);
            throw e;
        }
    };

    const parseWithGeminiClient = async (text: string, currentApiKey: string) => {
        if (!currentApiKey) throw new Error("API Anahtarı eksik!");

        console.log(`Parsing invoice with model: ${workingModel}`);
        const genAI = new GoogleGenerativeAI(currentApiKey);

        const model = genAI.getGenerativeModel({
            model: workingModel, // Use the dynamically found working model
        });

        const prompt = `
        Sen uzman bir fatura ayrıştırıcısısın. Aşağıdaki fatura metnini analiz et ve belirtilen JSON formatında yanıt ver.
        
        FATURA METNİ:
        """
        ${text}
        """

        İSTENEN JSON FORMATI:
        {
            "invoiceNumber": "Fatura Numarası / Belge No (Örn: ABC2023...)",
            "ettsn": "ETTN (UUID formatında)",
            "invoiceDate": "Düzenleme Tarihi (YYYY-MM-DD)",
            "taxId": "VKN veya TCKN",
            "taxOffice": "Vergi Dairesi",
            "senderName": "Satıcı Firma Ünvanı",
            "senderAddress": "Adres",
            "senderPhone": "Telefon",
            "senderEmail": "E-posta Adresi",
            "receiverName": "Alıcı Firma Adı",
            "currency": "TRY, USD veya EUR",
            "totalAmount": 0.00,
            "subTotal": 0.00,
            "totalDiscountAmount": 0.00,
            "totalTaxAmount": 0.00,
            "taxInclusiveTotal": 0.00,
            "items": [
                {
                    "name": "Ürün/Hizmet Adı",
                    "quantity": 0,
                    "unit": "Adet, Kg, Saat vb.",
                    "unitListPrice": 0.00,
                    "discountRate": 0,
                    "discountAmount": 0.00,
                    "unitPrice": 0.00,
                    "taxRate": 0,
                    "taxAmount": 0.00,
                    "totalPrice": 0.00
                }
            ]
        }

        KURALLAR:
        1. Sadece saf JSON döndür.
        2. VKN/TCKN çok önemlidir, dikkatli çıkar.
        3. Adres bilgisini mümkünse tek satırda birleştir.
        4. SATICI VE ALICI AYRIMI (ÇOK ÖNEMLİ):
           - "senderName" (Satıcı): Faturanın EN TEPESİNDEKİ LOGO veya BAŞLIK. Başındaki "MERKEZ", "ŞUBE" kelimelerini alma.
           - "senderAddress", "senderPhone", "taxId" ("VKN"), "taxOffice": Bu bilgiler satıcı isminin hemen altında yazar. Hepsini titizlikle çıkar.
           - "receiverName" (Alıcı): "SAYIN" kelimesinden sonra gelen kısım.
           - KURAL: "SAYIN" kelimesini gördüğün bloğu (ve devamını) ALICI (receiver) yap. Orayı sakın SATICI (sender) seçme.
           - KURAL: "Mersis No" veya "Sicil No" yakındaki isim SATICIDIR.
        
        5. SÜTUN VE FORMAT KURALLARI:
           - Tabloda "Açıklamalar" adında BOŞ bir sütun olabilir. Bunu atla, verileri kaydırma.
           - "Birim Fiyat" (Unit Price) sütunu, "Açıklamalar" sütunundan sonra gelebilir. 
           - Sayılar "31.900,0000" şeklinde 4 haneli ondalık olabilir. Bunları doğru number'a çevir.
           - "Mal Hizmet" -> name
           - "Miktar" -> quantity
           - "Birim Fiyat" -> unitPrice
           
           *** KRİTİK HATA ÖNLEME ***
           - Tabloda "İskonto" sütunu genelde BOŞTUR.
           - Eğer satırda SADECE BİR ADET YÜZDE (%) varsa, o KDV ORANIDIR (taxRate). SAKIN İSKONTO (discountRate) OLARAK YAZMA.
           - Örnek: Satırda sadece "%20" geçiyor. -> taxRate: 20, discountRate: 0 (DOĞRU)
           - Örnek: Satırda sadece "%20" geçiyor. -> taxRate: 20, discountRate: 20 (YANLIŞ!!!!)
           - discountRate sadece ve sadece "%" sembolü "İskonto" başlığı altında açıkça yazıyorsa doldurulmalıdır.
           
           - "İskonto Oranı" -> discountRate (Yoksa 0)
           - "İskonto Tutarı" -> discountAmount (Yoksa 0)
           - "KDV Oranı" -> taxRate
           - "KDV Tutarı" -> taxAmount
           - "Mal Hizmet Tutarı" -> totalPrice
        `;

        const maxRetries = 2; // Reduced retries since we have fallback
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                let responseText = response.text();
                responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(responseText);
            } catch (error: any) {
                console.error(`Gemini API Error (Attempt ${attempt + 1}):`, error);

                if (error.message?.includes('429') || error.toString().includes('Quota exceeded') || error.status === 429) {
                    attempt++;
                    if (attempt < maxRetries) {
                        const waitTime = 1500 * attempt;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    } else {
                        throw new Error("API_QUOTA_EXCEEDED"); // Specific error code to trigger fallback
                    }
                }
                throw error;
            }
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of acceptedFiles) {
                let parsedData: any;
                let usedMethod = 'Local';
                let geminiQuotaExceeded = false;

                try {
                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                        // Extract text ALWAYS (needed for both XML conversion and fallback)
                        const { text, items: rawItems } = await extractTextFromPdf(file);

                        // PRIORITY 1: Convert PDF Visual to UBL-TR XML using Gemini (Vision)
                        if (useAI && apiKey) {
                            console.log('🤖 Attempting PDF Visual to UBL-TR XML conversion with Gemini...');

                            // Read PDF file as Base64
                            const base64Data = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                    const result = reader.result as string;
                                    // Remove data:application/pdf;base64, prefix
                                    const base64 = result.split(',')[1];
                                    resolve(base64);
                                };
                                reader.onerror = error => reject(error);
                            });

                            const { convertTextToUblXml } = await import('@/services/pdf-to-ubl-converter');
                            // Pass the working model found by the connection wizard
                            // NOW PASSING BASE64 PDF DATA instead of text
                            let conversionResult: any = { success: false };
                            try {
                                conversionResult = await convertTextToUblXml(base64Data, apiKey, workingModel);
                            } catch (err: any) {
                                console.error("Gemini Vision Conversion Crashed:", err);
                                conversionResult = { success: false, error: err.message || err.toString() };
                            }

                            // AUTO-DOWNGRADE: If 2.5-flash (or other) fails with Quota/429, retry with 1.5-flash
                            if (!conversionResult.success &&
                                (conversionResult.error?.includes('429') || conversionResult.error?.toLowerCase().includes('quota')) &&
                                workingModel !== 'gemini-1.5-flash') {

                                console.warn(`⚠️ Gemini ${workingModel} Quota Exceeded. Auto-downgrading to gemini-1.5-flash for retry...`);

                                toast({
                                    title: "Model Değiştiriliyor 🔄",
                                    description: `${workingModel} kotası doldu, gemini-1.5-flash ile tekrar deneniyor...`,
                                });

                                try {
                                    conversionResult = await convertTextToUblXml(base64Data, apiKey, 'gemini-1.5-flash');
                                    // If success, update usedMethod to reflect the change
                                    if (conversionResult.success) {
                                        usedMethod = 'Gemini (1.5-flash Fallback)';
                                    }
                                } catch (retryErr: any) {
                                    console.error("Gemini 1.5-flash Retry Failed:", retryErr);
                                    conversionResult = { success: false, error: retryErr.message };
                                }
                            }

                            if (conversionResult.success && conversionResult.xmlContent) {
                                console.log('✅ Text converted to UBL-TR XML successfully!');
                                console.log('📄 XML Content (first 2000 chars):', conversionResult.xmlContent.substring(0, 2000));

                                // Create virtual XML file
                                const xmlBlob = new Blob([conversionResult.xmlContent], { type: 'text/xml' });
                                const xmlFile = new File([xmlBlob], file.name.replace('.pdf', '.xml'), { type: 'text/xml' });

                                parsedData = await parseInvoiceXml(xmlFile);
                                usedMethod = 'Gemini (Text → UBL-TR XML)';

                                console.log('📊 Parsed Data:', JSON.stringify(parsedData, null, 2));
                                console.log('📊 First 3 items:', JSON.stringify(parsedData.items?.slice(0, 3), null, 2));

                                // POST-PROCESSING: Calculate KDV Tutarı if missing
                                console.log('🧮 Checking KDV calculations...');
                                console.log(`📋 Total items: ${parsedData.items?.length || 0}`);
                                if (parsedData.items && Array.isArray(parsedData.items)) {
                                    parsedData.items.forEach((item: any, idx: number) => {
                                        console.log(`\n📦 Item ${idx + 1}: ${item.name}`);
                                        console.log(`   - unitPrice: ${item.unitPrice}, qty: ${item.quantity}, taxRate: ${item.taxRate}%`);
                                        console.log(`   - taxAmount BEFORE: ${item.taxAmount}`);

                                        if (!item.taxAmount && item.taxRate > 0 && item.unitPrice && item.quantity) {
                                            const baseAmount = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
                                            item.taxAmount = baseAmount * (item.taxRate / 100);
                                            console.log(`   💡 KDV Tutarı hesaplandı: ${baseAmount} * ${item.taxRate}% = ${item.taxAmount}`);
                                        }
                                        console.log(`   - taxAmount AFTER: ${item.taxAmount}`);
                                    });
                                }

                                // REGEX FALLBACK: Check raw text for fields the AI missed
                                const cleanText = text.replace(/\s+/g, ' '); // Normalize whitespace

                                // REGEX FALLBACK: Aggressive & Robust
                                // We check if data is missing OR suspiciously short/empty/placeholder and try to extract from text
                                const isMissing = (val: any) => !val || String(val).trim().length < 3 || String(val).includes('@...') || String(val).toLowerCase().includes('vergi dairesi');

                                if (isMissing(parsedData.senderPhone)) {
                                    // Look for Tel/Tlf/Telefon, exclude lines that start with Faks/Fax
                                    // Capture digits, spaces, parens, hyphens, plus
                                    const phoneMatch = cleanText.match(/(?:Tel|Telefon|Tlf|Müşteri Hizmetleri|İletişim)(?!.*Faks)[^0-9\n]*?([\d\+\-\s\(\)]{9,})/i);
                                    if (phoneMatch) parsedData.senderPhone = phoneMatch[1].trim();
                                }

                                if (isMissing(parsedData.senderEmail)) {
                                    // Look for @ symbol context
                                    const emailMatch = cleanText.match(/(?:Email|E-posta|Eposta|Mail|Web|İletişim)?[^@\n]*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                                    if (emailMatch) parsedData.senderEmail = emailMatch[1].trim();
                                }

                                if (isMissing(parsedData.senderTaxOffice)) {
                                    // Capture text after V.D/Vergi Dairesi until we hit a stop word
                                    // Stop words: VKN, TC, Mersis, Ticaret, Faks, Tel, Web, Adres, No, Vergi No (BUT NOT JUST 'Vergi' as it breaks 'Kızılbey Vergi Dairesi')
                                    const vdMatch = cleanText.match(/(?:V\.D|Vergi Dairesi|VD|Dairesi)[:\.]?\s*([A-Za-zİıŞşÇçĞğÜüÖö\s\.]+?)(?=\s+(?:Vergi\s|V\.|VKN|TC|Mersis|Ticaret|Faks|Tel|Web|Adres|No|$))/i);
                                    if (vdMatch) {
                                        let vd = vdMatch[1].trim();
                                        // Cleanup check: If it ends with "Vergi", likely cutoff. If it contains "Vergi Dairesi", good.
                                        vd = vd.replace(/[:\.-]$/, '').trim();
                                        parsedData.senderTaxOffice = vd;
                                    }
                                }

                                // Debug notification
                                const caught = [];
                                if (!isMissing(parsedData.senderPhone)) caught.push("Telefon");
                                if (!isMissing(parsedData.senderEmail)) caught.push("E-posta");
                                if (!isMissing(parsedData.senderTaxOffice)) caught.push("Vergi Dairesi");

                                if (caught.length > 0) {
                                    console.log('✅ Regex caught info:', caught);
                                    toast({ title: "Bilgiler Yakalandı 🕵️", description: `${caught.join(', ')} metinden okundu.`, duration: 3000 });
                                }

                                if (parsedData.senderPhone || parsedData.senderEmail) {
                                    toast({ title: "Regex Başarılı", description: "Eksik bilgiler metinden alındı.", duration: 2000 });
                                }

                                toast({
                                    title: "🎯 Gemini ile Dönüştürüldü!",
                                    description: "Fatura metni UBL-TR XML'e çevrildi ve işlendi",
                                    duration: 4000
                                });
                            } else if (conversionResult.error && (conversionResult.error.toLowerCase().includes('quota') || conversionResult.error.includes('429'))) {
                                console.warn("Gemini Quota Exceeded in Vision Mode. Marking Gemini as unavailable.");
                                geminiQuotaExceeded = true;
                                // Fall through to Priority 2, but skip Gemini there
                            }
                        }

                        // PRIORITY 2: Fallback to local parsing (if XML conversion failed)
                        if (!parsedData) {
                            console.log('⚠️ XML conversion skipped or failed, using standard AI/Local flow...');

                            const hasAnyKey = apiKey || qwenApiKey || glmApiKey || kimiApiKey;

                            if (useAI && hasAnyKey) {
                                try {
                                    // ENSEMBLE MODE: All AIs analyze together
                                    const availableKeys = [
                                        !geminiQuotaExceeded ? apiKey : null,
                                        qwenApiKey,
                                        glmApiKey,
                                        kimiApiKey
                                    ].filter(Boolean);

                                    if (useEnsemble && availableKeys.length >= 2) {
                                        console.log('🎯 Ensemble AI Mode: Running all AIs in parallel...');
                                        usedMethod = `Ensemble AI (${availableKeys.length} models)`;

                                        const ensembleData = await parseWithEnsembleAI(text, {
                                            geminiKey: !geminiQuotaExceeded ? apiKey : undefined,
                                            qwenKey: qwenApiKey,
                                            glmKey: glmApiKey,
                                            kimiKey: kimiApiKey,
                                            parsers: {
                                                gemini: parseWithGeminiClient,
                                                qwen: parseWithQwenClient,
                                                glm: parseWithGLMClient,
                                                kimi: parseWithKimiClient
                                            }
                                        });

                                        let dateObj = new Date();
                                        if (ensembleData.invoiceDate) dateObj = new Date(ensembleData.invoiceDate);

                                        parsedData = {
                                            ...ensembleData,
                                            totalAmount: Number(ensembleData.totalAmount) || 0,
                                            subTotal: Number(ensembleData.subTotal) || 0,
                                            totalDiscountAmount: Number(ensembleData.totalDiscountAmount) || 0,
                                            totalTaxAmount: Number(ensembleData.totalTaxAmount) || 0,
                                            taxInclusiveTotal: Number(ensembleData.taxInclusiveTotal) || 0,
                                            invoiceDate: dateObj,
                                            items: ensembleData.items?.map((item: any) => ({
                                                name: item.name || 'İsimsiz',
                                                quantity: Number(item.quantity) || 1,
                                                unitPrice: Number(item.unitPrice) || 0,
                                                listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                discountRate: Number(item.discountRate) || 0,
                                                totalPrice: Number(item.totalPrice) || 0,
                                                unit: item.unit || 'Adet',
                                                taxRate: Number(item.taxRate) || 0,
                                                taxAmount: Number(item.taxAmount) || 0,
                                                discountAmount: Number(item.discountAmount) || 0
                                            })) || []
                                        };

                                        toast({
                                            title: "🎯 Ensemble AI Başarılı!",
                                            description: `${availableKeys.length} AI modeli birlikte analiz etti`,
                                            duration: 4000
                                        });
                                    } else {
                                        // SEQUENTIAL MODE: Try AIs one by one
                                        // Priority 1: Gemini Text-based AI (Only if quota not exceeded)
                                        if (apiKey && !geminiQuotaExceeded) {
                                            try {
                                                usedMethod = `AI (${workingModel})`;
                                                const aiData = await parseWithGeminiClient(text, apiKey);
                                                let dateObj = new Date();
                                                if (aiData.invoiceDate) dateObj = new Date(aiData.invoiceDate);

                                                parsedData = {
                                                    ...aiData,
                                                    totalAmount: Number(aiData.totalAmount) || 0,
                                                    subTotal: Number(aiData.subTotal) || 0,
                                                    totalDiscountAmount: Number(aiData.totalDiscountAmount) || 0,
                                                    totalTaxAmount: Number(aiData.totalTaxAmount) || 0,
                                                    taxInclusiveTotal: Number(aiData.taxInclusiveTotal) || 0,
                                                    invoiceDate: dateObj,
                                                    items: aiData.items?.map((item: any) => ({
                                                        name: item.name || 'İsimsiz',
                                                        quantity: Number(item.quantity) || 1,
                                                        unitPrice: Number(item.unitPrice) || 0,
                                                        listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                        discountRate: Number(item.discountRate) || 0,
                                                        totalPrice: Number(item.totalPrice) || 0,
                                                        unit: item.unit || 'Adet',
                                                        taxRate: Number(item.taxRate) || 0,
                                                        taxAmount: Number(item.taxAmount) || 0,
                                                        discountAmount: Number(item.discountAmount) || 0
                                                    })) || []
                                                };
                                            } catch (geminiError: any) {
                                                if (geminiError.message === "API_QUOTA_EXCEEDED" && qwenApiKey) {
                                                    console.warn("Gemini Quota Exceeded. Switching to Qwen...");
                                                    toast({
                                                        title: "Gemini Kotası Doldu ⚠️",
                                                        description: "Otomatik olarak Qwen AI (Alibaba) servisine geçiliyor... 🤖",
                                                        duration: 4000
                                                    });

                                                    usedMethod = `AI (Qwen Plus)`;
                                                    const qwenData = await parseWithQwenClient(text, qwenApiKey);
                                                    let dateObj = new Date();
                                                    if (qwenData.invoiceDate) dateObj = new Date(qwenData.invoiceDate);

                                                    parsedData = {
                                                        ...qwenData,
                                                        totalAmount: Number(qwenData.totalAmount) || 0,
                                                        subTotal: Number(qwenData.subTotal) || 0,
                                                        totalDiscountAmount: Number(qwenData.totalDiscountAmount) || 0,
                                                        totalTaxAmount: Number(qwenData.totalTaxAmount) || 0,
                                                        taxInclusiveTotal: Number(qwenData.taxInclusiveTotal) || 0,
                                                        invoiceDate: dateObj,
                                                        items: qwenData.items?.map((item: any) => ({
                                                            name: item.name || 'İsimsiz',
                                                            quantity: Number(item.quantity) || 1,
                                                            unitPrice: Number(item.unitPrice) || 0,
                                                            listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                            discountRate: Number(item.discountRate) || 0,
                                                            totalPrice: Number(item.totalPrice) || 0,
                                                            unit: item.unit || 'Adet',
                                                            taxRate: Number(item.taxRate) || 0,
                                                            taxAmount: Number(item.taxAmount) || 0,
                                                            discountAmount: Number(item.discountAmount) || 0
                                                        })) || []
                                                    };
                                                } else {
                                                    throw geminiError;
                                                }
                                            }
                                        } else if (qwenApiKey) {
                                            try {
                                                usedMethod = `AI (Qwen Plus)`;
                                                const qwenData = await parseWithQwenClient(text, qwenApiKey);
                                                let dateObj = new Date();
                                                if (qwenData.invoiceDate) dateObj = new Date(qwenData.invoiceDate);
                                                parsedData = {
                                                    ...qwenData,
                                                    totalAmount: Number(qwenData.totalAmount) || 0,
                                                    subTotal: Number(qwenData.subTotal) || 0,
                                                    totalDiscountAmount: Number(qwenData.totalDiscountAmount) || 0,
                                                    totalTaxAmount: Number(qwenData.totalTaxAmount) || 0,
                                                    taxInclusiveTotal: Number(qwenData.taxInclusiveTotal) || 0,
                                                    invoiceDate: dateObj,
                                                    items: qwenData.items?.map((item: any) => ({
                                                        name: item.name || 'İsimsiz',
                                                        quantity: Number(item.quantity) || 1,
                                                        unitPrice: Number(item.unitPrice) || 0,
                                                        listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                        discountRate: Number(item.discountRate) || 0,
                                                        totalPrice: Number(item.totalPrice) || 0,
                                                        unit: item.unit || 'Adet',
                                                        taxRate: Number(item.taxRate) || 0,
                                                        taxAmount: Number(item.taxAmount) || 0,
                                                        discountAmount: Number(item.discountAmount) || 0
                                                    })) || []
                                                };
                                            } catch (qwenError: any) {
                                                if (glmApiKey) {
                                                    console.warn("Qwen failed. Switching to GLM-4-Flash...");
                                                    toast({
                                                        title: "Qwen Başarısız ⚠️",
                                                        description: "GLM-4-Flash (Zhipu AI) deneniyor... 🚀",
                                                        duration: 3000
                                                    });

                                                    usedMethod = `AI (GLM-4-Flash)`;
                                                    const glmData = await parseWithGLMClient(text, glmApiKey);
                                                    let dateObj = new Date();
                                                    if (glmData.invoiceDate) dateObj = new Date(glmData.invoiceDate);

                                                    parsedData = {
                                                        ...glmData,
                                                        totalAmount: Number(glmData.totalAmount) || 0,
                                                        subTotal: Number(glmData.subTotal) || 0,
                                                        totalDiscountAmount: Number(glmData.totalDiscountAmount) || 0,
                                                        totalTaxAmount: Number(glmData.totalTaxAmount) || 0,
                                                        taxInclusiveTotal: Number(glmData.taxInclusiveTotal) || 0,
                                                        invoiceDate: dateObj,
                                                        items: glmData.items?.map((item: any) => ({
                                                            name: item.name || 'İsimsiz',
                                                            quantity: Number(item.quantity) || 1,
                                                            unitPrice: Number(item.unitPrice) || 0,
                                                            listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                            discountRate: Number(item.discountRate) || 0,
                                                            totalPrice: Number(item.totalPrice) || 0,
                                                            unit: item.unit || 'Adet',
                                                            taxRate: Number(item.taxRate) || 0,
                                                            taxAmount: Number(item.taxAmount) || 0,
                                                            discountAmount: Number(item.discountAmount) || 0
                                                        })) || []
                                                    };
                                                } else {
                                                    throw qwenError;
                                                }
                                            }
                                        } else if (glmApiKey) {
                                            usedMethod = `AI (GLM-4-Flash)`;
                                            const glmData = await parseWithGLMClient(text, glmApiKey);
                                            let dateObj = new Date();
                                            if (glmData.invoiceDate) dateObj = new Date(glmData.invoiceDate);
                                            parsedData = {
                                                ...glmData,
                                                totalAmount: Number(glmData.totalAmount) || 0,
                                                subTotal: Number(glmData.subTotal) || 0,
                                                totalDiscountAmount: Number(glmData.totalDiscountAmount) || 0,
                                                totalTaxAmount: Number(glmData.totalTaxAmount) || 0,
                                                taxInclusiveTotal: Number(glmData.taxInclusiveTotal) || 0,
                                                invoiceDate: dateObj,
                                                items: glmData.items?.map((item: any) => ({
                                                    name: item.name || 'İsimsiz',
                                                    quantity: Number(item.quantity) || 1,
                                                    unitPrice: Number(item.unitPrice) || 0,
                                                    listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                                                    discountRate: Number(item.discountRate) || 0,
                                                    totalPrice: Number(item.totalPrice) || 0,
                                                    unit: item.unit || 'Adet',
                                                    taxRate: Number(item.taxRate) || 0,
                                                    taxAmount: Number(item.taxAmount) || 0,
                                                    discountAmount: Number(item.discountAmount) || 0
                                                })) || []
                                            };
                                        }
                                    }
                                } catch (aiError: any) {
                                    console.error("AI Parsing failed:", aiError);
                                    toast({
                                        variant: "destructive",
                                        title: "Yapay Zeka Hatası",
                                        description: "AI analizi yapılamadı, yerel çözümleyici deneniyor...",
                                    });
                                    // Fallback to local parser with spatial data
                                    parsedData = smartParseInvoice(text, rawItems);
                                    usedMethod = 'Local (Visual Table Detection)';
                                }
                            } else {
                                // No AI - Use local parser with spatial data
                                parsedData = smartParseInvoice(text, rawItems);
                                usedMethod = 'Local (Visual Table Detection)';
                            }
                        }
                    } else if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
                        parsedData = await parseInvoiceXml(file);
                    } else {
                        toast({ title: "Hata", description: "Geçersiz dosya formatı.", variant: "destructive" });
                        continue;
                    }
                } catch (parseError: any) {
                    console.error("Parsing error:", parseError);
                    toast({ title: "Hata", description: "Dosya okunamadı.", variant: "destructive" });
                    continue;
                }

                if (!parsedData) continue;

                // OPEN PREVIEW DIALOG INSTEAD OF SAVING
                setPendingFile(file);
                setPreviewData(parsedData);
                setPendingMethod(usedMethod);
                setIsPreviewOpen(true);
                setIsUploading(false); // Stop loading spinner, waiting for user
                return; // Exit loop, handle one file at a time
            }


            if (onUploadComplete) onUploadComplete();

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }, [toast, onUploadComplete, useAI, apiKey, qwenApiKey, workingModel]);

    const handleSaveInvoice = async (finalData: any) => {
        setIsUploading(true);
        // Show loading toast immediately
        toast({ title: "İşleniyor", description: "Fatura sisteme kaydediliyor..." });

        try {
            console.log("Saving invoice data");

            // 1. Resolve Customer ID
            let customerId = undefined;
            try {
                // First checks if there is a manual selection (TODO: Add UI for manual selection if needed)
                // If not, use auto-lookup
                if (finalData.senderName) {
                    const customerResult = await findOrCreateCustomerFromInvoice(finalData.senderName, finalData.senderTaxId, {
                        address: finalData.senderAddress,
                        phone: finalData.senderPhone,
                        email: finalData.senderEmail,
                        taxOffice: finalData.senderTaxOffice
                    });
                    if (customerResult.success && customerResult.data) {
                        customerId = customerResult.data.id;
                    }
                }
            } catch (customerError) {
                console.error("Customer creation failed:", customerError);
                // Continue saving invoice even if customer lookup fails (will serve as Draft/Unknown)
            }

            // 2. Convert file to base64 ONLY if file exists
            let pdfBase64 = undefined;
            if (pendingFile) {
                try {
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve, reject) => {
                        reader.onload = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(pendingFile);
                    });
                    pdfBase64 = await base64Promise;
                } catch (e) {
                    console.error("File conversion failed:", e);
                    toast({ title: "Uyarı", description: "Dosya eklenemedi, ancak fatura verisi kaydedilecek.", variant: "destructive" });
                }
            }

            // 3. Validate Date
            let validDate = new Date();
            if (finalData.invoiceDate) {
                const parsedDate = new Date(finalData.invoiceDate);
                if (!isNaN(parsedDate.getTime())) {
                    validDate = parsedDate;
                }
            }

            // 4. Create Invoice
            const result = await createInvoice({
                type: 'Incoming',
                senderName: finalData.senderName ? String(finalData.senderName) : 'Bilinmeyen',
                receiverName: finalData.receiverName ? String(finalData.receiverName) : '',
                customerId: customerId,
                senderTaxId: finalData.senderTaxId ? String(finalData.senderTaxId) : '',
                senderAddress: finalData.senderAddress || '',
                senderPhone: finalData.senderPhone || '',
                senderEmail: finalData.senderEmail || '',
                senderTaxOffice: finalData.senderTaxOffice || '',
                invoiceNumber: finalData.invoiceNumber ? String(finalData.invoiceNumber) : `TASLAK-${Date.now()}`,
                ettsn: finalData.ettsn ? String(finalData.ettsn) : '',
                invoiceDate: validDate,
                totalAmount: Number(finalData.totalAmount) || 0,
                subTotal: Number(finalData.subTotal) || 0,
                totalDiscountAmount: Number(finalData.totalDiscountAmount) || 0,
                totalTaxAmount: Number(finalData.totalTaxAmount) || 0,
                taxInclusiveTotal: Number(finalData.taxInclusiveTotal) || 0,
                currency: finalData.currency || 'TRY',
                status: 'Draft',
                projectId: finalData.projectId,
                pdfFileBlob: pdfBase64,
                items: (finalData.items || []).map((item: any) => ({
                    name: item.name || 'İsimsiz',
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    listPrice: Number(item.unitListPrice) || Number(item.unitPrice) || 0,
                    discountRate: Number(item.discountRate) || 0,
                    totalPrice: Number(item.totalPrice) || 0,
                    unit: item.unit || 'Adet',
                    taxRate: Number(item.taxRate) || 0,
                    taxAmount: Number(item.taxAmount) || 0,
                    discountAmount: Number(item.discountAmount) || 0,
                    linkedProductId: null
                }))
            });

            if (result.success) {
                toast({
                    title: "Başarılı",
                    description: `${pendingFile?.name || 'Fatura verisi'} başarıyla kaydedildi.`,
                });

                // YENİ: Kaydedilen item'ları al (previewData'dan)
                const savedItems = previewData?.items || (result.data as any)?.items || [];
                console.log('📊 Bulk Matcher için item sayısı:', savedItems.length);

                if (savedItems.length > 5) {
                    setPendingInvoiceItems(savedItems);
                    setBulkMatcherOpen(true);
                }

                setIsPreviewOpen(false);
                setPendingFile(null);
                setPreviewData(null);
                setPastedXml(''); // Clear paste area
                if (onUploadComplete) onUploadComplete();
            } else {
                throw new Error(result.error || "Bilinmeyen bir sunucu hatası.");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast({
                title: "Kaydetme Hatası",
                description: error.message || "Fatura kaydedilemedi. Lütfen verileri kontrol edin.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1, // Restrict to single file for preview flow
        accept: { 'application/pdf': ['.pdf'], 'text/xml': ['.xml'] }
    });

    // -------- PASTE XML HANDLER --------
    const [pastedXml, setPastedXml] = useState('');
    const [isParsingPasted, setIsParsingPasted] = useState(false);

    const handlePasteAnalyze = async () => {
        if (!pastedXml.trim()) {
            toast({ title: "Uyarı", description: "Lütfen XML içeriğini yapıştırın." });
            return;
        }

        setIsParsingPasted(true);
        try {
            // Using the refactored XML Parser that supports strings
            const parsedData = await parseInvoiceXml(pastedXml);

            if (parsedData) {
                setPreviewData(parsedData);
                setPendingFile(null); // No file associated
                setPendingMethod('Manuel (XML Yapıştırma)');
                setIsPreviewOpen(true);
            }
        } catch (error: any) {
            console.error("XML Parse Error:", error);
            toast({
                title: "Ayrıştırma Hatası",
                description: "Geçersiz veya bozuk XML formatı.",
                variant: "destructive"
            });
        } finally {
            setIsParsingPasted(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="ai-mode"
                        checked={useAI}
                        onCheckedChange={(checked) => {
                            if (checked && !apiKey) {
                                setShowApiKeyDialog(true);
                            } else {
                                setUseAI(checked);
                            }
                        }}
                    />
                    <Label htmlFor="ai-mode" className="flex items-center gap-2 cursor-pointer">
                        <Bot className={`h-4 w-4 ${useAI ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>AI Analiz (Gemini Vision)</span>
                    </Label>

                    {useAI && (
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1" title="Aktif Model">
                                <span className={`h-1.5 w-1.5 rounded-full ${testStatus === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                {workingModel || 'Model Seçilmedi'}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowApiKeyDialog(true)}
                                title="AI Ayarları"
                            >
                                <Key className="h-3 w-3" />
                            </Button>
                            {/* AI Semantic Settings Button */}
                            <AISemanticSettings />
                        </div>
                    )}
                </div>

                <XmlFormatGuideDialog />
            </div>

            <Tabs defaultValue="file" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Dosya Yükle (PDF/XML)</TabsTrigger>
                    <TabsTrigger value="paste">XML Yapıştır</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-4">
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                    ${isUploading ? 'pointer-events-none opacity-50' : ''}
                    ${useAI ? 'border-indigo-400/50 bg-indigo-50/10' : ''}
                `}
                    >
                        <input {...getInputProps()} />

                        <div className="flex flex-col items-center gap-2">
                            {isUploading ? (
                                <>
                                    <Loader2 className={`h-10 w-10 animate-spin ${useAI ? 'text-indigo-600' : 'text-primary'}`} />
                                    <p className="text-sm font-medium animate-pulse">
                                        {useAI ? 'Yapay Zeka Faturayı Analiz Ediyor...' : 'Fatura İşleniyor...'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    {useAI ? (
                                        <Bot className="h-10 w-10 text-indigo-500 mb-1" />
                                    ) : (
                                        <Upload className="h-10 w-10 text-muted-foreground" />
                                    )}

                                    <h3 className="text-lg font-semibold">
                                        {useAI ? 'AI ile Fatura Yükle' : 'Fatura Yükle (PDF veya XML)'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        {useAI
                                            ? `Aktif Model: ${workingModel || 'Gemini'}`
                                            : 'Standart PDF ve XML faturalarınızı buraya sürükleyin.'
                                        }
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                    <div className="space-y-4">
                        <textarea
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                            placeholder="UBL-TR veya desteklenen XML içeriğini buraya yapıştırın..."
                            value={pastedXml}
                            onChange={(e) => setPastedXml(e.target.value)}
                        />
                        <Button
                            className="w-full"
                            onClick={handlePasteAnalyze}
                            disabled={isParsingPasted || !pastedXml.trim()}
                        >
                            {isParsingPasted ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analiz Ediliyor...
                                </>
                            ) : (
                                <>
                                    <Terminal className="mr-2 h-4 w-4" /> XML'i Analiz Et
                                </>
                            )}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {
                previewData && (
                    <InvoicePreviewDialog
                        open={isPreviewOpen}
                        onOpenChange={setIsPreviewOpen}
                        data={previewData}
                        onConfirm={handleSaveInvoice}
                        onCancel={() => setIsPreviewOpen(false)}
                        isSaving={isUploading}
                    />
                )
            }

            {/* API Key Dialog */}
            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            AI API Anahtarları
                        </DialogTitle>
                        <DialogDescription>
                            API anahtarlarınızı girin ve modelleri test edin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="gemini-key">Gemini API Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="gemini-key"
                                    type="password"
                                    placeholder="AIzaSy..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <Button variant="outline" onClick={testConnection} disabled={!apiKey || testStatus === 'testing'}>
                                    {testStatus === 'testing' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {testMessage && (
                                <p className={`text-xs ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {testMessage}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="qwen-key">Qwen API Key (Alibaba)</Label>
                            <Input
                                id="qwen-key"
                                type="password"
                                placeholder="sk-..."
                                value={qwenApiKey}
                                onChange={(e) => setQwenApiKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="glm-key">GLM-4 API Key (Zhipu)</Label>
                            <Input
                                id="glm-key"
                                type="password"
                                placeholder="..."
                                value={glmApiKey}
                                onChange={(e) => setGlmApiKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="kimi-key">Kimi API Key (Moonshot)</Label>
                            <Input
                                id="kimi-key"
                                type="password"
                                placeholder="..."
                                value={kimiApiKey}
                                onChange={(e) => setKimiApiKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deepseek-key">DeepSeek API Key</Label>
                            <Input
                                id="deepseek-key"
                                type="password"
                                placeholder="sk-..."
                                value={deepseekApiKey}
                                onChange={(e) => setDeepseekApiKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="model-select">Çalışan Model</Label>
                            <Input
                                id="model-select"
                                value={workingModel}
                                onChange={(e) => setWorkingModel(e.target.value)}
                                placeholder="gemini-2.0-flash"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                            İptal
                        </Button>
                        <Button onClick={saveApiKey}>
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Product Matcher */}
            <BulkProductMatcher
                open={bulkMatcherOpen}
                onOpenChange={setBulkMatcherOpen}
                invoiceItems={pendingInvoiceItems}
                onMatchComplete={(count) => {
                    toast({
                        title: "🎉 Toplu Eşleştirme",
                        description: `${count} ürün otomatik eşleştirildi!`,
                        duration: 3000,
                    });
                }}
            />
        </div>
    );
}
