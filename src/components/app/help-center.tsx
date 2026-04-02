'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { HelpCircle, Search, ChevronRight, X, Book, Sparkles, MessageCircleQuestion, ExternalLink, Rocket, Users, Wallet, Database, HardHat, BadgeDollarSign, Layout, Zap, CheckCircle2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getHelpDocs, HelpDoc } from '@/actions/help';
import { cn } from '@/lib/utils';

export function HelpCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [docs, setDocs] = useState<HelpDoc[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<HelpDoc | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchDocs = async () => {
                setIsLoading(true);
                const result = await getHelpDocs();
                if (result.success && result.data) {
                    setDocs(result.data);
                }
                setIsLoading(false);
            };
            fetchDocs();
        }
    }, [isOpen]);

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

    const categoryConfig: Record<string, { icon: any, color: string, bgColor: string }> = {
        '.': { icon: Layout, color: 'text-blue-500', bgColor: 'bg-blue-50' },
        'baslangic': { icon: Rocket, color: 'text-purple-500', bgColor: 'bg-purple-50' },
        'crm': { icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-50' },
        'finans': { icon: Wallet, color: 'text-green-500', bgColor: 'bg-green-50' },
        'merkezi-veri': { icon: Database, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
        'operasyon': { icon: HardHat, color: 'text-amber-500', bgColor: 'bg-amber-50' },
        'satis': { icon: BadgeDollarSign, color: 'text-rose-500', bgColor: 'bg-rose-50' },
    };

    const handleDocSelect = (doc: HelpDoc) => {
        setSelectedDoc(doc);
    };

    const handleBackToList = () => {
        setSelectedDoc(null);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-primary/10 transition-colors">
                    <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="sr-only">Yardım Merkezi</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
                {!selectedDoc && (
                    <div className="relative overflow-hidden bg-slate-900 pt-10 pb-12 px-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>

                        <div className="relative flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                        <Sparkles className="h-6 w-6 text-primary-foreground animate-pulse" />
                                    </div>
                                    <div>
                                        <SheetTitle className="text-white text-2xl font-black tracking-tight">Yardım Merkezi</SheetTitle>
                                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">MechQuote Support</p>
                                    </div>
                                </div>
                                <Link href="/help" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-2 border border-white/10 h-9">
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Tam Ekran</span>
                                    </Button>
                                </Link>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                </div>
                                <Input
                                    placeholder="Problem veya anahtar kelime yazın..."
                                    className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:ring-primary/30 focus:bg-white/10 transition-all text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedDoc && (
                    <SheetHeader className="p-6 border-b bg-white dark:bg-slate-950 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleBackToList}
                                className="h-10 w-10 rounded-xl"
                            >
                                <ChevronRight className="h-5 w-5 rotate-180" />
                            </Button>
                            <div className="flex-1 min-w-0">
                                <Badge variant="secondary" className="mb-1 text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border-none">
                                    {selectedDoc.categoryLabel}
                                </Badge>
                                <SheetTitle className="text-lg font-bold truncate">{selectedDoc.title}</SheetTitle>
                            </div>
                        </div>
                    </SheetHeader>
                )}

                <div className="flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full">
                        {isLoading ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="relative inline-block">
                                    <div className="h-12 w-12 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin"></div>
                                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 animate-pulse">Kütüphane analiz ediliyor...</p>
                            </div>
                        ) : selectedDoc ? (
                            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black mb-6 tracking-tight text-slate-900 dark:text-white" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-10 mb-4 flex items-center gap-3 text-slate-800 dark:text-slate-100 border-l-4 border-primary pl-4" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-6 mb-3 text-slate-800" {...props} />,
                                            p: ({ node, ...props }) => <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5 text-[15px]" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-none pl-0 space-y-3 mb-6" {...props} />,
                                            li: ({ node, ...props }) => (
                                                <li className="flex gap-3 text-slate-600 dark:text-slate-400 text-[14px]">
                                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                                    <span>{props.children}</span>
                                                </li>
                                            ),
                                            strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-slate-100 bg-primary/5 px-1 rounded" {...props} />,
                                            hr: () => <Separator className="my-10 opacity-50" />,
                                            code: ({ node, ...props }) => <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props} />,
                                        }}
                                    >
                                        {selectedDoc.content}
                                    </ReactMarkdown>
                                </div>
                                <div className="mt-12 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                                    <p className="text-sm font-medium text-slate-600 mb-4">Bu döküman yardımcı oldu mu?</p>
                                    <div className="flex justify-center gap-3">
                                        <Button variant="outline" size="sm" className="rounded-xl h-10 px-6">Evet</Button>
                                        <Button variant="outline" size="sm" className="rounded-xl h-10 px-6">Hayır</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-10 animate-in fade-in duration-500">
                                {searchTerm ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Arama Sonuçları</p>
                                            <Badge variant="outline" className="rounded-full shadow-sm">{filteredDocs.length} Sonuç</Badge>
                                        </div>
                                        {filteredDocs.length > 0 ? (
                                            <div className="grid gap-3">
                                                {filteredDocs.map((doc) => {
                                                    const config = categoryConfig[doc.category] || categoryConfig['.'];
                                                    return (
                                                        <button
                                                            key={doc.id}
                                                            onClick={() => handleDocSelect(doc)}
                                                            className="w-full text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl hover:bg-white dark:hover:bg-slate-900 transition-all group relative overflow-hidden active:scale-[0.98]"
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", config.bgColor)}>
                                                                    <config.icon className={cn("h-6 w-6", config.color)} />
                                                                </div>
                                                                <div className="flex-1 min-w-0 pt-1">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{doc.title}</span>
                                                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                        {doc.content.replace(/#+\s/g, '').substring(0, 150)}...
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <MessageCircleQuestion className="h-10 w-10 text-slate-300" />
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-900 mb-2">Bulamadık...</h4>
                                                <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed mb-6">Aradığınız kriterlere uygun bir içerik şu an için kütüphanemizde yok.</p>
                                                <Button variant="secondary" onClick={() => setSearchTerm('')} className="rounded-xl px-10">Temizle ve Geri Dön</Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        {/* Featured Quick Actions */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => {
                                                    const startDoc = docs.find(d => d.id.includes('index.md') || d.id.includes('Hizli_Baslangic'));
                                                    if (startDoc) handleDocSelect(startDoc);
                                                }}
                                                className="col-span-1 flex items-center gap-4 p-5 rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform text-left"
                                            >
                                                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                                    <Rocket className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm tracking-tight leading-tight">Hızlı Başlangıç</p>
                                                    <p className="text-primary-foreground/70 text-[10px]">Temel kullanım</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const expertDoc = docs.find(d => d.id.includes('teklif-yonetimi.md'));
                                                    if (expertDoc) handleDocSelect(expertDoc);
                                                }}
                                                className="col-span-1 flex items-center gap-4 p-5 rounded-3xl bg-slate-800 text-white shadow-lg shadow-slate-200 dark:shadow-none hover:scale-[1.02] transition-transform text-left"
                                            >
                                                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                                    <Sparkles className="h-6 w-6 text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm tracking-tight leading-tight">Uzman Rehberi</p>
                                                    <p className="text-slate-400 text-[10px]">Mavi Bar & RFQ</p>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="space-y-8">
                                            {categories.map((cat) => {
                                                const config = categoryConfig[cat] || categoryConfig['.'];
                                                const catDocs = docs.filter(d => d.category === cat);
                                                if (catDocs.length === 0) return null;

                                                return (
                                                    <div key={cat} className="space-y-4">
                                                        <div className="flex items-center gap-3 px-2">
                                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", config.bgColor)}>
                                                                <config.icon className={cn("h-4 w-4", config.color)} />
                                                            </div>
                                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                                                                {getCategoryLabel(cat)}
                                                            </h3>
                                                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-2"></div>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            {catDocs.map(doc => (
                                                                <button
                                                                    key={doc.id}
                                                                    onClick={() => handleDocSelect(doc)}
                                                                    className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-all group active:scale-[0.99] hover:shadow-sm"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                                            <Book className="h-4.5 w-4.5 text-slate-400 group-hover:text-primary transition-colors" />
                                                                        </div>
                                                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{doc.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-300 group-hover:text-primary/50 opacity-0 group-hover:opacity-100 transition-all uppercase">Oku</span>
                                                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        MechQuote Professional v0.2.10
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
