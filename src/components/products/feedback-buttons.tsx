/**
 * Feedback Buttons Component
 * Allows users to approve/reject/edit product matches
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Edit2, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { saveFeedback } from '@/actions/feedback';
import { ProductCombobox } from './product-combobox';

interface FeedbackButtonsProps {
  invoiceItemId: string;
  invoiceItemName: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  confidence?: number;
  method?: string;
  onFeedbackSubmitted: (type: 'approved' | 'rejected' | 'corrected', newProductId?: string) => void;
}

export function FeedbackButtons({
  invoiceItemId,
  invoiceItemName,
  matchedProductId,
  matchedProductName,
  confidence,
  method,
  onFeedbackSubmitted,
}: FeedbackButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const handleApprove = async () => {
    if (!matchedProductId) return;

    setIsSubmitting(true);
    try {
      const result = await saveFeedback({
        invoiceItemId,
        invoiceItemName,
        productId: matchedProductId,
        productName: matchedProductName!,
        type: 'approved',
        confidence: confidence || 0,
        method: method,
      });

      if (result.success) {
        toast({
          title: "✅ Onaylandı",
          description: "Geri bildiriminiz kaydedildi. Sistem bundan öğrenecek!",
          duration: 2000,
        });
        onFeedbackSubmitted('approved');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('[Feedback] Error approving:', error);
      toast({
        title: "Hata",
        description: "Geri bildirim kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const result = await saveFeedback({
        invoiceItemId,
        invoiceItemName,
        productId: matchedProductId || 'none',
        productName: matchedProductName || 'No Match',
        type: 'rejected',
        originalMatchId: matchedProductId || undefined,
        originalMatchName: matchedProductName || undefined,
        confidence: confidence || 0,
        method: method,
      });

      if (result.success) {
        toast({
          title: "❌ Reddedildi",
          description: "Yanlış eşleşme olarak işaretlendi.",
          duration: 2000,
        });
        onFeedbackSubmitted('rejected');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('[Feedback] Error rejecting:', error);
      toast({
        title: "Hata",
        description: "Geri bildirim kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleCorrect = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const result = await saveFeedback({
        invoiceItemId,
        invoiceItemName,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        type: 'corrected',
        originalMatchId: matchedProductId || undefined,
        originalMatchName: matchedProductName || undefined,
        confidence: confidence || 0,
        method: method,
      });

      if (result.success) {
        toast({
          title: "✅ Düzeltildi",
          description: `Doğru ürün: ${selectedProduct.name}`,
          duration: 2000,
        });
        onFeedbackSubmitted('corrected', selectedProduct.id);
        setIsEditDialogOpen(false);
        setSelectedProduct(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('[Feedback] Error correcting:', error);
      toast({
        title: "Hata",
        description: "Geri bildirim kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Approve Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleApprove}
          disabled={isSubmitting || !matchedProductId}
          title="Bu eşleşmeyi onaylıyorum"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </Button>

        {/* Reject Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleReject}
          disabled={isSubmitting}
          title="Bu eşleşme yanlış"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </Button>

        {/* Edit Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={handleEdit}
          disabled={isSubmitting}
          title="Doğrusunu seç"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Edit2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Doğru Ürünü Seç</DialogTitle>
            <DialogDescription>
              &quot;{invoiceItemName}&quot; için doğru ürünü seçin. Sistem bundan öğrenecek.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ProductCombobox
              value={selectedProduct?.id || null}
              onChange={(product) => setSelectedProduct(product)}
              placeholder="Ürün ara veya seç..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedProduct(null);
              }}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              onClick={handleCorrect}
              disabled={isSubmitting || !selectedProduct}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Kaydet ve Öğret
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
