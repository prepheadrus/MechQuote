import { getInvoices } from '@/actions/invoices';
import { InvoicesClientPage } from './invoices-client-page';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const result = await getInvoices();
    const initialInvoices = result.success ? result.data || [] : [];

    return <InvoicesClientPage initialInvoices={initialInvoices} />;
}
