const fs = require('fs');

function restoreInclude(file) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace anything that looks like: relation: { where: { isDeleted: false } } where the relation shouldn't have where
    // Common to-1 relations: project, customer, invoice, product, supplier, proposal

    const to1 = ['project', 'customer', 'invoice', 'product', 'supplier', 'proposal'];
    for (let rel of to1) {
        let regex = new RegExp(`\\b${rel}\\s*:\\s*\\{\\s*where\\s*:\\s*\\{\\s*isDeleted\\s*:\\s*false\\s*\\}\\s*,?\\s*\\}`, 'g');
        content = content.replace(regex, `${rel}: true`);
    }

    // specific fix for services/ai-cache-service.ts line 203
    if (file.includes('ai-cache-service.ts')) {
        content = content.replace(/data:\s*\{\s*isDeleted:\s*true\s*,\s*deletedAt:\s*new Date\(\)\s*\}/g, 'data: { isDeleted: true, deletedAt: new Date() }');
    }

    fs.writeFileSync(file, content, 'utf8');
}

['src/services/purchase-history-service.ts', 'src/services/invoice-service.ts', 'src/services/invoice-item-service.ts', 'src/services/ai-cache-service.ts'].forEach(restoreInclude);
