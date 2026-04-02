const fs = require('fs');

// Fix src/services/invoice-service.ts type errors
let invSvc = fs.readFileSync('src/services/invoice-service.ts', 'utf8');

// src/services/invoice-service.ts(75,45): error TS2353: Object literal may only specify known properties, and 'where' does not exist in type 'CustomerDefaultArgs<DefaultArgs>'.
// Remove customer: { where: { isDeleted: false } } etc. from include: { customer: ... } since customer is a to-1 relation and doesn't support 'where'.
invSvc = invSvc.replace(/customer:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'customer: true');

// src/services/invoice-service.ts(643,31): error TS2322: Type '{ where: { isDeleted: false; }; }' is not assignable to type 'boolean | undefined'.
// src/services/invoice-service.ts(868,17): error TS2322: Type '{ where: { isDeleted: false; }; }' is not assignable to type 'boolean | undefined'.
// e.g. project: { where: { isDeleted: false } } -> project: true
invSvc = invSvc.replace(/project:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'project: true');

fs.writeFileSync('src/services/invoice-service.ts', invSvc, 'utf8');
console.log('Fixed invoice-service.ts');
