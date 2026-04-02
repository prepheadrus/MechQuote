import { Metadata } from 'next';
import { QuoteDetailClientPage } from './quote-detail-client-page';
import { getProposal } from '@/actions/proposals';
import { getSupplierQuotesForProposal } from '@/actions/supplier-quotes';
import { getProductAnalytics } from '@/actions/products';
import { getLaborCosts } from '@/actions/labor-costs';
import { getRecipes } from '@/actions/recipes';
import { getCustomerList } from '@/actions/customers';
import { notFound } from 'next/navigation';

// Generate Metadata with dynamic title
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const proposalResult = await getProposal(id);

  if (proposalResult.success && proposalResult.data) {
    const customerName = proposalResult.data.customer?.name || 'Müşteri';
    const quoteNumber = proposalResult.data.quoteNumber || '';
    return {
      title: `${customerName} - ${quoteNumber}`,
    };
  }

  return {
    title: 'Teklif Detayı',
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch all necessary data in parallel
  const [proposalResult, supplierQuotesResult, productsResult, laborCostsResult, recipesResult, customersResult] = await Promise.all([
    getProposal(id),
    getSupplierQuotesForProposal(id),
    getProductAnalytics(),
    getLaborCosts(),
    getRecipes(),
    getCustomerList()
  ]);

  if (!proposalResult.success || !proposalResult.data) {
    notFound();
  }

  // Extract data with fallbacks
  const products = productsResult.success && productsResult.data ? productsResult.data.products : [];
  const installationTypes = productsResult.success && productsResult.data ? productsResult.data.categories : []; // Categories are InstallationTypes
  const laborCosts = laborCostsResult.success && laborCostsResult.data ? laborCostsResult.data : [];
  const recipes = recipesResult.success && recipesResult.data ? recipesResult.data : [];
  const customers = customersResult.success && customersResult.data ? customersResult.data : [];
  const supplierQuotes = supplierQuotesResult.success && supplierQuotesResult.data ? supplierQuotesResult.data : [];

  return (
    <QuoteDetailClientPage
      proposal={proposalResult.data}
      initialProducts={products}
      initialCustomers={customers}
      initialInstallationTypes={installationTypes}
      initialLaborCosts={laborCosts}
      initialRecipes={recipes}
      initialSupplierQuotes={supplierQuotes}
    />
  );
}
