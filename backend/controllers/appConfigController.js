/**
 * backend/controllers/appConfigController.js
 * Konfigurasi tampilan aplikasi (nama, slogan, ikon).
 * GET publik — PATCH hanya admin.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/config/app — ambil semua config (publik) */
const getAppConfig = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value');
    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/config/app — update satu atau lebih key config (admin) */
const updateAppConfig = async (req, res, next) => {
  try {
    const updates = req.body;
    if (!updates || !Object.keys(updates).length)
      return res.status(400).json({ error: 'Tidak ada data yang dikirim.' });

    const allowed = ['app_name', 'app_slogan', 'app_icon'];
    const now     = new Date().toISOString();
    const upserts = Object.entries(updates)
      .filter(([k]) => allowed.includes(k))
      .map(([key, value]) => ({ key, value: String(value).trim(), updated_at: now }));

    if (!upserts.length)
      return res.status(400).json({ error: 'Key tidak valid.' });

    const { error } = await supabase.from('app_config')
      .upsert(upserts, { onConflict: 'key' });
    if (error) return next(error);

    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getAppConfig, updateAppConfig };
