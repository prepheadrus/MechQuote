/**
 * Product Combobox Component
 * Searchable product selector for feedback correction
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getProducts } from '@/actions/products';

interface ProductComboboxProps {
  value: string | null;
  onChange: (product: { id: string; name: string } | null) => void;
  placeholder?: string;
}

export function ProductCombobox({
  value,
  onChange,
  placeholder = "Ürün seç...",
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getProducts();
      if (result.success && result.data) {
        const productList = result.data.map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        setProducts(productList);
      } else {
        console.error('[ProductCombobox] Failed to load products:', result.error);
      }
    } catch (error) {
      console.error('[ProductCombobox] Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim().length === 0) return products.slice(0, 50);

    // Normalize search term: Turkish-safe lowercase + remove special chars
    const normalize = (text: string) =>
      text
        .toLocaleLowerCase('tr-TR')
        .replace(/[*\-_./()°ø]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\u0307/g, '') // Remove combining dot above
        .trim();

    const normalizedSearch = normalize(searchTerm);
    const searchParts = normalizedSearch.split(' ').filter(p => p.length > 0);

    // Simple and fast: check if ALL parts exist in the product name
    const results = products.filter((product) => {
      const normalizedName = normalize(product.name);

      // Every part of the search must be found in the product name
      const matches = searchParts.every(part => normalizedName.includes(part));

      // Also try direct substring match (for cases like "125*45" → "125*45")
      const directMatch = product.name.toLocaleLowerCase('tr-TR').includes(
        searchTerm.toLocaleLowerCase('tr-TR')
      );

      return matches || directMatch;
    }).slice(0, 50);

    return results;
  }, [products, searchTerm]);

  const selectedProduct = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="truncate">{selectedProduct.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ürün ara..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Yükleniyor...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Ürün bulunamadı.
              </div>
            ) : (
              <CommandGroup>
                {filteredProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      onChange(product);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{product.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
