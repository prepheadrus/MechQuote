'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge'; // Badge bileşeni yoksa span kullanılabilir
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    userId: string | null;
    createdAt: Date | string;
};

interface AuditLogViewerProps {
    logs: AuditLog[];
}

export default function AuditLogViewer({ logs = [] }: AuditLogViewerProps) {
    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'destructive'; // Kırmızı
        if (action.includes('UPDATE')) return 'secondary';   // Gri/Mavi
        if (action.includes('CREATE')) return 'default';     // Siyah/Koyu
        return 'outline';
    };

    return (
        <div className="border rounded-lg shadow-sm bg-card text-card-foreground">
            <div className="p-6 border-b flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Sistem İşlem Geçmişi (Audit Log)</h3>
            </div>
            <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Tarih</TableHead>
                            <TableHead>İşlem</TableHead>
                            <TableHead>Kayıt Türü</TableHead>
                            <TableHead className="w-[40%]">Detaylar</TableHead>
                            <TableHead>Kullanıcı</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Henüz kaydedilmiş bir işlem yok.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium text-xs">
                                        {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getActionColor(log.action) === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80' : 'text-foreground'}`}>
                                            {log.action}
                                        </span>
                                    </TableCell>
                                    <TableCell>{log.entityType}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                                    <TableCell className="text-xs">{log.userId}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}