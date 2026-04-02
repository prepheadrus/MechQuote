const fs = require('fs');
const files = [
    'src/actions/payment-actions.ts',
    'src/actions/products.ts',
    'src/actions/projects/projects.ts',
    'src/actions/search.ts',
    'src/app/api/invoices/cancelled/route.ts',
    'src/services/purchase-history-service.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Un-restricted regex that replaces any { where: { isDeleted: false } } in a select statement context
    // EXCEPT for specific relations
    const relations = [
        'customer', 'supplier', 'project', 'proposal', 'invoice', 'product', 'personnel', 'jobAssignment', 'payment', 'supplierQuote', 'transactions', 'proposals', 'projects', 'invoices', 'items', 'invoiceItems', 'linkedInProjects'
    ];

    content = content.replace(/([a-zA-Z0-9_]+)\s*:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, (match, p1) => {
        if (relations.includes(p1)) {
            return match;
        }
        return `${p1}: true`;
    });

    fs.writeFileSync(file, content);
}
console.log("Fixed More");
