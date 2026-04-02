/**
 * Importer Customer Select Component
 * 
 * Müşteri seçimi ve hızlı ekleme
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, User } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface ImporterCustomerSelectProps {
    customers: Customer[];
    selectedCustomerId: string | null;
    onSelectCustomer: (customerId: string) => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
    isLoading: boolean;
}

export function ImporterCustomerSelect({
    customers,
    selectedCustomerId,
    onSelectCustomer,
    onAddCustomer,
    isLoading,
}: ImporterCustomerSelectProps) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerEmail, setNewCustomerEmail] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddCustomer = async () => {
        if (!newCustomerName.trim()) return;
        
        await onAddCustomer({
            name: newCustomerName,
            email: newCustomerEmail || undefined,
            phone: newCustomerPhone || undefined,
        });
        
        setIsAddOpen(false);
        setNewCustomerName('');
        setNewCustomerEmail('');
        setNewCustomerPhone('');
    };

    return (
        <>
            <div className="space-y-2">
                <Label>Müşteri Seçin</Label>
                <div className="flex gap-2">
                    <Select
                        value={selectedCustomerId || ''}
                        onValueChange={onSelectCustomer}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Müşteri seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                            <div className="p-2">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Müşteri ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <ScrollArea className="h-[300px]">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium">{customer.name}</div>
                                                    {(customer.email || customer.phone) && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {customer.email} {customer.phone && `• ${customer.phone}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Müşteri bulunamadı
                                    </div>
                                )}
                            </ScrollArea>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddOpen(true)}
                        className="shrink-0"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Add Customer Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
                        <DialogDescription>
                            Hızlı teklif oluşturmak için yeni müşteri ekleyin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Müşteri Adı *</Label>
                            <Input
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="Örn: ABC İnşaat"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-posta</Label>
                            <Input
                                type="email"
                                value={newCustomerEmail}
                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                                placeholder="ornek@abc.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                placeholder="0555 123 45 67"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleAddCustomer} disabled={isLoading || !newCustomerName.trim()}>
                            {isLoading ? 'Ekleniyor...' : 'Ekle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
