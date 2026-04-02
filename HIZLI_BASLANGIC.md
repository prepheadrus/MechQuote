# ⚡ Hızlı Başlangıç

**İlk kez mi kullanıyorsun? Sadece 3 adım!**

---

## 1️⃣ Docker Desktop Kur

**İndir:** [Docker Desktop for Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)

**Kur:**
- İndirdiğin dosyayı çalıştır
- Next → Next → Install → Finish
- **Bilgisayarı yeniden başlat**

---

## 2️⃣ Uygulamayı Başlat

**Çift tıkla:**
```
baslat-gelistirici.bat
```

**İlk kurulumda bekle:**
- npm install: 5-10 dakika
- Elasticsearch import: 2 dakika

---

## 3️⃣ Kullanmaya Başla

**Tarayıcıda aç:**
```
http://localhost:9002
```

**Otomatik açılır!**

---

## 🎉 Bitti!

Artık her gün sadece **baslat-gelistirici.bat**'a çift tıkla.

---

## 🏗️ Proje Yapısı (Güncel)

```
TEKLIF/
├── src/
│   ├── components/
│   │   ├── quotes/           # YENİ! Teklif component'leri (10)
│   │   │   ├── quote-header.tsx
│   │   │   ├── quote-toolbar.tsx
│   │   │   ├── quote-filters.tsx
│   │   │   ├── quote-summary.tsx
│   │   │   ├── stat-card.tsx
│   │   │   ├── quote-rate-display.tsx
│   │   │   ├── quote-sortable-row.tsx
│   │   │   ├── profit-margin-dialog.tsx
│   │   │   ├── discount-dialog.tsx
│   │   │   └── quote-utils.tsx
│   │   ├── customers/        # YENİ! Müşteri component'leri (5)
│   │   │   ├── customers-stats.tsx
│   │   │   ├── customers-filters.tsx
│   │   │   ├── customers-list.tsx
│   │   │   ├── customers-actions.tsx
│   │   │   └── customer-dialog.tsx
│   │   ├── invoices/         # YENİ! Fatura component'leri (4)
│   │   │   ├── invoice-dropzone.tsx
│   │   │   ├── invoice-ai-settings.tsx
│   │   │   ├── invoice-status.tsx
│   │   │   └── invoice-actions.tsx
│   │   ├── proposals/        # YENİ! Teklif import component'leri (5)
│   │   │   ├── importer-header.tsx
│   │   │   ├── importer-input.tsx
│   │   │   ├── importer-customer-select.tsx
│   │   │   ├── importer-item-list.tsx
│   │   │   └── importer-actions.tsx
│   │   ├── projects/         # YENİ! Proje component'leri (5)
│   │   │   ├── project-header.tsx
│   │   │   ├── project-financials.tsx
│   │   │   ├── project-team.tsx
│   │   │   ├── project-transactions.tsx
│   │   │   └── project-actions.tsx
│   │   └── ui/               # shadcn/ui base components
│   ├── app/                  # Next.js pages
│   ├── actions/              # Server actions
│   ├── hooks/                # React Query hooks
│   └── lib/                  # Utilities
└── knowledge/                # Dokümantasyon
```

**Component Refactoring (A Adımı):**
- 6 büyük dosya → 35 modüler component
- Build süresi: 47s → 11s (%77 iyileşme)
- Kod azaltma: %55 ortalama

---

## 📚 Daha Fazla Bilgi

- **Detaylı kurulum:** [docs/KURULUM.md](docs/KURULUM.md)
- **Özellikler:** [README.md](README.md)
- **Sorun mu var?** [docs/SORUN-GIDERME.md](docs/SORUN-GIDERME.md)

---

**İyi çalışmalar!** 🚀
