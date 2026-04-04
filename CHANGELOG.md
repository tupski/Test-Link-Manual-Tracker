# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.0.0] - 2026-04-04

### ✨ Fitur Baru (Major)
- **Tailwind CSS** — Desain ulang total dengan Tailwind CDN, dark glassmorphism theme
- **Supabase PostgreSQL** — Migrasi dari SQLite ke Supabase untuk data persistent & multi-device
- **Autentikasi JWT** — User input username, admin butuh password dari .env
- **Per-User Tracking** — Setiap user punya progress sendiri yang tersimpan di database
- **Admin Panel** — Halaman admin lengkap: kategori, link, jadwal sesi, notifikasi, daftar user
- **PWA (Progressive Web App)** — manifest.json + service worker, bisa di-install di HP
- **Status Link Report** — Setelah buka link, modal muncul: Normal / Diblokir / Error 404
- **Floating Bottom Nav** — Navigasi floating pill di bawah untuk admin dan user
- **Notifikasi In-App** — Admin bisa buat notifikasi/pengumuman yang tampil di dashboard
- **Reset Otomatis** — Progress direset tiap hari karena di-query berdasarkan tanggal WIB
- **Daily Reset 00:00 WIB** — Progress hari baru otomatis terpisah dari hari kemarin

### 🔧 Perbaikan & Perubahan
- Tambah endpoint PATCH `/api/progress/:id` untuk update status link
- Tambah endpoint `/api/users` (admin: list + delete user)
- Tambah endpoint `/api/config/sessions` (read + update jadwal sesi)
- Tambah endpoint `/api/notifications` (CRUD notifikasi)
- Semua endpoint API sekarang memerlukan JWT Bearer token
- Frontend dibagi menjadi beberapa modul: `api.js`, `ui.js`, `screens.js`, `admin.js`, `main.js`

### 🗑️ Dihapus
- `better-sqlite3` — digantikan `@supabase/supabase-js`
- `public/style.css` — digantikan Tailwind CDN
- Database file lokal `./data/linktest.db`

### 📦 Dependencies
- Ditambah: `@supabase/supabase-js@^2.x`, `jsonwebtoken@^9.x`
- Dihapus: `better-sqlite3`

---

## [2.0.0] - 2026-04-04

### ✨ Fitur Baru
- Migrasi dari localStorage ke SQLite database (backend Node.js + Express)
- Kategori baru: `Test Link Utama Manual` dan `Test Link Otomatis` (urutan pertama)
- Tampilan tanggal terakhir link diperbarui per kategori
- Edit nama kategori langsung dari UI
- Waktu tersisa per sesi dengan indikator normal/overtime/habis
- Auto-prefix `https://` untuk domain tanpa protokol
- Loading spinner dan global error handler

### 🔧 Perubahan
- Backend: Node.js + Express 5 + better-sqlite3
- Frontend: Vanilla JS dengan async/await fetch

---

## [1.0.0] - 2026-04-04

### 🚀 Rilis Awal
- Pure frontend HTML/CSS/JavaScript
- Data tersimpan di browser localStorage
- 3 sesi harian (Pagi/Siang/Malam)
- 14 kategori default
- Mobile-first design
