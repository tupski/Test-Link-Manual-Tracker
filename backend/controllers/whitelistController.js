/**
 * backend/controllers/whitelistController.js
 * Manajemen daftar username yang diizinkan masuk (whitelist).
 * Jika daftar kosong → semua username diizinkan.
 * Jika ada isian → hanya username dalam daftar yang bisa login.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/whitelist — daftar username yang diizinkan (admin only) */
const getWhitelist = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('allowed_usernames')
      .select('id, username, created_at')
      .order('username');
    if (error) return next(error);
    res.json({ success: true, data, is_active: data.length > 0 });
  } catch (err) { next(err); }
};

/** POST /api/whitelist — tambah username ke daftar (admin only) */
const addToWhitelist = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim())
      return res.status(400).json({ error: 'Username wajib diisi.' });
    const uname = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from('allowed_usernames')
      .insert({ username: uname })
      .select()
      .single();
    if (error) {
      if (error.code === '23505')
        return res.status(409).json({ error: 'Username sudah ada dalam daftar.' });
      return next(error);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** DELETE /api/whitelist/:id — hapus username dari daftar (admin only) */
const removeFromWhitelist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('allowed_usernames')
      .delete()
      .eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getWhitelist, addToWhitelist, removeFromWhitelist };
