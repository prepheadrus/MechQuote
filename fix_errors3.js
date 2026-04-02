const fs = require('fs');

// Fix src/services/invoice-item-service.ts type errors
let content = fs.readFileSync('src/services/invoice-item-service.ts', 'utf8');
content = content.replace(/invoice:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'invoice: true');
content = content.replace(/product:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'product: true');
content = content.replace(/customer:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'customer: true');
// src/services/invoice-item-service.ts(15,23): error TS2322: Type '{ where: { isDeleted: false; }; }' is not assignable to type 'boolean | undefined'.
// This is likely from an include block:
content = content.replace(/where: { isDeleted: false }/g, 'where: { isDeleted: false }'); // we already fixed the syntax above, let's do a more robust check

// Let's use string replace for exactly the faulty ones based on TS output:
fs.writeFileSync('src/services/invoice-item-service.ts', content, 'utf8');

// For ai-cache-service.ts
let aicache = fs.readFileSync('src/services/ai-cache-service.ts', 'utf8');
// aicache: src/services/ai-cache-service.ts(203,5): error TS2322: Type '{ isDeleted: true; deletedAt: Date; }' is not assignable to type 'never'.
// This usually means `data: { isDeleted: true }` was injected into a where clause or something weird. Let's inspect.
fs.writeFileSync('src/services/ai-cache-service.ts', aicache, 'utf8');
