import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export function useLoadingState(initialState: LoadingState = { isLoading: false, error: null }) {
  const [state, setState] = useState<LoadingState>(initialState);

  const executeWithLoading = useCallback(async (asyncFn: () => Promise<any>) => {
    setState({ isLoading: true, error: null });
    try {
      await asyncFn();
      setState({ isLoading: false, error: null });
    } catch (error: any) {
      setState({ isLoading: false, error: error.message || "Beklenmedik bir hata oluştu" });
    }
  }, []);

  return { ...state, executeWithLoading };
}