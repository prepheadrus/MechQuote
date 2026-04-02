import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika
      gcTime: 1000 * 60 * 60 * 24, // 24 saat
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factory (type safety)
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.customers.lists(), { filters }] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  products: {
    all: ['products'] as const,
    //...
  },
    proposals: {
    all: ['proposals'] as const,
    //...
  },
    invoices: {
    all: ['invoices'] as const,
    //...
  },
      projects: {
    all: ['projects'] as const,
    //...
  },
    personnel: {
    all: ['personnel'] as const,
    //...
  },
      assignments: {
    all: ['assignments'] as const,
    //...
  }
};
