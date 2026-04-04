/**
 * backend/server.js
 * Entry point server Express — Link Tester v2
 */

'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');
const apiRoutes    = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());                          // izinkan cross-origin (akses dari HP)
app.use(express.json());                  // parse JSON body
app.use(morgan('dev'));                   // logging request ke console

// ── Static frontend ───────────────────────────────────────────────────
// Serve folder public/ sebagai root — buka http://IP:3000 dari HP
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API routes ────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Fallback SPA (Express 5 syntax) ──────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // Tampilkan semua IP lokal agar mudah diakses dari HP
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips  = [];

  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }

  console.log('\n✅ Link Tester berjalan!');
  console.log(`   Lokal  : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   Network: http://${ip}:${PORT}  ← buka dari HP`));
  console.log('');
});
