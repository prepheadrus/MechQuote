'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, Package, Users, Briefcase, Warehouse } from 'lucide-react';

export type Tab = {
    id: string;
    url: string;
    label: string;
    isActive: boolean;
    isPermanent?: boolean;
};

type WorkspaceContextType = {
    tabs: Tab[];
    activeTabId: string | null;
    openTab: (url: string, label: string) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;

    // Peek Panel (Side Drawer)
    peekUrl: string | null;
    peekTitle: string | null;
    openPeek: (url: string, title: string) => void;
    closePeek: () => void;

    // Global Heavy Tasks (Wizards, Importers)
    isImporterOpen: boolean;
    setImporterOpen: (open: boolean) => void;
    importerData: any;
    setImporterData: (data: any) => void;

    // Unsaved Changes Protection
    registerConfirmInterceptor: (id: string, interceptor: (() => Promise<boolean> | boolean) | null) => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial state setup - only run once on mount
    useEffect(() => {
        const savedTabs = localStorage.getItem('mechquote_tabs');
        if (savedTabs) {
            try {
                const parsed = JSON.parse(savedTabs);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTabs(parsed);
                    // Find if any tab matches the initial pathname
                    const matchingTab = parsed.find((t: Tab) => t.url === pathname);
                    if (matchingTab) {
                        setActiveTabId(matchingTab.id);
                    } else {
                        // Fallback to whichever was active if we don't match or the first permanent one
                        const lastActive = parsed.find((t: Tab) => t.isActive);
                        setActiveTabId(lastActive?.id || parsed[0].id);
                    }
                } else {
                    setTabs([{ id: 'dashboard', url: '/', label: 'Anasayfa', isActive: true, isPermanent: true }]);
                    setActiveTabId('dashboard');
                }
            } catch (e) {
                setTabs([{ id: 'dashboard', url: '/', label: 'Anasayfa', isActive: true, isPermanent: true }]);
                setActiveTabId('dashboard');
            }
        } else {
            setTabs([{ id: 'dashboard', url: '/', label: 'Anasayfa', isActive: true, isPermanent: true }]);
            setActiveTabId('dashboard');
        }
        setIsInitialized(true);
    }, []);

    // Persist tabs whenever they change
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('mechquote_tabs', JSON.stringify(tabs));
    }, [tabs, isInitialized]);

    const [peekUrl, setPeekUrl] = useState<string | null>(null);
    const [peekTitle, setPeekTitle] = useState<string | null>(null);

    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [importerData, setImporterData] = useState<any>(null);
    const [interceptors, setInterceptors] = useState<Record<string, () => Promise<boolean> | boolean>>({});

    const registerConfirmInterceptor = useCallback((id: string, interceptor: (() => Promise<boolean> | boolean) | null) => {
        setInterceptors(prev => {
            const next = { ...prev };
            if (interceptor) {
                next[id] = interceptor;
            } else {
                delete next[id];
            }
            return next;
        });
    }, []);

    // Sync active tab with current URL and auto-create tabs for known modules
    useEffect(() => {
        if (!isInitialized) return;

        // Special case for dashboard
        if (pathname === '/') {
            setActiveTabId('dashboard');
            return;
        }

        const exactTab = tabs.find(t => t.url === pathname);
        if (exactTab) {
            if (activeTabId !== exactTab.id) {
                setActiveTabId(exactTab.id);
            }
        } else {
            // Auto-create tab if it looks like a module page
            const isModule = [
                '/analytics', '/quotes', '/projects', '/assignments',
                '/invoices', '/warehouse', '/customers', '/products',
                '/recipes', '/installation-types', '/templates',
                '/personnel', '/settings'
            ].includes(pathname);

            if (isModule) {
                const labelMap: Record<string, string> = {
                    '/analytics': 'Master Analiz',
                    '/quotes': 'Teklifler',
                    '/projects': 'Projeler',
                    '/assignments': 'İş Atamaları',
                    '/invoices': 'Faturalar',
                    '/warehouse': 'Depo / Stok',
                    '/customers': 'Cari Hesaplar',
                    '/products': 'Ürünler',
                    '/recipes': 'Reçeteler',
                    '/installation-types': 'Kategoriler',
                    '/templates': 'Şablonlar',
                    '/personnel': 'Ekipler',
                    '/settings': 'Ayarlar'
                };

                const newId = Math.random().toString(36).substring(7);
                const newTab: Tab = {
                    id: newId,
                    url: pathname,
                    label: labelMap[pathname] || 'Yeni Sekme',
                    isActive: true
                };

                setTabs(prev => {
                    if (prev.find(t => t.url === pathname)) return prev;
                    return [...prev, newTab];
                });
                setActiveTabId(newId);
            }
        }
    }, [pathname, isInitialized]); // Only sync when pathname changes

    // Browser-level protection for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasUnsavedChanges = Object.values(interceptors).length > 0;
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [interceptors]);

    const openTab = useCallback((url: string, label: string) => {
        const existingTab = tabs.find(t => t.url === url);

        if (existingTab) {
            setActiveTabId(existingTab.id);
            router.push(url);
            return;
        }

        const newId = Math.random().toString(36).substring(7);
        const newTab: Tab = {
            id: newId,
            url: url,
            label: label,
            isActive: true
        };

        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        router.push(url);
    }, [router, tabs]);

    const closeTab = useCallback(async (id: string) => {
        // Check for interceptors (unsaved changes)
        if (interceptors[id]) {
            const canClose = await interceptors[id]();
            if (!canClose) return;
        }

        setTabs(prev => {
            const tabToClose = prev.find(t => t.id === id);
            if (!tabToClose || tabToClose.isPermanent) return prev;

            const index = prev.findIndex(t => t.id === id);
            const filtered = prev.filter(t => t.id !== id);

            // If we closed the active tab, switch to the one before it or the next one
            if (id === activeTabId) {
                const nextTab = filtered[Math.max(0, index - 1)] || filtered[0];
                if (nextTab) {
                    // Small delay to ensure state updates before navigation
                    setTimeout(() => {
                        setActiveTabId(nextTab.id);
                        router.push(nextTab.url);
                    }, 10);
                }
            }
            return filtered;
        });
    }, [activeTabId, router, interceptors]);

    const setActiveTab = useCallback((id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (tab) {
            setActiveTabId(id);
            router.push(tab.url);
        }
    }, [tabs, router]);

    const openPeek = (url: string, title: string) => {
        setPeekUrl(url);
        setPeekTitle(title);
    };

    const closePeek = () => {
        setPeekUrl(null);
        setPeekTitle(null);
    };

    return (
        <WorkspaceContext.Provider value={{
            tabs, activeTabId, openTab, closeTab, setActiveTab,
            peekUrl, peekTitle, openPeek, closePeek,
            isImporterOpen, setImporterOpen: setIsImporterOpen,
            importerData, setImporterData,
            registerConfirmInterceptor
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
}
