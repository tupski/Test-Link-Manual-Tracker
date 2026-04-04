/**
 * backend/controllers/publicController.js
 * Endpoint publik (tanpa auth) untuk aplikasi Android automation.
 * Menyediakan data read-only: kategori, link, statistik, sesi.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/public/categories — semua kategori dengan jumlah link */
const getPublicCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, group_name, sort_order, links_updated_at, links(count)')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) return next(error);
    const result = data.map(c => ({
      id: c.id, name: c.name, type: c.type || 'manual',
      group_name: c.group_name || 'Situs',
      links_updated_at: c.links_updated_at,
      link_count: c.links?.[0]?.count ?? 0
    }));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

/** GET /api/public/links/:catId — daftar link dalam kategori */
const getPublicLinks = async (req, res, next) => {
  try {
    const { catId } = req.params;
    const { data, error } = await supabase
      .from('links')
      .select('id, url, sort_order')
      .eq('category_id', catId)
      .order('sort_order');
    if (error) return next(error);
    res.json({ success: true, category_id: catId, data });
  } catch (err) { next(err); }
};

/** GET /api/public/sessions — konfigurasi sesi (jadwal) */
const getPublicSessions = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, session_name, start_hour, start_minute, normal_hours, max_hours')
      .order('start_hour');
    if (error) return next(error);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/**
 * GET /api/public/stats?date=YYYY-MM-DD — statistik keseluruhan per tanggal.
 * date bersifat opsional, default ke hari ini WIB.
 */
const getPublicStats = async (req, res, next) => {
  try {
    // Tanggal default = hari ini WIB
    const date = req.query.date || new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

    // Ambil semua kategori (link_count dihitung dari relasi)
    const { data: rawCats, error: catErr } = await supabase
      .from('categories')
      .select('id, name, type, group_name, links(count)');
    if (catErr) return next(catErr);
    const cats = rawCats.map(c => ({
      ...c, link_count: c.links?.[0]?.count ?? 0
    }));

    // Ambil progress hari ini (semua user)
    const { data: prog, error: progErr } = await supabase
      .from('progress')
      .select('link_id, category_id, session_name, status, user_id')
      .eq('date', date);
    if (progErr) return next(progErr);

    const totalLinks = cats.reduce((a, c) => a + Number(c.link_count), 0);

    // De-duplikasi link (pakai status terbaik per link_id)
    const progMap = {};
    prog.forEach(p => {
      const key = `${p.link_id}_${p.session_name}`;
      if (!progMap[key] || p.status !== 'opened') progMap[key] = p.status;
    });
    const vals = Object.values(progMap);
    const countNormal  = vals.filter(s => s === 'normal').length;
    const countError   = vals.filter(s => s === 'error_404').length;
    const countBlocked = vals.filter(s => s === 'blocked').length;
    const countOpened  = vals.filter(s => s === 'opened').length;
    const countDone    = countNormal + countError + countBlocked;

    // Progress per tipe
    const byType = {};
    ['otomatis', 'utama', 'manual'].forEach(type => {
      const typeCats  = cats.filter(c => c.type === type);
      const typeTotal = typeCats.reduce((a, c) => a + Number(c.link_count), 0);
      const typeDone  = prog.filter(p => typeCats.some(c => c.id === p.category_id)).length;
      byType[type] = { total: typeTotal, done: typeDone };
    });

    res.json({
      success: true,
      date,
      stats: {
        total_links: totalLinks,
        opened:      countOpened,
        done:        countDone,
        normal:      countNormal,
        error:       countError,
        blocked:     countBlocked,
        untouched:   totalLinks - Object.keys(progMap).length,
        by_type:     byType
      }
    });
  } catch (err) { next(err); }
};

module.exports = { getPublicCategories, getPublicLinks, getPublicSessions, getPublicStats };
