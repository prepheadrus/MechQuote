import { XMLParser } from 'fast-xml-parser';
import { ParsedInvoiceItem } from './smart-parser';

// Helper to remove keys that might contain conflicting data (like Signatures)
const cleanupObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (key.toLowerCase().includes('ublextensions') || key.toLowerCase().includes('signature')) {
            delete obj[key];
        }
    }
    return obj;
};

// Helper to find a value by key suffix recursively
const findValueByKeySuffix = (obj: any, targetSuffix: string): any => {
    if (!obj || typeof obj !== 'object') return undefined;

    // 1. Check current object keys (Direct Match Priority)
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const keyLower = key.toLowerCase();
            const targetLower = targetSuffix.toLowerCase();
            if (keyLower === targetLower || keyLower.endsWith(':' + targetLower)) {
                return obj[key];
            }
        }
    }

    // Special mappings for common variations
    const mappings: { [key: string]: string[] } = {
        'taxid': ['vkn', 'tckn', 'taxidentificationnumber', 'identificationid'],
        'taxoffice': ['vergidairesi', 'taxscheme', 'taxscheme_name'],
        'sendername': ['registrationname', 'partyname', 'name'],
        'invoicenumber': ['id', 'documentid', 'faturano'],
        'invoicedate': ['issuedate', 'faturatarihi', 'date']
    };

    const lowerTarget = targetSuffix.toLowerCase();
    if (mappings[lowerTarget]) {
        for (const alt of mappings[lowerTarget]) {
            for (const key in obj) {
                if (key.toLowerCase() === alt || key.toLowerCase().endsWith(':' + alt)) {
                    return obj[key];
                }
            }
        }
    }

    // 2. Search children
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip text content keys and attributes to avoid false positives in values
            if (key === '#text' || key.startsWith('@_')) continue;

            const result = findValueByKeySuffix(obj[key], targetSuffix);
            if (result !== undefined) return result;
        }
    }

    return undefined;
};

// Find ALL occurrences (for lines)
const findAllValuesByKeySuffix = (obj: any, targetSuffix: string): any[] => {
    let results: any[] = [];
    if (!obj || typeof obj !== 'object') return results;

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (key === targetSuffix || key.endsWith(':' + targetSuffix)) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    results = results.concat(val);
                } else {
                    results.push(val);
                }
            }
        }
    }

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (key === '#text' || key.startsWith('@_')) continue;
            results = results.concat(findAllValuesByKeySuffix(obj[key], targetSuffix));
        }
    }
    return results;
};

const extractTextVal = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val !== 'object') return String(val);
    if (val['#text'] !== undefined) return String(val['#text']);
    return '';
};

const parseXmlNumber = (val: any): number => {
    let str = extractTextVal(val).trim();
    if (!str) return 0;

    // Remove currency symbols
    str = str.replace(/[₺$€TLUSD]/gi, '').trim();

    // Strateji: Turkish format (1.234,56) vs Global format (1,234.56)
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Turkish format: 1.234,56
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else if (lastDot > lastComma) {
        // Global format: 1,234.56
        return parseFloat(str.replace(/,/g, '')) || 0;
    } else {
        // Only dot or only comma or none
        if (lastComma !== -1) return parseFloat(str.replace(',', '.')) || 0;
        return parseFloat(str) || 0;
    }
};

const validateAndFixItem = (item: ParsedInvoiceItem, senderName?: string, receiverName?: string): ParsedInvoiceItem | null => {
    const name = (item.name || '').trim();
    const cleanName = name.toLowerCase();
    
    // 1. Hallucination / Header Filter (Aggressive)
    const junkKeywords = [
        'vkn:', 'tckn:', 'mersis', 'sicil no', 'tel:', 'faks:', 'fax:', 'e-posta', 'web:',
        'mah.', 'cad.', 'sok.', 'bulv.', 'apt.', 'no:', 'kat:', 'daire:', 'pk:', 'posta kodu',
        'haci bayram', 'rüzgarli', 'altindağ', 'ankara', 'istanbul', 'izmir', 'türkiye',
        'sayin', 'alici', 'müsteri', 'v.d.', 'vergi dairesi', 'merkez'
    ];

    const isJunkKeyword = junkKeywords.some(k => cleanName.includes(k));
    
    // Similarity check with Sender/Receiver names
    const sName = (senderName || '').toLowerCase().trim();
    const rName = (receiverName || '').toLowerCase().trim();
    
    const isHeader = (sName && (cleanName.includes(sName) || sName.includes(cleanName))) ||
                     (rName && (cleanName.includes(rName) || rName.includes(cleanName)));

    // Suspiciously long names (often whole addresses)
    const isTooLong = cleanName.length > 150;

    if (isJunkKeyword || isHeader || isTooLong) {
        console.warn(`🚫 Junk item filtered: "${name}" (Keyword: ${isJunkKeyword}, Header: ${isHeader}, Long: ${isTooLong})`);
        return null;
    }

    // 2. Ensure numbers are valid
    const qty = Number(item.quantity) || 0;
    const uPrice = Number(item.unitPrice) || 0;
    const discRate = Number(item.discountRate) || 0;
    const taxRate = Number(item.taxRate) || 0;

    if (qty === 0 && uPrice === 0) return null; // Empty line

    // 3. Recalculate if totals are missing or logically incorrect
    const rawTotal = qty * uPrice;
    let discAmount = Number(item.discountAmount) || 0;
    
    if (discAmount === 0 && discRate > 0) {
        discAmount = (rawTotal * discRate) / 100;
    }

    const netAmount = rawTotal - discAmount;
    
    let taxAmount = Number(item.taxAmount) || 0;
    if (taxAmount === 0 && taxRate > 0) {
        taxAmount = (netAmount * taxRate) / 100;
    }

    const calculatedGrandTotal = netAmount + taxAmount;

    let finalTotalPrice = Number(item.totalPrice) || 0;
    if (finalTotalPrice === 0 || Math.abs(finalTotalPrice - calculatedGrandTotal) > 0.5) {
        if (finalTotalPrice === 0 || qty * uPrice > 0) {
            finalTotalPrice = calculatedGrandTotal;
        }
    }

    return {
        ...item,
        quantity: qty,
        unitPrice: uPrice,
        discountRate: discRate,
        discountAmount: discAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalPrice: finalTotalPrice
    };
};

/**
 * Parse custom Turkish XML format
 * Format: <Fatura><FaturaKalemleri><Kalem>...</Kalem></FaturaKalemleri></Fatura>
 */
const parseCustomTurkishXml = (fatura: any) => {
    console.log('🔍 Parsing custom Turkish XML format...');
    console.log('📦 Fatura object:', fatura);

    // Extract basic info
    const baslik = fatura.BaslikBilgileri || {};
    const satici = fatura.SatıcıBilgileri || fatura.SatıcıBilgileri || {};
    const alici = fatura.AlıcıBilgileri || fatura.AlıcıBilgileri || {};
    const toplam = fatura.ToplamBilgileri || {};

    console.log('📋 Baslik:', baslik);
    console.log('👤 Satici:', satici);
    console.log('💰 Toplam:', toplam);

    // Invoice number and date
    const invoiceNumber = extractTextVal(baslik.FaturaNo) || 'Bilinmeyen';

    let invoiceDate = new Date();
    const dateStr = extractTextVal(baslik.FaturaTarihi);
    if (dateStr) {
        // Parse DD-MM-YYYY format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            invoiceDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }

    // Sender info
    const senderName = extractTextVal(satici.Unvan) || 'Bilinmeyen Gönderici';
    const senderTaxId = extractTextVal(satici.VKN) || extractTextVal(satici.TCKN);
    const senderTaxOffice = extractTextVal(satici.VergiDairesi);

    // Receiver info
    const receiverName = extractTextVal(alici.Unvan);
    const receiverTaxId = extractTextVal(alici.TCKN) || extractTextVal(alici.VKN);

    // Totals
    const currency = extractTextVal(baslik.ParaBirimi) || 'TRY';
    const subTotal = parseXmlNumber(toplam.MalHizmetToplami);
    const totalDiscountAmount = parseXmlNumber(toplam.ToplamIskonto);
    const totalTaxAmount = parseXmlNumber(toplam.HesaplananKDV);
    const totalAmount = parseXmlNumber(toplam.OdenecekTutar);
    const taxInclusiveTotal = totalAmount;

    // Parse items
    const items: ParsedInvoiceItem[] = [];
    const kalemler = fatura.FaturaKalemleri?.Kalem || [];
    console.log('📦 Kalemler:', kalemler);
    console.log('📦 Is array?', Array.isArray(kalemler));

    const itemArray = Array.isArray(kalemler) ? kalemler : [kalemler];
    console.log('📦 Item array length:', itemArray.length);

    for (const kalem of itemArray) {
        console.log('🔹 Processing kalem:', kalem);

        const name = extractTextVal(kalem.MalHizmet) || 'Ürün';
        const quantity = parseXmlNumber(kalem.Miktar);
        const unit = extractTextVal(kalem.Birim) || 'Adet';
        const unitPrice = parseXmlNumber(kalem.BirimFiyat);
        const discountRate = parseXmlNumber(kalem.IskontoOrani);
        const discountAmount = parseXmlNumber(kalem.IskontoTutari);
        const taxRate = parseXmlNumber(kalem.KDVOrani);
        const taxAmount = parseXmlNumber(kalem.KDVTutari);
        const totalPrice = parseXmlNumber(kalem.Tutar);

        const fixedItem = validateAndFixItem({
            name,
            quantity,
            unit,
            unitPrice,
            listPrice: unitPrice,
            discountRate,
            discountAmount,
            totalPrice,
            taxRate,
            taxAmount
        }, senderName, receiverName);

        if (fixedItem) items.push(fixedItem);
    }

    console.log('✅ Parsed items:', items);

    return {
        invoiceNumber,
        invoiceDate,
        senderName,
        senderTaxId,
        senderTaxOffice,
        receiverName,
        receiverTaxId,
        totalAmount,
        currency: currency as 'TRY' | 'USD' | 'EUR',
        subTotal,
        totalDiscountAmount,
        totalTaxAmount,
        taxInclusiveTotal,
        items
    };
};


const parseUserCustomXml = (invoice: any) => {
    console.log('🔍 Parsing User Custom XML format...');
    const info = invoice.InvoiceInfo || {};
    const seller = invoice.Seller || {};
    const buyer = invoice.Buyer || {};
    const totals = invoice.Totals || {};

    const invoiceNumber = extractTextVal(info.ID) || 'Bilinmeyen';

    // Parse Date (DD-MM-YYYY or YYYY-MM-DD)
    let invoiceDate = new Date();
    const dateStr = extractTextVal(info.Date);
    if (dateStr) {
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            // Assume DD-MM-YYYY if first part is 2 digits, else YYYY-MM-DD
            if (parts[0].length === 2) {
                invoiceDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                invoiceDate = new Date(dateStr);
            }
        }
    }

    const senderName = extractTextVal(seller.Name) || 'Bilinmeyen Gönderici';
    // Use Deep Search for robust extraction (ignores nesting)
    const findDeep = (suffix: string) => extractTextVal(findValueByKeySuffix(invoice, suffix));

    const senderTaxId = extractTextVal(seller.TaxID) || extractTextVal(seller.VKN) || findDeep('VKN') || findDeep('TCKN');
    const senderTaxOffice = extractTextVal(seller.TaxOffice) || extractTextVal(seller.VergiDairesi) || findDeep('VergiDairesi');
    const senderAddress = extractTextVal(seller.Address) || extractTextVal(seller.Adres) || findDeep('Address') || findDeep('Adres');

    // For Phone/Email, be aggressive with multiple synonyms
    const senderPhone = extractTextVal(seller.Phone) || extractTextVal(seller.Telefon) ||
        findDeep('Phone') || findDeep('Telefon') || findDeep('Tel');

    const senderEmail = extractTextVal(seller.Email) || extractTextVal(seller.Eposta) ||
        findDeep('Email') || findDeep('Eposta') || findDeep('E-posta');

    const receiverName = extractTextVal(buyer.Name);
    const receiverTaxId = extractTextVal(buyer.TaxID);

    const currency = 'TRY'; // Default per prompt instructions (user said explicit currency symbols usually not there but prompt implies TRY usage or context)

    const parseTurkishFloat = (val: any): number => {
        return parseXmlNumber(val);
    };



    // --- AMOUNTS CALCULATION ---
    // Support both English and Turkish field names (NetTotal or NetToplam)
    const netTotalVal = parseTurkishFloat(extractTextVal(totals.NetTotal || totals.NetToplam)); // GROSS (Items Total)
    const totalDiscountAmount = parseTurkishFloat(extractTextVal(totals.AllowanceTotal || totals.TotalDiscount));
    const taxBaseVal = parseTurkishFloat(extractTextVal(totals.TaxBase)); // MATRAH (Net after discount)
    const totalTaxAmount = parseTurkishFloat(extractTextVal(totals.TaxTotal));
    const totalAmount = parseTurkishFloat(extractTextVal(totals.PayableTotal));

    // The "Matrah" we show in list and use for calculations
    // If TaxBase exists, it is the actual Matrah.
    // If not, we fall back to NetTotal (which might already be net in other templates)
    const subTotal = taxBaseVal || netTotalVal;

    const taxInclusiveTotal = totalAmount;

    const items: ParsedInvoiceItem[] = [];
    const lines = invoice.Lines?.Line || [];
    const lineArray = Array.isArray(lines) ? lines : [lines];

    for (const line of lineArray) {
        const name = extractTextVal(findValueByKeySuffix(line, 'Description')) ||
            extractTextVal(findValueByKeySuffix(line, 'MalHizmet')) || 'Ürün';

        const qty = parseXmlNumber(findValueByKeySuffix(line, 'Quantity')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'Miktar'));
        const unit = extractTextVal(findValueByKeySuffix(line, 'Unit')) ||
            extractTextVal(findValueByKeySuffix(line, 'Birim')) || 'Adet';
        const uPrice = parseXmlNumber(findValueByKeySuffix(line, 'UnitPrice')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'BirimFiyat'));

        const discRate = parseXmlNumber(findValueByKeySuffix(line, 'DiscountRate')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'IskontoOrani')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'AllowancePercent'));

        const discAmount = parseXmlNumber(findValueByKeySuffix(line, 'DiscountAmount')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'IskontoTutari')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'AllowanceAmount'));

        const taxRate = parseXmlNumber(findValueByKeySuffix(line, 'TaxPercent')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'KDVOrani')) || 20;

        let taxAmount = parseXmlNumber(findValueByKeySuffix(line, 'TaxAmount')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'KDVTutari'));

        // KRİTİK: Eğer KDV Tutarı yoksa, hesapla
        // KDV Tutarı = (Miktar * Birim Fiyat - İskonto) * (KDV Oranı / 100)
        if (!taxAmount && taxRate > 0 && uPrice && qty) {
            const baseAmount = (qty * uPrice) - (discAmount || 0);
            taxAmount = baseAmount * (taxRate / 100);
            console.log(`💡 KDV Tutarı hesaplandı: ${baseAmount} * ${taxRate}% = ${taxAmount}`);
        }

        const tPrice = parseXmlNumber(findValueByKeySuffix(line, 'LineTotal')) ||
            parseXmlNumber(findValueByKeySuffix(line, 'Tutar'));

        const fixedItem = validateAndFixItem({
            name,
            quantity: qty,
            unit,
            unitPrice: uPrice,
            listPrice: uPrice,
            discountRate: discRate,
            discountAmount: discAmount,
            taxRate,
            taxAmount,
            totalPrice: tPrice
        }, senderName, receiverName);

        if (fixedItem) items.push(fixedItem);
    }

    return {
        invoiceNumber,
        invoiceDate,
        senderName,
        senderTaxId,
        senderTaxOffice,
        senderAddress,
        senderPhone,
        senderEmail,
        receiverName,
        receiverTaxId,
        totalAmount,
        currency: currency as 'TRY' | 'USD' | 'EUR',
        subTotal,
        totalDiscountAmount,
        totalTaxAmount,
        taxInclusiveTotal,
        items
    };
};

export const parseInvoiceXml = async (input: File | string) => {
    let text = '';

    if (input instanceof File) {
        const arrayBuffer = await input.arrayBuffer();

        // 1. First, try to read the header to see if there's an explicit encoding
        const headDecoder = new TextDecoder('utf-8');
        const head = headDecoder.decode(new Uint8Array(arrayBuffer.slice(0, 1000)));
        const match = head.match(/encoding=["'](.*?)["']/i);
        const explicitEncoding = match ? match[1].toLowerCase() : null;

        console.log(`📄 XML Parser: Explicit encoding in header: "${explicitEncoding || 'none'}"`);

        try {
            if (explicitEncoding) {
                // If header says something, trust it first
                const decoder = new TextDecoder(explicitEncoding);
                text = decoder.decode(arrayBuffer);
            } else {
                // No header? Try UTF-8 first (fatal mode to catch errors)
                const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
                text = utf8Decoder.decode(arrayBuffer);
            }
        } catch (e) {
            console.warn(`⚠️ XML Parser: UTF-8 decoding failed or header encoding invalid. Trying ISO-8859-9 (Turkish)...`);
            try {
                // Fallback to Turkish ISO-8859-9
                const isoDecoder = new TextDecoder('iso-8859-9');
                text = isoDecoder.decode(arrayBuffer);
            } catch (e2) {
                console.error(`❌ XML Parser: All decoding attempts failed.`);
                text = new TextDecoder('utf-8').decode(arrayBuffer); // Last resort non-fatal
            }
        }
    } else {
        text = input;
    }

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        removeNSPrefix: true,
        parseTagValue: true,
        trimValues: true,
        textNodeName: "#text"
    });

    let parsed = parser.parse(text);

    // 1. Check for User Custom Format (Root Invoice -> InvoiceInfo)
    // parsed.Invoice is root.
    if (parsed.Invoice && parsed.Invoice.InvoiceInfo) {
        console.log('📄 Detected USER Custom XML format');
        return parseUserCustomXml(parsed.Invoice);
    }

    // 2. Custom Turkish format (Old)
    if (parsed.Fatura) {
        console.log('📄 Detected custom Turkish XML format');
        return parseCustomTurkishXml(parsed.Fatura);
    }

    // 3. Standard UBL format fallback
    console.log('📄 Detected UBL XML format');
    let root = parsed.Invoice || parsed;
    root = cleanupObject(root);

    // Deep Search Helper
    const findDeep = (suffix: string) => findValueByKeySuffix(root, suffix);
    const extractDeep = (suffix: string) => extractTextVal(findDeep(suffix));

    // 1. Basic Info
    let invoiceNumber = extractDeep('ID');

    let invoiceDate = new Date();
    const dateStr = extractDeep('IssueDate');
    if (dateStr) invoiceDate = new Date(dateStr);

    // 2. Sender (Supplier) Info
    const supplier = findDeep('AccountingSupplierParty');
    let senderName = 'Bilinmeyen Gönderici';
    let senderTaxId = '';
    let senderTaxOffice = '';
    let senderAddress = '';
    let senderPhone = '';
    let senderEmail = '';

    if (supplier) {
        // --- NAME ---
        const partyNameVal = findValueByKeySuffix(supplier, 'PartyName');
        const regNameVal = findValueByKeySuffix(supplier, 'RegistrationName');

        senderName = extractTextVal(findValueByKeySuffix(partyNameVal, 'Name')) ||
            extractTextVal(regNameVal) ||
            'Bilinmeyen Gönderici';

        if (senderName === 'Bilinmeyen Gönderici' || senderName === '') {
            const person = findValueByKeySuffix(supplier, 'Person');
            if (person) {
                const first = extractTextVal(findValueByKeySuffix(person, 'FirstName'));
                const last = extractTextVal(findValueByKeySuffix(person, 'FamilyName'));
                senderName = `${first} ${last}`.trim();
            }
        }

        // --- VKN / TCKN (Aggressive) ---
        // 1. Check ID with schemeID
        const ids = findAllValuesByKeySuffix(supplier, 'ID');
        for (const idObj of ids) {
            const scheme = (idObj['@_schemeID'] || idObj['@_schemeAgencyID'] || '').toUpperCase();
            if (scheme === 'VKN' || scheme === 'TCKN') {
                senderTaxId = extractTextVal(idObj);
                break;
            }
        }
        // 2. If empty, look for any 10 or 11 digit number in any ID field
        if (!senderTaxId) {
            for (const idObj of ids) {
                const val = extractTextVal(idObj).replace(/\s/g, '');
                if (/^\d{10,11}$/.test(val)) {
                    senderTaxId = val;
                    break;
                }
            }
        }
        // 3. Fallback to basic find
        if (!senderTaxId) senderTaxId = extractTextVal(findValueByKeySuffix(supplier, 'ID'));

        // --- ADDRESS ---
        const addr = findValueByKeySuffix(supplier, 'PostalAddress');
        if (addr) {
            const street = extractTextVal(findValueByKeySuffix(addr, 'StreetName'));
            const bldg = extractTextVal(findValueByKeySuffix(addr, 'BuildingNumber'));
            const city = extractTextVal(findValueByKeySuffix(addr, 'CityName'));
            const dist = extractTextVal(findValueByKeySuffix(addr, 'CitySubdivisionName'));
            senderAddress = [street, bldg, dist, city].filter(Boolean).join(' ').trim().replace(/\s+/g, ' ');
        }

        // --- CONTACT ---
        const contact = findValueByKeySuffix(supplier, 'Contact');
        if (contact) {
            senderPhone = extractTextVal(findValueByKeySuffix(contact, 'Telephone'));
            senderEmail = extractTextVal(findValueByKeySuffix(contact, 'ElectronicMail'));
        }

        // --- TAX OFFICE ---
        // Deep search specifically for TaxScheme -> Name inside the supplier block
        const taxScheme = findValueByKeySuffix(supplier, 'TaxScheme');
        senderTaxOffice = extractTextVal(findValueByKeySuffix(taxScheme, 'Name')) ||
            extractTextVal(findValueByKeySuffix(supplier, 'TaxTaxScheme')) ||
            extractTextVal(findValueByKeySuffix(supplier, 'VergiDairesi'));
    }

    // 3. Receiver (Buyer) Info
    const buyer = findDeep('AccountingCustomerParty');
    let receiverName = '';
    let receiverTaxId = '';
    if (buyer) {
        const partyNameVal = findValueByKeySuffix(buyer, 'PartyName');
        if (partyNameVal) receiverName = extractTextVal(findValueByKeySuffix(partyNameVal, 'Name'));
        receiverTaxId = extractTextVal(findValueByKeySuffix(buyer, 'ID'));
    }

    // 4. Totals
    let totalAmount = 0;
    let subTotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let taxInclusiveTotal = 0;
    let currency = 'TRY';

    const monetaryTotal = findDeep('LegalMonetaryTotal');
    if (monetaryTotal) {
        const payAmount = findValueByKeySuffix(monetaryTotal, 'PayableAmount');
        if (payAmount) {
            totalAmount = parseXmlNumber(payAmount);
            if (payAmount['@_currencyID']) currency = payAmount['@_currencyID'];
        }
        subTotal = parseXmlNumber(findValueByKeySuffix(monetaryTotal, 'LineExtensionAmount'));
        totalDiscountAmount = parseXmlNumber(findValueByKeySuffix(monetaryTotal, 'AllowanceTotalAmount'));
        taxInclusiveTotal = parseXmlNumber(findValueByKeySuffix(monetaryTotal, 'TaxInclusiveAmount'));
    }

    const taxTotalObj = findDeep('TaxTotal');
    if (taxTotalObj) {
        totalTaxAmount = parseXmlNumber(findValueByKeySuffix(taxTotalObj, 'TaxAmount'));
    }

    // Heuristic for Tax if missing
    if (totalTaxAmount === 0 && taxInclusiveTotal > 0 && subTotal > 0) {
        totalTaxAmount = taxInclusiveTotal - (subTotal - totalDiscountAmount);
    }

    // 5. Items
    const items: ParsedInvoiceItem[] = [];
    const rawLines = findAllValuesByKeySuffix(root, 'InvoiceLine');

    const UNIT_CODES: { [key: string]: string } = {
        'C62': 'Adet', 'H87': 'Adet', 'NIU': 'Adet', 'EA': 'Adet',
        'GRM': 'Gram', 'KGM': 'Kg', 'MTR': 'Metre', 'LTR': 'Litre',
        'DAY': 'Gün', 'HUR': 'Saat', 'SET': 'Set', 'MTK': 'm2', 'MTQ': 'm3'
    };

    for (const line of rawLines) {
        let nameVal = 'Ürün';
        const itemObj = findValueByKeySuffix(line, 'Item');
        if (itemObj) {
            nameVal = extractTextVal(findValueByKeySuffix(itemObj, 'Name')) ||
                extractTextVal(findValueByKeySuffix(itemObj, 'Description')) || 'Ürün';
        } else {
            nameVal = extractTextVal(findValueByKeySuffix(line, 'Name')) || 'Ürün';
        }

        // --- AGGRESSIVE ANTI-HALLUCINATION FILTER ---
        const cleanName = nameVal.trim().toLowerCase();
        const cleanSenderName = (senderName || '').trim().toLowerCase();

        // Filter if name is the supplier name OR contains very suspicious keywords and looks like a header
        const isHeaderMatch = cleanSenderName && (cleanName.includes(cleanSenderName) || cleanSenderName.includes(cleanName));
        const isJunkName = isHeaderMatch || cleanName.includes('vkn:') || cleanName.includes('vergi no:') || cleanName.length > 100;

        if (isJunkName) {
            console.warn(`🚫 Filtering suspected junk/header item line: ${nameVal}`);
            continue;
        }

        const qtyObj = findValueByKeySuffix(line, 'InvoicedQuantity');
        const quantity = parseXmlNumber(qtyObj);
        let unit = qtyObj ? (qtyObj['@_unitCode'] || 'Adet') : 'Adet';
        if (UNIT_CODES[unit]) unit = UNIT_CODES[unit];

        const unitPrice = parseXmlNumber(findValueByKeySuffix(line, 'PriceAmount'));

        let discountAmount = 0;
        let discountRate = 0;

        // 1. Try standard UBL AllowanceCharge
        const allowance = findValueByKeySuffix(line, 'AllowanceCharge');
        if (allowance && extractTextVal(allowance.ChargeIndicator) !== 'true') {
            discountAmount = parseXmlNumber(findValueByKeySuffix(allowance, 'Amount'));
            discountRate = parseXmlNumber(findValueByKeySuffix(allowance, 'MultiplierFactorNumeric')) ||
                parseXmlNumber(findValueByKeySuffix(allowance, 'Percent'));

            // If it's a multiplier (e.g. 0.2 for 20%), convert to percentage
            if (discountRate > 0 && discountRate < 1) {
                discountRate = discountRate * 100;
            }
        }

        // 2. Fallback to direct tags (common in custom Turkish XML or AI extracts)
        if (discountAmount === 0) discountAmount = parseXmlNumber(findValueByKeySuffix(line, 'DiscountAmount'));
        if (discountRate === 0) discountRate = parseXmlNumber(findValueByKeySuffix(line, 'DiscountRate'));

        const totalPrice = parseXmlNumber(findValueByKeySuffix(line, 'LineExtensionAmount'));

        // Tax Extraction
        let taxRate = 0;
        let taxAmount = 0;

        const taxTotalItem = findValueByKeySuffix(line, 'TaxTotal');
        if (taxTotalItem) {
            taxRate = parseXmlNumber(findValueByKeySuffix(taxTotalItem, 'Percent'));
            taxAmount = parseXmlNumber(findValueByKeySuffix(taxTotalItem, 'TaxAmount'));
        }

        // Fallback for direct tax tags
        if (taxRate === 0) taxRate = parseXmlNumber(findValueByKeySuffix(line, 'TaxPercent')) || parseXmlNumber(findValueByKeySuffix(line, 'TaxRate'));
        if (taxAmount === 0) taxAmount = parseXmlNumber(findValueByKeySuffix(line, 'TaxAmount'));

        const fixedItem = validateAndFixItem({
            name: nameVal,
            quantity,
            unit,
            unitPrice,
            totalPrice,
            taxRate,
            discountRate,
            discountAmount,
            taxAmount
        }, senderName, receiverName);

        if (fixedItem) items.push(fixedItem);
    }

    return {
        invoiceNumber,
        invoiceDate,
        senderName,
        senderTaxId,
        senderTaxOffice,
        senderAddress,
        senderPhone,
        senderEmail,
        receiverName,
        receiverTaxId,
        totalAmount,
        currency: currency as 'TRY' | 'USD' | 'EUR',
        subTotal,
        totalDiscountAmount,
        totalTaxAmount,
        taxInclusiveTotal,
        items
    };
};
