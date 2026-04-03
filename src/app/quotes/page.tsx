import { Metadata } from 'next';
import { Suspense } from 'react';
import { QuotesPageContent } from '@/app/quotes/quotes-client-page';
import { getProposalsWithAnalytics } from '@/actions/proposals';
import { getCustomerList } from '@/actions/customers';
import { getPersonnel } from '@/actions/personnel';
import { getSettings } from '@/actions/settings';
import { getTemplates } from '@/actions/templates';

export const metadata: Metadata = {
    title: 'Teklif Arşivi',
};

// A simple loading component to use as a fallback
const LoadingFallback = () => (
    <div className="p-8">
        <h2 className="text-2xl font-bold">Teklifler Yükleniyor...</h2>
    </div>
);

export default async function QuotesPage() {
    // Fetch all necessary data server-side using Promise.all for parallelism
    const [
        proposalsResult,
        customersResult,
        personnelResult,
        settingsResult,
        templatesResult
    ] = await Promise.all([
        getProposalsWithAnalytics(),
        getCustomerList(),
        getPersonnel(),
        getSettings(),
        getTemplates()
    ]);

    if (!proposalsResult.success || !customersResult.success) {
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-red-600">Veri Yükleme Hatası</h2>
                <p className="text-muted-foreground mt-2">
                    {proposalsResult.error || customersResult.error}
                </p>
            </div>
        );
    }

    // Ensure mandatory data exists
    if (!proposalsResult.data || !customersResult.data) {
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-red-600">Veri Bulunamadı</h2>
                <p className="text-muted-foreground mt-2">
                    Teklif veya müşteri verileri yüklenemedi.
                </p>
            </div>
        );
    }

    const proposals = proposalsResult.data.proposals || [];
    const customers = customersResult.data || [];
    const analytics = proposalsResult.data.analytics;
    const personnel = personnelResult.success ? (personnelResult.data || []) : [];
    const settings = settingsResult.success ? settingsResult.data : null;
    const templates = templatesResult.success ? (templatesResult.data || []) : [];

    return (
        <Suspense fallback={<LoadingFallback />}>
            <QuotesPageContent
                initialProposals={proposals}
                initialCustomers={customers}
                initialAnalytics={analytics}
                initialPersonnel={personnel}
                initialSettings={settings}
                initialTemplates={templates}
            />
        </Suspense>
    );
}

