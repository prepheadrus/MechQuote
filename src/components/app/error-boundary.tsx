/**
 * Global Error Boundary Component
 * 
 * Kullanım:
 * import { ErrorBoundary } from '@/components/app/error-boundary';
 * 
 * <ErrorBoundary fallback={<div>Bir hata oluştu</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Bir Hata Oluştu</AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p className="text-sm">
                {this.state.error?.message || 'Bilinmeyen bir hata oluştu.'}
              </p>
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Tekrar Dene
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="default" 
                  size="sm"
                >
                  Sayfayı Yenile
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
