'use server'

import { prisma } from '@/lib/prisma';
import { Customer, CustomerTransaction, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { UpdateCustomerSchema, validateWithSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { authenticateUser, authorizeUser } from '@/lib/security';

// ==================== TYPE DEFINITIONS ====================

interface BulkPeriodTransferResult {
    customerId: string;
    amount: number;
    period: string;
    description?: string;
    status: 'success' | 'error';
    error?: string;
}

interface LedgerEntry {
    date: Date | string;
    description: string;
    reference: string;
    type: string;
    debt: number;
    credit: number;
    balance?: number;
}

/**
 * Get customer list
 * @deprecated Use getCustomerList instead
 */
export async function getCustomers() {
    return getCustomerList();
}

export async function getCustomerList() {
    try {
        // Güvenlik kontrolü
        const isAuthenticated = await authenticateUser(new Request('http://localhost'));
        if (!isAuthenticated) {
            return { success: false, error: 'Yetkisiz erişim' };
        }
        
        // Rol kontrolü (örnek: sadece admin veya user erişebilir)
        const hasPermission = await authorizeUser('user', 'user');
        if (!hasPermission) {
            return { success: false, error: 'Yetersiz izin' };
        }

        const customers = await prisma.customer.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: customers };
    } catch (error) {
        logger.error('Failed to fetch customers:', error);
        return { success: false, error: 'Müşteriler yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get customer statistics
 * @deprecated Use getCustomerStats instead
 */
export async function getCustomersWithStats() {
    return getCustomerStats();
}

export async function getCustomerStats() {
    try {
        const customers = await prisma.customer.findMany({
            where: { isDeleted: false },
            include: {
                proposals: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    select: {
                        id: true,
                        totalAmount: true,
                        createdAt: true,
                        status: true,
                        linkedInProjects: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            select: { id: true }
                        }
                    }
                },
                projects: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    select: {
                        contractAmount: true,
                        status: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const enriched = customers.map((c: any) => {
            // Project Stats (Gerçekleşen Projeler)
            const totalProjectVolume = c.projects.reduce((sum: any, p: any) => sum + (p.contractAmount || 0), 0);
            const activeProjectCount = c.projects.filter((p: any) => p.status === 'MONTAJ_VE_IMALAT').length;

            // Standalone Proposals (Projeye dönüşmemiş ama onaylı teklifler)
            // Sadece ONAYLI teklifleri dikkate al.
            // Eğer teklif bir projeye bağlanmışsa, tutarı projeden gelir. Teklifi yok sayarız.
            const standaloneProposals = c.proposals.filter((p: any) => p.status === 'Approved' && p.linkedInProjects.length === 0);
            const standaloneProposalVolume = standaloneProposals.reduce((sum: any, p: any) => sum + (p.totalAmount || 0), 0);

            // Total Business Volume = Projects + Standalone Proposals
            const totalBusinessVolume = totalProjectVolume + standaloneProposalVolume;

            // Last Activity (Any proposal or project)
            let lastActivityDate = c.createdAt;
            if (c.proposals.length > 0) {
                const lastProp = c.proposals.reduce((latest: any, current: any) => (current.createdAt > latest ? current.createdAt : latest), c.proposals[0].createdAt);
                if (lastProp > lastActivityDate) lastActivityDate = lastProp;
            }
            if (c.projects.length > 0) {
                const lastProj = c.projects.reduce((latest: any, current: any) => (current.createdAt > latest ? current.createdAt : latest), c.projects[0].createdAt);
                if (lastProj > lastActivityDate) lastActivityDate = lastProj;
            }

            const { proposals, projects, ...customer } = c;
            return {
                ...customer,
                totalSpending: totalBusinessVolume, // Backward compatibility alias
                totalProjectVolume: totalBusinessVolume, // We'll use this field name in frontend but it means Total Business Volume now
                activeProjectCount,
                lastActivityDate
            };
        });

        return { success: true, data: enriched };
    } catch (error) {
        logger.error('Failed to fetch customers with stats:', error);
        return { success: false, error: 'Müşteri verileri yüklenirken hata oluştu.' };
    }
}

export async function getCustomer(id: string) {
    try {
        const customer = await prisma.customer.findFirst({
            where: { id, isDeleted: false },
            include: {
                proposals: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { createdAt: 'desc' },
                },
                invoices: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { invoiceDate: 'desc' },
                },
                projects: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { createdAt: 'desc' },
                    include: { 
                        transactions: {
                            where: { isDeleted: false } // ✅ Nested filtre
                        }
                    }
                },
                transactions: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { date: 'desc' }
                }
            }
        });
        return { success: true, data: customer };
    } catch (error) {
        logger.error('Failed to fetch customer:', error);
        return { success: false, error: 'Müşteri bulunamadı.' };
    }
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'approvedProposalsCount' | 'totalProposalsCount' | 'totalSpending' | 'lastProposalDate' | 'balance'> & { openingBalance?: number }) {
    try {
        logger.info('[createCustomer] Received data:', JSON.stringify(data, null, 2));

        const { openingBalance, ...customerData } = data;

        // Form zaten doğru formatta gönderiyor (JSON string veya null)
        // Sadece Prisma'a kaydet
        const customer = await prisma.customer.create({
            data: {
                name: customerData.name,
                email: customerData.email || null,
                phone: customerData.phone || null,
                address: customerData.address ? JSON.parse(customerData.address as string) : null,
                taxId: customerData.taxId || null,
                taxOffice: null,
                status: customerData.status,
                tags: customerData.tags ? JSON.parse(customerData.tags as string) : null,
                balance: openingBalance || 0,
                notes: customerData.notes || null,
            }
        });

        // Create opening balance transaction if specified
        if (openingBalance && Math.abs(openingBalance) > 0.01) {
            await prisma.customerTransaction.create({
                data: {
                    customerId: customer.id,
                    amount: Math.abs(openingBalance),
                    type: openingBalance > 0 ? 'Debt' : 'Credit',
                    category: 'Açılış Bakiyesi',
                    description: 'Sisteme ilk kayıt bakiyesi',
                    date: new Date(),
                    referenceType: 'Opening'
                }
            });

            logger.info('[createCustomer] Açılış bakiyesi transaction oluşturuldu:', openingBalance, 'TL');
        }

        revalidatePath('/customers');
        logger.info('[createCustomer] Customer created:', customer.id);
        return { success: true, data: customer };
    } catch (error) {
        logger.error('Failed to create customer:', error);
        return { success: false, error: 'Müşteri oluşturulurken bir hata oluştu: ' + (error as Error)?.message };
    }
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
    try {
        // Validate input
        const validation = validateWithSchema(UpdateCustomerSchema, data);
        if (!validation.success) {
            return { success: false, error: validation.error };
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: validation.data as Prisma.CustomerUpdateInput
        });
        revalidatePath('/customers');
        return { success: true, data: customer };
    } catch (error) {
        logger.error('Failed to update customer:', error);
        return { success: false, error: 'Müşteri güncellenirken bir hata oluştu.' };
    }
}

export async function deleteCustomer(id: string) {
    try {
        await prisma.customer.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/customers');
        revalidatePath(`/customers/${id}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete customer:', error);
        return { success: false, error: 'Müşteri silinirken bir hata oluştu.' };
    }
}

export async function createPeriodTransfer(
  customerId: string,
  amount: number,
  period: string, // Format: "2026-01"
  description?: string
) {
  try {
    if (!customerId || !period) {
      return { success: false, error: 'Müşteri ID ve dönem zorunludur' };
    }

    if (Math.abs(amount) < 0.01) {
      return { success: false, error: 'Tutar 0 olamaz' };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false }
    });

    if (!customer) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    // Create period transfer transaction
    await prisma.customerTransaction.create({
      data: {
        customerId,
        amount: Math.abs(amount),
        type: amount > 0 ? 'Debt' : 'Credit',
        category: 'Dönem Devir',
        description: description || `${period} dönemi devir bakiyesi - ${customer.name}`,
        date: new Date(),
        referenceType: 'PeriodTransfer'
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        balance: {
          increment: amount > 0 ? amount : 0,
          decrement: amount < 0 ? Math.abs(amount) : 0
        }
      }
    });

    revalidatePath('/customers');
    revalidatePath('/cash-book');

    logger.info(`[createPeriodTransfer] Devir fişi oluşturuldu: ${customer.name} - ${amount} TL (${period})`);

    return { 
      success: true, 
      message: `Devir fişi oluşturuldu: ${amount.toFixed(2)} TL`,
      data: { customerId, amount, period }
    };
  } catch (error: any) {
    logger.error('Devir fişi oluşturma hatası:', error);
    return {
      success: false,
      error: error.message || 'Devir fişi oluşturulurken hata oluştu'
    };
  }
}

export async function createBulkPeriodTransfer(
  transfers: Array<{
    customerId: string;
    amount: number;
    period: string;
    description?: string;
  }>
) {
  try {
    const results: BulkPeriodTransferResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Fetch all needed customers at once
    const customerIds = transfers.map(t => t.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds }, isDeleted: false }
    });

    const validCustomerIds = new Set(customers.map(c => c.id));
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const transactionsData = [];
    const updateCustomerOperations = [];

    for (const transfer of transfers) {
      if (!transfer.customerId || !transfer.period) {
        errorCount++;
        results.push({ ...transfer, status: 'error', error: 'Müşteri ID ve dönem zorunludur' });
        continue;
      }

      if (Math.abs(transfer.amount) < 0.01) {
        errorCount++;
        results.push({ ...transfer, status: 'error', error: 'Tutar 0 olamaz' });
        continue;
      }

      if (!validCustomerIds.has(transfer.customerId)) {
        errorCount++;
        results.push({ ...transfer, status: 'error', error: 'Müşteri bulunamadı' });
        continue;
      }

      const customer = customerMap.get(transfer.customerId);
      const amount = transfer.amount;

      // Prepare transaction insert
      transactionsData.push({
        customerId: transfer.customerId,
        amount: Math.abs(amount),
        type: amount > 0 ? 'Debt' : 'Credit',
        category: 'Dönem Devir',
        description: transfer.description || `${transfer.period} dönemi devir bakiyesi - ${customer?.name}`,
        date: new Date(),
        referenceType: 'PeriodTransfer'
      });

      // Prepare customer update
      updateCustomerOperations.push(
        prisma.customer.update({
          where: { id: transfer.customerId },
          data: {
            balance: {
              increment: amount > 0 ? amount : 0,
              decrement: amount < 0 ? Math.abs(amount) : 0
            }
          }
        })
      );

      successCount++;
      results.push({ ...transfer, status: 'success' });
    }

    if (transactionsData.length > 0) {
      await prisma.$transaction([
        // Single batch insert
        prisma.customerTransaction.createMany({
          data: transactionsData
        }),
        // Batch updates
        ...updateCustomerOperations
      ]);
    }

    revalidatePath('/customers');
    revalidatePath('/cash-book');

    logger.info(`[createBulkPeriodTransfer] Toplu devir tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);

    return {
      success: errorCount === 0,
      message: `${successCount} devir fişi oluşturuldu, ${errorCount} hata`,
      results
    };
  } catch (error: any) {
    logger.error('Toplu devir hatası:', error);
    return {
      success: false,
      error: error.message || 'Toplu devir oluşturulurken hata oluştu'
    };
  }
}

export async function lookupCustomer(search: string) {
    try {
        if (!search || search.length < 3) return { success: true, data: null };

        const cleanTaxId = search.replace(/\D/g, '');
        const isTaxId = cleanTaxId.length === 10 || cleanTaxId.length === 11;

        const customer = await prisma.customer.findFirst({
            where: {
                isDeleted: false,
                OR: [
                    isTaxId ? { taxId: cleanTaxId } : {},
                    { name: { contains: search } }
                ]
            }
        });

        return { success: true, data: customer };
    } catch (error) {
        logger.error('Failed to lookup customer:', error);
        return { success: false, error: 'Müşteri aranırken hata oluştu.' };
    }
}

export async function bulkCreateCustomers(items: Array<{
    name: string;
    taxId?: string | null;
    taxOffice?: string | null;
    address?: any;
    phone?: string | null;
    email?: string | null;
    tags?: any;
    balance?: number;
}>) {
    try {
        const results = await prisma.$transaction(
            items.map(item => prisma.customer.create({
                data: {
                    ...item,
                    address: typeof item.address === 'object' ? JSON.stringify(item.address) : item.address,
                    tags: typeof item.tags === 'object' ? JSON.stringify(item.tags) : item.tags,
                    balance: 0
                }
            }))
        );
        revalidatePath('/customers');
        return { success: true, count: results.length };
    } catch (error) {
        logger.error('Failed to bulk create customers:', error);
        return { success: false, error: 'Toplu müşteri oluşturma hatası.' };
    }
}

export async function getCustomerStatement(id: string) {
    try {
        const [customer, transactions] = await Promise.all([
            prisma.customer.findFirst({ where: { id, isDeleted: false } }),
            prisma.customerTransaction.findMany({
                where: { isDeleted: false,  customerId: id },
                orderBy: { date: 'asc' }
            })
        ]);

        if (!customer) return { success: false, error: 'Müşteri bulunamadı.' };

        const ledger: LedgerEntry[] = [];

        // ONLY use transactions table (invoices are already recorded there)
        // This prevents duplicate entries
        transactions.forEach(t => {
            // Determine if this is a debt or credit based on amount sign
            const isDebt = t.amount > 0;
            const amount = Math.abs(t.amount);

            ledger.push({
                date: t.date,
                description: t.description || (t.type === 'Payment' ? 'Tahsilat' : 'İşlem'),
                reference: t.referenceId || t.referenceType || 'Manuel',
                type: t.referenceType || 'Transaction',
                debt: isDebt ? amount : 0,
                credit: !isDebt ? amount : 0,
            });
        });

        // Sort by date
        ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let balance = 0;
        const finalizedLedger = ledger.map(item => {
            balance += (item.debt - item.credit);
            return { ...item, balance };
        });

        return { success: true, data: { customer, ledger: finalizedLedger, finalBalance: balance } };
    } catch (error) {
        logger.error('Failed to get customer statement:', error);
        return { success: false, error: 'Ekstre oluşturulurken hata oluştu.' };
    }
}

/**
 * Changes the customer of an existing proposal.
 * This directly updates the proposal's customerId and customerName.
 */
export async function changeProposalCustomer(proposalId: string, targetCustomerId: string) {
    try {
        const targetCustomer = await prisma.customer.findFirst({
            where: { id: targetCustomerId, isDeleted: false }
        });

        if (!targetCustomer) {
            return { success: false, error: 'Hedef müşteri bulunamadı.' };
        }

        const updatedProposal = await prisma.proposal.update({
            where: { id: proposalId },
            data: {
                customerId: targetCustomer.id,
                customerName: targetCustomer.name
            }
        });

        revalidatePath('/quotes');
        revalidatePath(`/quotes/${proposalId}`);

        return { success: true, data: updatedProposal };
    } catch (error) {
        logger.error('Failed to change proposal customer:', error);
        return { success: false, error: 'Müşteri değiştirilirken bir hata oluştu.' };
    }
}
