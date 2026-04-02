const fs = require('fs');

const logOutput = fs.readFileSync('typecheck.log', 'utf8');
const lines = logOutput.split('\n');

const filesToFix = new Set();

for (const line of lines) {
    if (line.includes("is not assignable to type 'boolean | undefined'")) {
        // The format is usually path/to/file.ts(line,col): error ...
        // We can split by '('
        const parts = line.split('(');
        if (parts.length > 1) {
            filesToFix.add(parts[0].trim());
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
    // However, some fields are relations and SHOULD keep { where: { isDeleted: false } }.
    // But the TypeScript compiler only complains about scalars.
    // The easiest regex that captures most of the ones causing errors:

    const scalarFields = ['id', 'name', 'totalAmount', 'createdAt', 'status', 'contractAmount', 'description', 'amount', 'date', 'category', 'type', 'customerId', 'supplierId', 'referenceId', 'referenceType', 'unit', 'listPrice', 'discountRate', 'quantity', 'projectId', 'cancelReason', 'brand', 'updatedAt', 'taxRate', 'email', 'address', 'contactName', 'phone', 'balance', 'currency', 'parentId', 'price', 'originalMatchId', 'invoiceItemId', 'productId', 'invoiceItemName', 'productName', 'feedbackCount', 'lastFeedbackAt', 'originalMatchName', 'confidence', 'method', 'userId', 'sessionId'];

    let replaced = false;
    for (const field of scalarFields) {
        // Handle spacing and optional quotes
        const regex1 = new RegExp(`${field}:\\s*\\{\\s*where:\\s*\\{\\s*isDeleted:\\s*false\\s*\\}\\s*\\}`, 'g');
        const newContent = content.replace(regex1, `${field}: true`);
        if (newContent !== content) {
            content = newContent;
            replaced = true;
        }
    }

    // Also cover the case where the field might be missing from my list. I can just blindly replace any lowercase alphanumeric field + `Id`
    // Wait, let's just use a general regex for any field that starts with lower case letter but isn't a known relation.
    // Actually, it's safer to just run `npm run typecheck` again and see if any are left.

    if (replaced) {
        fs.writeFileSync(file, content);
        console.log("Fixed file: " + file);
    }
}
