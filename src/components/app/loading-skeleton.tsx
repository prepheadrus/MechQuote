/**
 * Merkezi Loading Component
 * 
 * Kullanım:
 * import { LoadingSkeleton } from '@/components/app/loading-skeleton';
 * 
 * <LoadingSkeleton lines={3} />
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ lines = 1, height = 'h-4', className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="p-6 space-y-4 border rounded-lg">
      <LoadingSkeleton lines={2} height="h-6" />
      <LoadingSkeleton lines={3} />
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} height="h-10" />
      ))}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="p-12 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
    </div>
  );
}
