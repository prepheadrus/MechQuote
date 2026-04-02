'use client';

import React from 'react';
import { useWorkspace } from './workspace-context';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { X, ExternalLink, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PeekPanel() {
    const { peekUrl, peekTitle, closePeek, openTab } = useWorkspace();

    const handleExpand = () => {
        if (peekUrl && peekTitle) {
            openTab(peekUrl, peekTitle);
            closePeek();
        }
    };

    return (
        <Sheet open={!!peekUrl} onOpenChange={(open) => !open && closePeek()}>
            <SheetContent side="right" className="w-[85vw] sm:w-[600px] p-0 gap-0 border-l glass-card depth-shadow">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-4 border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <SheetTitle className="text-sm font-bold truncate">
                                {peekTitle || "Hızlı Bakış"}
                            </SheetTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                title="Tam ekranda/Sekmede aç"
                                onClick={handleExpand}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-red-500"
                                onClick={closePeek}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </SheetHeader>
                    
                    <div className="flex-1 relative">
                        {peekUrl && (
                            <iframe 
                                src={peekUrl} 
                                className="absolute inset-0 w-full h-full border-0"
                                title="Peek Content"
                            />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
