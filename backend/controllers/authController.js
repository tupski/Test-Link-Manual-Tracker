/**
 * backend/controllers/authController.js
 * Login: user cukup input username, admin butuh password.
 * Mengembalikan JWT token.
 */

'use strict';

const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const supabase = require('../models/supabase');

const JWT_SECRET      = (process.env.JWT_SECRET || 'changeme_secret_jwt_2026').trim();
const ADMIN_PASSWORD  = (process.env.ADMIN_PASSWORD || 'Admin@2026!').trim();
const JWT_EXPIRES     = '7d';

/** Buat token JWT untuk user */
const _makeToken = (user) => jwt.sign(
  { id: user.id, username: user.username, role: user.role, provider: user.provider,
    reset_allowed: user.reset_allowed },
  JWT_SECRET, { expiresIn: JWT_EXPIRES }
);

/**
 * POST /api/auth/login
 * Body: { username, password?, provider? }
 * - Admin: username "admin" + password env
 * - User biasa: username saja (atau + password jika user sudah set password)
 * - Whitelist: jika tabel allowed_usernames tidak kosong, hanya yang ada di situ yang bisa masuk
 */
const login = async (req, res, next) => {
  try {
    const { username, password, provider } = req.body;
    if (!username || !username.trim())
      return res.status(400).json({ error: 'Username wajib diisi.' });

    const uname     = username.trim().toLowerCase();
    const pwdClean  = (password || '').trim();
    const provClean = (provider || '').trim() || null;
    let   role      = 'user';

    // ── Admin check ─────────────────────────────────────────
    if (uname === 'admin') {
      if (!pwdClean || pwdClean !== ADMIN_PASSWORD)
        return res.status(401).json({ error: 'Password admin salah.' });
      role = 'admin';
    } else {
      // ── Whitelist check ───────────────────────────────────
      const { count } = await supabase
        .from('allowed_usernames')
        .select('*', { count: 'exact', head: true });
      if (count > 0) {
        const { data: allowed } = await supabase
          .from('allowed_usernames')
          .select('username')
          .eq('username', uname)
          .maybeSingle();
        if (!allowed)
          return res.status(403).json({ error: 'Username tidak terdaftar. Hubungi admin.' });
      }
    }

    // ── Ambil user yang sudah ada (untuk cek password_hash) ──
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', uname)
      .maybeSingle();

    // ── Cek password user (jika sudah diset) ─────────────────
    if (existingUser?.password_hash && uname !== 'admin') {
      if (!pwdClean)
        return res.status(401).json({ error: 'Akun ini dilindungi kata sandi. Masukkan kata sandi Anda.' });
      const valid = await bcrypt.compare(pwdClean, existingUser.password_hash);
      if (!valid)
        return res.status(401).json({ error: 'Kata sandi salah.' });
    }

    // ── Upsert user ke database ───────────────────────────────
    const upsertData = { username: uname, role, last_seen: new Date().toISOString() };
    if (provClean) upsertData.provider = provClean;

    const { data: user, error } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'username', ignoreDuplicates: false })
      .select()
      .single();

    if (error) return next(error);

    const token = _makeToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role,
      provider: user.provider, reset_allowed: user.reset_allowed,
      has_password: !!user.password_hash } });
  } catch (err) { next(err); }
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

/**
 * PATCH /api/auth/me
 * Update username dan/atau provider user yang sedang login.
 * Mengembalikan JWT baru dengan data terbaru.
 */
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, provider } = req.body;

    const updates = { last_seen: new Date().toISOString() };

    if (username?.trim()) {
      const uname = username.trim().toLowerCase();
      // Larang admin ganti username
      if (req.user.role === 'admin' && uname !== 'admin')
        return res.status(400).json({ error: 'Username admin tidak bisa diubah.' });
      // Cek duplikat
      const { data: exists } = await supabase
        .from('users').select('id').eq('username', uname).neq('id', userId).maybeSingle();
      if (exists) return res.status(409).json({ error: 'Username sudah digunakan.' });
      updates.username = uname;
    }

    if (provider?.trim()) updates.provider = provider.trim();

    const { data: user, error } = await supabase
      .from('users').update(updates).eq('id', userId).select().single();

    if (error) return next(error);

    // Buat token baru dengan data yang diperbarui
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, provider: user.provider },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, provider: user.provider } });
  } catch (err) { next(err); }
};

module.exports = { login, me, updateMe };
