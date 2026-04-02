# Ürün Seed İşlemleri

**Tarih:** 26 Şubat 2026  
**Durum:** ✅ Başlatıldı  
**İlk Seed:** Doğalgaz Boruları (10 ürün)

---

## 📊 Tamamlanan Seed İşlemleri

### 1. Doğalgaz Boruları (10 Ürün)

**Dosya:** `prisma/seed-dogalgaz-borulari.ts`  
**Komut:** `npx tsx prisma/seed-dogalgaz-borulari.ts`

**Özet:**
- 10 farklı çapta doğalgaz siyah boru
- Çap aralığı: 1/2" (15mm) - 6" (150mm)
- Toplam stok: 1,820 metre
- Toplam değer: ₺266,375
- Tüm ürünler TS EN 10255 standardında

**Kategoriler:**
```
Küçük Çap (15-25mm):  3 ürün  - Konut içi dağıtım
Orta Çap (32-50mm):   3 ürün  - Ticari bina
Büyük Çap (65-100mm): 3 ürün  - Endüstriyel
Endüstriyel (150mm):  1 ürün  - Şehir şebekesi
```

**Detaylı Döküm:** [prisma/SEED-DOGALGAZ-BORULARI.md](../prisma/SEED-DOGALGAZ-BORULARI.md)

---

## 🎯 Planlanan Seed İşlemleri

### 2. Vana ve Armatürler (Planlanıyor)

**Hedef:** 20-25 ürün

**Kategoriler:**
- Küresel Vanalar (Doğalgaz)
- Kelebek Vanalar
- Güvenlik Vanaları (Basınç Düşürme)
- Otomatik Kapatma Vanaları
- Manuel Vanalar

**Örnek Ürünler:**
- 1/2" Küresel Vana (Tam Geçişli)
- 3/4" Küresel Vana (Kısa Gövde)
- 1" Kelebek Vana (Pnömatik Aktüatörlü)
- 2" Güvenlik Vanası (Ayarlanabilir)

---

### 3. Rakor ve Fittingler (Planlanıyor)

**Hedef:** 30-40 ürün

**Kategoriler:**
- Dirsekler (90°, 45°)
- T-Parçalar (Eşit, Redüksiyonlu)
- Nikeller (Kısa, Uzun, Meme)
- Manşonlar
- Kapaklar
- Rakorlar (Havalı, Düz)

**Örnek Ürünler:**
- 1/2" Dirsek 90° (Galvanizli)
- 3/4" T-Parça Eşit (Döküm)
- 1" Nipel Uzun (Siyah)
- 1.1/4" Manşon (Galvanizli)

---

### 4. Esnek Hortumlar (Planlanıyor)

**Hedef:** 10-15 ürün

**Kategoriler:**
- Doğalgaz Esnek Bağlantı Hortumları
- Kompansatörler
- Flex Borular

**Örnek Ürünler:**
- 1/2" x 50cm Esnek Hortum (Kilitlemeli)
- 3/4" x 100cm Esnek Hortum (Döner Başlıklı)
- 1" Kompansatör (Flanşlı)

---

### 5. Regülatörler (Planlanıyor)

**Hedef:** 8-10 ürün

**Kategoriler:**
- Basınç Düşürme Regülatörleri
- Güvenlik Kapatma Üniteleri
- Ölçüm Regülatörleri

**Örnek Ürünler:**
- RG/2MB Basınç Düşürme Regülatörü
- FRG/2MC Filtreli Regülatör Grubu
- GBP Güvenlik Kapatma Ünitesi

---

### 6. Ölçüm Cihazları (Planlanıyor)

**Hedef:** 5-8 ürün

**Kategoriler:**
- Ev Tipi Gaz Sayaçları
- Endüstriyel Gaz Sayaçları
- Düzelticiler

**Örnek Ürünler:**
- G4 Ev Tipi Diyaframlı Sayaç
- G10 Ticari Tip Sayaç
- G25 Endüstriyel Döner Pistonlu Sayaç

---

## 📝 Seed Dosyası Formatı

### Standart Ürün Yapısı

```typescript
{
  code: 'DB-15-001',                    // Ürün kodu
  name: 'Doğalgaz Siyah Boru 1/2"',     // Tam ürün adı
  brand: 'Çelik Boru A.Ş.',             // Marka
  model: 'DB-15-ERW',                   // Model
  category: 'Doğalgaz Boruları',        // Kategori
  description: '...',                   // Detaylı açıklama
  unit: 'Metre (mt)',                   // Birim
  listPrice: 45.00,                     // Liste fiyatı (KDV dahil)
  basePrice: 35.00,                     // Maliyet fiyatı
  vatRate: 0.20,                        // KDV oranı (%20)
  discountRate: 0.05,                   // İskonto oranı (%5)
  technicalSpecifications: {            // Teknik özellikler (JSON)
    cap: '1/2" (15mm)',
    etKalinligi: '2.0mm',
    malzeme: 'S235JR Çelik',
    standart: 'TS EN 10255',
    // ...
  },
  stockQuantity: 500,                   // Mevcut stok
  minStockLevel: 50                     // Min. stok seviyesi
}
```

---

## 🛠️ Kullanım

### Seed Çalıştırma

```bash
# Doğalgaz Boruları
npx tsx prisma/seed-dogalgaz-borulari.ts

# Gelecek seed'ler
npx tsx prisma/seed-vana-armatur.ts
npx tsx prisma/seed-rakor-fitting.ts
# ...
```

### Veritabanı Sıfırlama + Seed

```bash
# Dikkat: Tüm verileri siler!
npx prisma migrate reset --force
npx tsx prisma/seed-dogalgaz-borulari.ts
```

---

## 📊 İlerleme

```
Seed Durumu:
██████░░░░░░░░░░░░░░░░ 25%

✅ Doğalgaz Boruları (10 ürün)
⏳ Vana ve Armatürler (Planlanıyor)
⏳ Rakor ve Fittingler (Planlanıyor)
⏳ Esnek Hortumlar (Planlanıyor)
⏳ Regülatörler (Planlanıyor)
⏳ Ölçüm Cihazları (Planlanıyor)
```

---

## 🎯 Hedefler

### Kısa Vadeli (1 Hafta)
- [x] Doğalgaz Boruları eklendi
- [ ] Vana ve Armatürler (%0)
- [ ] Rakor ve Fittingler (%0)

### Orta Vadeli (1 Ay)
- [ ] Tüm ana kategoriler tamamlandı
- [ ] Toplam 100+ ürün
- [ ] Stok takibi aktif

### Uzun Vadeli (3 Ay)
- [ ] 500+ ürün kataloğu
- [ ] Otomatik fiyat güncelleme
- [ ] Tedarikçi entegrasyonu

---

## 📁 İlgili Dosyalar

- [Seed Dosyası](../prisma/seed-dogalgaz-borulari.ts)
- [Detaylı Rapor](../prisma/SEED-DOGALGAZ-BORULARI.md)
- [Product Schema](../prisma/schema.prisma)

---

**Son Güncelleme:** 26 Şubat 2026 - Doğalgaz Boruları ✅
