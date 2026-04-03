'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Proposal, ProposalItem, Customer, Personnel, Project, ProjeDurumu } from '@prisma/client';
import Papa from 'papaparse';
import { updateProposalStatus, ProposalStatus } from '@/actions/proposals';
import { StatusPieChart } from '@/components/app/quotes/StatusPieChart';
import { ProposalKanbanBoard } from '@/components/kanban/ProposalKanbanBoard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuoteListGroupedView } from '@/components/app/quotes/quote-list-grouped-view';
import { QuoteListFlatView } from '@/components/app/quotes/quote-list-flat-view';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ProjectSelect } from '@/components/projects/project-select';
import { ProjectDialog } from '@/components/app/project-dialog';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Loader2, Search, ChevronDown, CheckSquare, X, FileSpreadsheet, ChevronLeft, ChevronRight, Calculator, DollarSign, FileText, Mail, Phone, ArrowLeft, LayoutGrid, List, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AssignJobDialog } from '@/components/app/assign-job-dialog';
import { SmartProposalImporter } from '@/components/app/smart-proposal-importer';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { useProposals } from '@/hooks/use-proposals';


const newQuoteSchema = z.object({
    customerId: z.string().min(1, 'Cari hesap seçimi zorunludur.'),
    projectName: z.string().min(2, 'Proje adı en az 2 karakter olmalıdır.'),
    projectId: z.string().optional(),
    templateId: z.string().optional(),
});

type NewQuoteFormValues = z.infer<typeof newQuoteSchema>;



// Proposal type is now fully managed via Prisma server actions.

type Template = {
    id: string;
    name: string;
};

type TemplateItem = {
    productId: string;
    quantity: number;
    groupName?: string;
    orderIndex?: number;
};

type JobAssignment = {
    id: string;
    proposalId: string;
    personnelId: string;
}

export type ProposalGroup = {
    rootProposalId: string | null;
    latestProposal: Proposal;
    versions: Proposal[];
    isAssigned: boolean;
    assignedPersonnelName?: string;
}

export type CustomerProposalGroup = {
    customerId: string;
    customerName: string;
    proposalGroups: ProposalGroup[];
}

const statusFilterOptions: { label: string; value: Proposal['status'] | 'All' }[] = [
    { label: 'Tümü', value: 'All' },
    { label: 'Hazırlanıyor', value: 'Draft' }, // Updated to match Kanban
    { label: 'Gönderildi', value: 'Sent' },
    { label: 'Onaylandı', value: 'Approved' },
    { label: 'Reddedildi', value: 'Rejected' },
];

const dateFilterOptions: { label: string; value: 'all' | 'last30days' | 'last90days' }[] = [
    { label: 'Tümü', value: 'all' },
    { label: 'Son 30 Gün', value: 'last30days' },
    { label: 'Son 90 Gün', value: 'last90days' },
];

const statusOptions: { label: string; value: Proposal['status'] }[] = [
    { label: 'Hazırlanıyor', value: 'Draft' }, // Updated to match Kanban
    { label: 'Gönderildi', value: 'Sent' },
    { label: 'Onaylandı', value: 'Approved' },
    { label: 'Reddedildi', value: 'Rejected' },
];

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string, icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);


const ITEMS_PER_PAGE = 10;

// Props interface for server-side data
interface QuotesPageContentProps {
    initialProposals: Proposal[];
    initialCustomers: any[];
    initialPersonnel?: any[];
    initialSettings?: any;
    initialTemplates?: any[];
    initialAnalytics?: {
        totalProposals: number;
        approvedProposals: number;
        totalValue: number;
        averageValue: number;
        conversionRate: number;
    };
}

export function QuotesPageContent({
    initialProposals,
    initialCustomers,
    initialAnalytics,
    initialPersonnel = [],
    initialSettings = null,
    initialTemplates = []
}: QuotesPageContentProps) {
    const router = useRouter();
    const { openTab } = useWorkspace();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // React Query ile teklifleri çek
    const {
        proposals: queryProposals,
        isLoading: isLoadingQuery,
    } = useProposals();

    // Fallback: Eğer query boşsa initial data kullan (SSR için)
    const proposalsData = queryProposals.length > 0 ? queryProposals : initialProposals;

    const [proposals, setProposals] = useState(proposalsData);
    const [customers, setCustomers] = useState(initialCustomers);
    const [analytics, setAnalytics] = useState(initialAnalytics);

    // Sync with React Query data
    useEffect(() => {
        setProposals(proposalsData);
    }, [proposalsData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRevising, setIsRevising] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'last30days' | 'last90days'>('all');
    const [statusFilter, setStatusFilter] = useState<Proposal['status'] | 'All'>('All');
    const [tagFilter, setTagFilter] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isAssignJobDialogOpen, setIsAssignJobDialogOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [proposalToCopy, setProposalToCopy] = useState<Proposal | null>(null);
    const [targetCustomerId, setTargetCustomerId] = useState<string | null>(null);
    const [copyProjectName, setCopyProjectName] = useState('');

    // Data from server props
    const personnel = initialPersonnel;
    const settings = initialSettings;
    const templates = initialTemplates;
    const [proposalToAssign, setProposalToAssign] = useState<Proposal | null>(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // State for multi-step dialog
    const [dialogStep, setDialogStep] = useState<'details' | 'groups'>('details');
    const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
    const [templateGroups, setTemplateGroups] = useState<string[]>([]);
    const [selectedTemplateGroups, setSelectedTemplateGroups] = useState<Set<string>>(new Set());

    const [showProjectCreationDialog, setShowProjectCreationDialog] = useState(false);
    const [proposalToConvert, setProposalToConvert] = useState<Proposal | null>(null);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [proposalToRename, setProposalToRename] = useState<Proposal | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    const form = useForm<NewQuoteFormValues>({
        resolver: zodResolver(newQuoteSchema),
        defaultValues: {
            customerId: '',
            projectName: '',
            projectId: undefined,
            templateId: 'none',
        },
    });

    // Loading states for server-fetched data (always false since data comes from server)
    const isLoadingProposals = false;
    const isLoadingCustomers = false;

    const isLoadingAssignments = false;
    const isLoadingPersonnel = false;
    const products: any[] = [];

    // jobAssignments are now nested in proposals from getProposalList
    const jobAssignments = useMemo(() => {
        return proposals.flatMap((p: any) => p.jobAssignments || []);
    }, [proposals]);


    // Extract unique tags
    const uniqueTags = useMemo(() => {
        if (!proposals) return [];
        const tags = new Set<string>();
        proposals.forEach((p: any) => {
            if (p.tags && typeof p.tags === 'string') {
                p.tags.split(',').forEach((tag: string) => tags.add(tag.trim()));
            }
        });
        return Array.from(tags).filter(Boolean).sort();
    }, [proposals]);

    const refetchProposals = () => { }; // No-op for now, useLiveQuery handles it
    const refetchAssignments = () => { }; // No-op

    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        if (!customerSearchTerm) return customers;
        const searchTerms = customerSearchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(Boolean);
        if (searchTerms.length === 0) return customers;

        return customers.filter(c => {
            const customerText = `
        ${c.name}
        ${c.email || ''}
        ${c.phone || ''}
        ${c.address?.city || ''}
        ${c.address?.district || ''}
      `.toLocaleLowerCase('tr-TR');

            return searchTerms.every(term => customerText.includes(term));
        });
    }, [customers, customerSearchTerm]);

    useEffect(() => {
        const shouldOpenDialog = searchParams.get('dialog') === 'open';
        if (shouldOpenDialog) {
            const customerIdFromUrl = searchParams.get('customerId');
            const templateIdFromUrl = searchParams.get('templateId');

            setIsDialogOpen(true);
            // These values are now set inside the main dialog open effect
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1); // Reset page on filter change
    }, [statusFilter, dateFilter, searchTerm, sortOrder]);

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const savedViewMode = localStorage.getItem('quotes_viewMode');
        const savedSortOrder = localStorage.getItem('quotes_sortOrder');
        const savedTagFilter = localStorage.getItem('quotes_tagFilter');

        if (savedViewMode) setViewMode(savedViewMode as 'list' | 'kanban');
        if (savedSortOrder) setSortOrder(savedSortOrder as 'newest' | 'oldest');
        if (savedTagFilter) setTagFilter(savedTagFilter);
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) localStorage.setItem('quotes_viewMode', viewMode);
    }, [viewMode, isInitialized]);

    useEffect(() => {
        if (isInitialized) localStorage.setItem('quotes_sortOrder', sortOrder);
    }, [sortOrder, isInitialized]);

    useEffect(() => {
        if (isInitialized) localStorage.setItem('quotes_tagFilter', tagFilter);
    }, [tagFilter, isInitialized]);

    useEffect(() => {
        if (isDialogOpen) {
            const customerIdFromQuery = searchParams.get('customerId');
            const templateIdFromQuery = searchParams.get('templateId');

            setCustomerSearchTerm(''); // Always clear search term
            setSelectedCustomerId(customerIdFromQuery); // Set from URL, will be null if not present

            form.reset({
                customerId: customerIdFromQuery || '',
                projectName: '',
                projectId: undefined,
                templateId: templateIdFromQuery || 'none',
            });

            setDialogStep('details');
            setTemplateItems([]);
            setTemplateGroups([]);
            setSelectedTemplateGroups(new Set());
        }
    }, [isDialogOpen, form, searchParams]);

    useEffect(() => {
        form.setValue('customerId', selectedCustomerId || '');
    }, [selectedCustomerId, form]);


    const groupedProposals = useMemo((): ProposalGroup[] => {
        if (!proposals || !personnel) return [];

        const personnelMap = new Map(personnel.map(p => [p.id, p.name]));
        const assignmentMap = new Map(jobAssignments?.map(j => [j.proposalId, j.personnelId]));

        const groups: Record<string, Proposal[]> = {};

        proposals.forEach(p => {
            const rootId = p.rootProposalId || p.id;
            if (!groups[rootId]) {
                groups[rootId] = [];
            }
            groups[rootId].push(p);
        });

        return Object.values(groups).map(versions => {
            versions.sort((a, b) => (b.version || 0) - (a.version || 0));
            const latestProposal = versions[0];

            let isAssigned = false;
            let assignedPersonnelName: string | undefined = undefined;

            for (const v of versions) {
                if (v.id && assignmentMap.has(v.id)) {
                    isAssigned = true;
                    const personnelId = assignmentMap.get(v.id);
                    if (personnelId) {
                        assignedPersonnelName = personnelMap.get(personnelId);
                    }
                    break;
                }
            }

            return {
                rootProposalId: latestProposal.rootProposalId,
                latestProposal: latestProposal,
                versions: versions,
                isAssigned,
                assignedPersonnelName,
            };
        }).sort((a, b) => {
            if (!a.latestProposal?.createdAt) return 1;
            if (!b.latestProposal?.createdAt) return -1;
            if (!a.latestProposal?.createdAt) return 1;
            if (!b.latestProposal?.createdAt) return -1;
            const timeA = a.latestProposal.createdAt.getTime();
            const timeB = b.latestProposal.createdAt.getTime();

            if (sortOrder === 'newest') {
                return timeB - timeA;
            } else {
                return timeA - timeB;
            }
        });
    }, [proposals, jobAssignments, personnel, sortOrder]);

    const applyFilters = (items: any[], isGrouped: boolean) => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
        const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90).getTime();

        return items.filter(item => {
            const p = isGrouped ? item.latestProposal : item;

            const searchTerms = searchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(term => term.length > 0);
            if (searchTerms.length > 0) {
                const proposalText = `${p.customerName} ${p.projectName} ${p.quoteNumber}`.toLocaleLowerCase('tr-TR');
                const isMatch = searchTerms.every(term => proposalText.includes(term));
                if (!isMatch) return false;
            }

            if (dateFilter !== 'all' && p.createdAt) {
                const proposalTime = p.createdAt.getTime();
                if (dateFilter === 'last30days' && proposalTime < thirtyDaysAgo) return false;
                if (dateFilter === 'last90days' && proposalTime < ninetyDaysAgo) return false;
            }

            if (statusFilter !== 'All') {
                return p.status === statusFilter;
            }

            if (tagFilter !== 'All') {
                if (!p.tags || typeof p.tags !== 'string') return false;
                const tags = p.tags.split(',').map((t: string) => t.trim());
                return tags.includes(tagFilter);
            }

            return true;
        });
    };

    const filteredProposalGroups = useMemo(() => applyFilters(groupedProposals, true), [groupedProposals, searchTerm, dateFilter]);

    const flatFilteredProposals = useMemo(() => {
        if (!proposals) return [];

        return applyFilters(proposals, false).sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            const timeA = a.createdAt.getTime();
            const timeB = b.createdAt.getTime();
            return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
        });
    }, [proposals, searchTerm, statusFilter, dateFilter, sortOrder]);

    const proposalsByCustomer = useMemo(() => {
        if (statusFilter !== 'All') return [];
        const customerGroups: Record<string, CustomerProposalGroup> = {};
        if (!filteredProposalGroups) return [];

        filteredProposalGroups.forEach(group => {
            const customerId = group.latestProposal.customerId;
            if (!customerGroups[customerId]) {
                customerGroups[customerId] = {
                    customerId,
                    customerName: group.latestProposal.customerName,
                    proposalGroups: [],
                };
            }
            customerGroups[customerId].proposalGroups.push(group);
        });

        return Object.values(customerGroups).sort((a, b) => a.customerName.localeCompare(b.customerName, 'tr'));

    }, [filteredProposalGroups, statusFilter]);

    const filteredStats = useMemo(() => {
        const listToProcess = flatFilteredProposals;

        const count = listToProcess.length;
        const totalAmount = listToProcess.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const averageAmount = count > 0 ? totalAmount / count : 0;

        return {
            count,
            totalAmount,
            averageAmount,
        };
    }, [flatFilteredProposals]);

    const paginatedCustomerGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return proposalsByCustomer.slice(startIndex, endIndex);
    }, [proposalsByCustomer, currentPage]);

    const paginatedFlatProposals = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return flatFilteredProposals.slice(startIndex, endIndex);
    }, [flatFilteredProposals, currentPage]);

    const totalPages = useMemo(() => {
        const totalItems = statusFilter === 'All' ? proposalsByCustomer.length : flatFilteredProposals.length;
        return Math.ceil(totalItems / ITEMS_PER_PAGE);
    }, [proposalsByCustomer, flatFilteredProposals, statusFilter]);

    const handleOpenNewQuoteDialog = () => {
        router.replace('/quotes', { scroll: false }); // Clear query params
        setIsDialogOpen(true);
    };

    const handleProceedToGroups = async () => {
        if (dialogStep === 'details') {
            const { templateId } = form.getValues();
            if (!templateId || templateId === 'none') {
                await handleCreateNewQuote([]);
                return;
            }

            try {
                const { getTemplates } = await import('@/actions/templates');
                const result = await getTemplates();
                if (result.success && result.data) {
                    const template = result.data.find((t: any) => t.id === templateId);
                    if (template) {
                        const items = Array.isArray(template.items) ? template.items : (typeof template.items === 'string' ? JSON.parse(template.items) : []);
                        setTemplateItems(items);

                        // Extract groups
                        const groups = Array.from(new Set(items.map((it: any) => it.groupName || 'Genel'))).filter(Boolean) as string[];
                        if (groups.length > 0) {
                            setTemplateGroups(groups);
                            setSelectedTemplateGroups(new Set(groups));
                            setDialogStep('groups');
                        } else {
                            await handleCreateNewQuote(items);
                        }
                    }
                }
            } catch (error) {
                console.error("Şablon yüklenemedi:", error);
                toast({ variant: "destructive", title: "Hata", description: "Şablon yüklenirken bir sorun oluştu." });
            }
        } else {
            // In groups step, filter items by selected groups
            const filteredItems = templateItems.filter(it =>
                selectedTemplateGroups.has(it.groupName || 'Genel')
            );
            await handleCreateNewQuote(filteredItems);
        }
    };

    const handleCreateNewQuote = async (initialItems: any[] = []) => {
        setIsSubmitting(true);

        const values = form.getValues();
        try {
            const selectedCustomer = customers?.find(c => String(c.id) === values.customerId);
            if (!selectedCustomer) throw new Error("Cari hesap bulunamadı.");

            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const timestampSuffix = Date.now().toString().slice(-6);
            const quoteNumber = `RP-${month}${year}-${timestampSuffix}`;

            // Use Prisma server action to create proposal
            const { createProposal } = await import('@/actions/proposals');

            const result = await createProposal({
                customerId: values.customerId,
                customerName: selectedCustomer.name,
                projectName: values.projectName,
                projectId: values.projectId,
                quoteNumber: quoteNumber,
                // totalAmount is calculated on the server in createProposal
                exchangeRateUSD: settings?.defaultExchangeRateUSD || 32.50,
                exchangeRateEUR: settings?.defaultExchangeRateEUR || 35.00,
                termsAndConditions: settings?.defaultTermsAndConditions || "Teklif geçerlilik süresi 15 gündür.",
                items: initialItems
            });

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Teklif oluşturulamadı');
            }

            toast({ title: "Başarılı!", description: "Yeni teklif taslağı oluşturuldu." });
            setIsDialogOpen(false);
            form.reset();

            // Open in new internal tab
            openTab(`/quotes/${result.data.id}`, `Yeni Teklif: ${result.data.quoteNumber}`);
            router.refresh();

        } catch (error: any) {
            console.error("Teklif oluşturma hatası:", error);
            toast({ variant: "destructive", title: "Hata", description: `Teklif oluşturulamadı: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDuplicateProposal = async (proposalToClone: Proposal) => {
        setIsRevising(proposalToClone.rootProposalId);
        toast({ title: 'Revizyon oluşturuluyor...' });

        try {
            // Use Prisma server action to create new version
            const { createProposalVersion } = await import('@/actions/proposals');

            const result = await createProposalVersion(
                proposalToClone.id!,
                `Revizyon (v${proposalToClone.version}'dan kopyalandı)`
            );

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Revizyon oluşturulamadı');
            }

            toast({
                title: "Başarılı!",
                description: `Teklif revize edildi. Yeni versiyon: v${result.data.version}`
            });

            // Refresh and navigate
            openTab(`/quotes/${result.data.id}`, `Revizyon: ${result.data.quoteNumber}`);
            router.refresh();

        } catch (error: any) {
            console.error("Teklif revizyon hatası:", error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Revizyon oluşturulamadı: ${error.message}`
            });
        } finally {
            setIsRevising(null);
        }
    };

    const handleOpenCopyDialog = (proposal: Proposal) => {
        setProposalToCopy(proposal);
        setCopyProjectName(proposal.projectName ? `${proposal.projectName} (Kopya)` : 'Yeni Proje');
        setTargetCustomerId(null);
        setIsCopyDialogOpen(true);
        setCustomerSearchTerm('');
    };

    const handleCopyProposal = async () => {
        if (!proposalToCopy || !targetCustomerId) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Lütfen bir hedef müşteri seçin.",
            });
            return;
        }
        if (!copyProjectName.trim()) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Lütfen yeni proje adını girin.",
            });
            return;
        }

        setIsSubmitting(true);
        toast({ title: 'Teklif kopyalanıyor...' });

        try {
            const { copyProposalToCustomer } = await import('@/actions/proposals');
            const result = await copyProposalToCustomer(proposalToCopy.id, targetCustomerId, copyProjectName);

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Teklif kopyalanamadı.');
            }

            toast({
                title: "Başarılı!",
                description: "Teklif yeni müşteriye başarıyla kopyalandı.",
            });

            setIsCopyDialogOpen(false);

            // Give Radix UI a moment to unlock the body before navigating
            setTimeout(() => {
                openTab(`/quotes/${result.data.id}`, `Yeni Teklif: ${result.data.quoteNumber}`);
                router.refresh();
            }, 100);

        } catch (error: any) {
            console.error("Teklif kopyalama hatası:", error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Teklif kopyalanamadı: ${error.message}`,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRenameProposal = async () => {
        if (!proposalToRename || !newProjectName.trim()) return;

        setIsRenaming(true);
        try {
            const { updateProposal } = await import('@/actions/proposals');
            const result = await updateProposal(proposalToRename.id, { projectName: newProjectName });

            if (result.success) {
                toast({ title: "Başarılı", description: "Proje adı güncellendi." });
                setIsRenameDialogOpen(false);
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: error.message });
        } finally {
            setIsRenaming(false);
        }
    };

    const handleDeleteProposal = async (idToDelete: string, rootId: string, isGroupDelete: boolean) => {
        try {
            const { deleteProposal } = await import('@/actions/proposals');

            if (isGroupDelete) {
                // Delete all versions - we'll need to get all version IDs first
                // For now, just delete the single proposal
                // TODO: Add bulk delete support in server actions
                const result = await deleteProposal(idToDelete);
                if (!result.success) {
                    throw new Error(result.error || 'Teklif silinemedi');
                }
            } else {
                const result = await deleteProposal(idToDelete);
                if (!result.success) {
                    throw new Error(result.error || 'Teklif silinemedi');
                }
            }

            toast({ title: "Başarılı", description: "Teklif ve ilgili kalemler silindi." });

            // Refresh to update list
            router.refresh();
        } catch (error: any) {
            console.error("Teklif silme hatası:", error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Teklif silinemedi: ${error.message}`
            });
        }
    };

    const handleConfirmCreateProject = async (projectData: any) => {
        if (!proposalToConvert) return;

        try {
            // 1. Create Project
            const { createProject } = await import('@/actions/projects');
            const projectRes = await createProject({
                name: projectData.name,
                customerId: projectData.customerId,
                description: projectData.description,
                contractAmount: projectData.contractAmount,
                estimatedMaterialCost: projectData.estimatedMaterialCost,
                estimatedLaborCost: projectData.estimatedLaborCost,
                startDate: projectData.startDate,
                endDate: projectData.endDate,
                status: ProjeDurumu.MONTAJ_VE_IMALAT,
                linkedProposalId: proposalToConvert.id,
                teamMemberIds: projectData.teamMemberIds,
                teamMemberDetails: projectData.teamMemberDetails
            });

            if (!projectRes.success || !projectRes.data) {
                toast({ variant: 'destructive', title: 'Hata', description: projectRes.error || "Proje oluşturulamadı." });
                return;
            }

            const newProjectId = projectRes.data.id;

            // 2. Update Proposal Status AND Link Project
            const { updateProposal } = await import('@/actions/proposals');
            // We use updateProposal here which updates the proposal in DB
            const proposalRes = await updateProposal(proposalToConvert.id!, {
                status: 'Approved',
                projectId: newProjectId
            });

            if (proposalRes.success) {
                toast({ title: 'Tebrikler!', description: 'Proje oluşturuldu ve teklif onaylandı.' });

                // Optimistic update
                setProposals(prev => prev.map(p => p.id === proposalToConvert.id ? { ...p, status: 'Approved', projectId: newProjectId } : p));

                setShowProjectCreationDialog(false);
                setProposalToConvert(null);

                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: "Teklif güncellenemedi ancak proje oluşturuldu." });
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız oldu.' });
        }
    };

    const handleStatusChange = async (proposalId: string, newStatus: Proposal['status']) => {
        try {
            const proposal = proposals.find(p => p.id === proposalId);
            if (!proposal) return;
            if (proposal.status === newStatus) return; // Prevent re-triggering same status

            const { updateProposalStatus } = await import('@/actions/proposals');

            // In a server-first architecture, we check linked project via proposal.projectId
            const existingProjectId = proposal.projectId;

            if (newStatus === 'Approved') {
                if (existingProjectId) {
                    toast({
                        variant: 'destructive',
                        title: "İşlem Engellendi",
                        description: `Bu teklif zaten bir projeye bağlı.`
                    });
                    return;
                } else {
                    // No project exists, show dialog to create one
                    setProposalToConvert(proposal);
                    setShowProjectCreationDialog(true);
                    return; // Wait for dialog confirmation
                }
            } else {
                // Status changing AWAY from Approved
                if (existingProjectId) {
                    // Reverting from Approved - clear assignments
                    const { clearProposalAssignments } = await import('@/actions/clear-assignments');
                    await clearProposalAssignments(proposalId);

                    toast({
                        title: "Bilgi",
                        description: "Teklif durumu değiştiği için ekip atamaları temizlendi."
                    });
                }
                router.refresh();
            }

            const result = await updateProposalStatus(proposalId, newStatus as ProposalStatus);
            if (!result.success) {
                throw new Error(result.error || 'Durum güncellenemedi');
            }

            toast({ title: "Başarılı", description: "Teklif durumu güncellendi." });

            // Refresh to update list
            router.refresh();
        } catch (error: any) {
            console.error("Durum güncelleme hatası:", error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Durum güncellenemedi: ${error.message}`
            });
        }
    };

    const handleBulkStatusChange = async (newStatus: Proposal['status']) => {
        if (selectedIds.size === 0) return;

        toast({ title: 'Güncelleniyor...', description: `${selectedIds.size} teklifin durumu değiştiriliyor.` });

        try {
            const { updateProposalStatus } = await import('@/actions/proposals');

            const promises = Array.from(selectedIds).map(id =>
                updateProposalStatus(id, newStatus as ProposalStatus)
            );

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.success);

            if (failed.length > 0) {
                throw new Error(`${failed.length} teklif güncellenemedi`);
            }

            toast({ title: 'Başarılı!', description: `Tekliflerin durumu güncellendi.` });
            setSelectedIds(new Set());

            // Refresh to update list
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: `Durumlar güncellenemedi: ${error.message}` });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`${selectedIds.size} teklifi kalıcı olarak silmek istediğinize emin misiniz?`)) return;

        toast({ title: 'Siliniyor...', description: `${selectedIds.size} teklif siliniyor.` });

        try {
            const { deleteProposal } = await import('@/actions/proposals');

            // Delete each proposal
            const promises = Array.from(selectedIds).map(id =>
                deleteProposal(id)
            );

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.success);

            if (failed.length > 0) {
                throw new Error(`${failed.length} teklif silinemedi`);
            }

            toast({ title: 'Başarılı!', description: 'Seçili teklifler ve kalemleri silindi.' });

            // Immediately update local state to remove deleted proposals
            const deletedIds = Array.from(selectedIds);
            setProposals(prev => prev.filter(p => !deletedIds.includes(p.id || '')));
            setSelectedIds(new Set());

            // Refresh to ensure data consistency
            router.refresh();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: `Teklifler silinemedi: ${error.message}` });
        }
    };

    const onToggleCustomerSelection = (customerGroup: CustomerProposalGroup, isChecked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            const proposalIdsInCustomerGroup = customerGroup.proposalGroups.flatMap(pg => pg.versions.map(v => v.id || ''));
            if (isChecked) {
                proposalIdsInCustomerGroup.forEach(id => id && newSet.add(id));
            } else {
                proposalIdsInCustomerGroup.forEach(id => id && newSet.delete(id));
            }
            return newSet;
        });
    };

    const toggleAllSelection = (isChecked: boolean) => {
        const newSelectedIds = new Set<string>();
        if (isChecked) {
            const listToSelect = statusFilter === 'All'
                ? proposalsByCustomer.flatMap(c => c.proposalGroups.flatMap(pg => pg.versions.map(v => v.id || '')))
                : flatFilteredProposals.map(p => p.id || '');
            listToSelect.forEach(id => id && newSelectedIds.add(id));
        }
        setSelectedIds(newSelectedIds);
    };

    const toggleSelection = (id: string, isChecked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const onToggleVersionSelection = (group: ProposalGroup, isChecked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                group.versions.forEach(v => v.id && newSet.add(v.id));
            } else {
                group.versions.forEach(v => v.id && newSet.delete(v.id));
            }
            return newSet;
        });
    };

    const currentListForSelection = statusFilter === 'All'
        ? proposalsByCustomer.flatMap(c => c.proposalGroups.flatMap(pg => pg.versions.map(v => v.id)))
        : flatFilteredProposals.map(p => p.id);
    const allVisibleSelected = currentListForSelection.length > 0 && selectedIds.size >= currentListForSelection.length && currentListForSelection.every(id => selectedIds.has(id));
    const someVisibleSelected = selectedIds.size > 0 && !allVisibleSelected;

    const handleExportToCSV = () => {
        const dataToExport = statusFilter === 'All'
            ? filteredProposalGroups.flatMap(g => g.versions)
            : flatFilteredProposals;

        if (dataToExport.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Dışa Aktarma Hatası',
                description: 'Dışa aktarılacak veri bulunmuyor.'
            });
            return;
        }

        const csvData = dataToExport.map(p => ({
            "Teklif Numarası": p.quoteNumber,
            "Versiyon": p.version,
            "Cari Hesap": p.customerName,
            "Proje Adı": p.projectName,
            "Durum": p.status,
            "Tutar": formatCurrency(p.totalAmount),
            "Oluşturma Tarihi": p.createdAt ? p.createdAt.toLocaleDateString('tr-TR') : '',
            "Versiyon Notu": p.versionNote,
        }));

        const csv = Papa.unparse(csvData);
        const BOM = "\uFEFF"; // UTF-8 Byte Order Mark
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "teklif_arsivi.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        toast({
            title: 'Başarılı!',
            description: `${dataToExport.length} teklif CSV olarak dışa aktarıldı.`
        });
    };

    const handleOpenAssignJobDialog = (proposal: Proposal) => {
        setProposalToAssign(proposal);
        setIsAssignJobDialogOpen(true);
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Sayfa {currentPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Önceki
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Sonraki
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    };



    const handleViewClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        window.open(`/quotes/${id}`, `/quotes`);
    };


    const handlePrintProposal = (proposal: Proposal) => {
        if (!proposal.id) return;
        window.open(`/quotes/${proposal.id}/print?customerId=${proposal.customerId}`, '_blank');
    };

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-4 p-8">
            <div className="flex-initial flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Teklif Arşivi</h1>
                    <p className="text-muted-foreground mt-1">
                        Mevcut tekliflerinizi yönetin ve yeni teklifler oluşturun.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex bg-muted p-1 rounded-lg mr-2 border">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('list')}
                            title="Liste Görünümü"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('kanban')}
                            title="Kanban Görünümü"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handleExportToCSV}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        CSV Olarak Dışa Aktar
                    </Button>
                    <SmartProposalImporter customers={customers} />
                    <Button onClick={handleOpenNewQuoteDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Yeni Teklif Oluştur
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="sm:max-w-xl">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleProceedToGroups)} className="space-y-4">
                                    <DialogHeader>
                                        <div className='flex items-center gap-2'>
                                            {dialogStep === 'groups' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialogStep('details')}>
                                                    <ArrowLeft />
                                                </Button>
                                            )}
                                            <div>
                                                <DialogTitle>
                                                    {dialogStep === 'details' ? 'Yeni Teklif Başlat' : 'Şablondan Grupları Seçin'}
                                                </DialogTitle>
                                                <DialogDescription>
                                                    {dialogStep === 'details'
                                                        ? 'Yeni bir teklif oluşturmak için müşteri ve proje adı seçin.'
                                                        : 'Bu teklife dahil edilecek grupları seçin.'
                                                    }
                                                </DialogDescription>
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    {dialogStep === 'details' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="customer-search">Müşteri</Label>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="customer-search"
                                                        placeholder="Müşteri adı, e-posta veya telefon ara..."
                                                        className="pl-8"
                                                        value={customerSearchTerm}
                                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                <ScrollArea className="h-48 rounded-md border">
                                                    <div className="p-2 space-y-1">
                                                        {isLoadingCustomers ? (
                                                            <div className="text-center p-4 text-muted-foreground">Müşteriler yükleniyor...</div>
                                                        ) : filteredCustomers.length > 0 ? (
                                                            filteredCustomers.map(customer => (
                                                                <div
                                                                    key={customer.id}
                                                                    onClick={() => setSelectedCustomerId(String(customer.id))}
                                                                    className={cn(
                                                                        "p-2 rounded-md cursor-pointer hover:bg-accent",
                                                                        selectedCustomerId === String(customer.id) && "bg-primary text-primary-foreground hover:bg-primary/90"
                                                                    )}
                                                                >
                                                                    <div className="font-semibold">{customer.name}</div>
                                                                    <div className="text-xs flex items-center gap-2 opacity-80">
                                                                        {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /><span>{customer.email}</span></div>}
                                                                        {customer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /><span>{customer.phone}</span></div>}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center p-4 text-muted-foreground">Müşteri bulunamadı.</div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                                <FormField control={form.control} name="customerId" render={() => <FormMessage />} />
                                            </div>

                                            {form.watch('customerId') && (
                                                <FormField
                                                    control={form.control}
                                                    name="projectId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Bağlı Proje / Şantiye (Opsiyonel)</FormLabel>
                                                            <FormControl>
                                                                <ProjectSelect
                                                                    customerId={form.watch('customerId')}
                                                                    value={field.value}
                                                                    onChange={(val) => {
                                                                        field.onChange(val);
                                                                        // Auto-fill project name if empty/default
                                                                        const projects = []; // Ideally we should have access to projects here, but ProjectSelect fetches them internaly.
                                                                        // Improvement: Maybe fetch projects in parent or expose via callback?
                                                                        // For now, let's just let user type Project Name or keep it separate.
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="projectName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Proje Adı</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Örn: Villa Mekanik Tesisat" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="templateId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bir Şablon Kullan (Opsiyonel)</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Bir şablon seçin..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Şablon Kullanma</SelectItem>
                                                                {templates?.map(template => (
                                                                    <SelectItem key={template.id!} value={template.id!}>
                                                                        {template.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}

                                    {dialogStep === 'groups' && (
                                        <div className='space-y-4'>
                                            {templateGroups.map(groupName => (
                                                <div key={groupName} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={groupName}
                                                        checked={selectedTemplateGroups.has(groupName)}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedTemplateGroups(prev => {
                                                                const newSet = new Set(prev);
                                                                if (checked) {
                                                                    newSet.add(groupName);
                                                                } else {
                                                                    newSet.delete(groupName);
                                                                }
                                                                return newSet;
                                                            })
                                                        }}
                                                    />
                                                    <label htmlFor={groupName} className="text-sm font-medium leading-none">
                                                        {groupName}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">İptal</Button>
                                        </DialogClose>
                                        {dialogStep === 'details' ? (
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {form.getValues('templateId') === 'none' ? 'Teklifi Oluştur' : 'İleri'}
                                            </Button>
                                        ) : (
                                            <Button type="button" onClick={() => handleCreateNewQuote([])} disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Teklifi Oluştur
                                            </Button>
                                        )}
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="flex-initial grid gap-4 md:grid-cols-4" >
                <StatCard
                    title="Toplam Teklif Tutarı"
                    value={filteredStats.totalAmount ? formatCurrency(filteredStats.totalAmount) : '₺0,00'}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingProposals}
                />
                <StatCard
                    title="Ortalama Teklif Tutarı"
                    value={filteredStats.averageAmount ? formatCurrency(filteredStats.averageAmount) : '₺0,00'}
                    icon={<Calculator className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingProposals}
                />
                <StatCard
                    title="Teklif Sayısı"
                    value={filteredStats.count.toString()}
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoadingProposals}
                />
                <StatusPieChart proposals={flatFilteredProposals} />
            </div >

            {/* Filters */}
            <div className="flex-initial flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center flex-1 gap-2 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Müşteri, proje veya teklif no ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="flex items-center space-x-2 px-2 border-r pr-4 mr-2">
                        <Checkbox
                            id="select-all-global"
                            checked={flatFilteredProposals.length > 0 && flatFilteredProposals.every(p => p.id && selectedIds.has(p.id))}
                            onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                        />
                        <Label htmlFor="select-all-global" className="text-xs font-medium cursor-pointer whitespace-nowrap">Hepsini Seç</Label>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            {statusFilterOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {uniqueTags.length > 0 && (
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Etiket" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Tüm Etiketler</SelectItem>
                                {uniqueTags.map(tag => (
                                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Tarih" />
                        </SelectTrigger>
                        <SelectContent>
                            {dateFilterOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Sıralama" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">En Yeni</SelectItem>
                            <SelectItem value="oldest">En Eski</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div >

            {/* Bulk Actions - Only visible in list mode or handled differently? Let's keep consistent */}
            {
                selectedIds.size > 0 && viewMode === 'list' && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-medium ml-2">{selectedIds.size} öğe seçildi</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto">
                                    Durum Değiştir <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {statusOptions.map((status) => (
                                    <DropdownMenuItem key={status.value} onClick={() => handleBulkStatusChange(status.value)}>
                                        {status.label} Yap
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            Sil
                        </Button>
                    </div>
                )
            }

            {/* Content Area */}
            <div className={cn("flex-1 pr-2 pb-10", viewMode === 'list' ? "overflow-y-auto" : "overflow-hidden")}>
                {isLoadingProposals ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : proposals && proposals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-muted/10 border-dashed">
                        <p className="text-muted-foreground mb-4">Henüz hiç teklif oluşturulmamış.</p>
                        <Button onClick={handleOpenNewQuoteDialog}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            İlk Teklifi Oluştur
                        </Button>
                    </div>



                ) : viewMode === 'kanban' ? (
                    <ProposalKanbanBoard
                        proposals={flatFilteredProposals}
                        onStatusChange={handleStatusChange}
                        onViewClick={handleViewClick}
                        onDuplicate={handleDuplicateProposal}
                        onDelete={(id, rootId) => handleDeleteProposal(id, rootId, false)}
                        onPrint={handlePrintProposal}
                    />
                ) : (
                    <>
                        {statusFilter === 'All' ? (
                            <QuoteListGroupedView
                                customerGroups={paginatedCustomerGroups}
                                selectedIds={selectedIds}
                                isRevising={isRevising}
                                onToggleCustomerSelection={onToggleCustomerSelection}
                                onToggleVersionSelection={onToggleVersionSelection}
                                onToggleSingleSelection={toggleSelection}
                                onViewClick={handleViewClick}
                                onStatusChange={handleStatusChange}
                                onDuplicateProposal={handleDuplicateProposal}
                                onCopyProposal={handleOpenCopyDialog}
                                onRenameProposal={(p) => {
                                    setProposalToRename(p as any);
                                    setNewProjectName(p.projectName || '');
                                    setIsRenameDialogOpen(true);
                                }}
                                onDeleteProposal={handleDeleteProposal}
                                onAssignJob={(p) => {
                                    setProposalToAssign(p as any);
                                    setIsAssignJobDialogOpen(true);
                                }}
                                onPrint={handlePrintProposal}
                                statusOptions={statusOptions}
                            />
                        ) : (
                            <QuoteListFlatView
                                proposals={paginatedFlatProposals}
                                selectedIds={selectedIds}
                                isRevising={isRevising}
                                onToggleSelection={toggleSelection}
                                onViewClick={handleViewClick}
                                onDuplicateProposal={handleDuplicateProposal}
                                onPrint={handlePrintProposal}
                                onRenameProposal={(p) => {
                                    setProposalToRename(p as any);
                                    setNewProjectName(p.projectName || '');
                                    setIsRenameDialogOpen(true);
                                }}
                            />
                        )}
                        <div className="mt-4">
                            <PaginationControls />
                        </div>
                    </>
                )}
            </div>
            <AssignJobDialog
                isOpen={isAssignJobDialogOpen}
                onOpenChange={setIsAssignJobDialogOpen}
                proposal={proposalToAssign as any}
                personnelList={personnel}
                onSuccess={() => {
                    setIsAssignJobDialogOpen(false);
                    router.refresh();
                }}
            />

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Projeyi Yeniden Adlandır</DialogTitle>
                        <DialogDescription>
                            Bu teklifin proje adını değiştirmek üzeresiniz.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rename-project-name">Yeni Proje Adı</Label>
                        <Input
                            id="rename-project-name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Örn: Yeni Villa Projesi"
                            className="mt-2"
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameProposal()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleRenameProposal} disabled={isRenaming || !newProjectName.trim()}>
                            {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Güncelle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {
                showProjectCreationDialog && proposalToConvert && (
                    <CreateProjectDialog
                        open={showProjectCreationDialog}
                        onOpenChange={setShowProjectCreationDialog}
                        proposal={proposalToConvert}
                        onConfirm={handleConfirmCreateProject}
                        personnelList={personnel || []}
                    />
                )
            }
            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Teklifi Başka Müşteriye Kopyala</DialogTitle>
                        <DialogDescription>
                            `{proposalToCopy?.quoteNumber}` numaralı teklifi yeni bir müşteriye kopyalamak için hedef müşteriyi seçin.
                            Fiyatlar güncel katalogdan otomatik olarak çekilecektir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="copy-project-name">Yeni Proje Adı</Label>
                            <Input
                                id="copy-project-name"
                                value={copyProjectName}
                                onChange={(e) => setCopyProjectName(e.target.value)}
                                placeholder="Örn: Yeni Villa Projesi"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-search-copy">Hedef Müşteri</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="customer-search-copy"
                                    placeholder="Müşteri adı, e-posta veya telefon ara..."
                                    className="pl-8"
                                    value={customerSearchTerm}
                                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="h-48 rounded-md border">
                                <div className="p-2 space-y-1">
                                    {isLoadingCustomers ? (
                                        <div className="text-center p-4 text-muted-foreground">Müşteriler yükleniyor...</div>
                                    ) : filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => setTargetCustomerId(String(customer.id))}
                                                className={cn(
                                                    "p-2 rounded-md cursor-pointer hover:bg-accent",
                                                    targetCustomerId === String(customer.id) && "bg-primary text-primary-foreground hover:bg-primary/90"
                                                )}
                                            >
                                                <div className="font-semibold">{customer.name}</div>
                                                <div className="text-xs flex items-center gap-2 opacity-80">
                                                    {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /><span>{customer.email}</span></div>}
                                                    {customer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /><span>{customer.phone}</span></div>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground">Müşteri bulunamadı.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">İptal</Button>
                        </DialogClose>
                        <Button onClick={handleCopyProposal} disabled={isSubmitting || !targetCustomerId}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Teklifi Kopyala
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
