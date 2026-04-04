/**
 * backend/models/db.js
 * Koneksi SQLite, inisialisasi schema, dan seed data default.
 */

'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_PATH = process.env.DB_PATH || './data/linktest.db';

// Pastikan direktori data ada
const dir = path.resolve(path.dirname(DB_PATH));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.resolve(DB_PATH));

// Aktifkan WAL mode & foreign keys untuk performa dan integritas data
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL UNIQUE,
    sort_order       INTEGER DEFAULT 0,
    links_updated_at TEXT    NULL,
    created_at       TEXT    DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS links (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    url         TEXT    NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progress (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    session     TEXT    NOT NULL,
    category_id INTEGER NOT NULL,
    url         TEXT    NOT NULL,
    opened_at   TEXT    DEFAULT (datetime('now','localtime')),
    UNIQUE(date, session, category_id, url),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

// ── Seed kategori default jika tabel masih kosong ───────────────────
const { cnt } = db.prepare('SELECT COUNT(*) AS cnt FROM categories').get();

if (cnt === 0) {
  const DEFAULT_CATEGORIES = [
    'Test Link Utama Manual',
    'Test Link Otomatis',
    'JP6789', 'RP6789', 'RP8',   'RPYYY', 'RPZZZ',
    '77RP',   '55RP',   'QQRP',  '8G8G',  '9N9N',
    'R6R6',   '666J',   '8ii',   '666i'
  ];

  const insert = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  );
  const seedAll = db.transaction(() => {
    DEFAULT_CATEGORIES.forEach((name, i) => insert.run(name, i));
  });
  seedAll();

  console.log(`[DB] Seed ${DEFAULT_CATEGORIES.length} kategori default selesai.`);
}

module.exports = db;
