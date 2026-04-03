/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    getProjectStatusLabel,
    getProjectStatusBadge,
    getStatusBadge,
    formatCurrency,
    CurrencyDisplay,
    formatDate
} from '../formatters';

describe('formatters', () => {
    describe('getProjectStatusLabel', () => {
        it('should return correct label for current statuses', () => {
            expect(getProjectStatusLabel('SOZLESME_ASAMASI')).toBe('Sözleşme Aşaması');
            expect(getProjectStatusLabel('PROJE_PLANLAMA')).toBe('Proje Planlama');
            expect(getProjectStatusLabel('MALZEME_TEDARIK')).toBe('Malzeme Tedarik');
            expect(getProjectStatusLabel('SAHA_MOBILIZASYONU')).toBe('Saha Mobilizasyonu');
            expect(getProjectStatusLabel('MONTAJ_VE_IMALAT')).toBe('Montaj ve İmalat');
            expect(getProjectStatusLabel('TEST_VE_DEVREYE_ALMA')).toBe('Test ve Devreye Alma');
            expect(getProjectStatusLabel('GECICI_KABUL')).toBe('Geçici Kabul');
            expect(getProjectStatusLabel('EKSIK_GIDERME')).toBe('Eksik Giderme');
            expect(getProjectStatusLabel('PROJE_TAMAMLANDI')).toBe('Proje Tamamlandı');
            expect(getProjectStatusLabel('FATURALANDIRILDI_VE_KAPANDI')).toBe('Faturalandırıldı ve Kapandı');
            expect(getProjectStatusLabel('ASKIYA_ALINDI')).toBe('Askıya Alındı');
            expect(getProjectStatusLabel('IPTAL_EDILDI')).toBe('İptal Edildi');
        });

        it('should return correct label for legacy statuses', () => {
            expect(getProjectStatusLabel('Ongoing')).toBe('Devam Eden');
            expect(getProjectStatusLabel('Completed')).toBe('Tamamlanan');
            expect(getProjectStatusLabel('Pending')).toBe('Beklemede');
        });

        it('should return the input status if no match is found', () => {
            expect(getProjectStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
        });

        it('should return "Bilinmiyor" when status is empty or falsy', () => {
            expect(getProjectStatusLabel('')).toBe('Bilinmiyor');
            expect(getProjectStatusLabel(null as unknown as string)).toBe('Bilinmiyor');
            expect(getProjectStatusLabel(undefined as unknown as string)).toBe('Bilinmiyor');
        });
    });

    describe('getProjectStatusBadge', () => {
        it('should return destructive badge for cancelled/rejected statuses', () => {
            render(<div>{getProjectStatusBadge('IPTAL_EDILDI')}</div>);
            let badge = screen.getByText('İptal Edildi');
            expect(badge).toHaveClass('bg-destructive');

            render(<div>{getProjectStatusBadge('Rejected')}</div>);
            badge = screen.getByText('Rejected');
            expect(badge).toHaveClass('bg-destructive');
        });

        it('should return secondary/green badge for completed statuses', () => {
            render(<div>{getProjectStatusBadge('PROJE_TAMAMLANDI')}</div>);
            const badge = screen.getByText('Proje Tamamlandı');
            expect(badge).toHaveClass('bg-green-100');
        });

        it('should return outline/amber badge for pending statuses', () => {
            render(<div>{getProjectStatusBadge('ASKIYA_ALINDI')}</div>);
            const badge = screen.getByText('Askıya Alındı');
            expect(badge).toHaveClass('bg-amber-50');
        });

        it('should return default/blue badge for ongoing statuses', () => {
            render(<div>{getProjectStatusBadge('SOZLESME_ASAMASI')}</div>);
            const badge = screen.getByText('Sözleşme Aşaması');
            expect(badge).toHaveClass('bg-blue-100');
        });
    });

    describe('getStatusBadge', () => {
        it('should return correct badge for Approved', () => {
            render(<div>{getStatusBadge('Approved')}</div>);
            const badge = screen.getByText('Onaylandı');
            expect(badge).toHaveClass('bg-green-100');
        });

        it('should return correct badge for Ödendi', () => {
            render(<div>{getStatusBadge('Ödendi')}</div>);
            const badge = screen.getByText('Ödendi');
            expect(badge).toHaveClass('bg-green-100');
        });

        it('should return correct badge for Sent', () => {
            render(<div>{getStatusBadge('Sent')}</div>);
            const badge = screen.getByText('Gönderildi');
            expect(badge).toHaveClass('bg-blue-100');
        });

        it('should return correct badge for Rejected', () => {
            render(<div>{getStatusBadge('Rejected')}</div>);
            const badge = screen.getByText('Reddedildi');
            expect(badge).toHaveClass('bg-destructive');
        });

        it('should return correct badge for Kısmi Ödendi', () => {
            render(<div>{getStatusBadge('Kısmi Ödendi')}</div>);
            const badge = screen.getByText('Kısmi Ödendi');
            expect(badge).toHaveClass('bg-yellow-100');
        });

        it('should return correct badge for Ödenmedi', () => {
            render(<div>{getStatusBadge('Ödenmedi')}</div>);
            const badge = screen.getByText('Ödenmedi');
            expect(badge).toHaveClass('border-red-200', 'text-red-700');
        });

        it('should return taslak/default badge for Draft', () => {
            render(<div>{getStatusBadge('Draft')}</div>);
            const badge = screen.getByText('Taslak');
            // checking outline variant classes if needed, or just that it rendered
            expect(badge).toBeInTheDocument();
        });

        it('should return original text as default badge for unknown status', () => {
            render(<div>{getStatusBadge('SOME_STATUS')}</div>);
            const badge = screen.getByText('SOME_STATUS');
            expect(badge).toBeInTheDocument();
        });
    });

    describe('formatCurrency', () => {
        it('should format positive numbers correctly as TRY', () => {
            // Replace non-breaking spaces before assertion to avoid locale space issues
            const formatted = formatCurrency(1234.56).replace(/\s/g, ' ');
            expect(formatted).toContain('1.234,56');
            expect(formatted).toContain('₺');
        });

        it('should format 0 correctly', () => {
            const formatted = formatCurrency(0).replace(/\s/g, ' ');
            expect(formatted).toContain('0,00');
            expect(formatted).toContain('₺');
        });

        it('should format negative numbers correctly', () => {
            const formatted = formatCurrency(-500.75).replace(/\s/g, ' ');
            expect(formatted).toContain('500,75');
            expect(formatted).toContain('-');
            expect(formatted).toContain('₺');
        });

        it('should treat null or undefined as "-"', () => {
            expect(formatCurrency(null)).toBe('-');
            expect(formatCurrency(undefined)).toBe('-');
        });

        it('should accept "TL" and convert it to "TRY"', () => {
            const formatted = formatCurrency(100, 'TL').replace(/\s/g, ' ');
            expect(formatted).toContain('100,00');
            expect(formatted).toContain('₺');
        });

        it('should format other currencies correctly', () => {
            const formatted = formatCurrency(100, 'USD').replace(/\s/g, ' ');
            expect(formatted).toContain('100,00');
            expect(formatted).toContain('$');
        });
    });

    describe('CurrencyDisplay', () => {
        it('should render amount and currency correctly', () => {
            render(<CurrencyDisplay amount={1500.5} />);
            // formatToParts splits "1.500" into "1", ".", and "500" for grouping
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('.')).toBeInTheDocument();
            expect(screen.getByText('500')).toBeInTheDocument();
            expect(screen.getByText(',')).toBeInTheDocument();
            expect(screen.getByText('50')).toBeInTheDocument();
            expect(screen.getByText('₺')).toBeInTheDocument();
        });

        it('should render 0 when amount is null or undefined', () => {
            render(<CurrencyDisplay amount={null} />);
            expect(screen.getByText('0')).toBeInTheDocument();
            expect(screen.getByText(',')).toBeInTheDocument();
            expect(screen.getByText('00')).toBeInTheDocument();
        });

        it('should use custom class names', () => {
            const { container } = render(<CurrencyDisplay amount={100} className="custom-test-class" />);
            expect(container.firstChild).toHaveClass('custom-test-class');
        });

        it('should render with different currency', () => {
            render(<CurrencyDisplay amount={200} currency="USD" />);
            expect(screen.getByText('200')).toBeInTheDocument();
            expect(screen.getByText('$')).toBeInTheDocument();
        });
    });

    describe('formatDate', () => {
        it('should format Date objects correctly', () => {
            const date = new Date('2023-10-15T12:00:00Z');
            // Result formatting depends on the local timezone where tests are run
            // Because we pass 'tr-TR', it outputs e.g., '15.10.2023'
            const formatted = formatDate(date);
            expect(formatted).toMatch(/15[./]10[./]2023/);
        });

        it('should format ISO string dates correctly', () => {
            const formatted = formatDate('2023-10-15T12:00:00Z');
            expect(formatted).toMatch(/15[./]10[./]2023/);
        });

        it('should format number timestamps correctly', () => {
            const date = new Date('2023-10-15T12:00:00Z');
            const formatted = formatDate(date.getTime());
            expect(formatted).toMatch(/15[./]10[./]2023/);
        });

        it('should format Firebase-style timestamps correctly', () => {
            // seconds since epoch
            const date = new Date('2023-10-15T12:00:00Z');
            const seconds = Math.floor(date.getTime() / 1000);
            const formatted = formatDate({ seconds });
            expect(formatted).toMatch(/15[./]10[./]2023/);
        });

        it('should return "-" for null or undefined input', () => {
            expect(formatDate(null)).toBe('-');
            expect(formatDate(undefined)).toBe('-');
        });

        it('should return "-" for invalid date inputs', () => {
            expect(formatDate('invalid-date-string')).toBe('-');
            // invalid object format
            expect(formatDate({ notSeconds: 123 })).toBe('-');
        });
    });
});
