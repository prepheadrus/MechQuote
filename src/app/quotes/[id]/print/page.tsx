import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintQuoteClientPage } from './print-quote-client-page';
import { getProposalForPrint } from '@/actions/proposals';

export const metadata: Metadata = {
    title: 'Teklif Yazdır',
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PrintQuotePage({ params }: PageProps) {
    const { id } = await params;

    const result = await getProposalForPrint(id);

    if (!result.success || !result.data) {
        notFound();
    }

    const data = {
        ...result.data,
        settings: result.data.settings || undefined
    };

    return <PrintQuoteClientPage initialData={data as any} />;
}
