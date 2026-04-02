'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, Loader2, Eye, AlertTriangle, HardHat, MoreHorizontal, ChevronDown, Users, FileText, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarFallback } from '@/lib/placeholder-images';
import { getStatusBadge, formatCurrency, formatDate } from '@/lib/formatters';
import type { CustomerProposalGroup, ProposalGroup } from '@/app/quotes/quotes-client-page';
import { Proposal } from '@prisma/client';
import { CustomerDetailDialog } from '@/components/app/customers/customer-detail-dialog';

import { useWorkspace } from '@/components/workspace/workspace-context';

export interface QuoteListGroupedViewProps {
  customerGroups: CustomerProposalGroup[];
  selectedIds: Set<string>;
  isRevising: string | null;
  onToggleCustomerSelection: (customerGroup: CustomerProposalGroup, isChecked: boolean) => void;
  onToggleVersionSelection: (group: ProposalGroup, isChecked: boolean) => void;
  onToggleSingleSelection: (id: string, isChecked: boolean) => void;
  onViewClick: (e: React.MouseEvent, id: string) => void;
  onStatusChange: (proposalId: string, newStatus: Proposal['status']) => void;
  onDuplicateProposal: (proposal: Proposal) => void;
  onCopyProposal: (proposal: Proposal) => void;
  onDeleteProposal: (id: string, rootId: string, isGroupDelete: boolean) => void;
  onAssignJob: (proposal: Proposal) => void;
  onPrint: (proposal: Proposal) => void;
  onRenameProposal: (proposal: Proposal) => void;
  statusOptions: { label: string; value: Proposal['status'] }[];
}

// Helper to generate consistent pastel colors from strings
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
};

export function QuoteListGroupedView({
  customerGroups,
  selectedIds,
  isRevising,
  onToggleCustomerSelection,
  onToggleVersionSelection,
  onToggleSingleSelection,
  onViewClick,
  onStatusChange,
  onDuplicateProposal,
  onCopyProposal,
  onDeleteProposal,
  onAssignJob,
  onPrint,
  onRenameProposal,
  statusOptions
}: QuoteListGroupedViewProps) {
  const { openTab } = useWorkspace();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {customerGroups && customerGroups.length > 0 ? (
        customerGroups.map((customerGroup, index) => {
          if (!customerGroup) return null;
          const customerColor = stringToColor(customerGroup.customerName || 'default');
          const proposalGroups = customerGroup.proposalGroups || [];
          const totalProjects = proposalGroups.length;
          const totalRevisions = proposalGroups.reduce((acc, pg) => acc + (pg.versions?.length || 0), 0);

          const proposalIdsInCustomerGroup: string[] = [];
          proposalGroups.forEach(pg => {
            pg.versions?.forEach(v => {
              if (v.id) proposalIdsInCustomerGroup.push(v.id);
            });
          });

          const selectedInGroupCount = proposalIdsInCustomerGroup.filter(id => selectedIds.has(id)).length;
          const allInCustomerGroupSelected = proposalIdsInCustomerGroup.length > 0 && selectedInGroupCount === proposalIdsInCustomerGroup.length;
          const someInCustomerGroupSelected = selectedInGroupCount > 0 && !allInCustomerGroupSelected;

          return (
            <Collapsible key={customerGroup.customerId || `customer-group-${index}`} asChild>
              <div className="border-b bg-white dark:bg-slate-950">
                <div
                  className="flex items-center py-2 px-3 bg-slate-50 dark:bg-slate-900 border-l-[6px] transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  style={{ borderLeftColor: customerColor }}
                >
                  <div className="px-2">
                    <Checkbox
                      checked={allInCustomerGroupSelected}
                      onCheckedChange={(checked) => onToggleCustomerSelection(customerGroup, !!checked)}
                      data-state={someInCustomerGroupSelected ? 'indeterminate' : (allInCustomerGroupSelected ? 'checked' : 'unchecked')}
                    />
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs" style={{ backgroundColor: customerColor, color: '#fff' }}>
                      {getAvatarFallback(customerGroup.customerName || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1 flex items-center gap-4">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{customerGroup.customerName || 'İsimsiz Cari Hesap'}</h3>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {totalProjects} Proje</span>
                      <span className="w-px h-3 bg-slate-300 dark:bg-slate-700"></span>
                      <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> {totalRevisions} Revizyon</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Button variant="ghost" size="sm" onClick={() => customerGroup.customerId && setSelectedCustomerId(customerGroup.customerId)} className="h-7 text-xs hidden sm:flex">
                      <Users className="mr-2 h-3 w-3" /> Cari Hesap
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="pl-12 pr-4 py-1 space-y-0">
                    {proposalGroups.map((group) => {
                      if (!group || !group.latestProposal) return null;
                      const versions = group.versions || [];
                      const allVersionsInGroupSelected = versions.every(v => v.id && selectedIds.has(v.id));
                      const someVersionsInGroupSelected = versions.some(v => v.id && selectedIds.has(v.id)) && !allVersionsInGroupSelected;

                      return (
                        <Collapsible key={group.rootProposalId} asChild>
                          <div className="border-b last:border-none">
                            <div className="flex items-center px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <div className="px-2">
                                <Checkbox
                                  checked={allVersionsInGroupSelected}
                                  onCheckedChange={(checked) => onToggleVersionSelection(group, !!checked)}
                                  data-state={someVersionsInGroupSelected ? 'indeterminate' : (allVersionsInGroupSelected ? 'checked' : 'unchecked')}
                                />
                              </div>
                              <div className="grid grid-cols-12 gap-4 flex-1 items-center">
                                <div className="col-span-1 font-semibold text-[11px] text-muted-foreground truncate" title={group.latestProposal.quoteNumber}>{group.latestProposal.quoteNumber}</div>
                                <div className="col-span-3 flex items-center group/title">
                                  <div className="font-bold text-sm truncate" title={group.latestProposal.projectName}>{group.latestProposal.projectName}</div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRenameProposal(group.latestProposal);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </div>
                                <div className="col-span-2 font-bold text-sm text-right text-slate-900 dark:text-slate-100">{formatCurrency(group.latestProposal.totalAmount)}</div>
                                <div className="col-span-2 text-center text-xs text-muted-foreground font-medium">
                                  {formatDate(group.latestProposal.createdAt)}
                                </div>
                                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                                  {group.isAssigned && <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px] px-1 py-0 h-4">Atandı</Badge>}
                                  {getStatusBadge(group.latestProposal.status)}
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <Badge variant="outline" className="px-1 text-[10px] font-bold"><Copy className="mr-1 h-3 w-3" />{versions.length}</Badge>
                                </div>
                                <div className="col-span-2 flex justify-end items-center gap-1 pl-2">
                                  <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => group.latestProposal.id && openTab(`/quotes/${group.latestProposal.id}`, `${customerGroup.customerName} - ${group.latestProposal.quoteNumber}`)}><Eye className="mr-1.5 h-3.5 w-3.5" />İncele</Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0" disabled={isRevising === group.rootProposalId}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => onRenameProposal(group.latestProposal)}><Pencil className="mr-2 h-4 w-4" />Projeyi Yeniden Adlandır</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => onDuplicateProposal(group.latestProposal)} disabled={isRevising === group.rootProposalId}><Copy className="mr-2 h-4 w-4" />Revize Et</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => onCopyProposal(group.latestProposal)}><Copy className="mr-2 h-4 w-4" />Kopyala</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Sil</DropdownMenuItem></AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Grubu Sil?</AlertDialogTitle>
                                            <AlertDialogDescription>"{group.latestProposal.projectName}" projesine ait tüm versiyonlar silinecek.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => group.latestProposal.id && onDeleteProposal(group.latestProposal.id, group.rootProposalId!, true)} className="bg-destructive">Sil</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className="h-4 w-4 transition-transform duration-200" /></Button></CollapsibleTrigger>
                                </div>
                              </div>
                            </div>
                            <CollapsibleContent>
                              <div className="bg-slate-50 dark:bg-slate-800/50 border-t p-2">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-12 px-4"><Checkbox checked={allVersionsInGroupSelected} onCheckedChange={(checked) => onToggleVersionSelection(group, !!checked)} /></TableHead>
                                      <TableHead className="h-8 py-1">V</TableHead>
                                      <TableHead className="h-8 py-1">Proje / Açıklama</TableHead>
                                      <TableHead className="h-8 py-1">Tutar</TableHead>
                                      <TableHead className="h-8 py-1">Durum</TableHead>
                                      <TableHead className="h-8 py-1">Tarih</TableHead>
                                      <TableHead className="text-right h-8 py-1">İşlemler</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {versions.map(v => (
                                      <TableRow key={v.id} className={cn("h-auto", v.id === group.latestProposal.id && "bg-blue-50")}>
                                        <TableCell className="px-4 py-1"><Checkbox checked={v.id ? selectedIds.has(v.id) : false} onCheckedChange={(checked) => v.id && onToggleSingleSelection(v.id, !!checked)} /></TableCell>
                                        <TableCell className="py-1">v{v.version}</TableCell>
                                        <TableCell className="py-1">
                                          <div className="max-w-[300px] truncate font-medium text-slate-700" title={v.projectName || ''}>
                                            {v.projectName || '-'}
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-1">{formatCurrency(v.totalAmount)}</TableCell>
                                        <TableCell className="py-1">
                                          <Select onValueChange={(s: any) => v.id && onStatusChange(v.id, s)} defaultValue={v.status}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="py-1">{formatDate(v.createdAt)}</TableCell>
                                        <TableCell className="text-right py-1">
                                          <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => v.id && openTab(`/quotes/${v.id}`, `${customerGroup.customerName} - ${v.quoteNumber} (v${v.version})`)}>Görüntüle</Button>
                                            <Button variant="ghost" size="sm" onClick={() => onPrint(v)}>Yazdır</Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })
      ) : (
        <div className="text-center text-muted-foreground p-12">Henüz teklif bulunmuyor.</div>
      )}
      <CustomerDetailDialog customerId={selectedCustomerId} isOpen={!!selectedCustomerId} onOpenChange={(o) => !o && setSelectedCustomerId(null)} />
    </div>
  );
}
