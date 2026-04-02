'use client';

import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] p-6 text-center bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <FileQuestion className="h-16 w-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Sayfa Bulunamadı
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-2">
            Aradığınız sayfa taşınmış, silinmiş veya mevcut değil.
          </p>
          <p className="text-sm text-muted-foreground">
            URL&apos;yi kontrol edin veya ana sayfaya dönün.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
