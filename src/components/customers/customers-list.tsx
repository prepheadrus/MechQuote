/**
 * Customers List Component
 * 
 * Müşteri listesi tablosu
 */

'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvatarFallback } from '@/lib/placeholder-images';

interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    balance: number;
    tags: string[];
    status: string;
}

interface CustomersListProps {
    customers: Customer[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onEdit: (customer: Customer) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}

export function CustomersList({
    customers,
    selectedIds,
    onToggleSelect,
    onEdit,
    onDelete,
    onView,
}: CustomersListProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox
                                checked={selectedIds.size === customers.length && customers.length > 0}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        customers.forEach((c) => onToggleSelect(c.id));
                                    } else {
                                        customers.forEach((c) => onToggleSelect(c.id));
                                    }
                                }}
                            />
                        </TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>İletişim</TableHead>
                        <TableHead>Bakiye</TableHead>
                        <TableHead>Etiketler</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedIds.has(customer.id)}
                                    onCheckedChange={() => onToggleSelect(customer.id)}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                            {getAvatarFallback(customer.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {customer.status}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    {customer.email && (
                                        <div className="flex items-center gap-1 text-xs">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            {customer.email}
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center gap-1 text-xs">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            {customer.phone}
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className={`font-medium ${customer.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(customer.balance)}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {customer.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {customer.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{customer.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onView(customer.id)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Görüntüle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Düzenle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDelete(customer.id)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Sil
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
