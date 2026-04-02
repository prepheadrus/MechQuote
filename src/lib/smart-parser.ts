// Helper to normalize Turkish characters for better matching
const normalizeTR = (text: string) => {
    return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
};

export interface ParsedInvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unit?: string;
    listPrice?: number;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    discountRate?: number;
}

const parseTRNumber = (str: string) => {
    if (!str) return 0;
    // Clean currency symbols if attached
    str = str.replace(/[₺$€TLUSD]/gi, '').trim();

    // Check for standard TR format: 1.234,56
    // If comma is the last separator and dot is before it
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // Remove dots, replace comma with dot
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }

    // Check for standard US/Global format: 1,234.56
    if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
        return parseFloat(str.replace(/,/g, ''));
    }

    // Check for mixed/ambiguous
    // If only comma: 1234,56
    if (str.includes(',') && !str.includes('.')) {
        return parseFloat(str.replace(',', '.'));
    }

    // If only dot: 1.234 (could be 1234 integers or 1.234 decimal)
    // usually in invoice context 3 decimals is rare for total but possible for unit.
    // However, fast-xml-parser usually returns dot for decimals. This is PDF text.
    // Let's assume dot is thousand separator if it looks like an integer, 
    // UNLESS it has 4 decimals like 31.900,0000 (which is 31900).
    // Let's rely on standard parseFloat logic for 'dot' if no comma is present? 
    // No, TR uses dot for thousands. 1.000 is 1000. 
    return parseFloat(str.replace(/\./g, ''));
};

const isNumeric = (str: string) => {
    if (!str) return false;
    // Improved: Clean letters and currency symbols
    const clean = str.replace(/[.,]/g, '').replace(/[₺$€TLUSD%]/gi, '').trim();
    return !isNaN(Number(clean)) && clean !== '';
};

// Common Unit codes/names
const UNITS = ['Adet', 'Ad.', 'M.', 'Kg', 'Ton', 'Set', 'Saat', 'Gün', 'Ay', 'Yıl', 'Paket', 'Kutu', 'Litre', 'Lt.'];

// Helper: Visual Table Detection (Numeric Density Based)
const parseTableFromGrid = (rawItems: { str: string; x: number; y: number }[]): ParsedInvoiceItem[] => {
    const items: ParsedInvoiceItem[] = [];

    if (!rawItems || rawItems.length === 0) return [];

    // 1. Group items by Y coordinate (rows)
    const rows: { y: number; items: { str: string; x: number; y: number }[] }[] = [];
    rawItems.forEach(item => {
        let row = rows.find(r => Math.abs(r.y - item.y) < 5);
        if (!row) {
            row = { y: item.y, items: [] };
            rows.push(row);
        }
        row.items.push(item);
    });

    // Sort rows top to bottom
    rows.sort((a, b) => b.y - a.y);

    // 2. VISUAL TABLE DETECTION: Find rows with high numeric density
    const rowDensity = rows.map((row, idx) => {
        const numCount = row.items.filter(item => isNumeric(item.str)).length;
        const totalCount = row.items.length;
        return {
            idx,
            row,
            density: totalCount > 0 ? numCount / totalCount : 0,
            numCount
        };
    });

    // Find table region: consecutive rows with density >= 0.4 AND at least 2 numbers
    let tableStart = -1;
    let tableEnd = -1;
    let currentSequenceStart = -1;
    let maxSequenceLength = 0;

    for (let i = 0; i < rowDensity.length; i++) {
        const isTableRow = rowDensity[i].density >= 0.4 && rowDensity[i].numCount >= 2;

        if (isTableRow) {
            if (currentSequenceStart === -1) {
                currentSequenceStart = i;
            }
        } else {
            if (currentSequenceStart !== -1) {
                const seqLength = i - currentSequenceStart;
                if (seqLength > maxSequenceLength) {
                    maxSequenceLength = seqLength;
                    tableStart = currentSequenceStart;
                    tableEnd = i - 1;
                }
                currentSequenceStart = -1;
            }
        }
    }

    // Check if sequence extends to end
    if (currentSequenceStart !== -1) {
        const seqLength = rowDensity.length - currentSequenceStart;
        if (seqLength > maxSequenceLength) {
            tableStart = currentSequenceStart;
            tableEnd = rowDensity.length - 1;
        }
    }

    if (tableStart === -1 || tableEnd === -1 || (tableEnd - tableStart) < 1) {
        // No valid table region found
        return [];
    }

    // 3. AUTO-DETECT COLUMNS: Cluster X coordinates
    const tableRows = rowDensity.slice(tableStart, tableEnd + 1).map(rd => rd.row);
    const allX = tableRows.flatMap(row => row.items.map(item => item.x));

    // Simple clustering: group X values within 30 units
    const xClusters: number[][] = [];
    const sortedX = [...new Set(allX)].sort((a, b) => a - b);

    let currentCluster: number[] = [];
    for (let i = 0; i < sortedX.length; i++) {
        if (currentCluster.length === 0) {
            currentCluster.push(sortedX[i]);
        } else {
            const lastX = currentCluster[currentCluster.length - 1];
            if (sortedX[i] - lastX <= 30) {
                currentCluster.push(sortedX[i]);
            } else {
                xClusters.push(currentCluster);
                currentCluster = [sortedX[i]];
            }
        }
    }
    if (currentCluster.length > 0) {
        xClusters.push(currentCluster);
    }

    // Define column boundaries
    const columns = xClusters.map(cluster => {
        const xCenter = cluster.reduce((a, b) => a + b, 0) / cluster.length;
        const xMin = Math.min(...cluster) - 20;
        const xMax = Math.max(...cluster) + 20;
        return { xCenter, xMin, xMax };
    }).sort((a, b) => a.xCenter - b.xCenter);

    if (columns.length < 2) {
        // Need at least 2 columns (name + one number)
        return [];
    }

    // 4. ASSIGN COLUMN ROLES
    // First column = Name
    // Rightmost numeric columns = Total, Price, Qty (right to left)
    const nameColumn = columns[0];
    const numericColumns = columns.slice(1);

    // 5. PARSE ROWS with mathematical validation
    let currentNameBuffer: string[] = [];
    let currentItem: Partial<ParsedInvoiceItem> = {};

    for (const row of tableRows) {
        const rowItems = [...row.items].sort((a, b) => a.x - b.x);

        // Extract values from each column
        const nameItems: string[] = [];
        const numericValues: number[] = [];
        const unitItems: string[] = [];

        rowItems.forEach(item => {
            const x = item.x;

            // Check which column this item belongs to
            if (x >= nameColumn.xMin && x <= nameColumn.xMax) {
                nameItems.push(item.str);
            } else {
                // Check numeric columns
                for (const col of numericColumns) {
                    if (x >= col.xMin && x <= col.xMax) {
                        if (isNumeric(item.str)) {
                            numericValues.push(parseTRNumber(item.str));
                        } else if (UNITS.some(u => item.str.toLowerCase().includes(u.toLowerCase()))) {
                            unitItems.push(item.str);
                        }
                        break;
                    }
                }
            }
        });

        // MATHEMATICAL VALIDATION
        let hasValidFinancials = false;
        let qty = 1;
        let price = 0;
        let total = 0;

        if (numericValues.length >= 2) {
            // Try different combinations (right to left)
            total = numericValues[numericValues.length - 1];
            price = numericValues[numericValues.length - 2];

            if (numericValues.length >= 3) {
                qty = numericValues[numericValues.length - 3];
            }

            // Validate: Qty * Price ≈ Total
            if (Math.abs(qty * price - total) < 1.0 && total > 0) {
                hasValidFinancials = true;
            } else if (Math.abs(price - total) < 1.0 && total > 0) {
                // Maybe Qty = 1 implied
                qty = 1;
                hasValidFinancials = true;
            }
        } else if (numericValues.length === 1) {
            // Single number might be total with qty=1
            total = numericValues[0];
            price = total;
            qty = 1;
            hasValidFinancials = total > 0;
        }

        if (hasValidFinancials) {
            // Flush previous item
            if (currentItem.totalPrice) {
                currentItem.name = currentNameBuffer.join(' ').trim().replace(/^\d+\s+/, '');
                if (currentItem.name && currentItem.name.length > 2) {
                    items.push(currentItem as ParsedInvoiceItem);
                }
            }

            // Start new item
            currentNameBuffer = [...nameItems];
            currentItem = {
                quantity: qty,
                unitPrice: price,
                totalPrice: total,
                unit: unitItems.length > 0 ? unitItems[0].replace(/[0-9]/g, '').trim() : 'Adet',
                taxRate: 20
            };
        } else if (nameItems.length > 0) {
            // Continuation row
            currentNameBuffer.push(...nameItems);
        }
    }

    // Flush last item
    if (currentItem.totalPrice) {
        currentItem.name = currentNameBuffer.join(' ').trim().replace(/^\d+\s+/, '');
        if (currentItem.name && currentItem.name.length > 2) {
            items.push(currentItem as ParsedInvoiceItem);
        }
    }

    return items;
};

// Common Unit codes/names

export const smartParseInvoice = (text: string, rawItems?: { str: string; x: number; y: number }[]) => {
    const lines = text.split('\n');
    let items: ParsedInvoiceItem[] = [];

    // If we have spatial data (PDF items), try stricter Grid Parsing first
    if (rawItems && rawItems.length > 0) {
        items = parseTableFromGrid(rawItems);
    }

    // If Grid Parsing returned nothing (maybe no header match), fallback to Text Line Parsing
    if (items.length === 0) {
        // ... (Original logic below) ...
    }

    let senderName = '';
    let invoiceDate: Date | null = null;
    let totalAmount = 0;
    let subTotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let taxInclusiveTotal = 0;
    let invoiceNumber = '';
    let currency: 'TRY' | 'USD' | 'EUR' = 'TRY';

    // 1. Basic Metadata Extraction

    // Invoice Number (Belge No - Priority)
    // 1. Try Specific Label Match (Highest Priority)
    // Supports: "Fatura No", "Fatura Numarası", "Belge No", "Belge Numarası"
    // Logic: Starts with Letter, Total 16 Alphanumeric Chars.
    const labelMatch = text.match(/(Fatura|Belge)\s*(No|Numarası|Numarasi)\s*[:.]?\s*([A-Z][A-Z0-9]{15})\b/i);
    if (labelMatch) {
        invoiceNumber = labelMatch[3];
    } else {
        // 2. Fallback: Search for ANY valid 16-char ID starting with a Letter
        // Must be a standalone word (boundary check) to avoid IBANs (26 chars)
        const fallbackMatch = text.match(/\b([A-Z][A-Z0-9]{15})\b/);
        if (fallbackMatch) {
            invoiceNumber = fallbackMatch[1];
        }
    }

    // ETTN (UUID)
    let ettsn = '';
    const ettnMatch = text.match(/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/);
    if (ettnMatch) {
        ettsn = ettnMatch[0];
    }

    // Date (General Fallback)
    const dateMatch = text.match(/(\d{2})\s*[./-]\s*(\d{2})\s*[./-]\s*(\d{4})/);
    if (dateMatch) {
        invoiceDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
    }

    // NEW: Scenario & Invoice Type Extraction
    let scenario = '';
    let invoiceType = '';

    // Look for "Senaryo: X" and "Fatura Tipi: Y"
    const scenarioMatch = text.match(/Senaryo\s*[:]\s*([A-Z\s]+)/i);
    if (scenarioMatch) scenario = scenarioMatch[1].trim();

    const typeMatch = text.match(/Fatura Tipi\s*[:]\s*([A-ZŞİĞÜÖÇ\s]+)/i);
    if (typeMatch) invoiceType = typeMatch[1].trim();

    // Refine Date if "Düzenleme Tarihi" or "Fatura Tarihi" header exists specifically
    // Pattern: Label + maybe colon + DD + separator + MM + separator + YYYY
    // Updated to allow spaces around separators e.g. "29 - 01 - 2026"
    const issueDateMatch = text.match(/(Düzenleme Tarihi|Fatura Tarihi|Tarih)\s*[:]\s*(\d{2})\s*[./-]\s*(\d{2})\s*[./-]\s*(\d{4})/i);
    if (issueDateMatch) {
        invoiceDate = new Date(`${issueDateMatch[4]}-${issueDateMatch[3]}-${issueDateMatch[2]}`);
    } else {
        // Backup: Try finding just DD-MM-YYYY near specific keywords if full pattern failed
    }

    // Sender Name (Heuristic)
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
        const line = lines[i];
        if ((line.includes('ŞTİ') || line.includes('A.Ş') || line.includes('LTD') || line.includes('TİC') || line.includes('MÜHENDİSLİK') || line.includes('SAN.'))) {
            const upLine = line.toUpperCase();

            // Check immediate context for "SAYIN" (Receiver indicator)
            let isReceiver = false;
            if (upLine.includes('SAYIN') || upLine.includes('ALICI')) isReceiver = true;
            // Look back 1-2 lines to see if it's prefixed by "SAYIN"
            if (!isReceiver && i > 0) {
                const prev = lines[i - 1].toUpperCase();
                if (prev.includes('SAYIN') || prev.includes('ALICI')) isReceiver = true;
            }
            if (!isReceiver && i > 1) {
                const prev2 = lines[i - 2].toUpperCase();
                if (prev2.includes('SAYIN') || prev2.includes('ALICI')) isReceiver = true;
            }

            if (!isReceiver && line.length < 150 && !upLine.includes('FATURA') && !upLine.includes('VERGİ') && !upLine.includes('MÜŞTERİ VKN')) {
                senderName = line.trim();

                // Check previous lines for multi-line names (e.g., "ETRA ENERJİ \n \n İNŞ.İTH...")
                // Look back up to 3 lines
                for (let k = 1; k <= 3; k++) {
                    if (i - k < 0) break;
                    const prevLine = lines[i - k].trim();
                    if (!prevLine) continue; // Skip empty lines

                    // If previous line matches exclusion criteria, stop backtracking
                    const upPrev = prevLine.toUpperCase();
                    if (upPrev.includes('SAYIN') ||
                        upPrev.includes('FATURA') ||
                        upPrev.includes('TARIH') ||
                        upPrev === 'MERKEZ' ||
                        upPrev === 'ŞUBE' ||
                        upPrev === 'DEPO' ||
                        prevLine.match(/\d{2}\/\d{2}\/\d{4}/)) {
                        break;
                    }

                    // If it looks like a valid name part (Length > 2, not just punctuation)
                    if (prevLine.length > 2 && prevLine.length < 100) {
                        senderName = prevLine + ' ' + senderName;
                        // Continue to find more lines (don't break immediately)
                    }
                }

                // --- NEW: Look FORWARD to append lines (e.g. "LİMİTED ŞİRKETİ" on next line) ---
                for (let k = 1; k <= 2; k++) {
                    if (i + k >= lines.length) break;
                    const nextLine = lines[i + k].trim();
                    const upNext = nextLine.toUpperCase();

                    // If next line is clearly metadata or address, stop
                    if (upNext.includes('VERGİ') || upNext.includes('VKN') || upNext.includes('TEL:') || upNext.includes('ADRES') || nextLine.length > 100) break;

                    // If next line has corporate keywords, DEFINITELY append
                    // Also if it's "VE", "SAN.", "TİC."
                    if (upNext.includes('ŞTİ') || upNext.includes('LTD') || upNext.includes('LİMİTED') || upNext.includes('SİSTEMLERİ') || upNext.includes('SAN.') || upNext.includes('TİC.') || upNext.includes('VE ')) {
                        senderName = senderName + ' ' + nextLine;
                        i++; // Skip this line in main loop since we consumed it
                    }
                }

                break;
            }
        }
    }



    // FALLBACK SENDER DETECTION (For Personal Names / Sole Proprietorships)
    // If no corporate keyword (LTD, STI, etc.) was found, look at the top lines.
    if (!senderName) {
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            const line = lines[i].trim();
            const upLine = line.toUpperCase();

            // Skip empty or too short lines
            if (line.length < 3) continue;

            // Skip common metadata headers
            if (upLine.includes('FATURA') ||
                upLine.includes('SAYIN') ||
                upLine.includes('ALICI') ||
                upLine.includes('TARİH') ||
                upLine.includes('DÜZENLEME') ||
                upLine.includes('SAAT') ||
                upLine.includes('ETTN') ||
                upLine.includes('VERGİ') ||
                upLine.includes('VKN') ||
                upLine.includes('TCKN') ||
                upLine.includes('MERSİS') ||
                upLine.includes('SİCİL') ||
                upLine.includes('SENARYO') ||
                upLine.includes('TİP') ||
                upLine.match(/\d{2}\/\d{2}\/\d{4}/) // Skip dates
            ) {
                continue;
            }

            // If we found a clean line at the top, assume it's the sender name (e.g. "SERHAT TUNCER")
            senderName = line;

            // Checks if the next line is also part of the name (optional, but e-Archive often repeats or has title)
            // For now, single line is safer for personal names.
            break;
        }
    }


    // --- NEW: Extra Metadata Extraction (Address, Tax, Phone) ---
    let senderAddress = '';
    let senderPhone = '';
    let taxId = '';
    let taxOffice = '';

    // Scan for Metadata
    for (const line of lines) {
        const upLine = line.toUpperCase();

        // Tax ID (VKN/TCKN)
        if (!taxId) {
            const vknMatch = line.match(/(VKN|TCKN|VERGİ\s*NO|KİMLİK\s*NO)[\s:.]*(\d{10,11})/i);
            if (vknMatch) taxId = vknMatch[2];
        }

        // Tax Office
        if (!taxOffice) {
            const officeMatch = line.match(/(VERGİ\s*DAİRESİ|VD)[\s:.]*([A-Za-zÇĞİÖŞÜçğıöşü\s]+)/i);
            if (officeMatch) {
                let office = officeMatch[2].replace(/MÜD\.?/i, '').trim();
                if (office.endsWith('NO')) office = office.substring(0, office.length - 2).trim();
                if (office.length > 2) taxOffice = office;
            }
        }

        // Phone
        if (!senderPhone) {
            const phoneMatch = line.match(/(TEL|TELEFON|MOBİL)[\s:.]*([0-9\+\-\s\(\)]{10,})/i);
            if (phoneMatch) senderPhone = phoneMatch[2].trim();
        }

        // Address (Heuristic)
        if (!senderAddress && (upLine.includes('MAH.') || upLine.includes('CAD.') || upLine.includes('SOK.') || upLine.includes('NO:') || upLine.includes('BULVARI'))) {
            if (!upLine.includes('SAYIN') && !upLine.includes('ALICI')) {
                senderAddress = line.trim();
            }
        }
    }

    // Financial Summary (Bottom-Up Scan)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Find trailing number
        const tokens = line.trim().split(/\s+/);
        let valToken = tokens[tokens.length - 1];
        if (!isNumeric(valToken)) {
            valToken = tokens[tokens.length - 2];
        }

        if (valToken && isNumeric(valToken)) {
            const val = parseTRNumber(valToken);

            // Payable / Grand Total
            if (lowerLine.includes('ödenecek') || lowerLine.includes('genel toplam') || lowerLine.includes('payable')) {
                if (totalAmount === 0) totalAmount = val;

                // Currency Check
                const upperLine = line.toUpperCase();
                if (upperLine.match(/\bUSD\b/) || line.includes('$')) currency = 'USD';
                if (upperLine.match(/\bEUR\b/) || line.includes('€')) currency = 'EUR';
            }

            // Tax Inclusive
            if (lowerLine.includes('vergiler dahil') || lowerLine.includes('vergi dahil')) {
                taxInclusiveTotal = val;
            }

            // Subtotal (Mal Hizmet Toplam)
            if (lowerLine.includes('mal') && (lowerLine.includes('toplam') || lowerLine.includes('hizmet'))) {
                subTotal = val;
            }

            // Discount
            if (lowerLine.includes('iskonto')) {
                // If it is 'iskonto oranı' skip, we want amount
                if (!lowerLine.includes('oran')) {
                    totalDiscountAmount = val;
                }
            }

            // Tax Total
            if ((lowerLine.includes('kdv') || lowerLine.includes('vergi')) && lowerLine.includes('toplam')) {
                totalTaxAmount = val;
            }
            // Just "Hesaplanan KDV"
            else if (lowerLine.includes('hesaplanan kdv')) {
                totalTaxAmount = val;
            }
        }
    }

    // Fallback Calculations
    if (totalAmount === 0 && subTotal > 0 && totalTaxAmount > 0) {
        totalAmount = subTotal + totalTaxAmount - totalDiscountAmount;
    }
    if (taxInclusiveTotal === 0 && totalAmount > 0) {
        taxInclusiveTotal = totalAmount;
    }

    // 2. Line Item Extraction (RTL Text Analysis)
    let pendingTextLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip headers/footers
        if (line.match(/toplam|kdv|tutar|matrah|iban|banka|fatura tarihi|belge no|sayın/i)) {
            pendingTextLines = [];
            continue;
        }
        if (line.trim().length < 2) continue;

        // SKIP Header Row explicitly (Malzeme ... Miktar ... vs)
        if (line.match(/malzeme|hizmet|miktar|birim fiyat/i) && line.match(/tutar|toplam/i)) continue;

        const tokens = line.trim().split(/\s+/);

        // RTL Strategy:
        // We look for financial numbers at the END of the line.
        // Sequence typically: [Name...] [Qty] [Unit] [Price] [Tax?] [Total]

        // 1. Identify valid numeric tokens from right to left
        const numTokens: { val: number, idx: number, text: string }[] = [];

        for (let j = 0; j < tokens.length; j++) {
            if (isNumeric(tokens[j])) {
                numTokens.push({ val: parseTRNumber(tokens[j]), idx: j, text: tokens[j] });
            }
        }

        let matchedParams: Partial<ParsedInvoiceItem> | null = null;
        let usedTokenIndices: number[] = [];

        // If we have at least 2 numbers, try to find Price/Total relationship
        if (numTokens.length >= 2) {
            // Reverse iteration for "Total" candidate
            for (let t = numTokens.length - 1; t >= 1; t--) {
                const Total = numTokens[t].val;
                if (Total <= 0) continue;

                // Search for Price candidate
                for (let p = t - 1; p >= 0; p--) {
                    const Price = numTokens[p].val;
                    if (Price <= 0) continue;

                    // Helper: Find Qty candidate between 0 and p-1?
                    let Quantity = 1;
                    let qIdx = -1;

                    // Look for specific Qty token
                    if (p > 0) {
                        const potentialQ = numTokens[p - 1];
                        // Check if tokens[potentialQ.idx + 1] is a unit? Sometime Unit is before Price
                        if (potentialQ.val > 0 && Math.abs(potentialQ.val * Price - Total) < 1.0) {
                            Quantity = potentialQ.val;
                            qIdx = potentialQ.idx;
                        } else {
                            // Maybe Qty implied 1?
                            if (Math.abs(1 * Price - Total) < 1.0) {
                                Quantity = 1;
                            }
                        }
                    } else {
                        // Only 2 numbers found, must be Price & Total w/ Implied Qty 1?
                        if (Math.abs(1 * Price - Total) < 1.0) Quantity = 1;
                    }

                    // If Math Works
                    if (Quantity > 0 && Math.abs(Quantity * Price - Total) < 1.0) {
                        matchedParams = {
                            quantity: Quantity,
                            unitPrice: Price,
                            totalPrice: Total,
                            taxRate: 20 // Default
                        };
                        usedTokenIndices = [numTokens[t].idx, numTokens[p].idx];
                        if (qIdx !== -1) usedTokenIndices.push(qIdx);

                        // Try to find Unit String
                        let uVal = 'Adet';
                        const searchStart = qIdx !== -1 ? qIdx : Math.max(0, numTokens[p].idx - 2);
                        const searchEnd = numTokens[p].idx;

                        for (let u = searchStart; u < searchEnd + 1; u++) {
                            if (tokens[u] && UNITS.some(unit => tokens[u].toLowerCase().includes(unit.toLowerCase()))) {
                                uVal = tokens[u].replace(/[0-9]/g, '');
                                if (!usedTokenIndices.includes(u)) usedTokenIndices.push(u);
                            }
                        }
                        matchedParams.unit = uVal;
                        break;
                    }
                }
                if (matchedParams) break;
            }
        }

        // Fallback: If only 1 strong number at end, and "Adet" exists earlier?
        // Maybe "item name ... 1 Adet ... 1.000,00" (Price=Total)
        if (!matchedParams && numTokens.length >= 1) {
            const lastVal = numTokens[numTokens.length - 1];
            // Check if 'Adet' exists
            const unitMatch = tokens.findIndex(t => UNITS.some(u => t.toLowerCase().includes(u.toLowerCase())));
            if (unitMatch !== -1 && lastVal.val > 0) {
                // Assume LastVal is Total.
                let qty = 1;
                const prevTok = tokens[unitMatch - 1];
                if (prevTok && isNumeric(prevTok)) {
                    qty = parseTRNumber(prevTok);
                }

                matchedParams = {
                    quantity: qty,
                    unitPrice: lastVal.val / qty,
                    totalPrice: lastVal.val,
                    unit: tokens[unitMatch].replace(/[0-9]/g, '')
                };
                usedTokenIndices.push(numTokens[numTokens.length - 1].idx);
                usedTokenIndices.push(unitMatch);
                if (prevTok) usedTokenIndices.push(unitMatch - 1);
            }
        }

        if (matchedParams) {
            // Extract Name
            const minUsedIdx = Math.min(...usedTokenIndices);
            let nameParts = tokens.slice(0, minUsedIdx);
            let finalName = nameParts.join(' ').trim();

            if (pendingTextLines.length > 0) {
                finalName = pendingTextLines.join(' ') + ' ' + finalName;
                pendingTextLines = [];
            }
            finalName = finalName.replace(/^\d+\s+/, '');

            items.push({
                name: finalName,
                ...matchedParams
            } as ParsedInvoiceItem);

        } else {
            // No Item found. Buffer line as text?
            if (!line.match(/toplam|tutar/i)) {
                pendingTextLines.push(line.trim());
            }
        }
    }


    return {
        invoiceNumber,
        ettsn,
        invoiceDate: invoiceDate || new Date(),
        senderName: senderName || 'Bilinmeyen Firm',
        senderAddress,
        senderPhone,
        taxId,
        taxOffice,
        scenario,
        invoiceType,
        totalAmount,
        currency,
        subTotal,
        totalDiscountAmount,
        totalTaxAmount,
        taxInclusiveTotal,
        items
    };
};
