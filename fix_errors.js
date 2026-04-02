const fs = require('fs');

// Fix src/services/purchase-history-service.ts type errors
let phs = fs.readFileSync('src/services/purchase-history-service.ts', 'utf8');

// Replace '{ where: { isDeleted: false } }' back to true or just remove it if it was a boolean argument
// In purchase-history-service.ts line 298: it says "error TS2322: Type '{ where: { isDeleted: false; }; }' is not assignable to type 'boolean | undefined'."
// This happens when patching include: { something: true } -> include: { something: { where: { isDeleted: false } } } but Prisma schema doesn't support where on that relation (e.g. 1-to-1 or to-1 relation where Prisma doesn't accept 'where').
// 'invoice' is an Invoice? (optional to-1 relation). Prisma doesn't allow 'where' on to-1 includes. We must revert `invoice: { where: { isDeleted: false } }` to `invoice: true`.

phs = phs.replace(/invoice:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'invoice: true');
phs = phs.replace(/product:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'product: true');
// And customer if any
phs = phs.replace(/customer:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'customer: true');

fs.writeFileSync('src/services/purchase-history-service.ts', phs, 'utf8');
console.log('Fixed purchase-history-service.ts');
