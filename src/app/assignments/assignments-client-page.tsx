'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  MoreHorizontal,
  ChevronDown,
  ClipboardCheck,
  CircleDollarSign,
  CalendarClock,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarFallback } from '@/lib/placeholder-images';
import { ManagePaymentsDialog } from '@/components/app/manage-payments-dialog';
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/formatters';
import { getJobAssignments, updateJobAssignment, deleteJobAssignment } from '@/actions/job-assignments';
import { JobAssignment } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, X, Trash2 } from 'lucide-react';
import { useAssignments } from '@/hooks/use-assignments';

// --- Types ---
// Personnel and Proposal are imported from @/db now

export type EnrichedJobAssignment = JobAssignment & {
  personnelName: string;
  projectName: string;
  customerName: string;
  totalPaid: number;
  remainingBalance: number;
};

const paymentStatusOptions: JobAssignment['paymentStatus'][] = ['Ödenmedi', 'Kısmi Ödendi', 'Ödendi'];

interface AssignmentsPageContentProps {
  initialAssignments: any[];
  initialPersonnel: any[];
  initialProposals: any[];
}

export function AssignmentsPageContent({
  initialAssignments,
  initialPersonnel,
  initialProposals
}: AssignmentsPageContentProps) {
  const { toast } = useToast();
  
  // React Query ile iş atamalarını çek
  const { 
    assignments: queryAssignments, 
    isLoading: isLoadingQuery,
    deleteAssignment: deleteAssignmentMutation,
  } = useAssignments();
  
  // Fallback: Eğer query boşsa props'tan al (SSR için)
  const assignments = queryAssignments.length > 0 ? queryAssignments : initialAssignments;
  const personnel = initialPersonnel;
  const proposals = initialProposals;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | string>('All');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EnrichedJobAssignment | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  const handleStartEdit = (a: EnrichedJobAssignment) => {
    setEditingId(a.id);
    setEditAmount(a.assignedAmount.toString());
  };

  const handleSaveEdit = async (id: string) => {
    const result = await updateJobAssignment(id, { assignedAmount: parseFloat(editAmount) });
    if (result.success) {
      toast({ title: "Başarılı", description: "Hakediş tutarı güncellendi." });
      setEditingId(null);
    } else {
      toast({ variant: "destructive", title: "Hata", description: result.error });
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Bu iş atamasını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteAssignmentMutation(id);
      toast({ title: "Silindi", description: "İş ataması kaldırıldı." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız." });
    }
  };

  // --- Data Enrichment ---
  const enrichedAssignments = useMemo((): EnrichedJobAssignment[] => {
    if (!assignments || !personnel || !proposals) return [];

    // Create maps for faster lookup - Ensure keys are strings for safe matching
    const personnelMap = new Map(personnel.map(p => [String(p.id), p.name]));
    const proposalMap = new Map(proposals.map(p => [String(p.id), { projectName: p.projectName, customerName: p.customerName }]));

    return assignments.map(assignment => {
      // Ensure IDs are present
      if (!assignment.id) return null;

      const totalPaid = (assignment.paymentHistory || []).reduce((sum: number, p: any) => sum + p.amount, 0);
      const remainingBalance = assignment.assignedAmount - totalPaid;

      return {
        ...assignment,
        personnelName: personnelMap.get(String(assignment.personnelId)) || 'Bilinmeyen Usta',
        projectName: proposalMap.get(String(assignment.proposalId))?.projectName || 'Bilinmeyen Proje',
        customerName: proposalMap.get(String(assignment.proposalId))?.customerName || 'Bilinmeyen Müşteri',
        totalPaid,
        remainingBalance
      };
    }).filter((a): a is EnrichedJobAssignment => a !== null);
  }, [assignments, personnel, proposals]);

  const filteredAssignments = useMemo(() => {
    return enrichedAssignments.filter(a => {
      const searchTerms = searchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const assignmentText = `${a.projectName} ${a.customerName} ${a.personnelName}`.toLocaleLowerCase('tr-TR');
        const isMatch = searchTerms.every(term => assignmentText.includes(term));
        if (!isMatch) return false;
      }

      const statusMatch = statusFilter === 'All' || a.paymentStatus === statusFilter;

      return statusMatch;
    })
  }, [enrichedAssignments, searchTerm, statusFilter]);

  const analytics = useMemo(() => {
    const totalAssignedValue = enrichedAssignments.reduce((sum: number, a: EnrichedJobAssignment) => sum + a.assignedAmount, 0);
    const totalPaid = enrichedAssignments.reduce((sum: number, a: EnrichedJobAssignment) => sum + a.totalPaid, 0);
    const totalOutstanding = totalAssignedValue - totalPaid;
    return { totalAssignedValue, totalPaid, totalOutstanding };
  }, [enrichedAssignments]);

  const handleOpenPaymentDialog = (assignment: EnrichedJobAssignment) => {
    setSelectedAssignment(assignment);
    setIsPaymentDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col flex-1 h-full overflow-y-auto gap-4 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">İş Atamaları & Hakedişler</h2>
            <p className="text-muted-foreground">
              Ustalara atanan işleri ve ödeme durumlarını takip edin.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Hakediş</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{isLoadingQuery ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(analytics.totalAssignedValue)}</div>}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ödenen Toplam</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{isLoadingQuery ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalPaid)}</div>}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen Ödeme</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{isLoadingQuery ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.totalOutstanding)}</div>}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atama Listesi</CardTitle>
            <div className="pt-4 flex justify-between">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Proje, müşteri veya usta adı ara..."
                  className="pl-8 w-96"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Durum: {statusFilter === 'All' ? 'Tümü' : statusFilter} <ChevronDown className="ml-2 h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('All')}>Tümü</DropdownMenuItem>
                  {paymentStatusOptions.map(status => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>{status}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usta</TableHead>
                  <TableHead>Proje / Müşteri</TableHead>
                  <TableHead>Hakediş</TableHead>
                  <TableHead>Ödenen</TableHead>
                  <TableHead>Kalan</TableHead>
                  <TableHead>Ödeme Durumu</TableHead>
                  <TableHead className="text-right">Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingQuery ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredAssignments.length > 0 ? (
                  filteredAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getAvatarFallback(a.personnelName)}
                            </AvatarFallback>
                          </Avatar>
                          {a.personnelName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.projectName}</div>
                        <div className="text-sm text-muted-foreground">{a.customerName}</div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {editingId === a.id ? (
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 h-8"
                          />
                        ) : (
                          formatCurrency(a.assignedAmount)
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-green-600">{formatCurrency(a.totalPaid)}</TableCell>
                      <TableCell className="font-mono font-bold text-red-600">{formatCurrency(a.remainingBalance)}</TableCell>
                      <TableCell>{getStatusBadge(a.paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === a.id ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(a.id)} className="h-8 w-8 text-green-600"><Save className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8 text-red-600"><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleOpenPaymentDialog(a)}>
                                <Wallet className="mr-2 h-4 w-4" />
                                Ödemeler
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleStartEdit(a)}><Edit className="mr-2 h-4 w-4" /> Hakedişi Düzenle</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteAssignment(a.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Atamayı Sil</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Henüz iş ataması yapılmamış.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <ManagePaymentsDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        assignment={selectedAssignment}
        onSuccess={() => {
          // React Query otomatik invalidate eder
        }}
      />
    </>
  );
}
