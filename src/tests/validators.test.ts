/**
 * Validators Test Suite
 * 
 * Form validation schema'larının testleri
 */

import { 
    CreateCustomerSchema,
    CreateProductSchema,
    TransactionFormSchema,
    NewQuoteFormSchema,
    validateWithSchema,
} from '@/lib/validators';
import { z } from 'zod';

describe('Validators', () => {
    describe('CreateCustomerSchema', () => {
        it('should validate valid customer data', () => {
            const validData = {
                name: 'Test Firma',
                taxId: '1234567890',
                taxOffice: 'Ankara',
                phone: '05551234567',
                email: 'test@example.com',
            };

            const result = CreateCustomerSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid tax ID', () => {
            const invalidData = {
                name: 'Test Firma',
                taxId: '123', // Too short
                phone: '05551234567',
            };

            const result = CreateCustomerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            
            if (!result.success) {
                expect(result.error.errors[0].path).toContain('taxId');
            }
        });

        it('should reject invalid phone number', () => {
            const invalidData = {
                name: 'Test Firma',
                phone: 'invalid-phone',
            };

            const result = CreateCustomerSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept optional fields', () => {
            const minimalData = {
                name: 'Test Firma',
            };

            const result = CreateCustomerSchema.safeParse(minimalData);
            expect(result.success).toBe(true);
        });
    });

    describe('CreateProductSchema', () => {
        it('should validate valid product data', () => {
            const validData = {
                name: 'Test Ürün',
                code: 'PROD-001',
                unitPrice: 100.50,
                unit: 'ADET',
                taxRate: 20,
            };

            const result = CreateProductSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject negative price', () => {
            const invalidData = {
                name: 'Test Ürün',
                unitPrice: -100,
            };

            const result = CreateProductSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject short product name', () => {
            const invalidData = {
                name: 'A', // Too short
                unitPrice: 100,
            };

            const result = CreateProductSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('TransactionFormSchema', () => {
        it('should validate valid transaction', () => {
            const validData = {
                amount: 1000,
                type: 'Payment' as const,
                date: '2024-01-15',
                description: 'Test işlem',
            };

            const result = TransactionFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject zero amount', () => {
            const invalidData = {
                amount: 0,
                type: 'Payment',
                date: '2024-01-15',
            };

            const result = TransactionFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept valid transaction types', () => {
            const types = ['Payment', 'Debt', 'Credit', 'Opening'];
            
            types.forEach((type) => {
                const data = {
                    amount: 1000,
                    type,
                    date: '2024-01-15',
                };

                const result = TransactionFormSchema.safeParse(data);
                expect(result.success).toBe(true);
            });
        });
    });

    describe('NewQuoteFormSchema', () => {
        it('should validate valid quote data', () => {
            const validData = {
                customerId: 'customer-123',
                projectName: 'Test Proje',
                templateId: 'template-456',
            };

            const result = NewQuoteFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject missing customer', () => {
            const invalidData = {
                projectName: 'Test Proje',
            };

            const result = NewQuoteFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject short project name', () => {
            const invalidData = {
                customerId: 'customer-123',
                projectName: 'A', // Too short
            };

            const result = NewQuoteFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('validateWithSchema', () => {
        const TestSchema = z.object({
            name: z.string().min(3, 'İsim en az 3 karakter olmalıdır'),
            age: z.number().positive('Yaş pozitif olmalıdır'),
        });

        it('should return success and data for valid input', () => {
            const validData = {
                name: 'Ahmet',
                age: 25,
            };

            const result = validateWithSchema(TestSchema, validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validData);
            }
        });

        it('should return error message for invalid input', () => {
            const invalidData = {
                name: 'Al', // Too short
                age: 25,
            };

            const result = validateWithSchema(TestSchema, invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('İsim en az 3 karakter olmalıdır');
            }
        });

        it('should return error for invalid data type', () => {
            const invalidData = {
                name: 'Ahmet',
                age: -5, // Negative age
            };

            const result = validateWithSchema(TestSchema, invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Yaş pozitif olmalıdır');
            }
        });
    });
});
