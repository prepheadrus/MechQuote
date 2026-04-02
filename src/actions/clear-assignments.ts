"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logger } from '@/lib/logger';

export async function clearProposalAssignments(proposalId: string) {
    try {
        await prisma.jobAssignment.deleteMany({
            where: { proposalId: proposalId }
        });
        revalidatePath('/quotes');
        return { success: true };
    } catch (error) {
        logger.error("Failed to clear assignments:", error);
        return { success: false, error: "Atamalar silinemedi." };
    }
}
