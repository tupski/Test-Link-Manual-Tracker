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

/**
 * GET /api/progress/history?days=7
 * Riwayat progress user sendiri dalam N hari terakhir.
 * Mengembalikan data dikelompokkan per tanggal dan sesi.
 */
const getHistory = async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 7, 30); // max 30 hari
    // Hitung rentang tanggal WIB (YYYY-MM-DD)
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() + 7 * 3600000 - i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }

    const { data, error } = await supabase.from('progress')
      .select('id, link_id, category_id, session_name, status, date, opened_at, updated_at')
      .eq('user_id', req.user.id)
      .in('date', dates)
      .order('date', { ascending: false })
      .order('session_name');

    if (error) return next(error);

    // Kelompokkan per tanggal + sesi
    const grouped = {};
    (data || []).forEach(p => {
      const key = `${p.date}__${p.session_name}`;
      if (!grouped[key]) grouped[key] = { date: p.date, session: p.session_name, items: [] };
      grouped[key].items.push(p);
    });

    // Hitung summary per kelompok
    const result = Object.values(grouped).map(g => {
      const total  = g.items.length;
      const done   = g.items.filter(p => ['normal','blocked','error_404'].includes(p.status)).length;
      const errors = g.items.filter(p => p.status === 'error_404').length;
      const blocked = g.items.filter(p => p.status === 'blocked').length;
      return { date: g.date, session: g.session, total, done, errors, blocked, pct: total ? Math.round(done / total * 100) : 0 };
    });

    res.json(result);
  } catch (err) { next(err); }
};

/**
 * POST /api/progress/session-start
 * Dipanggil saat sesi baru dimulai (dari frontend).
 * Hapus progress user sendiri hari ini untuk sesi ini yang dibuat SEBELUM jam mulai sesi,
 * lalu kirim notifikasi bahwa data lama dihapus.
 */
const onSessionStart = async (req, res, next) => {
  try {
    const { session_name, date } = req.body;
    if (!session_name || !date)
      return res.status(400).json({ error: 'session_name dan date wajib.' });

    const userId = req.user.id;

    // Cek apakah user punya data untuk sesi ini hari ini
    const { data: existing, error: chkErr } = await supabase.from('progress')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('session_name', session_name)
      .eq('date', date);

    if (chkErr) return next(chkErr);

    const count = existing?.length || 0;
    if (count === 0) return res.json({ success: true, deleted: 0, notified: false });

    // Hapus semua progress user untuk sesi ini hari ini
    const { error: delErr } = await supabase.from('progress')
      .delete()
      .eq('user_id', userId)
      .eq('session_name', session_name)
      .eq('date', date);

    if (delErr) return next(delErr);

    // Buat notifikasi in-app untuk user
    const SESS_LABEL = { pagi: 'Pagi', siang: 'Sore', malam: 'Malam' };
    const label = SESS_LABEL[session_name] || session_name;
    const { error: notifErr } = await supabase.from('notifications').insert({
      title:     `🔄 Data Sesi ${label} Dihapus`,
      message:   `Sesi ${label} baru saja dimulai. Data test link sebelumnya (${count} link) telah dihapus otomatis untuk memulai sesi yang bersih.`,
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (notifErr) console.error('[onSessionStart] notif error:', notifErr.message);

    res.json({ success: true, deleted: count, notified: !notifErr });
  } catch (err) { next(err); }
};

module.exports = { getProgress, getHistory, markOpened, updateStatus, markAllOpened, resetProgress, onSessionStart };
