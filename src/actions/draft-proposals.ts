'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Draft Proposal - Akıllı Teklif Sihirbazı taslak kayıtları
 * Server-side storage for AI analysis progress
 */

export interface DraftProposalData {
    title?: string | null;
    description?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    tags?: string[];
    inputText?: string | null;
    draftItems?: any[]; // DraftItem[]
    step?: string;
    status?: string;
    convertedToProposalId?: string | null;
}

/**
 * Save or update a draft proposal
 */
export async function saveDraftProposal(data: DraftProposalData) {
    try {
        // Find existing draft (only one active draft per session/customer)
        const existingDraft = await prisma.draftProposal.findFirst({
            where: {
                isDeleted: false,
                expiresAt: {
                    gt: new Date()
                },
                customerId: data.customerId || null // Same customer or no customer
            }
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        if (existingDraft) {
            // Update existing
            const updated = await prisma.draftProposal.update({
                where: { id: existingDraft.id },
                data: {
                    title: data.title || existingDraft.title,
                    description: data.description || existingDraft.description,
                    customerId: data.customerId || null,
                    customerName: data.customerName || existingDraft.customerName,
                    // @ts-ignore - Prisma JSON column type issue
                    tags: data.tags ? JSON.stringify(data.tags) : existingDraft.tags,
                    inputText: data.inputText || existingDraft.inputText,
                    // @ts-ignore - Prisma JSON column type issue
                    draftItems: data.draftItems ? JSON.stringify(data.draftItems) : existingDraft.draftItems,
                    step: data.step || existingDraft.step,
                    status: data.status || existingDraft.status,
                    convertedToProposalId: data.convertedToProposalId !== undefined ? data.convertedToProposalId : existingDraft.convertedToProposalId,
                    updatedAt: new Date(),
                    expiresAt
                }
            });

            console.log(`[DraftProposal] Updated: ${updated.id}`);
            return { success: true, data: updated };
        } else {
            // Create new
            const created = await prisma.draftProposal.create({
                data: {
                    title: data.title || null,
                    description: data.description || null,
                    customerId: data.customerId || null,
                    customerName: data.customerName || null,
                    // @ts-ignore - Prisma JSON column type issue
                    tags: data.tags ? JSON.stringify(data.tags) : null,
                    inputText: data.inputText || null,
                    // @ts-ignore - Prisma JSON column type issue
                    draftItems: data.draftItems ? JSON.stringify(data.draftItems) : null,
                    step: data.step || 'input',
                    status: data.status || 'draft',
                    expiresAt
                }
            });

            console.log(`[DraftProposal] Created: ${created.id}`);
            return { success: true, data: created };
        }
    } catch (error: any) {
        console.error('[DraftProposal] Save error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get the active draft proposal
 */
export async function getDraftProposal() {
    try {
        const draft = await prisma.draftProposal.findFirst({
            where: {
                isDeleted: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!draft) {
            return { success: true, data: null };
        }

        // Parse JSON fields with proper handling
        let items = [];
        if (draft.draftItems) {
            if (typeof draft.draftItems === 'string') {
                try {
                    items = JSON.parse(draft.draftItems);
                } catch (e) {
                    console.error('Failed to parse draftItems:', e);
                }
            } else if (typeof draft.draftItems === 'object' && 'set' in draft.draftItems) {
                try {
                    items = typeof draft.draftItems.set === 'string' 
                        ? JSON.parse(draft.draftItems.set) 
                        : draft.draftItems.set;
                } catch (e) {
                    console.error('Failed to parse draftItems.set:', e);
                }
            }
        }

        let tags = [];
        if (draft.tags) {
            if (typeof draft.tags === 'string') {
                try {
                    tags = JSON.parse(draft.tags);
                } catch (e) {
                    console.error('Failed to parse tags:', e);
                }
            } else if (Array.isArray(draft.tags)) {
                tags = draft.tags;
            }
        }

        const parsed = {
            ...draft,
            tags,
            draftItems: Array.isArray(items) ? items : []
        };

        console.log(`[DraftProposal] Retrieved: ${draft.id} with ${parsed.draftItems.length} items`);
        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('[DraftProposal] Get error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a draft proposal
 */
export async function deleteDraftProposal(draftId: string) {
    try {
        await prisma.draftProposal.update({
            where: { id: draftId },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        console.log(`[DraftProposal] Deleted: ${draftId}`);
        revalidatePath('/quotes');
        return { success: true };
    } catch (error: any) {
        console.error('[DraftProposal] Delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all active drafts (for draft picker)
 */
export async function getAllDrafts() {
    try {
        const drafts = await prisma.draftProposal.findMany({
            where: {
                isDeleted: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 50
        });

        // Parse JSON fields
        const parsed = drafts.map(draft => {
            // Handle draftItems - could be string, object with "set" property, or array
            let items = [];
            if (draft.draftItems) {
                if (typeof draft.draftItems === 'string') {
                    try {
                        items = JSON.parse(draft.draftItems);
                    } catch (e) {
                        console.error('Failed to parse draftItems:', e);
                    }
                } else if (typeof draft.draftItems === 'object') {
                    // Check if it has "set" property (Prisma internal format)
                    if ('set' in draft.draftItems) {
                        try {
                            items = typeof draft.draftItems.set === 'string' 
                                ? JSON.parse(draft.draftItems.set) 
                                : draft.draftItems.set;
                        } catch (e) {
                            console.error('Failed to parse draftItems.set:', e);
                        }
                    } else {
                        // Fallback: stringify then parse
                        try {
                            items = JSON.parse(JSON.stringify(draft.draftItems));
                        } catch (e) {
                            console.error('Failed to stringify draftItems:', e);
                        }
                    }
                }
            }
            
            // Handle tags similarly
            let tags = [];
            if (draft.tags) {
                if (typeof draft.tags === 'string') {
                    try {
                        tags = JSON.parse(draft.tags);
                    } catch (e) {
                        console.error('Failed to parse tags:', e);
                    }
                } else if (Array.isArray(draft.tags)) {
                    tags = draft.tags;
                }
            }
            
            return {
                ...draft,
                tags,
                draftItems: Array.isArray(items) ? items : []
            };
        });

        console.log(`[DraftProposal] Retrieved ${parsed.length} drafts`);
        return { success: true, data: parsed };
    } catch (error: any) {
        console.error('[DraftProposal] Get all error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update draft metadata (title, tags, etc.)
 */
export async function updateDraftMetadata(
    draftId: string,
    data: { title?: string; description?: string; tags?: string[] }
) {
    try {
        const updated = await prisma.draftProposal.update({
            where: { id: draftId },
            data: {
                title: data.title,
                description: data.description,
                tags: data.tags ? { set: JSON.stringify(data.tags) } : undefined
            }
        });

        console.log(`[DraftProposal] Metadata updated: ${draftId}`);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('[DraftProposal] Update metadata error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cleanup expired drafts (run periodically)
 */
export async function cleanupExpiredDrafts() {
    try {
        const result = await prisma.draftProposal.updateMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isDeleted: true }
                ]
            },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        console.log(`[DraftProposal] Cleaned up ${result.count} expired drafts`);
        return { success: true, count: result.count };
    } catch (error: any) {
        console.error('[DraftProposal] Cleanup error:', error);
        return { success: false, error: error.message };
    }
}
