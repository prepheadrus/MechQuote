/**
 * Server Action Response Types
 * 
 * Tüm server actions için standart response formatı
 * 
 * @example
 * ```typescript
 * // Success
 * return { success: true, data: customer };
 * 
 * // Error
 * return { success: false, error: 'Müşteri bulunamadı' };
 * ```
 */

// ==================== BASE RESPONSE TYPES ====================

/**
 * Success Response
 */
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    error?: never;
    message?: string;
    count?: number;
}

/**
 * Error Response
 */
export interface ErrorResponse {
    success: false;
    data?: never;
    error: string;
    code?: string;
    details?: any;
}

/**
 * Combined Response Type
 */
export type ActionResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ==================== HELPER FUNCTIONS ====================

/**
 * Create success response
 */
export function success<T>(data: T, message?: string): SuccessResponse<T> {
    return {
        success: true,
        data,
        message
    };
}

/**
 * Create error response
 */
export function error(message: string, code?: string, details?: any): ErrorResponse {
    return {
        success: false,
        error: message,
        code,
        details
    };
}

/**
 * Handle action errors with consistent format
 */
export function handleActionError(
    error: unknown, 
    defaultMessage: string = 'Bir hata oluştu'
): ErrorResponse {
    console.error('Action Error:', error);
    
    const errorMessage = error instanceof Error 
        ? error.message 
        : defaultMessage;
    
    return {
        success: false,
        error: errorMessage
    };
}

// ==================== SPECIFIC RESPONSE TYPES ====================

/**
 * Customer Response
 */
export type CustomerResponse = ActionResponse<any>;

/**
 * Product Response
 */
export type ProductResponse = ActionResponse<any>;

/**
 * Proposal Response
 */
export type ProposalResponse = ActionResponse<any>;

/**
 * Invoice Response
 */
export type InvoiceResponse = ActionResponse<any>;

/**
 * Project Response
 */
export type ProjectResponse = ActionResponse<any>;

/**
 * Bulk Operation Response
 */
export interface BulkResponse<T = any> {
    success: boolean;
    results: Array<{
        item: T;
        status: 'success' | 'error';
        error?: string;
    }>;
    summary: {
        total: number;
        success: number;
        error: number;
    };
    error?: string;
}
