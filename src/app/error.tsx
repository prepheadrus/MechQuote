'use client';

import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function InternalServerError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] p-6 text-center bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <CardTitle className="text-4xl font-bold">500</CardTitle>
          <CardDescription className="text-lg">
            Sunucu Hatası
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-2">
            Bir şeyler ters gitti. Lütfen daha sonra tekrar deneyin.
          </p>
          <p className="text-sm text-muted-foreground">
            Sorun devam ederse, sistem yöneticinizle iletişime geçin.
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
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
