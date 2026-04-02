'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, ArrowRight, FileText, Upload, Loader2, Search, User, Check, Plus, Eraser, Pencil, X, Minus, Bot, RefreshCw, TrendingUp, CheckSquare, ClipboardList, Trash } from "lucide-react";
import { GenericProductMatcher } from '@/components/app/generic-product-matcher';
import { Product } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { createProposal, createProposalVersionFromData, getProposal } from '@/actions/proposals';
import { createSupplierQuote } from '@/actions/supplier-quotes';
import { findBestMatches } from '@/actions/products';
import { normalizeProductNamesWithAI, extractTableItemsWithAI, matchProduct } from '@/actions/matching';
import { saveDraftProposal, getDraftProposal, deleteDraftProposal, getAllDrafts, updateDraftMetadata } from '@/actions/draft-proposals';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QuickAddCustomer } from '@/components/app/quick-add-customer';
import { extractTextFromPdf, extractTextFromImage, cleanOCRText } from '@/lib/pdf-parser';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { useCustomers } from '@/hooks/use-customers';

type DraftItem = {
    id: string;
    rawText: string;
    confirmedName?: string; // Approved/Edited technical name
    suggestedStandardName?: string;
    quantity: number;
    unit: string;
    matchedProduct?: Product;
    matchedProposalItem?: {
        name: string;
        quantity: number;
        unit: string;
    };
    parts?: {
        prefix?: string; // Miktar öncesi (varsa)
        highlight?: string; // Miktar ve birim (vurgulanacak kısım)
        suffix?: string; // Miktar sonrası (ürün adı)
    };
};

function SmartTextCell({ rawText, parts, onExtract }: {
    rawText: string;
    parts?: DraftItem['parts'];
    onExtract: (type: 'quantity' | 'unit', value: string) => void;
}) {
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number, text: string } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuPosition) return;

        const handleClickOutside = () => setMenuPosition(null);
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuPosition]);

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        if (ref.current && ref.current.contains(selection.anchorNode)) {
            const text = selection.toString().trim();
            if (text) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setMenuPosition({
                    top: rect.top - 40,
                    left: rect.left + (rect.width / 2),
                    text
                });
            }
        }
    };

    const handleAction = (type: 'quantity' | 'unit') => {
        if (menuPosition) {
            onExtract(type, menuPosition.text);
            setMenuPosition(null);
            window.getSelection()?.removeAllRanges();
        }
    };

    return (
        <div ref={ref} className="relative cursor-text select-text" title="Düzeltmek için metni seçin" onMouseUp={handleMouseUp}>
            {parts ? (
                <span>
                    {parts.prefix}
                    {parts.prefix && parts.highlight && " "}
                    <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">{parts.highlight}</span>
                    {parts.highlight && parts.suffix && " "}
                    {parts.suffix}
                </span>
            ) : rawText}

            {menuPosition && (
                <div
                    className="fixed z-50 flex gap-1 bg-slate-900 text-white p-1 rounded shadow-lg text-xs transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button onClick={(e) => { e.stopPropagation(); handleAction('quantity'); }} className="px-2 py-1 hover:bg-slate-700 rounded font-medium">
                        Miktar
                    </button>
                    <div className="w-px bg-slate-700 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); handleAction('unit'); }} className="px-2 py-1 hover:bg-slate-700 rounded font-medium">
                        Birim
                    </button>
                </div>
            )}
        </div>
    );
}

export function SmartProposalImporter({ 
    customers = [], 
    targetProposalId,
    externalOpen,
    onExternalOpenChange
}: { 
    customers?: any[] 
    targetProposalId?: string // Mevcut teklife ekleme için
    externalOpen?: boolean // External control (quote detail sayfası için)
    onExternalOpenChange?: (open: boolean) => void // External open change handler
}) {
    const { toast } = useToast();
    const router = useRouter();
    const { isImporterOpen: workspaceOpen, setImporterOpen: setWorkspaceOpen, importerData, setImporterData } = useWorkspace();

    // Use external open state if provided, otherwise use workspace state
    const isOpen = externalOpen !== undefined ? externalOpen : workspaceOpen;
    const setIsOpen = onExternalOpenChange ? onExternalOpenChange : setWorkspaceOpen;

    // React Query ile müşterileri çek
    const {
        customers: queryCustomers,
        isLoading: isLoadingCustomers,
        createCustomer: createCustomerMutation,
    } = useCustomers();

    // Fallback: Eğer query boşsa prop'tan al (server-side rendering için)
    const allCustomers = queryCustomers.length > 0 ? queryCustomers : customers;

    const [step, setStep] = useState<'input' | 'match'>('input');
    const [inputText, setInputText] = useState('');
    const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isCustomerOpen, setIsCustomerOpen] = useState(false);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [isStandardizing, setIsStandardizing] = useState(false);
    const [isTableParsing, setIsTableParsing] = useState(false);
    const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const [activeTab, setActiveTab] = useState("text");
    const [isUploading, setIsUploading] = useState(false);
    const [localCustomers, setLocalCustomers] = useState<any[]>(allCustomers);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [hasServerDraft, setHasServerDraft] = useState(false);
    
    // Draft Metadata
    const [draftTitle, setDraftTitle] = useState<string>('');
    const [draftDescription, setDraftDescription] = useState<string>('');
    const [draftTags, setDraftTags] = useState<string[]>([]);
    const [isTagInputOpen, setIsTagInputOpen] = useState(false);
    const [newTag, setNewTag] = useState('');
    
    // Draft Picker
    const [isDraftPickerOpen, setIsDraftPickerOpen] = useState(false);
    const [availableDrafts, setAvailableDrafts] = useState<any[]>([]);
    const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);

    // Refresh customers when query data changes
    useEffect(() => {
        setLocalCustomers(allCustomers);
    }, [allCustomers]);

    // PERSISTENCE: Save/Load state to/from localStorage AND Server (more reliable)
    const STORAGE_KEY = `smart-proposal-importer-${typeof window !== 'undefined' ? window.location.pathname : ''}`;
    
    // Load from server on mount (priority over localStorage)
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // First try server
                const result = await getDraftProposal();
                if (result.success && result.data) {
                    console.log(`✅ Loaded draft from server: ${result.data.id}`);
                    setDraftId(result.data.id);
                    setHasServerDraft(true);
                    
                    // Set metadata
                    setDraftTitle(result.data.title || '');
                    setDraftDescription(result.data.description || '');
                    setDraftTags(result.data.tags ? (typeof result.data.tags === 'string' ? JSON.parse(result.data.tags) : result.data.tags) : []);
                    
                    if (result.data.draftItems && result.data.draftItems.length > 0) {
                        setDraftItems(result.data.draftItems);
                        setInputText(result.data.inputText || '');
                        setStep(result.data.step as 'input' | 'match' || 'input');
                        setSelectedCustomerId(result.data.customerId || null);
                        return;
                    }
                }
                
                // Fallback to localStorage
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.draftItems && parsed.draftItems.length > 0) {
                        console.log(`✅ Restored ${parsed.draftItems.length} items from localStorage`);
                        setDraftItems(parsed.draftItems);
                        setInputText(parsed.inputText || '');
                        setStep(parsed.step as 'input' | 'match' || 'input');
                        setSelectedCustomerId(parsed.selectedCustomerId || null);
                    }
                }
            } catch (error) {
                console.error('Failed to load draft:', error);
            }
        };
        
        loadDraft();
    }, []);

    // Save to server ONLY when user clicks save button (manual save)
    const handleSaveDraft = useCallback(async () => {
        if (draftItems.length === 0 && !inputText) {
            toast({
                title: "Uyarı",
                description: "Kaydedilecek içerik yok.",
                variant: "destructive"
            });
            return;
        }
        
        setIsSavingDraft(true);
        try {
            // Auto-generate title if not set
            const autoTitle = draftTitle || (selectedCustomerId && localCustomers.find(c => c.id === selectedCustomerId)?.name) 
                ? `${localCustomers.find(c => c.id === selectedCustomerId)?.name || 'Müşteri'} - Teklif Taslağı`
                : `Taslak - ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`;
            
            const result = await saveDraftProposal({
                title: draftTitle || autoTitle,
                description: draftDescription,
                customerId: selectedCustomerId,
                customerName: selectedCustomerId ? localCustomers.find(c => c.id === selectedCustomerId)?.name : null,
                tags: draftTags.length > 0 ? draftTags : ['teklif', 'ai-analizi'],
                inputText,
                draftItems,
                step
            });
            
            if (result.success && result.data) {
                setDraftId(result.data.id);
                setHasServerDraft(true);
                if (!draftTitle) setDraftTitle(result.data.title || '');
                toast({
                    title: "✅ Kaydedildi",
                    description: "Taslak sunucuya kaydedildi."
                });
            }
        } catch (error) {
            console.error('Failed to save draft:', error);
            toast({
                title: "Hata",
                description: "Taslak kaydedilemedi.",
                variant: "destructive"
            });
        } finally {
            setIsSavingDraft(false);
        }
    }, [draftItems, inputText, step, selectedCustomerId, draftTitle, draftDescription, draftTags, localCustomers]);

    // Save to localStorage only (fallback, no server)
    useEffect(() => {
        if (draftItems.length > 0 || inputText) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    draftItems,
                    inputText,
                    step,
                    selectedCustomerId,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }
    }, [draftItems, inputText, step, selectedCustomerId]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        try {
            const file = acceptedFiles[0];
            const fileName = file.name.toLowerCase();
            if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
                const { text } = await extractTextFromPdf(file);
                if (text) {
                    setInputText(text);
                    toast({ title: "Başarılı", description: "PDF içeriği metin alanına aktarıldı." });
                    setActiveTab("text");
                } else {
                    toast({ variant: "destructive", title: "Uyarı", description: "PDF'den metin okunamadı." });
                }
            } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/.test(fileName)) {
                const { text } = await extractTextFromImage(file);
                if (text) {
                    setInputText(text);
                    toast({ title: "Başarılı", description: "Resim içeriği metin alanına aktarıldı." });
                    setActiveTab("text");
                } else {
                    toast({ variant: "destructive", title: "Uyarı", description: "Resimden metin okunamadı." });
                }
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const XLSX = await import('xlsx');
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[sheetName];
                            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            const textContent = jsonData.map(row => row.join(' ')).join('\n');
                            resolve(textContent);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });

                if (text) {
                    setInputText(text);
                    toast({ title: "Başarılı", description: "Excel içeriği metin alanına aktarıldı." });
                    setActiveTab("text");
                }
            } else {
                toast({ variant: "destructive", title: "Hata", description: "Sadece PDF, Excel ve Resim dosyaları destekleniyor." });
            }
        } catch (error: any) {
            console.error("PDF Parse Error:", error);
            toast({ variant: "destructive", title: "Hata", description: "Dosya okunamadı." });
        } finally {
            setIsUploading(false);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp']
        }
    });

    const handleCleanText = () => {
        setInputText(prev => cleanOCRText(prev));
        toast({ title: "Metin Temizlendi", description: "Olası OCR hataları (l->1, O->0) düzeltildi." });
    };

    const handleAiTableAnalyze = async () => {
        if (!inputText.trim()) return;
        setIsTableParsing(true);
        try {
            let keys: any = {};
            if (typeof window !== 'undefined') {
                keys = {
                    gemini: localStorage.getItem('GEMINI_API_KEY'),
                    qwen: localStorage.getItem('QWEN_API_KEY'),
                    kimi: localStorage.getItem('KIMI_API_KEY'),
                    glm: localStorage.getItem('GLM_API_KEY'),
                    deepseek: localStorage.getItem('DEEPSEEK_API_KEY'),
                };
            }

            // Context extraction for targeted matching
            let context = undefined;
            if (importerData?.targetProposalId) {
                const proposalRes = await getProposal(importerData.targetProposalId);
                if (proposalRes.success && proposalRes.data) {
                    context = {
                        proposalItems: proposalRes.data.items.map((i: any) => ({
                            id: i.id,
                            name: i.name,
                            brand: i.brand || '',
                            productId: i.productId || '',
                            quantity: i.quantity, // ADDED: Quantity
                            unit: i.unit || 'Adet' // ADDED: Unit
                        }))
                    };
                }
            }

            const result = await extractTableItemsWithAI(inputText, keys, context);

            if (result.success && result.data) {
                const proposalItems = context?.proposalItems || [];

                const items: DraftItem[] = await Promise.all(result.data.map(async (item: any, index: number) => {
                    let matchedProduct = undefined;
                    let matchedProposalItem = undefined;

                    // Priority 1: Match with current proposal items (Targeted)
                    if (item.matchIndex && proposalItems.length > 0) {
                        const targetIdx = parseInt(item.matchIndex) - 1;
                        const proposalItem = proposalItems[targetIdx];
                        if (proposalItem && proposalItem.productId) {
                            matchedProduct = {
                                id: proposalItem.productId,
                                name: proposalItem.name,
                                brand: proposalItem.brand || '',
                                unit: item.unit || 'Adet'
                            } as any;

                            // Capture proposal info for UI verification
                            matchedProposalItem = {
                                name: proposalItem.name,
                                quantity: proposalItem.quantity,
                                unit: proposalItem.unit || 'Adet'
                            };
                        }
                    }

                    // Priority 2: Full Catalog Search (Using existing Match Engine)
                    if (!matchedProduct) {
                        const matchRes = await matchProduct(item.name);
                        if (matchRes?.product) {
                            matchedProduct = matchRes.product;
                        }
                    }

                    return {
                        id: `ai-table-${index}`,
                        rawText: item.name,
                        quantity: item.quantity || 1,
                        unit: item.unit || 'Adet',
                        confirmedName: item.name,
                        matchedProduct: matchedProduct,
                        matchedProposalItem: matchedProposalItem,
                        parts: { prefix: item.name, highlight: '', suffix: '' }
                    };
                }));

                setDraftItems(items);
                setStep('match');
                toast({ title: "Zeki Analiz Tamam", description: `${items.length} kalem ayrıştırıldı ve katalogla senkronize edildi.` });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "AI Analiz Hatası", description: error.message });
        } finally {
            setIsTableParsing(false);
        }
    };

    // Basit Metin Analizi (Regex ile miktar ayıklama)
    const handleRegexAnalyze = () => {
        if (!inputText.trim()) return;

        const lines = inputText.split(/\n+/).filter(line => line.trim().length > 0);

        // Bilinen birimler (Regex için)
        const knownUnits = [
            'ad', 'adet', 'tane', 'parça', 'pcs',
            'm', 'mt', 'metre', 'tul', 'tül',
            'km', // mm ve cm bilerek çıkarıldı, genelde ölçü belirtirler
            'kg', 'gr', 'gram', 'ton',
            'lt', 'litre', 'ml',
            'm2', 'm3',
            'boy', 'top', 'kangal', 'rulo', 'makara',
            'paket', 'koli', 'çuval', 'torba', 'kutu', 'teneke', 'bidon', 'varil', 'galon',
            'set', 'tk', 'takım', 'çift', 'palet', 'plaka', 'levha'
        ];
        knownUnits.sort((a, b) => b.length - a.length);
        const unitRegexStr = knownUnits.join('|');

        const items: DraftItem[] = lines.map((line, index) => {
            const cleanLine = line.trim();

            const endPattern = new RegExp(`^(.*)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${unitRegexStr})?$`, 'i');
            const endMatch = cleanLine.match(endPattern);

            if (endMatch) {
                const text = endMatch[1].trim();
                const qty = parseFloat(endMatch[2].replace(',', '.'));
                const unit = endMatch[3];

                if (unit) {
                    return {
                        id: `draft-${index}`,
                        rawText: text,
                        quantity: qty,
                        unit: unit,
                        parts: {
                            prefix: endMatch[1],
                            highlight: `${endMatch[2]} ${endMatch[3] || ''}`,
                            suffix: ''
                        }
                    };
                }
            }

            const startPattern = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitRegexStr})?\\s+(.*)$`, 'i');
            const startMatch = cleanLine.match(startPattern);

            if (startMatch) {
                const qty = parseFloat(startMatch[1].replace(',', '.'));
                const unit = startMatch[2] || 'Adet';
                const text = startMatch[3].trim();

                if (startMatch[2]) {
                    return {
                        id: `draft-${index}`,
                        rawText: text,
                        quantity: qty,
                        unit: unit,
                        parts: {
                            prefix: '',
                            highlight: `${startMatch[1]} ${startMatch[2] || ''}`,
                            suffix: startMatch[3]
                        }
                    };
                }
                const isDimension = /^[*xX\-\/]/.test(text) || /^(lik|lık|luk|lük|mm|cm|dn|ø)/i.test(text);

                if (!isDimension) {
                    return {
                        id: `draft-${index}`,
                        rawText: text,
                        quantity: qty,
                        unit: unit,
                        parts: {
                            prefix: '',
                            highlight: `${startMatch[1]} ${startMatch[2] || ''}`,
                            suffix: startMatch[3]
                        }
                    };
                }
            }

            return {
                id: `draft-${index}`,
                rawText: cleanLine,
                quantity: 1,
                unit: 'Adet',
                parts: {
                    prefix: cleanLine,
                    highlight: '',
                    suffix: ''
                }
            };
        });

        setDraftItems(items);
        setStep('match');
    };

    const handleAutoMatch = async () => {
        const unmatchedItems = draftItems.filter(item => !item.matchedProduct);
        if (unmatchedItems.length === 0) {
            toast({ description: "Eşleşmemiş ürün bulunmuyor." });
            return;
        }

        setIsAutoMatching(true);
        try {
            const queries = unmatchedItems.map(i => i.confirmedName || i.rawText);
            const result = await findBestMatches(queries);

            if (result.success && result.data) {
                const matches = result.data;
                setDraftItems(prev => {
                    const next = [...prev];
                    matches.forEach((m: any) => {
                        // Find the original item using the index from the unmatched list
                        const originalItem = unmatchedItems[m.index];
                        if (originalItem) {
                            const targetIdx = next.findIndex(i => i.id === originalItem.id);
                            if (targetIdx !== -1) {
                                next[targetIdx] = {
                                    ...next[targetIdx],
                                    matchedProduct: m.product,
                                    unit: m.product.unit // Update unit from product
                                };
                            }
                        }
                    });
                    return next;
                });
                toast({ title: "İşlem Tamamlandı", description: `${matches.length} ürün otomatik eşleştirildi.` });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Otomatik eşleştirme başarısız." });
        } finally {
            setIsAutoMatching(false);
        }
    };

    const handleAiStandardize = async () => {
        if (draftItems.length === 0) return;
        setIsStandardizing(true);
        try {
            let keys: any = {};
            let geminiModel = undefined;

            if (typeof window !== 'undefined') {
                keys = {
                    gemini: localStorage.getItem('GEMINI_API_KEY'),
                    qwen: localStorage.getItem('QWEN_API_KEY'),
                    kimi: localStorage.getItem('KIMI_API_KEY'),
                    glm: localStorage.getItem('GLM_API_KEY'),
                    deepseek: localStorage.getItem('DEEPSEEK_API_KEY'),
                };
                geminiModel = localStorage.getItem('GEMINI_MODEL');
            }

            const names = draftItems.map(i => i.rawText);
            console.log(`[AI Request] Sending ${names.length} items to server using multi-provider strategy...`);

            const result = await normalizeProductNamesWithAI(names, keys, { geminiModel: geminiModel || undefined });

            if (result.success && result.data) {
                const results = result.data;
                setDraftItems(prev => prev.map((item, idx) => {
                    const match = results[idx];
                    // Don't auto-apply, just store the suggestion
                    return match ? { ...item, suggestedStandardName: match.suggested } : item;
                }));
                toast({ title: "Analiz Tamamlandı", description: "Yapay zeka önerilerini tablodaki mor alanlardan inceleyebilirsiniz." });
            } else {
                throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
            }
        } catch (error: any) {
            console.error("AI Standardize Error:", error);
            toast({ variant: "destructive", title: "AI Hatası", description: error.message || "Terminoloji saptanamadı." });
        } finally {
            setIsStandardizing(false);
        }
    };

    const applySuggestion = (itemId: string) => {
        setDraftItems(prev => prev.map(item => {
            if (item.id === itemId && item.suggestedStandardName) {
                return {
                    ...item,
                    confirmedName: item.suggestedStandardName,
                    suggestedStandardName: undefined
                };
            }
            return item;
        }));
    };

    const applyAllSuggestions = () => {
        setDraftItems(prev => prev.map(item => {
            if (item.suggestedStandardName) {
                return {
                    ...item,
                    confirmedName: item.suggestedStandardName,
                    suggestedStandardName: undefined
                };
            }
            return item;
        }));
        toast({ title: "Başarılı", description: "Tüm öneriler uygulandı." });
    };

    const dismissSuggestion = (itemId: string) => {
        setDraftItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, suggestedStandardName: undefined };
            }
            return item;
        }));
    };

    const startEditingSuggestion = (itemId: string, value: string) => {
        setEditingSuggestionId(itemId);
        setEditingValue(value);
    };

    const saveEditedSuggestion = (itemId: string) => {
        setDraftItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, suggestedStandardName: editingValue };
            }
            return item;
        }));
        setEditingSuggestionId(null);
    };

    const handleMatch = (itemId: string, product: Product) => {
        setDraftItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, matchedProduct: product, unit: product.unit || 'Adet' } : item
        ));
    };

    const handleUpdateCosts = async () => {
        // ... (existing code)
    };

    const handleSaveSupplierQuote = async () => {
        const targetProposalId = importerData?.targetProposalId;
        if (!targetProposalId) return;

        const validItems = draftItems.filter(i => i.matchedProduct);
        if (validItems.length === 0) {
            toast({ variant: "destructive", title: "Ürün Yok", description: "En az bir ürünü eşleştirmeniz gerekiyor." });
            return;
        }

        // Ask for supplier name if not selected (using first item's rawText or dummy if none)
        const supplierName = prompt("Tedarikçi Adı Girin:", "Tedarikçi") || "Bilinmeyen Tedarikçi";

        setIsCreating(true);
        try {
            const items = validItems.map(item => ({
                productId: item.matchedProduct!.id,
                name: item.matchedProduct!.name,
                price: item.matchedProduct!.basePrice > 0 ? item.matchedProduct!.basePrice : item.matchedProduct!.listPrice * (1 - (item.matchedProduct!.discountRate || 0)),
                currency: item.matchedProduct!.currency
            }));

            const result = await createSupplierQuote({
                supplierName,
                proposalId: targetProposalId,
                items
            });

            if (result.success) {
                toast({ title: "Başarılı", description: "Fiyatlar karşılaştırma matrisine eklendi." });
                setIsOpen(false);
                reset();
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: error.message });
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateProposal = async () => {
        if (!selectedCustomerId && !targetProposalId) {
            toast({ variant: "destructive", title: "Eksik Bilgi", description: "Lütfen bir müşteri seçin." });
            return;
        }

        const validItems = draftItems.filter(i => i.matchedProduct);
        if (validItems.length === 0) {
            toast({ variant: "destructive", title: "Ürün Yok", description: "En az bir ürünü eşleştirmeniz gerekiyor." });
            return;
        }
        
        setIsCreating(true);
        try {
            // MEVCUT TEKLİFTEN YENİ VERSİYON OLUŞTURMA
            if (targetProposalId) {
                const result = await createProposalVersionFromData(
                    targetProposalId,
                    {
                        projectName: 'Hızlı Teklif', // Veya bir input alanından alınabilir
                        versionNote: "Akıllı sihirbaz ile oluşturuldu",
                        termsAndConditions: '', // Varsayılan veya orijinalden alınabilir
                        items: validItems.map((item, index) => ({
                            productId: item.matchedProduct!.id,
                            name: item.matchedProduct!.name,
                            brand: item.matchedProduct!.brand || '',
                            model: item.matchedProduct!.model || '',
                            quantity: item.quantity,
                            unit: item.unit || 'Adet',
                            listPrice: item.matchedProduct!.listPrice,
                            currency: item.matchedProduct!.currency as any,
                            discountRate: item.matchedProduct!.discountRate || 0,
                            profitMargin: 0.20, // Varsayılan
                            basePrice: item.matchedProduct!.basePrice,
                            vatRate: item.matchedProduct!.vatRate,
                            priceIncludesVat: item.matchedProduct!.priceIncludesVat,
                            orderIndex: index,
                            groupName: 'Genel',
                            groupDescription: null,
                        })),
                        exchangeRates: { USD: 32.5, EUR: 35.0 } // Kur bilgisi dinamik olarak alınmalı
                    }
                );

                if (result.success && result.data) {
                    toast({
                        title: "✅ Yeni Versiyon Oluşturuldu!",
                        description: `Sihirbazdaki kalemlerle yeni bir teklif versiyonu (v${result.data.version}) oluşturuldu.`
                    });
                    setIsOpen(false);
                    reset();
                    router.push(`/quotes/${result.data.id}`);
                } else {
                    throw new Error(result.error);
                }
            }
            // YENİ TEKLİF OLUŞTURMA (SIFIRDAN)
            else {
                const selectedCustomer = localCustomers.find(c => c.id === selectedCustomerId);
                const customerName = selectedCustomer?.name || 'Bilinmeyen Müşteri';

                const result = await createProposal({
                    customerId: selectedCustomerId!,
                    customerName: customerName,
                    projectName: 'Hızlı Teklif',
                    quoteNumber: `QT-${Date.now().toString().slice(-6)}`,
                    items: validItems.map((item, index) => ({
                        productId: item.matchedProduct!.id,
                        name: item.matchedProduct!.name,
                        brand: item.matchedProduct!.brand || '',
                        model: item.matchedProduct!.model || '',
                        quantity: item.quantity,
                        unit: item.unit,
                        listPrice: item.matchedProduct!.listPrice,
                        currency: item.matchedProduct!.currency as any,
                        discountRate: item.matchedProduct!.discountRate || 0,
                        profitMargin: 0.20,
                        basePrice: item.matchedProduct!.basePrice,
                        vatRate: item.matchedProduct!.vatRate,
                        priceIncludesVat: item.matchedProduct!.priceIncludesVat,
                        orderIndex: index,
                        groupName: 'Genel',
                        groupDescription: null,
                        isDeleted: false,
                        deletedAt: null
                    }))
                });

                if (result.success && result.data) {
                    toast({ title: "Harika!", description: "Teklif taslağı oluşturuldu." });
                    setIsOpen(false);
                    reset();
                    router.push(`/quotes/${result.data.id}`);
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: error.message });
        } finally {
            setIsCreating(false);
        }
    };

    const reset = () => {
        setStep('input');
        setInputText('');
        setDraftItems([]);
        setSelectedCustomerId(null);
        setCustomerSearchTerm('');
        setActiveTab('text');
        setImporterData(null); // Clear persistence
        setDraftId(null);
        setHasServerDraft(false);
    };

    const filteredCustomers = localCustomers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );

    const selectedCustomer = localCustomers.find(c => c.id === selectedCustomerId);

    return (
        <>
            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open);
                }}
                modal={false}
            >
                {/* Conditionally render trigger to avoid multiple buttons if mounted globally */}
                {!importerData && (
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-dashed relative">
                            <Wand2 className="h-4 w-4 text-purple-500" />
                            Akıllı Teklif Oluştur
                        </Button>
                    </DialogTrigger>
                )}
                <DialogContent
                    className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-slate-200 pointer-events-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <div className="border-b pb-4 mb-2">
                            {/* Top Row: Title + Actions */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                            {targetProposalId ? (
                                                <>
                                                    <Plus className="h-5 w-5 text-green-600" />
                                                    Mevcut Teklife Kalemler Ekle
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="h-5 w-5 text-purple-600" />
                                                    Akıllı Teklif Sihirbazı
                                                </>
                                            )}
                                        </DialogTitle>
                                    </div>
                                    <DialogDescription className="text-sm">
                                        {targetProposalId
                                            ? "WhatsApp mesajlarını veya listeleri yapıştırın, yeni kalemleri mevcut teklife ekleyin."
                                            : "WhatsApp mesajlarını veya listeleri yapıştırın, ürünleri eşleştirin ve saniyeler içinde teklif oluşturun."
                                        }
                                    </DialogDescription>
                                </div>
                                
                                {/* Right Side Actions */}
                                <div className="flex items-center gap-2">
                                    {draftItems.length > 0 && (
                                        <>
                                            {/* Save Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSaveDraft}
                                                disabled={isSavingDraft}
                                                className={cn(
                                                    "border-green-200 hover:bg-green-50",
                                                    hasServerDraft ? "text-green-600" : "text-green-700"
                                                )}
                                                title="Taslağı sunucuya kaydet"
                                            >
                                                {isSavingDraft ? (
                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-1" />
                                                )}
                                                Kaydet
                                            </Button>
                                            
                                            {/* Draft Picker Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    console.log('🔍 Opening draft picker...');
                                                    const result = await getAllDrafts();
                                                    console.log('📂 Drafts result:', result);
                                                    if (result.success) {
                                                        setAvailableDrafts(result.data || []);
                                                        console.log(`✅ Found ${result.data?.length || 0} drafts`);
                                                        setIsDraftPickerOpen(true);
                                                    } else {
                                                        console.error('❌ Failed to load drafts:', result.error);
                                                        toast({
                                                            title: "Hata",
                                                            description: result.error || "Taslaklar yüklenemedi",
                                                            variant: "destructive"
                                                        });
                                                    }
                                                }}
                                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                title="Taslak Seç"
                                            >
                                                <ClipboardList className="h-4 w-4 mr-1" />
                                                Taslaklar
                                                {availableDrafts.length > 0 && (
                                                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                                                        {availableDrafts.length}
                                                    </Badge>
                                                )}
                                            </Button>
                                            
                                            {/* Metadata Editor Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsMetadataEditorOpen(true)}
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                title="Başlık ve Etiketler"
                                            >
                                                <Pencil className="h-4 w-4 mr-1" />
                                                Düzenle
                                            </Button>
                                        </>
                                    )}
                                    
                                    {/* Save Status - Only show when saving */}
                                    {isSavingDraft && (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Kaydediliyor...
                                        </Badge>
                                    )}
                                    
                                    {/* Minimize */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsOpen(false)}
                                        className="text-slate-500 hover:bg-slate-100"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Bottom Row: Customer + Tags */}
                            {draftItems.length > 0 && (
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Müşteri:</span>
                                        {selectedCustomerId ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {localCustomers.find(c => c.id === selectedCustomerId)?.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground italic">Seçilmedi</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-muted-foreground">Etiketler:</span>
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {draftTags.length > 0 ? (
                                                draftTags.slice(0, 5).map((tag, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="secondary"
                                                        className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground italic">Yok</span>
                                            )}
                                            {draftTags.length > 5 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{draftTags.length - 5}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col py-4">
                        {step === 'input' ? (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <TabsList>
                                    <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Metin / WhatsApp</TabsTrigger>
                                    <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> Dosya Yükle (PDF/Excel)</TabsTrigger>
                                </TabsList>
                                <TabsContent value="text" className="flex-1 mt-4">
                                    <Textarea
                                        placeholder="Örn:&#10;5 adet 24kw kombi&#10;100 metre pex boru&#10;20 tane radyatör vanası..."
                                        className="h-full resize-none text-base p-4"
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                    />
                                </TabsContent>
                                <TabsContent value="file" className="flex-1 mt-4">
                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors relative
                                            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                                            ${isUploading ? 'pointer-events-none opacity-50' : ''}
                                        `}
                                    >
                                        <input {...getInputProps()} />
                                        <div className="flex flex-col items-center gap-4">
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                                    <p className="text-lg font-medium animate-pulse">Dosya Analiz Ediliyor...</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold">PDF, Excel veya Resim Yükle</h3>
                                                        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                                            Malzeme listesi içeren dosyayı buraya sürükleyin veya seçin.
                                                        </p>
                                                    </div>
                                                    <Button variant="secondary" className="mt-2">Dosya Seç</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="flex flex-col h-full gap-4">
                                <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-md border">
                                    <div className="flex-1">
                                        <label className="text-xs font-medium text-muted-foreground">Müşteri / Cari Adı</label>
                                        <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" aria-expanded={isCustomerOpen} className="w-full justify-between bg-white h-9">
                                                    {selectedCustomer ? (
                                                        <span className="flex items-center gap-2 truncate">
                                                            <User className="h-4 w-4 opacity-50" />
                                                            {selectedCustomer.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Müşteri seçin...</span>
                                                    )}
                                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <div className="p-2 border-b">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Müşteri ara..."
                                                            value={customerSearchTerm}
                                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                                            className="pl-8 h-9"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <ScrollArea className="h-[200px]">
                                                    {filteredCustomers.length === 0 ? (
                                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                                            Müşteri bulunamadı.
                                                        </div>
                                                    ) : (
                                                        <div className="p-1">
                                                            {filteredCustomers.map((customer) => (
                                                                <div
                                                                    key={customer.id}
                                                                    className={cn(
                                                                        "flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-accent text-sm",
                                                                        selectedCustomerId === customer.id && "bg-accent"
                                                                    )}
                                                                    onClick={() => {
                                                                        setSelectedCustomerId(customer.id);
                                                                        setIsCustomerOpen(false);
                                                                    }}
                                                                >
                                                                    <User className="h-4 w-4 opacity-50" />
                                                                    <span className="flex-1 truncate">{customer.name}</span>
                                                                    {selectedCustomerId === customer.id && <Check className="h-4 w-4" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                                <div className="p-2 border-t bg-muted/50">
                                                    <Button variant="ghost" className="w-full justify-start gap-2 h-8" onClick={() => { setIsCustomerOpen(false); setIsAddCustomerOpen(true); }}>
                                                        <Plus className="h-4 w-4" />
                                                        Yeni Cari Hesap Ekle
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="text-sm text-muted-foreground self-end pb-2">
                                        {draftItems.filter(i => i.matchedProduct).length} / {draftItems.length} ürün eşleşti
                                    </div>
                                </div>

                                <div className="flex-1 border rounded-md overflow-hidden">
                                    <div className="overflow-y-auto h-full">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-secondary">
                                                <TableRow>
                                                    <TableHead className="w-[80px]">Miktar</TableHead>
                                                    <TableHead className="w-[80px]">Birim</TableHead>
                                                    <TableHead className="w-[45%]">Gelen Metin / Terminoloji</TableHead>
                                                    <TableHead className="w-[35%]">Eşleşen Ürün</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {draftItems.map((item) => (
                                                    <TableRow key={item.id} className={item.matchedProduct ? "bg-green-50/30" : ""}>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                className="h-8 w-16"
                                                                value={isNaN(item.quantity) ? 0 : item.quantity}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value);
                                                                    setDraftItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: isNaN(val) ? 0 : val } : i));
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8 w-16"
                                                                value={item.unit || ''}
                                                                onChange={e => {
                                                                    setDraftItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i));
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium text-sm relative">
                                                            <div className="flex flex-col gap-2">
                                                                {/* Primary Name Section (Confirmed Technical Name or Raw Text) */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    {item.confirmedName ? (
                                                                        <>
                                                                            <span className="text-purple-700 font-bold text-base leading-tight">
                                                                                {item.confirmedName}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                                                                Müşteri Metni: {item.rawText}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <SmartTextCell
                                                                            rawText={item.rawText}
                                                                            parts={item.parts}
                                                                            onExtract={(type, value) => {
                                                                                setDraftItems(prev => prev.map(i => {
                                                                                    if (i.id !== item.id) return i;
                                                                                    if (type === 'quantity') {
                                                                                        const num = parseFloat(value.replace(',', '.').replace(/[^0-9.]/g, ''));
                                                                                        return isNaN(num) ? i : { ...i, quantity: num };
                                                                                    }
                                                                                    return { ...i, unit: value };
                                                                                }));
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>

                                                                {/* AI Suggestions Section */}
                                                                {editingSuggestionId === item.id ? (
                                                                    <div className="flex items-center gap-1 bg-purple-50 p-1.5 rounded-lg border-2 border-purple-400 shadow-sm w-full animate-in fade-in zoom-in-95 duration-200">
                                                                        <Input
                                                                            value={editingValue}
                                                                            onChange={(e) => setEditingValue(e.target.value)}
                                                                            className="h-9 text-sm flex-1 py-1 px-3 bg-white border-purple-300 focus:ring-purple-500 font-medium"
                                                                            placeholder="Teknik ismi dǬzenleyin..."
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') saveEditedSuggestion(item.id);
                                                                                if (e.key === 'Escape') setEditingSuggestionId(null);
                                                                            }}
                                                                        />
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => saveEditedSuggestion(item.id)}
                                                                                className="p-1.5 bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm transition-colors"
                                                                                title="DeYiYiklikleri Kaydet"
                                                                            >
                                                                                <Check className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingSuggestionId(null)}
                                                                                className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-md transition-colors"
                                                                                title="Vazge"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group/suggest w-full">
                                                                        <div
                                                                            className="text-xs text-purple-700 bg-purple-100/50 hover:bg-purple-100 px-3 py-1.5 rounded-full flex items-center gap-2 border border-purple-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                                                            onClick={() => startEditingSuggestion(item.id, item.suggestedStandardName || "")}
                                                                            title="Öneriyi düzenle veya onayla"
                                                                        >
                                                                            <Wand2 className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
                                                                            <span className="font-bold whitespace-nowrap text-purple-800">Teknik Öneri:</span>
                                                                            <span className="font-medium italic">{item.suggestedStandardName}</span>
                                                                            <div
                                                                                className="ml-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-0.5 transition-colors"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    applySuggestion(item.id);
                                                                                }}
                                                                                title="Bu ismi kabul et"
                                                                            >
                                                                                <Check className="h-2.5 w-2.5" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-1 opacity-0 group-hover/suggest:opacity-100 transition-opacity">
                                                                            <button
                                                                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
                                                                                onClick={() => dismissSuggestion(item.id)}
                                                                                title="Öneriyi Kaldır"
                                                                            >
                                                                                <Eraser className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1.5">
                                                                <GenericProductMatcher
                                                                    searchTerm={item.confirmedName || item.rawText}
                                                                    onMatch={(p) => handleMatch(item.id, p)}
                                                                    matchedProductId={item.matchedProduct?.id}
                                                                    triggerLabel={item.matchedProduct?.name}
                                                                    refreshTrigger={draftItems.length} // Refresh when items change
                                                                />

                                                                {item.matchedProposalItem && (
                                                                    <div className="flex flex-col p-2 bg-blue-50/50 border border-blue-100 rounded text-[10px] animate-in fade-in slide-in-from-right-1">
                                                                        <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-0.5">
                                                                            <CheckSquare className="h-3 w-3" />
                                                                            TEKLİFİNDEKİ KARŞILIĞI:
                                                                        </div>
                                                                        <div className="text-slate-700 font-medium leading-tight">
                                                                            {item.matchedProposalItem.name}
                                                                        </div>
                                                                        <div className="flex justify-between items-center mt-1 pt-1 border-t border-blue-100/50">
                                                                            <span className="text-slate-500">Senin Miktarın:</span>
                                                                            <span className={cn(
                                                                                "font-bold px-1.5 rounded",
                                                                                Math.abs(item.matchedProposalItem.quantity - item.quantity) > 0.01
                                                                                    ? "bg-orange-100 text-orange-700"
                                                                                    : "bg-green-100 text-green-700"
                                                                            )}>
                                                                                {item.matchedProposalItem.quantity} {item.matchedProposalItem.unit}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {step === 'input' ? (
                            <>
                                <Button variant="secondary" onClick={handleCleanText} disabled={!inputText.trim()} className="mr-auto">
                                    <Eraser className="mr-2 h-4 w-4" />
                                    Temizle
                                </Button>
                                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={handleAiTableAnalyze} disabled={isTableParsing || !inputText.trim()}>
                                    {isTableParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                    Zeki Tablo Çözümleyici (AI)
                                </Button>
                                <Button onClick={handleRegexAnalyze} disabled={!inputText.trim()}>
                                    Basit Analiz Et <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setStep('input')}>Geri Dön</Button>
                                <Button
                                    variant="outline"
                                    className="border-purple-200 text-purple-700 hover:bg-purple-50 gap-2"
                                    onClick={handleAiStandardize}
                                    disabled={isStandardizing || draftItems.length === 0}
                                >
                                    {isStandardizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    AI Terminoloji Öner
                                </Button>
                                {draftItems.some(i => i.suggestedStandardName) && (
                                    <Button
                                        variant="outline"
                                        className="border-green-200 text-green-700 hover:bg-green-50 gap-2"
                                        onClick={applyAllSuggestions}
                                    >
                                        <Check className="h-4 w-4" />
                                        Tüm Önerileri Uygula
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={handleAutoMatch}
                                    disabled={isAutoMatching || draftItems.every(i => !!i.matchedProduct)}
                                >
                                    {isAutoMatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Otomatik Eşle
                                </Button>

                                {importerData?.targetProposalId ? (
                                    <div className="flex gap-2">
                                        <Button onClick={handleSaveSupplierQuote} disabled={isCreating || draftItems.filter(i => i.matchedProduct).length === 0} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                                            Karşılaştırmaya Ekle
                                        </Button>
                                        <Button onClick={handleUpdateCosts} disabled={isCreating || draftItems.filter(i => i.matchedProduct).length === 0} className="bg-orange-600 hover:bg-orange-700">
                                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                            Doğrudan Teklife İşle
                                        </Button>
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={handleCreateProposal} 
                                        disabled={isCreating}
                                        className={targetProposalId ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {targetProposalId ? "Mevcut Teklife Ekle" : "Teklif Oluştur"}
                                    </Button>
                                )}
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Draft Picker Dialog */}
            <Dialog open={isDraftPickerOpen} onOpenChange={setIsDraftPickerOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-purple-600" />
                                Taslaklar
                            </div>
                            {availableDrafts.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        if (confirm(`Tüm ${availableDrafts.length} taslak silinecek. Emin misiniz?`)) {
                                            setIsSavingDraft(true);
                                            try {
                                                for (const draft of availableDrafts) {
                                                    await deleteDraftProposal(draft.id);
                                                }
                                                setAvailableDrafts([]);
                                                toast({
                                                    title: "Tamamlandı",
                                                    description: "Tüm taslaklar silindi."
                                                });
                                            } catch (error) {
                                                toast({
                                                    title: "Hata",
                                                    description: "Taslaklar silinemedi.",
                                                    variant: "destructive"
                                                });
                                            } finally {
                                                setIsSavingDraft(false);
                                            }
                                        }
                                    }}
                                    className="text-red-600 hover:bg-red-50"
                                >
                                    <Trash className="h-4 w-4 mr-1" />
                                    Tümünü Sil
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Mevcut taslaklardan birini seçin veya yeni taslak oluşturun.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                            {availableDrafts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Henüz taslak yok</p>
                                </div>
                            ) : (
                                availableDrafts.map((draft: any) => (
                                    <div
                                        key={draft.id}
                                        className={cn(
                                            "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md group relative",
                                            draft.id === draftId
                                                ? "bg-purple-50 border-purple-300"
                                                : "bg-white hover:bg-slate-50 border-slate-200"
                                        )}
                                    >
                                        {/* Delete Button (per draft) */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm(`"${draft.title || 'İsimsiz Taslak'}" silinecek. Emin misiniz?`)) {
                                                    const result = await deleteDraftProposal(draft.id);
                                                    if (result.success) {
                                                        setAvailableDrafts(availableDrafts.filter(d => d.id !== draft.id));
                                                        if (draftId === draft.id) {
                                                            // If deleting current draft, reset
                                                            setDraftId(null);
                                                            setHasServerDraft(false);
                                                        }
                                                        toast({
                                                            title: "Silindi",
                                                            description: "Taslak silindi."
                                                        });
                                                    } else {
                                                        toast({
                                                            title: "Hata",
                                                            description: result.error,
                                                            variant: "destructive"
                                                        });
                                                    }
                                                }
                                            }}
                                            className="absolute top-2 right-2 p-2 rounded-full bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                                            title="Taslağı Sil"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </button>
                                        
                                        <div
                                            onClick={async () => {
                                                // Load draft
                                                setDraftId(draft.id);
                                                setDraftTitle(draft.title || '');
                                                setDraftDescription(draft.description || '');
                                                setDraftTags(draft.tags || []);
                                                setSelectedCustomerId(draft.customerId || null);
                                                setDraftItems(draft.draftItems || []);
                                                setInputText(draft.inputText || '');
                                                setStep(draft.step || 'input');
                                                setHasServerDraft(true);
                                                setIsDraftPickerOpen(false);
                                                toast({
                                                    title: "Taslak Yüklendi",
                                                    description: `${draft.title || 'Taslak'} geri yüklendi.`
                                                });
                                            }}
                                        >
                                            <div className="flex justify-between items-start pr-10">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-sm">{draft.title || 'İsimsiz Taslak'}</h3>
                                                        {draft.id === draftId && (
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                        <User className="h-3 w-3" />
                                                        <span>{draft.customerName || 'Müşteri yok'}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(draft.tags || []).slice(0, 5).map((tag: string, idx: number) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="secondary"
                                                                className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div className="mb-1">
                                                        {new Date(draft.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div>
                                                        📦 {draft.draftItems?.length || 0} kalem
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                    
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Create new draft
                                setDraftId(null);
                                setDraftTitle('');
                                setDraftDescription('');
                                setDraftTags([]);
                                setSelectedCustomerId(null);
                                setDraftItems([]);
                                setInputText('');
                                setStep('input');
                                setIsDraftPickerOpen(false);
                                toast({
                                    title: "Yeni Taslak",
                                    description: "Yeni taslak oluşturmaya hazırsınız."
                                });
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Taslak
                        </Button>
                        <Button variant="ghost" onClick={() => setIsDraftPickerOpen(false)}>
                            Kapat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Metadata Editor Dialog */}
            <Dialog open={isMetadataEditorOpen} onOpenChange={setIsMetadataEditorOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-blue-600" />
                            Taslak Bilgilerini Düzenle
                        </DialogTitle>
                        <DialogDescription>
                            Taslak başlığını, açıklamasını ve etiketlerini düzenleyin.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Başlık</label>
                            <Input
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                placeholder="Örn: Ahmet Bey - Kombi Teklifi"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Açıklama</label>
                            <Textarea
                                value={draftDescription}
                                onChange={(e) => setDraftDescription(e.target.value)}
                                placeholder="Notlar, detaylar..."
                                rows={3}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Etiketler</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {draftTags.map((tag: string, idx: number) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="bg-purple-50 text-purple-700 border-purple-200 gap-1"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => setDraftTags(draftTags.filter((_, i) => i !== idx))}
                                            className="ml-1 hover:text-red-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Yeni etiket..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newTag.trim()) {
                                            setDraftTags([...draftTags, newTag.trim()]);
                                            setNewTag('');
                                        }
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (newTag.trim()) {
                                            setDraftTags([...draftTags, newTag.trim()]);
                                            setNewTag('');
                                        }
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                if (!draftId) {
                                    toast({
                                        title: "Hata",
                                        description: "Henüz bir taslak kaydedilmedi.",
                                        variant: "destructive"
                                    });
                                    return;
                                }
                                
                                const result = await updateDraftMetadata(draftId, {
                                    title: draftTitle,
                                    description: draftDescription,
                                    tags: draftTags
                                });
                                
                                if (result.success) {
                                    toast({
                                        title: "Güncellendi",
                                        description: "Taslak bilgileri kaydedildi."
                                    });
                                    setIsMetadataEditorOpen(false);
                                } else {
                                    toast({
                                        title: "Hata",
                                        description: result.error,
                                        variant: "destructive"
                                    });
                                }
                            }}
                        >
                            Kaydet
                        </Button>
                        <Button variant="ghost" onClick={() => setIsMetadataEditorOpen(false)}>
                            İptal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <QuickAddCustomer
                isOpen={isAddCustomerOpen}
                onOpenChange={setIsAddCustomerOpen}
                onCustomerAdded={async () => {
                    // React Query otomatik olarak cache'i invalidate eder
                    // Ekstra refresh'a gerek yok!
                    toast({
                        title: "Başarılı",
                        description: "Müşteri eklendi. Liste otomatik güncelleniyor..."
                    });
                }}
            />
        </>
    );
}