/**
 * backend/controllers/panduanController.js
 * CRUD untuk item panduan test link.
 * GET publik — POST/PATCH/DELETE hanya admin.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/panduan — ambil semua item panduan (publik) */
const getPanduan = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('panduan_items')
      .select('id, title, content, icon, sort_order')
      .order('sort_order', { ascending: true });
    if (error) return next(error);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** POST /api/panduan — tambah item panduan (admin) */
const addPanduan = async (req, res, next) => {
  try {
    const { title, content, icon = '📌', sort_order = 0 } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Judul wajib diisi.' });
    if (!content?.trim()) return res.status(400).json({ error: 'Konten wajib diisi.' });
    const { data, error } = await supabase
      .from('panduan_items')
      .insert({ title: title.trim(), content: content.trim(), icon, sort_order })
      .select()
      .single();
    if (error) return next(error);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** PATCH /api/panduan/:id — edit item panduan (admin) */
const updatePanduan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, icon, sort_order } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title   !== undefined) updates.title      = title.trim();
    if (content !== undefined) updates.content    = content.trim();
    if (icon    !== undefined) updates.icon       = icon;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    const { data, error } = await supabase
      .from('panduan_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return next(error);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** DELETE /api/panduan/:id — hapus item panduan (admin) */
const deletePanduan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('panduan_items').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getPanduan, addPanduan, updatePanduan, deletePanduan };
