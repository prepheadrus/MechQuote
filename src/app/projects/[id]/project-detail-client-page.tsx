
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjectStatusBadge } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Calendar, Building2, TrendingUp, TrendingDown, DollarSign,
    ArrowLeft, Users, FileText, Receipt, Wallet,
    Briefcase, ArrowUpCircle, ArrowDownCircle,
    AlertCircle, CloudOff, Loader2, Printer, History as HistoryIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProject } from "@/actions/projects";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { Edit, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceDetailDialog } from '@/components/invoices/invoice-detail-dialog';
import { TransactionList } from '@/components/projects/transactions/transaction-list';
import { TransactionDialog } from '@/components/projects/transactions/transaction-dialog';
import { ProjectAutopsyView } from '@/components/projects/project-autopsy-view';
import { ProjectTeamManager } from '@/components/projects/project-team-manager';
import { ProjectLifecycleView } from '@/components/projects/project-lifecycle';
import { ProjeDurumu } from '@prisma/client';
import { getProjectStatusLabel } from '@/lib/formatters';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper function
const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount || 0);
};

interface ProjectDetailClientPageProps {
    projectId?: string;
    initialProject?: any | null;
    serverError?: string | null;
    project?: any;
}

export default function ProjectDetailClientPage({ projectId, initialProject, serverError, project: legacyProject }: ProjectDetailClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

    // Invoice Detail Dialog State
    const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = React.useState(false);

    const project = initialProject;

    if (!project && !serverError) {
        return <div className="p-10 text-center">Yükleniyor...</div>;
    }

    if (!project) {
        return (
            <div className="container mx-auto py-10">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{serverError || 'Proje bulunamadı.'}</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </div>
        );
    }

    const financials = project.financials || {
        contractAmount: project.contractAmount || project.budget || 0,
        invoicedIncome: 0,
        grossCost: 0,
        returnedAmount: 0,
        netCost: 0,
        profit: 0,
        margin: 0
    };

    const team = project.team || [];
    const invoices = project.invoices || [];
    const proposals = project.proposals || [];
    const transactions = project.transactions || project.expenses || [];

    // Cash Summary
    const cashIncome = transactions.filter((t: any) => t.type === 'Income').reduce((sum: number, t: any) => sum + t.amount, 0);
    const cashExpense = transactions.filter((t: any) => t.type !== 'Income').reduce((sum: number, t: any) => sum + t.amount, 0);
    const cashBalance = cashIncome - cashExpense;

    // Helper to format date
    const formatDate = (date: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleUpdateProject = async (data: any) => {
        try {
            const result = await updateProject(project.id, data);

            if (result.success) {
                toast({ title: "Başarılı", description: "Proje bilgileri güncellendi." });
                router.refresh();
                setIsEditDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Güncelleme başarısız." });
            }
        } catch (error) {
            console.error("Update failed", error);
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        }
    };

    const handleQuickStatusUpdate = async (newStatus: ProjeDurumu) => {
        try {
            const result = await updateProject(project.id, { status: newStatus });
            if (result.success) {
                toast({ title: "Durum Güncellendi", description: `Yeni Aşama: ${getProjectStatusLabel(newStatus)}` });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "Güncelleme başarısız." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        }
    };

    const handlePrintProposal = (e: React.MouseEvent, proposalId: string) => {
        e.stopPropagation();
        window.open(`/quotes/${proposalId}/print?customerId=${project.customerId}`, '_blank');
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Building2 className="h-4 w-4" />
                            <span>{project.customerName || project.customer?.name}</span>
                            <span className="text-gray-300">|</span>
                            {getProjectStatusBadge(project.status)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Related Proposal Info */}
                    {project.proposals && project.proposals.length > 0 && (
                        <div className="bg-muted px-3 py-1 rounded text-xs flex flex-col items-end">
                            <span className="font-semibold text-primary/80">
                                {project.proposals[0].quoteNumber}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                                {new Date(project.proposals[0].createdAt).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                    )}

                    {/* Add actions like Edit Project here if needed */}
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Düzenle
                    </Button>
                </div>
            </div>

            <EditProjectDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                project={project}
                onConfirm={handleUpdateProject}
            />

            {/* Financial Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Contract Amount */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Proje Bedeli</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(financials.contractAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            {project.contractAmount > 0 ? 'Sözleşme Tutarı' : (project.budget > 0 ? 'Manuel Bütçe' : 'Onaylanan Teklifler')}
                        </p>
                    </CardContent>
                </Card>

                {/* Invoiced Income */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturalanan Gelir</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(financials.invoicedIncome.net)}</div>
                        <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-1">
                            <span>Sözleşme Tutarı (KDV Hariç)</span>
                            <span className="opacity-80">
                                KDV: {formatCurrency(financials.invoicedIncome.tax)} | Toplam: {formatCurrency(financials.invoicedIncome.total)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Actual Cost */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gerçekleşen Maliyet</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(financials.netCost.net)}</div>
                        <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-1">
                            <span>Net Maliyet (KDV Hariç)</span>
                            <span className="opacity-80">
                                KDV: {formatCurrency(financials.netCost.tax)} | Toplam: {formatCurrency(financials.netCost.total)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Profit */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Karlılık</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", financials.profit.net >= 0 ? "text-blue-600" : "text-red-600")}>
                            {formatCurrency(financials.profit.net)}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-1">
                            <span>Kar Marjı: %{financials.margin.toFixed(1)}</span>
                            <span className="opacity-80">
                                Nakit Akışı: {formatCurrency(financials.profit.total)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <div className="border-b mb-1 overflow-x-auto overflow-y-hidden no-scrollbar">
                    <TabsList className="h-11 w-full justify-start bg-transparent p-0 gap-6 rounded-none">
                        <TabsTrigger
                            value="overview"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11"
                        >
                            Genel Bakış
                        </TabsTrigger>
                        <TabsTrigger
                            value="lifecycle"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11"
                        >
                            Proje Akışı
                        </TabsTrigger>
                        <TabsTrigger
                            value="team"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11 gap-1.5"
                        >
                            <Users className="h-3.5 w-3.5" />
                            Ekip
                        </TabsTrigger>
                        <TabsTrigger
                            value="invoices"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11"
                        >
                            Faturalar
                        </TabsTrigger>
                        <TabsTrigger
                            value="transactions"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11"
                        >
                            Kasa
                        </TabsTrigger>
                        <TabsTrigger
                            value="proposals"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11"
                        >
                            Teklifler
                        </TabsTrigger>
                        <TabsTrigger
                            value="autopsy"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-1 h-11 opacity-50"
                        >
                            Otopsi
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* LIFECYCLE TAB */}
                <TabsContent value="lifecycle" className="pt-4">
                    <ProjectLifecycleView
                        projectId={project.id}
                        currentStatus={project.status}
                        history={project.statusHistory || []}
                    />
                </TabsContent>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Project Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Proje Bilgileri</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground mb-1">Başlangıç Tarihi</div>
                                        <div className="font-medium flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(project.startDate)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground mb-1">Bitiş Tarihi</div>
                                        <div className="font-medium flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(project.endDate)}
                                        </div>
                                    </div>
                                    {project.address && (
                                        <div className="col-span-2">
                                            <div className="text-muted-foreground mb-1">Adres/Lokasyon</div>
                                            <div className="font-medium">{project.address}</div>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <div className="text-muted-foreground mb-1">Açıklama</div>
                                        <div className="text-sm">{project.description || '-'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Team */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle>Çalışan Ekip</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <ProjectTeamList projectId={project.id} simple />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TEAM TAB */}
                <TabsContent value="team" className="pt-4">
                    <ProjectTeamManager projectId={project.id} />
                </TabsContent>

                {/* AUTOPSY TAB */}
                <TabsContent value="autopsy" className="pt-4">
                    <ProjectAutopsyView projectId={project.id} />
                </TabsContent>

                {/* INVOICES TAB */}
                <TabsContent value="invoices" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bağlı Faturalar</CardTitle>
                            <CardDescription>Bu proje ile ilişkilendirilmiş tüm faturalar</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground max-w-[100px]">Tarih</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Fatura No</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Tip</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Tutar</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices && invoices.length > 0 ? (
                                            invoices.map((inv: any) => (
                                                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative" onClick={async () => {
                                                    // Set partial data first for immediate feedback
                                                    setSelectedInvoice(inv);

                                                    // Ideally we show a loading state
                                                    // But for now let's just fetch and update
                                                    try {
                                                        const { getInvoice } = await import('@/actions/invoices');
                                                        const result = await getInvoice(inv.id);

                                                        if (result.success) {
                                                            setSelectedInvoice(result.data);
                                                            setIsInvoiceDialogOpen(true);
                                                        } else {
                                                            toast({ title: "Hata", description: "Fatura detayları yüklenemedi.", variant: "destructive" });
                                                        }
                                                    } catch (error) {
                                                        console.error(error);
                                                        toast({ title: "Hata", description: "Bir hata oluştu.", variant: "destructive" });
                                                    }
                                                }}>
                                                    <td className="p-4 text-sm">{formatDate(inv.invoiceDate)}</td>
                                                    <td className="p-4 text-sm font-medium">{inv.invoiceNumber}</td>
                                                    <td className="p-4 text-sm text-muted-foreground">{inv.companyName || '-'}</td>
                                                    <td className="p-4">
                                                        <Badge variant="outline" className={cn(
                                                            "text-xs font-normal border-opacity-50",
                                                            inv.type === 'Outgoing' ? 'border-green-500 text-green-700 bg-green-50' :
                                                                inv.type === 'Incoming' ? 'border-red-500 text-red-700 bg-red-50' :
                                                                    'border-orange-500 text-orange-700 bg-orange-50'
                                                        )}>
                                                            {inv.type === 'Outgoing' ? 'Satış' :
                                                                inv.type === 'Incoming' ? 'Alış' : 'İade'}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="font-bold font-mono text-sm">{formatCurrency(inv.projectAmount.net)}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                KDV: {formatCurrency(inv.projectAmount.tax)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs text-muted-foreground">{inv.status}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                    Bu projeye bağlı fatura bulunmuyor.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Invoice Detail Dialog */}
                    {selectedInvoice && (
                        <InvoiceDetailDialog
                            invoice={selectedInvoice}
                            open={isInvoiceDialogOpen}
                            onOpenChange={setIsInvoiceDialogOpen}
                            trigger={null} // Pass null to hide the default trigger button
                        />
                    )}
                </TabsContent>

                {/* TRANSACTIONS TAB */}
                <TabsContent value="transactions" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Card className="bg-green-50/50 border-green-100">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium text-green-700">Toplam Nakit Gelir</div>
                                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="text-2xl font-bold text-green-800 mt-2">{formatCurrency(cashIncome)}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50/50 border-red-100">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium text-red-700">Toplam Nakit Gider</div>
                                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="text-2xl font-bold text-red-800 mt-2">{formatCurrency(cashExpense)}</div>
                            </CardContent>
                        </Card>
                        <Card className={cn(
                            "border-opacity-50",
                            cashBalance >= 0 ? "bg-blue-50/50 border-blue-100" : "bg-orange-50/50 border-orange-100"
                        )}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <div className={cn("text-sm font-medium", cashBalance >= 0 ? "text-blue-700" : "text-orange-700")}>Kasa Bakiyesi</div>
                                    <Wallet className={cn("h-4 w-4", cashBalance >= 0 ? "text-blue-600" : "text-orange-600")} />
                                </div>
                                <div className={cn("text-2xl font-bold mt-2", cashBalance >= 0 ? "text-blue-800" : "text-orange-800")}>{formatCurrency(cashBalance)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle>Kasa İşlemleri</CardTitle>
                                <CardDescription>Projeye ait gayriresmi gelir ve giderler (nakit, avans vb.)</CardDescription>
                            </div>
                            {projectId && <TransactionDialog projectId={projectId} />}
                        </CardHeader>
                        <CardContent>
                            {projectId && <TransactionList transactions={transactions} projectId={projectId} />}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STATEMENT TAB */}
                <TabsContent value="statement" className="pt-4">
                    <Card id="project-statement">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle>Proje Ekstresi</CardTitle>
                                <CardDescription>Projeye ait tüm finansal hareketlerin kronolojik dökümü</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                const printContent = document.getElementById('project-statement-table');
                                if (printContent) {
                                    const win = window.open('', '_blank');
                                    if (win) {
                                        win.document.write(`
                                            <html>
                                                <head>
                                                    <title>Proje Ekstresi - ${project.name}</title>
                                                    <style>
                                                        body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                                                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                                        th { background-color: #f5f5f5; }
                                                        .text-right { text-align: right; }
                                                        .income { color: green; }
                                                        .expense { color: red; }
                                                        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="header">
                                                        <div>
                                                            <h1>${project.name}</h1>
                                                            <p>Müşteri: ${project.customerName || project.customer?.name}</p>
                                                        </div>
                                                        <div class="text-right">
                                                            <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                                                            <p>Toplam Proje Bedeli: ${formatCurrency(financials.contractAmount)}</p>
                                                        </div>
                                                    </div>
                                                    ${printContent.outerHTML}
                                                </body>
                                            </html>
                                        `);
                                        win.document.close();
                                        setTimeout(() => {
                                            win.print();
                                        }, 500);
                                    }
                                }
                            }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Ekstre Yazdır
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden" id="project-statement-table">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Tarih</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Açıklama</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Referans</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Gelir / Tahakkuk</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Gider / Harcama</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground font-bold">Bakiye</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const items: any[] = [];

                                            // 1. Opening Balance (Target Revenue) - INFO ONLY, doesn't impact cash balance
                                            items.push({
                                                date: new Date(new Date(project.startDate || project.createdAt).getTime() - 1000), // 1 sec before for sorting
                                                description: 'Açılış Bakiyesi (SÖZLEŞME BEDELİ)',
                                                reference: proposals.length > 0 ? proposals[0].quoteNumber : 'SÖZLEŞME',
                                                type: 'Opening',
                                                income: financials.contractAmount,
                                                expense: 0,
                                                impact: 'none' // Changed from 'plus' to 'none' for Option A
                                            });

                                            // 2. Invoices
                                            invoices.forEach((inv: any) => {
                                                if (inv.type === 'Incoming') {
                                                    items.push({
                                                        date: inv.invoiceDate,
                                                        description: `Alış Faturası: ${inv.companyName}`,
                                                        reference: inv.invoiceNumber,
                                                        type: 'Invoice-In',
                                                        income: 0,
                                                        expense: inv.projectAmount.net,
                                                        impact: 'minus'
                                                    });
                                                } else if (inv.type === 'Outgoing') {
                                                    items.push({
                                                        date: inv.invoiceDate,
                                                        description: `Satış Faturası (Hakediş): ${inv.companyName}`,
                                                        reference: inv.invoiceNumber,
                                                        type: 'Invoice-Out',
                                                        income: inv.projectAmount.net,
                                                        expense: 0,
                                                        impact: 'none' // List only, already covered by Opening Contract
                                                    });
                                                }
                                            });

                                            // 3. Transactions (Excluding synced labor to avoid double counting)
                                            transactions.forEach((t: any) => {
                                                if (t.category === 'Personel Ödemesi') return; // Handled by Labor loop below

                                                items.push({
                                                    date: t.date,
                                                    description: t.description || t.category || (t.type === 'Income' ? 'Gelir' : 'Gider'),
                                                    reference: t.category || (t.type === 'Income' ? 'TAHSİLAT' : 'KASA ÇIKIŞ'),
                                                    type: t.type === 'Income' ? 'Collection' : 'Cash',
                                                    income: t.type === 'Income' ? t.amount : 0,
                                                    expense: t.type !== 'Income' ? t.amount : 0,
                                                    impact: t.type === 'Income' ? 'plus' : 'minus' // Changed Income impact to 'plus'
                                                });
                                            });

                                            // 4. Labor Payments (Directly from Job Assignments)
                                            proposals.forEach((prop: any) => {
                                                if (prop.jobAssignments) {
                                                    prop.jobAssignments.forEach((ja: any) => {
                                                        if (ja.paymentHistory) {
                                                            try {
                                                                const history = typeof ja.paymentHistory === 'string' ? JSON.parse(ja.paymentHistory) : ja.paymentHistory;
                                                                if (Array.isArray(history)) {
                                                                    history.forEach((pay: any) => {
                                                                        items.push({
                                                                            date: pay.date,
                                                                            description: `Ekip Ödemesi: ${ja.personnel?.name || 'Personel'}${(pay.note ? ` (${pay.note})` : '')}`,
                                                                            reference: prop.quoteNumber,
                                                                            type: 'Labor',
                                                                            income: 0,
                                                                            expense: pay.amount,
                                                                            impact: 'minus'
                                                                        });
                                                                    });
                                                                }
                                                            } catch (e) { }
                                                        }
                                                    });
                                                }
                                            });

                                            // Sort: Opening Balance First, then Chronological
                                            items.sort((a, b) => {
                                                if (a.type === 'Opening') return -1;
                                                if (b.type === 'Opening') return 1;

                                                const timeA = new Date(a.date).getTime();
                                                const timeB = new Date(b.date).getTime();
                                                return timeA - timeB;
                                            });

                                            // Running Balance
                                            let currentBalance = 0;
                                            return items.map((item, idx) => {
                                                if (item.impact === 'plus') currentBalance += item.income;
                                                if (item.impact === 'minus') currentBalance -= item.expense;

                                                return (
                                                    <tr key={idx} className={cn(
                                                        "border-b last:border-0 hover:bg-muted/10 transition-colors",
                                                        item.type === 'Opening' && "bg-muted/30 font-semibold"
                                                    )}>
                                                        <td className="p-4 whitespace-nowrap">{formatDate(item.date)}</td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{item.description}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase opacity-70">
                                                                    {item.type === 'Cash' ? 'Nakit İşlem' :
                                                                        item.type === 'Invoice-In' ? 'Tedarikçi Faturası' :
                                                                            item.type === 'Invoice-Out' ? 'Müşteri Faturası' :
                                                                                item.type === 'Labor' ? 'Ekip Ödemesi' :
                                                                                    item.type === 'Collection' ? 'Tahsilat' : 'Açılış'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-[10px]">{item.reference}</td>
                                                        <td className="p-4 text-right text-green-600">
                                                            {item.income > 0 ? formatCurrency(item.income) : '-'}
                                                        </td>
                                                        <td className="p-4 text-right text-red-600">
                                                            {item.expense > 0 ? formatCurrency(item.expense) : '-'}
                                                        </td>
                                                        <td className={cn(
                                                            "p-4 text-right font-bold",
                                                            currentBalance >= 0 ? "text-blue-700" : "text-red-700"
                                                        )}>
                                                            {formatCurrency(currentBalance)}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PROPOSALS TAB */}
                <TabsContent value="proposals" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bağlı Teklifler</CardTitle>
                            <CardDescription>Bu proje için hazırlanan teklifler</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Tarih</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Teklif No</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Tutar</th>
                                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {proposals && proposals.length > 0 ? (
                                            proposals.map((prop: any) => (
                                                <tr
                                                    key={prop.id}
                                                    className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative"
                                                    onClick={() => router.push(`/quotes/${prop.id}`)}
                                                >
                                                    <td className="p-4">{formatDate(prop.createdAt)}</td>
                                                    <td className="p-4 font-medium">{prop.quoteNumber}</td>
                                                    <td className="p-4 text-right font-mono">
                                                        {formatCurrency(prop.totalAmount)}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handlePrintProposal(e, prop.id)} title="Yazdır">
                                                                <Printer className="h-4 w-4" />
                                                            </Button>
                                                            <Badge variant={
                                                                prop.status === 'Approved' ? 'default' :
                                                                    prop.status === 'Rejected' ? 'destructive' : 'secondary'
                                                            }>
                                                                {prop.status === 'Approved' ? 'Onaylandı' :
                                                                    prop.status === 'Rejected' ? 'Reddedildi' : 'Taslak/Gönderildi'}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                    Bu projeye bağlı teklif bulunmuyor.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
// Sub-component for fetching team
function ProjectTeamList({ projectId, simple = false }: { projectId?: string, simple?: boolean }) {
    const [team, setTeam] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        async function fetchTeam() {
            try {
                const { getProjectTeam } = await import('@/actions/projects');
                const res = await getProjectTeam(projectId!);
                if (res.success && res.data) {
                    // Deduplicate by ID just in case
                    const uniqueTeam = new Map();
                    res.data.forEach((m: any) => {
                        if (m.id) uniqueTeam.set(m.id, m);
                    });
                    setTeam(Array.from(uniqueTeam.values()));
                }
            } catch (e: any) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchTeam();
    }, [projectId]);

    const formatDateLocal = (date: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) return <div className="text-sm text-muted-foreground py-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline mr-1" />Ekip bilgileri yükleniyor...</div>;

    if (team.length === 0) {
        return (
            <div className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg bg-muted/10">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Atanmış personel bulunamadı.
            </div>
        );
    }

    if (simple) {
        return (
            <div className="space-y-3">
                {team.map((member: any) => {
                    const totalPaid = member.paymentHistory?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
                    const progress = Math.min((totalPaid / (member.assignedAmount || 1)) * 100, 100);
                    const lastPayment = member.paymentHistory && member.paymentHistory.length > 0
                        ? member.paymentHistory[member.paymentHistory.length - 1]
                        : null;

                    return (
                        <div key={member.id} className="group relative p-3 rounded-xl border border-primary/5 bg-gradient-to-br from-background to-muted/20 hover:to-primary/5 transition-all duration-300 shadow-sm hover:shadow-md">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className={cn(
                                            "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background",
                                            member.paymentStatus === 'Ödendi' ? "bg-green-500" :
                                                member.paymentStatus === 'Kısmi Ödendi' ? "bg-amber-500" : "bg-slate-300"
                                        )} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-foreground/90 leading-tight">{member.name}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{member.role}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-primary">{formatCurrency(member.assignedAmount)}</div>
                                    <div className="text-[9px] text-muted-foreground font-medium">{formatDateLocal(member.assignedAt)}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-medium">
                                    <span className="text-muted-foreground">Ödeme İlerlemesi</span>
                                    <span className={cn(progress === 100 ? "text-green-600" : "text-primary")}>
                                        {formatCurrency(totalPaid)} (%{Math.round(progress)})
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-muted-foreground/5">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500 ease-out rounded-full",
                                            progress === 100 ? "bg-green-500" : "bg-primary"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                {lastPayment ? (
                                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-muted-foreground/20">
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1 italic">
                                            <HistoryIcon className="h-2.5 w-2.5" /> Son: {formatDateLocal(lastPayment.date)}
                                        </span>
                                        <span className="text-[9px] font-bold text-green-600/80">+{formatCurrency(lastPayment.amount)}</span>
                                    </div>
                                ) : (
                                    <div className="text-[9px] text-muted-foreground h-4 flex items-center italic">Henüz ödeme yapılmadı</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((member: any) => {
                const totalPaid = member.paymentHistory?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
                const remaining = member.assignedAmount - totalPaid;

                return (
                    <Card key={member.id} className="overflow-hidden border-primary/10 hover:border-primary/30 transition-all shadow-sm">
                        <CardHeader className="p-4 pb-2 bg-muted/30">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{member.name}</CardTitle>
                                        <CardDescription className="text-xs uppercase">{member.role}</CardDescription>
                                    </div>
                                </div>
                                <Badge variant={member.paymentStatus === 'Ödendi' ? 'default' : 'outline'}>
                                    {member.paymentStatus || 'Beklemede'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Anlaşma Tarihi</div>
                                    <div className="flex items-center gap-1.5 mt-0.5 font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-primary/60" />
                                        {formatDateLocal(member.assignedAt)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Toplam Hakediş</div>
                                    <div className="text-base font-bold text-primary mt-0.5">{formatCurrency(member.assignedAmount)}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-green-600 font-medium h-5">
                                        <ArrowUpCircle className="h-3.5 w-3.5" />
                                        <span>Ödenen Tutar:</span>
                                    </div>
                                    <span className="font-mono font-semibold">{formatCurrency(totalPaid)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-1">
                                    <div className="flex items-center gap-1.5 text-red-600 font-medium h-5">
                                        <ArrowDownCircle className="h-3.5 w-3.5" />
                                        <span>Kalan Borç:</span>
                                    </div>
                                    <span className="font-mono font-bold text-red-600 underline underline-offset-4 decoration-red-200">{formatCurrency(remaining)}</span>
                                </div>

                                {member.paymentHistory && member.paymentHistory.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-dashed">
                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                                            <HistoryIcon className="h-3 w-3" /> Son Ödemeler
                                        </div>
                                        <div className="space-y-1">
                                            {member.paymentHistory.slice(-2).reverse().map((p: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-[11px] bg-muted/50 p-1 rounded px-2">
                                                    <span>{new Date(p.date).toLocaleDateString('tr-TR')}</span>
                                                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// End of file

// End of file
