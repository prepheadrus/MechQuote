import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Veri yükleme başlıyor...');

    const backupPath = path.join(process.cwd(), 'teklif_backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Yedek dosyası bulunamadı: teklif_backup.json');
        console.log('⚠️ Lütfen "Tüm Verileri Dışa Aktar" özelliği ile aldığınız JSON dosyasını proje ana dizinine koyun.');
        return;
    }

    const rawData = fs.readFileSync(backupPath, 'utf8');
    const data = JSON.parse(rawData);

    // Date parser helper
    const parseDate = (dateVal: any) => {
        if (!dateVal) return new Date();
        return new Date(dateVal);
    };

    // 1. Settings
    if (data.settings && data.settings.length > 0) {
        console.log('⚙️ Ayarlar yükleniyor...');
        const setting = data.settings[0]; // Singleton

        try {
            await prisma.settings.create({
                data: {
                    id: String(setting.id || '1'),
                    companyName: setting.companyName || 'Firma Adı',
                    companyTitle: setting.companyTitle,
                    companySlogan: setting.companySlogan || setting.altBaslik,
                    logo: setting.logo,
                    website: setting.website || setting.web,
                    email: setting.email,
                    phoneNumber: setting.phoneNumber || setting.telefon,
                    address: setting.address || setting.adres,
                    taxOffice: setting.taxOffice || setting.vergiDairesi,
                    taxNumber: setting.taxNumber || setting.vergiNumarasi,
                    bankAccounts: JSON.stringify(setting.bankAccounts || []),
                    defaultVatRate: setting.defaultVatRate || 0.20,
                    currency: setting.currency || 'TRY',
                }
            });
        } catch (e: any) {
            if (e.code === 'P2002') {
                console.log('⚠️ Ayarlar zaten mevcut, atlanıyor...');
            } else {
                console.error(e);
            }
        }
    }

    // 2. Customers
    console.log('👥 Müşteriler yükleniyor...');
    const createdCustomerIds = new Set<string>();

    for (const item of data.customers || []) {
        const id = String(item.id);
        try {
            await prisma.customer.create({
                data: {
                    id: id,
                    name: item.name,
                    email: item.email,
                    phone: item.phone,
                    taxId: item.taxId,
                    taxOffice: item.taxOffice,
                    status: item.status || 'Aktif',
                    notes: item.notes,
                    createdAt: parseDate(item.createdAt),
                    address: typeof item.address === 'object' ? JSON.stringify(item.address) : item.address,
                    balance: item.balance || 0,
                    totalSpending: item.totalSpending || 0,
                    approvedProposalsCount: item.approvedProposalsCount || 0,
                    totalProposalsCount: item.totalProposalsCount || 0,
                }
            });
            createdCustomerIds.add(id);
        } catch (e: any) {
            if (e.code === 'P2002') {
                createdCustomerIds.add(id);
            } else {
                console.error(`Customer error: ${item.name}`, e.message);
            }
        }
    }

    // 3. Suppliers
    console.log('🏭 Tedarikçiler yükleniyor...');
    const createdSupplierIds = new Set<string>();
    for (const item of data.suppliers || []) {
        const id = String(item.id);
        try {
            await prisma.supplier.create({
                data: {
                    id: id,
                    name: item.name,
                    contactName: item.contactName,
                    email: item.email,
                    phone: item.phone,
                    address: item.address,
                }
            });
            createdSupplierIds.add(id);
        } catch (e: any) {
            if (e.code === 'P2002') createdSupplierIds.add(id);
        }
    }

    // 4. Products
    console.log('📦 Ürünler yükleniyor...');
    for (const item of data.products || []) {
        try {
            await prisma.product.create({
                data: {
                    id: String(item.id),
                    name: item.name,
                    code: item.code,
                    brand: item.brand,
                    model: item.model,
                    category: item.category,
                    description: item.description,
                    unit: item.unit,
                    listPrice: item.listPrice || 0,
                    currency: item.currency || 'TRY',
                    vatRate: item.vatRate || 0.20,
                    basePrice: item.basePrice || 0,
                    priceIncludesVat: item.priceIncludesVat || false,
                    discountRate: item.discountRate || 0,
                    technicalSpecifications: item.technicalSpecifications,
                    createdAt: parseDate(item.createdAt),
                    updatedAt: parseDate(item.updatedAt || item.createdAt),
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Product error: ${item.name}`, e.message);
        }
    }

    // 5. Personnel
    console.log('👷 Personel yükleniyor...');
    for (const item of data.personnel || []) {
        try {
            await prisma.personnel.create({
                data: {
                    id: String(item.id),
                    name: item.name,
                    role: item.role,
                    phone: item.phone,
                    email: item.email,
                    status: item.status || 'Aktif',
                    dailyRate: item.dailyRate,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Personnel error: ${item.name}`, e.message);
        }
    }

    // 6. Proposals
    console.log('📜 Teklifler yükleniyor...');
    for (const item of data.proposals || []) {
        // Validate customer
        let custId = String(item.customerId);
        if (!createdCustomerIds.has(custId)) {
            continue;
        }

        try {
            await prisma.proposal.create({
                data: {
                    id: String(item.id),
                    rootProposalId: item.rootProposalId ? String(item.rootProposalId) : null,
                    version: item.version || 1,
                    status: item.status || 'Draft',
                    quoteNumber: item.quoteNumber,
                    customerName: item.customerName,
                    customerId: custId,
                    projectName: item.projectName,
                    totalAmount: item.totalAmount || 0,
                    exchangeRateUSD: item.exchangeRates?.USD || 0,
                    exchangeRateEUR: item.exchangeRates?.EUR || 0,
                    createdAt: parseDate(item.createdAt),
                    versionNote: item.versionNote,
                    termsAndConditions: item.termsAndConditions,
                    tags: Array.isArray(item.tags) ? item.tags.join(',') : item.tags,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Proposal error: ${item.quoteNumber}`, e.message);
        }
    }

    // 7. Proposal Items
    console.log('📝 Teklif Kalemleri yükleniyor...');
    for (const item of data.proposalItems || []) {
        try {
            await prisma.proposalItem.create({
                data: {
                    id: String(item.id),
                    proposalId: String(item.proposalId),
                    productId: item.productId ? String(item.productId) : null,
                    name: item.name,
                    brand: item.brand,
                    model: item.model,
                    quantity: item.quantity,
                    unit: item.unit,
                    listPrice: item.listPrice,
                    currency: item.currency || 'TRY',
                    discountRate: item.discountRate || 0,
                    profitMargin: item.profitMargin || 0,
                    groupName: item.groupName,
                    basePrice: item.basePrice || 0,
                    vatRate: item.vatRate || 0.20,
                    priceIncludesVat: item.priceIncludesVat || false,
                    orderIndex: item.orderIndex || 0,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002' && e.code !== 'P2003') {
                console.error(`Item error: ${item.name}`, e.message);
            }
        }
    }

    // 8. Invoices
    console.log('🧾 Faturalar yükleniyor...');
    for (const item of data.invoices || []) {
        let custId = item.customerId ? String(item.customerId) : null;
        if (custId && !createdCustomerIds.has(custId)) {
            custId = null;
        }

        try {
            await prisma.invoice.create({
                data: {
                    id: String(item.id),
                    type: item.type,
                    customerId: custId,
                    senderName: item.senderName,
                    receiverName: item.receiverName,
                    senderTaxId: item.senderTaxId,
                    invoiceNumber: item.invoiceNumber,
                    ettsn: item.ettsn,
                    invoiceDate: parseDate(item.invoiceDate),
                    currency: item.currency || 'TRY',
                    totalAmount: item.totalAmount || 0,
                    subTotal: item.subTotal,
                    totalDiscountAmount: item.totalDiscountAmount,
                    totalTaxAmount: item.totalTaxAmount,
                    taxInclusiveTotal: item.taxInclusiveTotal,
                    status: item.status || 'Draft',
                    createdAt: parseDate(item.createdAt),
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Invoice error: ${item.invoiceNumber}`, e.message);
        }
    }

    // 9. Invoice Items
    console.log('🧾 Fatura Kalemleri yükleniyor...');
    for (const item of data.invoiceItems || []) {
        try {
            await prisma.invoiceItem.create({
                data: {
                    id: String(item.id),
                    invoiceId: String(item.invoiceId),
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    taxRate: item.taxRate,
                    taxAmount: item.taxAmount,
                    discountAmount: item.discountAmount,
                    unit: item.unit,
                    listPrice: item.listPrice,
                    discountRate: item.discountRate,
                    linkedProductId: item.linkedProductId ? String(item.linkedProductId) : null,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002' && e.code !== 'P2003') {
                // Ignore missing parent
            }
        }
    }

    // 10. Purchase History
    console.log('📜 Alım Geçmişi yükleniyor...');
    for (const item of data.purchase_history || []) {
        try {
            await prisma.purchaseHistory.create({
                data: {
                    id: String(item.id),
                    productId: String(item.productId),
                    supplierId: item.supplierId ? String(item.supplierId) : null,
                    supplierName: item.supplierName,
                    date: parseDate(item.date),
                    listPrice: item.listPrice || 0,
                    discountRate: item.discountRate || 0,
                    netPrice: item.netPrice || 0,
                    currency: item.currency || 'TRY',
                    invoiceId: item.invoiceId ? String(item.invoiceId) : null,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2002' && e.code !== 'P2003') {
                // Ignore missing dependencies
            }
        }
    }

    console.log('✅ Veri yükleme tamamlandı!');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
