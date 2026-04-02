
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Database, Building } from 'lucide-react';

const settingsNavItems = [
  { href: '/settings/company-profile', label: 'Firma Profili', icon: Building },
  { href: '/settings', label: 'Veri Yönetimi', icon: Database },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r bg-background p-4">
        <h2 className="text-xl font-bold tracking-tight mb-4">Ayarlar</h2>
        <nav className="flex flex-col gap-1">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isActive && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
