const fs = require('fs');
let file = 'src/services/purchase-history-service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/invoice:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, 'invoice: true'); // This was probably the error in purchase-history-service
content = content.replace(/invoiceDate:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, 'invoiceDate: true');
content = content.replace(/netPrice:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, 'netPrice: true');

fs.writeFileSync(file, content);
console.log("Fixed purchase history");
