'use server'

import { prisma } from '@/lib/prisma';

export async function createAuditLog(data: {
    action: string;
    entityId: string;
    entityType: string;
    details?: string;
    userId?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action: data.action,
                entityId: data.entityId,
                entityType: data.entityType,
                details: data.details || '',
                userId: data.userId || 'Sistem'
            }
        });
    } catch (error) {
        // Loglama hatası ana akışı bozmamalı
        console.error('Audit Log Oluşturma Hatası:', error);
    }
}

export async function getAuditLogs(limit = 100) {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        return { success: true, data: logs };
    } catch (error) {
        console.error('Audit Log Getirme Hatası:', error);
        return { success: false, error: 'İşlem geçmişi yüklenirken bir hata oluştu.' };
    }
}