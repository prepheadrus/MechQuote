const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== '__tests__') {
        walkDir(dirPath, callback);
      }
    } else {
      if ((f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'backup.ts' && f !== 'seed.ts' && !f.endsWith('.backup')) {
        callback(dirPath);
      }
    }
  });
}

walkDir('src', function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Let's do a much safer replacement using exact regexes for specific cases we know

  // Case 1: .delete({ where: { ... } })
  // E.g. prisma.aICache.delete({ where: { id: cached.id } });
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.delete\(\{\s*where:\s*(\{[^}]+\})\s*\}\)/g,
    "$1.$2.update({ where: $3, data: { isDeleted: true, deletedAt: new Date() } })");

  // Multi-line delete where
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.delete\(\{\s*\n\s*where:\s*(\{[^}]+\}),?\s*\n\s*\}\)/g,
    "$1.$2.update({\n    where: $3,\n    data: { isDeleted: true, deletedAt: new Date() }\n})");

  // Multi-line deleteMany where
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.deleteMany\(\{\s*\n\s*where:\s*(\{[\s\S]*?\})\s*\n\s*\}\)/g,
    "$1.$2.updateMany({\n    where: $3,\n    data: { isDeleted: true, deletedAt: new Date() }\n})");

  // Single line deleteMany where
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.deleteMany\(\{\s*where:\s*(\{([^}]+)?\})\s*\}\)/g,
    "$1.$2.updateMany({ where: $3, data: { isDeleted: true, deletedAt: new Date() } })");

  // Empty deleteMany
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.deleteMany\(\{\}\)/g,
    "$1.$2.updateMany({ data: { isDeleted: true, deletedAt: new Date() } })");
  content = content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.deleteMany\(\)/g,
    "$1.$2.updateMany({ data: { isDeleted: true, deletedAt: new Date() } })");


  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
