# 🔗 Test Link Manual Tracker

Aplikasi web sederhana untuk **pengujian link secara manual** dari HP. Mendukung multi-perangkat melalui database SQLite bersama di server lokal.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 📱 Mobile-first | Dioptimalkan untuk layar HP, semua tombol ≥ 44px |
| 🗄️ SQLite Database | Data link & progress tersimpan di server — semua HP dalam satu jaringan berbagi data yang sama |
| 🕐 Tanggal Diperbarui | Setiap kategori menampilkan kapan link terakhir diupdate |
| ⏱️ Waktu Tersisa Sesi | Countdown per sesi (normal 2 jam, max 4 jam) dengan indikator overtime |
| 🗂️ 16 Kategori | 2 kategori utama + 14 kategori situs di urutan tetap |
| ✏️ Edit Nama Kategori | Ganti nama kategori langsung dari UI tanpa restart |
| 🔗 Auto-prefix HTTPS | Domain tanpa protokol otomatis ditambah `https://` saat simpan |
| 3 Sesi Harian | Pagi (10:00), Siang (15:00), Malam (19:00) WIB — progress terpisah per sesi |

---

## 📦 Teknologi

- **Backend**: Node.js 22 LTS + Express 5 + better-sqlite3
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript ES6+ (tanpa framework)
- **Database**: SQLite (file lokal `./data/linktest.db`)
- **Logging**: Morgan (HTTP request logger)

---

## 🚀 Instalasi & Menjalankan

### Prasyarat
- Node.js ≥ 18 (direkomendasikan v22 LTS)
- npm ≥ 9

### Langkah

```bash
# 1. Clone repo
git clone https://github.com/tupski/Test-Link-Manual-Tracker.git
cd Test-Link-Manual-Tracker

# 2. Install dependencies
npm install

# 3. Buat file .env (opsional, sudah ada default)
cp .env.example .env   # atau buat manual

# 4. Jalankan server
npm start
```

Server akan otomatis menampilkan URL jaringan:

```
✅ Link Tester berjalan!
   Lokal  : http://localhost:3000
   Network: http://192.168.1.x:3000  ← buka dari HP
```

### Mode Development (auto-restart)

```bash
npm run dev
```

---

## 📡 Akses dari HP

1. Pastikan HP dan PC terhubung ke **WiFi yang sama**
2. Buka browser HP
3. Ketik URL Network yang muncul di terminal: `http://192.168.x.x:3000`

---

## 🗂️ Struktur Proyek

```
Test-Link-Manual-Tracker/
├── backend/
│   ├── controllers/
│   │   ├── categoriesController.js   # GET list, PATCH rename
│   │   ├── linksController.js        # GET/PUT links + auto https://
│   │   └── progressController.js    # GET/POST/DELETE progress sesi
│   ├── middleware/
│   │   └── errorHandler.js           # Global error handler
│   ├── models/
│   │   └── db.js                     # Schema SQLite + seed default
│   ├── routes/
│   │   └── api.js                    # Semua endpoint /api/*
│   └── server.js                     # Entry point Express
├── public/
│   ├── index.html                    # UI (5 screen SPA)
│   ├── style.css                     # Mobile-first styling
│   └── app.js                        # Logika frontend async
├── data/
│   └── linktest.db                   # SQLite (auto-dibuat)
├── .env                              # Konfigurasi environment
├── .gitignore
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/categories` | List semua kategori + jumlah link + tanggal update |
| `PATCH` | `/api/categories/:id` | Ganti nama kategori |
| `GET` | `/api/categories/:id/links` | Ambil daftar link satu kategori |
| `PUT` | `/api/categories/:id/links` | Simpan/replace link (auto-prefix https://) |
| `GET` | `/api/progress?date=` | Progress semua sesi untuk tanggal tertentu |
| `POST` | `/api/progress` | Tandai satu URL sebagai sudah dibuka |
| `POST` | `/api/progress/mark-all` | Tandai semua link kategori sebagai selesai |
| `DELETE` | `/api/progress` | Reset progress satu kategori di satu sesi |

---

## 📅 Jadwal Sesi

| Sesi | Mulai | Selesai Normal | Batas Maksimal |
|---|---|---|---|
| Pagi | 10:00 WIB | 12:00 WIB | 14:00 WIB |
| Siang | 15:00 WIB | 17:00 WIB | 19:00 WIB |
| Malam | 19:00 WIB | 21:00 WIB | 23:00 WIB |

Indikator waktu tersisa:
- 🔵 `⏱ Sisa Xj Ym` — dalam waktu normal (0–2 jam)
- 🟠 `⚠️ Overtime · Sisa Ym` — melebihi waktu normal (2–4 jam)
- 🔴 `⏰ Waktu habis` — melebihi batas maksimal

---

## 🗃️ Kategori Default

1. Test Link Utama Manual _(urutan 1)_
2. Test Link Otomatis _(urutan 2)_
3. JP6789, RP6789, RP8, RPYYY, RPZZZ
4. 77RP, 55RP, QQRP, 8G8G, 9N9N
5. R6R6, 666J, 8ii, 666i

---

## ⚙️ Konfigurasi (.env)

```env
PORT=3000           # Port server (default: 3000)
DB_PATH=./data/linktest.db   # Path file database SQLite
```

---

## 🔐 Catatan Keamanan

- Aplikasi ini dirancang untuk **jaringan lokal (LAN)** — tidak ada autentikasi
- Jangan ekspos port ke internet publik tanpa menambahkan autentikasi terlebih dahulu
- Database SQLite tersimpan di folder `./data/` (excluded dari git)

---

## 📝 Changelog

### v2.0.0
- Migrasi dari `localStorage` ke SQLite database
- Tambah 2 kategori baru: `Test Link Utama Manual` dan `Test Link Otomatis`
- Fitur tampilan tanggal terakhir link diperbarui per kategori
- Fitur edit nama kategori (rename)
- Tampilan waktu tersisa per sesi (normal 2 jam, max 4 jam)
- Auto-prefix `https://` untuk domain tanpa protokol
- Backend Node.js + Express 5 + better-sqlite3
- Loading spinner dan error handling terpusat

### v1.0.0
- Rilis awal — pure frontend HTML/CSS/JS
- Data tersimpan di `localStorage` browser

---

## 👤 Author

**Angga Artupas** — [@tupski](https://github.com/tupski)

---

> 💡 **Tips**: Bookmark URL jaringan di HP agar mudah dibuka setiap hari.
