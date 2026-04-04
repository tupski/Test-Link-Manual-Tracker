/**
 * backend/controllers/usersController.js
 * Manajemen user — hanya admin yang bisa akses.
 */

'use strict';

const bcrypt   = require('bcryptjs');
const supabase = require('../models/supabase');

/** GET /api/users — daftar semua user + provider + reset_allowed (admin) */
const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, provider, reset_allowed, last_seen, created_at')
      .order('last_seen', { ascending: false });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/users/:id/reset-allowed — admin toggle reset_allowed */
const toggleResetAllowed = async (req, res, next) => {
  try {
    const { id }      = req.params;
    const { allowed } = req.body;
    if (typeof allowed !== 'boolean')
      return res.status(400).json({ error: 'Field "allowed" harus boolean.' });

    const { data, error } = await supabase
      .from('users').update({ reset_allowed: allowed }).eq('id', id).select().single();
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

/**
 * PATCH /api/auth/me/password
 * User mengatur atau mengubah kata sandi akun sendiri.
 * Body: { password, new_password }
 * - Jika user belum punya password: cukup kirim new_password saja.
 * - Jika sudah punya password: wajib kirim password lama (untuk verifikasi).
 */
const setMyPassword = async (req, res, next) => {
  try {
    const userId      = req.user.id;
    const { password, new_password } = req.body;
    if (!new_password || new_password.trim().length < 6)
      return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });

    // Ambil data user untuk cek apakah sudah punya password
    const { data: user, error: userErr } = await supabase
      .from('users').select('password_hash').eq('id', userId).single();
    if (userErr || !user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    // Jika sudah ada password_hash, wajib verifikasi password lama
    if (user.password_hash) {
      if (!password) return res.status(400).json({ error: 'Masukkan kata sandi lama untuk konfirmasi.' });
      const valid = await bcrypt.compare(password.trim(), user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Kata sandi lama salah.' });
    }

    const hash = await bcrypt.hash(new_password.trim(), 10);
    const { error } = await supabase.from('users').update({ password_hash: hash }).eq('id', userId);
    if (error) return next(error);
    res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/auth/me/password
 * User menghapus kata sandi (akun kembali tanpa proteksi).
 */
const removeMyPassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { error } = await supabase.from('users').update({ password_hash: null }).eq('id', userId);
    if (error) return next(error);
    res.json({ success: true, message: 'Kata sandi dihapus. Akun tidak lagi terproteksi.' });
  } catch (err) { next(err); }
};

module.exports = { getUsers, toggleResetAllowed, updateUser, deleteUser, setMyPassword, removeMyPassword };
