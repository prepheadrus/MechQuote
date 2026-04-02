import { calculateItemTotals } from '../pricing';

describe('Pricing Calculation Logic (calculateItemTotals)', () => {

    // --- Happy Path ---
    test('should calculate correctly for a standard TRY product with profit margin', () => {
        const input = {
            listPrice: 100,
            basePrice: 0,
            discountRate: 0.10, // 10% discount
            profitMargin: 0.20, // 20% profit
            exchangeRate: 1,    // TRY
            quantity: 5,
            vatRate: 0.20,      // 20% VAT
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        // Cost: 100 * (1 - 0.10) = 90
        expect(result.cost).toBeCloseTo(90);
        expect(result.tlCost).toBeCloseTo(90);

        // Original Sell Price: 90 * (1 + 0.20) = 108
        expect(result.originalSellPrice).toBeCloseTo(108);
        expect(result.tlSellPrice).toBeCloseTo(108);

        // Profit Amount: 108 - 90 = 18
        expect(result.profitAmount).toBeCloseTo(18);

        // Totals:
        expect(result.totalTlCost).toBeCloseTo(90 * 5); // 450
        expect(result.totalTlSell).toBeCloseTo(108 * 5); // 540
        expect(result.totalProfit).toBeCloseTo(18 * 5); // 90

        // VAT: 540 * 0.20 = 108
        expect(result.totalVatAmount).toBeCloseTo(108);
    });

    test('should calculate correctly for an imported product (USD)', () => {
        const input = {
            listPrice: 100,
            basePrice: 0,
            discountRate: 0,
            profitMargin: 0.25,
            exchangeRate: 30, // 1 USD = 30 TRY
            quantity: 1,
            vatRate: 0.20,
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        expect(result.cost).toBeCloseTo(100);
        expect(result.tlCost).toBeCloseTo(3000); // 100 * 30
        expect(result.originalSellPrice).toBeCloseTo(125); // 100 * 1.25
        expect(result.tlSellPrice).toBeCloseTo(3750); // 125 * 30
        expect(result.totalTlSell).toBeCloseTo(3750);
    });

    // --- Edge Cases ---
    test('should handle VAT removal correctly when priceIncludesVat is true', () => {
        const input = {
            listPrice: 120, // 100 + 20% VAT
            basePrice: 0,
            discountRate: 0,
            profitMargin: 0,
            exchangeRate: 1,
            quantity: 1,
            vatRate: 20, // testing integer VAT rate normalization
            priceIncludesVat: true,
        };

        const result = calculateItemTotals(input);

        // netListPrice should be 120 / 1.2 = 100
        expect(result.cost).toBeCloseTo(100);
        expect(result.originalSellPrice).toBeCloseTo(100);
        expect(result.totalVatAmount).toBeCloseTo(20); // 100 * 0.2
    });

    test('should use basePrice if listPrice is 0', () => {
        const input = {
            listPrice: 0,
            basePrice: 80,
            discountRate: 0.5, // Should be ignored as listPrice is 0
            profitMargin: 0.2,
            exchangeRate: 1,
            quantity: 1,
            vatRate: 0.18,
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        expect(result.cost).toBeCloseTo(80);
        expect(result.originalSellPrice).toBeCloseTo(96); // 80 * 1.2
    });

    test('should handle zero quantity', () => {
        const input = {
            listPrice: 100,
            basePrice: 0,
            discountRate: 0,
            profitMargin: 0.2,
            exchangeRate: 1,
            quantity: 0,
            vatRate: 0.2,
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        expect(result.totalTlCost).toBeCloseTo(0);
        expect(result.totalTlSell).toBeCloseTo(0);
        expect(result.totalProfit).toBeCloseTo(0);
        expect(result.totalVatAmount).toBeCloseTo(0);
    });

    test('should handle zero VAT rate', () => {
        const input = {
            listPrice: 100,
            basePrice: 0,
            discountRate: 0,
            profitMargin: 0.1,
            exchangeRate: 1,
            quantity: 1,
            vatRate: 0,
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        expect(result.totalVatAmount).toBeCloseTo(0);
        expect(result.tlSellPrice).toBeCloseTo(110);
    });

    test('should handle zero profit margin (at cost sale)', () => {
        const input = {
            listPrice: 100,
            basePrice: 0,
            discountRate: 0.1,
            profitMargin: 0,
            exchangeRate: 1,
            quantity: 1,
            vatRate: 0.2,
            priceIncludesVat: false,
        };

        const result = calculateItemTotals(input);

        expect(result.cost).toBeCloseTo(90);
        expect(result.tlSellPrice).toBeCloseTo(90);
        expect(result.totalProfit).toBeCloseTo(0);
    });

});
