/**
 * backend/controllers/categoriesController.js
 * CRUD kategori — menggunakan Supabase PostgreSQL.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/categories — semua kategori + link_count */
const getCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, sort_order, links_updated_at, links(count)')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return next(error);

    const result = data.map(c => ({
      id: c.id, name: c.name, sort_order: c.sort_order,
      links_updated_at: c.links_updated_at,
      link_count: c.links[0]?.count ?? 0
    }));

    res.json(result);
  } catch (err) { next(err); }
};

/** POST /api/categories — buat kategori baru (admin) */
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });

    const { data: maxRow } = await supabase.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    const sort_order = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabase.from('categories')
      .insert({ name: name.trim(), sort_order })
      .select().single();

    if (error?.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah ada.' });
    if (error) return next(error);

    res.status(201).json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/categories/:id — rename kategori (admin) */
const renameCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama kategori tidak boleh kosong.' });

    const { data, error } = await supabase.from('categories')
      .update({ name: name.trim() })
      .eq('id', id).select().single();

    if (error?.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah digunakan.' });
    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });

    res.json(data);
  } catch (err) { next(err); }
};

/** DELETE /api/categories/:id — hapus kategori (admin) */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getCategories, createCategory, renameCategory, deleteCategory };
