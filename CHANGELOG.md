# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
dan versi mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.3.0] — 2026-04-05

### Added
- Deteksi jenis koneksi **WiFi / Data Seluler** di bagian Kesiapan Test Link
- **Popup peringatan WiFi saat login** — tombol "Refresh" (reload ulang) dan "Lanjutkan" dengan checkbox "Jangan tampilkan lagi"
- **Popup peringatan WiFi saat klik link** — peringatan jika membuka link menggunakan koneksi WiFi
- **Riwayat Test Link** (📊 di profil drawer) — grafik bar chart progress 7 hari terakhir + filter sesi Pagi/Sore/Malam
- Backend `GET /api/progress/history?days=N` — riwayat progress per hari per sesi
- Backend `POST /api/progress/session-start` — reset progress + kirim notifikasi in-app saat sesi baru dimulai
- Notifikasi otomatis ke user saat data sesi sebelumnya dihapus ketika sesi baru dimulai
- Auto-trigger reset sesi dari frontend (sekali per sesi via sessionStorage)

### Changed
- **Daftar ISP Indonesia** diperluas — mencakup nama PT resmi + alias semua provider: Excelcomindo Pratama (XL), Telkomsel, Hutchison 3 Indonesia (Tri), Smartfren, Indosat Ooredoo Hutchison, AXIS Telekom, Iconnet, MyRepublic, Biznet, CBN, LinkNet, FirstMedia, Moratel, Lintasarta, dll.
- Label "Jenis Koneksi" diubah menjadi "Tipe Koneksi" di halaman Kesiapan
- Field kata sandi di form login **selalu tampil** untuk semua user (tidak lagi tersembunyi di bagian admin)

### Fixed
- **Bug kritis: password tidak diminta saat login** — field kata sandi sebelumnya hanya tampil di mode admin. Sekarang selalu tampil; jika login gagal karena password diperlukan, field kata sandi otomatis difokuskan
- Popup "Sesi Belum Dimulai" / "Sesi Sudah Berakhir" menampilkan tag HTML mentah (`<p>`, `<strong>`) karena `htmlMode=true` tidak diteruskan ke `UI.confirm()`
- ISP "PT Excelcomindo Pratama" (XL Axiata) dan puluhan nama PT lain tidak dikenali sebagai provider Indonesia

---

## [4.2.0] — 2026-04-04

### Added
- **Tombol Lanjutkan Test Link** di beranda — muncul saat sesi aktif, dengan countdown sisa waktu. Klik langsung ke kategori + link pertama yang belum dibuka
- **Header sesi bernomor** — "Test Link #1", "#2", "#3" berdasarkan urutan jam mulai
- **Popup kategori selesai** — saat klik kategori yang sudah selesai, popup "Apakah anda ingin melanjutkan ke kategori X?"
- **Tombol Kirim Laporan per tipe** — muncul di dalam section Otomatis+Utama dan section Manual secara terpisah
- **Popup peringatan link sudah dikunjungi** — modal konfirmasi dengan checkbox "Jangan tampilkan lagi"
- Filter aktivitas di `/pantau`: filter berdasarkan sesi (Pagi/Sore/Malam) dan status (Error/Diblokir)
- Flash animasi kuning pada card/section `/pantau` saat data diperbarui
- Deteksi versi OS Android menggunakan **UA Client Hints API** (mengatasi frozen UA Android 10)

### Changed
- Warna card link lebih mencolok setelah diklik: border kiri tebal + background lebih pekat
- Format waktu di `/pantau` menggunakan `HH:MM:SS WIB` konsisten
- Pesan "Sesi Belum Dimulai" menampilkan countdown waktu mulai yang tepat
- Daftar Update Link di beranda menampilkan **semua** kategori (tidak dibatasi 5), setiap card bisa diklik untuk detail

### Fixed
- Progress per tipe di `/pantau` melebihi 100% — deduplicate berdasarkan `link_id` unik

---

## [4.1.0] — 2026-04-03

### Added
- Backend proxy `/api/public/ipinfo` — fetch IP info server-side (bypass browser rate-limit & CORS)
- Integrasi `ip-api.com` untuk deteksi ISP lebih akurat (field `isp` terpisah, tanpa prefix AS)
- Fallback ke `ipwho.is` jika `ip-api.com` tidak tersedia
- Paginasi aktivitas terbaru di `/pantau` (10 item per halaman)
- Domain link ditampilkan di setiap aktivitas terbaru di `/pantau`
- Accordion "Progress per Link" di `/pantau` — detail per link per kategori
- Notifikasi bell dengan badge unread count di bottom nav

### Changed
- IP klien menggunakan header `x-vercel-forwarded-for` (lebih akurat di Vercel)
- Card link redesign: compact, seluruh area klikable, waktu klik di bawah domain, status emoji di kanan
- Tampilan mode terang diperbarui menyeluruh: palet warna non-putih (`#e8eef8`), kontras teks lebih baik
- Auto-scroll ke link pertama yang belum dibuka saat masuk daftar link

### Fixed
- IP menampilkan IP server Vercel — pindah ke backend proxy
- Link domain tampil "?" di `/pantau` — ganti sort dari `sort_order` ke `id`
- Notifikasi gagal dimuat (`API.getNotifs()` → `API.getNotifications()`)

---

## [4.0.0] — 2026-04-02

### Added
- **Halaman publik `/pantau`** — monitoring real-time tanpa login, auto-refresh 10 detik
- Backend `GET /api/public/monitor` — agregasi statistik: per tipe, per user, aktivitas terbaru, status sesi
- Routing halaman pantau dinamis: path, enable/disable, session-only diatur di database
- **Editor Panduan rich text** menggunakan EasyMDE (Markdown + live preview)
- **Proteksi kata sandi akun user** — `PATCH /api/auth/me/password` dengan bcrypt
- **Whitelist username** — admin batasi siapa yang boleh login
- Deteksi VPN via `country_code` (non-ID = kemungkinan VPN)

---

## [3.0.0] — 2026-01-15

### Added
- Migrasi database dari SQLite ke **Supabase** (PostgreSQL hosted)
- Autentikasi berbasis **JWT** (disimpan di localStorage)
- **Admin Panel** lengkap: kategori, link, sesi, notifikasi, pengguna, provider
- Desain ulang UI dengan **Tailwind CSS** + efek glassmorphism
- **PWA support**: manifest.json, service worker, installable
- Bottom navigation bar (4 tab), profile drawer, halaman Panduan & Tentang
- Countdown real-time ke sesi berikutnya
- Kesiapan Test Link: OS, browser, IP, ISP, status sesi
- Laporan otomatis format teks (WhatsApp/Telegram)
- Notifikasi in-app dari admin

### Changed
- Frontend dari HTML statis → SPA (Single Page Application) vanilla JS

### Removed
- `better-sqlite3` — digantikan `@supabase/supabase-js`

---

## [2.0.0] — 2025-12-01

### Added
- **Backend Node.js / Express** pertama
- Database **SQLite** lokal
- API REST: login, kategori, link, progress
- Autentikasi session berbasis username
- Kategori Test Link Otomatis dan Utama Manual
- Waktu tersisa per sesi (normal/overtime/habis)

---

## [1.0.0] — 2025-10-01

### Added
- Tampilan awal: daftar link statis di HTML/CSS/JS
- Klik link membuka tab baru
- Data tersimpan di localStorage
- Tidak ada backend, tidak ada database
