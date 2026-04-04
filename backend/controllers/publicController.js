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
      .from('session_config')
      .select('id, session_name, start_hour, start_minute, normal_hours, max_hours')
      .order('start_hour', { ascending: true });
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

/**
 * GET /api/public/monitor
 * Data real-time untuk halaman pantau publik.
 * Mencakup: statistik hari ini, progress per user, per tipe, aktivitas terbaru.
 */
const getMonitorData = async (req, res, next) => {
  try {
    const date = req.query.date || new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

    // Ambil config monitor
    const { data: cfgRows } = await supabase.from('app_config').select('key,value');
    const cfg = Object.fromEntries((cfgRows || []).map(r => [r.key, r.value]));
    if (cfg.monitor_enabled !== 'true') return res.status(403).json({ error: 'Monitoring dinonaktifkan.' });

    // Cek session-only restriction
    if (cfg.monitor_session_only === 'true') {
      const { data: sessions } = await supabase.from('session_config')
        .select('start_hour,start_minute,normal_hours,max_hours');
      const nowMinutes = (() => {
        const d = new Date(Date.now() + 7 * 3600000);
        return d.getUTCHours() * 60 + d.getUTCMinutes();
      })();
      const anyActive = (sessions || []).some(s => {
        const start = s.start_hour * 60 + (s.start_minute || 0);
        const end   = start + (s.max_hours || 2) * 60;
        return nowMinutes >= start && nowMinutes < end;
      });
      if (!anyActive) return res.status(403).json({ error: 'Monitoring hanya aktif saat sesi berlangsung.' });
    }

    // ── Ambil semua data yang diperlukan secara paralel ──────
    const [{ data: rawCats }, { data: prog }, { data: sessions }, { data: users }, { data: links }] = await Promise.all([
      supabase.from('categories').select('id,name,type,group_name,links(count)').order('sort_order'),
      supabase.from('progress').select('link_id,category_id,session_name,status,user_id,updated_at').eq('date', date),
      supabase.from('session_config').select('id,session_name,start_hour,start_minute,normal_hours,max_hours').order('start_hour'),
      supabase.from('users').select('id,username,provider,last_seen'),
      supabase.from('links').select('id,url,category_id').order('sort_order')
    ]);
    const cats  = (rawCats || []).map(c => ({ ...c, link_count: c.links?.[0]?.count ?? 0 }));
    const totalLinks = cats.reduce((a, c) => a + Number(c.link_count), 0);
    // Map link_id → { url, category_id, domain }
    const linkMap = Object.fromEntries((links || []).map(l => [l.id, {
      url: l.url, category_id: l.category_id,
      domain: l.url.replace(/^https?:\/\//, '').split('/')[0]
    }]));

    // ── Statistik global ─────────────────────────────────────
    const finalS = new Set(['normal','blocked','error_404']);
    const progMap = {};
    (prog || []).forEach(p => { const k = `${p.link_id}_${p.session_name}`; if (!progMap[k] || p.status !== 'opened') progMap[k] = p; });
    const vals = Object.values(progMap);
    const summary = {
      total_links: totalLinks, done: vals.filter(p => finalS.has(p.status)).length,
      opened: vals.filter(p => p.status === 'opened').length,
      normal: vals.filter(p => p.status === 'normal').length,
      error:  vals.filter(p => p.status === 'error_404').length,
      blocked:vals.filter(p => p.status === 'blocked').length,
      progress_pct: totalLinks ? Math.round(vals.filter(p => finalS.has(p.status)).length / totalLinks * 100) : 0
    };

    // ── Per tipe kategori ────────────────────────────────────
    const by_type = {};
    ['otomatis','utama','manual'].forEach(type => {
      const tc = cats.filter(c => c.type === type);
      const tot = tc.reduce((a, c) => a + Number(c.link_count), 0);
      const done = (prog || []).filter(p => tc.some(c => c.id === p.category_id) && finalS.has(p.status)).length;
      by_type[type] = { total: tot, done, pct: tot ? Math.round(done/tot*100) : 0 };
    });

    // ── Per user ─────────────────────────────────────────────
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const userStatsMap = {};
    (prog || []).forEach(p => {
      if (!userStatsMap[p.user_id]) userStatsMap[p.user_id] = { total:0, done:0, normal:0, error:0, blocked:0, opened:0, last_active: null };
      const s = userStatsMap[p.user_id];
      s.total++;
      if (finalS.has(p.status)) s.done++;
      if (p.status === 'normal')    s.normal++;
      if (p.status === 'error_404') s.error++;
      if (p.status === 'blocked')   s.blocked++;
      if (p.status === 'opened')    s.opened++;
      if (!s.last_active || p.updated_at > s.last_active) s.last_active = p.updated_at;
    });
    const userList = Object.entries(userStatsMap).map(([uid, s]) => {
      const u = userMap[uid] || {};
      return { username: u.username || '?', provider: u.provider || '—', ...s,
        pct: totalLinks ? Math.round(s.done/totalLinks*100) : 0 };
    }).sort((a,b) => b.done - a.done);

    // ── Aktivitas terbaru (50 record) ────────────────────────
    const catMap  = Object.fromEntries(cats.map(c => [c.id, c]));
    const recent  = (prog || []).filter(p => finalS.has(p.status))
      .sort((a,b) => (b.updated_at||'').localeCompare(a.updated_at||''))
      .slice(0, 50)
      .map(p => ({
        username:    userMap[p.user_id]?.username  || '?',
        category:    catMap[p.category_id]?.name   || '?',
        type:        catMap[p.category_id]?.type    || '?',
        session:     p.session_name,
        status:      p.status,
        at:          p.updated_at,
        link_domain: linkMap[p.link_id]?.domain    || '?'
      }));

    // ── Progress per kategori + per link ─────────────────────
    // Digunakan di halaman pantau untuk tampilan detail
    const cat_links = {};
    cats.forEach(cat => {
      const catLinkList = (links || []).filter(l => l.category_id === cat.id);
      const catProg     = (prog  || []).filter(p => p.category_id === cat.id);
      cat_links[cat.id] = {
        name: cat.name, type: cat.type,
        links: catLinkList.map(l => {
          // Ambil progress terbaik: prioritaskan status final di atas 'opened'
          const lProgs = catProg.filter(p => p.link_id === l.id);
          const best   = lProgs.find(p => finalS.has(p.status)) || lProgs[0];
          return {
            domain:   linkMap[l.id]?.domain || '?',
            status:   best?.status || 'none',
            at:       best?.updated_at || null,
            username: best ? (userMap[best.user_id]?.username || '?') : null
          };
        })
      };
    });

    // ── Status sesi saat ini ─────────────────────────────────
    const nowM = (() => { const d = new Date(Date.now()+7*3600000); return d.getUTCHours()*60+d.getUTCMinutes(); })();
    const sessionStatus = (sessions||[]).map(s => {
      const start = s.start_hour*60+(s.start_minute||0);
      const endNormal = start + (s.normal_hours||1)*60;
      const endMax    = start + (s.max_hours||2)*60;
      let status = nowM < start ? 'waiting' : nowM < endNormal ? 'active' : nowM < endMax ? 'overtime' : 'expired';
      return { name: s.session_name, start_hour: s.start_hour, start_minute: s.start_minute||0,
               normal_hours: s.normal_hours, max_hours: s.max_hours, status };
    });

    res.json({ success:true, date, generated_at: new Date().toISOString(),
      config: { monitor_path: cfg.monitor_path || 'pantau', app_name: cfg.app_name || 'Test Link Tracker' },
      summary, by_type, sessions: sessionStatus, users: userList, recent, cat_links });
  } catch (err) { next(err); }
};

/** GET /api/public/monitor-config — hanya config tanpa data */
const getMonitorConfig = async (req, res, next) => {
  try {
    const { data } = await supabase.from('app_config').select('key,value');
    const cfg = Object.fromEntries((data||[]).map(r=>[r.key,r.value]));
    res.json({ monitor_enabled: cfg.monitor_enabled==='true', monitor_session_only: cfg.monitor_session_only==='true',
      monitor_path: cfg.monitor_path||'pantau', app_name: cfg.app_name||'Test Link Tracker' });
  } catch(err){ next(err); }
};

module.exports = { getPublicCategories, getPublicLinks, getPublicSessions, getPublicStats, getMonitorData, getMonitorConfig };
