'use client';

import * as React from 'react';
import { useWorkspace } from './workspace-context';
import { cn } from '@/lib/utils';
import { X, Home, FileText, LayoutDashboard, Settings, Layers, File, Briefcase, Users, Package, Warehouse, BookCopy, ClipboardList, PenTool } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Helper to get icon based on path or label
const getTabIcon = (path: string = '', label: string = '') => {
    const p = path.toLowerCase();
    const l = label.toLowerCase();

    if (l === 'anasayfa' || p === '/') return Home;
    if (p.includes('quotes') || l.includes('teklif')) return FileText;
    if (p.includes('settings') || l.includes('ayar')) return Settings;
    if (p.includes('dashboard') || l.includes('paneli')) return LayoutDashboard;
    if (p.includes('projects') || l.includes('proje')) return Briefcase;
    if (p.includes('customers') || l.includes('müşteri') || l.includes('cari')) return Users;
    if (p.includes('products') || l.includes('ürün')) return Package;
    if (p.includes('warehouse') || l.includes('depo') || l.includes('stok')) return Warehouse;
    if (p.includes('recipes') || l.includes('reçete')) return BookCopy;
    if (p.includes('templates') || l.includes('şablon')) return ClipboardList;
    if (p.includes('assignments') || l.includes('atama')) return PenTool;

    return File; // Default
};

export function TabBar() {
    const { tabs, activeTabId, closeTab, setActiveTab } = useWorkspace();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll active tab into view
    React.useEffect(() => {
        if (activeTabId && scrollRef.current) {
            // Find the element inside the scroll container
            // We need to query slightly differently because Radix/ScrollArea structure might vary
            // but standard querySelector usually works on the ref content.
            // Adjusting selector to match the rendered structure
            const activeElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeTabId, tabs.length]); // Scroll when tabs change too

    if (tabs.length === 0) return null;

    return (
        <div className="w-full bg-slate-100/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 h-9 flex items-end px-2 gap-1 overflow-hidden select-none print:hidden">
            <ScrollArea className="w-full whitespace-nowrap" ref={scrollRef}>
                <div className="flex items-end h-9 w-max pr-4">
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const Icon = getTabIcon(tab.url, tab.label);

                        return (
                            <div
                                key={tab.id}
                                data-tab-id={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "group relative flex items-center gap-2 px-3 h-8 min-w-[140px] max-w-[220px] cursor-pointer transition-all duration-200 rounded-t-md text-xs font-medium border-r border-transparent",
                                    isActive
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-[0_-1px_2px_rgba(0,0,0,0.03)] z-10 translate-y-[1px] border-t-2 border-t-blue-600"
                                        : "bg-transparent text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300 mb-0.5"
                                )}
                                title={tab.label}
                            >
                                <Icon className={cn("h-3.5 w-3.5 flex-shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                                <span className="truncate flex-1 text-left">{tab.label}</span>

                                {!tab.isPermanent && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeTab(tab.id);
                                        }}
                                        className={cn(
                                            "p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ml-1 h-5 w-5 flex items-center justify-center",
                                            isActive && "opacity-100 text-slate-300 hover:text-red-500" // Visible on active tab but subtle
                                        )}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}

                                {!isActive && (
                                    <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-slate-200 dark:bg-slate-800 group-hover:hidden" />
                                )}
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
        </div>
    );
}
