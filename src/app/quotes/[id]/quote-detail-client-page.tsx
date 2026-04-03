'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    DndContext,
    closestCenter,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Trash2,
    PlusCircle,
    Loader2,
    X,
    FileDown,
    Flame,
    Droplets,
    Wind,
    ShieldCheck,
    Thermometer,
    Wrench,
    Edit,
    RefreshCw,
    Box,
    ChevronDown,
    TrendingUp,
    Check,
    Copy,
    ClipboardList,
    ClipboardCheck,
    ArrowRightLeft,
    View,
    Percent,
    GripVertical,
    Maximize2,
    Minimize2,
    Save,
    Wand2,
    Settings2,
    Layout,
    Trash,
    MoveHorizontal,
    CheckSquare,
    AlertTriangle,
    Search,
    Truck,
    History as HistoryIcon,
    Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { ProposalItem } from '@prisma/client';
import { calculateItemTotals } from '@/lib/pricing';
import { ProductSelector } from '@/components/app/product-selector';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getProposal, updateProposal, updateProposalItems, updateProposalItemCosts, createProposalVersionFromData } from '@/actions/proposals';
import { changeProposalCustomer } from '@/actions/customers';
import { getSuppliers } from '@/actions/suppliers';
import { updateProduct, getLatestProductPrice, createProduct } from '@/actions/products';
import { parseAndMatch, searchForQuickAdd, extractQuantityAndQuery } from '@/actions/matching';
import { ProductLastPurchaseInfo } from '@/components/products/product-last-purchase-info';
import { PurchasingAlert } from '@/components/app/quotes/purchasing-alert';
import { getBulkPurchasingInsights } from '@/actions/quick-insight';
import { ComplementaryItems } from '@/components/app/quotes/complementary-items';
import { RefreshCcw } from 'lucide-react';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';



import { SaveAsTemplateDialog } from '@/components/app/save-as-template-dialog';
import { SmartProposalImporter } from '@/components/app/smart-proposal-importer';
import { ProposalDiffViewer } from '@/components/proposals/proposal-diff-viewer';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getStatusBadge, formatDate } from '@/lib/formatters';
import { 
    formatCurrency, 
    SarrafDisplay, 
    calculateAllTotals,
    proposalSchema,
    proposalItemSchema,
    initialColumnVisibility,
    tableHeaders,
    currencyCycle,
    findLastIndex,
    formatNumber,
    type ProposalFormValues,
    type ColumnVisibility,
    type ColumnKey,
} from '@/components/quotes/quote-utils';
import { ExchangeRateDisplay } from '@/components/quotes/quote-rate-display';
import { SortableItemRow } from '@/components/quotes/quote-sortable-row';
import { ProfitMarginDialog } from '@/components/quotes/profit-margin-dialog';
import { DiscountDialog } from '@/components/quotes/discount-dialog';

const getGroupIcon = (groupName: string) => {
    const lowerCaseName = groupName.toLowerCase();
    if (lowerCaseName.includes('isitma')) return <Flame className="w-5 h-5 text-red-500" />;
    if (lowerCaseName.includes('sihhi')) return <Droplets className="w-5 h-5 text-blue-500" />;
    if (lowerCaseName.includes('soğutma')) return <Thermometer className="w-5 h-5 text-cyan-500" />;
    if (lowerCaseName.includes('havalandirma')) return <Wind className="w-5 h-5 text-green-500" />;
    if (lowerCaseName.includes('yangin')) return <ShieldCheck className="w-5 h-5 text-orange-500" />;
    return <Wrench className="w-5 h-5 text-slate-500" />;
}

// Helper for IDs
const generateId = () => crypto.randomUUID();

// Component for a single item group to avoid hook rule violations
const QuoteItemGroup = ({
    groupName,
    itemsInGroup,
    calculatedTotals,
    handleApplyProfitMarginToGroup,
    handleApplyDiscountToGroup,
    editingGroupName,
    setEditingGroupName,
    handleGroupNameChange,
    handleDeleteGroup,
    groupNameInputRef,
    openProductSelectorForGroup,
    handleAdhocItemAdd,
    form,
    remove,
    handleCopyItem,
    handleUpdateProductFromQuoteItem,
    handleRefreshItemPrice,
    handleRefreshGroupPrices,
    handleSmartQuickAdd,
    recipes,
    allProducts,
    columnVisibility,
    columnWidths,
    watchedItems,
    watchedRates,
    isCheckMode,
    isCompact,
    checkedItems,
    selectedItems,
    setSelectedItems,
    toggleCheckedItem,
    toggleSelectItem,
    purchasingInsights,
    groupDescriptions,
    setGroupDescriptions,
    forceRender
}: any) => {
    const { toast } = useToast();

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `group-${groupName}`,
        data: {
            type: 'group',
            groupName: groupName,
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as any,
    };

    const [quickAddText, setQuickAddText] = useState('');
    const [isSmartAdding, setIsSmartAdding] = useState(false);
    const [quickAddResults, setQuickAddResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (quickAddText.trim().length >= 2) {
                const results = await searchForQuickAdd(quickAddText);
                setQuickAddResults(results);
                setShowResults(results.length > 0);
            } else {
                setQuickAddResults([]);
                setShowResults(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [quickAddText]);

    const onSmartAdd = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && quickAddText.trim()) {
            setIsSmartAdding(true);
            await handleSmartQuickAdd(groupName, quickAddText);
            setQuickAddText('');
            setIsSmartAdding(false);
            setShowResults(false);
        }
        if (e.key === 'Escape') {
            setShowResults(false);
        }
    };

    const handleSelectResult = async (product: any) => {
        setIsSmartAdding(true);
        const { quantity, unit } = await extractQuantityAndQuery(quickAddText);

        const newItem = {
            productId: product.id,
            name: product.name,
            brand: product.brand || 'Diğer',
            model: product.model || '',
            quantity: quantity,
            unit: product.unit || unit,
            listPrice: product.listPrice || 0,
            currency: (product.currency as any) || 'TRY',
            discountRate: product.discountRate || 0,
            profitMargin: 0.20,
            groupName: groupName,
            basePrice: product.basePrice || 0,
            vatRate: product.vatRate || 0.20,
            priceIncludesVat: product.priceIncludesVat || false,
            orderIndex: itemsInGroup.length + 1, // approximate
            proposalId: ""
        };

        handleAdhocItemAdd(groupName, newItem); // Using a modified adhoc or append directly if available
        setQuickAddText('');
        setShowResults(false);
        setIsSmartAdding(false);
        toast({ title: 'Ürün Eklendi', description: `"${product.name}" (${quantity} ${newItem.unit}) eklendi.` });
    };

    const groupTotals = calculatedTotals.groupTotals[groupName];
    const groupSubTotalTRY = groupTotals?.totalSellInTRY || 0;
    const groupCostTRY = groupTotals?.totalCostInTRY || 0;
    const groupProfitTRY = groupSubTotalTRY - groupCostTRY;
    const groupProfitMargin = groupSubTotalTRY > 0 ? (groupProfitTRY / groupSubTotalTRY) : 0;
    const profitInputId = `profit-input-${groupName.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const discountInputId = `discount-input-${groupName.replace(/[^a-zA-Z0-9]/g, '-')}`;

    const totalForChart = groupCostTRY + groupProfitTRY;
    const chartData = totalForChart > 0 ? [{
        name: 'Dağılım',
        maliyet: groupCostTRY,
        kar: groupProfitTRY,
    }] : [];

    return (
        <Collapsible key={groupName} defaultOpen={true} asChild>
            <section ref={setNodeRef} style={style} className={cn("bg-card shadow-sm border transition-all duration-300", isCompact ? "rounded-md" : "rounded-xl", isDragging && "ring-2 ring-primary ring-offset-2")}>
                <div className={cn("flex justify-between items-center w-full group bg-card border-b", isCompact ? "rounded-t-md" : "rounded-t-xl")}>
                    <div className="flex items-center">
                        <div {...attributes} {...listeners} className="px-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                            <GripVertical className="h-4 w-4" />
                        </div>
                        <CollapsibleTrigger className={cn("flex-1 flex items-center cursor-pointer", isCompact ? "px-2 py-1" : "px-4 py-2")}>
                            <div className="flex items-center gap-3">
                                <div className={cn("rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all", isCompact ? "w-6 h-6" : "w-8 h-8")}>
                                    {React.cloneElement(getGroupIcon(groupName) as React.ReactElement, { className: isCompact ? "w-3 h-3" : "w-5 h-5" })}
                                </div>
                                <div>
                                    <div className="flex items-center">
                                        {editingGroupName === groupName ? (
                                            <Input
                                                ref={groupNameInputRef}
                                                defaultValue={groupName}
                                                onBlur={(e) => handleGroupNameChange(groupName, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                    if (e.key === 'Escape') setEditingGroupName(null);
                                                }}
                                                className={cn("font-bold", isCompact ? "h-6 text-sm" : "h-8 text-lg")}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="flex flex-col">
                                                <h2 className={cn("font-bold", isCompact ? "text-sm" : "text-lg")}>{groupName}</h2>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">ARA TOPLAM:</span>
                                                    <SarrafDisplay amount={groupSubTotalTRY} size="sm" className="font-mono font-bold text-slate-600 dark:text-slate-400" />
                                                </div>
                                                {/* Grup Açıklaması */}
                                                <Input
                                                    placeholder="Grup açıklaması ekleyin (opsiyonel)..."
                                                    value={groupDescriptions[groupName] || ''}
                                                    onChange={(e) => setGroupDescriptions({ ...groupDescriptions, [groupName]: e.target.value })}
                                                    className={cn("mt-1 text-xs", isCompact ? "h-6 w-64" : "h-7 w-96")}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown className={cn("text-slate-400 transition-transform duration-300 group-data-[state=open]:-rotate-180", isCompact ? "h-3 w-3" : "h-5 w-5")} />
                            </div>
                        </CollapsibleTrigger>
                    </div>
                    <div className={cn("flex items-center h-full", isCompact ? "gap-2 px-2" : "gap-4 px-4")}>
                        <div className="flex items-center gap-1">
                            <Input
                                id={discountInputId}
                                type="number"
                                placeholder="İsk. %"
                                className={cn("text-[10px]", isCompact ? "h-6 w-16" : "h-8 w-20")}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleApplyDiscountToGroup(groupName, discountInputId);
                                    }
                                }}
                            />
                            {!isCompact && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyDiscountToGroup(groupName, discountInputId);
                                    }}
                                >
                                    Uygula
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 border-l pl-2 ml-1">
                            <Input
                                id={profitInputId}
                                type="number"
                                placeholder="Kâr %"
                                className={cn("text-[10px]", isCompact ? "h-6 w-16" : "h-8 w-20")}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleApplyProfitMarginToGroup(groupName, profitInputId);
                                    }
                                }}
                            />
                            {!isCompact && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-[10px] font-bold text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyProfitMarginToGroup(groupName, profitInputId);
                                    }}
                                >
                                    Uygula
                                </Button>
                            )}
                        </div>
                        {!isCompact && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRefreshGroupPrices(groupName);
                                            }}
                                        >
                                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                                            Fiyatları Tazele
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Bu gruptaki tüm ürünlerin fiyatlarını sistemden günceller</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn("text-slate-400 hover:text-slate-800", isCompact ? "h-6 w-6" : "h-7 w-7")}
                            onClick={(e) => { e.stopPropagation(); setEditingGroupName(groupName); }}
                        >
                            <Edit className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn("text-red-500/70 hover:text-red-500", isCompact ? "h-6 w-6" : "h-7 w-7")}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Trash2 className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Grubu Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu işlem geri alınamaz. "{groupName}" grubundaki tüm kalemler kalıcı olarak silinecektir.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGroup(groupName)} className="bg-destructive hover:bg-destructive/90">
                                        Evet, Grubu Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Badge variant="secondary" className={cn(isCompact && "text-[9px] px-1 h-5")}><Box className={cn("mr-1", isCompact ? "h-2 w-2" : "h-3 w-3")} />{itemsInGroup.length} Kalem</Badge>
                    </div>
                </div>
                <CollapsibleContent>
                    <div>
                        {!isCompact && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 border-y bg-slate-50 dark:bg-white/5">
                                <div>
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Grup Finansal Özeti</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-baseline text-xs">
                                            <span className="opacity-60">Maliyet:</span>
                                            <SarrafDisplay amount={groupCostTRY} size="sm" className="text-slate-500" />
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <span className="opacity-60">Satış (KDV Hariç):</span>
                                            <SarrafDisplay amount={groupSubTotalTRY} size="sm" className="text-slate-700 dark:text-slate-300" />
                                        </div>
                                        <div className="flex justify-between items-baseline pt-1">
                                            <span className="text-[10px] font-bold text-green-600 uppercase">Net Kâr:</span>
                                            <div className="text-right">
                                                <SarrafDisplay amount={groupProfitTRY} size="md" className="text-green-600" />
                                                <span className="block text-[9px] font-black text-green-600/60 mt-0.5">%{(groupProfitMargin * 100).toFixed(1)} MARJ</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <h4 className="font-semibold text-sm mb-2">Maliyet-Kâr Dağılımı</h4>
                                    {totalForChart > 0 ? (
                                        <>
                                            <ChartContainer config={{}} className="h-[24px] w-full">
                                                <ResponsiveContainer>
                                                    <BarChart
                                                        layout="vertical"
                                                        data={chartData}
                                                        stackOffset="expand"
                                                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                                    >
                                                        <XAxis hide type="number" />
                                                        <YAxis hide type="category" dataKey="name" />
                                                        <RechartsTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                                        <Bar dataKey="maliyet" fill="hsl(var(--chart-5))" stackId="a" radius={[4, 0, 0, 4]} />
                                                        <Bar dataKey="kar" fill="hsl(var(--chart-2))" stackId="a" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                            <div className="mt-2 grid grid-cols-2 gap-4 text-center">
                                                <div>
                                                    <p className="text-sm font-semibold">{formatNumber(groupCostTRY)}</p>
                                                    <p className="text-xs text-muted-foreground">Maliyet ({((groupCostTRY / totalForChart) * 100).toFixed(1)}%)</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-green-600">{formatNumber(groupProfitTRY)}</p>
                                                    <p className="text-xs text-muted-foreground">Kâr ({((groupProfitTRY / totalForChart) * 100).toFixed(1)}%)</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-[64px] text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-md">
                                            Hesaplama için ürün ekleyin.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <Table className={cn(isCompact && "border-collapse")}>
                                <TableHeader className={cn("sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 shadow-sm", isCompact && "h-8")}>
                                    <TableRow className={cn(isCompact && "h-8")}>
                                        <TableHead className={cn("px-2", isCompact ? "w-8" : "w-12")}></TableHead>
                                        <TableHead className="w-10 px-2 text-center text-[10px] font-bold uppercase">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const groupFormIds = itemsInGroup.map((item: any) => item.formId);
                                                    const allSelected = groupFormIds.every((id: string) => selectedItems.has(id));

                                                    const newSet = new Set(selectedItems);
                                                    if (allSelected) {
                                                        groupFormIds.forEach((id: string) => newSet.delete(id));
                                                    } else {
                                                        groupFormIds.forEach((id: string) => newSet.add(id));
                                                    }
                                                    setSelectedItems(newSet);
                                                }}
                                                className={cn(
                                                    "rounded border flex items-center justify-center cursor-pointer transition-all duration-200 mx-auto",
                                                    isCompact ? "w-4 h-4" : "w-5 h-5",
                                                    itemsInGroup.length > 0 && itemsInGroup.every((item: any) => selectedItems.has(item.formId))
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                                )}
                                            >
                                                {itemsInGroup.length > 0 && itemsInGroup.every((item: any) => selectedItems.has(item.formId)) && <Check className={cn(isCompact ? "h-2 w-2" : "h-3 w-3", "stroke-[3.5px]")} />}
                                            </div>
                                        </TableHead>
                                        {isCheckMode && <TableHead className="w-10 px-2 text-center text-[10px] font-bold uppercase">OK</TableHead>}
                                        {tableHeaders.map(h => columnVisibility[h.key as ColumnKey] && <TableHead key={h.key} className={cn(columnWidths[h.key as ColumnKey], "text-[10px] uppercase tracking-wider font-bold", isCompact && "py-1 h-8")}>{h.label}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>

                                    {itemsInGroup.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={tableHeaders.length + (isCheckMode ? 3 : 2)} className="h-24 text-center text-muted-foreground">
                                                Bu gruba ürün eklemek için aşağıdaki butonu kullanın.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {itemsInGroup.map((item: any) => {
                                        const index = item.originalIndex;
                                        const currentItem = watchedItems?.[index];
                                        if (!currentItem) return null;

                                        const itemKey = `${currentItem.name}-${index}`;
                                        const isChecked = checkedItems.has(itemKey);
                                        const isSelected = selectedItems.has(item.formId);

                                        const rateValue = (watchedRates as any)[currentItem.currency || 'TRY'] || 1;
                                        const itemTotals = calculateItemTotals({
                                            ...currentItem,
                                            exchangeRate: rateValue,
                                        });

                                        const unitVatAmount = itemTotals.tlSellPrice * currentItem.vatRate;
                                        const unitPriceWithVat = itemTotals.tlSellPrice + unitVatAmount;
                                        const totalVatAmount = itemTotals.totalTlSell * currentItem.vatRate;
                                        const totalPriceWithVat = itemTotals.totalTlSell + totalVatAmount;

                                        return (
                                            <SortableItemRow key={item.formId} id={item.formId} index={index} item={item} isChecked={isChecked} isCompact={isCompact}>
                                                <TableCell className={cn("px-2 text-center", isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSelectItem(item.formId);
                                                        }}
                                                        className={cn(
                                                            "rounded border flex items-center justify-center cursor-pointer transition-all duration-200 mx-auto",
                                                            isCompact ? "w-4 h-4" : "w-5 h-5",
                                                            isSelected
                                                                ? "bg-blue-500 border-blue-500 text-white shadow-sm"
                                                                : "border-slate-300 dark:border-slate-600 hover:border-blue-400"
                                                        )}
                                                    >
                                                        {isSelected && <Check className={cn(isCompact ? "h-2 w-2" : "h-3 w-3", "stroke-[3.5px]")} />}
                                                    </div>
                                                </TableCell>
                                                {isCheckMode && (
                                                    <TableCell className={cn("px-2 text-center", isCompact ? "py-0 h-8" : "py-1")}>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCheckedItem(itemKey);
                                                            }}
                                                            className={cn(
                                                                "rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 mx-auto",
                                                                isCompact ? "w-4 h-4" : "w-6 h-6",
                                                                isChecked
                                                                    ? "bg-green-500 border-green-500 text-white shadow-sm"
                                                                    : "border-slate-300 dark:border-slate-600 hover:border-green-400"
                                                            )}
                                                        >
                                                            {isChecked && <Check className={cn(isCompact ? "h-2 w-2" : "h-4 w-4", "stroke-[3px]")} />}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {columnVisibility.name && <TableCell className={cn(columnWidths.name, isChecked && "opacity-60", isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="flex flex-col gap-0 relative">
                                                        <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                                                            <div className="relative group">
                                                                <Input 
                                                                    {...field} 
                                                                    value={field.value || ''} 
                                                                    className={cn(
                                                                        "bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs truncate",
                                                                        isCompact ? "h-6 py-0" : "h-7", 
                                                                        isChecked && "line-through"
                                                                    )} 
                                                                    title={field.value} // Native tooltip
                                                                />
                                                                {/* Hover tooltip for long names */}
                                                                {field.value && field.value.length > 30 && (
                                                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                                                                        <div className="bg-slate-900 text-white text-xs rounded py-1 px-2 max-w-xs whitespace-normal shadow-lg">
                                                                            {field.value}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )} />
                                                        {!isCompact && (
                                                            <>
                                                                <PurchasingAlert
                                                                    productId={currentItem.productId!}
                                                                    currentCost={itemTotals.cost}
                                                                    currentCurrency={currentItem.currency}
                                                                    insightData={purchasingInsights?.[currentItem.productId!]}
                                                                />
                                                                <ComplementaryItems
                                                                    productId={currentItem.productId!}
                                                                    recipes={recipes}
                                                                    allProducts={allProducts}
                                                                    onAdd={(product) => handleAdhocItemAdd(groupName, product)}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>}
                                                {columnVisibility.brand && <TableCell className={cn(columnWidths.brand, isCompact ? "py-0 h-8" : "py-1")}><FormField control={form.control} name={`items.${index}.brand`} render={({ field }) => <Input {...field} value={field.value || ''} className={cn("bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "h-6 py-0" : "h-7")} />} /></TableCell>}
                                                {columnVisibility.model && <TableCell className={cn(columnWidths.model, isCompact ? "py-0 h-8" : "py-1")}><FormField control={form.control} name={`items.${index}.model`} render={({ field }) => <Input {...field} value={field.value || ''} placeholder="Model..." className={cn("bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "h-6 py-0" : "h-7")} />} /></TableCell>}
                                                {columnVisibility.quantity && <TableCell className={cn(columnWidths.quantity, isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="flex items-center gap-2">
                                                                                                                <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <Input
                                                                    {...field}
                                                                    value={isNaN(field.value as number) ? 0 : field.value ?? 0}
                                                                    type="number"
                                                                    step="any"
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    className={cn("text-right bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "w-14 h-6 py-0" : "w-20 h-7")}
                                                                />
                                                            )}
                                                        />
                                                        <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => <Input {...field} value={field.value || ''} className={cn("h-6 py-0 bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "w-10" : "w-16")} />} />
                                                    </div>
                                                </TableCell>}
                                                {columnVisibility.listPrice && <TableCell className={cn(columnWidths.listPrice, isCompact ? "py-0 h-8" : "py-1")}>
                                                    <ProductLastPurchaseInfo productId={currentItem.productId} disabled={isCompact}>
                                                        <div className="flex items-center justify-start gap-1 font-mono">
                                                            <FormField control={form.control} name={`items.${index}.listPrice`} render={({ field }) => (
                                                                <Input
                                                                    {...field}
                                                                    value={isNaN(field.value as number) ? 0 : field.value ?? 0}
                                                                    type="number"
                                                                    step="any"
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    className={cn("text-right bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "w-20 h-6 py-0" : "w-28 h-7")}
                                                                />
                                                            )} />
                                                            <Controller control={form.control} name={`items.${index}.currency`} render={({ field: { onChange, value } }) => (
                                                                <Badge
                                                                    onClick={() => onChange(currencyCycle[value as keyof typeof currencyCycle])}
                                                                    variant={value === 'USD' ? 'secondary' : value === 'EUR' ? 'default' : 'outline'}
                                                                    className={cn("cursor-pointer font-bold justify-center", isCompact ? "w-8 h-4 text-[9px] px-0" : "w-10", value === 'USD' && "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800", value === 'EUR' && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800")}
                                                                >{value}</Badge>
                                                            )} />
                                                        </div>
                                                    </ProductLastPurchaseInfo>
                                                </TableCell>}
                                                {columnVisibility.discountRate && <TableCell className={cn(columnWidths.discountRate, isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="w-full">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.discountRate`}
                                                            render={({ field }) => (
                                                                <Input
                                                                    type="number"
                                                                    value={isNaN(field.value) ? 0 : Number(((field.value || 0) * 100).toPrecision(12))}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => {
                                                                        const numValue = parseFloat(e.target.value);
                                                                        field.onChange(isNaN(numValue) ? 0 : numValue / 100);
                                                                    }}
                                                                    className={cn("text-right bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs", isCompact ? "w-14 h-6 py-0" : "w-20 h-7")}
                                                                    placeholder="0"
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                </TableCell>}
                                                {columnVisibility.cost && <TableCell className={cn(columnWidths.cost, "text-right", isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="font-mono flex items-center justify-end gap-1 w-full text-xs">
                                                        <span className="flex-1 text-right">{formatNumber(itemTotals.cost)}</span>
                                                        {!isCompact && <span className={cn("font-semibold", currentItem.currency === 'USD' && "text-green-600 dark:text-green-400", currentItem.currency === 'EUR' && "text-blue-600 dark:text-blue-400", currentItem.currency === 'TRY' && "text-slate-500",)}>{currentItem.currency}</span>}
                                                    </div>
                                                </TableCell>}
                                                {columnVisibility.profitMargin && <TableCell className={cn(columnWidths.profitMargin, isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="flex items-center justify-end gap-2 w-full">
                                                        <div className="w-full">
                                                            <FormField
                                                                control={form.control}
                                                                name={`items.${index}.profitMargin`}
                                                                render={({ field }) => (
                                                                    <div className="relative">
                                                                        <Input
                                                                            type="number"
                                                                            value={isNaN(field.value) ? 0 : Number(((field.value || 0) * 100).toPrecision(12))}
                                                                            onFocus={(e) => e.target.select()}
                                                                            onChange={(e) => {
                                                                                const numValue = parseFloat(e.target.value);
                                                                                field.onChange(isNaN(numValue) ? 0 : numValue / 100);
                                                                            }}
                                                                            className={cn(
                                                                                "text-right bg-transparent border-0 border-b-2 border-transparent focus-visible:ring-0 focus:border-primary font-mono text-xs transition-colors",
                                                                                isCompact ? "w-14 h-6 py-0" : "w-20 h-7",
                                                                                (field.value || 0) < 0.10 ? "text-red-600 font-bold" : (field.value || 0) > 0.25 ? "text-green-600 font-bold" : ""
                                                                            )}
                                                                            placeholder="20"
                                                                        />
                                                                        {(field.value || 0) < 0.10 && !isCompact && <AlertTriangle className="absolute -left-4 top-1.5 h-3 w-3 text-red-500 animate-pulse" />}
                                                                    </div>
                                                                )}
                                                            />
                                                        </div>
                                                        <span className="text-slate-300">|</span>
                                                        <span className={cn(
                                                            "text-xs font-mono font-semibold tabular-nums text-right min-w-[60px]",
                                                            itemTotals.totalProfit < 0 ? "text-red-600" : (currentItem.profitMargin || 0) < 0.10 ? "text-orange-600" : "text-green-600"
                                                        )}>
                                                            {`${itemTotals.totalProfit >= 0 ? '+' : ''}${formatNumber(itemTotals.totalProfit)}`}
                                                        </span>
                                                    </div>
                                                </TableCell>}
                                                <TableCell className={cn(columnWidths.unitPrice, "text-right font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-300", isCompact ? "py-0 h-8" : "py-1")}>
                                                    <Tooltip><TooltipTrigger asChild><span>{formatCurrency(itemTotals.tlSellPrice)}</span></TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="space-y-1 font-sans text-sm">
                                                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">KDV Hariç:</span> <span>{formatCurrency(itemTotals.tlSellPrice)}</span></div>
                                                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">KDV (%{(currentItem.vatRate * 100).toFixed(0)}):</span> <span>{formatCurrency(unitVatAmount)}</span></div>
                                                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1"><span >KDV Dahil:</span> <span>{formatCurrency(unitPriceWithVat)}</span></div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                {columnVisibility.total && <TableCell className={cn(columnWidths.total, "text-right font-mono tabular-nums font-bold text-slate-800 dark:text-slate-100", isCompact ? "py-0 h-8" : "py-1")}>
                                                    <Tooltip><TooltipTrigger asChild><span>{formatCurrency(itemTotals.totalTlSell)}</span></TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="space-y-1 font-sans text-sm">
                                                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">KDV Hariç:</span> <span>{formatCurrency(itemTotals.totalTlSell)}</span></div>
                                                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">KDV (%{(currentItem.vatRate * 100).toFixed(0)}):</span> <span>{formatCurrency(totalVatAmount)}</span></div>
                                                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1"><span >KDV Dahil:</span> <span>{formatCurrency(totalPriceWithVat)}</span></div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>}
                                                {columnVisibility.actions && <TableCell className={cn(columnWidths.actions, isCompact ? "py-0 h-8" : "py-1")}>
                                                    <div className="flex items-center justify-end">
                                                        <Tooltip><TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRefreshItemPrice(index)}
                                                                className={cn("text-slate-400 hover:text-orange-500", isCompact ? "h-6 w-6" : "h-7 w-7")}
                                                            >
                                                                <RefreshCcw className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
                                                            </Button>
                                                        </TooltipTrigger><TooltipContent><p>Son satınalma/katalog fiyatıyla güncelle</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleCopyItem(index)} className={cn("text-slate-400 hover:text-blue-500", isCompact ? "h-6 w-6" : "h-7 w-7")}><Copy className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} /></Button></TooltipTrigger><TooltipContent><p>Bu kalemi kopyala</p></TooltipContent></Tooltip>
                                                        {!isCompact && (
                                                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleUpdateProductFromQuoteItem(index)} className="h-7 w-7 text-slate-400 hover:text-green-600"><Save className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Bu fiyatı kataloğa kaydet</p></TooltipContent></Tooltip>
                                                        )}
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => remove(index)} className={cn("text-slate-400 hover:text-red-500", isCompact ? "h-6 w-6" : "h-7 w-7")}><Trash2 className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} /></Button></TooltipTrigger><TooltipContent><p>Bu kalemi sil</p></TooltipContent></Tooltip>
                                                    </div>
                                                </TableCell>}
                                            </SortableItemRow>
                                        );
                                    })}

                                </TableBody>
                            </Table>
                        </div>
                        <div className={cn("bg-slate-50 dark:bg-white/5 border-t dark:border-white/5 rounded-b-xl flex items-center gap-4 transition-all", isCompact ? "px-2 py-1" : "px-4 py-3")}>
                            {/* Akıllı Ekle - Now Primary & Left */}
                            <div className="flex-[2] flex items-center gap-2 relative">
                                <div className="relative w-full">
                                    <Wand2 className={cn("absolute left-3 top-1/2 -translate-y-1/2", isCompact ? "h-3 w-3" : "h-4 w-4", isSmartAdding ? "text-primary animate-spin" : "text-purple-600")} />
                                    <Input
                                        placeholder="Akıllı Ürün Ekle..."
                                        className={cn("pl-9 border-purple-200 bg-white dark:bg-slate-950 focus-visible:ring-purple-500 shadow-sm transition-all hover:border-purple-400", isCompact ? "h-8 text-xs" : "h-10 text-sm")}
                                        value={quickAddText}
                                        onChange={(e) => setQuickAddText(e.target.value)}
                                        onKeyDown={onSmartAdd}
                                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                        disabled={isSmartAdding}
                                    />
                                    {showResults && (
                                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-900 border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 min-w-[450px]">
                                            <div className="text-[9px] font-bold text-purple-600 px-3 py-1.5 border-b bg-purple-50/30 dark:bg-purple-900/10 tracking-widest uppercase flex justify-between items-center">
                                                <span>KATALOG ÖNERİLERİ</span>
                                                <span className="text-[8px] opacity-60 normal-case">{quickAddResults.length} sonuç</span>
                                            </div>
                                            <ScrollArea className="h-[280px]">
                                                <div className="flex flex-col divide-y dark:divide-slate-800">
                                                    {quickAddResults.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer flex items-center justify-between group transition-colors"
                                                            onClick={() => handleSelectResult(product)}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-bold truncate group-hover:text-purple-700 transition-colors">{product.name}</div>
                                                                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5 opacity-80">
                                                                    <span className="font-semibold text-slate-500 uppercase">{product.brand}</span>
                                                                    {product.model && <span className="truncate">• {product.model}</span>}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-mono font-black text-purple-600 ml-3 shrink-0">
                                                                <SarrafDisplay amount={product.listPrice} currency={product.currency} size="sm" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Diğer Butonlar - Now Right */}
                            <div className="flex-1 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className={cn("px-4 font-semibold shadow-sm", isCompact ? "h-8 text-xs" : "h-10")}
                                    onClick={() => openProductSelectorForGroup(groupName)}
                                >
                                    <PlusCircle className={cn("mr-2", isCompact ? "h-3 w-3" : "h-4 w-4")} />
                                    {isCompact ? "Ekle" : "Katalogdan Seç"}
                                </Button>
                                {!isCompact && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-10 px-4 font-semibold shadow-sm"
                                        onClick={() => handleAdhocItemAdd(groupName)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Özel Kalem
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </section>
        </Collapsible>
    )
}

interface QuoteDetailClientPageProps {
    proposal: any;
    initialProducts: any[];
    initialCustomers: any[];
    initialInstallationTypes: any[];
    initialLaborCosts: any[];
    initialRecipes: any[];
    initialSupplierQuotes?: any[];
}

// Main Component
export function QuoteDetailClientPage({
    proposal,
    initialProducts,
    initialCustomers,
    initialInstallationTypes,
    initialLaborCosts,
    initialRecipes,
    initialSupplierQuotes = [],
}: QuoteDetailClientPageProps) {
    const router = useRouter();
    const params = useParams();
    const proposalId = params.id as string;
    const { toast } = useToast();
    const queryClient = useQueryClient(); // React Query client
    const { setImporterOpen, setImporterData, registerConfirmInterceptor, tabs, activeTabId } = useWorkspace();

    const [_, forceRender] = useState(0);
    const triggerRender = () => forceRender(c => c + 1);


    const [subHeaderPortal, setSubHeaderPortal] = useState<HTMLElement | null>(null);
    const [exchangeRatePortal, setExchangeRatePortal] = useState<HTMLElement | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
    const groupNameInputRef = useRef<HTMLInputElement>(null);
    const [emptyGroups, setEmptyGroups] = useState<string[]>([]);
    const [targetGroupForProductAdd, setTargetGroupForProductAdd] = useState<string | undefined>(undefined);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [includeVAT, setIncludeVAT] = useState(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [isSmartImporterOpen, setIsSmartImporterOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [isChangeCustomerDialogOpen, setIsChangeCustomerDialogOpen] = useState(false);
    const [isRFQDialogOpen, setIsRFQDialogOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [rfqSearchTerm, setRfqSearchTerm] = useState('');
    const [newGroupNameForMove, setNewGroupNameForMove] = useState("");
    const [groupOrder, setGroupOrder] = useState<string[]>([]);
    const [groupDescriptions, setGroupDescriptions] = useState<Record<string, string>>({}); // Grup açıklamaları

    const defaultTerms = `Teklif Kapsamı:\n- Yukarıdaki listede belirtilen tüm malzemelerin temini.\n- Tüm malzemelerin montajı ve işçili��i.\n- Test ve devreye alma işlemleri.\n\nÖdeme Koşulları:\n- %50 sipariş avansı, %50 iş bitimi.\n\nNotlar:\n- Fiyatlara KDV dahil değildir.\n- Teklif geçerlilik süresi 15 gündür.`;

    const form = useForm<ProposalFormValues>({
        resolver: zodResolver(proposalSchema),
        defaultValues: {
            projectName: proposal.projectName || '',
            versionNote: proposal.versionNote || '',
            termsAndConditions: proposal.termsAndConditions || defaultTerms,
            items: proposal.items.map((item: any) => ({
                ...item,
                groupName: item.groupName || 'Diğer',
                // Ensure numeric fields are never NaN
                quantity: item.quantity && !isNaN(item.quantity) ? item.quantity : 1,
                unit: item.unit || 'Adet',
                listPrice: item.listPrice && !isNaN(item.listPrice) ? item.listPrice : 0,
                basePrice: item.basePrice && !isNaN(item.basePrice) ? item.basePrice : 0,
                discountRate: item.discountRate && !isNaN(item.discountRate) ? item.discountRate : 0,
                profitMargin: item.profitMargin && !isNaN(item.profitMargin) ? item.profitMargin : 0.20,
                vatRate: item.vatRate && !isNaN(item.vatRate) ? item.vatRate : 0.20,
                currency: item.currency || 'TRY',
                priceIncludesVat: item.priceIncludesVat || false,
                orderIndex: item.orderIndex || 0,
            })) || [],
            exchangeRates: {
                USD: proposal.exchangeRateUSD && !isNaN(proposal.exchangeRateUSD) ? proposal.exchangeRateUSD : 32.50,
                EUR: proposal.exchangeRateEUR && !isNaN(proposal.exchangeRateEUR) ? proposal.exchangeRateEUR : 35.00
            }
        },
    });

    const { fields, append, remove, update, move, insert, replace } = useFieldArray({
        control: form.control,
        name: 'items',
        keyName: 'formId',
    });

    useEffect(() => {
        form.reset({
            projectName: proposal.projectName || '',
            versionNote: proposal.versionNote || '',
            termsAndConditions: proposal.termsAndConditions || defaultTerms,
            items: proposal.items.map((item: any) => ({
                ...item,
                groupName: item.groupName || 'Diğer',
                // Ensure numeric fields are never NaN
                quantity: item.quantity && !isNaN(item.quantity) ? item.quantity : 1,
                unit: item.unit || 'Adet',
                listPrice: item.listPrice && !isNaN(item.listPrice) ? item.listPrice : 0,
                basePrice: item.basePrice && !isNaN(item.basePrice) ? item.basePrice : 0,
                discountRate: item.discountRate && !isNaN(item.discountRate) ? item.discountRate : 0,
                profitMargin: item.profitMargin && !isNaN(item.profitMargin) ? item.profitMargin : 0.20,
                vatRate: item.vatRate && !isNaN(item.vatRate) ? item.vatRate : 0.20,
                currency: item.currency || 'TRY',
                priceIncludesVat: item.priceIncludesVat || false,
                orderIndex: item.orderIndex || 0,
            })) || [],
            exchangeRates: {
                USD: proposal.exchangeRateUSD && !isNaN(proposal.exchangeRateUSD) ? proposal.exchangeRateUSD : 32.50,
                EUR: proposal.exchangeRateEUR && !isNaN(proposal.exchangeRateEUR) ? proposal.exchangeRateEUR : 35.00
            }
        });
    }, [proposal, form, defaultTerms]);

    // Initialize group order from proposal items
    useEffect(() => {
        if (proposal?.items) {
            const initialGroups: string[] = Array.from(new Set(proposal.items.map((i: any) => i.groupName || 'Diğer')));
            setGroupOrder(prev => {
                // Keep existing order for groups already in state, add new ones at the end
                const newOrder = [...prev];
                initialGroups.forEach((g: string) => {
                    if (!newOrder.includes(g)) newOrder.push(g);
                });
                return newOrder;
            });
        }
    }, [proposal?.items]);


    const dndContextId = useId();
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(proposal.customerId);

    const filteredCustomers = useMemo(() => {
        if (!initialCustomers) return [];
        if (!customerSearchTerm) return initialCustomers;
        const searchTerms = customerSearchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(Boolean);
        if (searchTerms.length === 0) return initialCustomers;

        return initialCustomers.filter(c => {
            const customerText = `${c.name} ${c.email || ''} ${c.phone || ''}`.toLocaleLowerCase('tr-TR');
            return searchTerms.every(term => customerText.includes(term));
        });
    }, [initialCustomers, customerSearchTerm]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);


    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(initialColumnVisibility);
    const [isCheckMode, setIsCheckMode] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [purchasingInsights, setPurchasingInsights] = useState<Record<string, any>>({});

    // Load settings from localStorage
    useEffect(() => {
        try {
            const savedCheck = localStorage.getItem(`checked-items-${proposalId}`);
            if (savedCheck) setCheckedItems(new Set(JSON.parse(savedCheck)));

            const savedCompact = localStorage.getItem('quote-compact-view');
            if (savedCompact) setIsCompact(JSON.parse(savedCompact));
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }, [proposalId]);

    const fetchBulkInsights = useCallback(async (items: any[]) => {
        const productIds = items.map(i => i.productId).filter(Boolean) as string[];
        if (productIds.length === 0) return;

        const res = await getBulkPurchasingInsights(productIds);
        if (res.success && res.data) {
            setPurchasingInsights(res.data);
        }
    }, []);

    // Initial fetch of insights
    useEffect(() => {
        if (proposal?.items) {
            fetchBulkInsights(proposal.items);
        }
    }, [proposal?.items, fetchBulkInsights]);

    const [isDiffViewerOpen, setIsDiffViewerOpen] = useState(false);

    // Save compact setting
    useEffect(() => {
        localStorage.setItem('quote-compact-view', JSON.stringify(isCompact));
    }, [isCompact]);

    // Save checked items to localStorage
    useEffect(() => {
        localStorage.setItem(`checked-items-${proposalId}`, JSON.stringify(Array.from(checkedItems)));
    }, [checkedItems, proposalId]);

    const toggleCheckedItem = (itemKey: string) => {
        const newSet = new Set(checkedItems);
        if (newSet.has(itemKey)) {
            newSet.delete(itemKey);
        } else {
            newSet.add(itemKey);
        }
        setCheckedItems(newSet);
    };

    const toggleSelectItem = (formId: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(formId)) {
            newSet.delete(formId);
        } else {
            newSet.add(formId);
        }
        setSelectedItems(newSet);
    };

    const handleBulkAddToCatalog = async () => {
        if (selectedItems.size === 0) return;

        setIsSaving(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Get all fields to map formId to index
            const selectedFormIds = Array.from(selectedItems);

            for (const formId of selectedFormIds) {
                const index = fields.findIndex(f => f.formId === formId);
                if (index === -1) continue;

                const item = form.getValues(`items.${index}`);

                // Mantıksal Kontrol: Eğer productId yoksa veya geçici bir ID ise bu kesinlikle yeni bir üründür.
                let isActuallyNew = !item.productId ||
                    item.productId.startsWith('custom_') ||
                    item.productId.startsWith('labor_') ||
                    item.productId.length < 10;

                // EKSTRA GÜVENLİK: Eğer ID varsa ama veritabanında karşılığı yoksa (Ghost ID), yeni ürün olarak oluştur.
                if (!isActuallyNew && item.productId) {
                    const checkRes = await getLatestProductPrice(item.productId);
                    if (!checkRes.success || !checkRes.data) {
                        isActuallyNew = true; // ID geçersizmiş, yeni ürün oluştur moduna çek.
                    }
                }

                let result;
                if (isActuallyNew) {
                    result = await createProduct({
                        name: item.name,
                        brand: item.brand || 'Diğer',
                        model: item.model || '',
                        category: 'Genel',
                        unit: item.unit || 'Adet',
                        listPrice: Number(item.listPrice),
                        currency: item.currency as any,
                        vatRate: Number(item.vatRate) || 0.20,
                        basePrice: Number(item.basePrice) || Number(item.listPrice),
                        priceIncludesVat: !!item.priceIncludesVat,
                        code: `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                        description: `Tekliften toplu oluşturuldu (${proposal.quoteNumber})`,
                        discountRate: Number(item.discountRate) || 0,
                        installationTypeId: null,
                        supplierId: null,
                        technicalSpecifications: null,
                        brochureUrl: null,
                        stockQuantity: 0,
                        reservedQuantity: 0,
                        minStockLevel: 0,
                        isDeleted: false,
                        deletedAt: null
                    });

                    if (result.success && result.data) {
                        update(index, { ...item, productId: result.data.id });
                        successCount++;
                    } else {
                        failCount++;
                    }
                } else {
                    result = await updateProduct(item.productId!, {
                        listPrice: Number(item.listPrice),
                        currency: item.currency as any,
                        discountRate: Number(item.discountRate),
                        vatRate: Number(item.vatRate),
                        priceIncludesVat: !!item.priceIncludesVat
                    });

                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                }
            }

            toast({
                title: "Toplu İşlem Tamamlandı",
                description: `${successCount} ürün başarıyla kataloğa işlendi.${failCount > 0 ? ` ${failCount} üründe hata oluştu.` : ''}`,
            });

            if (failCount === 0) {
                setSelectedItems(new Set());
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Toplu kayıt sırasında bir sorun oluştu: ${error.message}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplySupplierPrice = (index: number, price: number, currency: string) => {
        const item = watchedItems[index];
        if (!item) return;

        // Maliyeti (basePrice) ve para birimini güncelle
        form.setValue(`items.${index}.basePrice`, price);
        form.setValue(`items.${index}.currency`, currency as any);

        toast({
            title: "Maliyet Güncellendi",
            description: `${item.name} için yeni tedarikçi maliyeti işlendi.`
        });
    };

    const handleMoveSelectedToGroup = (targetGroupName: string) => {
        if (!targetGroupName.trim() || selectedItems.size === 0) return;

        const currentItems = form.getValues('items');
        const updatedItems = currentItems.map((item, idx) => {
            // Need to match based on formId. We can find the formId from the fields array
            const field = fields[idx];
            if (selectedItems.has(field.formId)) {
                return { ...item, groupName: targetGroupName };
            }
            return item;
        });

        replace(updatedItems);
        setSelectedItems(new Set());

        // Ensure new group is visible and in order
        if (!groupOrder.includes(targetGroupName)) {
            setGroupOrder(prev => [...prev, targetGroupName]);
        }
        if (!allGroups.some(([name]) => name === targetGroupName)) {
            setEmptyGroups(prev => [...prev, targetGroupName]);
        }

        toast({
            title: "Öğeler Taşındı",
            description: `${selectedItems.size} öğe "${targetGroupName}" grubuna taşındı.`,
        });
    };

    const columnWidths: Record<ColumnKey, string> = {
        name: 'min-w-[400px]',
        brand: 'w-[120px]',
        model: 'w-[150px]',
        quantity: 'w-[180px]',
        listPrice: 'w-[180px]',
        discountRate: 'w-[100px]',
        cost: 'w-[120px]',
        profitMargin: 'w-[200px]',
        unitPrice: 'w-[180px]',
        total: 'w-[180px]',
        actions: 'w-[150px]',
    };

    const parsedProposalId = !isNaN(Number(proposalId)) ? Number(proposalId) : proposalId;

    const allProducts = initialProducts;
    const installationTypes = initialInstallationTypes;
    const laborCosts = initialLaborCosts;
    const recipes = initialRecipes;




    // Keep groupOrder in sync with items and emptyGroups
    useEffect(() => {
        const currentGroups = Array.from(new Set(fields.map(f => f.groupName || 'Diğer')));
        const combinedGroups = Array.from(new Set([...currentGroups, ...emptyGroups]));

        setGroupOrder(prev => {
            const newOrder = [...prev];
            let changed = false;
            combinedGroups.forEach((g: string) => {
                if (!newOrder.includes(g)) {
                    newOrder.push(g);
                    changed = true;
                }
            });
            return changed ? newOrder : prev;
        });
    }, [fields, emptyGroups]);

    // Handle Unsaved Changes Protection
    useEffect(() => {
        const currentTab = tabs.find(t => t.url.includes(proposalId));
        if (!currentTab) return;

        if (form.formState.isDirty) {
            registerConfirmInterceptor(currentTab.id, () => {
                return window.confirm("Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?");
            });
        } else {
            registerConfirmInterceptor(currentTab.id, null);
        }

        return () => {
            registerConfirmInterceptor(currentTab.id, null);
        };
    }, [form.formState.isDirty, proposalId, tabs, registerConfirmInterceptor]);

    // Use useWatch for better reactivity with useFieldArray and nested fields
    const watchedItems = useWatch({
        control: form.control,
        name: 'items',
    });

    const watchedRates = useWatch({
        control: form.control,
        name: 'exchangeRates',
    });

    const calculatedTotals = useMemo(() => {
        return calculateAllTotals(watchedItems as Partial<ProposalItem>[] || [], watchedRates);
    }, [watchedItems, watchedRates]);

    const allGroups = useMemo(() => {
        const itemGroups = fields.reduce((acc, item, index) => {
            const groupName = item.groupName || 'Diğer';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push({ ...item, originalIndex: index });
            return acc;
        }, {} as Record<string, any[]>);

        emptyGroups.forEach(groupName => {
            if (!itemGroups[groupName]) {
                itemGroups[groupName] = [];
            }
        });

        // Sort groups by groupOrder state
        return Object.entries(itemGroups).sort(([nameA, itemsA], [nameB, itemsB]) => {
            const indexA = groupOrder.indexOf(nameA);
            const indexB = groupOrder.indexOf(nameB);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // Fallback for groups not yet in groupOrder
            const minA = itemsA.length > 0 ? Math.min(...itemsA.map(i => i.originalIndex)) : 1000000;
            const minB = itemsB.length > 0 ? Math.min(...itemsB.map(i => i.originalIndex)) : 1000001;

            if (nameA === 'Diğer' && itemsA.length === 0) return 1;
            if (nameB === 'Diğer' && itemsB.length === 0) return -1;

            return minA - minB;
        });
    }, [fields, emptyGroups, groupOrder]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type;

        if (activeType === 'item') {
            const oldIndex = active.data.current?.originalIndex as number;
            const activeGroup = active.data.current?.groupName as string;

            const overType = over.data.current?.type;
            const overIsItem = overType === 'item';
            const overIsGroup = overType === 'group' || overType === 'group-container';

            if (overIsItem) {
                const newIndex = over.data.current?.originalIndex as number;
                const overGroup = over.data.current?.groupName as string;

                if (activeGroup === overGroup) {
                    move(oldIndex, newIndex);
                } else {
                    const itemData = { ...fields[oldIndex], groupName: overGroup };
                    remove(oldIndex);
                    // Insert at target item's position
                    insert(newIndex, itemData as any);
                }
            } else if (overIsGroup) {
                const targetGroupName = over.data.current?.groupName as string;
                if (activeGroup === targetGroupName) return;

                const itemData = { ...fields[oldIndex], groupName: targetGroupName };
                remove(oldIndex);

                // Find the index of the last item in the target group to append
                const currentItems = form.getValues('items');
                let insertionIndex = -1;
                for (let i = currentItems.length - 1; i >= 0; i--) {
                    if ((currentItems[i].groupName || 'Diğer') === targetGroupName) {
                        insertionIndex = i;
                        break;
                    }
                }

                if (insertionIndex === -1) {
                    // Group is empty, find where it should be based on allGroups order
                    const allGroupNames = allGroups.map(([name]) => name);
                    const targetGroupVisualIndex = allGroupNames.indexOf(targetGroupName);

                    let lastIdx = -1;
                    for (let i = targetGroupVisualIndex - 1; i >= 0; i--) {
                        const prevName = allGroupNames[i];
                        for (let j = currentItems.length - 1; j >= 0; j--) {
                            if ((currentItems[j].groupName || 'Diğer') === prevName) {
                                lastIdx = j;
                                break;
                            }
                        }
                        if (lastIdx !== -1) break;
                    }
                    insertionIndex = lastIdx + 1;
                } else {
                    insertionIndex = insertionIndex + 1;
                }

                // If we removed an item before the insertion index, adjust
                const finalIndex = oldIndex < insertionIndex ? insertionIndex - 1 : insertionIndex;
                insert(finalIndex, itemData as any);
            }
        } else if (activeType === 'group') {
            const activeGroupName = active.data.current?.groupName as string;
            const overGroupName = over.data.current?.groupName as string;

            if (activeGroupName && overGroupName) {
                const currentOrder = [...groupOrder];
                const oldGroupIndex = currentOrder.indexOf(activeGroupName);
                const newGroupIndex = currentOrder.indexOf(overGroupName);

                if (oldGroupIndex !== -1 && newGroupIndex !== -1) {
                    const newGroupOrder = [...currentOrder];
                    const [movedGroupName] = newGroupOrder.splice(oldGroupIndex, 1);
                    newGroupOrder.splice(newGroupIndex, 0, movedGroupName);

                    setGroupOrder(newGroupOrder);

                    // Sync items in the form to match new group order
                    // We use the fields array to preserve formId (keys)
                    const currentFields = [...fields];
                    const reorderedItems: any[] = [];

                    newGroupOrder.forEach(name => {
                        const itemsInThisGroup = currentFields.filter(f => (f.groupName || 'Diğer') === name);
                        reorderedItems.push(...itemsInThisGroup);
                    });

                    if (reorderedItems.length > 0) {
                        replace(reorderedItems);
                    }

                    toast({ title: 'Grup Sıralaması Güncellendi', description: `"${activeGroupName}" grubu yeni konumuna taşındı.` });
                }
            }
        }
    }, [fields, move, insert, remove, allGroups, replace, form, toast, groupOrder]);

    const handleFetchRates = async () => {
        setIsFetchingRates(true);
        toast({ title: 'Kurlar alınıyor...', description: 'TCMB\'den güncel veriler çekiliyor.' });
        try {
            const response = await fetch(`/api/exchange-rates?t=${Date.now()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `API isteği başarısız oldu. Durum: ${response.status}`);
            }
            const rates = await response.json();

            if (rates.USD && rates.EUR) {
                form.setValue('exchangeRates.USD', rates.USD, { shouldDirty: true, shouldValidate: true });
                form.setValue('exchangeRates.EUR', rates.EUR, { shouldDirty: true, shouldValidate: true });
                toast({
                    title: 'Kurlar Güncellendi',
                    description: `TCMB Verisi: USD ${rates.USD}, EUR ${rates.EUR} (${rates.date || 'Bugün'})`
                });
            } else {
                throw new Error("API'den geçerli kur verisi alınamadı.");
            }
        } catch (error: any) {
            console.error("Döviz kuru API hatası:", error);
            toast({ variant: 'destructive', title: 'Hata', description: `Kurlar alınamadı: ${error.message}` });
        } finally {
            setIsFetchingRates(false);
        }
    }


    useEffect(() => {
        const usd = form.getValues('exchangeRates.USD');
        const eur = form.getValues('exchangeRates.EUR');
        if (usd === 32.5 && eur === 35.0) {
            handleFetchRates();
        }
    }, []);

    useEffect(() => {
        setSubHeaderPortal(document.getElementById('sub-header-portal'));
        setExchangeRatePortal(document.getElementById('exchange-rate-portal'));
        try {
            const savedVisibility = localStorage.getItem('quote-column-visibility');
            if (savedVisibility) {
                const parsed = JSON.parse(savedVisibility);
                const validatedVisibility = { ...initialColumnVisibility, ...parsed };
                setColumnVisibility(validatedVisibility);
            }
        } catch (e) {
            console.error("Failed to parse column visibility from localStorage", e);
            setColumnVisibility(initialColumnVisibility);
        }
    }, []);

    const handleColumnVisibilityChange = (key: ColumnKey, value: boolean) => {
        const newVisibility = { ...columnVisibility, [key]: value };
        setColumnVisibility(newVisibility);
        localStorage.setItem('quote-column-visibility', JSON.stringify(newVisibility));
    };



    useEffect(() => {
        if (editingGroupName && groupNameInputRef.current) {
            groupNameInputRef.current.focus();
            groupNameInputRef.current.select();
        }
    }, [editingGroupName]);

    const handleProductsSelected = (selectedProducts: any[]) => {
        if (!recipes || !allProducts || !laborCosts) {
            toast({ variant: "destructive", title: "Veri Eksik", description: "Ürün, reçete veya işçilik verileri henüz yüklenmedi." });
            return;
        }

        const recipesMap = new Map(recipes.map(r => [r.productId, r]));
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const laborCostsMap = new Map(laborCosts.map(l => [l.id, l]));

        const groupForProductAdd = targetGroupForProductAdd;
        const currentItems = [...form.getValues('items')]; // Clone current items

        selectedProducts.forEach(product => {
            if (!product.id) return;
            const recipe = recipesMap.get(product.id);

            if (recipe) {
                const mainProductName = productsMap.get(recipe.productId)?.name || 'Reçete Grubu';
                recipe.recipeItems.forEach((item: any) => {
                    let newItem: any = null;
                    if (item.type === 'material') {
                        const materialProduct = productsMap.get(item.itemId);
                        if (materialProduct) {
                            const netListPrice = materialProduct.priceIncludesVat
                                ? materialProduct.listPrice / (1 + materialProduct.vatRate)
                                : materialProduct.listPrice;

                            newItem = {
                                productId: materialProduct.id,
                                name: materialProduct.name,
                                brand: materialProduct.brand || 'Diğer',
                                model: materialProduct.model || '',
                                quantity: item.quantity,
                                unit: materialProduct.unit || 'Adet',
                                listPrice: netListPrice,
                                currency: materialProduct.currency,
                                discountRate: materialProduct.discountRate || 0,
                                profitMargin: 0.20,
                                groupName: groupForProductAdd || 'Diğer',
                                basePrice: materialProduct.basePrice || 0,
                                vatRate: materialProduct.vatRate,
                                priceIncludesVat: false,
                                orderIndex: currentItems.length,
                                proposalId: parsedProposalId.toString(),
                            };
                        }
                    } else if (item.type === 'labor') {
                        const laborCost = laborCostsMap.get(item.itemId);
                        if (laborCost) {
                            newItem = {
                                productId: `labor_${laborCost.id}`,
                                name: `İşçilik: ${laborCost.role}`,
                                brand: 'Hizmet',
                                model: '',
                                quantity: item.quantity,
                                unit: laborCost.unit || 'Adet',
                                listPrice: laborCost.cost,
                                currency: 'TRY',
                                discountRate: 0,
                                profitMargin: 0,
                                groupName: groupForProductAdd || 'Diğer',
                                basePrice: laborCost.cost,
                                vatRate: 0.20,
                                priceIncludesVat: false,
                                orderIndex: currentItems.length,
                                proposalId: parsedProposalId.toString(),
                            };
                        }
                    }
                    if (newItem) {
                        currentItems.push(newItem);
                    }
                });
            } else {
                const existingItemIndex = currentItems.findIndex(
                    (field) => field.productId === product.id && field.groupName === (groupForProductAdd || 'Diğer')
                );

                if (existingItemIndex !== -1) {
                    const existingItem = currentItems[existingItemIndex];
                    currentItems[existingItemIndex] = {
                        ...existingItem,
                        quantity: Number(existingItem.quantity) + 1,
                    };
                } else {
                    const netListPrice = product.priceIncludesVat
                        ? product.listPrice / (1 + product.vatRate)
                        : product.listPrice;

                    let groupName = groupForProductAdd || 'Diğer';
                    if (!groupForProductAdd && product.installationTypeId) {
                        let current = installationTypes.find(it => it.id === product.installationTypeId);
                        let parent = current;
                        while (parent && parent.parentId) {
                            const nextParent = installationTypes.find(it => it.id === parent!.parentId);
                            if (nextParent) { parent = nextParent; } else { break; }
                        }
                        groupName = parent?.name || 'Diğer';
                    }

                    const newItemToAdd: any = {
                        productId: product.id,
                        name: product.name,
                        brand: product.brand || 'Diğer',
                        model: product.model || '',
                        quantity: 1,
                        unit: product.unit || 'Adet',
                        listPrice: netListPrice,
                        currency: product.currency,
                        discountRate: product.discountRate || 0,
                        profitMargin: 0.20,
                        groupName: groupName,
                        basePrice: product.basePrice || 0,
                        vatRate: product.vatRate,
                        priceIncludesVat: false,
                        orderIndex: currentItems.length,
                        proposalId: parsedProposalId.toString(),
                    };
                    currentItems.push(newItemToAdd);
                }
            }
        });

        replace(currentItems);
        setEmptyGroups(prev => prev.filter(g => g !== groupForProductAdd));
    };

    const handleAddNewGroup = () => {
        const newGroupName = `Yeni Grup ${emptyGroups.length + allGroups.length + 1}`;
        setEmptyGroups(prev => [...prev, newGroupName]);
        setGroupOrder(prev => [...prev, newGroupName]);
        setTimeout(() => {
            setEditingGroupName(newGroupName);
        }, 100);
    };

    const handleGroupNameChange = (oldName: string, newName: string) => {
        if (!newName || oldName === newName) {
            setEditingGroupName(null);
            return;
        }

        const currentItems = form.getValues('items');
        currentItems.forEach((item, index) => {
            if (item.groupName === oldName) {
                update(index, { ...item, groupName: newName });
            }
        });

        setEmptyGroups(prev => prev.map(g => g === oldName ? newName : g).filter(g => g !== oldName || !allGroups.some(([groupName]) => groupName === newName)));
        setGroupOrder(prev => prev.map(g => g === oldName ? newName : g));

        setEditingGroupName(null);
    };

    const handleRefreshItemPrice = async (index: number) => {
        const item = form.getValues(`items.${index}`);
        if (!item.productId) return;

        try {
            const res = await getLatestProductPrice(item.productId);
            if (res.success && res.data) {
                const latest = res.data;
                const netListPrice = latest.priceIncludesVat
                    ? latest.listPrice / (1 + latest.vatRate)
                    : latest.listPrice;

                update(index, {
                    ...item,
                    listPrice: netListPrice || 0,
                    discountRate: latest.discountRate || 0,
                    currency: latest.currency as any
                });

                toast({
                    title: 'Fiyat Güncellendi',
                    description: `"${item.name}" için son sistem fiyatı uygulandı.`,
                });
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: 'Güncel fiyat alınamadı.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Sistemle iletişim kurulamadı.' });
        }
    };

    const handleRefreshGroupPrices = async (groupName: string) => {
        const items = form.getValues('items');
        const groupItems = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.groupName === groupName && item.productId && !item.productId.startsWith('custom_') && !item.productId.startsWith('labor_'));

        if (groupItems.length === 0) {
            toast({ description: `"${groupName}" grubunda güncellenecek ürün bulunamadı.` });
            return;
        }

        if (!confirm(`"${groupName}" grubundaki ${groupItems.length} ürünün fiyatı sistemdeki en güncel verilerle yenilenecek. Onaylıyor musunuz?`)) return;

        setIsSaving(true);
        let updatedCount = 0;
        try {
            for (const { item, index } of groupItems) {
                const res = await getLatestProductPrice(item.productId!);
                if (res.success && res.data) {
                    const latest = res.data;
                    const netListPrice = latest.priceIncludesVat
                        ? latest.listPrice / (1 + latest.vatRate)
                        : latest.listPrice;

                    update(index, {
                        ...item,
                        listPrice: netListPrice || 0,
                        discountRate: latest.discountRate || 0,
                        currency: latest.currency as any
                    });
                    updatedCount++;
                }
            }
            toast({ title: 'Grup Güncellendi', description: `${updatedCount} ürünün fiyatı tazelendi.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Grup güncelleme sırasında hata oluştu.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = (groupName: string) => {
        const indicesToRemove: number[] = [];
        form.getValues('items').forEach((item, index) => {
            if (item.groupName === groupName) {
                indicesToRemove.push(index);
            }
        });

        if (indicesToRemove.length > 0) {
            remove(indicesToRemove.sort((a, b) => b - a));
        }

        setEmptyGroups(prev => prev.filter(g => g !== groupName));
        setGroupOrder(prev => prev.filter(g => g !== groupName));

        toast({
            title: 'Grup Silindi',
            description: `"${groupName}" grubundaki tüm kalemler silindi.`,
        });
    };

    const handleSmartQuickAdd = async (groupName: string, text: string) => {
        if (!text.trim()) return;

        try {
            const result = await parseAndMatch(text, proposal.customerId);

            if (result) {
                const { parsed, match } = result;

                const newItem = {
                    productId: match?.product?.id || `custom_${Date.now()}`,
                    name: match?.product?.name || parsed.productName,
                    brand: match?.product?.brand || 'Manuel Giriş',
                    model: match?.product?.model || '',
                    quantity: parsed.quantity,
                    unit: match?.product?.unit || parsed.unit,
                    listPrice: match?.product?.listPrice || 0,
                    currency: (match?.product?.currency as any) || 'TRY',
                    discountRate: match?.product?.discountRate || 0,
                    profitMargin: 0.20,
                    groupName: groupName,
                    basePrice: match?.product?.basePrice || 0,
                    vatRate: match?.product?.vatRate || 0.20,
                    priceIncludesVat: match?.product?.priceIncludesVat || false,
                    orderIndex: fields.length,
                    proposalId: parsedProposalId.toString(),
                };

                append(newItem as any);
                toast({
                    title: match ? 'Ürün Bulundu ve Eklendi' : 'Özel Kalem Eklendi',
                    description: `"${newItem.name}" (${newItem.quantity} ${newItem.unit}) ${groupName} grubuna eklendi.`,
                });
            }
        } catch (error) {
            console.error("Smart add error:", error);
            toast({ variant: 'destructive', title: 'Hata', description: 'Akıllı ekleme sırasında bir sorun oluştu.' });
        }
    };

    const handleAdhocItemAdd = (groupName: string, customItemData?: any) => {
        const newCustomItem: Omit<ProposalItem, 'id'> = customItemData ? {
            ...customItemData,
            proposalId: parsedProposalId.toString(),
            orderIndex: fields.length
        } : {
            productId: `custom_${Date.now()}`,
            name: 'Yeni Özel Kalem',
            brand: 'Manuel Giriş',
            model: '',
            quantity: 1,
            unit: 'Adet',
            listPrice: 0,
            currency: 'TRY',
            discountRate: 0,
            profitMargin: 0.20,
            groupName: groupName,
            basePrice: 0,
            vatRate: 0.20,
            priceIncludesVat: false,
            orderIndex: fields.length,
            proposalId: parsedProposalId.toString(),
        };
        append(newCustomItem as any, { shouldFocus: !customItemData });
        if (!customItemData) {
            toast({
                title: 'Özel Kalem Eklendi',
                description: `"${groupName}" grubuna yeni bir düzenlenebilir kalem eklendi.`,
            });
        }
    };

    const handleSaveChanges = async (data: ProposalFormValues) => {
        if (!parsedProposalId) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: `Geçersiz Proposal ID`,
            });
            return;
        }

        // VALIDATION: DB vs Calculated total check
        const dbTotal = proposal.totalAmount || 0;
        const calculatedTotal = calculatedTotals.grandTotalSellExVAT || 0;
        const diff = Math.abs(dbTotal - calculatedTotal);
        
        console.log('💰 Validation Check:', {
            dbTotal,
            calculatedTotal,
            diff,
            items: data.items.length,
        });
        
        // Auto-fix: Always use calculated value (it's fresh from form)
        // This ensures DB is always updated with correct calculation
        if (diff > 0.01) {
            console.warn(`⚠️ DB tutarı güncelleniyor: ₺${dbTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} → ₺${calculatedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (Fark: ₺${diff.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})`);
            
            toast({
                title: diff > 100 ? '⚠️ Büyük Fark Düzeltildi' : 'ℹ️ Küçük Fark Düzeltildi',
                description: `Veritabanı: ₺${dbTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} → ₺${calculatedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (₺${diff.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} güncellendi)`,
                variant: diff > 100 ? 'destructive' : 'default',
            });
        }

        setIsSaving(true);
        try {
            const serverProposalData = {
                projectName: data.projectName,
                versionNote: data.versionNote,
                termsAndConditions: data.termsAndConditions || '',
                totalAmount: calculatedTotals.grandTotalSellExVAT, // Use calculated value
                exchangeRateUSD: data.exchangeRates.USD,
                exchangeRateEUR: data.exchangeRates.EUR,
            };

            const serverItemsData = data.items.map((item, index) => {
                // Prisma Client henüz groupDescription'ı tanımıyor, şimdilik atla
                const { groupDescription, ...itemWithoutDesc } = item as any;
                return {
                    productId: item.productId || null,
                    name: item.name,
                    brand: item.brand,
                    model: item.model || '',
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    listPrice: Number(item.listPrice),
                    currency: item.currency,
                    discountRate: Number(item.discountRate),
                    profitMargin: Number(item.profitMargin),
                    groupName: item.groupName || 'Genel',
                    groupDescription: groupDescriptions[item.groupName || 'Genel'] || '', // Grup açıklaması gönder!
                    basePrice: Number(item.basePrice || 0),
                    vatRate: Number(item.vatRate),
                    priceIncludesVat: !!item.priceIncludesVat,
                    orderIndex: index
                };
            });

            // Parallel save
            const [propUpdate, itemsUpdate] = await Promise.all([
                updateProposal(parsedProposalId.toString(), serverProposalData),
                updateProposalItems(parsedProposalId.toString(), serverItemsData as any)
            ]);

            if (!propUpdate.success) throw new Error(propUpdate.error);
            if (!itemsUpdate.success) throw new Error(itemsUpdate.error);

            // Invalidate React Query cache to ensure list page shows fresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
            // queryKeys.proposals only has 'all' currently
            // queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(proposalId) });

            toast({
                title: 'Başarılı!',
                description: 'Teklif ve kalemleri sunucuya başarıyla kaydedildi.',
            });

            router.refresh();
        } catch (error: any) {
            console.error('Error saving proposal:', error);
            toast({
                variant: 'destructive',
                title: 'Kaydetme Hatası',
                description: `Kaydetme sırasında bir hata oluştu: ${error?.message || 'Bilinmeyen hata'}`,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAsNewVersion = async () => {
        // Validation check
        const isValid = await form.trigger();
        if (!isValid) {
            toast({
                variant: 'destructive',
                title: 'Form Hatası',
                description: 'Lütfen zorunlu alanları kontrol edip tekrar deneyin.',
            });
            return;
        }

        setIsSaving(true);
        try {
            const data = form.getValues();

            const result = await createProposalVersionFromData(
                parsedProposalId.toString(),
                {
                    projectName: data.projectName,
                    versionNote: data.versionNote || "Yeni Düzenlenmiş Versiyon",
                    termsAndConditions: data.termsAndConditions || '',
                    items: data.items.map((item, index) => {
                        const { groupDescription, ...itemWithoutDesc } = item as any;
                        return {
                            ...itemWithoutDesc,
                            groupDescription: groupDescriptions[item.groupName || 'Genel'] || '',
                            orderIndex: index
                        };
                    }),
                    exchangeRates: data.exchangeRates,
                }
            );

            if (result.success && result.data) {
                toast({
                    title: 'Yeni Versiyon Oluşturuldu',
                    description: `Teklifin ${result.data.version}. versiyonuna geçiliyor...`,
                });
                // Redirect to the new version
                router.push(`/quotes/${result.data.id}`);
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Error creating new version:', error);
            toast({
                variant: 'destructive',
                title: 'Versiyonlama Hatası',
                description: error.message || 'Yeni versiyon oluşturulurken bir hata oluştu.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const openProductSelectorForGroup = (groupName: string) => {
        setTargetGroupForProductAdd(groupName);
        setIsProductSelectorOpen(true);
    };

    const handleChangeCustomer = async () => {
        if (!selectedCustomerId || selectedCustomerId === proposal.customerId) {
            setIsChangeCustomerDialogOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            const res = await changeProposalCustomer(proposalId, selectedCustomerId);
            if (res.success && res.data) {
                toast({ title: "Müşteri Değiştirildi", description: `Teklif artık ${res.data.customerName} adına kayıtlı.` });
                setIsChangeCustomerDialogOpen(false);
                router.refresh();
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Hata", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        getSuppliers().then(res => {
            if (res.success && res.data) setSuppliers(res.data);
        });
    }, []);

    const filteredSuppliers = useMemo(() => {
        if (!rfqSearchTerm) return suppliers;
        const term = rfqSearchTerm.toLocaleLowerCase('tr-TR');
        return suppliers.filter(s => s.name.toLocaleLowerCase('tr-TR').includes(term));
    }, [suppliers, rfqSearchTerm]);

    const handleCreateRFQ = () => {
        if (selectedItems.size === 0) return;

        // Find selected items' details
        const allCurrentItems = form.getValues('items');
        const selectedDetails = fields
            .filter(f => selectedItems.has(f.formId))
            .map(f => {
                const index = fields.findIndex(item => item.formId === f.formId);
                return allCurrentItems[index];
            });

        // Open RFQ Print Preview or Generate PDF
        // Use BOTH DB IDs and form IDs to support saved and unsaved items
        const selectedIds = fields
            .filter(f => selectedItems.has(f.formId))
            .map(f => {
                const index = fields.findIndex(item => item.formId === f.formId);
                const item = allCurrentItems[index];
                // Use DB ID if available, otherwise use form ID
                return item.id || f.formId;
            })
            .filter(Boolean);

        if (selectedIds.length === 0) {
            toast({ variant: "destructive", title: "İşlem Reddedildi", description: "Kalem seçilmedi." });
            return;
        }

        const supplierParam = selectedSupplierId ? `&supplierId=${selectedSupplierId}` : '';
        const idsParam = selectedIds.join(',');

        console.log(`[RFQ] Creating RFQ with ${selectedIds.length} items: ${idsParam}`);
        toast({ title: "RFQ Oluşturuluyor", description: `Seçilen ${selectedIds.length} kalem için tedarikçi formu hazırlanıyor.` });

        const url = `/quotes/${proposalId}/print?rfq=true&items=${idsParam}${supplierParam}`;
        window.open(url, '_blank');
        setIsRFQDialogOpen(false);
    };

    const handlePrint = () => {
        if (!proposal) return;
        const url = `/quotes/${proposalId}/print?customerId=${proposal.customerId}`;
        window.open(url, '_blank');
    };

    const handleCopyItem = (index: number) => {
        const itemToCopy = form.getValues(`items.${index}`);
        if (itemToCopy) {
            const { id, ...newItemData } = itemToCopy;
            insert(index + 1, {
                ...newItemData,
            });
            toast({
                title: "Kalem Kopyalandı",
                description: `"${itemToCopy.name}" yeni bir satır olarak eklendi.`,
            })
        }
    };

    const handleApplyProfitMarginToGroup = (groupName: string, inputId: string) => {
        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        if (!inputElement) return;

        const percentage = parseFloat(inputElement.value);
        if (isNaN(percentage) || percentage < 0) {
            toast({
                variant: "destructive",
                title: "Geçersiz Değer",
                description: "Lütfen geçerli, negatif olmayan bir kâr marjı yüzdesi girin.",
            });
            return;
        }

        const margin = percentage / 100;
        const currentItems = form.getValues('items');
        let itemsUpdated = 0;

        currentItems.forEach((item, index) => {
            if (item.groupName === groupName) {
                update(index, { ...item, profitMargin: margin });
                itemsUpdated++;
            }
        });

        if (itemsUpdated > 0) {
            toast({
                title: "Kâr Marjı Uygulandı",
                description: `"${groupName}" grubundaki ${itemsUpdated} ürüne %${percentage} kâr marjı uygulandı.`,
            });
            inputElement.value = ''; // Clear input after applying
        }
    };

    const handleApplyDiscountToGroup = (groupName: string, inputId: string) => {
        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        if (!inputElement) return;

        const percentage = parseFloat(inputElement.value);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            toast({
                variant: "destructive",
                title: "Geçersiz Değer",
                description: "Lütfen 0 ile 100 arasında geçerli bir iskonto yüzdesi girin.",
            });
            return;
        }

        const discountRate = percentage / 100;
        const currentItems = form.getValues('items');
        let itemsUpdated = 0;

        currentItems.forEach((item, index) => {
            if (item.groupName === groupName) {
                update(index, { ...item, discountRate: discountRate });
                itemsUpdated++;
            }
        });

        if (itemsUpdated > 0) {
            toast({
                title: "İskonto Uygulandı",
                description: `"${groupName}" grubundaki ${itemsUpdated} ürüne %${percentage} iskonto uygulandı.`,
            });
            inputElement.value = ''; // Clear input after applying
        }
    };

    const handleUpdateProductFromQuoteItem = async (index: number) => {
        const item = form.getValues(`items.${index}`);

        // Mantıksal Kontrol: Eğer productId yoksa veya geçici bir ID ise bu kesinlikle yeni bir üründür.
        let isActuallyNew = !item.productId ||
            item.productId.startsWith('custom_') ||
            item.productId.startsWith('labor_') ||
            item.productId.length < 10;

        try {
            setIsSaving(true);
            let result;

            // EKSTRA GÜVENLİK: Eğer ID varsa ama veritabanında karşılığı yoksa (Ghost ID), yeni ürün olarak oluştur.
            if (!isActuallyNew && item.productId) {
                const checkRes = await getLatestProductPrice(item.productId);
                if (!checkRes.success || !checkRes.data) {
                    isActuallyNew = true; // ID geçersizmiş, yeni ürün oluştur moduna çek.
                }
            }

            if (isActuallyNew) {
                // YENİ ÜRÜN OLUŞTURMA
                result = await createProduct({
                    name: item.name,
                    brand: item.brand || 'Diğer',
                    model: item.model || '',
                    category: 'Genel',
                    unit: item.unit || 'Adet',
                    listPrice: Number(item.listPrice),
                    currency: item.currency as any,
                    vatRate: Number(item.vatRate) || 0.20,
                    basePrice: Number(item.basePrice) || Number(item.listPrice),
                    priceIncludesVat: !!item.priceIncludesVat,
                    code: `QT-${Date.now().toString().slice(-6)}`,
                    description: `Tekliften manuel/otomatik oluşturuldu (${proposal.quoteNumber})`,
                    discountRate: Number(item.discountRate) || 0,
                    installationTypeId: null,
                    supplierId: null,
                    technicalSpecifications: null,
                    brochureUrl: null,
                    stockQuantity: 0,
                    reservedQuantity: 0,
                    minStockLevel: 0,
                    isDeleted: false,
                    deletedAt: null
                });

                if (result.success && result.data) {
                    update(index, { ...item, productId: result.data.id });
                    toast({ title: "Yeni Ürün Kataloğa Eklendi", description: `"${item.name}" artık kalıcı bir ürün kartı oldu.` });
                }
            } else {
                // MEVCUT ÜRÜNÜ GÜNCELLEME
                result = await updateProduct(item.productId!, {
                    listPrice: Number(item.listPrice),
                    currency: item.currency as any,
                    discountRate: Number(item.discountRate),
                    vatRate: Number(item.vatRate),
                    priceIncludesVat: !!item.priceIncludesVat
                });

                if (result.success) {
                    toast({ title: "Katalog Güncellendi", description: `"${item.name}" ürününün fiyat ve KDV bilgileri kataloğa işlendi.` });
                }
            }

            if (result && !result.success) throw new Error(result.error);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Hata", description: `Kataloğa kayıt başarısız: ${err.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkRefreshPrices = async () => {
        const items = form.getValues('items');
        const productItems = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.productId && !item.productId.startsWith('custom_') && !item.productId.startsWith('labor_'));

        if (productItems.length === 0) {
            toast({ description: "Teklifte güncellenecek katalog ��rünü bulunamadı." });
            return;
        }

        setIsSaving(true);
        let updatedCount = 0;
        try {
            for (const { item, index } of productItems) {
                const res = await getLatestProductPrice(item.productId!);
                if (res.success && res.data) {
                    const latest = res.data;
                    const netListPrice = latest.priceIncludesVat
                        ? latest.listPrice / (1 + latest.vatRate)
                        : latest.listPrice;

                    update(index, {
                        ...item,
                        listPrice: netListPrice || 0,
                        discountRate: latest.discountRate || 0,
                        currency: latest.currency as any
                    });
                    updatedCount++;
                }
            }
            toast({ title: 'Teklif Tazelendi', description: `${updatedCount} ürün��n fiyatı katalogdaki güncel verilerle yenilendi.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Toplu güncelleme sırasında hata oluştu.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkUpdateProductsFromQuote = async () => {
        const items = form.getValues('items');
        const productItems = items.filter(i => i.productId && !i.productId.startsWith('custom_') && !i.productId.startsWith('labor_'));

        if (productItems.length === 0) {
            toast({ description: "Kataloğa kaydedilecek ürün bulunamadı." });
            return;
        }

        setIsSaving(true);
        let successCount = 0;
        for (const item of productItems) {
            const res = await updateProduct(item.productId!, {
                listPrice: Number(item.listPrice),
                currency: item.currency as any,
                discountRate: Number(item.discountRate),
                vatRate: Number(item.vatRate),
                priceIncludesVat: !!item.priceIncludesVat
            });
            if (res.success) successCount++;
        }
        setIsSaving(false);
        toast({ title: "Katalog Güncellendi", description: `${successCount} ürünün fiyatı kataloğa aktarıldı.` });
    };

    const isAuxiliaryLoading = !allProducts || !installationTypes || !laborCosts || !recipes;

    if (!proposal) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-medium text-muted-foreground">Yükleniyor...</span>
                    <span className="text-xs text-muted-foreground/60">
                        {isAuxiliaryLoading ? 'Yardımcı veriler (katalog, reçeteler) hazırlanıyor...' : 'Teklif detayları getiriliyor...'}
                    </span>
                </div>
            </div>
        );
    }

    if (isAuxiliaryLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Katalog ve Reçeteler Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <div className="flex flex-col h-full overflow-hidden bg-background">
                {exchangeRatePortal && createPortal(
                    <ExchangeRateDisplay form={form} onRefresh={handleFetchRates} isFetching={isFetchingRates} />,
                    exchangeRatePortal
                )}

                {subHeaderPortal && createPortal(
                    <div className="relative bg-background/95 backdrop-blur-sm px-8 py-3 flex justify-between items-center w-full border-b">
                        <div className="flex-1 min-w-0">
                            <FormField
                                control={form.control}
                                name="projectName"
                                render={({ field }) => (
                                    <div className="flex items-center gap-2 group/title">
                                        <Input
                                            {...field}
                                            className="text-xl font-bold text-foreground border-transparent hover:border-slate-200 focus:border-primary bg-transparent h-auto p-0 transition-all focus-visible:ring-0 w-auto min-w-[300px]"
                                            placeholder="Proje Adı Giriniz..."
                                        />
                                        <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium text-secondary-foreground">{proposal.customerName}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1 text-muted-foreground hover:text-primary"
                                    onClick={() => setIsChangeCustomerDialogOpen(true)}
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                                <span className="mx-2 text-border">|</span>
                                {proposal.quoteNumber} (v{proposal.version})
                            </p>
                        </div>
                        <div className="flex-1 ml-8">
                            <FormField
                                control={form.control}
                                name="versionNote"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value || ''}
                                        placeholder="Bu versiyonla ilgili bir not ekleyin (örn: Isıtma kalemleri revize edildi)"
                                        className="w-full bg-secondary"
                                    />
                                )}
                            />
                        </div>
                    </div>,
                    subHeaderPortal
                )}
                <main className="flex-1 overflow-y-auto px-8 py-4 space-y-6 bg-slate-100/70 dark:bg-slate-900/50 pb-40">
                    <Tabs defaultValue="items" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList className="bg-white/50 backdrop-blur-sm border shadow-sm">
                                <TabsTrigger value="items" className="gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    Teklif Kalemleri
                                </TabsTrigger>
                                <TabsTrigger value="comparison" className="gap-2">
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Tedarik Karşılaştırma
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="items" className="space-y-6 mt-0">
                            {selectedItems.size > 0 && (
                                <div className="sticky top-0 z-40 flex items-center justify-between bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-sm">{selectedItems.size} kalem seçildi</span>
                                        <div className="h-4 w-px bg-white/30" />
                                        <Button
                                            className="bg-green-600 text-white hover:bg-green-700 h-8"
                                            size="sm"
                                            onClick={handleBulkAddToCatalog}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Kataloğa Kaydet
                                        </Button>
                                        <div className="h-4 w-px bg-white/30" />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 bg-white/20 hover:bg-white/30 text-white border-0"
                                            onClick={() => setSelectedItems(new Set())}
                                        >
                                            Seçimi Kaldır
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            className="bg-white text-blue-600 hover:bg-white/90 h-8"
                                            size="sm"
                                            onClick={() => setIsMoveDialogOpen(true)}
                                        >
                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                            Gruba Taşı
                                        </Button>
                                        <Button
                                            className="bg-purple-600 text-white hover:bg-purple-700 h-8"
                                            size="sm"
                                            onClick={() => setIsRFQDialogOpen(true)}
                                        >
                                            <Truck className="mr-2 h-4 w-4" />
                                            Teklif İste (RFQ)
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" className="h-8 bg-red-500 hover:bg-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Sil
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Seçili Öğeleri Sil?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Seçili olan {selectedItems.size} kalemi silmek istediğinize emin misiniz?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={() => {
                                                            const indicesToRemove: number[] = [];
                                                            fields.forEach((field, idx) => {
                                                                if (selectedItems.has(field.formId)) {
                                                                    indicesToRemove.push(idx);
                                                                }
                                                            });
                                                            remove(indicesToRemove.sort((a, b) => b - a));
                                                            setSelectedItems(new Set());
                                                            toast({ title: "Öğeler Silindi", description: `${indicesToRemove.length} kalem kaldırıldı.` });
                                                        }}
                                                    >
                                                        Evet, Sil
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            )}
                            <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant={isCheckMode ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-9 font-semibold transition-all duration-300",
                                            isCheckMode ? "bg-green-600 hover:bg-green-700 text-white shadow-lg scale-105" : "border-green-200 text-green-700 hover:bg-green-50"
                                        )}
                                        onClick={() => setIsCheckMode(!isCheckMode)}
                                    >
                                        <ClipboardCheck className={cn("mr-2 h-4 w-4", isCheckMode && "animate-pulse")} />
                                        {isCheckMode ? "Kontrol Modu Açık" : "Kontrol Modu"}
                                    </Button>
                                    <Button
                                        variant={isCompact ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-9 font-semibold",
                                            isCompact ? "bg-slate-700 hover:bg-slate-800 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                        )}
                                        onClick={() => setIsCompact(!isCompact)}
                                    >
                                        {isCompact ? <Maximize2 className="mr-2 h-4 w-4" /> : <Minimize2 className="mr-2 h-4 w-4" />}
                                        {isCompact ? "Normal Görünüm" : "Kompakt Görünüm"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold"
                                        onClick={handleBulkRefreshPrices}
                                        disabled={isSaving}
                                    >
                                        <RefreshCcw className={cn("mr-2 h-4 w-4", isSaving && "animate-spin")} />
                                        Tüm Teklifi Güncelle
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold"
                                        onClick={() => {
                                            setImporterData({ targetProposalId: proposalId });
                                            setImporterOpen(true);
                                        }}
                                    >
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        Tedarikçi Fiyatı İşle
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9"><View className="mr-2 h-4 w-4" /> Sütunlar</Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Sütunları Göster/Gizle</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleBulkUpdateProductsFromQuote}>
                                                <Save className="mr-2 h-4 w-4" /> Tüm Fiyatları Kataloğa Kaydet
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {tableHeaders.map((header) => (
                                                <DropdownMenuCheckboxItem
                                                    key={header.key}
                                                    checked={columnVisibility[header.key as ColumnKey]}
                                                    onCheckedChange={(checked) => handleColumnVisibilityChange(header.key as ColumnKey, !!checked)}
                                                >
                                                    {header.label}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <TooltipProvider>
                                    <SortableContext
                                        items={[
                                            ...allGroups.map(([name]) => `group-${name}`),
                                            ...fields.map(f => f.formId)
                                        ]}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {allGroups.map(([groupName, itemsInGroup]) => (
                                            <QuoteItemGroup
                                                key={groupName}
                                                groupName={groupName}
                                                itemsInGroup={itemsInGroup}
                                                calculatedTotals={calculatedTotals}
                                                handleApplyProfitMarginToGroup={handleApplyProfitMarginToGroup}
                                                handleApplyDiscountToGroup={handleApplyDiscountToGroup}
                                                editingGroupName={editingGroupName}
                                                setEditingGroupName={setEditingGroupName}
                                                handleGroupNameChange={handleGroupNameChange}
                                                handleDeleteGroup={handleDeleteGroup}
                                                groupNameInputRef={groupNameInputRef}
                                                openProductSelectorForGroup={openProductSelectorForGroup}
                                                handleAdhocItemAdd={handleAdhocItemAdd}
                                                form={form}
                                                remove={remove}
                                                handleCopyItem={handleCopyItem}
                                                handleUpdateProductFromQuoteItem={handleUpdateProductFromQuoteItem}
                                                handleRefreshItemPrice={handleRefreshItemPrice}
                                                handleRefreshGroupPrices={handleRefreshGroupPrices}
                                                handleSmartQuickAdd={handleSmartQuickAdd}
                                                recipes={initialRecipes}
                                                allProducts={initialProducts}
                                                columnVisibility={columnVisibility}
                                                columnWidths={columnWidths}
                                                watchedItems={watchedItems}
                                                watchedRates={watchedRates}
                                                isCheckMode={isCheckMode}
                                                isCompact={isCompact}
                                                checkedItems={checkedItems}
                                                selectedItems={selectedItems}
                                                setSelectedItems={setSelectedItems}
                                                toggleCheckedItem={toggleCheckedItem}
                                                toggleSelectItem={toggleSelectItem}
                                                purchasingInsights={purchasingInsights}
                                                groupDescriptions={groupDescriptions}
                                                setGroupDescriptions={setGroupDescriptions}
                                                forceRender={forceRender}
                                            />
                                        ))}
                                    </SortableContext>
                                </TooltipProvider>
                                <div className="space-y-4">
                                    <Button type="button" variant="outline" className="w-full" onClick={handleAddNewGroup}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Yeni Grup Ekle
                                    </Button>
                                </div>

                                {/* TEKLİF İCMALİ (SUMMARY) */}
                                <div className="bg-card rounded-xl shadow-sm border p-6 space-y-6">
                                    <div className="flex items-center gap-3 border-b pb-4">
                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                            <ClipboardList className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Teklif İcmali (Özet)</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Grup bazlı fiyatlandırma özeti</p>
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Grup Adı</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Kalem Sayısı</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Maliyet (TL)</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-blue-600">Satış (KDV Hariç)</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-green-600">Net Kâr</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allGroups.map(([gName, items]) => {
                                                    const totals = calculatedTotals.groupTotals[gName] || { totalSellInTRY: 0, totalCostInTRY: 0 };
                                                    const profit = totals.totalSellInTRY - totals.totalCostInTRY;
                                                    const margin = totals.totalSellInTRY > 0 ? (profit / totals.totalSellInTRY) * 100 : 0;

                                                    return (
                                                        <TableRow key={gName}>
                                                            <TableCell className="font-bold flex items-center gap-2">
                                                                {getGroupIcon(gName)}
                                                                {gName}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs">{items.length}</TableCell>
                                                            <TableCell className="text-right text-muted-foreground font-mono">
                                                                <SarrafDisplay amount={totals.totalCostInTRY} size="sm" />
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-blue-700 font-mono">
                                                                <SarrafDisplay amount={totals.totalSellInTRY} size="sm" />
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-green-600 font-mono">
                                                                <div className="flex flex-col items-end">
                                                                    <SarrafDisplay amount={profit} size="sm" />
                                                                    <span className="text-[9px] opacity-60 normal-casetracking-tight">%{margin.toFixed(1)} MARJ</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow className="bg-slate-50 dark:bg-white/5 font-black border-t-2">
                                                    <TableCell colSpan={2} className="uppercase tracking-[0.2em] text-[10px]">GENEL TOPLAM</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <SarrafDisplay amount={calculatedTotals.grandTotalCost} size="sm" className="text-slate-500" />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <SarrafDisplay amount={calculatedTotals.grandTotalSellExVAT} size="md" className="text-blue-700" />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        <div className="flex flex-col items-end">
                                                            <SarrafDisplay amount={calculatedTotals.grandTotalProfit} size="md" className="text-green-600" />
                                                            <span className="text-[9px] opacity-60 tracking-tight normal-case">%{(calculatedTotals.grandTotalProfitMargin * 100).toFixed(1)} MARJ</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="bg-card rounded-xl shadow-sm border p-6">
                                    <FormField
                                        control={form.control}
                                        name="termsAndConditions"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-lg">Teklif Koşulları</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        value={field.value || ''}
                                                        placeholder="Teklifin kapsamı, ödeme koşulları ve diğer notlar..."
                                                        className="h-40 text-sm bg-secondary"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </DndContext>
                        </TabsContent>

                        <TabsContent value="comparison" className="mt-0">
                            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-bold">Tedarikçi Fiyat Karşılaştırma Matrisi</h2>
                                        <p className="text-xs text-slate-400">Teklifteki kalemler için farklı tedarikçilerden alınan son fiyatlar.</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2" onClick={() => fetchBulkInsights(watchedItems)}>
                                        <RefreshCw className="h-4 w-4" />
                                        Verileri Yenile
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                            <TableRow>
                                                <TableHead className="w-[300px]">Ürün Adı</TableHead>
                                                <TableHead className="w-[120px] text-right">Mevcut Maliyet</TableHead>
                                                <TableHead className="w-[150px]">Tedarikçi 1 (En Son)</TableHead>
                                                <TableHead className="w-[150px]">Tedarikçi 2</TableHead>
                                                <TableHead className="w-[150px]">Tedarikçi 3</TableHead>
                                                <TableHead className="w-[150px]">En İyi Fiyat</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {watchedItems.map((item: any, idx: number) => {
                                                if (!item.productId || item.productId.startsWith('custom_')) return null;
                                                const insight = purchasingInsights[item.productId];

                                                // Merge global purchase history with specific supplier quotes for this proposal
                                                const marketComparison = insight?.comparison || [];
                                                const projectQuotes = initialSupplierQuotes.flatMap(q =>
                                                    q.items.filter((i: any) => i.productId === item.productId).map((i: any) => ({
                                                        supplierName: `${q.supplierName} (Bu Proje)`,
                                                        price: i.price,
                                                        currency: i.currency,
                                                        isProjectSpecific: true
                                                    }))
                                                );

                                                const allComparisons = [...projectQuotes, ...marketComparison];
                                                const best = [...allComparisons].sort((a, b) => a.price - b.price)[0];

                                                return (
                                                    <TableRow key={`${item.id}-${idx}`}>
                                                        <TableCell className="font-medium">
                                                            <div className="text-sm">{item.name}</div>
                                                            <div className="text-[10px] text-muted-foreground uppercase">{item.brand}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <SarrafDisplay amount={item.basePrice} currency={item.currency} size="sm" />
                                                        </TableCell>
                                                        {[0, 1, 2, 3].map(cIdx => {
                                                            const comp = allComparisons[cIdx];
                                                            if (!comp) return <TableCell key={cIdx} className="text-center text-slate-300">-</TableCell>;

                                                            const isLower = comp.price < item.basePrice;

                                                            return (
                                                                <TableCell key={cIdx} className={cn("text-right group relative", isLower && "bg-green-50/50", (comp as any).isProjectSpecific && "border-l-2 border-l-blue-400")}>
                                                                    <div className="flex flex-col">
                                                                        <SarrafDisplay amount={comp.price} currency={comp.currency} size="sm" className={isLower ? "text-green-600" : ""} />
                                                                        <div className={cn("text-[9px] truncate", (comp as any).isProjectSpecific ? "text-blue-600 font-bold" : "text-muted-foreground")} title={comp.supplierName}>{comp.supplierName}</div>
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => handleApplySupplierPrice(idx, comp.price, comp.currency)}
                                                                    >
                                                                        <Check className="h-3 w-3 text-green-600" />
                                                                    </Button>
                                                                </TableCell>
                                                            );
                                                        })}
                                                        <TableCell className="text-right bg-blue-50/30">
                                                            {best ? (
                                                                <div className="flex flex-col">
                                                                    <SarrafDisplay amount={best.price} currency={best.currency} size="sm" className="text-blue-600" />
                                                                    <div className="text-[9px] text-blue-600/70 font-bold uppercase truncate">{best.supplierName}</div>
                                                                </div>
                                                            ) : "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1500px] px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 print:hidden">
                    <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-4 border-solid border-orange-600 ring-2 ring-orange-500/20 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] px-10 py-5 flex items-center justify-between gap-10">
                        {/* Sol Taraf: Finansal Özet */}
                        <div className="flex items-center gap-12">
                            {!includeVAT ? (
                                <div className="flex flex-col animate-in fade-in zoom-in-95 duration-300">
                                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none mb-2">Teklif Toplamı (KDV Hariç)</span>
                                    <span className="text-blue-700 dark:text-blue-400 font-black tracking-tighter text-4xl">
                                        {formatCurrency(calculatedTotals.grandTotalSellExVAT)}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-10 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1.5">Matrah</span>
                                        <SarrafDisplay amount={calculatedTotals.grandTotalSellExVAT} size="md" className="text-slate-600 dark:text-slate-400 font-bold" />
                                    </div>
                                    <div className="text-xl text-slate-300 font-thin mb-1">+</div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1.5">KDV (%{(calculatedTotals.averageVatRate * 100).toFixed(1)})</span>
                                        <SarrafDisplay amount={calculatedTotals.vatAmount} size="md" className="text-slate-600 dark:text-slate-400 font-bold" />
                                    </div>
                                    <div className="text-xl text-slate-300 font-thin mb-1">=</div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] leading-none mb-2">Genel Toplam</span>
                                        <SarrafDisplay amount={calculatedTotals.grandTotalSellWithVAT} size="xl" className="text-blue-700 dark:text-blue-400 font-black tracking-tighter" />
                                    </div>
                                </div>
                            )}

                            <div className="hidden xl:flex items-center gap-10 border-l-2 border-slate-200/60 dark:border-slate-800 pl-10">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                                        <Percent className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">İskonto</span>
                                    </div>
                                    <SarrafDisplay amount={calculatedTotals.grandTotalDiscount} size="md" className="text-orange-700 font-black" />
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 text-green-600 mb-1">
                                        <TrendingUp className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Net Kâr</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <SarrafDisplay amount={calculatedTotals.grandTotalProfit} size="md" className="text-green-700 font-black" />
                                        <span className="text-xs font-black text-green-600/70">%{(calculatedTotals.grandTotalProfitMargin * 100).toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Orta Taraf: Mod Değiştiriciler */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setIncludeVAT(false)}
                                className={cn(
                                    "text-[10px] font-black px-6 py-2 rounded-xl transition-all uppercase tracking-tight",
                                    !includeVAT
                                        ? "bg-white dark:bg-slate-700 shadow-md text-blue-700 dark:text-blue-400 scale-105"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                )}
                            >
                                KDV Hariç
                            </button>
                            <button
                                type="button"
                                onClick={() => setIncludeVAT(true)}
                                className={cn(
                                    "text-[10px] font-black px-6 py-2 rounded-xl transition-all uppercase tracking-tight",
                                    includeVAT
                                        ? "bg-white dark:bg-slate-700 shadow-md text-blue-700 dark:text-blue-400 scale-105"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                )}
                            >
                                KDV Dahil
                            </button>
                        </div>

                        {/* Sağ Taraf: Aksiyon Butonları */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 border-r-2 border-slate-200 dark:border-slate-800 pr-6">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={handlePrint} className="h-11 w-11 rounded-full text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm transition-all">
                                                <FileDown className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">PDF İndir</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setIsSaveAsTemplateOpen(true)} className="h-11 w-11 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-white shadow-sm transition-all">
                                                <ClipboardList className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Şablon Yap</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setIsDiffViewerOpen(true)} className="h-11 w-11 rounded-full text-slate-500 hover:text-amber-600 hover:bg-white shadow-sm transition-all">
                                                <HistoryIcon className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Versiyonlar</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setIsSmartImporterOpen(true)} 
                                                className="h-11 w-11 rounded-full text-slate-500 hover:text-purple-600 hover:bg-white shadow-sm transition-all"
                                                title="AI ile metin/PDF analiz et ve yeni kalemler ekle"
                                            >
                                                <Wand2 className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Akıllı Ürün Ekle (AI)</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={handleSaveAsNewVersion} disabled={isSaving} className="h-11 w-11 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 shadow-sm transition-all">
                                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Yeni Versiyon</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <Button
                                onClick={form.handleSubmit(handleSaveChanges)}
                                disabled={isSaving}
                                className="h-12 px-8 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95] gap-3"
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-6 w-6 stroke-[3.5px]" />}
                                KAYDET
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <ProductSelector
                isOpen={isProductSelectorOpen}
                onOpenChange={setIsProductSelectorOpen}
                onProductsSelected={handleProductsSelected}
                recipes={recipes || null}
            />
            <AlertDialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Seçili Öğeleri Taşı</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedItems.size} kalemi hangi gruba taşımak istersiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Mevcut Gruplardan Seç</Label>
                            <Select onValueChange={(val) => {
                                handleMoveSelectedToGroup(val);
                                setIsMoveDialogOpen(false);
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Grup seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allGroups.map(([name]) => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Veya Yeni Grup Oluştur</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Yeni Grup Adı</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Grup adı yazın..."
                                    value={newGroupNameForMove}
                                    onChange={(e) => setNewGroupNameForMove(e.target.value)}
                                />
                                <Button
                                    onClick={() => {
                                        if (newGroupNameForMove.trim()) {
                                            handleMoveSelectedToGroup(newGroupNameForMove);
                                            setNewGroupNameForMove("");
                                            setIsMoveDialogOpen(false);
                                        }
                                    }}
                                >
                                    Oluştur ve Taşı
                                </Button>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <SaveAsTemplateDialog
                isOpen={isSaveAsTemplateOpen}
                onOpenChange={setIsSaveAsTemplateOpen}
                quoteItems={watchedItems}
            />
            <ProposalDiffViewer
                isOpen={isDiffViewerOpen}
                onOpenChange={setIsDiffViewerOpen}
                currentProposalId={proposalId}
                rootProposalId={proposal.rootProposalId || proposal.id}
            />
            <SmartProposalImporter 
                customers={initialCustomers} 
                targetProposalId={proposalId}
                externalOpen={isSmartImporterOpen}
                onExternalOpenChange={setIsSmartImporterOpen}
            />
            <AlertDialog open={isChangeCustomerDialogOpen} onOpenChange={setIsChangeCustomerDialogOpen}>
                <AlertDialogContent className="sm:max-w-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Müşteriyi Değiştir</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu teklifin bağlı olduğu müşteriyi değiştirmek üzeresiniz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-search-change">Yeni Müşteri Seçin</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="customer-search-change"
                                    placeholder="Müşteri ara..."
                                    className="pl-8"
                                    value={customerSearchTerm}
                                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="h-48 rounded-md border">
                                <div className="p-2 space-y-1">
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => setSelectedCustomerId(customer.id)}
                                                className={cn(
                                                    "p-2 rounded-md cursor-pointer hover:bg-accent",
                                                    selectedCustomerId === customer.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                                                )}
                                            >
                                                <div className="font-semibold">{customer.name}</div>
                                                <div className="text-xs opacity-70">{customer.email || customer.phone || 'İletişim bilgisi yok'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground">Müşteri bulunamadı.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <Button onClick={handleChangeCustomer} disabled={isSaving || !selectedCustomerId || selectedCustomerId === proposal.customerId}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Müşteriyi Güncelle
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isRFQDialogOpen} onOpenChange={setIsRFQDialogOpen}>
                <AlertDialogContent className="sm:max-w-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tedarikçiden Teklif İste (RFQ)</AlertDialogTitle>
                        <AlertDialogDescription>
                            Seçili olan {selectedItems.size} kalem için bir "Fiyat İsteme Formu" oluşturun. Formda sadece miktar ve marka bilgileri yer alacak, fiyatlar boş bırakılacaktır.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier-search">Tedarikçi Seçin (Opsiyonel)</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="supplier-search"
                                    placeholder="Tedarikçi adı ara..."
                                    className="pl-8"
                                    value={rfqSearchTerm}
                                    onChange={(e) => setRfqSearchTerm(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="h-48 rounded-md border mt-2">
                                <div className="p-2 space-y-1">
                                    {filteredSuppliers.length > 0 ? (
                                        filteredSuppliers.map(supplier => (
                                            <div
                                                key={supplier.id}
                                                onClick={() => setSelectedSupplierId(supplier.id)}
                                                className={cn(
                                                    "p-2 rounded-md cursor-pointer hover:bg-accent",
                                                    selectedSupplierId === supplier.id && "bg-purple-600 text-white hover:bg-purple-700"
                                                )}
                                            >
                                                <div className="font-semibold">{supplier.name}</div>
                                                <div className="text-xs opacity-70">{supplier.email || supplier.phone || 'İletişim bilgisi yok'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground">Tedarikçi bulunamadı.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedSupplierId(null)}>İptal</AlertDialogCancel>
                        <Button onClick={handleCreateRFQ} className="bg-purple-600 hover:bg-purple-700 text-white">
                            <FileDown className="mr-2 h-4 w-4" />
                            RFQ Formu Oluştur
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Form>
    );
}
