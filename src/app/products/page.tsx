import { getProductAnalytics } from '@/actions/products';
import { ProductsPageContent } from '@/app/products/products-client-page';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
    const { data } = await getProductAnalytics();

    return (
        <ProductsPageContent
            initialProducts={data?.products || []}
            initialSuppliers={data?.suppliers || []}
            initialCategories={data?.categories || []}
            initialAnalytics={data?.analytics || null}
        />
    );
}