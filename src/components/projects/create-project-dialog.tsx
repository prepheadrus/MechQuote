'use client';

import * as React from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarFallback } from "@/lib/placeholder-images";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proposal: any;
    onConfirm: (data: any) => void;
    personnelList?: any[];
}

export function CreateProjectDialog({
    open,
    onOpenChange,
    proposal,
    onConfirm,
    personnelList: initialPersonnel,
}: CreateProjectDialogProps) {
    // Editable State
    const [name, setName] = React.useState("");
    const [contractAmount, setContractAmount] = React.useState<string>("");
    const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
    const [description, setDescription] = React.useState("");
    const [estimatedMaterialCost, setEstimatedMaterialCost] = React.useState("0");
    const [estimatedLaborCost, setEstimatedLaborCost] = React.useState("0");

    // Team Selection State
    const [personnelList, setPersonnelList] = React.useState<any[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedTeam, setSelectedTeam] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open && proposal) {
            // Initialize fields from proposal
            setName(proposal.projectName || "");
            setContractAmount(proposal.totalAmount?.toString() || "0");
            setDescription(`Teklif No: #${proposal.id?.substring(0, 8)}... üzerinden oluşturuldu.`);
            setStartDate(new Date());
            setEndDate(undefined);

            // Smart Cost Estimation
            const materialCost = proposal.items?.reduce((sum: number, item: any) => {
                // Heuristic: If it's not explicitly labor, it's material.
                // This will be refined on the server, but provides a good default.
                if (item.name?.startsWith('İşçilik:')) {
                    return sum;
                }
                const exchangeRate = item.currency === 'USD' ? (proposal.exchangeRateUSD || 1) : 
                                     item.currency === 'EUR' ? (proposal.exchangeRateEUR || 1) : 1;
                return sum + (item.quantity * item.basePrice * exchangeRate);
            }, 0) || 0;

            const laborCost = proposal.jobAssignments?.reduce((sum: number, ja: any) => sum + (ja.assignedAmount || 0), 0) || 0;

            setEstimatedMaterialCost(materialCost.toFixed(2));
            setEstimatedLaborCost(laborCost.toFixed(2));


            // Initialize Team List
            setPersonnelList(initialPersonnel || []);
        }
    }, [open, proposal, initialPersonnel]);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm({
                name: name, // Use edited name
                customerId: proposal.customerId,
                contractAmount: parseFloat(contractAmount), // Use edited amount
                estimatedMaterialCost: parseFloat(estimatedMaterialCost),
                estimatedLaborCost: parseFloat(estimatedLaborCost),
                startDate: startDate,
                endDate: endDate, // Pass edited end date
                description,
                customerName: proposal.customerName,
                teamMemberDetails: selectedTeam.map(id => {
                    const p = personnelList.find(pl => pl.id === id);
                    return {
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        email: p.email
                    };
                }),
                teamMemberIds: selectedTeam
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Project creation failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSelection = (personId: string) => {
        if (selectedTeam.includes(personId)) {
            setSelectedTeam(prev => prev.filter((id) => id !== personId));
        } else {
            setSelectedTeam(prev => [...prev, personId]);
        }
    };

    const filteredPersonnel = React.useMemo(() => {
        if (!searchTerm) return personnelList;
        const lowerTerm = searchTerm.toLocaleLowerCase('tr-TR');
        return personnelList.filter(p =>
            p.name.toLocaleLowerCase('tr-TR').includes(lowerTerm) ||
            (p.role && p.role.toLocaleLowerCase('tr-TR').includes(lowerTerm))
        );
    }, [personnelList, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added max-h and overflow handling to DialogContent */}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-white">
                <DialogHeader>
                    <DialogTitle>Proje Oluştur</DialogTitle>
                    <DialogDescription>
                        Proje detaylarını düzenleyin.
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>Proje Adı</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Proje Adı Giriniz"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Müşteri</Label>
                            <Input value={proposal?.customerName || ''} disabled className="bg-muted text-muted-foreground" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Sözleşme Tutarı</Label>
                                <Input
                                    type="number"
                                    value={contractAmount}
                                    onChange={(e) => setContractAmount(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Para Birimi</Label>
                                <Input value={proposal?.currency || 'TRY'} disabled className="bg-muted" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-blue-700 font-bold">Öngörülen Malzeme Maliyeti</Label>
                                <Input
                                    type="number"
                                    value={estimatedMaterialCost}
                                    onChange={(e) => setEstimatedMaterialCost(e.target.value)}
                                    className="border-blue-200"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-orange-700 font-bold">Öngörülen İşçilik Maliyeti</Label>
                                <Input
                                    type="number"
                                    value={estimatedLaborCost}
                                    onChange={(e) => setEstimatedLaborCost(e.target.value)}
                                    className="border-orange-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Başlangıç Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "dd.MM.yyyy") : <span>Tarih seçin</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label>Bitiş Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "dd.MM.yyyy") : <span>Tarih seçin</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={setEndDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Proje Ekibi</Label>
                            <div className="border rounded-md p-2 space-y-2 bg-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Personel ara..."
                                        className="pl-8 bg-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Reduced height to 160px to save space */}
                                <ScrollArea className="h-[160px] pr-4">
                                    <div className="space-y-1">
                                        {filteredPersonnel.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                Personel bulunamadı.
                                            </div>
                                        ) : (
                                            filteredPersonnel.map((person) => {
                                                const isSelected = selectedTeam.includes(person.id);
                                                return (
                                                    <div
                                                        key={person.id}
                                                        className={cn(
                                                            "flex items-center space-x-3 p-2 rounded-md hover:bg-slate-200 cursor-pointer transition-colors",
                                                            isSelected ? "bg-white shadow-sm border" : ""
                                                        )}
                                                        onClick={() => toggleSelection(person.id)}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleSelection(person.id)}
                                                        />
                                                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                            <Avatar className="h-7 w-7">
                                                                <AvatarFallback>{getAvatarFallback(person.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col truncate">
                                                                <span className="text-sm font-medium truncate">{person.name}</span>
                                                                <span className="text-xs text-muted-foreground truncate">{person.role || 'Unvansız'}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1 h-5">Seçildi</Badge>}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {selectedTeam.length > 0 && <span className="text-xs text-muted-foreground block w-full mb-1">{selectedTeam.length} kişi seçildi:</span>}
                                {selectedTeam.map(id => {
                                    const p = personnelList.find(pl => pl.id === id);
                                    if (!p) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="text-xs">
                                            {p.name}
                                            <button
                                                className="ml-1 hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(id);
                                                }}
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Açıklama</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Proje hakkında kısa açıklama..."
                                className="min-h-[60px]"
                            />
                        </div>
                    </div>
                </div>



                <DialogFooter className="pt-2 mt-auto border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        İptal
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? "Oluşturuluyor..." : "Onayla ve Oluştur"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
