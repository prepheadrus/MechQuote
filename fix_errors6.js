const fs = require('fs');

function fixCache(file) {
    let content = fs.readFileSync(file, 'utf8');

    // The previous regex for count/findMany accidentally injected `data: { isDeleted: true, deletedAt: new Date() }` because I ran the find/replace scripts earlier with an overly aggressive regex perhaps.
    // Let's remove `data: { isDeleted: true, deletedAt: new Date() }` from `.count(` calls.
    content = content.replace(/,\s*data:\s*\{\s*isDeleted:\s*true,\s*deletedAt:\s*new\s*Date\(\)\s*\}/g, '');

    fs.writeFileSync(file, content, 'utf8');
}

fixCache('src/services/ai-cache-service.ts');
