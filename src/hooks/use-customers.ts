'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/actions/customers';
import { toast } from '@/components/ui/use-toast';
import { Customer } from '@prisma/client';

type EnrichedCustomer = Customer & { /*... any other client-side fields ...*/ };

// Müşteri verilerini ve mutasyonlarını yönetmek için merkezi hook
export function useCustomers() {
  const queryClient = useQueryClient();

  // Müşterileri getiren query
  const query = useQuery<EnrichedCustomer[], Error>({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const result = await getCustomers();
      if (!result.success) {
        throw new Error(result.error || 'Müşteriler alınamadı');
      }
      return result.data as EnrichedCustomer[];
    },
  });

  // Yeni müşteri ekleyen mutation (Optimistic Update ile)
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onMutate: async (newCustomerData) => {
      // Devam eden query'leri iptal et
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.all });

      // Önceki state'i yedekle
      const previousCustomers = queryClient.getQueryData<EnrichedCustomer[]>(queryKeys.customers.all);

      // Cache'i anında yeni müşteri ile güncelle (optimistic)
      queryClient.setQueryData<EnrichedCustomer[]>(queryKeys.customers.all, (old) => {
        const optimisticCustomer: EnrichedCustomer = {
          ...newCustomerData,
          id: `temp-${Date.now()}`, // Geçici ID
          createdAt: new Date(),
          updatedAt: new Date(),
          // Prisma modelindeki diğer zorunlu alanlar için varsayılan değerler
          status: 'Aktif',
          tags: [],
          balance: 0,
          totalSpending: 0,
          activeProjectCount: 0,
          totalProjectVolume: 0,
          lastActivityDate: new Date(),
          address: {},
        } as EnrichedCustomer;
        return old ? [...old, optimisticCustomer] : [optimisticCustomer];
      });

      return { previousCustomers };
    },
    onError: (err, variables, context) => {
      // Hata durumunda yedeği geri yükle
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.customers.all, context.previousCustomers);
      }
      toast({
        title: "Hata",
        description: err.message || "Müşteri oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // İşlem başarılı veya hatalı olsun, her durumda listeyi sunucudan yeniden çek
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
     onSuccess: () => {
      toast({ title: "Başarılı", description: "Müşteri başarıyla oluşturuldu." });
    }
  });

  // Müşteri güncelleyen mutation (Optimistic Update ile)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateCustomer(id, data),
    onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.customers.all });
        const previousCustomers = queryClient.getQueryData<EnrichedCustomer[]>(queryKeys.customers.all);
        queryClient.setQueryData<EnrichedCustomer[]>(queryKeys.customers.all, (old) =>
            old?.map(c => c.id === id ? { ...c, ...data } : c)
        );
        return { previousCustomers, customerId: id };
    },
    onError: (err, variables, context) => {
        if (context?.previousCustomers) {
            queryClient.setQueryData(queryKeys.customers.all, context.previousCustomers);
        }
        toast({ title: "Hata", description: err.message || "Müşteri güncellenemedi.", variant: "destructive" });
    },
    onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
    onSuccess: () => {
        toast({ title: "Başarılı", description: "Müşteri bilgileri güncellendi." });
    }
  });

  // Müşteri silen mutation (Optimistic Update ile)
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onMutate: async (customerId) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.customers.all });
        const previousCustomers = queryClient.getQueryData<EnrichedCustomer[]>(queryKeys.customers.all);
        queryClient.setQueryData<EnrichedCustomer[]>(queryKeys.customers.all, (old) =>
            old?.filter(c => c.id !== customerId)
        );
        return { previousCustomers };
    },
    onError: (err, variables, context) => {
        if (context?.previousCustomers) {
            queryClient.setQueryData(queryKeys.customers.all, context.previousCustomers);
        }
        toast({ title: "Hata", description: err.message || "Müşteri silinemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onSuccess: () => {
        toast({ title: "Başarılı", description: "Müşteri başarıyla silindi." });
    }
  });

  return {
    customers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutateAsync,
    deleteCustomer: deleteMutation.mutateAsync,
  };
}
