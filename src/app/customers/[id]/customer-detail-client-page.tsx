
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Proposal } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, Phone, MapPin, FileText, DollarSign, CheckSquare, TrendingUp, Copy, History, User, Building2, Wallet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { QuickAddCustomer } from '@/components/app/quick-add-customer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Briefcase, ReceiptText } from 'lucide-react';
import { CustomerInteractionLog } from '../components/customer-interaction-log';
import { TransactionHistory } from '../components/transaction-history';
import { CustomerStatementView } from '../components/customer-statement-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { availableTags, getTagClassName } from '@/lib/tags';
import { cn } from '@/lib/utils';
import { getStatusBadge, formatCurrency, formatDate, getProjectStatusBadge } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';

// --- Type Definitions ---
// Customer type from @/db

const StatCard = ({ title, value, icon, description, isLoading, valueColor }: { title: string, value: string | number, icon: React.ReactNode, description?: string, isLoading: boolean, valueColor?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? <div className="h-8 w-1/2 bg-gray-200 animate-pulse rounded-md" /> : <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>}
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

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


interface CustomerDetailClientPageProps {
  initialCustomer?: any; // From Prisma (Server)
}

export function CustomerDetailClientPage({ initialCustomer }: CustomerDetailClientPageProps) {
  const router = useRouter();
  const customer = initialCustomer;

  if (!customer) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Müşteri Bulunamadı</h1>
        <p className="text-muted-foreground">Aradığınız müşteri mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/customers')}>
          <ArrowLeft className="mr-2" /> Müşteri Listesine Geri Dön
        </Button>
      </div>
    );
  }

  const proposals = customer.proposals || [];
  const projects = customer.projects || [];

  // --- Memoized Calculations ---
  const { stats, proposalGroups } = useMemo(() => {
    if (!proposals) return { stats: {}, proposalGroups: [] };

    // Proposal type mismatch handling
    const approvedProposals = proposals.filter((p: any) => p.status === 'Approved');

    // FIX: Calculate Volume based on Contract Amount for Projects (Realized Volume)
    const validProjects = projects.filter((p: any) => p.status !== 'IPTAL_EDILDI' && p.status !== 'Cancelled');
    const projectVolume = validProjects.reduce((sum: number, p: any) => sum + (p.contractAmount || 0), 0);

    // Standalone proposals (Approved but not converted to project yet)
    const standaloneApprovedProposals = approvedProposals.filter((p: any) => !p.projectId);
    const standaloneVolume = standaloneApprovedProposals.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);

    const totalApprovedVolume = projectVolume + standaloneVolume;
    const approvedProposalsCount = validProjects.length + standaloneApprovedProposals.length;

    // Pending Proposals (Draft, Sent etc.)
    const pendingProposals = proposals.filter((p: any) => !['Approved', 'Rejected', 'Cancelled', 'Reddedildi', 'İptal'].includes(p.status));
    const pendingVolume = pendingProposals.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
    const pendingCount = pendingProposals.length;

    const groups: Record<string, Proposal[]> = {};
    proposals.forEach((p: Proposal) => {
      if (!p.rootProposalId) return;
      if (!groups[p.rootProposalId]) {
        groups[p.rootProposalId] = [];
      }
      groups[p.rootProposalId].push(p);
    });

    const sortedGroups = Object.values(groups).map((versions: Proposal[]) => {
      versions.sort((a, b) => (b.version || 0) - (a.version || 0));
      return versions;
    }).sort((a, b) => {
      const timeA = a[0]?.createdAt;
      const timeB = b[0]?.createdAt;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeB.getTime() - timeA.getTime();
    });

    return {
      stats: {
        totalPotentialVolume: totalApprovedVolume + pendingVolume,
        totalApprovedVolume,
        totalProposals: proposals.length,
        approvedProposalsCount,
        pendingVolume,
        pendingCount
      },
      proposalGroups: sortedGroups
    };

  }, [proposals]);

  // Safe Address Accessor
  const validAddress = useMemo(() => {
    if (!customer?.address) return {};
    let addr: any = customer.address;
    if (typeof addr === 'object' && addr !== null) {
      return addr;
    }
    if (typeof addr === 'string') {
      if (!addr.trim().startsWith('{')) return { street: addr };
      try {
        return JSON.parse(addr);
      } catch (error) {
        return { street: addr };
      }
    }
    return {};
  }, [customer]);

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/customers')}>
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{safeRender(customer.name)}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={customer.status === 'Aktif' ? 'default' : 'secondary'} className={customer.status === 'Aktif' ? 'bg-green-600' : ''}>
                  {safeRender(customer.status)}
                </Badge>
                <span>•</span>
                <span>{customer.taxId ? `VKN: ${customer.taxId}` : 'VKN Girilmemiş'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push(`/quotes?dialog=open&customerId=${customer.id}`)}>
              <FileText className="mr-2 h-4 w-4" /> Yeni Teklif
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Toplam Bakiye"
            value={formatCurrency(customer.balance || 0)}
            valueColor={(customer.balance || 0) > 0 ? "text-red-600" : "text-green-600"}
            description={(customer.balance || 0) > 0 ? "Müşteri Borçlu" : "Alacaklı / Dengede"}
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            isLoading={false}
          />
          <StatCard
            title="Toplam İş Hacmi"
            value={formatCurrency(stats.totalApprovedVolume || 0)}
            description={`${stats.approvedProposalsCount} onaylı iş`}
            icon={<Briefcase className="h-4 w-4 text-blue-500" />}
            isLoading={false}
          />
          <StatCard
            title="Aktif Projeler"
            value={projects.filter((p: any) => [
              'SOZLESME_ASAMASI', 'PROJE_PLANLAMA', 'MALZEME_TEDARIK',
              'SAHA_MOBILIZASYONU', 'MONTAJ_VE_IMALAT', 'TEST_VE_DEVREYE_ALMA'
            ].includes(p.status)).length}
            description="Devam eden şantiye sayısı"
            icon={<Building2 className="h-4 w-4 text-orange-500" />}
            isLoading={false}
          />
          <StatCard
            title="Bekleyen Teklifler"
            value={formatCurrency(stats.pendingVolume)}
            description={`${stats.pendingCount} teklif beklemede`}
            icon={<FileText className="h-4 w-4 text-amber-500" />}
            isLoading={false}
          />
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
            <TabsTrigger value="projects" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none py-2 px-1">
              Projeler & Hakedişler
            </TabsTrigger>
            <TabsTrigger value="finance" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none py-2 px-1">
              Finansal Hareketler (Ekstre)
            </TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none py-2 px-1">
              Teklif Geçmişi
            </TabsTrigger>
            <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none py-2 px-1">
              İletişim & Detaylar
            </TabsTrigger>
          </TabsList>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="space-y-6">
            <div className="flex justify-end">
              <ProjectDialog
                customerId={customer.id}
                onSuccess={() => router.refresh()}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {projects.length > 0 ? (
                projects.map((project: any) => {
                  const totalIncome = project.transactions
                    ? project.transactions.filter((t: any) => t.type === 'Income').reduce((sum: number, t: any) => sum + t.amount, 0)
                    : 0;
                  const contractAmount = project.contractAmount || 0;
                  const progress = contractAmount > 0 ? (totalIncome / contractAmount) * 100 : 0;

                  return (
                    <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getProjectStatusBadge(project.status)}
                              <span className="text-xs text-muted-foreground">{new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg font-bold text-primary mb-1">{project.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{project.description || 'Açıklama yok.'}</p>
                            {project.address && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="h-3 w-3" /> {project.address}</div>}
                          </div>

                          {/* Financial Summary */}
                          <div className="flex-1 md:max-w-md bg-muted/30 p-4 rounded-lg border border-dashed">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Sözleşme Bedeli:</span>
                              <span className="font-semibold">{formatCurrency(contractAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-3">
                              <span className="text-muted-foreground">Tahsil edilen:</span>
                              <span className="text-green-600 font-medium">{formatCurrency(totalIncome)}</span>
                            </div>
                            <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Tahsilat Oranı: %{progress.toFixed(1)}</span>
                              <span>Kalan: {formatCurrency(contractAmount - totalIncome)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Henüz proje bulunmuyor.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* FINANCE TAB (Unified) */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Hesap Ekstresi</CardTitle>
                    <CardDescription>Tüm fatura ve ödeme hareketleri</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CustomerStatementView customerId={customer.id} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Bakiye Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TransactionHistory customerId={customer.id} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* QUOTES TAB */}
          <TabsContent value="quotes">
            <Card>
              <CardHeader className="px-6 py-4 border-b bg-muted/40">
                <CardTitle className="text-base">Teklif Geçmişi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Teklif No</TableHead>
                      <TableHead>Versiyon</TableHead>
                      <TableHead>Proje Adı</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposalGroups.length > 0 ? (
                      proposalGroups.flatMap(group =>
                        group.map((proposal, index) => (
                          <TableRow
                            key={proposal.id}
                            onClick={() => router.push(`/quotes/${proposal.id}`)}
                            className={cn("cursor-pointer hover:bg-muted/30 transition-colors", index > 0 && "bg-slate-50 text-muted-foreground text-xs")}
                          >
                            <TableCell className={cn(index > 0 && "pl-8 text-muted-foreground")}>
                              {index === 0 ? proposal.quoteNumber : <span className="flex items-center gap-1"><History className="h-3 w-3" /> Rev.{proposal.version}</span>}
                            </TableCell>
                            <TableCell>{index === 0 && <Badge variant="outline">Aktif</Badge>}</TableCell>
                            <TableCell>{proposal.projectName}</TableCell>
                            <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                            <TableCell>{formatDate(proposal.createdAt)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(proposal.totalAmount)}</TableCell>
                          </TableRow>
                        ))
                      )
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Teklif bulunamadı.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INFO TAB */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>İletişim ve Firma Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">E-posta</div>
                      <div className="text-sm text-muted-foreground">{safeRender(customer.email)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Telefon</div>
                      <div className="text-sm text-muted-foreground">{safeRender(customer.phone)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Adres</div>
                      <div className="text-sm text-muted-foreground">
                        {validAddress.street ? `${validAddress.street}, ${validAddress.city || ''}` : safeRender(customer.address)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Vergi Dairesi</div>
                      <div className="text-sm text-muted-foreground">{safeRender(customer.taxOffice)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">VKN / TCKN</div>
                      <div className="text-sm text-muted-foreground">{safeRender(customer.taxId)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="mt-8">
              <CustomerInteractionLog customerId={customer.id} />
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
