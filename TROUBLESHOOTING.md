# TypeScript Errors Troubleshooting

The `Property 'auditLog' does not exist on type 'PrismaClient'` errors you are seeing are likely due to the TypeScript language server in your editor holding onto stale type definitions.

**Status:**
- `npx prisma generate` was run successfully.
- `index.d.ts` contains `AuditLog` model.
- `npm run build` completed successfully.

**Action Required:**
- Please **Restart the TypeScript Server** in your editor (In VS Code: `Ctrl+Shift+P` -> `TypeScript: Restart TS Server`).
- Or **Reload the Window** (`Ctrl+Shift+P` -> `Developer: Reload Window`).
