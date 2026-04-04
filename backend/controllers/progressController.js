/**
 * backend/controllers/progressController.js
 * Logika bisnis untuk progress sesi (link yang sudah dibuka).
 */

'use strict';

const db = require('../models/db');

/**
 * GET /api/progress?date=YYYY-MM-DD
 * Mengembalikan progress semua sesi untuk tanggal tertentu.
 * Format respons: { pagi: { catId: [url,...] }, siang: {...}, malam: {...} }
 */
const getProgress = (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Parameter "date" wajib diisi.' });

    const rows = db.prepare(
      'SELECT session, category_id, url FROM progress WHERE date = ?'
    ).all(date);

    // Susun ke struktur: { session: { catId: [urls] } }
    const result = {};
    rows.forEach(({ session, category_id, url }) => {
      if (!result[session]) result[session] = {};
      if (!result[session][category_id]) result[session][category_id] = [];
      result[session][category_id].push(url);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/progress
 * Tandai satu URL sebagai sudah dibuka di sesi tertentu.
 * Body: { date, session, category_id, url }
 */
const markOpened = (req, res, next) => {
  try {
    const { date, session, category_id, url } = req.body;
    if (!date || !session || !category_id || !url) {
      return res.status(400).json({ error: 'Field date, session, category_id, url wajib diisi.' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO progress (date, session, category_id, url)
      VALUES (?, ?, ?, ?)
    `).run(date, session, category_id, url);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/progress/mark-all
 * Tandai SEMUA link pada kategori tertentu sebagai sudah dibuka.
 * Body: { date, session, category_id }
 */
const markAllOpened = (req, res, next) => {
  try {
    const { date, session, category_id } = req.body;
    if (!date || !session || !category_id) {
      return res.status(400).json({ error: 'Field date, session, category_id wajib diisi.' });
    }

    const links = db.prepare(
      'SELECT url FROM links WHERE category_id = ?'
    ).all(category_id);

    const insert = db.prepare(`
      INSERT OR IGNORE INTO progress (date, session, category_id, url)
      VALUES (?, ?, ?, ?)
    `);

    const insertAll = db.transaction(() => {
      links.forEach(({ url }) => insert.run(date, session, category_id, url));
    });
    insertAll();

    res.json({ success: true, count: links.length });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/progress
 * Reset progress satu kategori di satu sesi (hapus semua record).
 * Body: { date, session, category_id }
 */
const resetProgress = (req, res, next) => {
  try {
    const { date, session, category_id } = req.body;
    if (!date || !session || !category_id) {
      return res.status(400).json({ error: 'Field date, session, category_id wajib diisi.' });
    }

    db.prepare(`
      DELETE FROM progress WHERE date = ? AND session = ? AND category_id = ?
    `).run(date, session, category_id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProgress, markOpened, markAllOpened, resetProgress };
