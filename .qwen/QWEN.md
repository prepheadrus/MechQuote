## Qwen Added Memories

### MechQuote Projesi - Genel Bilgiler
- **Proje:** MechQuote - Next.js + Electron mini-ERP for mechanical contracting companies (HVAC, heating, cooling, plumbing)
- **Özellikler:** Quotation management, cost analysis, project tracking, stock/inventory, PDF generation, AI integration
- **AI Modeller:** Gemini, DeepSeek, Qwen, GLM, Kimi (waterfall fallback mekanizması)
- **Veritabanı:** PostgreSQL + Prisma ORM
- **State Management:** React Query, Workspace Context (multi-tab)
- **Search:** Elasticsearch (fallback: Prisma)

---

### Türkçe e-Invoice AI Parsing - KDV/İskonto Sorunu
**Problem:** AI often confuses KDV (VAT) column with Iskonto (Discount) column because both show percentage values.

**Çözüm:**
1. Pre-process PDF text to label columns as [KDV:20%] or [ISKONTO:23%]
2. Check table header for which columns exist
3. If ONLY KDV column exists (no Iskonto column), label ALL percentages as [KDV:...]
4. Give AI clear prompt: "If you see [KDV:20%] -> taxRate:20, discountRate:0; If NO [ISKONTO:...] labels exist -> discountRate:0 for ALL items"
5. Disable hybrid cache during debugging to get fresh AI analysis each time

---

### Türkçe e-Invoice AI Parsing - FINAL SOLUTION (Gemini Vision API)
**Solution:** Use Gemini Vision API with XML prompt to convert PDF invoices to UBL-TR XML format, then parse with `parseInvoiceXml()`.

**Key Points:**
- Vision API must be called with PDF base64 + XML prompt
- Fallback to local parser only if Vision fails
- Pre-processing labels columns as [KDV:20%] or [ISKONTO:23%] to help AI distinguish
- XML has structured fields (DiscountRate, TaxPercent) - prevents KDV/Iskonto confusion
- Prompt engineering is CRITICAL: "If tabloda SADECE KDV sütunu varsa → TÜM yüzde değerleri KDV'dir, DiscountRate: 0"
- Disable hybrid cache during debugging

**Files:**
- `src/services/pdf-to-ubl-converter.ts` - Gemini Vision API converter (400+ lines)
- `src/services/ensemble-ai-parser.ts` - Multi-model ensemble parser (350+ lines)
- `src/services/ubl-parser.ts` - UBL-TR XML parser

---

### Undocumented Features - Documentation Created (2026-02-25)

#### 1. Otomatik Maaş Tahakkuk Sistemi
**File:** `src/actions/salary-processing.ts` (250+ lines)
**Features:**
- Monthly salary processing for all active personnel
- Duplicate prevention (same month)
- Auto balance update (Personnel.balance)
- Status tracking (processed/pending)
- Bulk and individual processing

**Functions:**
- `processMonthlySalaries(month, year, salaryAmount?)`
- `getSalaryProcessingStatus(month, year)`
- `getPendingSalaries(month?, year?, defaultSalary?)`

**Documentation:** `knowledge/otomatik-maas-tahakkuku/artifacts/otomatik-maas-tahakkuku.md`

---

#### 2. Ensemble AI Parser
**File:** `src/services/ensemble-ai-parser.ts` (350+ lines)
**Features:**
- Parallel AI model execution (Gemini, Qwen, GLM, Kimi)
- Voting mechanism for string fields
- Median calculation for numeric fields (outlier resistance)
- Fuzzy matching with Levenshtein distance
- Line item merging across AI results

**Functions:**
- `parseWithEnsembleAI(text, config)`
- `mergeAIResults(results)`
- `voteForField(results, fieldName)`
- `mergeLineItems(results)`

**Documentation:** `knowledge/ensemble-ai-parser/artifacts/ensemble-ai-parser.md`

---

#### 3. PDF to UBL-TR XML Converter
**File:** `src/services/pdf-to-ubl-converter.ts` (400+ lines)
**Features:**
- Gemini Vision API for PDF invoice parsing
- Turkish e-Invoice UBL-TR XML output
- KDV/Discount column distinction (critical!)
- Auto KDV calculation if column missing
- Table structure analysis
- Markdown cleanup and validation

**Functions:**
- `convertTextToUblXml(pdfBase64, apiKey, modelName)`

**Documentation:** `knowledge/pdf-to-ubl-xml-converter/artifacts/pdf-to-ubl-xml-converter.md`

---

#### 4. Kur Farkı Tahakkuk Sistemi
**File:** `src/actions/currency-revaluation.ts` (180+ lines)
**Features:**
- Individual customer currency revaluation
- Bulk revaluation for all customers
- Currency exposure analysis
- Transaction-based calculation
- Auto balance update

**Functions:**
- `calculateCurrencyRevaluation(customerId, newRate, oldRate, currency)`
- `calculateBulkCurrencyRevaluation(rates, oldRates)`
- `getCurrencyExposure(customerId)`

**Documentation:** `knowledge/kur-farki-tahakkuku/artifacts/kur-farki-tahakkuku.md`

---

#### 5. İşçilik Maliyet Yönetimi
**File:** `src/actions/labor-costs.ts` (80+ lines)
**Features:**
- Role-based labor cost definition
- Unit-based costing (hour, day, project)
- Recipe integration
- CRUD operations with validation

**Functions:**
- `getLaborCosts()`
- `saveLaborCost(data)`
- `deleteLaborCost(id)`

**Documentation:** `knowledge/iscilik-maliyet-yonetimi/artifacts/iscilik-maliyet-yonetimi.md`

---

#### 6. Cari Hesap Devir Fişi Sistemi
**File:** `src/actions/customers.ts` (lines 214-328)
**Features:**
- Individual period transfer
- Bulk period transfer
- Period tracking (YYYY-MM format)
- Auto balance update
- Transaction history

**Functions:**
- `createPeriodTransfer(customerId, amount, period, description?)`
- `createBulkPeriodTransfer(transfers)`

**Documentation:** `knowledge/cari-devir-fisi/artifacts/cari-devir-fisi.md`

---

#### 7. Ürün Birleştirme ve Bakım Sistemi
**File:** `src/actions/maintenance.ts` (300+ lines)
**Features:**
- Duplicate product detection (normalized name)
- Product merge (master + duplicates)
- Customer balance reconciliation
- Full reset reconciliation (nuclear option)

**Functions:**
- `findDuplicateProducts()`
- `mergeProducts(masterId, duplicateIds)`
- `reconcileCustomerBalances()`
- `fullReconcileCustomerBalances()`

**Documentation:** `knowledge/urun-birlestirme-maintenance/artifacts/urun-birlestirme-maintenance.md`

---

### Documentation Structure (knowledge/)

```
knowledge/
├── otomatik-maas-tahakkuku/
│   └── artifacts/otomatik-maas-tahakkuku.md
├── ensemble-ai-parser/
│   └── artifacts/ensemble-ai-parser.md
├── pdf-to-ubl-xml-converter/
│   └── artifacts/pdf-to-ubl-xml-converter.md
├── kur-farki-tahakkuku/
│   └── artifacts/kur-farki-tahakkuku.md
├── iscilik-maliyet-yonetimi/
│   └── artifacts/iscilik-maliyet-yonetimi.md
├── cari-devir-fisi/
│   └── artifacts/cari-devir-fisi.md
├── urun-birlestirme-maintenance/
│   └── artifacts/urun-birlestirme-maintenance.md
├── dashboard-analitik/
├── ekip-finans-yonetimi/
├── layout-scroll-yonetimi/
├── maliyet-fiyatlandirma/
├── pdf-parser-mimarisi/
├── proje-durum-sistemi/
├── sistem-kayitlari/
├── stok-rezervasyon/
├── teklif-sablonlari/
├── test-ki/
├── toplu-islemler/
└── workspace-ve-dnd-yonetimi/
```

---

### HMR Error Fix (2026-02-25)
**Error:** Module factory not available in HMR update (global-search.tsx → actions/data)

**Solution:**
1. Clear Next.js cache: `rmdir /s /q .next` (Windows) or `rm -rf .next` (Unix)
2. Restart dev server: `npm run dev`
3. Hard refresh browser: Ctrl+Shift+R or Ctrl+F5

**Cause:** HMR cache inconsistency between server actions and client components

---

### Key Technical Details

#### Balance Logic (Müşteri Bakiyesi)
```
Pozitif (+): Müşteri şirkete borçlu (Alacak)
Negatif (-): Şirket müşteriye borçlu (Borç)

Transaction Types:
- Debt (Müşteri borçlu): +amount (balance increment)
- Credit (Şirket borçlu): -amount (balance decrement)

Invoice Types:
- Outgoing (Satış): Debt (+amount)
- Incoming (Alış): Credit (-amount)

Proposal Status:
- Approved: Debt (+amount)
```

#### Currency Revaluation Logic
```
Kur Artışı (32.50 → 34.50):
- Müşteri borcu TL olarak artar
- Transaction: Debt (+difference)
- Balance: increment

Kur Düşüşü (34.50 → 32.50):
- Müşteri borcu TL olarak azalır
- Transaction: Credit (-difference)
- Balance: decrement
```

#### Period Format
```
Format: YYYY-MM (örn: "2026-01")
Validation: /^\d{4}-\d{2}$/
```

---

### Session Date
25 Şubat 2026 Çarşamba

### Documentation Status (25 Şubat 2026)
- **Total Documentation:** 22 files in knowledge/ + 46 files in docs/
- **Coverage:** ~90% (was ~65-70%)
- **Created Today:** 10 new documentation files

### Knowledge Base Structure
```
knowledge/
├── INDEX.md (Master index - 22 doküman kategorize)
├── proje-yol-haritasi.md
├── ai-dashboard-insight/
├── cari-devir-fisi/
├── dashboard-analitik/
├── ekip-finans-yonetimi/
├── ensemble-ai-parser/
├── iscilik-maliyet-yonetimi/
├── kur-farki-tahakkuku/
├── layout-scroll-yonetimi/
├── maliyet-fiyatlandirma/
├── otomatik-maas-tahakkuku/
├── payment-actions/
├── pdf-parser-mimarisi/
├── pdf-to-ubl-xml-converter/
├── proje-durum-sistemi/
├── purchasing-analysis/
├── sistem-kayitlari/
├── stok-rezervasyon/
├── teklif-sablonlari/
├── test-ki/
├── toplu-islemler/
├── urun-birlestirme-maintenance/
└── workspace-ve-dnd-yonetimi/
```

### Remaining Documentation
- [ ] Electron Desktop Integration (build, distribution)
- [ ] ML Training API details (auto-train endpoints)
- [ ] Prisma Schema ERD (visual diagram)
- [ ] matching.ts deep dive (812 lines - AI product matching)
- [ ] Hybrid Analysis Service (AI + rule engine)
