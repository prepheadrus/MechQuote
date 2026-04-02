"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Calendar, MapPin, DollarSign, Briefcase, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { getProjectStatusBadge } from '@/lib/formatters';
import { ProjectDialog } from '@/components/app/project-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { deleteProject } from '@/actions/projects';
import { useProjects } from '@/hooks/use-projects';

interface ProjectsClientPageProps {
    projects: any[];
    allProjects: any[];
}

export function ProjectsClientPage({ projects, allProjects }: ProjectsClientPageProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // React Query ile projeleri çek
    const { 
        projects: queryProjects, 
        isLoading,
        deleteProject: deleteProjectMutation,
    } = useProjects();
    
    // Fallback: Eğer query boşsa props'tan al (SSR için)
    const projectsData: any[] = ((queryProjects as any)?.length > 0 ? queryProjects : (projects || allProjects)) as any[];

    const currentSearch = searchParams.get('q') || '';
    const currentStatus = searchParams.get('status') || 'Ongoing';

    const [searchTerm, setSearchTerm] = useState(currentSearch);

    // Edit/Delete State
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any | undefined>(undefined);
    const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

    // Debounced search effect
    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('q', searchTerm);
            } else {
                params.delete('q');
            }
            router.replace(`${pathname}?${params.toString()}`);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm, pathname, router, searchParams]);

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', status);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setIsProjectDialogOpen(true);
    };

    const handleDeleteClick = (project: any) => {
        setProjectToDelete(project);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await deleteProjectMutation(projectToDelete.id);
            toast({ title: "Proje Silindi", description: "Proje başarıyla silindi." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız." });
        } finally {
            setProjectToDelete(null);
        }
    };

    // Analytics are calculated from the full, unfiltered list
    const counts = useMemo(() => {
        return {
            Total: projectsData.length,
            Ongoing: projectsData.filter(p => [
                'SOZLESME_ASAMASI', 'PROJE_PLANLAMA', 'MALZEME_TEDARIK',
                'SAHA_MOBILIZASYONU', 'MONTAJ_VE_IMALAT', 'TEST_VE_DEVREYE_ALMA'
            ].includes(p.status)).length,
            Pending: projectsData.filter(p => p.status === 'ASKIYA_ALINDI').length,
            Completed: projectsData.filter(p => ['GECICI_KABUL', 'EKSIK_GIDERME', 'PROJE_TAMAMLANDI', 'FATURALANDIRILDI_VE_KAPANDI'].includes(p.status)).length,
            Cancelled: projectsData.filter(p => p.status === 'IPTAL_EDILDI').length,
            TotalValue: projectsData.reduce((sum, p) => sum + (p.contractAmount || 0), 0)
        };
    }, [projectsData]);


    const ProjectCard = ({ project }: { project: any }) => (
        <Card className="hover:shadow-md transition-shadow cursor-pointer relative group">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div onClick={() => router.push(`/projects/${project.id}`)} className="flex-1">
                        <CardTitle className="text-lg font-bold">{project.name}</CardTitle>
                        <CardDescription>{project.customer?.name}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {getProjectStatusBadge(project.status)}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}><Edit className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(project); }}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>{project.startDate ? new Date(project.startDate).toLocaleDateString('tr-TR') : '-'}</span></div>
                    <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: project.currency || 'TRY' }).format(project.contractAmount || 0)}</span></div>
                    {project.address && (<div className="flex items-center gap-1 col-span-2"><MapPin className="h-4 w-4" /><span className="truncate">{project.address}</span></div>)}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex-1 h-full overflow-y-auto container mx-auto py-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
                    <p className="text-muted-foreground mt-1">Devam eden şantiyeler ve proje yönetimi.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => { setEditingProject(undefined); setIsProjectDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Yeni Proje</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Toplam Proje</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.Total}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Devam Eden</CardTitle><div className="h-2 w-2 rounded-full bg-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.Ongoing}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Toplam Hakediş</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(counts.TotalValue)}</div><p className="text-xs text-muted-foreground">+KDV hariç sözleşme tutarı</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tamamlanan</CardTitle><div className="h-2 w-2 rounded-full bg-slate-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.Completed}</div></CardContent></Card>
            </div>

            <div className="space-y-4">
                <div className="relative w-full max-w-sm"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Proje veya müşteri ara..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <Tabs value={currentStatus} onValueChange={handleStatusChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
                        <TabsTrigger value="Ongoing">Devam Eden ({counts.Ongoing})</TabsTrigger>
                        <TabsTrigger value="Pending">Beklemede ({counts.Pending})</TabsTrigger>
                        <TabsTrigger value="Completed">Tamamlanan ({counts.Completed})</TabsTrigger>
                        <TabsTrigger value="Cancelled">İptal ({counts.Cancelled})</TabsTrigger>
                        <TabsTrigger value="All">Tümü ({allProjects.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value={currentStatus} className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectsData.map(project => (<ProjectCard key={project.id} project={project} />))}
                        </div>
                        {projectsData.length === 0 && (<p className="col-span-full text-center text-muted-foreground py-10">Bu filtre ile eşleşen proje bulunmuyor.</p>)}
                    </TabsContent>
                </Tabs>
            </div>

            {isProjectDialogOpen && (<ProjectDialog isOpen={isProjectDialogOpen} onClose={() => { setIsProjectDialogOpen(false); setEditingProject(undefined); }} projectToEdit={editingProject} onProjectSaved={() => router.refresh()} />)}
            <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Projeyi Sil</AlertDialogTitle><AlertDialogDescription>"{projectToDelete?.name}" projesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
