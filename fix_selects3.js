const fs = require('fs');

const logOutput = fs.readFileSync('typecheck2.log', 'utf8');
const lines = logOutput.split('\n');

const filesToFix = new Set();

for (const line of lines) {
    if (line.includes("is not assignable to type 'boolean | undefined'")) {
        const parts = line.split('(');
        if (parts.length > 1) {
            filesToFix.add(parts[0].replace(/^\d+:/, '').trim());
        }
    }
}

for (const file of filesToFix) {
    if (!fs.existsSync(file)) {
        console.log("File not found: " + file);
        continue;
    }
    let content = fs.readFileSync(file, 'utf8');

    // We want to replace `<fieldName>: { where: { isDeleted: false } }` with `<fieldName>: true` inside select blocks.
    // Instead of specifying every single field, let's look at the error lines. But it's easier to use a general regex.
    // Only lowercase alphanumeric identifiers should be caught. Relations like `customer` should NOT be caught.
    // Let's use an array of remaining scalar fields.
    const scalarFields = [
        'isDeleted', 'deletedAt', 'title', 'notes', 'tags', 'amount', 'date', 'type', 'category', 'description',
        'personnelId', 'projectId', 'customerId', 'supplierId', 'invoiceId', 'proposalId', 'id', 'name',
        'status', 'contractAmount', 'createdAt', 'updatedAt', 'referenceId', 'referenceType', 'unit',
        'listPrice', 'discountRate', 'quantity', 'cancelReason', 'brand', 'taxRate', 'email', 'address',
        'contactName', 'phone', 'balance', 'currency', 'parentId', 'price', 'originalMatchId', 'invoiceItemId',
        'productId', 'invoiceItemName', 'productName', 'feedbackCount', 'lastFeedbackAt', 'originalMatchName',
        'confidence', 'method', 'userId', 'sessionId', 'code', 'model', 'fileHash', 'fileType', 'result',
        'apiKeyUsed', 'provider', 'expiresAt', 'keyHash', 'isActive', 'usageCount', 'lastUsedAt', 'dailyLimit',
        'todayCount', 'resetDate', 'startDate', 'endDate', 'contractAmount', 'estimatedMaterialCost',
        'estimatedLaborCost', 'linkedProposalId', 'invoiceDate', 'netPrice', 'supplierName'
    ];

    let replaced = false;
    for (const field of scalarFields) {
        // Handle spacing and optional quotes
        const regex1 = new RegExp(`\\b${field}\\b\\s*:\\s*\\{\\s*where:\\s*\\{\\s*isDeleted:\\s*false\\s*\\}\\s*\\}`, 'g');
        const newContent = content.replace(regex1, `${field}: true`);
        if (newContent !== content) {
            content = newContent;
            replaced = true;
        }
    }

    if (replaced) {
        fs.writeFileSync(file, content);
        console.log("Fixed file: " + file);
    } else {
        console.log("No scalar field matched in: " + file);
        // Let's just find `[a-z][a-zA-Z0-9]*: { where: { isDeleted: false } }` and blindly replace it for fields that are known scalars
    }
}
