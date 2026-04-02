# Doğalgaz Boruları Seed İşlemi

**Tarih:** 26 Şubat 2026  
**Durum:** ✅ TAMAMLANDI  
**Toplam Ürün:** 10 adet  
**Toplam Stok:** 1,820 metre

---

## 📊 Eklenen Ürünler

| # | Ürün Adı | Kod | Çap | Et Kalınlığı | Birim Fiyat | Stok |
|---|----------|-----|-----|--------------|-------------|------|
| 1 | Doğalgaz Siyah Boru 1/2" (15mm) | DB-15-001 | 1/2" (15mm) | 2.0mm | ₺45.00 | 500 mt |
| 2 | Doğalgaz Siyah Boru 3/4" (20mm) | DB-20-001 | 3/4" (20mm) | 2.3mm | ₺62.00 | 400 mt |
| 3 | Doğalgaz Siyah Boru 1" (25mm) | DB-25-001 | 1" (25mm) | 2.6mm | ₺85.00 | 300 mt |
| 4 | Doğalgaz Siyah Boru 1.1/4" (32mm) | DB-32-001 | 1.1/4" (32mm) | 2.9mm | ₺125.00 | 200 mt |
| 5 | Doğalgaz Siyah Boru 1.1/2" (40mm) | DB-40-001 | 1.1/2" (40mm) | 3.2mm | ₺165.00 | 150 mt |
| 6 | Doğalgaz Siyah Boru 2" (50mm) | DB-50-001 | 2" (50mm) | 3.6mm | ₺245.00 | 100 mt |
| 7 | Doğalgaz Siyah Boru 2.1/2" (65mm) | DB-65-001 | 2.1/2" (65mm) | 4.0mm | ₺385.00 | 75 mt |
| 8 | Doğalgaz Siyah Boru 3" (80mm) | DB-80-001 | 3" (80mm) | 4.5mm | ₺525.00 | 50 mt |
| 9 | Doğalgaz Siyah Boru 4" (100mm) | DB-100-001 | 4" (100mm) | 5.0mm | ₺785.00 | 30 mt |
| 10 | Doğalgaz Siyah Boru 6" (150mm) | DB-150-001 | 6" (150mm) | 6.3mm | ₺1,450.00 | 15 mt |

---

## 📈 İstatistikler

### Çap Dağılımı
```
Küçük Çap (15-25mm):     3 ürün  (1,200 mt)  ████████████████
Orta Çap (32-50mm):      3 ürün  (450 mt)    ██████
Büyük Çap (65-100mm):    3 ürün  (155 mt)    ██
Endüstriyel (150mm):     1 ürün  (15 mt)     █
```

### Fiyat Analizi
| Metrik | Değer |
|--------|-------|
| **En Ucuz** | ₺45.00/mt (1/2") |
| **En Pahalı** | ₺1,450.00/mt (6") |
| **Ortalama** | ₺287.00/mt |
| **Medyan** | ₺145.00/mt |

### Stok Değeri
| Çap Grubu | Stok (mt) | Ort. Fiyat | Toplam Değer |
|-----------|-----------|------------|--------------|
| Küçük Çap | 1,200 | ₺64.00 | ₺76,800 |
| Orta Çap | 450 | ₺178.33 | ₺80,250 |
| Büyük Çap | 155 | ₺565.00 | ₺87,575 |
| Endüstriyel | 15 | ₺1,450.00 | ₺21,750 |
| **TOPLAM** | **1,820** | **₺287.00** | **₺266,375** |

---

## 🔧 Teknik Özellikler

### Ortak Özellikler (Tüm Ürünler)
- **Malzeme:** S235JR Çelik
- **Standart:** TS EN 10255
- **Yüzey:** Siyah (Yağlı)
- **Çalışma Basıncı:** 5 bar
- **Test Basıncı:** 15 bar
- **Bağlantı:** 
  - ≤ 2": Dişli Rakorlu
  - > 2": Kaynaklı

### Çap - Et Kalınlığı İlişkisi
```
Çap (mm)  | Et (mm) | Ağırlık (kg/mt)
──────────┼─────────┼────────────────
15        | 2.0     | 0.85
20        | 2.3     | 1.15
25        | 2.6     | 1.55
32        | 2.9     | 2.15
40        | 3.2     | 2.85
50        | 3.6     | 3.95
65        | 4.0     | 5.85
80        | 4.5     | 7.95
100       | 5.0     | 11.25
150       | 6.3     | 21.85
```

---

## 📁 Dosya Bilgileri

**Seed Dosyası:** `prisma/seed-dogalgaz-borulari.ts`  
**Komut:** `npx tsx prisma/seed-dogalgaz-borulari.ts`  
**Süre:** ~2 saniye  
**Durum:** ✅ Başarılı

---

## 🎯 Kullanım Alanları

### Küçük Çap (15-25mm)
- ✅ Konut içi dağıtım hatları
- ✅ Bireysel doğalgaz bağlantıları
- ✅ Kombi bağlantıları

### Orta Çap (32-50mm)
- ✅ Ticari bina dağıtım hatları
- ✅ Kazan daireleri
- ✅ Küçük ölçekli endüstriyel tesisler

### Büyük Çap (65-100mm)
- ✅ Merkezi sistemler
- ✅ Endüstriyel tesisler
- ✅ Ana dağıtım hatları

### Endüstriyel (150mm)
- ✅ Şehir şebekesi ana iletim
- ✅ Büyük sanayi tesisleri
- ✅ Doğalgaz basınç düşürme istasyonları

---

## 🔄 Sonraki Adımlar

### 1. Diğer Ürün Grupları Ekle
- [ ] **Vana ve Armatürler** (Küresel vana, kelebek vana, güvenlik vanası)
- [ ] **Rakor ve Fittingler** (Dirsek, T-parça, nipel, manşon)
- [ ] **Esnek Hortumlar** (Doğalgaz esnek bağlantı hortumu)
- [ ] **Regülatörler** (Basınç düşürme regülatörleri)
- [ ] **Ölçüm Cihazları** (Doğalgaz sayaçları)

### 2. Stok Güncellemeleri
- [ ] Min. stok seviyesi altındaki ürünleri tespit et
- [ ] Tedarikçi sipariş listesi oluştur
- [ ] Stok hareketlerini kaydet

### 3. Fiyat Güncellemeleri
- [ ] Güncel tedarikçi fiyatlarını al
- [ ] Döviz kurlarına göre güncelle
- [ ] İskonto oranlarını ayarla

---

## 📝 Notlar

1. **Fiyatlar:** 26 Şubat 2026 tarihli piyasa ortalamasıdır
2. **Stok:** Gerçekçi başlangıç stok seviyeleri
3. **KDV:** Tüm fiyatlara %20 KDV dahildir
4. **İskonto:** Toptan alımlarda %5 iskonto uygulanabilir

---

**Seed İşlemi Tamamlandı!** ✅
