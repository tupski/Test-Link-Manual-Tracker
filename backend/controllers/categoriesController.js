/**
 * backend/controllers/categoriesController.js
 * Logika bisnis untuk manajemen kategori.
 */

'use strict';

const db = require('../models/db');

/**
 * GET /api/categories
 * Mengembalikan semua kategori beserta jumlah link dan tanggal terakhir update.
 */
const getCategories = (req, res, next) => {
  try {
    const categories = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.sort_order,
        c.links_updated_at,
        COUNT(l.id) AS link_count
      FROM categories c
      LEFT JOIN links l ON l.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    res.json(categories);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/categories/:id
 * Mengganti nama kategori.
 * Body: { name: string }
 */
const renameCategory = (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori tidak boleh kosong.' });
    }

    const result = db.prepare(
      'UPDATE categories SET name = ? WHERE id = ?'
    ).run(name.trim(), id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    res.json({ success: true, name: name.trim() });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Nama kategori sudah digunakan.' });
    }
    next(err);
  }
};

module.exports = { getCategories, renameCategory };
