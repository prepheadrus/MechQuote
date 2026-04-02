const fs = require('fs');

function restoreInclude(file) {
    let content = fs.readFileSync(file, 'utf8');

    // purchase-history-service.ts line 298: product: { where: { isDeleted: false } } is causing issue.
    content = content.replace(/product:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'product: true');
    content = content.replace(/invoice:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*,?\s*\}/g, 'invoice: true');

    fs.writeFileSync(file, content, 'utf8');
}

['src/services/purchase-history-service.ts', 'src/services/invoice-item-service.ts', 'src/services/invoice-service.ts'].forEach(restoreInclude);
