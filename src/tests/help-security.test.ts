import { getHelpDocs } from '../actions/help';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('@/lib/logger');

describe('getHelpDocs security', () => {
    const originalProcessCwd = process.cwd;

    beforeAll(() => {
        process.cwd = jest.fn().mockReturnValue('/app');
    });

    afterAll(() => {
        process.cwd = originalProcessCwd;
    });

    it('should filter out files outside of DOCS_DIR', async () => {
        const DOCS_DIR = '/app/docs';

        (fs.existsSync as jest.Mock).mockImplementation((p) => p === DOCS_DIR);

        // getFilesRecursively(DOCS_DIR) will call readdirSync(DOCS_DIR)
        (fs.readdirSync as jest.Mock).mockImplementation((p) => {
            if (p === DOCS_DIR) return ['../../etc/passwd.md', 'valid.md'];
            return [];
        });

        (fs.statSync as jest.Mock).mockImplementation((p) => ({
            isDirectory: () => false
        }));

        (fs.readFileSync as jest.Mock).mockReturnValue('# Content');

        const result = await getHelpDocs();

        const expectedTraversedPath = path.resolve(path.join(DOCS_DIR, '../../etc/passwd.md'));
        const expectedValidPath = path.resolve(path.join(DOCS_DIR, 'valid.md'));

        // Should NOT have been called with the traversed path
        expect(fs.readFileSync).not.toHaveBeenCalledWith(expectedTraversedPath, 'utf-8');
        // Should have been called with the valid path
        expect(fs.readFileSync).toHaveBeenCalledWith(expectedValidPath, 'utf-8');

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].path).toBe('valid.md');
    });

    it('should prevent partial directory name match bypass', async () => {
        const DOCS_DIR = '/app/docs';

        (fs.existsSync as jest.Mock).mockImplementation((p) => p === DOCS_DIR);

        // Simulate a file in a sibling directory that starts with the same name
        // e.g., /app/docs-secret/passwords.md
        const siblingFilePath = '/app/docs-secret/passwords.md';

        (fs.readdirSync as jest.Mock).mockImplementation((p) => {
            if (p === DOCS_DIR) return ['../docs-secret/passwords.md'];
            return [];
        });

        (fs.statSync as jest.Mock).mockImplementation((p) => ({
            isDirectory: () => false
        }));

        const result = await getHelpDocs();

        expect(fs.readFileSync).not.toHaveBeenCalledWith(siblingFilePath, 'utf-8');
        expect(result.data?.length).toBe(0);
    });
});
