import { getCashBookEntries } from '@/actions/cash-book';
import { CashBookClientPage } from './cash-book-client-page';

export const dynamic = 'force-dynamic';

export default async function CashBookPage() {
    const result = await getCashBookEntries();
    const initialEntries = result.success ? result.data || [] : [];

    return <CashBookClientPage initialEntries={initialEntries} />;
}
