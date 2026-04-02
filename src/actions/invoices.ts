// 'use server' removed to avoid conflict with re-exported server actions

export {
    getInvoices,
    getInvoicesWithAnalytics,
    getInvoice,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice, // HARD DELETE (eski)
    cancelInvoice, // ✅ YENİ: SOFT CANCEL
    restoreInvoice, // ✅ YENİ: RESTORE
    createReturnInvoice,
    findSuggestedProductId
} from '@/services/invoice-service';

export {
    deleteInvoiceItem,
    addInvoiceItems,
    linkInvoiceItemToProject,
    bulkLinkInvoiceItemsToProject
} from '@/services/invoice-item-service';

export {
    wipeAllPurchaseHistory,
    cleanupDuplicatePurchaseHistory,
    regeneratePurchaseHistory,
    linkInvoiceItemToProduct,
    getPurchasedProductsBySupplier
} from '@/services/purchase-history-service';

export {
    findOrCreateCustomerFromInvoice
} from '@/services/customer-service';
