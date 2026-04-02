'use client';

import React from 'react';
import { Plus, Package, BookCopy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

interface ComplementaryItemsProps {
    productId: string;
    recipes: any[];
    allProducts: any[];
    onAdd: (item: any) => void;
}

export function ComplementaryItems({ productId, recipes, allProducts, onAdd }: ComplementaryItemsProps) {
    // Find if this product has a recipe
    const recipe = recipes.find(r => r.productId === productId);
    
    if (!recipe || !recipe.recipeItems || recipe.recipeItems.length === 0) return null;

    // Filter out items already in the quote? (Maybe better to let the user decide)
    const items = recipe.recipeItems;

    return (
        <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 text-[9px] font-bold text-purple-600 uppercase tracking-tighter">
                <Sparkles className="h-2.5 w-2.5" />
                Tamamlayıcı Ürünler
            </div>
            <div className="flex flex-wrap gap-1 items-center">
                {items.length > 1 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 px-1.5 text-[9px] font-bold text-purple-600 hover:bg-purple-600 hover:text-white border border-dashed border-purple-300"
                        onClick={() => {
                            items.forEach((item: any, idx: number) => {
                                const fullProduct = allProducts.find(p => p.id === item.itemId);
                                const normalizedProduct = fullProduct ? {
                                    productId: fullProduct.id,
                                    name: fullProduct.name,
                                    brand: fullProduct.brand,
                                    model: fullProduct.model,
                                    quantity: item.quantity,
                                    unit: fullProduct.unit || item.unit,
                                    listPrice: fullProduct.listPrice,
                                    currency: fullProduct.currency,
                                    basePrice: fullProduct.basePrice,
                                    vatRate: fullProduct.vatRate,
                                    priceIncludesVat: fullProduct.priceIncludesVat
                                } : {
                                    productId: `custom_${Date.now()}_${idx}`,
                                    name: item.name,
                                    quantity: item.quantity,
                                    unit: item.unit,
                                    listPrice: item.cost,
                                    currency: 'TRY'
                                };
                                onAdd(normalizedProduct);
                            });
                        }}
                    >
                        Tümünü Ekle
                    </Button>
                )}
                {items.map((item: any, idx: number) => {
                    // Try to find the full product details from allProducts
                    const fullProduct = allProducts.find(p => p.id === item.itemId);
                    
                    return (
                        <TooltipProvider key={idx}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge 
                                        variant="outline" 
                                        className="h-5 px-1.5 gap-1 cursor-pointer hover:bg-purple-600 hover:text-white transition-all border-purple-200 text-purple-700 font-medium text-[10px]"
                                        onClick={() => {
                                            const normalizedProduct = fullProduct ? {
                                                productId: fullProduct.id,
                                                name: fullProduct.name,
                                                brand: fullProduct.brand,
                                                model: fullProduct.model,
                                                quantity: item.quantity,
                                                unit: fullProduct.unit || item.unit,
                                                listPrice: fullProduct.listPrice,
                                                currency: fullProduct.currency,
                                                basePrice: fullProduct.basePrice,
                                                vatRate: fullProduct.vatRate,
                                                priceIncludesVat: fullProduct.priceIncludesVat
                                            } : {
                                                productId: `custom_${Date.now()}_${idx}`,
                                                name: item.name,
                                                quantity: item.quantity,
                                                unit: item.unit,
                                                listPrice: item.cost,
                                                currency: 'TRY'
                                            };
                                            onAdd(normalizedProduct);
                                        }}
                                    >
                                        <Plus className="h-2.5 w-2.5" />
                                        {item.name}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs font-semibold">Teklife Ekle</p>
                                    <p className="text-[10px] opacity-70">{item.quantity} {item.unit || 'Adet'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
        </div>
    );
}
