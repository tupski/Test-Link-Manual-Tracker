/**
 * backend/middleware/auth.js
 * Verifikasi JWT token dari header Authorization.
 * Menyimpan payload ke req.user.
 */

'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret_jwt_2026';

/**
 * Middleware: wajib login (user maupun admin).
 */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};

/**
 * Middleware: hanya admin yang boleh akses.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin.' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
