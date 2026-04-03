'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getProposalList, createProposal, updateProposal, updateProposalStatus, deleteProposal } from '@/actions/proposals/proposals';
import { toast } from '@/hooks/use-toast';
import { Proposal } from '@prisma/client';

type EnrichedProposal = Proposal & { /*... any other client-side fields ...*/ };

// Teklif verilerini ve mutasyonlarını yönetmek için merkezi hook
export function useProposals() {
  const queryClient = useQueryClient();

  // Teklifleri getiren query
  const query = useQuery<EnrichedProposal[], Error>({
    queryKey: queryKeys.proposals.all,
    queryFn: async () => {
      const result = await getProposalList({}); // Filtreleme için boş obje
      if (!result.success) {
        throw new Error(result.error || 'Teklifler alınamadı');
      }
      return result.data as EnrichedProposal[];
    },
  });

  // Yeni teklif ekleyen mutation (Optimistic Update ile)
  const createMutation = useMutation({
    mutationFn: createProposal,
    onMutate: async (newProposalData) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.proposals.all });
        const previousProposals = queryClient.getQueryData<EnrichedProposal[]>(queryKeys.proposals.all);
        queryClient.setQueryData<EnrichedProposal[]>(queryKeys.proposals.all, (old) => {
            const optimisticProposal = {
                ...newProposalData,
                id: `temp-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
                status: 'Draft',
                totalAmount: 0,
                // ...diğer zorunlu alanlar için varsayılan değerler
            } as unknown as EnrichedProposal;
            return old ? [...old, optimisticProposal] : [optimisticProposal];
        });
        return { previousProposals };
    },
    onError: (err, variables, context) => {
        if (context?.previousProposals) {
            queryClient.setQueryData(queryKeys.proposals.all, context.previousProposals);
        }
        toast({ title: "Hata", description: err.message || "Teklif oluşturulamadı.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Teklif başarıyla oluşturuldu." });
    }
  });
  
  // Teklif güncelleyen mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProposal(id, data),
     onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.proposals.all });
        const previousProposals = queryClient.getQueryData<EnrichedProposal[]>(queryKeys.proposals.all);
        queryClient.setQueryData<EnrichedProposal[]>(queryKeys.proposals.all, (old) =>
            old?.map(p => p.id === id ? { ...p, ...data } : p)
        );
        return { previousProposals };
    },
    onError: (err, variables, context) => {
        if (context?.previousProposals) {
            queryClient.setQueryData(queryKeys.proposals.all, context.previousProposals);
        }
        toast({ title: "Hata", description: err.message || "Teklif güncellenemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
     onSuccess: () => {
      toast({ title: "Başarılı", description: "Teklif güncellendi." });
    }
  });


  // Teklif durumunu güncelleyen mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: any }) => updateProposalStatus(id, status),
    onMutate: async ({ id, status }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.proposals.all });
        const previousProposals = queryClient.getQueryData<EnrichedProposal[]>(queryKeys.proposals.all);
        queryClient.setQueryData<EnrichedProposal[]>(queryKeys.proposals.all, (old) =>
            old?.map(p => p.id === id ? { ...p, status } : p)
        );
        return { previousProposals };
    },
    onError: (err, variables, context) => {
        if (context?.previousProposals) {
            queryClient.setQueryData(queryKeys.proposals.all, context.previousProposals);
        }
        toast({ title: "Hata", description: err.message || "Durum güncellenemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Teklif durumu güncellendi." });
    }
  });

  // Teklif silen mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProposal,
    onMutate: async (proposalId) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.proposals.all });
        const previousProposals = queryClient.getQueryData<EnrichedProposal[]>(queryKeys.proposals.all);
        queryClient.setQueryData<EnrichedProposal[]>(queryKeys.proposals.all, (old) =>
            old?.filter(p => p.id !== proposalId)
        );
        return { previousProposals };
    },
    onError: (err, variables, context) => {
        if (context?.previousProposals) {
            queryClient.setQueryData(queryKeys.proposals.all, context.previousProposals);
        }
        toast({ title: "Hata", description: err.message || "Teklif silinemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Teklif başarıyla silindi." });
    }
  });

  return {
    proposals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProposal: createMutation.mutateAsync,
    updateProposal: updateMutation.mutateAsync,
    updateProposalStatus: updateStatusMutation.mutateAsync,
    deleteProposal: deleteMutation.mutateAsync,
  };
}
