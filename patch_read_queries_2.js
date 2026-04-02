const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (f !== '__tests__' && f !== 'node_modules' && f !== '.next' && f !== 'dist') {
        walkDir(dirPath, callback);
      }
    } else {
      if ((f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'backup.ts' && f !== 'seed.ts' && !f.endsWith('.backup')) {
        callback(dirPath);
      }
    }
  });
}

const methodNamesToPatch = new Set(['findMany', 'findFirst', 'count']);

function patchPrismaCalls(sourceFile, content) {
    let replacements = [];

    function visit(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const propAccess = node.expression;
            const methodName = propAccess.name.text;

            if (methodNamesToPatch.has(methodName) &&
                propAccess.expression &&
                ts.isPropertyAccessExpression(propAccess.expression) &&
                (propAccess.expression.expression.getText(sourceFile) === 'prisma' || propAccess.expression.expression.getText(sourceFile) === 'tx'))
            {
                 // We found prisma.model.findMany/findFirst/count
                 const args = node.arguments;
                 if (args.length === 0) {
                     // e.g. prisma.model.findMany() -> add { where: { isDeleted: false } }
                     replacements.push({
                         start: node.end - 1, // inside the )
                         end: node.end - 1,
                         text: '{ where: { isDeleted: false } }'
                     });
                 } else if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
                     const obj = args[0];
                     const whereProp = obj.properties.find(p => p.name && p.name.text === 'where');
                     if (whereProp && ts.isPropertyAssignment(whereProp) && ts.isObjectLiteralExpression(whereProp.initializer)) {
                         // Check if isDeleted is already there
                         const hasIsDeleted = whereProp.initializer.properties.some(p => p.name && p.name.text === 'isDeleted');
                         if (!hasIsDeleted) {
                             replacements.push({
                                 start: whereProp.initializer.getStart(sourceFile) + 1, // inside {
                                 end: whereProp.initializer.getStart(sourceFile) + 1,
                                 text: ' isDeleted: false, '
                             });
                         }
                     } else if (!whereProp) {
                         // No where clause, add one
                         replacements.push({
                             start: obj.getStart(sourceFile) + 1, // inside {
                             end: obj.getStart(sourceFile) + 1,
                             text: ' where: { isDeleted: false }, '
                         });
                     }
                 }
            }
        }

        // Also look for `include` or `select` to patch nested relations
        if (ts.isPropertyAssignment(node) && (node.name.text === 'include' || node.name.text === 'select')) {
             if (ts.isObjectLiteralExpression(node.initializer)) {
                 node.initializer.properties.forEach(prop => {
                      if (ts.isPropertyAssignment(prop)) {
                          if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                              // e.g. include: { items: true } -> include: { items: { where: { isDeleted: false } } }
                              replacements.push({
                                  start: prop.initializer.getStart(sourceFile),
                                  end: prop.initializer.end,
                                  text: '{ where: { isDeleted: false } }'
                              });
                          } else if (ts.isObjectLiteralExpression(prop.initializer)) {
                              // e.g. include: { items: { include: { product: true } } }
                              const whereProp = prop.initializer.properties.find(p => p.name && p.name.text === 'where');
                              if (whereProp && ts.isPropertyAssignment(whereProp) && ts.isObjectLiteralExpression(whereProp.initializer)) {
                                  const hasIsDeleted = whereProp.initializer.properties.some(p => p.name && p.name.text === 'isDeleted');
                                  if (!hasIsDeleted) {
                                      replacements.push({
                                          start: whereProp.initializer.getStart(sourceFile) + 1,
                                          end: whereProp.initializer.getStart(sourceFile) + 1,
                                          text: ' isDeleted: false, '
                                      });
                                  }
                              } else if (!whereProp) {
                                  replacements.push({
                                      start: prop.initializer.getStart(sourceFile) + 1,
                                      end: prop.initializer.getStart(sourceFile) + 1,
                                      text: ' where: { isDeleted: false }, '
                                  });
                              }
                          }
                      }
                 });
             }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Apply replacements from back to front to avoid shifting indices
    replacements.sort((a, b) => b.start - a.start);

    let result = content;
    for (let rep of replacements) {
        result = result.substring(0, rep.start) + rep.text + result.substring(rep.end);
    }

    return result;
}

walkDir('src', function(filePath) {
  if (filePath.includes('autopsy') || filePath.includes('trash') || filePath.includes('admin')) {
      return;
  }

  // Also skip tests to avoid messing up assertions if not required
  if (filePath.includes('tests/')) {
     return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
  );

  let newContent = patchPrismaCalls(sourceFile, content);

  if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Patched read queries in ${filePath}`);
  }
});
