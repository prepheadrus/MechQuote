'use client';
import { useState, useMemo, useDeferredValue, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProductList } from '@/actions/products';
import { getInstallationTypes } from '@/actions/installation-types';
import { Product, InstallationType, Recipe } from '@prisma/client';
import { Loader2, Search, ChevronRight, ChevronDown, PlusCircle, BookCopy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { QuickAddProduct } from './quick-add-product';
import { searchProducts } from '@/services/product-search-service';

const INITIAL_LOAD_COUNT = 50;
const LOAD_MORE_COUNT = 50;

// Need to match the structure expected by the component logic
interface TreeNode {
  id: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  price: number;
  currency: string;
  children: TreeNode[];
}

interface ProductSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductsSelected: (products: Product[]) => void;
  targetGroupName?: string; // Add this prop
  recipes: Recipe[] | null;
}

const buildTree = (categories: any[]): TreeNode[] => {
  const categoryMap: { [id: string]: TreeNode } = {};
  const roots: TreeNode[] = [];

  if (!categories) return roots;

  categories.forEach(category => {
    categoryMap[category.id] = { ...category, children: [] };
  });

  categories.forEach(category => {
    if (category.parentId && categoryMap[category.parentId]) {
      if (category.id !== category.parentId) {
        categoryMap[category.parentId].children.push(categoryMap[category.id]);
      }
    } else {
      if (category.id && categoryMap[category.id]) {
        roots.push(categoryMap[category.id]);
      }
    }
  });

  Object.values(categoryMap).forEach(node => {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
  });

  roots.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

  return roots;
};

const CategoryNode = ({ node, level, onSelect, selectedCategoryId }: { node: TreeNode; level: number; onSelect: (id: string) => void; selectedCategoryId: string | null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedCategoryId;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={() => node.id && onSelect(node.id)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 -ml-1">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <div className="w-6" />}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {isExpanded && hasChildren && node.children.map(child => (
        <CategoryNode key={child.id} node={child} level={level + 1} onSelect={onSelect} selectedCategoryId={selectedCategoryId} />
      ))}
    </div>
  )
}

const formatCurrency = (amount: number, currency: string) => {
  const validCurrencies = ['TRY', 'USD', 'EUR'];
  const currencyCode = currency && validCurrencies.includes(currency.toUpperCase())
    ? currency.toUpperCase()
    : 'TRY';

  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currencyCode }).format(amount);
};


export function ProductSelector({
  isOpen,
  onOpenChange,
  onProductsSelected,
  targetGroupName,
  recipes,
}: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, Product>>(new Map());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);

  const [allProducts, setAllProducts] = useState<Product[] | undefined>(undefined);
  const [allCategories, setAllCategories] = useState<InstallationType[] | undefined>(undefined);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingProducts(true);
      setIsLoadingCategories(true);

      getProductList().then(res => {
        if (res.success && res.data) {
          setAllProducts(res.data);
        }
        setIsLoadingProducts(false);
      });

      getInstallationTypes().then(res => {
        if (res.success && res.data) {
          setAllCategories(res.data);
        }
        setIsLoadingCategories(false);
      });
    }
  }, [isOpen]);

  const categoryTree = useMemo(() => buildTree(allCategories || []), [allCategories]);

  const categoryDescendants = useMemo(() => {
    const map = new Map<string, string[]>();
    const getDescendants = (nodeId: string): string[] => {
      const node = allCategories?.find(c => c.id === nodeId);
      if (!node) return [];
      let ids = [node.id!];

      // Find direct children
      const children = allCategories?.filter(c => c.parentId === nodeId) || [];
      children.forEach(child => {
        if (child.id) {
          ids = ids.concat(getDescendants(child.id));
        }
      });
      return ids;
    };
    allCategories?.forEach(cat => {
      if (cat.id) map.set(cat.id, getDescendants(cat.id))
    });
    return map;
  }, [allCategories]);

  const recipeProductIds = useMemo(() => {
    // recipes might use productId as well. Assuming Recipes use same ID type.
    return new Set(recipes?.map(r => r.productId)); // Check this mapping
  }, [recipes]);


  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (selectedCategoryId) {
      const idsToFilter = categoryDescendants.get(selectedCategoryId) || [];
      products = products?.filter(p => p.installationTypeId && idsToFilter.includes(p.installationTypeId));
    }

    if (deferredSearchTerm && products) {
      console.log('[ProductSelector] Searching for:', deferredSearchTerm);
      console.log('[ProductSelector] Products available:', products.length);

      // Use centralized search service
      const searchResults = searchProducts(products, deferredSearchTerm);

      console.log('[ProductSelector] Search results:', searchResults.length);
      if (searchResults.length > 0) {
        console.log('[ProductSelector] Top 3 matches:');
        searchResults.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.product.name} (Score: ${r.score})`);
        });
      }

      return searchResults.map(r => r.product);
    }

    return products || [];
  }, [allProducts, deferredSearchTerm, selectedCategoryId, categoryDescendants]);

  useEffect(() => {
    setVisibleCount(INITIAL_LOAD_COUNT);
  }, [filteredProducts]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 500;

    if (isNearBottom) {
      setVisibleCount(prevCount => Math.min(prevCount + LOAD_MORE_COUNT, filteredProducts.length));
    }
  }, [filteredProducts.length]);


  const handleSelectProduct = (product: Product, isChecked: boolean) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      if (isChecked && product.id) {
        newMap.set(product.id, product);
      } else if (product.id) {
        newMap.delete(product.id);
      }
      return newMap;
    });
  }

  const handleAddClick = () => {
    onProductsSelected(Array.from(selectedProducts.values()));
    setSelectedProducts(new Map());
    onOpenChange(false);
  }

  const handleClose = () => {
    setSelectedProducts(new Map());
    setSearchTerm('');
    setSelectedCategoryId(null);
    onOpenChange(false);
  }

  const handleQuickAddSuccess = () => {
    // Refresh products list
    setIsLoadingProducts(true);
    getProductList().then(res => {
      if (res.success && res.data) {
        setAllProducts(res.data);
      }
      setIsLoadingProducts(false);
    });
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Teklife Ürün Ekle</DialogTitle>
              <DialogDescription>
                {targetGroupName
                  ? `"${targetGroupName}" grubuna ürün ekliyorsunuz.`
                  : "Kategori seçerek ve arama yaparak ürünleri filtreleyin, ardından eklemek istediklerinizi seçin."
                }
              </DialogDescription>
            </DialogHeader>
          </div>
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 rounded-lg border-t"
          >
            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="flex flex-col h-full">
                <h3 className="font-semibold p-4 border-b">Tesisat Kategorileri</h3>
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-1 p-2">
                    <div
                      className={cn("flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent text-sm", !selectedCategoryId && "bg-accent text-accent-foreground")}
                      onClick={() => setSelectedCategoryId(null)}
                    >
                      Tüm Ürünler
                    </div>
                    {isLoadingCategories ? <Loader2 className="animate-spin mx-auto mt-4" /> : categoryTree.map(node => (
                      <CategoryNode key={node.id} node={node} level={0} onSelect={setSelectedCategoryId} selectedCategoryId={selectedCategoryId} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ürün adı, marka veya model ara..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="ml-4" onClick={() => setIsQuickAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Ürün Oluştur
                  </Button>
                </div>
                <ScrollArea className="flex-1" onScroll={handleScroll}>
                  <div className="space-y-2 p-4">
                    {isLoadingProducts ? <Loader2 className="animate-spin mx-auto mt-8" /> : (
                      filteredProducts.slice(0, visibleCount).map(product => {
                        const hasRecipe = product.id && recipeProductIds.has(product.id);
                        return (
                          <div key={product.id} className="flex items-center gap-4 p-2 border rounded-md">
                            <Checkbox
                              id={`product-${product.id}`}
                              checked={product.id ? selectedProducts.has(product.id) : false}
                              onCheckedChange={(checked) => handleSelectProduct(product, !!checked)}
                            />
                            <label htmlFor={`product-${product.id}`} className="flex-1 cursor-pointer flex items-center gap-2" title={hasRecipe ? "Bu bir reçeteli üründür." : undefined}>
                              {hasRecipe && <BookCopy className="h-4 w-4 text-primary" />}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.brand} - {product.model}</p>
                              </div>
                            </label>
                            <div className="text-sm font-mono">{formatCurrency(product.listPrice, product.currency)}</div>
                          </div>
                        )
                      })
                    )}
                    {!isLoadingProducts && filteredProducts.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Bu kategoriye ait veya aramanızla eşleşen ürün bulunamadı.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <div className="p-6 border-t">
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button onClick={handleAddClick} disabled={selectedProducts.size === 0}>
                {selectedProducts.size > 0 ? `${selectedProducts.size} Ürün Ekle` : 'Ürün Ekle'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <QuickAddProduct
        isOpen={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        onSuccess={handleQuickAddSuccess}
      />
    </>
  );
}
