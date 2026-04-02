# Proje Sağlık İzleyicisi (Project Health Monitor)

Yönetim Paneli'nde yer alan bu modül, devam eden şantiyelerinizin finansal durumunu gerçek zamanlı olarak takip etmenizi sağlayan bir "erken uyarı" sistemidir.

---

## 1. İzleme Mantığı

Sistem, devam eden (Ongoing) her proje için şu verileri anlık olarak karşılaştırır:
*   **Sözleşme Bedeli:** Projenin toplam satış tutarı.
*   **Toplam Harcama:** Proje kapsamında girilen tüm faturalar, usta ödemeleri ve kasa harcamaları.

---

## 2. Renk Kodları ve Durumlar

İlerleme çubukları (Progress Bars), bütçe kullanım oranına göre renk değiştirerek sizi uyarır:

### 🟢 Yeşil (%0 - %79)
*   **Durum:** Proje sağlıklı bir bütçe aralığında ilerliyor.
*   **Aksiyon:** Olağan saha takibine devam edin.

### 🟡 Sarı (%80 - %94)
*   **Durum:** Dikkat! Bütçenin büyük bir kısmı kullanıldı. 
*   **Aksiyon:** Şantiyedeki malzeme israfını ve usta çalışma saatlerini gözden geçirmeye başlayın. Kâr marjınız azalıyor.

### 🔴 Kırmızı (%95 ve Üzeri)
*   **Durum:** Kritik Seviye! Proje maliyeti sözleşme bedeline yaklaştı veya aştı.
*   **Aksiyon:** Acil müdahale gerekebilir. Ekstra işler için revizyon teklifi (v2) geçilmeli veya maliyetler dondurulmalıdır.

---

## 3. Detaylara Hızlı Erişim
Dashboard üzerindeki herhangi bir projenin ismine tıkladığınızda doğrudan o projenin **"Proje Otopsisi"** sayfasına gidersiniz. Orada, bütçenin tam olarak hangi kalemde (Malzeme mi, İşçilik mi?) aşıldığını detaylıca görebilirsiniz.

---

## 💡 Yönetici İpucu
Dashboard'u her sabah açtığınızda ilk olarak bu izleyiciyi kontrol edin. Kırmızıya dönen bir bar gördüğünüzde, şantiye şefinizle veya ustanızla maliyetleri konuşmak için en doğru zamandasınız demektir.
