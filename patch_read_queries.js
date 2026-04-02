const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (f !== '__tests__' && f !== 'node_modules' && f !== '.next' && f !== 'dist') {
        walkDir(dirPath, callback);
      }
    } else {
      if ((f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'backup.ts' && f !== 'seed.ts' && f !== 'project-autopsy.ts' && !f.endsWith('.backup')) {
        callback(dirPath);
      }
    }
  });
}

function processFindUniqueToFirst(content) {
  // Convert findUnique to findFirst to allow isDeleted: false
  // e.g. prisma.model.findUnique({ where: { id } }) -> prisma.model.findFirst({ where: { id, isDeleted: false } })
  // We'll replace findUnique with findFirst globally because it's safer.
  return content.replace(/(prisma|tx)\.([a-zA-Z0-9_]+)\.findUnique\b/g, '$1.$2.findFirst');
}

function processContent(content) {
  content = processFindUniqueToFirst(content);
  return content;
}

walkDir('src', function(filePath) {
  // Skip autopsy/admin explicitly
  if (filePath.includes('autopsy') || filePath.includes('trash') || filePath.includes('admin')) {
      return;
  }

  let originalContent = fs.readFileSync(filePath, 'utf8');
  let newContent = processContent(originalContent);
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Converted findUnique -> findFirst in ${filePath}`);
  }
});
