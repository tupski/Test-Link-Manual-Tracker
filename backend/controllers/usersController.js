/**
 * backend/controllers/usersController.js
 * Manajemen user — hanya admin yang bisa akses.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/users — daftar semua user yang pernah login */
const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, last_seen, created_at')
      .order('last_seen', { ascending: false });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** DELETE /api/users/:id — hapus user (admin) */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) return res.status(400).json({ error: 'Tidak bisa hapus akun sendiri.' });

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getUsers, deleteUser };
