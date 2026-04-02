/**
 * Assignments Hook - React Query
 *
 * İş atama yönetimi için React Query hook'u
 * Otomatik cache, refetch, optimistic updates desteği
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getJobAssignments, createJobAssignment, updateJobAssignment, deleteJobAssignment } from '@/actions/job-assignments';

/**
 * İş atama listesi ve operasyonları için hook
 *
 * @example
 * ```typescript
 * const { assignments, isLoading, createAssignment } = useAssignments();
 * ```
 */
export function useAssignments() {
  const queryClient = useQueryClient();

  // İş atama listesini çek
  const query = useQuery({
    queryKey: queryKeys.assignments.all,
    queryFn: () => getJobAssignments(),
    select: (data) => data.data || [],
    staleTime: 1000 * 60 * 5, // 5 dakika
  });

  // Yeni iş ataması oluştur (OPTIMISTIC)
  const createMutation = useMutation({
    mutationFn: createJobAssignment,
    onMutate: async (newAssignment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.assignments.all });

      // Snapshot previous value
      const previousAssignments = queryClient.getQueryData(queryKeys.assignments.all);

      // Optimistically update - add new assignment immediately
      queryClient.setQueryData(queryKeys.assignments.all, (old: any) => {
        const optimisticAssignment = {
          ...newAssignment,
          id: `temp-${Date.now()}`, // Temporary ID
          createdAt: new Date(),
        };
        return old ? [...old, optimisticAssignment] : [optimisticAssignment];
      });

      // Return context with previous value (for rollback)
      return { previousAssignments };
    },
    onError: (err, newAssignment, context) => {
      // Rollback to previous value on error
      if (context?.previousAssignments) {
        queryClient.setQueryData(queryKeys.assignments.all, context.previousAssignments);
      }
      console.error('Failed to create assignment:', err);
    },
    onSettled: () => {
      // Always refetch after mutation to ensure sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });

  // İş ataması güncelle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateJobAssignment(id, data),
    onSuccess: (data, { id }) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.detail(id) });
      }
    },
  });

  // İş ataması sil
  const deleteMutation = useMutation({
    mutationFn: deleteJobAssignment,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      }
    },
  });

  return {
    // Data
    assignments: query.data || [],

    // States
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createAssignment: createMutation.mutateAsync,
    updateAssignment: updateMutation.mutateAsync,
    deleteAssignment: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Tek bir iş ataması için hook
 * 
 * @param id - Atama ID
 * 
 * @example
 * ```typescript
 * const { assignment, isLoading } = useAssignment('123');
 * ```
 */
export function useAssignment(id: string) {
  const query = useQuery({
    queryKey: queryKeys.assignments.detail(id),
    queryFn: () => {
      return getJobAssignments().then((res) => {
        if (!res.success || !res.data) return null;
        return res.data.find((a) => a.id === id) || null;
      });
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    assignment: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
