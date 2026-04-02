import { Metadata } from 'next';
import { CustomerDetailClientPage } from './customer-detail-client-page';
import { getCustomer } from '@/actions/customers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Müşteri Detayı',
};

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch customer data on the server
  const response = await getCustomer(id);
  const customer = response.success ? response.data : null;

  return <CustomerDetailClientPage initialCustomer={customer} />;
}
