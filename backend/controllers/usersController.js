/**
 * backend/controllers/usersController.js
 * Manajemen user — hanya admin yang bisa akses.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/users — daftar semua user + provider (admin) */
const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, provider, last_seen, created_at')
      .order('last_seen', { ascending: false });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/users/:id — edit username / provider user (admin) */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, provider } = req.body;

    const updates = {};
    if (username?.trim()) {
      const uname = username.trim().toLowerCase();
      // Cek duplikat username
      const { data: exists } = await supabase
        .from('users').select('id').eq('username', uname).neq('id', id).maybeSingle();
      if (exists) return res.status(409).json({ error: 'Username sudah digunakan user lain.' });
      updates.username = uname;
    }
    if (provider?.trim()) updates.provider = provider.trim();
    if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });

    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** DELETE /api/users/:id — hapus user (admin) */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (String(req.user.id) === String(id))
      return res.status(400).json({ error: 'Tidak bisa hapus akun sendiri.' });

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getUsers, updateUser, deleteUser };
