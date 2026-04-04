/**
 * backend/controllers/configController.js
 * Konfigurasi jadwal sesi (pagi/siang/malam) — admin CRUD, publik read.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/config/sessions — ambil semua konfigurasi sesi */
const getSessions = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('session_config')
      .select('*')
      .order('start_hour', { ascending: true });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/config/sessions/:id — update konfigurasi sesi (admin) */
const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_hour, start_minute, normal_hours, max_hours } = req.body;

    const updates = {};
    if (start_hour   !== undefined) updates.start_hour   = Number(start_hour);
    if (start_minute !== undefined) updates.start_minute = Number(start_minute);
    if (normal_hours !== undefined) updates.normal_hours = Number(normal_hours);
    if (max_hours    !== undefined) updates.max_hours    = Number(max_hours);

    if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });

    const { data, error } = await supabase
      .from('session_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { getSessions, updateSession };
