'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getProjects, createProject, updateProject, deleteProject } from '@/actions/projects/projects';
import { toast } from '@/hooks/use-toast';

// Proje verilerini ve mutasyonlarını yönetmek için merkezi hook
export function useProjects() {
  const queryClient = useQueryClient();

  // Projeleri getiren query
  const query = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const result = await getProjects({}); // Filtreleme için boş obje
      if (!result.success) {
        throw new Error(result.error || 'Projeler alınamadı');
      }
      return result.data;
    },
  });

  // Yeni proje ekleyen mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Proje başarıyla oluşturuldu." });
      // Proje listesi ve ilgili teklif listesini geçersiz kıl
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Proje oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Proje güncelleyen mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateProject(id, data),
    onSuccess: (data, variables) => {
      toast({ title: "Başarılı", description: "Proje bilgileri güncellendi." });
      // Tüm proje query'lerini ve ilgili projenin detayını geçersiz kıl
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
       // Not: Proje detay query key'i varsa o da invalid edilebilir.
      // queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.id) });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Proje güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Proje silen mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Proje başarıyla silindi." });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Proje silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
  };
}
