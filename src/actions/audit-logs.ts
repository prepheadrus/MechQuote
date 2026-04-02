'use server';

import { getAuditLogs as getLogs } from '@/services/audit-service';

export async function getAuditLogs(limit?: number) {
    try {
        const logs = await getLogs(limit);
        return { success: true, data: logs };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
