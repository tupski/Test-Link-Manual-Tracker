/**
 * public/js/screens.js
 * Render semua screen: beranda (dashboard), test link (session cards),
 * kategori (grouped by type + group_name), links, laporan.
 * v4.0 — Beranda info, countdown, stats, weather; Test Link terpisah.
 */

const Screens = (() => {

  // ── Helper: metadata per tipe kategori ───────────────────────────────
  const TYPE_META = {
    otomatis: { label: '🤖 Test Link Otomatis',    color: 'text-indigo-400',  border: 'border-indigo-500/30', bg: 'bg-indigo-500/5'  },
    utama:    { label: '⭐ Test Link Utama Manual', color: 'text-amber-400',   border: 'border-amber-500/30',  bg: 'bg-amber-500/5'   },
    manual:   { label: '🔗 Test Link Manual',       color: 'text-slate-300',   border: 'border-slate-600/40',  bg: 'bg-slate-800/30'  }
  };

  // ── Stat card helper ──────────────────────────────────────────────────
  const _statCard = (label, value, color) =>
    `<div class="glass rounded-xl p-3 text-center">
      <p class="text-xl font-black ${color}">${value}</p>
      <p class="text-[9px] font-semibold text-slate-500 mt-0.5 leading-tight">${label}</p>
    </div>`;

  /**
   * Render BERANDA — info lengkap: stats, update link.
   * Weather & countdown dikelola oleh main.js (setInterval).
   */
  const renderDashboard = async () => {
    const today    = UI.todayWIB();
    const cats     = await API.getCategories();
    const progress = await API.getProgress(today); // semua sesi
    const notifs   = await API.getNotifications();

    // Notifikasi admin
    const banner = document.getElementById('notif-banner');
    if (notifs.length) {
      banner.classList.remove('hidden');
      document.getElementById('notif-content').innerHTML = notifs.map(n =>
        `<p class="font-semibold">${n.title}</p>${n.message ? `<p class="text-slate-400 text-xs mt-0.5">${n.message}</p>` : ''}`
      ).join('<hr class="border-indigo-500/20 my-2"/>');
    } else { banner.classList.add('hidden'); }

    // ── Hitung statistik ──────────────────────────────────────────────
    const totalLinks   = cats.reduce((a, c) => a + Number(c.link_count), 0);
    const progMap      = {};
    progress.forEach(p => { if (!progMap[p.link_id] || p.status !== 'opened') progMap[p.link_id] = p.status; });

    const countNormal  = Object.values(progMap).filter(s => s === 'normal').length;
    const countError   = Object.values(progMap).filter(s => s === 'error_404').length;
    const countBlocked = Object.values(progMap).filter(s => s === 'blocked').length;
    const countOpened  = Object.values(progMap).filter(s => s === 'opened').length;
    // countDone = countNormal + countError + countBlocked; // (untuk future use)
    const countUntouched = totalLinks - Object.keys(progMap).length;

    document.getElementById('dash-stats-grid').innerHTML = [
      _statCard('Total Link',    totalLinks,           'text-slate-200'),
      _statCard('✅ Normal',      countNormal,          'text-emerald-400'),
      _statCard('❌ Error',       countError,           'text-amber-400'),
      _statCard('🚫 Diblokir',    countBlocked,         'text-rose-400'),
      _statCard('🔵 Dibuka',      countOpened,          'text-indigo-400'),
      _statCard('⬜ Belum Buka',  countUntouched,       'text-slate-500'),
    ].join('');

    // ── Update link terbaru ───────────────────────────────────────────
    const sorted = [...cats].filter(c => c.links_updated_at).sort((a, b) =>
      new Date(b.links_updated_at) - new Date(a.links_updated_at));
    const changeEl = document.getElementById('dash-changes-list');
    if (sorted.length) {
      changeEl.innerHTML = sorted.slice(0, 5).map(c =>
        `<div class="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
          <span class="text-sm font-semibold truncate flex-1">${c.name}</span>
          <span class="text-xs text-slate-500 shrink-0 ml-2">${UI.formatDate(c.links_updated_at)}</span>
          <span class="text-xs text-indigo-400 font-mono ml-2 shrink-0">${c.link_count} link</span>
        </div>`
      ).join('');
    } else {
      changeEl.innerHTML = '<p class="text-center text-slate-500 text-xs py-2">Belum ada data update link.</p>';
    }
  };

  /**
   * Render TEST LINK screen — kartu sesi (Pagi/Siang/Malam) + progress per tipe.
   */
  const renderTestLink = async () => {
    const sessions  = await API.getSessions();
    const today     = UI.todayWIB();
    const progress  = await API.getProgress(today);
    const cats      = await API.getCategories();
    const notifs    = await API.getNotifications();
    const container = document.getElementById('session-cards');

    // Notifikasi di test link banner
    const banner = document.getElementById('notif-banner-tl');
    if (notifs.length) {
      banner.classList.remove('hidden');
      document.getElementById('notif-content-tl').innerHTML = notifs.map(n =>
        `<p class="font-semibold">${n.title}</p>${n.message ? `<p class="text-slate-400 text-xs mt-0.5">${n.message}</p>` : ''}`
      ).join('<hr class="border-indigo-500/20 my-2"/>');
    } else { banner.classList.add('hidden'); }

    // Badge status sesi
    const badgeFor = (timer) => {
      const cls = {
        active:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        overtime: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        expired:  'bg-slate-700 text-slate-500 border-slate-600',
        waiting:  'bg-slate-700 text-slate-400 border-slate-600'
      };
      return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cls[timer.status] || cls.waiting}">${timer.label}</span>`;
    };

    // Mini progress bar per tipe
    const typeRow = (type, sessProg) => {
      const typeCats   = cats.filter(c => c.type === type);
      const totalLinks = typeCats.reduce((a, c) => a + Number(c.link_count), 0);
      if (!totalLinks) return '';
      const doneLinks  = sessProg.filter(p => typeCats.some(c => c.id === p.category_id)).length;
      const pct        = Math.round(doneLinks / totalLinks * 100);
      const meta       = TYPE_META[type];
      return `<div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] ${meta.color} w-32 shrink-0">${meta.label.replace(/^[^ ]+ /,'')}</span>
        <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full ${pct===100?'bg-emerald-500':'bg-gradient-to-r from-indigo-500 to-purple-500'} rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <span class="text-[10px] text-slate-500 shrink-0 w-8 text-right">${pct}%</span>
      </div>`;
    };

    container.innerHTML = sessions.map(s => {
      const timer      = UI.sessionTimer(s.start_hour, s.start_minute, s.normal_hours, s.max_hours);
      const sessProg   = progress.filter(p => p.session_name === s.session_name);
      const totalLinks = cats.reduce((a, c) => a + Number(c.link_count), 0);
      const doneLinks  = sessProg.length;
      const pct        = totalLinks ? Math.round(doneLinks / totalLinks * 100) : 0;
      const sessEmoji  = { pagi: '🌅', siang: '☀️', malam: '🌙' }[s.session_name] || '🕐';
      const sessLabel  = s.session_name.charAt(0).toUpperCase() + s.session_name.slice(1);
      const startLabel = UI.formatTime(s.start_hour, s.start_minute);

      return `<div class="glass rounded-2xl p-5 active:scale-[.98] transition-all cursor-pointer" onclick="App.openSession('${s.session_name}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${sessEmoji}</span>
            <div><h3 class="font-bold text-base">${sessLabel}</h3><p class="text-slate-400 text-xs mt-0.5">${startLabel} WIB</p></div>
          </div>
          ${badgeFor(timer)}
        </div>
        ${typeRow('otomatis', sessProg)}
        ${typeRow('utama', sessProg)}
        ${typeRow('manual', sessProg)}
        <div class="flex justify-between text-xs text-slate-500 mt-2 mb-1">
          <span>${doneLinks}/${totalLinks} link</span><span>${pct}%</span>
        </div>
        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full ${pct===100?'bg-emerald-500':'bg-gradient-to-r from-indigo-500 to-purple-500'} rounded-full progress-bar" style="width:${pct}%"></div>
        </div>
      </div>`;
    }).join('');
  };

  /** Render daftar kategori untuk satu sesi — dikelompokkan per tipe → per group_name */
  const renderCategories = async (sessionName) => {
    const today    = UI.todayWIB();
    const cats     = await API.getCategories();
    const progress = await API.getProgress(today, sessionName);
    const sessions = await API.getSessions();
    const sess     = sessions.find(s => s.session_name === sessionName) || {};

    // Update header sesi
    document.getElementById('cat-session-label').textContent = 'Test Link';
    document.getElementById('cat-session-title').textContent = sessionName.charAt(0).toUpperCase() + sessionName.slice(1);
    const timer   = UI.sessionTimer(sess.start_hour, sess.start_minute, sess.normal_hours, sess.max_hours);
    const timerEl = document.getElementById('cat-timer');
    const tColors = { active:'bg-emerald-500/10 text-emerald-400', overtime:'bg-amber-500/10 text-amber-400', expired:'bg-slate-800 text-slate-500', waiting:'bg-slate-800 text-slate-400' };
    timerEl.className   = `text-xs font-semibold px-3 py-1.5 rounded-xl ${tColors[timer.status] || tColors.waiting}`;
    timerEl.textContent = timer.label;

    // Progress keseluruhan sesi
    const totalLinks = cats.reduce((a, c) => a + Number(c.link_count), 0);
    const doneLinks  = progress.length;
    const overallPct = totalLinks ? Math.round(doneLinks / totalLinks * 100) : 0;
    document.getElementById('cat-progress-text').textContent = `${doneLinks}/${totalLinks} (${overallPct}%)`;
    document.getElementById('cat-progress-bar').style.width  = overallPct + '%';

    // Render kartu kategori per tipe
    const catCard = (cat) => {
      const catProg = progress.filter(p => p.category_id === cat.id);
      const total   = Number(cat.link_count);
      const done    = catProg.length;
      const pct     = total ? Math.round(done / total * 100) : 0;
      const isDone  = total > 0 && done >= total;
      const updated = cat.links_updated_at ? UI.formatDate(cat.links_updated_at) : '-';
      return `<div class="glass rounded-xl p-4 active:scale-[.98] transition-all cursor-pointer ${isDone ? 'border-emerald-500/20' : ''}" onclick="App.openCategory(${cat.id}, '${cat.name.replace(/'/g,"\\'")}')">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-sm truncate flex-1">${cat.name}</h3>
          ${isDone ? '<span class="text-emerald-400 text-xs font-bold ml-2 shrink-0">✓ Selesai</span>' : `<span class="text-xs text-slate-400">${done}/${total}</span>`}
        </div>
        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
          <div class="h-full ${isDone ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} rounded-full progress-bar" style="width:${pct}%"></div>
        </div>
        <p class="text-[10px] text-slate-500">🕐 ${updated}</p>
      </div>`;
    };

    // Render per tipe → per group_name
    const container = document.getElementById('category-list');
    let html = '';
    ['otomatis', 'utama', 'manual'].forEach(type => {
      const typeCats = cats.filter(c => c.type === type);
      if (!typeCats.length) return;
      const meta = TYPE_META[type];
      // Kelompokkan lagi berdasarkan group_name
      const groups = [...new Set(typeCats.map(c => c.group_name || 'Situs'))];
      let groupsHtml = '';
      groups.forEach(grp => {
        const grpCats = typeCats.filter(c => (c.group_name || 'Situs') === grp);
        groupsHtml += `
          <div class="mb-2">
            <p class="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 px-1">${grp}</p>
            <div class="space-y-2">${grpCats.map(catCard).join('')}</div>
          </div>`;
      });
      html += `<div class="pt-3 pb-1">
        <p class="text-xs font-bold ${meta.color} uppercase tracking-wider mb-2 px-1">${meta.label}</p>
        ${groupsHtml}
      </div>`;
    });
    container.innerHTML = html || '<p class="text-center text-slate-500 text-sm py-10">Belum ada kategori.</p>';

    // Cek apakah semua link sudah selesai (status final) → tampilkan Kirim Laporan
    _checkCompletion(cats, progress);
  };

  /**
   * Cek apakah semua link sudah punya status final (normal/blocked/error_404).
   * Jika ya, tampilkan tombol Kirim Laporan.
   */
  const _checkCompletion = (cats, progress) => {
    const btn = document.getElementById('btn-kirim-laporan-wrap');
    if (!btn) return;
    const finalStatuses = new Set(['normal', 'blocked', 'error_404']);
    let totalLinks = 0;
    let doneLinks  = 0;
    cats.forEach(cat => {
      const n = Number(cat.link_count);
      totalLinks += n;
      // Hitung link kategori ini yang sudah punya status final
      const catProg = progress.filter(p => p.category_id === cat.id && finalStatuses.has(p.status));
      doneLinks += Math.min(catProg.length, n);
    });
    btn.classList.toggle('hidden', !(totalLinks > 0 && doneLinks >= totalLinks));
  };

  /** Render daftar link untuk satu kategori */
  const renderLinks = async (catId, catName, sessionName) => {
    const today    = UI.todayWIB();
    const links    = await API.getLinks(catId);
    const progress = await API.getProgress(today, sessionName);
    const catProg  = progress.filter(p => p.category_id === catId);
    const cats     = await API.getCategories();
    const cat      = cats.find(c => c.id === catId) || {};

    document.getElementById('links-session-label').textContent = sessionName;
    document.getElementById('links-cat-name').textContent      = catName;
    document.getElementById('links-updated').textContent       = cat.links_updated_at ? UI.formatDate(cat.links_updated_at) : '';

    const done = catProg.length;
    const total = links.length;
    const pct  = total ? Math.round(done / total * 100) : 0;
    document.getElementById('links-progress-text').textContent = `${done}/${total}`;
    document.getElementById('links-progress-bar').style.width  = pct + '%';

    const statusIcon = { normal:'✅', blocked:'🚫', error_404:'❌', opened:'🔵' };
    const statusLabel = { normal:'Normal', blocked:'Diblokir', error_404:'Error 404', opened:'Sudah dibuka' };
    const statusBg    = { normal:'border-emerald-500/20 bg-emerald-500/5', blocked:'border-rose-500/20 bg-rose-500/5', error_404:'border-amber-500/20 bg-amber-500/5', opened:'border-indigo-500/20 bg-indigo-500/5' };

    const container = document.getElementById('links-list');
    container.innerHTML = links.map(link => {
      const prog = catProg.find(p => p.link_id === link.id);
      const s    = prog?.status || 'none';
      const domain = link.url.replace(/^https?:\/\//,'').split('/')[0];

      return `<div class="glass rounded-xl p-3.5 flex items-center gap-3 ${s !== 'none' ? statusBg[s] || '' : ''}">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-slate-400 font-mono truncate">${domain}</p>
          ${s !== 'none' ? `<p class="text-[10px] mt-0.5 ${s==='normal'?'text-emerald-400':s==='blocked'?'text-rose-400':s==='error_404'?'text-amber-400':'text-indigo-400'}">${statusIcon[s]} ${statusLabel[s]}</p>` : ''}
        </div>
        <button onclick="App.openLink(${link.id}, '${link.url.replace(/'/g,"\\'")}', ${catId}, '${catName.replace(/'/g,"\\'")}', '${sessionName}', '${prog?.id||''}')"
          class="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all ${s !== 'none' ? 'bg-slate-700 text-slate-300' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'}">
          ${s !== 'none' ? '↩ Buka Lagi' : 'Buka'}
        </button>
      </div>`;
    }).join('') || '<p class="text-center text-slate-500 text-sm py-10">Belum ada link di kategori ini.</p>';
  };

  /**
   * Generate teks laporan berformat per kategori dengan tab-alignment.
   * Format per kategori:
   *   Semua normal  → "CATNAME\t: Normal ✅"
   *   Ada masalah   → "CATNAME\t: X Error, Y Diblokir, Z Normal"
   *                   "\t- domain.com\tError ❌"
   *                   "\t- domain2.com\tDiblokir 🚫"
   *
   * @param {string} sessionName - 'pagi' | 'siang' | 'malam'
   * @param {string} provider    - nama provider user
   * @returns {Promise<string>}  - teks laporan siap kirim
   */
  const generateReport = async (sessionName, provider) => {
    const today    = UI.todayWIB();
    const cats     = await API.getCategories();
    const progress = await API.getProgress(today, sessionName);
    const sessNum  = { pagi: 1, siang: 2, malam: 3 };
    const num      = sessNum[sessionName] || 1;

    // Waktu WIB saat generate (= waktu selesai test)
    const wibNow  = new Date(Date.now() + 7 * 3600000);
    const tgl     = wibNow.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const jam     = String(wibNow.getUTCHours()).padStart(2, '0') + ':' + String(wibNow.getUTCMinutes()).padStart(2, '0');
    const prov    = provider || 'Tidak diketahui';

    // Ambil semua link paralel
    const linksMap = {};
    await Promise.all(cats.map(async cat => { linksMap[cat.id] = await API.getLinks(cat.id); }));

    // Ambil domain dari URL untuk baris detail
    const domainOf = (url) => url.replace(/^https?:\/\//, '').split('/')[0];

    let report = '';
    const sections = [
      { type: 'otomatis', title: 'Test Link Otomatis' },
      { type: 'utama',    title: 'Test Link Utama Manual' },
      { type: 'manual',   title: 'Test Link Manual' }
    ];

    sections.forEach(sec => {
      const typeCats = cats.filter(c => c.type === sec.type);
      if (!typeCats.length) return;

      report += `${sec.title} #${num}\n`;
      report += `Cache & Cookies cleared ✅\n\n`;
      report += `${tgl}, ${jam} WIB\n`;
      report += `Provider: ${prov}\n\n`;

      typeCats.forEach(cat => {
        const links = linksMap[cat.id] || [];
        if (!links.length) return;

        // Hitung status per link dalam kategori ini
        let normalCount = 0, errorCount = 0, blockedCount = 0;
        const problemLinks = [];

        links.forEach(link => {
          const prog   = progress.find(p => p.link_id === link.id);
          const status = prog?.status || 'none';
          if (status === 'normal') {
            normalCount++;
          } else if (status === 'error_404') {
            errorCount++;
            problemLinks.push({ domain: domainOf(link.url), label: 'Error ❌' });
          } else if (status === 'blocked') {
            blockedCount++;
            problemLinks.push({ domain: domainOf(link.url), label: 'Diblokir 🚫' });
          } else {
            // opened / belum dikonfirmasi — masuk problem juga
            problemLinks.push({ domain: domainOf(link.url), label: 'Belum dikonfirmasi 🔵' });
          }
        });

        const catName = cat.name;
        if (problemLinks.length === 0) {
          // Semua normal — satu baris saja
          report += `${catName}\t: Normal ✅\n`;
        } else {
          // Ada masalah — tampilkan ringkasan + detail
          const summaryParts = [];
          if (errorCount   > 0) summaryParts.push(`${errorCount} Error`);
          if (blockedCount > 0) summaryParts.push(`${blockedCount} Diblokir`);
          if (normalCount  > 0) summaryParts.push(`${normalCount} Normal`);
          report += `${catName}\t: ${summaryParts.join(', ')}\n`;
          problemLinks.forEach(pl => { report += `\t- ${pl.domain}\t${pl.label}\n`; });
        }
      });

      report += '\n';
    });

    return report.trim();
  };

  return { renderDashboard, renderTestLink, renderCategories, renderLinks, generateReport };
})();
