
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getCustomerList, bulkCreateCustomers } from '@/actions/customers';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerImportExportProps {
    onSuccess?: () => void;
}

export function CustomerImportExport({ onSuccess }: CustomerImportExportProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await getCustomerList();
            const customers = result.success ? result.data as any[] : [];
            if (customers.length === 0) {
                toast({ title: 'Uyarı', description: 'Dışa aktarılacak müşteri bulunamadı.' });
                setIsExporting(false);
                return;
            }

            // Flatten data for Excel
            const exportData = customers.map(c => ({
                'Ad / Unvan': c.name,
                'E-posta': c.email || '',
                'Telefon': c.phone || '',
                'Vergi No': c.taxId || '',
                'Vergi Dairesi': c.taxOffice || '',
                'Şehir': typeof c.address === 'string' ? JSON.parse(c.address || '{}').city : c.address?.city || '',
                'İlçe': typeof c.address === 'string' ? JSON.parse(c.address || '{}').district : c.address?.district || '',
                'Adres': typeof c.address === 'string' ? JSON.parse(c.address || '{}').street : c.address?.street || '',
                'Notlar': c.notes || '',
                'Etiketler': c.tags ? (typeof c.tags === 'string' ? JSON.parse(c.tags).join(', ') : c.tags.join(', ')) : '',
                'Durum': c.status || 'Aktif'
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Musteriler_${dateStr}.xlsx`);

            toast({ title: 'Başarılı', description: 'Müşteri listesi indirildi.' });

        } catch (error: any) {
            console.error('Export error:', error);
            toast({ variant: 'destructive', title: 'Hata', description: 'Dışa aktarma başarısız: ' + error.message });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0]; // Assume first sheet
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    throw new Error('Dosya boş veya okunamadı.');
                }

                let importedCount = 0;
                let potentialCustomers: any[] = [];

                // Map Excel data to Customer schema
                // Flexible mapping for common column names
                for (const row of jsonData as any[]) {
                    // Try to find name in various common column headers
                    const name = row['Ad'] || row['Adı'] || row['Unvan'] || row['Ad / Unvan'] || row['İsim'] || row['Müşteri Adı'];

                    if (!name) continue; // Skip rows without name

                    const customer = {
                        name: String(name).trim(),
                        email: row['E-posta'] || row['Email'] || row['Mail'] || '',
                        phone: row['Telefon'] || row['Tel'] || row['Cep'] || '',
                        taxId: row['Vergi No'] || row['TCKN'] || row['VKN'] || '',
                        taxOffice: row['Vergi Dairesi'] || '',
                        address: {
                            city: row['Şehir'] || row['İl'] || '',
                            district: row['İlçe'] || '',
                            street: row['Adres'] || row['Açık Adres'] || '',
                            zip: row['Posta Kodu'] || ''
                        },
                        notes: row['Notlar'] || row['Not'] || '',
                        status: (row['Durum'] === 'Pasif' ? 'Pasif' : 'Aktif'),
                        tags: row['Etiketler'] ? String(row['Etiketler']).split(',').map(s => s.trim()) : [],
                    };

                    potentialCustomers.push(customer);
                }

                if (potentialCustomers.length > 0) {
                    const result = await bulkCreateCustomers(potentialCustomers);
                    if (!result.success) throw new Error(result.error);
                    importedCount = result.count || 0;
                    toast({ title: 'Başarılı', description: `${importedCount} müşteri başarıyla yüklendi.` });
                    if (onSuccess) onSuccess();
                } else {
                    toast({ title: 'Bilgi', description: 'Yüklenecek geçerli müşteri bulunamadı. Sütun başlıklarını kontrol edin (örn: Ad, Telefon).' });
                }

            } catch (error: any) {
                console.error('Import error:', error);
                toast({ variant: 'destructive', title: 'Hata', description: 'İçe aktarma hatası: ' + error.message });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
            }
        };

        reader.readAsBinaryString(file);
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isImporting || isExporting}>
                        {isImporting || isExporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        Excel İşlemleri
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        Excel'e Aktar (Yedekle)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleImportClick} disabled={isImporting}>
                        <Upload className="mr-2 h-4 w-4" />
                        Excel'den Yükle
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
