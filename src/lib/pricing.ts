

/**
 * @file Fiyat hesaplama iş mantığını içerir.
 *
 * GÜVENLİ FİNANSAL HESAPLAMA:
 * - Tüm ara işlemler integer (kuruş) bazında yapılır
 * - Yuvarlama hatalarını önler
 * - 4 basamak hassasiyet (güvenli)
 */

interface PriceCalculationInput {
  listPrice: number;       // Tedarikçinin ham liste fiyatı
  basePrice: number;       // Bu aslında maliyettir, ancak iskonto varsa üzerine yazılır.
  discountRate: number;    // 0-1 aralığında, örn: 0.15 (Liste fiyatına uygulanan tedarikçi iskontosu)
  profitMargin: number;    // 0-1 aralığında, örn: 0.20 (Maliyet üzerine eklenecek kâr)
  exchangeRate: number;    // Yabancı para birimi için, TL ise 1 olmalı
  quantity: number;
  vatRate: number;         // KDV oranı, örn: 0.20
  priceIncludesVat: boolean; // Girdi fiyatlarının KDV içerip içermediği
}

interface PriceCalculationOutput {
  cost: number;            // Orijinal para biriminde maliyet (Liste Fiyatı - İskonto) (KDV Hariç)
  tlCost: number;          // TL cinsinden maliyet (KDV Hariç)
  originalSellPrice: number; // Orijinal para biriminde KDV HARİÇ satış fiyatı (Maliyet + Kâr)
  tlSellPrice: number;       // TL cinsinden KDV HARİÇ satış fiyatı
  profitAmount: number;    // TL cinsinden BİRİM kâr tutarı
  totalTlSell: number;     // TL cinsinden KDV HARİÇ toplam satış tutarı
  totalTlCost: number;     // TL cinsinden toplam maliyet
  totalProfit: number;     // TL cinsinden toplam kâr
  totalVatAmount: number;  // TL cinsinden KDV tutarı
}

/**
 * Güvenli finansal yuvarlama fonksiyonu
 * JavaScript floating point hatalarını önler
 *
 * @param num - Yuvarlanacak sayı
 * @param decimals - Basamak sayısı (varsayılan: 4 - ara işlemler için güvenli)
 * @returns Yuvarlanmış sayı
 */
export function round(num: number, decimals: number = 4): number {
  // Floating point hatalarını önlemek için epsilon kullan
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Kuruş hassasiyetinde yuvarlama (2 basamak)
 * Nihai TL tutarlar için kullanılır
 */
export function roundCurrency(num: number): number {
  return round(num, 2);
}

/**
 * Yüzde hesaplama - güvenli
 * @param value - Ana değer
 * @param percentage - Yüzde (0-1 arası, örn: 0.20 = %20)
 */
export function percentageOf(value: number, percentage: number): number {
  return round(value * percentage);
}

/**
 * İskonto hesaplama - güvenli
 * @param price - Orijinal fiyat
 * @param discountRate - İskonto oranı (0-1 arası)
 */
export function applyDiscount(price: number, discountRate: number): number {
  return round(price * (1 - discountRate));
}

/**
 * Kâr marjı ekle - güvenli
 * @param cost - Maliyet
 * @param profitMargin - Kâr marjı (0-1 arası)
 */
export function applyProfitMargin(cost: number, profitMargin: number): number {
  return round(cost * (1 + profitMargin));
}

/**
 * KDV hesaplama - güvenli
 * @param amount - KDV hariç tutar
 * @param vatRate - KDV oranı (0-1 arası)
 */
export function calculateVat(amount: number, vatRate: number): number {
  return round(amount * vatRate);
}

/**
 * KDV dahil tutar hesaplama
 * @param amount - KDV hariç tutar
 * @param vatRate - KDV oranı (0-1 arası)
 */
export function addVat(amount: number, vatRate: number): number {
  return round(amount * (1 + vatRate));
}

/**
 * KDV hariç tutar hesaplama (KDV dahil fiyattan)
 * @param amount - KDV dahil tutar
 * @param vatRate - KDV oranı (0-1 arası)
 */
export function removeVat(amount: number, vatRate: number): number {
  return round(amount / (1 + vatRate));
}

/**
 * Verilen bilgilere göre birim ve toplam fiyatları KDV HARİÇ olarak hesaplar.
 * Yeni Mantık: Maliyet = Liste Fiyatı * (1 - İskonto). Satış Fiyatı = Maliyet * (1 + Kâr).
 * @returns Tüm KDV hariç maliyet, satış ve kâr bilgilerini içeren bir nesne.
 */
export function calculateItemTotals({
  listPrice,
  basePrice,
  discountRate,
  profitMargin,
  exchangeRate,
  quantity,
  vatRate,
  priceIncludesVat,
}: PriceCalculationInput): PriceCalculationOutput {

  // 1. KDV'den Arındırma
  const normalizedVatRate = (vatRate > 1) ? vatRate / 100 : vatRate;
  const vatDivisor = 1 + (normalizedVatRate || 0);
  const netListPrice = priceIncludesVat ? removeVat(listPrice, normalizedVatRate) : round(listPrice);
  const netBasePrice = priceIncludesVat ? removeVat(basePrice, normalizedVatRate) : round(basePrice);

  // 2. Birim Maliyet Hesaplaması (Cost)
  const cost = netListPrice > 0
    ? applyDiscount(netListPrice, discountRate)
    : netBasePrice;

  // 3. Satış Fiyatı Hesaplaması (Sell Price - KDV HARİÇ)
  const originalSellPrice = applyProfitMargin(cost, profitMargin);

  // 4. TL'ye Çevrim (2 basamak kuruş yuvarlaması ana tutarda yapılır)
  const tlCost = roundCurrency(cost * exchangeRate);
  const tlSellPrice = roundCurrency(originalSellPrice * exchangeRate);

  // 5. Kâr Hesaplaması (Profit)
  const profitAmount = roundCurrency(tlSellPrice - tlCost);

  // 6. Toplam Değerlerin Hesaplanması (Totals)
  const totalTlCost = roundCurrency(tlCost * quantity);
  const totalTlSell = roundCurrency(tlSellPrice * quantity);
  const totalProfit = roundCurrency(profitAmount * quantity);

  // 7. KDV Hesaplaması
  const totalVatAmount = calculateVat(totalTlSell, normalizedVatRate);

  return {
    cost,
    tlCost,
    originalSellPrice,
    tlSellPrice,
    profitAmount,
    totalTlSell,
    totalTlCost,
    totalProfit,
    totalVatAmount,
  };
}
