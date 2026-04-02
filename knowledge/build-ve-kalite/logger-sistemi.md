# Logger Sistemi

## 📋 Genel Bakış

**Amaç:** Production'da gereksiz logları gizlemek, development'da detaylı loglama sağlamak.

**Sorun:** 541 console.log kirliliği.

**Çözüm:** Environment-based logger.

---

## 📁 Dosyalar

### `src/lib/logger.ts`

**Görev:** Logger utility

**Özellikler:**
- ✅ Environment-based filtering
- ✅ Log levels (debug, info, warn, error)
- ✅ Context-based logging
- ✅ Timestamp

---

## 🔧 Kullanım

### Basit Kullanım

```typescript
import { logger } from '@/lib/logger';

logger.info('Bilgi mesajı');
logger.warn('Uyarı mesajı');
logger.error('Hata mesajı');
logger.debug('Debug mesajı');
```

### Context ile

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('CustomerService');

log.info('Customer created', { id: 123 });
log.error('Customer not found', { id: 123 });
```

---

## 📊 Log Seviyeleri

| Seviye | Development | Production |
|--------|-------------|------------|
| **debug** | ✅ Görünür | ❌ Gizli |
| **info** | ✅ Görünür | ❌ Gizli |
| **warn** | ✅ Görünür | ✅ Görünür |
| **error** | ✅ Görünür | ✅ Görünür |

---

## 📋 Format

```
[19:40:25] [INFO] [CustomerLookup] Name: "ABC Ltd.", TaxID: "1234567890"
[19:40:26] [WARN] [CustomerLookup] Repairing corrupted name: ABC Ltd. Ã -> ABC Ltd.
[19:40:27] [ERROR] [InvoiceService] Duplicate invoice attempted: INV-2024-001
```

---

## 🔧 Helper Fonksiyonlar

### `createLogger(context)`

Context-based logger oluşturur.

```typescript
const logger = createLogger('Dashboard');
logger.info('Dashboard stats loading...');
// [19:40:25] [INFO] [Dashboard] Dashboard stats loading...
```

### `logger.group(label)`

Log grouping başlatır.

```typescript
logger.group('AI Processing');
logger.info('Starting...');
logger.info('Processing...');
logger.groupEnd();
```

---

## 📅 Güncellemeler

| Tarih | Değişiklik |
|-------|------------|
| 20.02.2026 | İlk oluşturma - Görev #6 tamamlandı |

---

**Oluşturulma:** 20 Şubat 2026 Cuma - 22:00  
**Görev:** #6 - Console Log Temizliği ✅
