
import { prisma } from "@/lib/prisma";
import type { AuditLog } from "@prisma/client";

export async function createAuditLog(
    action: string,
    entityType: string,
    entityId: string | null,
    details: string | null,
    userId: string | null,
    username: string | null
) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                details,
                userId,
                username,
            },
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw, as auditing shouldn't block main actions
    }
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
        });
        return logs;
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
    }
}
