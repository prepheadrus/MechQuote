# Teknik Bilgi Maddesi: Ekip Finansal Yönetimi ve Cari Sistem

## Özet
Bu döküman, projedeki saha ekiplerinin (personel) hakediş ve ödeme takibini sağlayan bağımsız cari sistem mimarisini açıklar. Sistem, bir ekibin birden fazla projedeki toplam borç/alacak durumunu merkezi olarak takip eder.

## 1. Veri Modeli ve Mimari (Prisma)

### Yeni Modeller
- **PersonnelTransaction**: Ekibin tüm finansal hareketlerini tutan ana tablo.
    - `amount`: Pozitif değerler **Borç** (Biz ödeme yaptık, ekip bize iş borçlu), Negatif değerler **Alacak / Hakediş** (Ekip çalıştı, biz ona ödeme borçluyuz).
    - `type`: 'Payment' (Ödeme/Avans), 'Earning' (Hakediş), 'Adjustment' (Düzeltme).
- **Personnel.balance**: Performans optimizasyonu için ekibin anlık toplam bakiyesi bu alanda aggregate olarak tutulur.

### İlişkiler
- `JobAssignment` artık opsiyonel olarak doğrudan `Project` modeline bağlanabilir (`projectId`). Bu, teklif sürecinden bağımsız saha ekibi eklemeyi mümkün kılar.

## 2. İş Akışları ve Mantıksal Kurallar

### A. Ekip Atama ve Hakediş (Earning)
Bir ekip projeye atandığında (`createJobAssignment`):
1. Anlaşılan tutar kadar bir `PersonnelTransaction` (type: 'Earning') oluşturulur.
2. Tutar **negatif** (Alacak) olarak kaydedilir.
3. Personel bakiyesi bu tutar kadar azaltılır (Alacaklı konuma geçer).

### B. Ödeme ve Avans (Payment)
Ekibe ödeme yapıldığında (`updateJobAssignmentPayment`):
1. Ödeme tutarı kadar bir `PersonnelTransaction` (type: 'Payment') oluşturulur.
2. Tutar **pozitif** (Borç) olarak kaydedilir.
3. Personel bakiyesi bu tutar kadar artırılır.

### C. Projeden Ayrılma ve Borç Takibi
Ekip projeden çıkarıldığında (`deleteJobAssignment`):
- Eğer ekibe daha önce ödeme yapılmışsa (`totalPaid > 0`), bu ödemeler silinmez.
- Ekibin cari hesabında bu ödemeler "Borç" olarak kalmaya devam eder, böylece ekip şirkete borçlu (owing) görünür.
- İşlem geçmişinde "Proje Ayrılışı" açıklamalı bir `Adjustment` kaydı atılarak durum resmileştirilir.

## 3. Kullanıcı Arayüzü (UI)

### ProjectTeamManager
- **Görsel İlerleme**: Hakedişe oranla yapılan ödemeler bir progress bar ile gösterilir.
- **Genel Mutabakat**: Ekibin sadece o projedeki değil, **tüm sistemdeki** net bakiyesi kart üzerinde vurgulanır.
- **Dinamik Yönetim**: `AddTeamMemberDialog` ile projeye anlık olarak uzman ekipler dahil edilebilir.

## Kritik Bilgi
Finansal tutarlılık için bakiye güncellemeleri her zaman `PersonnelTransaction` oluşturulmasıyla eş zamanlı yapılmalıdır. Manuel bakiye değiştirmek yerine `Adjustment` tipinde transaction oluşturulması tavsiye edilir.
