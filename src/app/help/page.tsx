'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getHelpDocs, HelpDoc } from '@/actions/help';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, Book, ChevronRight, Home, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Simple Card placeholder
function Card({ children, className }: any) {
    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
            {children}
        </div>
    );
}

export default function HelpPage() {
    const [docs, setDocs] = useState<HelpDoc[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<HelpDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDocs = async () => {
            const result = await getHelpDocs();
            if (result.success && result.data) {
                setDocs(result.data);
            }
            setIsLoading(false);
        };
        fetchDocs();
    }, []);

    const filteredDocs = useMemo(() => {
        if (!searchTerm) return docs;
        const lowerSearch = searchTerm.toLocaleLowerCase('tr-TR');
        return docs.filter(doc => 
            doc.title.toLocaleLowerCase('tr-TR').includes(lowerSearch) ||
            doc.content.toLocaleLowerCase('tr-TR').includes(lowerSearch) ||
            doc.category.toLocaleLowerCase('tr-TR').includes(lowerSearch)
        );
    }, [docs, searchTerm]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(docs.map(doc => doc.category)));
        return cats.sort((a, b) => {
            if (a === '.') return -1;
            if (b === '.') return 1;
            return a.localeCompare(b);
        });
    }, [docs]);

    const getCategoryLabel = (cat: string) => {
        const doc = docs.find(d => d.category === cat);
        return doc?.categoryLabel || cat;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <Home className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h1 className="text-lg font-bold">MechQuote Yardım Merkezi</h1>
                        </div>
                    </div>
                    <div className="relative w-full max-w-md hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Kütüphanede ara..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Kategoriler</h3>
                            <nav className="space-y-1">
                                <Button 
                                    variant={!selectedDoc ? "secondary" : "ghost"} 
                                    className="w-full justify-start"
                                    onClick={() => setSelectedDoc(null)}
                                >
                                    Tüm Konular
                                </Button>
                                {categories.map(cat => (
                                    <div key={cat} className="pt-2">
                                        <p className="text-[10px] font-bold text-primary px-4 py-1 uppercase">{getCategoryLabel(cat)}</p>
                                        {docs.filter(d => d.category === cat).map(doc => (
                                            <Button 
                                                key={doc.id}
                                                variant={selectedDoc?.id === doc.id ? "secondary" : "ghost"} 
                                                className="w-full justify-start text-xs h-8"
                                                onClick={() => setSelectedDoc(doc)}
                                            >
                                                {doc.title}
                                            </Button>
                                        ))}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Content */}
                    <div className="md:col-span-3">
                        {selectedDoc ? (
                            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
                                <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                                    <div className="mb-8">
                                        <Badge variant="outline" className="mb-2 uppercase tracking-widest text-[10px]">
                                            {selectedDoc.category === '.' ? 'Genel' : selectedDoc.category}
                                        </Badge>
                                        <h1 className="text-4xl font-extrabold tracking-tight mt-2">{selectedDoc.title}</h1>
                                    </div>
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-12 mb-6 border-b pb-2" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-8 mb-4" {...props} />,
                                            p: ({node, ...props}) => <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-6" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc pl-8 space-y-3 mb-6" {...props} />,
                                            li: ({node, ...props}) => <li className="text-lg text-slate-600 dark:text-slate-400" {...props} />,
                                            code: ({node, ...props}) => <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-primary font-mono text-sm" {...props} />,
                                            hr: () => <Separator className="my-12" />,
                                        }}
                                    >
                                        {selectedDoc.content}
                                    </ReactMarkdown>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-8">
                                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                                    <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                                    <h2 className="text-3xl font-bold">Nasıl yardımcı olabiliriz?</h2>
                                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                        MechQuote Professional Bilgi Bankası'nda binlerce operasyonel detay ve iş akışı sizi bekliyor.
                                    </p>
                                    <div className="mt-8 max-w-lg mx-auto px-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input 
                                                placeholder="İş akışlarını veya butonları arayın..." 
                                                className="pl-12 h-14 text-lg rounded-2xl shadow-lg border-primary/20 focus:ring-primary/10"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                                    {filteredDocs.map(doc => (
                                        <button 
                                            key={doc.id}
                                            onClick={() => setSelectedDoc(doc)}
                                            className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all group text-left"
                                        >
                                            <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                                <Book className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{doc.title}</h4>
                                                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                                    {doc.content.replace(/#+\s/g, '').substring(0, 120)}...
                                                </p>
                                                <div className="flex items-center gap-1 text-primary text-xs font-bold pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Devamını Oku <ChevronRight className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
