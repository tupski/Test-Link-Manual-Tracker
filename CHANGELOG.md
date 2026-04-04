# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [7.0.0] - 2026-04-04

### ✨ Fitur Baru (Major)
- **Halaman Pantau Publik `/pantau`** — Dashboard real-time monitoring progres test link tanpa login. Auto-refresh setiap 10 detik, tampilkan statistik global, per tipe, per peserta, dan aktivitas terbaru
- **Backend API Monitor** — `GET /api/public/monitor` dengan data lengkap: summary, by_type, per-user, recent activity, session status
- **Routing Dinamis Monitor** — Path halaman pantau bisa diatur admin di DB (`monitor_path`), enabled/disabled (`monitor_enabled`), dan session-only (`monitor_session_only`)
- **EasyMDE Editor Panduan** — Edit panduan test link menggunakan rich text editor dengan Markdown support, live preview, dan toolbar lengkap
- **Kata Sandi Akun User** — User bisa tambahkan kata sandi opsional untuk proteksi akun. Login wajib memasukkan password jika sudah di-set. `PATCH /api/auth/me/password`
- **Whitelist Username Admin** — Admin bisa batasi username yang diizinkan masuk. Jika whitelist kosong = semua boleh masuk. `GET/POST/DELETE /api/whitelist`
- **Provider Opsional** — Semua user tidak wajib memilih provider saat login

### 🔧 Perbaikan
- **VPN Detection by Location** — Deteksi VPN kini menggunakan `country_code !== 'ID'` dari ipapi.co. Jika lokasi bukan Indonesia = terindikasi VPN. Jika Indonesia + ISP cocok = Siap
- **Tombol Batal Modal** — Fixed: Promise tidak resolve saat Batal diklik, menyebabkan UI hang
- **Grup Kategori Admin** — Fixed: pilih grup tidak langsung update tampilan karena `renderCategories()` tidak dipanggil
- **Admin Edit Panduan** — Fixed: encoding masalah saat pass content ke editor, kini pakai `window._panduanData` map
- **CSS Path Pantau** — Fixed: pantau.html merujuk `/style.css` → diperbaiki ke `/css/style.css`

### 📡 REST API Baru
- `GET  /api/public/monitor` — Data real-time monitoring (publik)
- `GET  /api/public/monitor-config` — Konfigurasi halaman pantau
- `PATCH /api/auth/me/password` — Set/ubah kata sandi user
- `DELETE /api/auth/me/password` — Hapus kata sandi user
- `GET   /api/whitelist` — Daftar whitelist (admin)
- `POST  /api/whitelist` — Tambah username ke whitelist (admin)
- `DELETE /api/whitelist/:id` — Hapus dari whitelist (admin)
- `GET/POST/PUT/DELETE /api/panduan` — CRUD panduan test link (admin)

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
