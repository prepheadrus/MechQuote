#!/usr/bin/env tsx
/**
 * Geliştirme Geçmişi Log Script
 * 
 * Kullanım:
 *   npm run log-session "Açıklama"
 *   tsx scripts/log-session.ts "Yeni özellik eklendi"
 */

import * as fs from 'fs';
import * as path from 'path';

const HISTORY_FILE = path.join(__dirname, '..', 'docs', 'DEV_HISTORY.md');

function getFormattedDate(): string {
  const now = new Date();
  const date = now.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const time = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${date} - ${time}`;
}

function getSessionNumber(): number {
  if (!fs.existsSync(HISTORY_FILE)) {
    return 1;
  }
  
  const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  const matches = content.match(/### 🤖 AI Oturumu/g);
  return (matches?.length || 0) + 1;
}

function appendLog(message: string): void {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const formattedDate = getFormattedDate();
  const sessionNum = getSessionNumber();
  
  const newEntry = `
### 🤖 AI Oturumu #${sessionNum} - ${formattedDate}

**Konu:** ${message}

**Yapılanlar:**
- [ ] Detaylar buraya eklenebilir

**İlgili Dosyalar:**
- \`src/...\`

---
`;

  let content = '';
  if (fs.existsSync(HISTORY_FILE)) {
    content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  } else {
    content = '# Geliştirme Geçmişi\n\nBu dosya proje üzerinde yapılan çalışmaları tarih/saat bazında kaydeder.\n\n---\n';
  }

  // Şablon bölümünü kaldır, yeni entry ekle, sonra şablonu tekrar ekle
  const templateIndex = content.indexOf('## Şablon');
  if (templateIndex !== -1) {
    content = content.substring(0, templateIndex);
  }

  // Trim trailing whitespace
  content = content.trimEnd() + '\n';

  // Yeni entry ekle
  content += newEntry;

  // Şablonu tekrar ekle
  content += `
## Şablon (Yeni giriş için)

\`\`\`markdown
### 🤖 AI Oturumu - [Tarih]

**Konu:** [Kısa başlık]

**Yapılanlar:**
- [ ] Yapılan değişiklik 1
- [ ] Yapılan değişiklik 2

**İlgili Dosyalar:**
- \`src/...\`

**Kullanılan Komut:**
\`\`\`bash
npm run log-session "Açıklama"
\`\`\`
\`\`\`
`;

  fs.writeFileSync(HISTORY_FILE, content, 'utf-8');
  
  console.log(`✅ Log eklendi: ${HISTORY_FILE}`);
  console.log(`   Tarih: ${formattedDate}`);
  console.log(`   Mesaj: ${message}`);
}

// Ana program
const message = process.argv.slice(2).join(' ');

if (!message) {
  console.error('❌ Lütfen bir açıklama girin!');
  console.error('   Kullanım: tsx scripts/log-session.ts "Açıklama"');
  process.exit(1);
}

appendLog(message);
