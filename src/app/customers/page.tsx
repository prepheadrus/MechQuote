import { getCustomerStats } from '@/actions/customers';
import { CustomersClientPage } from './customers-client-page';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const { data: customers } = await getCustomerStats();

  return <CustomersClientPage initialCustomers={customers || []} />;
}
