'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    DollarSign, Users, FileText, Package, Edit, Award, TrendingUp,
    Wallet, PieChart as PieChartIcon, Plus, ArrowRight, Target,
    Activity, AlertTriangle, CheckCircle2, Wand2, Loader2, Bot, X,
    Download, Mail
} from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useWorkspace } from '@/components/workspace/workspace-context';
import {
    ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';

import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getStatusBadge, formatCurrency, formatDate } from '@/lib/formatters';
import { getAvatarFallback } from '@/lib/placeholder-images';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMonthlyTarget } from '@/actions/dashboard-actions';
import { getDashboardAiInsight, sendAiInsightByEmail } from '@/actions/ai-dashboard';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type {
    DashboardPageData,
    TopProduct,
    MonthlyTrendData,
} from '@/components/dashboard/dashboard-view';


// --- Gauge Chart Component ---
const GaugeChart = ({ value, max, label }: { value: number, max: number, label: string }) => {
    const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
    const data = [
        { name: 'Progress', value: percentage },
        { name: 'Remaining', value: 100 - percentage }
    ];
    let color = percentage < 30 ? '#ef4444' : percentage < 70 ? '#eab308' : '#22c55e';

    return (
        <div className="relative flex flex-col items-center justify-center h-[160px]">
            <PieChart width={200} height={100}>
                <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={85} paddingAngle={0} dataKey="value" stroke="none">
                    <Cell fill={color} /><Cell fill="#e2e8f0" />
                </Pie>
            </PieChart>
            <div className="absolute bottom-4 text-center">
                <div className="text-2xl font-bold" style={{ color }}>%{percentage.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon }: any) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtext}</p>
        </CardContent>
    </Card>
);


// --- Main Client Component ---
export default function DashboardClientPage({ data }: { data: DashboardPageData }) {
    const { toast } = useToast();
    const router = useRouter();
    const { openTab } = useWorkspace();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const dateFilter = searchParams.get('filter') || 'thisMonth';
    const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
    const [editingTargetAmount, setEditingTargetAmount] = useState('');

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    const handleAiInsight = async () => {
        setIsAiLoading(true);
        try {
            const keys = {
                gemini: localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('geminiApiKey') || undefined,
                qwen: localStorage.getItem('QWEN_API_KEY') || undefined,
                deepseek: localStorage.getItem('DEEPSEEK_API_KEY') || undefined,
                kimi: localStorage.getItem('KIMI_API_KEY') || undefined
            };
            const result = await getDashboardAiInsight(data, keys);
            if (result.success && result.insight) {
                setAiInsight(result.insight);
                toast({ title: "Zekice Analiz Hazır", description: "Verileriniz yapay zeka tarafından yorumlandı." });
            } else {
                toast({ variant: "destructive", title: "AI Analiz Hatası", description: result.error || "Bilinmeyen bir hata." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Sistem hatası oluştu." });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!aiInsight) return;
        setIsPdfGenerating(true);
        try {
            const response = await fetch('/api/generate-ai-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ insight: aiInsight, stats: data })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AI-Stratejik-Analiz-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast({ title: "PDF Hazır", description: "Rapor başarıyla indirildi." });
            } else {
                throw new Error('PDF üretilemedi');
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "PDF oluşturulurken bir hata oluştu." });
        } finally {
            setIsPdfGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!aiInsight) return;
        setIsEmailSending(true);
        try {
            const result = await sendAiInsightByEmail(aiInsight, data, "yonetim@sirket.com");
            if (result.success) {
                toast({ title: "E-posta Gönderildi", description: result.message });
            } else {
                toast({ variant: "destructive", title: "Gönderim Hatası", description: result.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Sistem hatası oluştu." });
        } finally {
            setIsEmailSending(false);
        }
    };

    const {
        dashboardStats,
        financials,
        topProducts,
        topCustomers,
        monthlyFinancials,
        operationalStats,
        monthlyTarget,
        lastActivities,
        lowStockAlerts,
        proposalReminders
    } = data;

    const handleDateFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('filter', value);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleSaveTarget = async () => {
        const amount = parseFloat(editingTargetAmount);
        if (isNaN(amount) || amount < 0) {
            toast({ title: "Hata", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" });
            return;
        }

        const { targetYear, targetMonth } = monthlyTarget;
        const result = await updateMonthlyTarget(targetYear, targetMonth, amount);

        if (result.success) {
            toast({ title: "Başarılı", description: "Aylık hedef güncellendi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsTargetDialogOpen(false);
    };

    const openEditDialog = () => {
        setEditingTargetAmount(monthlyTarget.singleMonthTarget?.toString() || '');
        setIsTargetDialogOpen(true);
    };

    return (
        <div className="flex flex-col flex-1 h-full overflow-y-auto gap-6 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Yönetim Paneli</h1>
                    <p className="text-muted-foreground">İşletmenizin genel durumunu ve performansını buradan takip edin.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Dönem Seçin" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="thisMonth">Bu Ay</SelectItem>
                            <SelectItem value="lastMonth">Geçen Ay</SelectItem>
                            <SelectItem value="thisYear">Bu Yıl</SelectItem>
                            <SelectItem value="all">Tümü</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={handleAiInsight}
                        disabled={isAiLoading}
                        className="gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
                    >
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Zekice Analiz
                    </Button>
                    <Button asChild className="gap-2">
                        <Link href="/quotes?dialog=open">
                            <Plus className="h-4 w-4" /> Yeni Teklif
                        </Link>
                    </Button>
                </div>
            </div>

            {aiInsight && (
                <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-primary" />
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-primary">Yönetici Finansal Özeti (AI)</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10" onClick={() => setAiInsight(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="pb-3 px-4 pt-0">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {aiInsight}
                            </ReactMarkdown>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Gerçek zamanlı mühendislik analizi</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-primary/10">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDownloadPdf}
                                disabled={isPdfGenerating}
                                className="h-7 text-[10px] gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                            >
                                {isPdfGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                PDF Rapor Al
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSendEmail}
                                disabled={isEmailSending}
                                className="h-7 text-[10px] gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                            >
                                {isEmailSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                                Yöneticiye Mail At
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Genel Bakış (Finansal)</TabsTrigger>
                    <TabsTrigger value="proposals">Teklif Analizi</TabsTrigger>
                    <TabsTrigger value="operational">Operasyonel Durum</TabsTrigger>
                    <TabsTrigger value="inventory">Envanter & Stok</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Toplam Gelir (Ciro)" value={formatCurrency(dashboardStats.totalRevenue)} subtext="Fatura + Kasa Girişleri" icon={<DollarSign className="h-4 w-4 text-primary" />} />
                        <StatCard title="Kasa (Tahsil Edilen)" value={formatCurrency(dashboardStats.totalCollected)} subtext="Bankaya giren nakit" icon={<Wallet className="h-4 w-4 text-green-600" />} />
                        <StatCard title="Toplam Gider" value={formatCurrency(dashboardStats.totalExpenses)} subtext="Fatura + Usta + Harcamalar" icon={<TrendingUp className="h-4 w-4 text-red-600" />} />
                        <StatCard title="Net Durum" value={formatCurrency(dashboardStats.netProfit)} subtext="Gelir - Gider" icon={<PieChartIcon className="h-4 w-4 text-blue-600" />} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Proje Sağlık İzleyicisi
                                    </CardTitle>
                                    <CardDescription>Devam eden projelerin bütçe kullanım durumları.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {data.projectHealth && data.projectHealth.length > 0 ? (
                                    data.projectHealth.map((project: any) => (
                                        <div key={project.id} className="space-y-2 cursor-pointer group" onClick={() => openTab(`/projects/${project.id}`, project.name)}>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{project.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{project.customer}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={cn(
                                                        "text-xs font-bold",
                                                        project.status === 'critical' ? "text-red-600" :
                                                            project.status === 'warning' ? "text-amber-600" : "text-green-600"
                                                    )}>
                                                        %{project.percentage.toFixed(1)}
                                                    </span>
                                                    <p className="text-[10px] text-muted-foreground">Bütçe Kullanımı</p>
                                                </div>
                                            </div>
                                            <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "absolute h-full transition-all duration-500",
                                                        project.status === 'critical' ? "bg-red-500" :
                                                            project.status === 'warning' ? "bg-amber-500" : "bg-green-500"
                                                    )}
                                                    style={{ width: `${Math.min(100, project.percentage)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[11px] font-bold mt-1">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground font-medium uppercase text-[9px]">Toplam Harcanan</span>
                                                    <span className="text-red-600">{formatCurrency(project.spent)}</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-muted-foreground font-medium uppercase text-[9px]">Sözleşme Tutarı</span>
                                                    <span className="text-slate-900 dark:text-slate-100">{formatCurrency(project.budget)}</span>
                                                </div>
                                            </div>
                                            <div className="py-1 px-2 mt-1 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Kalan Bütçe</span>
                                                <span className={cn(
                                                    "text-[10px] font-black",
                                                    (project.budget - project.spent) < 0 ? "text-red-600" : "text-emerald-600"
                                                )}>
                                                    {formatCurrency(project.budget - project.spent)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground space-y-2 border-2 border-dashed rounded-xl">
                                        <CheckCircle2 className="h-8 w-8 mx-auto opacity-20" />
                                        <p className="text-sm">Takip edilecek aktif proje bulunmuyor.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader><CardTitle>Son Finansal Aktiviteler</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {dashboardStats.recentInvoices.map((inv: any) => (
                                        <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openTab(`/invoices`, 'Faturalar')}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-full ${inv.type === 'Incoming' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {inv.type === 'Incoming' ? <ArrowRight className="h-3 w-3 rotate-45" /> : <ArrowRight className="h-3 w-3 -rotate-45" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-xs truncate w-[140px]">{inv.customer?.name || inv.senderName || 'Bilinmiyor'}</div>
                                                    <div className="text-[10px] text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-xs">{formatCurrency(inv.totalAmount)}</div>
                                                <Badge variant="outline" className="text-[9px] h-4 px-1">{inv.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                        30 Günlük Nakit Akışı Projeksiyonu
                                    </CardTitle>
                                    <CardDescription>Vadesi gelen faturalara göre beklenen tahsilat ve ödemeler.</CardDescription>
                                </div>
                                <div className="flex gap-4 text-xs font-bold uppercase tracking-tighter">
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Beklenen Tahsilat</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Planlanan Ödemeler</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.forecast}>
                                        <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val: any) => `${val / 1000}k`} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                            formatter={(value: any) => [formatCurrency(value), '']}
                                        />
                                        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Tahsilat" />
                                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Ödeme" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="proposals" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Beklenen Ciro (Teklif)" value={formatCurrency(financials.totalRevenue)} subtext="Onaylanan teklifler" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                        <StatCard title="Potansiyel Kâr" value={formatCurrency(financials.totalProfit)} subtext={`Marj: %${financials.margin.toFixed(1)}`} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
                        <StatCard title="Aktif Cari Hesap" value={topCustomers.length} subtext="Bu dönem işlem yapan" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                        <Card className="flex flex-col justify-center relative overflow-hidden">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 z-10" onClick={openEditDialog}><Edit className="h-4 w-4 text-muted-foreground" /></Button>
                            <CardContent className="p-0 pt-4"><GaugeChart value={monthlyTarget.realizedAmount} max={monthlyTarget.targetAmount} label={monthlyTarget.label} /></CardContent>
                            <div className="text-center pb-4 text-sm text-muted-foreground">Hedef: {formatCurrency(monthlyTarget.targetAmount)} <br />{monthlyTarget.daysLeft > 0 ? `${monthlyTarget.daysLeft} gün kaldı` : "Süre doldu"}</div>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Ciro Trendi</CardTitle>
                                <CardDescription>Son 6 aylık ciro değişimi</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={monthlyFinancials}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${formatCurrency(value)}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                borderColor: 'hsl(var(--border))',
                                            }}
                                            labelStyle={{
                                                fontWeight: 'bold',
                                            }}
                                            formatter={(value: any, name: string) => [formatCurrency(value), name === 'revenue' ? 'Ciro' : 'Kâr']}
                                        />
                                        <Area type="monotone" dataKey="revenue" name="revenue" strokeWidth={2} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                                        <Area type="monotone" dataKey="profit" name="profit" strokeWidth={2} stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>En Çok Satan Ürünler</CardTitle>
                                <CardDescription>Ciro bazlı ilk 5 ürün</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {topProducts.map((product) => (
                                        <div key={product.id} className="flex items-center">
                                            <Avatar className="h-9 w-9"><AvatarFallback>{getAvatarFallback(product.name)}</AvatarFallback></Avatar>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.brand}</p>
                                            </div>
                                            <div className="ml-auto font-medium text-right whitespace-nowrap">{formatCurrency(product.totalRevenue)}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="operational" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Bekleyen Teklifler" value={operationalStats.pendingCount} subtext="Onay bekleyen" icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
                        <StatCard title="Onaylanan" value={operationalStats.approvedCount} subtext="Bu dönem onaylanan" icon={<Award className="h-4 w-4 text-muted-foreground" />} />
                        <StatCard title="Toplam Teklif" value={operationalStats.totalCount} subtext="Dönem içi oluşturulan" icon={<Package className="h-4 w-4 text-muted-foreground" />} />
                        <StatCard title="Kazanma Oranı" value={`%${operationalStats.winRate.toFixed(1)}`} subtext="Onay / (Onay + Ret)" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Son Aktiviteler</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lastActivities.map((proposal: any) => (
                                    <div key={proposal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openTab(`/quotes/${proposal.id}`, `Teklif: ${proposal.quoteNumber}`)}>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-9 w-9 hidden md:flex"><AvatarFallback>{getAvatarFallback(proposal.customerName)}</AvatarFallback></Avatar>
                                            <div className="grid gap-1"><div className="font-medium leading-none text-base">{proposal.customerName}</div><div className="text-xs text-muted-foreground">{proposal.projectName} • {proposal.quoteNumber}</div></div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-sm font-medium">{formatCurrency(proposal.totalAmount)}</div>
                                            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{formatDate(proposal.createdAt)}</span>{getStatusBadge(proposal.status)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="inventory" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Kritik Stok" value={lowStockAlerts.length} subtext="Eşik değerin altında" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
                        <StatCard title="Toplam Ürün" value={operationalStats.totalCount} subtext="Katalogdaki kalem sayısı" icon={<Package className="h-4 w-4 text-muted-foreground" />} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stok Durum Takibi</CardTitle>
                            <CardDescription>Mevcut stok seviyeleri ve kritik uyarılar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {lowStockAlerts.length > 0 ? (
                                    lowStockAlerts.map((product) => {
                                        const percentage = Math.min(100, (product.current / (product.min || 1)) * 100);
                                        return (
                                            <div key={product.id} className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "font-bold",
                                                            product.current <= 0 ? "text-red-600" : "text-amber-600"
                                                        )}>
                                                            {product.current} Birim
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">/ Minimum {product.min}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all",
                                                            percentage < 30 ? "bg-red-500" : "bg-amber-500"
                                                        )}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                        <CheckCircle2 className="h-8 w-8 mx-auto opacity-20 mb-2" />
                                        <p>Tüm stok seviyeleri güvenli aralıkta.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {(lowStockAlerts.length > 0 || proposalReminders.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2 mt-8">
                    {lowStockAlerts.length > 0 && (
                        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    Kritik Stok Uyarıları
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {lowStockAlerts.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded bg-background/50 border border-amber-100 dark:border-amber-900/50">
                                        <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                                        <span className="text-red-600 font-bold">Stok: {item.current} (Kritik: {item.min})</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    {proposalReminders.length > 0 && (
                        <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-400">
                                    <Wand2 className="h-4 w-4" />
                                    Takip Edilmesi Gereken Teklifler
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {proposalReminders.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-xs p-2 rounded bg-background/50 border border-blue-100 dark:border-blue-900/50 cursor-pointer hover:bg-background" onClick={() => openTab(`/quotes/${p.id}`, `Teklif: ${p.number}`)}>
                                        <span className="font-medium truncate max-w-[180px]">{p.customer} ({p.number})</span>
                                        <span className="text-blue-600 font-bold">{p.days} gündür bekliyor</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hedef Düzenle</DialogTitle>
                        <DialogDescription>{monthlyTarget.targetMonth}/{monthlyTarget.targetYear} dönemi için hedeflenen ciro tutarını giriniz.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="target" className="text-right">Hedef Tutar</Label>
                            <Input id="target" type="number" value={editingTargetAmount} onChange={(e) => setEditingTargetAmount(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSaveTarget}>Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
