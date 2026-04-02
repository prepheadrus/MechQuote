"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProjeDurumu, Project } from "@prisma/client";
import { updateProjectStatus } from "@/actions/projects";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ProjectStatusUpdaterProps {
  project: Project;
}

const statusOrder: ProjeDurumu[] = [
  "SOZLESME_ASAMASI",
  "PROJE_PLANLAMA",
  "MALZEME_TEDARIK",
  "SAHA_MOBILIZASYONU",
  "MONTAJ_VE_IMALAT",
  "TEST_VE_DEVREYE_ALMA",
  "GECICI_KABUL",
  "EKSIK_GIDERME",
  "PROJE_TAMAMLANDI",
  "FATURALANDIRILDI_VE_KAPANDI",
];

const statusLabels: Record<ProjeDurumu, string> = {
  SOZLESME_ASAMASI: "Sözleşme Aşaması",
  PROJE_PLANLAMA: "Proje Planlama",
  MALZEME_TEDARIK: "Malzeme Tedarik",
  SAHA_MOBILIZASYONU: "Saha Mobilizasyonu",
  MONTAJ_VE_IMALAT: "Montaj ve İmalat",
  TEST_VE_DEVREYE_ALMA: "Test ve Devreye Alma",
  GECICI_KABUL: "Geçici Kabul",
  EKSIK_GIDERME: "Eksik Giderme",
  PROJE_TAMAMLANDI: "Proje Tamamlandı",
  FATURALANDIRILDI_VE_KAPANDI: "Faturalandırıldı ve Kapandı",
  ASKIYA_ALINDI: "Askıya Alındı",
  IPTAL_EDILDI: "İptal Edildi",
};

export function ProjectStatusUpdater({ project }: ProjectStatusUpdaterProps) {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<ProjeDurumu>(
    project.status as ProjeDurumu
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ProjeDurumu) => {
    setIsUpdating(true);
    try {
      const result = await updateProjectStatus(project.id, newStatus);
      if (result.success) {
        setCurrentStatus(newStatus);
        toast({ title: "Başarılı", description: "Proje durumu güncellendi." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Proje durumu güncellenirken bir hata oluştu."
      });
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatusIndex = statusOrder.indexOf(currentStatus);
  const progressPercentage =
    ((currentStatusIndex + 1) / statusOrder.length) * 100;

  return (
    <div className="space-y-4">
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <div className="flex items-center space-x-4">
        <Select
          value={currentStatus}
          onValueChange={(value) => handleStatusChange(value as ProjeDurumu)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Durum Seçin" />
          </SelectTrigger>
          <SelectContent>
            {statusOrder.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{statusLabels[currentStatus]}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {statusOrder.map((status, index) => (
          <div
            key={status}
            className={`flex items-center text-xs ${index <= currentStatusIndex ? "text-blue-600" : "text-gray-500"
              }`}
          >
            {statusLabels[status]}
            {index < statusOrder.length - 1 && (
              <span className="mx-2">{">"}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
