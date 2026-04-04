/**
 * backend/middleware/errorHandler.js
 * Global error handler — menangkap semua error yang diteruskan via next(err).
 */

'use strict';

/**
 * Middleware error handler terpusat.
 * Harus dipasang PALING AKHIR di Express app (setelah semua route).
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status  = err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server.';

  console.error(`[ERROR] ${req.method} ${req.path} → ${message}`);

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
