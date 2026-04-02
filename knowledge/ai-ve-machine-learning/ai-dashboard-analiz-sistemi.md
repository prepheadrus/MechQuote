---
description: Çoklu AI sağlayıcılı (Gemini, Qwen, DeepSeek) ve derin sistem verisi entegrasyonlu stratejik yönetim paneli analiz mimarisi.
tags: [ai, dashboard, finance, strategy, gemini, qwen, deepseek, project-health]
created: 2026-01-19
---

# 🧠 AI Destekli Stratejik Analiz Sistemi (Zekice Analiz)

## 🚩 Sorun
Yönetim panelindeki (Dashboard) finansal verilerin (ciro, kâr vb.) sadece yüzeysel toplamlar olarak kalması, projelerin bütçe sapmalarının, nakit akışı risklerinin ve stratejik zayıflıkların insan gözüyle analiz edilmesinin vakit alması ve hata payı barındırması.

## 🛠️ Uygulanan Çözüm
Ciro ve kârın ötesine geçen, şirketin tüm damarlarındaki (projeler, vadeli ödemeler, müşteri bazlı yoğunlaşma) verileri birleştirip yapay zeka ile yorumlayan **"Zekice Analiz"** motoru geliştirilmiştir.

### 1. Çoklu AI Sağlayıcı Mimarisi (Multi-Provider Fallback)
Sistemin tek bir API'ye (örn: Gemini) bağımlı kalmaması ve kesintisiz çalışması için `matching.ts` mimarisine benzer bir fallback yapısı kurulmuştur.

**Kullanılan Servisler:**
- **Gemini (Google):** Öncelikli (Gemini 1.5 Flash ve Pro varyasyonları).
- **Qwen (Alibaba):** `qwen-plus` (Yedek).
- **DeepSeek:** `deepseek-chat` (Yedek).

### 2. Derin Veri Entegrasyonu
AI'ya gönderilen veri seti sadece dashboard rakamlarını değil, sistemin en alt katmanındaki şu verileri içerir:
- **Proje Sağlık İzleyicisi:** `ContractAmount` (Sözleşme) vs `Material + Labor + Expense` (Gerçek Harcama) analizi.
- **Nakit Akışı (30 Gün):** Vadeli faturalardan gelen beklenen tahsilat ve planlanan ödemelerin projeksiyonu.
- **Müşteri/Ürün Yoğunlaşması:** Gelirin ne kadarının kime/neye bağlı olduğu (Stratejik Risk).
- **Finansal Trendler:** Son 6 aylık ciro ve kâr değişim hızı.

### 3. Teknik Bileşenler
- **Server Action:** `src/actions/ai-dashboard.ts` (Analiz motoru).
- **UI Component:** `src/app/dashboard-content/dashboard-client-page.tsx` (Buton ve AI kartı).
- **Hata Yönetimi:** `404 Not Found` hataları için otomatik model versiyonu değiştirme (fallback loop).

## 🔍 Stratejik Analiz Kriterleri
Yapay zeka şu 5 alanda özel analiz yapar:
1. **Stratejik Durum:** Genel finansal sağlığın özeti.
2. **Likidite Analizi:** Gelecek 30 günün nakit dengesi.
3. **Proje Kontrolü:** Bütçe aşımı riski taşıyan projeler.
4. **Anomali Tespiti:** Hatalı hedef girişleri veya %100 kazanma oranı gibi piyasa dışı durumların analizi.
5. **Somut Aksiyon:** "Kâr marjını %X artırmak için fiyat revizyonu yapın" gibi yönetilebilir öneriler.

## ✅ Sonuç
MechQuote, sadece verileri saklayan bir ERP olmaktan çıkıp, yöneticiye yol gösteren bir **Karar Destek Sistemi (DSS)** haline getirilmiştir.
