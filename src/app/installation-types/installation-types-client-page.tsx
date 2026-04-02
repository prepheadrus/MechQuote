'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  UploadCloud,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickAddInstallationType } from '@/components/app/quick-add-installation-type';
import { cn } from '@/lib/utils';
import { InstallationType } from '@prisma/client';
import {
  deleteInstallationType,
  deleteAllInstallationTypes,
  seedInstallationTypes,
} from '@/actions/installation-types';


export type TreeNode = InstallationType & {
  children: TreeNode[];
};


const CategoryNode = ({
  node,
  level,
  onEdit,
  onDelete,
  onAddSub,
}: {
  node: TreeNode;
  level: number;
  onEdit: (category: InstallationType) => void;
  onDelete: (categoryId: string) => void;
  onAddSub: (parentId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800",
          level > 0 && "border-t"
        )}
        style={{ paddingLeft: `${level * 24 + 16}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center self-start pt-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6 h-6" /> // Placeholder to maintain alignment
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{node.name}</p>
            {node.description && (
              <p className="text-xs text-muted-foreground truncate">{node.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={() => onAddSub(node.id)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Alt Kategori
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Menüyü aç</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Bu kategoriyi ve tüm alt
                      kategorilerini kalıcı olarak silecektir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(node.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Evet, Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isExpanded && hasChildren &&
        node.children.map((childNode) => (
          <CategoryNode
            key={childNode.id}
            node={childNode}
            level={level + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddSub={onAddSub}
          />
        ))}
    </div>
  );
};

interface InstallationTypesPageContentProps {
  allCategories: InstallationType[];
  categoryTree: TreeNode[];
  searchTerm: string;
}

export function InstallationTypesPageContent({ allCategories, categoryTree, searchTerm: initialSearchTerm }: InstallationTypesPageContentProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InstallationType | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (currentSearchTerm) {
            params.set('q', currentSearchTerm);
        } else {
            params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300); // Debounce search

    return () => clearTimeout(handler);
  }, [currentSearchTerm, pathname, router, searchParams]);

  const handleOpenDialogForNew = (parentId: string | null = null) => {
    setEditingCategory(null);
    setDefaultParentId(parentId);
    setIsDialogOpen(true);
  };

  const handleOpenDialogForEdit = (category: InstallationType) => {
    setDefaultParentId(null);
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    const result = await deleteInstallationType(categoryId);
    if (result.success) {
      toast({ title: 'Başarılı', description: 'Kategori ve alt kategorileri silindi.' });
    } else {
      toast({ variant: 'destructive', title: 'Hata', description: result.error });
    }
  };

  const handleDeleteAllCategories = async () => {
    setIsProcessing(true);
    const result = await deleteAllInstallationTypes();
    if (result.success) {
      toast({ title: 'Başarılı!', description: 'Tüm kategoriler veritabanından silindi.' });
    } else {
      toast({ variant: 'destructive', title: 'Toplu Silme Hatası', description: result.error });
    }
    setIsProcessing(false);
  };

  const handleSeedData = async () => {
    setIsProcessing(true);
    const result = await seedInstallationTypes();
    if (result.success) {
      toast({ title: 'Başarılı!', description: 'Örnek kategoriler veritabanına yüklendi.' });
    } else {
      toast({ variant: 'destructive', title: 'Veri Yükleme Hatası', description: result.error });
    }
    setIsProcessing(false);
  };

  return (
    <>
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tesisat Kategorileri</h1>
            <p className="text-muted-foreground">Ürün ve hizmetlerinizi sınıflandırdığınız mekanik disiplinleri yönetin.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSeedData} disabled={isProcessing} variant="outline">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Örnek Kategorileri Yükle
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive" disabled={isProcessing}><AlertTriangle className="mr-2 h-4 w-4" />Tümünü Temizle</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Tüm Kategorileri Silmek Üzeresiniz!</AlertDialogTitle><AlertDialogDescription>Bu işlem geri alınamaz. Veritabanındaki tüm tesisat kategorileri kalıcı olarak silinecektir. Emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAllCategories} className="bg-destructive hover:bg-destructive/90">Evet, Hepsini Sil</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => handleOpenDialogForNew(null)} disabled={isProcessing}><PlusCircle className="mr-2 h-4 w-4" />Yeni Ana Disiplin Ekle</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kategori Hiyerarşisi</CardTitle>
            <div className="pt-4"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Kategori adı veya açıklama ara..." className="pl-8 max-w-sm" value={currentSearchTerm} onChange={(e) => setCurrentSearchTerm(e.target.value)} /></div></div>
          </CardHeader>
          <CardContent>
            {categoryTree.length > 0 ? (
              <div className="border rounded-lg">
                {categoryTree.map((node) => (
                  <CategoryNode
                    key={node.id}
                    node={node}
                    level={0}
                    onEdit={handleOpenDialogForEdit}
                    onDelete={handleDelete}
                    onAddSub={(parentId) => handleOpenDialogForNew(parentId)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {initialSearchTerm ? 'Aramanızla eşleşen kategori bulunamadı.' : 'Henüz kategori oluşturulmamış. Yeni bir ana disiplin ekleyerek başlayın veya örnek verileri yükleyin.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickAddInstallationType
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {}}
        existingCategory={editingCategory}
        defaultParentId={defaultParentId}
        allCategories={allCategories || []}
      />
    </>
  );
}
