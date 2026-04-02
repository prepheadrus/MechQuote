// Gemini PDF to UBL-TR XML Converter
// Converts PDF invoices to Turkish UBL-TR XML format using Gemini API

import { GoogleGenerativeAI } from "@google/generative-ai";

interface ConversionResult {
  success: boolean;
  xmlContent?: string;
  error?: string;
}

/**
 * Convert PDF content to UBL-TR XML using Gemini API (Vision/Multimodal)
 * @param pdfBase64 Base64 encoded PDF content
 * @param apiKey Gemini API key
 * @param modelName Gemini Model Name and version
 * @returns UBL-TR XML content
 */
export async function convertTextToUblXml(
  pdfBase64: string, // Changed from pdfText to pdfBase64
  apiKey: string,
  modelName: string = "gemini-1.5-flash-001"
): Promise<ConversionResult> {
  try {
    console.log(`📄 Starting PDF to UBL-TR XML conversion with Gemini (${modelName})...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Sen profesyonel bir veri madenciliği ve e-fatura uzmanısın. Görevin, sana gönderilen PDF fatura görüntüsünü yüksek hassasiyetle analiz etmek ve içeriği UBL-TR standartlarına uygun, basitleştirilmiş bir XML formatına dönüştürmektir.

### KRİTİK ANALİZ KURALLARI (BU KURALLARA KESİNLİKLE UY):

1. **TABLO TESPİTİ VE SÜTUN HİZALAMA:**
   - Faturadaki tablo yapısını görsel olarak analiz et. Sütun başlıklarını (Mal/Hizmet, Miktar, Birim Fiyat, İskonto Oranı, İskonto Tutarı, KDV Oranı, KDV Tutarı, Tutar) netleştir.
   - **DİKKAT:** Türk faturalarında genelde 8-9 sütun olur:
     * Mal/Hizmet → Miktar → Birim → Birim Fiyat → İskonto Oranı(%) → İskonto Tutarı → KDV Oranı(%) → KDV Tutarı → Toplam
   - İskonto sütunları genelde BOŞTUR, onları ATLAMA.
   - **KDV Tutarı sütununu MUTLAKA OKU!** Bu sütun KDV Oranı'nın HEMEN SAĞINDADIR.
   - Sütun kaymalarına karşı DİKKATLİ OL. Bazı faturalarda "Açıklama" sütunu çok geniş olabilir.
   - Eğer bir satır birden fazla fiziksel satıra yayılıyorsa (örn: uzun ürün adı), bu satırları tek bir <Line> bloğunda birleştir.

2. **MATEMATİKSEL DOĞRULAMA (SELF-CHECK):**
   - Her satır için: (Miktar * Birim Fiyat) - İskonto + KDV = Satır Toplamı kontrolünü yap.
   - Eğer faturada yazan rakamlar ile senin hesaplaman arasında küçük farklar varsa, FATURADA YAZAN rakamı önceliklendir ama mantıksal tutarlılığı koru.

3. **VERİ TEMİZLİĞİ:**
   - Sayısal değerlerdeki binlik ayraçlarını (nokta veya virgül) kaldır, sadece ondalık ayraç olarak nokta (.) kullan. Örn: "1.250,50" -> "1250.50".
   - Tarih formatı mutlaka YYYY-MM-DD olmalıdır.

4. **KRİTİK: KDV vs İSKONTO AYRIMI (EN ÖNEMLİ KURAL):**
   - Türk faturalarında ÇOĞUNLUKLA sadece KDV sütunu vardır, İskonto sütunu YOKTUR.
   - Eğer tabloda SADECE KDV sütunu varsa → TÜM yüzde değerleri KDV'dir, DiscountRate: 0 olmalı.
   - İskonto sütunu varsa bile, ürün satırında iskonto YOKSA → DiscountRate: 0, DiscountAmount: 0.
   - ASLA KDV oranını iskonto ile karıştırma!

5. **KDV TUTARI HESAPLAMA (KRİTİK!):**
   - Türk faturalarında genelde SADECE KDV ORANI (%) sütunu olur, KDV TUTARI sütunu olmaz.
   - EĞER tabloda KDV TUTARI sütunu YOKSA → MUTLAKA HESAPLA:
     * KDV Tutarı = (Miktar * Birim Fiyat) * (KDV Oranı / 100)
     * Örnek: Miktar=1, Birim Fiyat=100, KDV Oranı=20 → KDV Tutarı=20
   - Her satır için KDV Tutarını ayrı ayrı hesapla.
   - Toplam KDV'yi de tüm satırların KDV tutarlarını toplayarak bul.

6. **LİNE ELEMENTLERİNE DİKKAT:**
   - <Line> elementleri SADECE ürün/hizmet isimleri içermelidir.
   - Firma bilgileri, adres, vergi no, telefon gibi bilgileri <Line> içine EKLEME.
   - Her <Line> tek bir ürünü temsil etmelidir.

### XML ŞEMASI:
<Invoice>
    <InvoiceInfo>
        <ID>Fatura Numarası (Ör: GIB2024...)</ID>
        <Date>Fatura Tarihi (YYYY-MM-DD)</Date>
        <Currency>Para Birimi (TRY, USD, EUR)</Currency>
    </InvoiceInfo>

    <Seller>
        <Name>Satıcı Firma Adı (Tam Ünvan)</Name>
        <TaxID>10 haneli VKN veya 11 haneli TCKN</TaxID>
        <TaxOffice>Vergi Dairesi</TaxOffice>
        <Phone>Telefon</Phone>
        <Email>E-posta</Email>
        <Address>Tam Adres</Address>
    </Seller>

    <Buyer>
        <Name>Alıcı Firma Adı</Name>
        <TaxID>Alıcı VKN/TCKN</TaxID>
    </Buyer>

    <Lines>
        <Line>
            <Description>Ürün veya Hizmet Adı (Eksiksiz)</Description>
            <Quantity>Miktar (Sayı)</Quantity>
            <Unit>Birim (Adet, kg, m, vb.)</Unit>
            <UnitPrice>Birim Fiyat (İskonto Öncesi, KDV Hariç)</UnitPrice>
            <AllowancePercent>İskonto Oranı (%) - BOŞSA 0</AllowancePercent>
            <AllowanceAmount>İskonto Tutarı - BOŞSA 0</AllowanceAmount>
            <TaxPercent>KDV Oranı (%) - FATURADAN OKU</TaxPercent>
            <TaxAmount>KDV Tutarı - FATURADAN OKU (KDV Oranı'nın hemen sağındaki sütun!)</TaxAmount>
            <LineTotal>Satır Toplamı (KDV Dahil, İskonto Sonrası)</LineTotal>
        </Line>
    </Lines>

    <Totals>
        <NetTotal>Toplam Matrah (KDV Hariç)</NetTotal>
        <TaxTotal>Toplam KDV</TaxTotal>
        <TotalDiscount>Toplam İskonto</TotalDiscount>
        <PayableTotal>Genel Toplam (Ödenecek Tutar)</PayableTotal>
    </Totals>
</Invoice>

### ÖNEMLİ KURALLAR:
1. SADECE XML ÇIKTISI VER. XML KOD BLOKLARI (Markdown) KULLANMA.
2. HİÇBİR AÇIKLAMA, NOT VEYA GİRİŞ YAZISI EKLEME.
3. EĞER BİLGİ FATURADA YOKSA, O TAG'İ BOŞ BIRAK VEYA HİÇ EKLEME. ASLA "Bilinmiyor", "E-posta Adresi", "VKN/TCKN" GİBİ YER TUTUCU METİNLER YAZMA.
4. SATICI (SELLER) VE ALICI (BUYER) AYRIMINA ÇOK DİKKAT ET. "SAYIN"DAN SONRA GELEN ALICIDIR.
5. <Lines> BÖLÜMÜNE ASLA ADRES, VERGİ NO, BANKA BİLGİSİ GİBİ BAŞLIK BİLGİLERİNİ EKLEME. SADECE GERÇEK MAL VE HİZMETLERİ EKLE.
6. Her ürün için <Line> elementi oluştur. Ürün isimlerini kısaltma, tam yaz.
7. KDV Oranı yoksa 0 yaz, varsayılan 20 kullanma.
`;
    const pdfPart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf",
      },
    };

    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    let xmlContent = response.text();

    console.log('🤖 Raw Gemini Response:', xmlContent); // DEBUG LOG
    console.log('📄 Full XML Response Length:', xmlContent.length);

    // Log first 3000 chars to see structure
    console.log('📋 XML Preview:', xmlContent.substring(0, 3000));

    // 1. Try to cleanup Markdown code blocks first
    xmlContent = xmlContent.replace(/```xml\s*/gi, '').replace(/```\s*/g, '').trim();

    // 2. Remove potential preamble text before <?xml or <Invoice
    const startIndex = xmlContent.search(/<(\?xml|Invoice)/i);
    if (startIndex !== -1) {
      xmlContent = xmlContent.substring(startIndex);
    }
    
    // 3. Remove potential suffix text after </Invoice>
    const endIndex = xmlContent.lastIndexOf('</Invoice>');
    if (endIndex !== -1) {
      xmlContent = xmlContent.substring(0, endIndex + 10);
    }

    // 4. Smart Extraction: Find the main <Invoice> block
    // This handles cases where Gemini adds "Here is your XML:" preamble or "Note: ..." suffix
    const invoiceMatch = xmlContent.match(/<Invoice[\s\S]*?<\/Invoice>/i);
    if (invoiceMatch) {
      xmlContent = invoiceMatch[0];
      // If the declaration was outside the match (common), prepend it if missing
      if (!xmlContent.startsWith('<?xml')) {
        xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
      }
    }

    // Validate XML structure
    // We check for <Invoice only because the declaration might be messy
    if (!xmlContent.includes('<Invoice') || !xmlContent.includes('</Invoice>')) {
      console.error('❌ Malformed XML Content:', xmlContent);
      throw new Error(`Gemini geçerli bir XML döndürmedi. Gelen veri: ${xmlContent.substring(0, 100)}...`);
    }

    console.log('✅ PDF successfully converted to UBL-TR XML');
    console.log('📄 XML length:', xmlContent.length, 'characters');

    return {
      success: true,
      xmlContent
    };
  } catch (error: any) {
    console.error('❌ PDF to XML conversion failed:', error);
    return {
      success: false,
      error: error.message || 'Dönüştürme hatası'
    };
  }
}
