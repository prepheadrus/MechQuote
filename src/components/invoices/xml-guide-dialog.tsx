
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileText, Copy, Check, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

export function XmlFormatGuideDialog() {
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const promptText = `Bu faturadaki bilgileri analiz et ve aşağıdaki XML şemasına birebir uyarak bana sadece XML çıktısı ver. Başka hiçbir açıklama yapma.

ÖNEMLİ KURALLAR:
1. **Sayı Formatı:** Türk formatını koru (Örnek: "1.234,56" veya "150,00"). Sakın noktayı ondalık için kullanma.
2. **Eksiksiz Sütunlar:** Tablodaki İskonto Oranı, İskonto Tutarı, KDV Oranı gibi sütunlar boş olsa bile XML içinde değerini "0" veya "0,00" olarak döndür. Asla etiketi atlama.
3. **Dip Toplamlar:** Faturanın en altındaki "Matrah", "Hesaplanan KDV", "Toplam İskonto", "Ödenecek Tutar" bilgilerini eksiksiz doldur.

XML Şeması:
<Invoice>
    <InvoiceInfo>
        <ID>Fatura Numarası (Ör: GIB2024...)</ID>
        <Date>Fatura Tarihi (YYYY-MM-DD)</Date>
    </InvoiceInfo>
    
    <Seller>
        <Name>Satıcı Firma Adı</Name>
        <TaxID>Vergi Kimlik No (VKN veya TCKN)</TaxID>
        <TaxOffice>Vergi Dairesi</TaxOffice>
        <Phone>Telefon Numarası</Phone>
        <Email>E-posta Adresi</Email>
        <Address>Tam Adres</Address>
    </Seller>
    
    <Buyer>
        <Name>Alıcı Firma Adı</Name>
        <TaxID>Alıcı VKN/TCKN</TaxID>
        <Address>Alıcı Adresi</Address>
    </Buyer>
    
    <Lines>
        <!-- Her satır için bir Line etiketi aç -->
        <!-- Tabloda İskonto veya KDV sütunu boş görünse bile buraya 0 yaz -->
        <Line>
            <Description>Ürün veya Hizmet Adı</Description>
            <Quantity>Miktar (Sayı)</Quantity>
            <Unit>Birim (Adet, Kg, Saat vb.)</Unit>
            <UnitPrice>Birim Fiyat (KDV Hariç)</UnitPrice>
            <DiscountRate>İskonto Oranı (Yoksa 0)</DiscountRate>
            <DiscountAmount>İskonto Tutarı (Yoksa 0)</DiscountAmount>
            <TaxPercent>KDV Oranı (Ör: 20)</TaxPercent>
            <TaxAmount>KDV Tutarı</TaxAmount>
            <LineTotal>Satır Toplam (KDV Hariç Tutar)</LineTotal>
        </Line>
    </Lines>
    
    <Totals>
        <NetTotal>KDV Matrahı (İskonto Düşüldükten Sonraki Tutar)</NetTotal>
        <TaxTotal>Hesaplanan KDV Toplamı</TaxTotal>
        <TotalDiscount>Varsa Toplam İskonto Tutarı (Yoksa 0)</TotalDiscount>
        <PayableTotal>Ödenecek Genel Toplam</PayableTotal>
    </Totals>
</Invoice>

SADECE XML VER. Rakamları olduğu gibi (virgüllü) bırak.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        toast({
            title: "Kopyalandı! 📋",
            description: "Komut panoya kopyalandı. ChatGPT veya Gemini'ye yapıştırabilirsiniz.",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="mt-4 cursor-pointer">
                    <Alert className="bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Daha İyi Sonuç İçin İpucu</AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                            Karmaşık faturalarda en kesin sonuç için, faturayı kendi yapay zeka asistanınıza (ChatGPT, Gemini vb.) yükleyip XML formatında alabilirsiniz.
                            <br />
                            <span className="font-semibold underline mt-1 block">Nasıl yapacağınızı görmek için tıklayın.</span>
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Yapay Zeka ile Kusursuz XML Dönüştürme
                    </DialogTitle>
                    <DialogDescription>
                        Aşağıdaki komutu kopyalayıp, kullandığınız yapay zeka aracına (ChatGPT, Gemini, Claude) faturanızla birlikte gönderin. Size vereceği XML kodunu bilgisayarınıza kaydedip buraya yükleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-4 bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto border">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-2 h-8 w-8 hover:bg-background"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {promptText}
                    </pre>
                </div>

                <DialogFooter>
                    <Button onClick={handleCopy} className="w-full sm:w-auto">
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Komutu Kopyala
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
