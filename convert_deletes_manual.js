const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (filePath === 'src/services/ai-cache-service.ts') {
    content = content.replace(
      'await prisma.aICache.delete({ where: { id: cached.id } });',
      'await prisma.aICache.update({ where: { id: cached.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'const deleted = await prisma.aICache.deleteMany({',
      'const deleted = await prisma.aICache.updateMany({'
    );
    // Be careful here because updateMany requires 'data' too, so manual replace for deleteMany:
    content = content.replace(
      /const deleted = await prisma\.aICache\.updateMany\(\{\s*where: \{\s*expiresAt: \{ lt: now \}\s*\}\s*\}\);/g,
      'const deleted = await prisma.aICache.updateMany({ where: { expiresAt: { lt: now } }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/services/api-key-service.ts') {
    content = content.replace(
      'await prisma.aPIKey.delete({',
      'await prisma.aPIKey.update({'
    );
    content = content.replace(
      /await prisma\.aPIKey\.update\(\{\s*where: \{ id \}\s*\}\);/g,
      'await prisma.aPIKey.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/services/invoice-service.ts') {
    content = content.replace(
      'await tx.purchaseHistory.deleteMany({',
      'await tx.purchaseHistory.updateMany({'
    );
    content = content.replace(
      /await tx\.purchaseHistory\.updateMany\(\{\s*where: \{ invoiceId: id \},\s*\}\);/g,
      'await tx.purchaseHistory.updateMany({ where: { invoiceId: id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );

    content = content.replace(
      'await tx.invoice.delete({',
      'await tx.invoice.update({'
    );
    content = content.replace(
      /await tx\.invoice\.update\(\{\s*where: \{ id \},\s*\}\);/g,
      'await tx.invoice.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );

    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: transaction.id } });',
      'await tx.customerTransaction.update({ where: { id: transaction.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/services/invoice-item-service.ts') {
    content = content.replace(
      'await prisma.invoiceItem.delete({',
      'await prisma.invoiceItem.update({'
    );
    content = content.replace(
      /await prisma\.invoiceItem\.update\(\{\s*where: \{ id \},\s*\}\);/g,
      'await prisma.invoiceItem.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/services/purchase-history-service.ts') {
    content = content.replace(
      'await prisma.purchaseHistory.deleteMany({});',
      'await prisma.purchaseHistory.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      /await prisma\.purchaseHistory\.deleteMany\(\{\s*where: \{\s*productId: \{ in: batch\.map\(\(i\) => i\.productId\) \},\s*invoiceId: \{ not: null \},\s*\},\s*\}\);/g,
      'await prisma.purchaseHistory.updateMany({ where: { productId: { in: batch.map((i) => i.productId) }, invoiceId: { not: null } }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await prisma.purchaseHistory.deleteMany({});',
      'await prisma.purchaseHistory.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/actions/customer-transactions.ts') {
    content = content.replace(
      'await tx.customerTransaction.delete({',
      'await tx.customerTransaction.update({'
    );
    content = content.replace(
      /await tx\.customerTransaction\.update\(\{\s*where: \{ id: receiptId \}\s*\}\);/g,
      'await tx.customerTransaction.update({ where: { id: receiptId }, data: { isDeleted: true, deletedAt: new Date() } });'
    );

    content = content.replace(
      'await tx.customerTransaction.delete({',
      'await tx.customerTransaction.update({'
    );
    content = content.replace(
      /await tx\.customerTransaction\.update\(\{\s*where: \{ id: oldReceipt\.id \}\s*\}\);/g,
      'await tx.customerTransaction.update({ where: { id: oldReceipt.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/actions/projects/projects.ts') {
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: debtTx.id } });',
      'await tx.customerTransaction.update({ where: { id: debtTx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: ctx.id } });',
      'await tx.customerTransaction.update({ where: { id: ctx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: pTx.id } });',
      'await tx.customerTransaction.update({ where: { id: pTx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.project.delete({ where: { id } });',
      'await tx.project.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: debtTx.id } });',
      'await tx.customerTransaction.update({ where: { id: debtTx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: ctx.id } });',
      'await tx.customerTransaction.update({ where: { id: ctx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.customerTransaction.delete({ where: { id: pTx.id } });',
      'await tx.customerTransaction.update({ where: { id: pTx.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.jobAssignment.deleteMany({ where: { proposalId: prop.id } });',
      'await tx.jobAssignment.updateMany({ where: { proposalId: prop.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await tx.jobAssignment.deleteMany({ where: { proposalId: prop.id } });',
      'await tx.jobAssignment.updateMany({ where: { proposalId: prop.id }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/actions/proposals/proposals.ts') {
    content = content.replace(
      'await tx.customerTransaction.deleteMany({',
      'await tx.customerTransaction.updateMany({'
    );
    content = content.replace(
      /await tx\.customerTransaction\.updateMany\(\{\s*where: \{\s*referenceId: proposalId,\s*type: 'Income',\s*category: 'Tahsilat',\s*\},\s*\}\);/g,
      "await tx.customerTransaction.updateMany({ where: { referenceId: proposalId, type: 'Income', category: 'Tahsilat' }, data: { isDeleted: true, deletedAt: new Date() } });"
    );

    content = content.replace(
      'await tx.proposalItem.deleteMany({',
      'await tx.proposalItem.updateMany({'
    );
    content = content.replace(
      /await tx\.proposalItem\.updateMany\(\{\s*where: \{ proposalId \},\s*\}\);/g,
      "await tx.proposalItem.updateMany({ where: { proposalId }, data: { isDeleted: true, deletedAt: new Date() } });"
    );
  } else if (filePath === 'src/actions/recipes.ts') {
    content = content.replace(
      'await tx.recipeItem.deleteMany({',
      'await tx.recipeItem.updateMany({'
    );
    content = content.replace(
      /await tx\.recipeItem\.updateMany\(\{\s*where: \{ recipeId: id \}\s*\}\);/g,
      "await tx.recipeItem.updateMany({ where: { recipeId: id }, data: { isDeleted: true, deletedAt: new Date() } });"
    );
  } else if (filePath === 'src/actions/maintenance.ts') {
    content = content.replace(
      'await tx.product.deleteMany({',
      'await tx.product.updateMany({'
    );
    content = content.replace(
      /await tx\.product\.updateMany\(\{\s*where: \{\s*id: \{\s*in: duplicateIds\s*\}\s*\}\s*\}\);/g,
      "await tx.product.updateMany({ where: { id: { in: duplicateIds } }, data: { isDeleted: true, deletedAt: new Date() } });"
    );

    content = content.replace(
      'const deletedTxs = await tx.customerTransaction.deleteMany({});',
      'const deletedTxs = await tx.customerTransaction.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });'
    );
  } else if (filePath === 'src/lib/elasticsearch-sync-hooks.ts') {
    content = content.replace(
      'await prisma.product.delete({ where: { id: productId } });',
      'await prisma.product.update({ where: { id: productId }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await prisma.customer.delete({ where: { id: customerId } });',
      'await prisma.customer.update({ where: { id: customerId }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await prisma.proposal.delete({ where: { id: proposalId } });',
      'await prisma.proposal.update({ where: { id: proposalId }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
    content = content.replace(
      'await prisma.invoice.delete({ where: { id: invoiceId } });',
      'await prisma.invoice.update({ where: { id: invoiceId }, data: { isDeleted: true, deletedAt: new Date() } });'
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
  'src/services/ai-cache-service.ts',
  'src/services/api-key-service.ts',
  'src/services/invoice-service.ts',
  'src/services/invoice-item-service.ts',
  'src/services/purchase-history-service.ts',
  'src/actions/customer-transactions.ts',
  'src/actions/projects/projects.ts',
  'src/actions/proposals/proposals.ts',
  'src/actions/recipes.ts',
  'src/actions/maintenance.ts',
  'src/lib/elasticsearch-sync-hooks.ts'
];

files.forEach(replaceFile);
