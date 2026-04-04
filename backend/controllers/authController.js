/**
 * backend/controllers/authController.js
 * Login: user cukup input username, admin butuh password.
 * Mengembalikan JWT token.
 */

'use strict';

const jwt      = require('jsonwebtoken');
const supabase = require('../models/supabase');

const JWT_SECRET      = (process.env.JWT_SECRET || 'changeme_secret_jwt_2026').trim();
const ADMIN_PASSWORD  = (process.env.ADMIN_PASSWORD || 'Admin@2026!').trim();
const JWT_EXPIRES     = '7d';

/**
 * POST /api/auth/login
 * Body: { username, password? }
 * - User biasa: hanya username (tidak perlu password)
 * - Admin: username "admin" + password dari .env
 */
const login = async (req, res, next) => {
  try {
    const { username, password, provider } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi.' });
    }

    const uname      = username.trim().toLowerCase();
    const pwdClean   = (password || '').trim();
    const provClean  = (provider || '').trim() || null;
    let role         = 'user';

    // --- Cek apakah login sebagai admin ---
    if (uname === 'admin') {
      if (!pwdClean || pwdClean !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Password admin salah.' });
      }
      role = 'admin';
    }

    // --- Upsert user ke database (simpan provider) ---
    const upsertData = { username: uname, role, last_seen: new Date().toISOString() };
    if (provClean) upsertData.provider = provClean;

    const { data: user, error } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'username', ignoreDuplicates: false })
      .select()
      .single();

    if (error) return next(error);

    // --- Buat JWT (sertakan provider untuk dipakai di report) ---
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, provider: user.provider },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, provider: user.provider } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Mengembalikan info user yang sedang login.
 */
const me = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, role, provider, last_seen, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    // Update last_seen
    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id);

    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, me };
