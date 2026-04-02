'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/actions/products';
import { toast } from '@/components/ui/use-toast';
import { Product } from '@prisma/client';

// Ürün verilerini ve mutasyonlarını yönetmek için merkezi hook
export function useProducts() {
  const queryClient = useQueryClient();

  // Ürünleri getiren query
  const query = useQuery<Product[], Error>({
    queryKey: queryKeys.products.all,
    queryFn: async () => {
      const result = await getProducts();
      if (!result.success) {
        throw new Error(result.error || 'Ürünler alınamadı');
      }
      return result.data as Product[];
    },
  });

  // Yeni ürün ekleyen mutation (Optimistic Update ile)
  const createMutation = useMutation({
    mutationFn: createProduct,
    onMutate: async (newProductData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
      const previousProducts = queryClient.getQueryData<Product[]>(queryKeys.products.all);
      queryClient.setQueryData<Product[]>(queryKeys.products.all, (old) => {
        const optimisticProduct: Product = {
          ...newProductData,
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          deletedAt: null,
          stockQuantity: 0,
          reservedQuantity: 0,
          minStockLevel: 0,
          basePrice: newProductData.basePrice || 0,
          listPrice: newProductData.listPrice || 0,
          discountRate: 0,
          vatRate: 0.20,
          currency: 'TRY',
        } as Product;
        return old ? [...old, optimisticProduct] : [optimisticProduct];
      });
      return { previousProducts };
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKeys.products.all, context.previousProducts);
      }
      toast({
        title: "Hata",
        description: err.message || "Ürün oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Ürün başarıyla oluşturuldu." });
    },
  });

  // Ürün güncelleyen mutation (Optimistic Update ile)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateProduct(id, data),
    onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
        const previousProducts = queryClient.getQueryData<Product[]>(queryKeys.products.all);
        queryClient.setQueryData<Product[]>(queryKeys.products.all, (old) =>
            old?.map(p => p.id === id ? { ...p, ...data } : p)
        );
        return { previousProducts };
    },
    onError: (err, variables, context) => {
        if (context?.previousProducts) {
            queryClient.setQueryData(queryKeys.products.all, context.previousProducts);
        }
        toast({ title: "Hata", description: err.message || "Ürün güncellenemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onSuccess: () => {
        toast({ title: "Başarılı", description: "Ürün bilgileri güncellendi." });
    }
  });

  // Ürün silen mutation (Optimistic Update ile)
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: async (productId) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
        const previousProducts = queryClient.getQueryData<Product[]>(queryKeys.products.all);
        queryClient.setQueryData<Product[]>(queryKeys.products.all, (old) =>
            old?.filter(p => p.id !== productId)
        );
        return { previousProducts };
    },
    onError: (err, variables, context) => {
        if (context?.previousProducts) {
            queryClient.setQueryData(queryKeys.products.all, context.previousProducts);
        }
        toast({ title: "Hata", description: err.message || "Ürün silinemedi.", variant: "destructive" });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
     onSuccess: () => {
      toast({ title: "Başarılı", description: "Ürün başarıyla silindi." });
    }
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
  };
}
