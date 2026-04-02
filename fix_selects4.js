const fs = require('fs');

const files = [
    'src/actions/dashboard-actions.ts',
    'src/actions/suppliers.ts',
    'src/actions/templates.ts',
    'src/services/invoice-service.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace any field that ends with 'Id', or is 'date', 'amount', 'totalAmount', 'createdAt', 'status'
    content = content.replace(/([a-zA-Z0-9_]+)\s*:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, (match, p1) => {
        // Exclude known relational properties from being replaced.
        // We know what relations are based on schema:
        const relations = [
            'customer', 'supplier', 'project', 'proposal', 'invoice', 'product', 'personnel', 'jobAssignment', 'payment', 'supplierQuote'
        ];
        if (relations.includes(p1) || relations.includes(p1.replace(/s$/, ''))) { // rough check
            return match; // Keep relation filter
        }
        return `${p1}: true`; // Replace scalar
    });

    fs.writeFileSync(file, content);
}
console.log("Fixed Remaining.");
