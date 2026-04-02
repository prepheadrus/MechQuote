'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getInvoices, createInvoice, deleteInvoice } from '@/actions/invoices';
import { toast } from '@/components/ui/use-toast';
import { Invoice } from '@prisma/client';

type EnrichedInvoice = Invoice & { /*... any other client-side fields ...*/ };


// Fatura verilerini ve mutasyonlarını yönetmek için merkezi hook
export function useInvoices() {
  const queryClient = useQueryClient();

  // Faturaları getiren query
  const query = useQuery<EnrichedInvoice[], Error>({
    queryKey: queryKeys.invoices.all,
    queryFn: async () => {
      const result = await getInvoices({}); // Filtreleme için boş obje
      if (!result.success) {
        throw new Error(result.error || 'Faturalar alınamadı');
      }
      return result.data as EnrichedInvoice[];
    },
  });

  // Yeni fatura ekleyen mutation (Optimistic Update ile)
  const createMutation = useMutation({
    mutationFn: createInvoice,
    onMutate: async (newInvoiceData) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.invoices.all });
        const previousInvoices = queryClient.getQueryData<EnrichedInvoice[]>(queryKeys.invoices.all);
        queryClient.setQueryData<EnrichedInvoice[]>(queryKeys.invoices.all, (old) => {
            const optimisticInvoice = {
                ...newInvoiceData,
                id: `temp-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'Draft',
                // ...diğer zorunlu alanlar
            } as EnrichedInvoice;
            return old ? [...old, optimisticInvoice] : [optimisticInvoice];
        });
        return { previousInvoices };
    },
    onError: (err, variables, context) => {
        if (context?.previousInvoices) {
            queryClient.setQueryData(queryKeys.invoices.all, context.previousInvoices);
        }
        toast({
            title: "Hata",
            description: err.message || "Fatura oluşturulurken bir hata oluştu.",
            variant: "destructive",
        });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
     onSuccess: () => {
      toast({ title: "Başarılı", description: "Fatura başarıyla oluşturuldu." });
    },
  });

  // Fatura silen mutation (Optimistic Update ile)
  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onMutate: async (invoiceId) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.invoices.all });
        const previousInvoices = queryClient.getQueryData<EnrichedInvoice[]>(queryKeys.invoices.all);
        queryClient.setQueryData<EnrichedInvoice[]>(queryKeys.invoices.all, (old) =>
            old?.filter(i => i.id !== invoiceId)
        );
        return { previousInvoices };
    },
    onError: (err, variables, context) => {
        if (context?.previousInvoices) {
            queryClient.setQueryData(queryKeys.invoices.all, context.previousInvoices);
        }
        toast({ title: "Hata", description: err.message || "Fatura silinemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Fatura başarıyla silindi." });
    },
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createInvoice: createMutation.mutateAsync,
    deleteInvoice: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
