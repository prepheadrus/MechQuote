const fs = require('fs');

const logOutput = fs.readFileSync('typecheck.log', 'utf8');
const lines = logOutput.split('\n');

const filesToFix = new Set();

for (const line of lines) {
    if (line.includes("is not assignable to type 'boolean | undefined'")) {
        const match = line.match(/^([^:]+):\d+:\d+:/);
        if (match) {
            filesToFix.add(match[1]);
        }
    }
}

for (const file of filesToFix) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace { where: { isDeleted: false } } inside select blocks with true for scalar fields.
    // A robust regex for this specific case is difficult without a full parser,
    // but the error lines tell us exactly where this is.
    // Instead of regex, let's just do a blanket replace of field: { where: { isDeleted: false } } to field: true
    // BUT only when it's clearly a scalar field error from our earlier bad script.
    // Let's use a simpler approach:
    // We can run a search and replace for `{ where: { isDeleted: false } }` and replace it with `true`
    // for fields like id, name, totalAmount, status, contractAmount, createdAt, description, amount, date, category, type.

    const scalarFields = ['id', 'name', 'totalAmount', 'createdAt', 'status', 'contractAmount', 'description', 'amount', 'date', 'category', 'type', 'customerId', 'amount', 'supplierId', 'description', 'referenceId', 'referenceType', 'unit', 'listPrice', 'discountRate', 'quantity', 'projectId', 'cancelReason', 'brand', 'category', 'updatedAt', 'taxRate', 'email', 'address', 'contactName', 'phone', 'balance', 'currency', 'parentId', 'price', 'originalMatchId', 'invoiceItemId', 'productId', 'type', 'invoiceItemName', 'productName', 'feedbackCount', 'lastFeedbackAt', 'originalMatchName', 'confidence', 'method', 'userId', 'sessionId'];

    for (const field of scalarFields) {
        const regex = new RegExp(`${field}:\\s*\\{\\s*where:\\s*\\{\\s*isDeleted:\\s*false\\s*\\}\\s*\\}`, 'g');
        content = content.replace(regex, `${field}: true`);
    }

    fs.writeFileSync(file, content);
}
console.log(`Fixed files: ${filesToFix.size}`);
