/**
 * backend/controllers/linksController.js
 * Logika bisnis untuk manajemen link per kategori.
 */

'use strict';

const db = require('../models/db');

/**
 * Normalisasi satu baris URL:
 *  - Trim spasi
 *  - Baris kosong → null
 *  - Tanpa protokol → tambah https:// otomatis
 * @param {string} line
 * @returns {string|null}
 */
const normalizeLine = (line) => {
  const t = (line || '').trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
};

/**
 * GET /api/categories/:id/links
 * Mengembalikan array URL untuk satu kategori.
 */
const getLinks = (req, res, next) => {
  try {
    const { id } = req.params;

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });

    const rows = db.prepare(
      'SELECT url FROM links WHERE category_id = ? ORDER BY id ASC'
    ).all(id);

    res.json(rows.map(r => r.url));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/categories/:id/links
 * Replace semua link kategori dengan daftar baru.
 * Body: { links: string[] }
 * Juga memperbarui links_updated_at di tabel categories.
 */
const saveLinks = (req, res, next) => {
  try {
    const { id } = req.params;
    const { links } = req.body;

    if (!Array.isArray(links)) {
      return res.status(400).json({ error: 'Field "links" harus berupa array.' });
    }

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });

    // Normalisasi: trim + auto-prefix https://
    const normalized = links.map(normalizeLine).filter(Boolean);

    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM links WHERE category_id = ?').run(id);

      const insert = db.prepare(
        'INSERT INTO links (category_id, url) VALUES (?, ?)'
      );
      normalized.forEach(url => insert.run(id, url));

      db.prepare(
        'UPDATE categories SET links_updated_at = ? WHERE id = ?'
      ).run(now, id);
    });

    transaction();

    res.json({ success: true, count: normalized.length, updated_at: now });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLinks, saveLinks };
