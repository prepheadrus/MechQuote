import { success, error, handleActionError } from '../action-response';

describe('action-response utility', () => {
    describe('success()', () => {
        it('should return a SuccessResponse with data', () => {
            const data = { id: 1, name: 'Test' };
            const result = success(data);

            expect(result).toEqual({
                success: true,
                data
            });
        });

        it('should include a message when provided', () => {
            const data = { id: 1 };
            const message = 'Operation successful';
            const result = success(data, message);

            expect(result).toEqual({
                success: true,
                data,
                message
            });
        });
    });

    describe('error()', () => {
        it('should return an ErrorResponse with message', () => {
            const message = 'Something went wrong';
            const result = error(message);

            expect(result).toEqual({
                success: false,
                error: message
            });
        });

        it('should include code and details when provided', () => {
            const message = 'Validation failed';
            const code = 'ERR_VALIDATION';
            const details = { field: 'name' };

            const result = error(message, code, details);

            expect(result).toEqual({
                success: false,
                error: message,
                code,
                details
            });
        });
    });

    describe('handleActionError()', () => {
        let consoleErrorSpy: jest.SpyInstance;

        beforeEach(() => {
            // Mock console.error to keep test output clean and verify calls
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            // Restore console.error after each test
            consoleErrorSpy.mockRestore();
        });

        it('should handle standard Error objects', () => {
            const errorMessage = 'Database connection failed';
            const testError = new Error(errorMessage);

            const result = handleActionError(testError);

            expect(result).toEqual({
                success: false,
                error: errorMessage
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Action Error:', testError);
        });

        it('should use default message for non-Error objects (string)', () => {
            const testError = 'Just a string error';

            const result = handleActionError(testError);

            expect(result).toEqual({
                success: false,
                error: 'Bir hata oluştu'
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Action Error:', testError);
        });

        it('should use default message for non-Error objects (null)', () => {
            const testError = null;

            const result = handleActionError(testError);

            expect(result).toEqual({
                success: false,
                error: 'Bir hata oluştu'
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Action Error:', testError);
        });

        it('should use default message for non-Error objects (plain object)', () => {
            const testError = { some: 'error object' };

            const result = handleActionError(testError);

            expect(result).toEqual({
                success: false,
                error: 'Bir hata oluştu'
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Action Error:', testError);
        });

        it('should use custom default message for non-Error objects', () => {
            const testError = undefined;
            const customDefault = 'Custom default error message';

            const result = handleActionError(testError, customDefault);

            expect(result).toEqual({
                success: false,
                error: customDefault
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Action Error:', testError);
        });
    });
});
