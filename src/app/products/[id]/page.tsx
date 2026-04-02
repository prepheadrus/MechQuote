import { getProductDetails } from '@/actions/products';
import { getPurchasingInsights } from '@/actions/purchasing-analysis';
import { ProductDetailClientPage } from './product-detail-client-page';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ürün Detayı',
};

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  // Await params if using Next.js 15, otherwise it's direct. Safe to treat as direct for now or await if needed.
  // In strict Next.js 15, params is a promise.
  const { id } = await params;

  // Check if it's an auto-generated ID (UUID) or legacy number?
  // Prisma uses strings. If the URL has a number, our action expects a string ID.
  // If the legacy ID was number, we might need a lookup logic?
  // Assuming ID in URL maps to ID in DB.

  const [result, insightsResult] = await Promise.all([
    getProductDetails(id),
    getPurchasingInsights(id)
  ]);

  // If failed, maybe it's not found
  if (!result.success || !result.data) {
    // If error is just "not found", show 404.
    // For now, let client handle empty state or redirect.
    // But better to return 404 here.
    return notFound();
  }

  return (
    <ProductDetailClientPage
      initialProduct={result.data.product}
      initialHistory={result.data.history}
      initialAnalytics={result.data.analytics}
      initialInsights={insightsResult.success ? insightsResult.data : undefined}
    />
  );
}
