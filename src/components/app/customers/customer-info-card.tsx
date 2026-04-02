
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, User, FileText, MapPin } from 'lucide-react';
import { Customer } from '@prisma/client';
import { availableTags, getTagClassName } from '@/lib/tags';
import { cn } from '@/lib/utils';

// Helper for Safe Rendering
const safeRender = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
        try {
            return typeof value.toString === 'function' && value.toString() !== '[object Object]'
                ? value.toString()
                : '-';
        } catch (e) {
            return 'Invalid Data';
        }
    }
    return value;
};

interface CustomerInfoCardProps {
    customer: Customer | any; // accepting any for flexibility with prisma/dexie types mixing
}

export function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
    if (!customer) return null;

    // Safe Address Accessor
    const validAddress = useMemo(() => {
        if (!customer?.address) return {};
        let addr: any = customer.address;

        if (typeof addr === 'object' && addr !== null) {
            return addr;
        }

        if (typeof addr === 'string') {
            if (!addr.trim().startsWith('{')) {
                return { street: addr };
            }
            try {
                return JSON.parse(addr);
            } catch (error) {
                return { street: addr };
            }
        }
        return {};
    }, [customer]);

    return (
        <Card className="border-none shadow-none">
            <CardContent className="p-0">
                <div className="flex flex-col gap-6">

                    {/* 1. Contact Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground border-b pb-2">
                            <User className="h-4 w-4" />
                            <h3 className="font-semibold text-foreground text-sm">İletişim Bilgileri</h3>
                        </div>
                        <div className="space-y-3 pl-2">
                            <div className="flex items-center gap-3 group">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">E-posta</span>
                                    <a href={`mailto:${customer.email}`} className="text-sm font-medium hover:underline truncate text-foreground" title={customer.email}>
                                        {safeRender(customer.email)}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Telefon</span>
                                    <span className="text-sm font-medium text-foreground">{safeRender(customer.phone)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Tax & Status */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground border-b pb-2">
                            <FileText className="h-4 w-4" />
                            <h3 className="font-semibold text-foreground text-sm">Vergi & Durum</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-2">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Vergi Dairesi</span>
                                <div className="text-sm font-medium">{safeRender(customer.taxOffice)}</div>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">VKN / TCKN</span>
                                <div className="font-mono text-sm bg-muted px-2 py-0.5 rounded w-fit text-foreground">{safeRender(customer.taxId)}</div>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Etiketler</span>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={customer.status === 'Aktif' ? 'default' : 'secondary'} className={customer.status === 'Aktif' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                        {safeRender(customer.status)}
                                    </Badge>
                                    {(() => {
                                        let safeTags: string[] = [];
                                        if (Array.isArray(customer.tags)) {
                                            safeTags = customer.tags;
                                        } else if (typeof customer.tags === 'string') {
                                            try {
                                                const parsed = JSON.parse(customer.tags);
                                                if (Array.isArray(parsed)) safeTags = parsed;
                                                else safeTags = [customer.tags];
                                            } catch {
                                                safeTags = customer.tags.includes(',') ? customer.tags.split(',') : [customer.tags];
                                            }
                                        }

                                        return safeTags.map((tagId: string) => {
                                            const tagInfo = availableTags.find(t => t.id === tagId.trim());
                                            if (!tagInfo) return null;
                                            return (
                                                <Badge key={tagId} variant="outline" className={cn("text-xs border-0", getTagClassName(tagInfo.color))}>
                                                    {tagInfo.name}
                                                </Badge>
                                            )
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Detailed Address */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground border-b pb-2">
                            <MapPin className="h-4 w-4" />
                            <h3 className="font-semibold text-foreground text-sm">Lokasyon</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/30 p-3 rounded-lg border border-dashed ml-1">
                            <div className="col-span-2">
                                <span className="text-[10px] text-muted-foreground">Şehir / İlçe</span>
                                <div className="font-medium">{safeRender(validAddress.city)} / {safeRender(validAddress.district)}</div>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] text-muted-foreground">Mahalle</span>
                                <div className="font-medium">{safeRender(validAddress.neighborhood)}</div>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] text-muted-foreground">Adres</span>
                                <div className="font-medium">{safeRender(validAddress.street)} {validAddress.buildingNumber ? `No:${safeRender(validAddress.buildingNumber)}` : ''} {validAddress.apartmentNumber ? `D:${safeRender(validAddress.apartmentNumber)}` : ''}</div>
                            </div>
                            {validAddress.buildingName && (
                                <div className="col-span-2">
                                    <span className="text-[10px] text-muted-foreground">Site Adı</span>
                                    <div className="font-medium">{safeRender(validAddress.buildingName)}</div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
