/**
 * Elasticsearch Search Hook
 * 
 * Unified search hook for all Elasticsearch indices.
 * Provides autocomplete, search, and fallback support.
 * 
 * Usage:
 *   const { search, suggestions, loading, error } = useElasticsearchSearch('products');
 *   const results = await search('63mm PPRC boru');
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

export interface SearchResult {
  id: string;
  score: number;
  [key: string]: any;
}

export interface SearchResponse {
  hits: SearchResult[];
  total: number;
  source: 'elasticsearch' | 'prisma';
}

export interface UseElasticsearchSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  size?: number;
  filters?: Record<string, any>;
}

export function useElasticsearchSearch(
  index: string,
  options: UseElasticsearchSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    size = 50,
    filters,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<'elasticsearch' | 'prisma'>('elasticsearch');

  // Debounce logic
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setSuggestions([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index,
          query: searchQuery,
          options: {
            size,
            filters,
            fuzzy: true,
            highlight: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.hits || []);
        setTotal(data.total || 0);
        setSource(data.source || 'elasticsearch');
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      console.error('[Search] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [index, minQueryLength, size, filters]);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch('/api/search/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index,
          query: searchQuery,
          field: 'name',
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Ignore suggestion errors
    }
  }, [index, minQueryLength]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery, search, fetchSuggestions]);

  // Manual query setter
  const setQueryManual = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Clear results
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setError(null);
  }, []);

  return {
    query,
    setQuery: setQueryManual,
    results,
    suggestions,
    loading,
    error,
    total,
    source,
    clear,
    search,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

export function useProductSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('products', { ...options, size: options.size || 50 });
}

export function useCustomerSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('customers', { ...options, size: options.size || 20 });
}

export function useProposalSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('proposals', { ...options, size: options.size || 20 });
}

export function useInvoiceSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('invoices', { ...options, size: options.size || 20 });
}

export function usePersonnelSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('personnel', { ...options, size: options.size || 20 });
}

export function useProjectSearch(options: UseElasticsearchSearchOptions = {}) {
  return useElasticsearchSearch('projects', { ...options, size: options.size || 20 });
}
