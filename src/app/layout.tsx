import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { AppLayout } from '@/components/app/app-layout';
import { ThemeProvider } from '@/components/app/theme-provider';
import { MLServiceProvider } from '@/components/ml/ml-service-provider';
import { ReactQueryProvider } from '@/providers/react-query-provider';

export const metadata: Metadata = {
  title: {
    template: '%s | MechQuote',
    default: 'MechQuote - Teklif Yönetim Sistemi',
  },
  description: 'Mekanik tesisat firmaları için modern ve akıllı teklif hazırlama ve maliyet analiz yazılımı.',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} ${jetbrainsMono.variable} antialiased bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <MLServiceProvider>
              <AppLayout>{children}</AppLayout>
            </MLServiceProvider>
          </ReactQueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
