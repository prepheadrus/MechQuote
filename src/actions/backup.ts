'use server'

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

type JsonData = Record<string, any>;

/**
 * Get all system data for backup
 */
export async function getFullSystemData() {
    try {
        const [
            settings,
            customers,
            customerTransactions,
            products,
            suppliers,
            personnel,
            proposals,
            proposalItems,
            jobAssignments,
            interactions,
            recipes,
            recipeItems,
            templates,
            installationTypes,
            monthlyTargets,
            laborCosts,
            invoices,
            invoiceItems,
            purchaseHistory,
            projects,
            projectExpenses,
            payments
        ] = await Promise.all([
            prisma.settings.findFirst(),
            prisma.customer.findMany(),
            prisma.customerTransaction.findMany(),
            prisma.product.findMany(),
            prisma.supplier.findMany(),
            prisma.personnel.findMany(),
            prisma.proposal.findMany(),
            prisma.proposalItem.findMany(),
            prisma.jobAssignment.findMany(),
            prisma.customerInteraction.findMany(),
            prisma.recipe.findMany(),
            prisma.recipeItem.findMany(),
            prisma.template.findMany(),
            prisma.installationType.findMany(),
            prisma.monthlyTarget.findMany(),
            prisma.laborCost.findMany(),
            prisma.invoice.findMany(),
            prisma.invoiceItem.findMany(),
            prisma.purchaseHistory.findMany(),
            prisma.project.findMany(),
            prisma.projectExpense.findMany(),
            prisma.payment.findMany()
        ]);

        return {
            success: true,
            data: {
                server_settings: settings ? [settings] : [],
                server_customers: customers,
                server_customer_transactions: customerTransactions,
                server_products: products,
                server_suppliers: suppliers,
                server_personnel: personnel,
                server_proposals: proposals,
                server_proposal_items: proposalItems,
                server_job_assignments: jobAssignments,
                server_interactions: interactions,
                server_recipes: recipes,
                server_recipe_items: recipeItems,
                server_templates: templates,
                server_categories: installationTypes,
                server_monthly_targets: monthlyTargets,
                server_labor_costs: laborCosts,
                server_invoices: invoices,
                server_invoice_items: invoiceItems,
                server_purchase_history: purchaseHistory,
                server_projects: projects,
                server_transactions: projectExpenses,
                server_payments: payments
            }
        };
    } catch (error) {
        logger.error('Backup error:', error);
        return { success: false, error: 'Veriler çekilirken hata oluştu.' };
    }
}

/**
 * Restore system data from JSON
 */
export async function restoreSystemData(jsonData: any) {
    try {
        if (!jsonData || typeof jsonData !== 'object') {
            return { success: false, error: 'Geçersiz yedek dosyası.' };
        }

        return await prisma.$transaction(async (tx) => {
            // 1. CLEAR ALL TABLES in correct order (Dependent first)
            await tx.payment.deleteMany();
            await tx.purchaseHistory.deleteMany();
            await tx.projectExpense.deleteMany();
            await tx.invoiceItem.deleteMany();
            await tx.jobAssignment.deleteMany();
            await tx.proposalItem.deleteMany();
            await tx.recipeItem.deleteMany();
            await tx.recipe.deleteMany();
            await tx.customerInteraction.deleteMany();
            await tx.customerTransaction.deleteMany();

            // Handle Project/Proposal circular or dependency
            // We set linkedProposalId to null first to avoid constraint issues if any
            await tx.project.updateMany({ data: { linkedProposalId: null } });
            await tx.proposal.updateMany({ data: { projectId: null } });

            await tx.invoice.deleteMany();
            await tx.proposal.deleteMany();
            await tx.project.deleteMany();
            await tx.product.deleteMany();
            await tx.personnel.deleteMany();
            await tx.template.deleteMany();
            await tx.monthlyTarget.deleteMany();
            await tx.laborCost.deleteMany();
            await tx.installationType.deleteMany();
            await tx.supplier.deleteMany();
            await tx.customer.deleteMany();
            await tx.settings.deleteMany();

            // 2. RESTORE TABLES in correct order (Base first)

            // Helper to convert date strings to Date objects
            const fixDates = (items: JsonData[]) => {
                if (!items) return [];
                return items.map(item => {
                    const newItem: JsonData = { ...item };
                    for (const key in newItem) {
                        // Strict check to avoid false positives like "status", "vatRate" which contain "at"
                        // Only target keys ending in "At" (createdAt, updatedAt) or containing "date"
                        if (key.endsWith('At') || key.toLowerCase().includes('date')) {
                            const val = newItem[key];
                            // Verify it's a string and looks like an ISO date
                            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                                const date = new Date(val);
                                if (!isNaN(date.getTime())) {
                                    newItem[key] = date;
                                }
                            }
                        }
                    }
                    return newItem;
                });
            };

            // a. Base Tables
            if (jsonData.server_settings?.length) {
                await tx.settings.createMany({ data: jsonData.server_settings as Prisma.SettingsCreateManyInput[] });
            }
            if (jsonData.server_customers?.length) {
                await tx.customer.createMany({ data: fixDates(jsonData.server_customers) as Prisma.CustomerCreateManyInput[] });
            }
            if (jsonData.server_suppliers?.length) {
                await tx.supplier.createMany({ data: jsonData.server_suppliers as Prisma.SupplierCreateManyInput[] });
            }

            // a1. Installation types (Categories) - Handle self-relation parentId
            if (jsonData.server_categories?.length) {
                // Step 1: Create without parentId to avoid FK errors
                const catWithoutParent = jsonData.server_categories.map((c: any) => ({ ...c, parentId: null })) as Prisma.InstallationTypeCreateManyInput[];
                await tx.installationType.createMany({ data: catWithoutParent });

                // Step 2: Update with actual parentIds
                for (const cat of jsonData.server_categories) {
                    if (cat.parentId) {
                        await tx.installationType.update({
                            where: { id: cat.id },
                            data: { parentId: cat.parentId }
                        });
                    }
                }
            }

            if (jsonData.server_labor_costs?.length) {
                await tx.laborCost.createMany({ data: jsonData.server_labor_costs as Prisma.LaborCostCreateManyInput[] });
            }
            if (jsonData.server_monthly_targets?.length) {
                await tx.monthlyTarget.createMany({ data: fixDates(jsonData.server_monthly_targets) as Prisma.MonthlyTargetCreateManyInput[] });
            }
            if (jsonData.server_template?.length || jsonData.server_templates?.length) {
                const templates = jsonData.server_templates || jsonData.server_template;
                await tx.template.createMany({ data: fixDates(templates) as Prisma.TemplateCreateManyInput[] });
            }
            if (jsonData.server_personnel?.length) {
                await tx.personnel.createMany({ data: jsonData.server_personnel as Prisma.PersonnelCreateManyInput[] });
            }

            // b. Products
            if (jsonData.server_products?.length) {
                await tx.product.createMany({ data: fixDates(jsonData.server_products) as Prisma.ProductCreateManyInput[] });
            }

            // Helper to fix project status (Legacy support)
            const fixProjectStatus = (projects: JsonData[]) => {
                if (!projects) return [];
                return projects.map(p => {
                    let status = p.status;
                    // Map legacy string statuses to new Enum values
                    if (status === 'Ongoing') status = 'MONTAJ_VE_IMALAT';
                    else if (status === 'Completed') status = 'PROJE_TAMAMLANDI';
                    else if (status === 'Cancelled') status = 'IPTAL_EDILDI';
                    else if (status === 'OnHold') status = 'ASKIYA_ALINDI';
                    else if (status === 'Potential') status = 'SOZLESME_ASAMASI';

                    return { ...p, status };
                });
            };

            // c. Projects & Proposals (Circular deps handled)
            // Step 1: Create without circular FKs
            if (jsonData.server_projects?.length) {
                // Fix dates AND status
                const processedProjects = fixProjectStatus(fixDates(jsonData.server_projects));

                const projWithoutLink = processedProjects.map((p: any) => ({ ...p, linkedProposalId: null })) as Prisma.ProjectCreateManyInput[];
                await tx.project.createMany({ data: projWithoutLink });
            }
            if (jsonData.server_proposals?.length) {
                const propWithoutLink = jsonData.server_proposals.map((p: any) => ({ ...p, projectId: null }));
                await tx.proposal.createMany({ data: fixDates(propWithoutLink) as Prisma.ProposalCreateManyInput[] });
            }

            // Step 2: Update circular FKs now that both records exist
            if (jsonData.server_projects?.length) {
                for (const proj of jsonData.server_projects) {
                    if (proj.linkedProposalId) {
                        await tx.project.update({
                            where: { id: proj.id },
                            data: { linkedProposalId: proj.linkedProposalId }
                        });
                    }
                }
            }
            if (jsonData.server_proposals?.length) {
                for (const prop of jsonData.server_proposals) {
                    if (prop.projectId) {
                        await tx.proposal.update({
                            where: { id: prop.id },
                            data: { projectId: prop.projectId }
                        });
                    }
                }
            }

            // d. Invoices
            if (jsonData.server_invoices?.length) {
                const invoices = jsonData.server_invoices.map((inv: any) => {
                    const { pdfFileBlob, ...rest } = inv;
                    return rest;
                });
                await tx.invoice.createMany({ data: fixDates(invoices) as Prisma.InvoiceCreateManyInput[] });
            }

            // e. Dependent Tables
            if (jsonData.server_transactions?.length) {
                await tx.projectExpense.createMany({ data: fixDates(jsonData.server_transactions) as Prisma.ProjectExpenseCreateManyInput[] });
            }
            if (jsonData.server_customer_transactions?.length) {
                await tx.customerTransaction.createMany({ data: fixDates(jsonData.server_customer_transactions) as Prisma.CustomerTransactionCreateManyInput[] });
            }
            if (jsonData.server_interactions?.length) {
                await tx.customerInteraction.createMany({ data: fixDates(jsonData.server_interactions) as Prisma.CustomerInteractionCreateManyInput[] });
            }
            if (jsonData.server_proposal_items?.length) {
                await tx.proposalItem.createMany({ data: jsonData.server_proposal_items as Prisma.ProposalItemCreateManyInput[] });
            }
            if (jsonData.server_job_assignments?.length) {
                await tx.jobAssignment.createMany({ data: fixDates(jsonData.server_job_assignments) as Prisma.JobAssignmentCreateManyInput[] });
            }
            if (jsonData.server_invoice_items?.length) {
                await tx.invoiceItem.createMany({ data: jsonData.server_invoice_items as Prisma.InvoiceItemCreateManyInput[] });
            }
            if (jsonData.server_purchase_history?.length) {
                await tx.purchaseHistory.createMany({ data: fixDates(jsonData.server_purchase_history) as Prisma.PurchaseHistoryCreateManyInput[] });
            }
            if (jsonData.server_payments?.length) {
                await tx.payment.createMany({ data: fixDates(jsonData.server_payments) as Prisma.PaymentCreateManyInput[] });
            }
            if (jsonData.server_recipes?.length) {
                await tx.recipe.createMany({ data: jsonData.server_recipes as Prisma.RecipeCreateManyInput[] });
            }
            if (jsonData.server_recipe_items?.length) {
                await tx.recipeItem.createMany({ data: jsonData.server_recipe_items as Prisma.RecipeItemCreateManyInput[] });
            }

            // f. RECONCILIATION: Recalculate customer balances based on transactions
            const transactionSums = await tx.customerTransaction.groupBy({
                by: ['customerId'],
                _sum: {
                    amount: true,
                },
            });

            await Promise.all(
                transactionSums.map((ts) => {
                    if (ts.customerId && ts._sum.amount !== null) {
                        return tx.customer.update({
                            where: { id: ts.customerId },
                            data: { balance: ts._sum.amount },
                        });
                    }
                    return Promise.resolve();
                })
            );

            return { success: true };
        });

    } catch (error: any) {
        logger.error('Restore error:', error);
        return { success: false, error: `Geri yükleme hatası: ${error.message}` };
    } finally {
        revalidatePath('/');
    }
}
