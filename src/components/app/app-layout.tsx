'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building, Home, Users, Package, FileText, Layers, ClipboardList,
    Menu, HardHat, ClipboardCheck, Settings, BookCopy, LayoutDashboard,
    Briefcase, Warehouse, BarChart3, ChevronDown, Rocket, DollarSign,
    Database, Cog, Wand2, Wallet
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { GlobalSearch } from '@/components/layout/global-search';
import { HelpCenter } from '@/components/app/help-center';
import { WorkspaceProvider, useWorkspace } from '@/components/workspace/workspace-context';
import { TabBar } from '@/components/workspace/tab-bar';
import { PeekPanel } from '@/components/workspace/peek-panel';
import { SmartProposalImporter } from '@/components/app/smart-proposal-importer';
import { getCustomerList } from '@/actions/customers';

function ImporterIndicator() {
    const { importerData, setImporterOpen } = useWorkspace();
    if (!importerData) return null;

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setImporterOpen(true)}
            className="bg-purple-600 text-white hover:bg-purple-700 animate-bounce shadow-lg gap-2 h-9 px-4 border-none"
        >
            <Wand2 className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-wider">Analizi Geri Getir</span>
        </Button>
    );
}

const navGroups = [
    {
        label: 'Operasyon',
        icon: Rocket,
        items: [
            { href: '/', label: 'Anasayfa', icon: Home, target: 'mechquote-main' },
            { href: '/analytics', label: 'Master Analiz', icon: BarChart3, target: '/analytics' },
            { href: '/quotes', label: 'Teklifler', icon: FileText, target: '/quotes' },
            { href: '/projects', label: 'Projeler', icon: Briefcase, target: '/projects' },
            { href: '/assignments', label: 'İş Atamaları', icon: ClipboardCheck, target: '/assignments' },
            { href: '/personnel', label: 'Ekipler', icon: HardHat, target: '/personnel' },
        ]
    },
    {
        label: 'Finans',
        icon: DollarSign,
        items: [
            { href: '/cash-book', label: 'Kasa Defteri', icon: Wallet, target: '/cash-book' },
            { href: '/invoices', label: 'Faturalar', icon: FileText, target: '/invoices' },
            { href: '/warehouse', label: 'Depo / Stok', icon: Warehouse, target: '/warehouse' },
        ]
    },
    {
        label: 'Katalog',
        icon: Database,
        items: [
            { href: '/customers', label: 'Cari Hesaplar', icon: Users, target: '/customers' },
            { href: '/products', label: 'Ürünler', icon: Package, target: '/products' },
            { href: '/recipes', label: 'Reçeteler', icon: BookCopy, target: '/recipes' },
            { href: '/installation-types', label: 'Kategoriler', icon: Layers, target: '/installation-types' },
            { href: '/templates', label: 'Şablonlar', icon: ClipboardList, target: '/templates' },
        ]
    },
    {
        label: 'Sistem',
        icon: Cog,
        items: [
            { href: '/audits', label: 'Sistem Kayıtları', icon: ClipboardList, target: '/audits' },
            { href: '/settings', label: 'Ayarlar', icon: Settings, target: '/settings' },
        ]
    }
];

const NavItem = ({ href, label }: { href: string, label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive
                    ? "text-primary bg-primary/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-50 dark:hover:bg-slate-800"
            )}
        >
            {label}
        </Link>
    )
}

export const MobileNavComponent = () => {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Menüyü aç</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
                <div className="p-6 border-b bg-slate-50/50">
                    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        <Building className="h-6 w-6 text-primary" />
                        <span className="text-lg">MechQuote</span>
                    </Link>
                </div>
                <ScrollArea className="h-[calc(100vh-80px)] p-4">
                    <nav className="flex flex-col gap-1">
                        {navGroups.map((group) => (
                            <div key={group.label} className="space-y-2 pt-2 first:pt-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/60 px-3">{group.label}</h3>
                                <div className="grid gap-0.5">
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                                                pathname === item.href
                                                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                                    : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                                            )}
                                        >
                                            <item.icon className={cn("h-4 w-4", pathname === item.href ? "opacity-100" : "opacity-60")} />
                                            <span>{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}


export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <WorkspaceProvider>
            <AppLayoutInner>{children}</AppLayoutInner>
        </WorkspaceProvider>
    );
}

function AppLayoutInner({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { openTab } = useWorkspace();
    const [customers, setCustomers] = useState<any[]>([]);
    useEffect(() => {
        // Only fetch if customers are empty to avoid infinite loops
        if (customers.length === 0) {
            getCustomerList().then(res => {
                if (res.success && res.data) setCustomers(res.data);
            });
        }
    }, [customers.length]);

    const isPrintPage = pathname?.includes('/print');

    if (isPrintPage) {
        return (
            <div className="bg-white font-sans overflow-visible">
                {children}
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950/50 print:h-auto print:block font-sans selection:bg-primary/20")}>
            <header className="sticky top-0 z-40 flex-shrink-0 glass border-b print-hidden">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <Link href="/" className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                                <Building className="h-6 w-6 text-primary" />
                                <span className="text-lg">MechQuote</span>
                            </Link>
                            <nav className="hidden md:flex gap-1">
                                {navGroups.map((group) => (
                                    <DropdownMenu key={group.label}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className={cn(
                                                "gap-1.5 font-bold transition-all px-3",
                                                group.items.some(item => pathname === item.href)
                                                    ? "text-primary bg-primary/5"
                                                    : "text-slate-600 hover:text-primary"
                                            )}>
                                                <group.icon className="h-4 w-4 opacity-70" />
                                                {group.label}
                                                <ChevronDown className="h-3 w-3 opacity-40" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-52 p-1.5 shadow-xl border-slate-200">
                                            {group.items.map((item) => (
                                                <DropdownMenuItem
                                                    key={item.href}
                                                    className={cn(
                                                        "rounded-md cursor-pointer group",
                                                        pathname === item.href ? "bg-primary/10 text-primary" : "focus:bg-primary/5 focus:text-primary"
                                                    )}
                                                    onClick={() => {
                                                        // Close any open persistent wizards if moving to a module
                                                        // or keep them but ensure we navigate
                                                        openTab(item.href, item.label)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2.5 w-full py-2 px-2">
                                                        <item.icon className={cn(
                                                            "h-4 w-4 transition-colors",
                                                            pathname === item.href ? "text-primary" : "text-slate-400 group-focus:text-primary"
                                                        )} />
                                                        <span className="font-medium text-sm">{item.label}</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Persistent Importer Indicator */}
                            <ImporterIndicator />
                            <GlobalSearch />
                            <HelpCenter />
                            <div id="exchange-rate-portal"></div>
                            <ThemeToggle />
                            <div className="md:hidden">
                                <MobileNavComponent />
                            </div>
                        </div>
                    </div>
                </div>
                <TabBar />
                <div id="sub-header-portal"></div>
            </header>
            <main className="flex-1 flex flex-col print:block overflow-y-auto page-transition">
                {children}
            </main>
            <PeekPanel />
            <SmartProposalImporter customers={customers} />
        </div>
    );
}
