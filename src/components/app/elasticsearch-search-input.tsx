/**
 * Elasticsearch Search Input Component
 * 
 * Reusable search input with autocomplete and real-time results.
 * 
 * Usage:
 *   <ElasticsearchSearch
 *     index="products"
 *     onResultSelect={(product) => console.log(product)}
 *     placeholder="Ürün ara..."
 *   />
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useElasticsearchSearch, SearchResult } from '@/hooks/use-elasticsearch-search';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ElasticsearchSearchInputProps {
  index: string;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  minQueryLength?: number;
  debounceMs?: number;
  resultRenderer?: (result: SearchResult) => React.ReactNode;
  filterField?: string;
  filterValue?: any;
}

export function ElasticsearchSearchInput({
  index,
  onResultSelect,
  placeholder = 'Ara...',
  className = '',
  minQueryLength = 2,
  debounceMs = 300,
  resultRenderer,
  filterField,
  filterValue,
}: ElasticsearchSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    results,
    suggestions,
    loading,
    error,
    total,
    source,
    clear,
  } = useElasticsearchSearch(index, {
    debounceMs,
    minQueryLength,
    filters: filterField && filterValue ? { [filterField]: filterValue } : undefined,
  });

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setQuery(value);
    if (value.length >= minQueryLength) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    onResultSelect?.(result);
    setInputValue('');
    setQuery('');
    setOpen(false);
  };

  // Clear search
  const handleClear = () => {
    setInputValue('');
    setQuery('');
    clear();
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Default result renderer
  const defaultRenderer = (result: SearchResult) => (
    <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer">
      <div className="flex-1">
        <div className="font-medium">{result.name || result.title || result.companyName || 'İsimsiz'}</div>
        {result.brand && (
          <div className="text-sm text-muted-foreground">{result.brand}</div>
        )}
        {result.code && (
          <div className="text-xs text-muted-foreground">Kod: {result.code}</div>
        )}
      </div>
      {result.score && (
        <Badge variant="secondary" className="text-xs">
          %{Math.round(result.score * 100)}
        </Badge>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className="pl-10 pr-10"
            />
            {(inputValue || loading) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClear}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start" 
          side="bottom"
          avoidCollisions
        >
          <div className="max-h-[400px]">
            {error && (
              <div className="p-4 text-sm text-destructive">
                <p>⚠️ Arama hatası:</p>
                <p className="text-xs mt-1">{error}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Prisma fallback kullanılıyor...
                </p>
              </div>
            )}

            {results.length === 0 && !loading && !error && query.length >= minQueryLength && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Sonuç bulunamadı
              </div>
            )}

            <ScrollArea className="max-h-[350px]">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                >
                  {resultRenderer ? resultRenderer(result) : defaultRenderer(result)}
                </div>
              ))}
            </ScrollArea>

            {total > 0 && (
              <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {results.length} / {total} sonuç gösteriliyor
                </span>
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span className="capitalize">{source}</span>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-2 z-50">
          <div className="text-xs text-muted-foreground mb-1 px-2">Öneriler:</div>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 5).map((suggestion, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleInputChange(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SPECIALIZED COMPONENTS
// ============================================================================

export function ProductSearchInput(props: Omit<ElasticsearchSearchInputProps, 'index'>) {
  return (
    <ElasticsearchSearchInput
      index="products"
      placeholder="Ürün ara (ad, marka, kod)..."
      {...props}
    />
  );
}

export function CustomerSearchInput(props: Omit<ElasticsearchSearchInputProps, 'index'>) {
  return (
    <ElasticsearchSearchInput
      index="customers"
      placeholder="Müşteri ara (şirket adı, vergi no)..."
      {...props}
    />
  );
}

export function ProposalSearchInput(props: Omit<ElasticsearchSearchInputProps, 'index'>) {
  return (
    <ElasticsearchSearchInput
      index="proposals"
      placeholder="Teklif ara (no, başlık, müşteri)..."
      {...props}
    />
  );
}

export function InvoiceSearchInput(props: Omit<ElasticsearchSearchInputProps, 'index'>) {
  return (
    <ElasticsearchSearchInput
      index="invoices"
      placeholder="Fatura ara (no, müşteri)..."
      {...props}
    />
  );
}
