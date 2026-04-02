/**
 * Elasticsearch Real-Time Sync Hooks
 * 
 * Wrappers around existing actions that sync to Elasticsearch.
 * These should be called instead of direct Prisma operations.
 * 
 * Usage:
 *   import { syncCreateProduct, syncUpdateProduct, syncDeleteProduct } from '@/lib/elasticsearch-sync-hooks';
 */

import { prisma } from './prisma';
import {
  syncProduct,
  unsyncProduct,
  syncAllProducts,
} from './elasticsearch-products';
import {
  syncCustomer,
  unsyncCustomer,
  syncAllCustomers,
} from './elasticsearch-customers';
import {
  syncProposal,
  unsyncProposal,
  syncAllProposals,
} from './elasticsearch-proposals';
import {
  syncInvoice,
  unsyncInvoice,
  syncAllInvoices,
} from './elasticsearch-invoices';
import { isElasticsearchAvailable } from './elasticsearch';

// ============================================================================
// PRODUCT SYNC HOOKS
// ============================================================================

/**
 * Create product and sync to Elasticsearch
 */
export async function syncCreateProduct(data: any) {
  try {
    // Create in Prisma
    const product = await prisma.product.create({ data });
    
    // Sync to Elasticsearch (async, non-blocking)
    syncToEsInBackground(() => syncProduct(product.id));
    
    return product;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to create product:', error.message);
    throw error;
  }
}

/**
 * Update product and sync to Elasticsearch
 */
export async function syncUpdateProduct(productId: string, data: any) {
  try {
    // Update in Prisma
    const product = await prisma.product.update({
      where: { id: productId },
      data,
    });
    
    // Sync to Elasticsearch (async, non-blocking)
    syncToEsInBackground(() => syncProduct(productId));
    
    return product;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to update product:', error.message);
    throw error;
  }
}

/**
 * Delete product and remove from Elasticsearch
 */
export async function syncDeleteProduct(productId: string) {
  try {
    // Delete from Prisma
    await prisma.product.update({ where: { id: productId }, data: { isDeleted: true, deletedAt: new Date() } });
    
    // Remove from Elasticsearch (async, non-blocking)
    syncToEsInBackground(() => unsyncProduct(productId));
    
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete product:', error.message);
    throw error;
  }
}

/**
 * Bulk sync all products (for initial import or recovery)
 */
export async function syncAllProductsHook() {
  return syncAllProducts();
}

// ============================================================================
// CUSTOMER SYNC HOOKS
// ============================================================================

export async function syncCreateCustomer(data: any) {
  try {
    const customer = await prisma.customer.create({ data });
    syncToEsInBackground(() => syncCustomer(customer.id));
    return customer;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to create customer:', error.message);
    throw error;
  }
}

export async function syncUpdateCustomer(customerId: string, data: any) {
  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });
    syncToEsInBackground(() => syncCustomer(customerId));
    return customer;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to update customer:', error.message);
    throw error;
  }
}

export async function syncDeleteCustomer(customerId: string) {
  try {
    await prisma.customer.update({ where: { id: customerId }, data: { isDeleted: true, deletedAt: new Date() } });
    syncToEsInBackground(() => unsyncCustomer(customerId));
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete customer:', error.message);
    throw error;
  }
}

export async function syncAllCustomersHook() {
  return syncAllCustomers();
}

// ============================================================================
// PROPOSAL SYNC HOOKS
// ============================================================================

export async function syncCreateProposal(data: any) {
  try {
    const proposal = await prisma.proposal.create({ data });
    syncToEsInBackground(() => syncProposal(proposal.id));
    return proposal;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to create proposal:', error.message);
    throw error;
  }
}

export async function syncUpdateProposal(proposalId: string, data: any) {
  try {
    const proposal = await prisma.proposal.update({
      where: { id: proposalId },
      data,
    });
    syncToEsInBackground(() => syncProposal(proposalId));
    return proposal;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to update proposal:', error.message);
    throw error;
  }
}

export async function syncDeleteProposal(proposalId: string) {
  try {
    await prisma.proposal.update({ where: { id: proposalId }, data: { isDeleted: true, deletedAt: new Date() } });
    syncToEsInBackground(() => unsyncProposal(proposalId));
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete proposal:', error.message);
    throw error;
  }
}

export async function syncAllProposalsHook() {
  return syncAllProposals();
}

// ============================================================================
// INVOICE SYNC HOOKS
// ============================================================================

export async function syncCreateInvoice(data: any) {
  try {
    const invoice = await prisma.invoice.create({ data });
    syncToEsInBackground(() => syncInvoice(invoice.id));
    return invoice;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to create invoice:', error.message);
    throw error;
  }
}

export async function syncUpdateInvoice(invoiceId: string, data: any) {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data,
    });
    syncToEsInBackground(() => syncInvoice(invoiceId));
    return invoice;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to update invoice:', error.message);
    throw error;
  }
}

export async function syncDeleteInvoice(invoiceId: string) {
  try {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { isDeleted: true, deletedAt: new Date() } });
    syncToEsInBackground(() => unsyncInvoice(invoiceId));
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete invoice:', error.message);
    throw error;
  }
}

export async function syncAllInvoicesHook() {
  return syncAllInvoices();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sync to Elasticsearch in background (non-blocking)
 * Failures are logged but don't throw
 */
async function syncToEsInBackground(syncFn: () => Promise<boolean>) {
  // Check if ES is available first
  const available = await isElasticsearchAvailable();
  if (!available) {
    console.log('[Elasticsearch] Skipping sync - not available');
    return;
  }

  // Execute in background (don't await)
  syncFn()
    .then((success) => {
      if (!success) {
        console.warn('[Elasticsearch] Sync completed with issues');
      }
    })
    .catch((error) => {
      console.error('[Elasticsearch] Background sync failed:', error.message);
      // Don't throw - this is background sync
    });
}

/**
 * Check if Elasticsearch is available
 */
export async function checkEsStatus(): Promise<{
  available: boolean;
  message: string;
}> {
  const available = await isElasticsearchAvailable();
  
  if (available) {
    return {
      available: true,
      message: 'Elasticsearch is connected and ready',
    };
  }
  
  return {
    available: false,
    message: 'Elasticsearch is not available. Using Prisma fallback.',
  };
}
