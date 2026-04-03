/**
 * Personnel Hook - React Query
 * 
 * Personel yönetimi için React Query hook'u
 * Otomatik cache, refetch, optimistic updates desteği
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getPersonnel, createPersonnel, updatePersonnel, deletePersonnel } from '@/actions/personnel';

/**
 * Personel listesi ve operasyonları için hook
 * 
 * @example
 * ```typescript
 * const { personnel, isLoading, createPersonnel } = usePersonnel();
 * ```
 */
export function usePersonnel() {
  const queryClient = useQueryClient();

  // Personel listesini çek
  const query = useQuery({
    queryKey: queryKeys.personnel.all,
    queryFn: () => getPersonnel(),
    select: (data) => data.data || [],
    staleTime: 1000 * 60 * 5, // 5 dakika
  });

  // Yeni personel oluştur (OPTIMISTIC)
  const createMutation = useMutation({
    mutationFn: createPersonnel,
    onMutate: async (newPersonnel) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.personnel.all });

      // Snapshot previous value
      const previousPersonnel = queryClient.getQueryData(queryKeys.personnel.all);

      // Optimistically update - add new personnel immediately
      queryClient.setQueryData(queryKeys.personnel.all, (old: any) => {
        const optimisticPersonnel = {
          ...newPersonnel,
          id: `temp-${Date.now()}`, // Temporary ID
          createdAt: new Date(),
        };
        return old ? [...old, optimisticPersonnel] : [optimisticPersonnel];
      });

      // Return context with previous value (for rollback)
      return { previousPersonnel };
    },
    onError: (err, newPersonnel, context) => {
      // Rollback to previous value on error
      if (context?.previousPersonnel) {
        queryClient.setQueryData(queryKeys.personnel.all, context.previousPersonnel);
      }
      console.error('Failed to create personnel:', err);
    },
    onSettled: () => {
      // Always refetch after mutation to ensure sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.personnel.all });
    },
  });

  // Personel güncelle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      updatePersonnel(id, data),
    onSuccess: (data, { id }) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.personnel.all });
      }
    },
  });

  // Personel sil
  const deleteMutation = useMutation({
    mutationFn: deletePersonnel,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.personnel.all });
      }
    },
  });

  return {
    // Data
    personnel: query.data || [],
    
    // States
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    
    // Mutations
    createPersonnel: createMutation.mutateAsync,
    updatePersonnel: updateMutation.mutateAsync,
    deletePersonnel: deleteMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Tek bir personel için hook
 * 
 * @param id - Personel ID
 * 
 * @example
 * ```typescript
 * const { personnel, isLoading } = usePersonnel('123');
 * ```
 */
export function usePersonnelMember(id: string) {
  const query = useQuery({
    queryKey: [...queryKeys.personnel.all, id],
    queryFn: () => {
      return getPersonnel().then((res) => {
        if (!res.success || !res.data) return null;
        return res.data.find((p: any) => p.id === id) || null;
      });
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    personnel: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
