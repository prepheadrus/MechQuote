const fs = require('fs');
const cp = require('child_process');

function runTypecheck() {
    try {
        cp.execSync('npm run typecheck', { stdio: 'pipe' });
        return { success: true, log: '' };
    } catch (e) {
        return { success: false, log: e.stdout.toString() + '\n' + e.stderr.toString() };
    }
}

// Map from the error type string to the actual field names that might be causing it
const typeToFields = {
    'CustomerDefaultArgs<DefaultArgs>': ['customer'],
    'InvoiceDefaultArgs<DefaultArgs>': ['invoice'],
    'PersonnelDefaultArgs<DefaultArgs>': ['personnel'],
    'ProductDefaultArgs<DefaultArgs>': ['product'],
    'ProjectDefaultArgs<DefaultArgs>': ['project'],
    'ProposalDefaultArgs<DefaultArgs>': ['proposal', 'linkedProposal'],
    'CustomerCountOutputTypeDefaultArgs<DefaultArgs>': ['_count'],
    'InvoiceCountOutputTypeDefaultArgs<DefaultArgs>': ['_count'],
    'PersonnelCountOutputTypeDefaultArgs<DefaultArgs>': ['_count'],
    'ProductCountOutputTypeDefaultArgs<DefaultArgs>': ['_count'],
    'ProjectCountOutputTypeDefaultArgs<DefaultArgs>': ['_count'],
    'ProposalCountOutputTypeDefaultArgs<DefaultArgs>': ['_count']
};

function fixFile(filePath, lineNum, colNum) {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    let lineIdx = parseInt(lineNum) - 1;

    // We expect the line to look something like:
    // `customer: { where: { isDeleted: false } }` or `personnel: { where: { isDeleted: false } }`
    // or sometimes it spans multiple lines. But usually, the error column points exactly to `{ where: { ... } }` or the `where` keyword.

    // Let's just do a regex replace on that specific line for `{ where: { isDeleted: false } }` to `true`
    // Wait, sometimes it's nested like `customer: { where: { isDeleted: false }, select: { ... } }`
    // If it has a select/include, we should NOT change it to `true`. We should just delete the `where: { isDeleted: false },` part.

    let line = lines[lineIdx];

    if (line.includes('where: { isDeleted: false }')) {
        // Does it have other keys? like select or include?
        if (line.includes('select:') || line.includes('include:')) {
            lines[lineIdx] = line.replace(/where:\s*\{\s*isDeleted:\s*false\s*\},?\s*/g, '');
        } else if (line.match(/:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/)) {
             lines[lineIdx] = line.replace(/:\s*\{\s*where:\s*\{\s*isDeleted:\s*false\s*\}\s*\}/g, ': true');
        } else {
             // Fallback: just remove where
             lines[lineIdx] = line.replace(/where:\s*\{\s*isDeleted:\s*false\s*\},?\s*/g, '');
             // if it leaves an empty {} like `customer: {}`, that's invalid in Prisma, needs to be `customer: true`
             lines[lineIdx] = lines[lineIdx].replace(/:\s*\{\s*\}/g, ': true');
        }
    }

    fs.writeFileSync(filePath, lines.join('\n'));
}

console.log("Running initial typecheck to get errors...");
let res = runTypecheck();
let lines = res.log.split('\n');

for (let line of lines) {
    // Look for error TS2353: Object literal may only specify known properties, and 'where' does not exist in type
    let match = line.match(/^(.+?)\((\d+),(\d+)\): error TS2353: .*'where' does not exist in type/);
    if (match) {
        let file = match[1];
        let lNum = match[2];
        let cNum = match[3];
        console.log(`Fixing ${file}:${lNum}`);
        fixFile(file, lNum, cNum);
    }
}

console.log("Done fixing TS2353 'where' errors.");

// Now also handle "is not assignable to type 'boolean | undefined'"
res = runTypecheck();
lines = res.log.split('\n');
for (let line of lines) {
    let match = line.match(/^(.+?)\((\d+),(\d+)\): error TS2322: .*is not assignable to type 'boolean \| undefined'/);
    if (match) {
        let file = match[1];
        let lNum = match[2];
        let cNum = match[3];
        console.log(`Fixing ${file}:${lNum} (boolean)`);
        fixFile(file, lNum, cNum);
    }
}
