/**
 * backend/controllers/progressController.js
 * Tracking progress per user, per sesi, per hari — Supabase PostgreSQL.
 * Reset otomatis tiap hari karena progress di-query berdasarkan tanggal WIB.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/progress?date=&session= — progress user saat ini */
const getProgress = async (req, res, next) => {
  try {
    const { date, session } = req.query;
    if (!date) return res.status(400).json({ error: 'Parameter "date" wajib diisi.' });

    let q = supabase.from('progress')
      .select('id, link_id, category_id, session_name, status, opened_at, updated_at')
      .eq('user_id', req.user.id)
      .eq('date', date);

    if (session) q = q.eq('session_name', session);

    const { data, error } = await q;
    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** POST /api/progress — tandai link dibuka (status: opened) */
const markOpened = async (req, res, next) => {
  try {
    const { link_id, category_id, session_name, date } = req.body;
    if (!link_id || !category_id || !session_name || !date)
      return res.status(400).json({ error: 'Field link_id, category_id, session_name, date wajib.' });

    const { data, error } = await supabase.from('progress')
      .upsert(
        { user_id: req.user.id, link_id, category_id, session_name, date, status: 'opened', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,link_id,session_name,date' }
      )
      .select().single();

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/progress/:id — update status link (normal/blocked/error_404) */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['opened', 'normal', 'blocked', 'error_404'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });

    const { data, error } = await supabase.from('progress')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', req.user.id)
      .select().single();

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** POST /api/progress/mark-all — tandai semua link kategori selesai (status: normal) */
const markAllOpened = async (req, res, next) => {
  try {
    const { category_id, session_name, date } = req.body;
    if (!category_id || !session_name || !date)
      return res.status(400).json({ error: 'Field category_id, session_name, date wajib.' });

    const { data: links } = await supabase.from('links').select('id').eq('category_id', category_id);
    if (!links?.length) return res.json({ success: true, count: 0 });

    const rows = links.map(l => ({
      user_id: req.user.id, link_id: l.id, category_id, session_name, date,
      status: 'normal', updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('progress')
      .upsert(rows, { onConflict: 'user_id,link_id,session_name,date' });

    if (error) return next(error);
    res.json({ success: true, count: links.length });
  } catch (err) { next(err); }
};

/** DELETE /api/progress — reset progress kategori satu sesi */
const resetProgress = async (req, res, next) => {
  try {
    const { category_id, session_name, date } = req.body;
    const { error } = await supabase.from('progress')
      .delete()
      .eq('user_id', req.user.id)
      .eq('category_id', category_id)
      .eq('session_name', session_name)
      .eq('date', date);

    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getProgress, markOpened, updateStatus, markAllOpened, resetProgress };
