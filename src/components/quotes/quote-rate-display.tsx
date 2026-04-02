/**
 * Quote Rate Display Component
 * 
 * Döviz kuru gösterimi ve güncelleme
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Loader2, RefreshCw } from 'lucide-react';

interface ExchangeRateDisplayProps {
    form: any;
    onRefresh: () => void;
    isFetching: boolean;
}

export const ExchangeRateDisplay = ({ form, onRefresh, isFetching }: ExchangeRateDisplayProps) => {
    return (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <FormField 
                control={form.control} 
                name="exchangeRates.EUR" 
                render={({ field }) => (
                    <div className="text-right">
                        <span className="block text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">EUR</span>
                        <Input 
                            {...field} 
                            value={field.value ?? 1} 
                            type="number" 
                            step="any" 
                            className="h-auto p-0 border-0 rounded-none bg-transparent text-right font-mono text-sm font-bold text-blue-800 dark:text-blue-300 focus-visible:ring-0 w-20" 
                        />
                    </div>
                )} 
            />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
            <FormField 
                control={form.control} 
                name="exchangeRates.USD" 
                render={({ field }) => (
                    <div className="text-right">
                        <span className="block text-[10px] text-green-600 dark:text-green-400 uppercase font-bold">USD</span>
                        <Input 
                            {...field} 
                            value={field.value ?? 1} 
                            type="number" 
                            step="any" 
                            className="h-auto p-0 border-0 rounded-none bg-transparent text-right font-mono text-sm font-bold text-green-800 dark:text-blue-300 focus-visible:ring-0 w-20" 
                        />
                    </div>
                )} 
            />
            <Button 
                type="button" 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7" 
                onClick={onRefresh} 
                disabled={isFetching}
            >
                {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
};
