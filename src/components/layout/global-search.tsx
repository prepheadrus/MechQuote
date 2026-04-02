'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { performGlobalSearch, type SearchResult } from '@/actions/search';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming a debounce hook exists
import { useRouter } from 'next/navigation';
import { Circle, FileText, Package, Briefcase, Users, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// A simple debounce hook needs to be created if it doesn't exist.
// For now, I'll assume it's at 'src/hooks/use-debounce.ts'
/*
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
*/

const ICONS: { [key: string]: React.ElementType } = {
    'Müşteri': Users,
    'Ürün': Package,
    'Teklif': FileText,
    'Fatura': FileText,
    'Proje': Briefcase,
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedSearch) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await performGlobalSearch(debouncedSearch);
      setResults(res);
      setLoading(false);
    };
    fetchResults();
  }, [debouncedSearch]);

  const onSelect = useCallback((result: SearchResult) => {
    // The app seems to open new tabs for navigation
    window.open(result.url, `_blank`);
    setOpen(false);
    setSearch('');
  }, [router]);
  
  const groupedResults = results.reduce((acc, result) => {
    (acc[result.type] = acc[result.type] || []).push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start rounded-md px-3 text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64'
        )}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="h-4 w-4 mr-2" />
        <span className="hidden lg:inline-flex">Ara...</span>
        <span className="inline-flex lg:hidden">Ara...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Müşteri, ürün, fatura veya proje ara..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {loading && <div className="p-4 text-sm text-center">Yükleniyor...</div>}
          {!loading && !results.length && debouncedSearch && (
             <CommandEmpty>"{debouncedSearch}" için sonuç bulunamadı.</CommandEmpty>
          )}
          {!loading && !results.length && !debouncedSearch && (
             <CommandEmpty>Aramak için bir şeyler yazın.</CommandEmpty>
          )}
          
          {Object.entries(groupedResults).map(([type, items]) => (
            <CommandGroup key={type} heading={type}>
              {items.map((item) => {
                const Icon = ICONS[item.type] || Circle;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.title}-${item.description}`}
                    onSelect={() => onSelect(item)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
