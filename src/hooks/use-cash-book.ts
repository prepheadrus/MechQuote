'use client';

/**
 * Cash Book React Query Hooks
 * 
 * Kasa defteri için React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCashBookEntries, getCashBookFormData } from '@/actions/cash-book';
import { updateCashEntry, deleteCashEntry } from '@/actions/cash-book-crud';
import { addCashEntry } from '@/actions/cash-book';
import { toast } from '@/hooks/use-toast';

/**
 * Query Keys
 */
export const cashBookKeys = {
    all: ['cash-book'] as const,
    entries: () => [...cashBookKeys.all, 'entries'] as const,
    formData: () => [...cashBookKeys.all, 'formData'] as const,
};

/**
 * Get Cash Book Entries
 */
export function useCashBookEntries() {
    return useQuery({
        queryKey: cashBookKeys.entries(),
        queryFn: async () => {
            const result = await getCashBookEntries();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data || [];
        },
        staleTime: 0, // ✅ HİÇ stale olma - her zaman fresh
        gcTime: 1000 * 60 * 5, // 5 dakika
    });
}

/**
 * Get Cash Book Form Data
 */
export function useCashBookFormData() {
    return useQuery({
        queryKey: cashBookKeys.formData(),
        queryFn: async () => {
            const result = await getCashBookFormData();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        },
        staleTime: 1000 * 60 * 5, // 5 dakika
    });
}

/**
 * Add Cash Entry Mutation
 */
export function useAddCashEntry() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (data: any) => {
            const result = await addCashEntry(data);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cashBookKeys.entries() });
            toast({
                title: "Başarılı",
                description: "Kasa kaydı eklendi."
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Hata",
                description: error.message
            });
        }
    });
}

/**
 * Update Cash Entry Mutation
 */
export function useUpdateCashEntry() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ entryId, data }: { entryId: string; data: any }) => {
            const result = await updateCashEntry(entryId, data);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cashBookKeys.entries() });
            toast({
                title: "Başarılı",
                description: "Kasa kaydı güncellendi."
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Hata",
                description: error.message
            });
        }
    });
}

/**
 * Delete Cash Entry Mutation
 */
export function useDeleteCashEntry() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (entryId: string) => {
            const result = await deleteCashEntry(entryId);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: cashBookKeys.entries() });
            toast({
                title: "Başarılı",
                description: "Kasa kaydı silindi."
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Hata",
                description: error.message
            });
        }
    });
}
