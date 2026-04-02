"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to logger
    logger.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultFallback;
      return <FallbackComponent error={this.state.error!} reset={() => this.setState({ error: null, hasError: false })} />;
    }

    return this.props.children;
  }
}

const DefaultFallback = ({ error, reset }: { error: Error; reset: () => void }) => {
  const router = useRouter();

  useEffect(() => {
    logger.error('[ErrorBoundary] UI Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl">Bir şeyler yanlış gitti!</CardTitle>
          <CardDescription>
            Beklenmedik bir hata oluştu
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4 font-mono bg-muted p-3 rounded">
            {error.message || "Bilinmeyen hata"}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Ana Sayfa
          </Button>
          <Button
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export { ErrorBoundary };