/**
 * backend/controllers/providersController.js
 * CRUD provider internet — GET publik, POST/DELETE admin only.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/providers — semua provider aktif */
const getProviders = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** POST /api/providers — tambah provider baru (admin) */
const createProvider = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama provider wajib diisi.' });

    const { data: maxRow } = await supabase
      .from('providers').select('sort_order')
      .order('sort_order', { ascending: false }).limit(1).single();
    const sort_order = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabase.from('providers')
      .insert({ name: name.trim(), sort_order })
      .select().single();

    if (error?.code === '23505') return res.status(409).json({ error: 'Provider sudah ada.' });
    if (error) return next(error);

    res.status(201).json(data);
  } catch (err) { next(err); }
};

/** DELETE /api/providers/:id — hapus provider (admin) */
const deleteProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('providers').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getProviders, createProvider, deleteProvider };
