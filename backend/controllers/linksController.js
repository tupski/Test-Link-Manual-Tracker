/**
 * backend/controllers/linksController.js
 * CRUD link per kategori — menggunakan Supabase PostgreSQL.
 */

'use strict';

const supabase = require('../models/supabase');

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

/** GET /api/categories/:id/links — array {id, url} per kategori */
const getLinks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('links')
      .select('id, url')
      .eq('category_id', id)
      .order('id', { ascending: true });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PUT /api/categories/:id/links — replace semua link (admin) */
const saveLinks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { links } = req.body;
    if (!Array.isArray(links)) return res.status(400).json({ error: 'Field "links" harus array.' });

    const normalized = links.map(normalizeLine).filter(Boolean);
    const now = new Date().toISOString();

    // Hapus semua link lama lalu insert baru
    await supabase.from('links').delete().eq('category_id', id);

    if (normalized.length > 0) {
      const rows = normalized.map(url => ({ category_id: Number(id), url }));
      const { error } = await supabase.from('links').insert(rows);
      if (error) return next(error);
    }

    await supabase.from('categories').update({ links_updated_at: now }).eq('id', id);

    res.json({ success: true, count: normalized.length, updated_at: now });
  } catch (err) { next(err); }
};

/** DELETE /api/links/:id — hapus satu link (admin) */
const deleteLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getLinks, saveLinks, deleteLink };
