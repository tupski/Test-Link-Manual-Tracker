/**
 * public/js/screens.js
 * Render semua screen: beranda (dashboard), test link (session cards),
 * kategori (grouped by type + group_name), links, laporan.
 * v4.0 — Beranda info, countdown, stats, weather; Test Link terpisah.
 */

const Screens = (() => {

  // ── Mapping tampilan nama sesi (siang → Sore) ────────────────────────
  const SESS_DISPLAY = { pagi: 'Pagi', siang: 'Sore', malam: 'Malam' };
  const SESS_EMOJI   = { pagi: '🌅',   siang: '🌇',   malam: '🌙'   };

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
    const today = UI.todayWIB();
    // Parallel fetch — ~3x lebih cepat dari sequential await
    const [cats, progress, notifs] = await Promise.all([
      API.getCategories(),
      API.getProgress(today), // semua sesi
      API.getNotifications()
    ]);

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

    const countNormal    = Object.values(progMap).filter(s => s === 'normal').length;
    const countError     = Object.values(progMap).filter(s => s === 'error_404').length;
    const countBlocked   = Object.values(progMap).filter(s => s === 'blocked').length;
    const countOpened    = Object.values(progMap).filter(s => s === 'opened').length;
    const countUntouched = totalLinks - Object.keys(progMap).length;

    // Hitung progress per tipe kategori
    const _typeDone = (type) => {
      const typeCats = cats.filter(c => c.type === type);
      const total    = typeCats.reduce((a, c) => a + Number(c.link_count), 0);
      if (!total) return '–';
      const done = progress.filter(p => typeCats.some(c => c.id === p.category_id)).length;
      return `${done}/${total}`;
    };

    // Baris 1: Total | Dibuka | Belum Dibuka
    // Baris 2: Normal | Error | Diblokir
    // Baris 3: Progress Otomatis | Utama | Manual
    document.getElementById('dash-stats-grid').innerHTML = [
      _statCard('Total Link',      totalLinks,              'text-slate-200'),
      _statCard('🔵 Dibuka',       countOpened,             'text-indigo-400'),
      _statCard('⬜ Belum Buka',   countUntouched,          'text-slate-500'),
      _statCard('✅ Normal',        countNormal,             'text-emerald-400'),
      _statCard('❌ Error',         countError,              'text-amber-400'),
      _statCard('🚫 Diblokir',     countBlocked,            'text-rose-400'),
      _statCard('🤖 Otomatis',     _typeDone('otomatis'),   'text-indigo-400'),
      _statCard('⭐ Utama',        _typeDone('utama'),      'text-amber-400'),
      _statCard('🔗 Manual',       _typeDone('manual'),     'text-slate-300'),
    ].join('');

    // ── Update link terbaru — paginasi 5 item ─────────────────────────────────
    const TYPE_LABEL = { otomatis: 'Otomatis', utama: 'Utama', manual: 'Manual' };
    const sorted = [...cats].filter(c => c.links_updated_at).sort((a, b) =>
      new Date(b.links_updated_at) - new Date(a.links_updated_at));
    const changeEl   = document.getElementById('dash-changes-list');
    const PAGE_SIZE  = 5;
    let   _changePage = 0; // halaman saat ini (0-indexed)

    const _renderChangePage = () => {
      const start  = _changePage * PAGE_SIZE;
      const end    = start + PAGE_SIZE;
      const page   = sorted.slice(start, end);
      const total  = sorted.length;

      const itemsHtml = page.map(c => {
        const typeLabel = TYPE_LABEL[c.type] || c.type;
        return `<div class="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0 cursor-pointer active:bg-white/5 rounded-lg px-1 -mx-1 transition-colors"
          onclick="App.showCategoryLinkChanges(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">${c.name}</p>
            <p class="text-[10px] text-slate-500">${typeLabel} · ${c.group_name || 'Situs'}</p>
          </div>
          <div class="text-right shrink-0 ml-2">
            <p class="text-xs text-indigo-400 font-mono">${c.link_count} link</p>
            <p class="text-[10px] text-slate-500">${UI.formatDate(c.links_updated_at)}</p>
          </div>
          <span class="text-slate-600 ml-1 shrink-0">›</span>
        </div>`;
      }).join('');

      // Navigasi paginasi
      const totalPages = Math.ceil(total / PAGE_SIZE);
      const navHtml = totalPages > 1 ? `
        <div class="flex items-center justify-between pt-2 mt-1 border-t border-slate-700/40">
          <button id="change-prev" onclick="_dashChangePrev()" ${_changePage === 0 ? 'disabled' : ''}
            class="text-xs px-2.5 py-1 rounded-lg ${_changePage === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white active:scale-95'}">‹ Sebelumnya</button>
          <span class="text-[10px] text-slate-500">${_changePage + 1} / ${totalPages}</span>
          <button id="change-next" onclick="_dashChangeNext()" ${end >= total ? 'disabled' : ''}
            class="text-xs px-2.5 py-1 rounded-lg ${end >= total ? 'text-slate-700 cursor-not-allowed' : 'text-indigo-400 hover:text-indigo-300 active:scale-95'}">Selanjutnya ›</button>
        </div>` : '';

      changeEl.innerHTML = itemsHtml + navHtml;
    };

    // Fungsi navigasi paginasi — dipanggil dari inline onclick
    window._dashChangePrev = () => { if (_changePage > 0) { _changePage--; _renderChangePage(); } };
    window._dashChangeNext = () => {
      if ((_changePage + 1) * PAGE_SIZE < sorted.length) { _changePage++; _renderChangePage(); }
    };

    if (sorted.length) {
      _renderChangePage();
    } else {
      changeEl.innerHTML = '<p class="text-center text-slate-500 text-xs py-2">Belum ada data update link.</p>';
    }
  };

  /**
   * Render TEST LINK screen — kartu sesi (Pagi/Siang/Malam) + progress per tipe.
   */
  const renderTestLink = async () => {
    const today = UI.todayWIB();
    // Parallel fetch — semua data diambil sekaligus
    const [sessions, progress, cats, notifs] = await Promise.all([
      API.getSessions(),
      API.getProgress(today),
      API.getCategories(),
      API.getNotifications()
    ]);
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

    // Tanggal hari ini WIB untuk ditampilkan di bawah sesi
    const todayDisplay = new Date(Date.now() + 7 * 3600000)
      .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // ── Cek apakah minimal 1 tipe kategori sudah 100% selesai hari ini ──
    const finalStatuses = new Set(['normal', 'blocked', 'error_404']);
    const _typeAllDone = (type) => {
      const typeCats  = cats.filter(c => c.type === type);
      const typeTotal = typeCats.reduce((a, c) => a + Number(c.link_count), 0);
      if (!typeTotal) return false; // tipe tidak ada = belum selesai
      const typeDone  = progress.filter(p =>
        typeCats.some(c => c.id === p.category_id) && finalStatuses.has(p.status)
      ).length;
      return typeDone >= typeTotal;
    };
    // Tombol muncul saat SALAH SATU tipe sudah selesai semua (bukan harus semua tipe)
    const anyTypeDone = _typeAllDone('otomatis') || _typeAllDone('utama') || _typeAllDone('manual');
    const laporanBtn = document.getElementById('btn-laporan-testlink');
    if (laporanBtn) laporanBtn.classList.toggle('hidden', !anyTypeDone);

    // Tandai apakah SEMUA tipe yang ada sudah selesai → tampilkan 3 tombol laporan di beranda
    // Tipe tanpa kategori dianggap selesai (tidak perlu dikerjakan)
    const _typeExistsAndDone = (type) => {
      const tc = cats.filter(c => c.type === type);
      if (!tc.length) return true; // tidak ada kategori tipe ini → anggap selesai
      return _typeAllDone(type);
    };
    const allTestDone = _typeExistsAndDone('otomatis') && _typeExistsAndDone('utama') && _typeExistsAndDone('manual');
    const laporanWrap = document.getElementById('laporan-wrap');
    if (laporanWrap) laporanWrap.dataset.allDone = allTestDone ? 'true' : 'false';

    container.innerHTML = sessions.map(s => {
      const timer      = UI.sessionTimer(s.start_hour, s.start_minute, s.normal_hours, s.max_hours);
      const sessProg   = progress.filter(p => p.session_name === s.session_name);
      const totalLinks = cats.reduce((a, c) => a + Number(c.link_count), 0);
      const doneLinks  = sessProg.length;
      const pct        = totalLinks ? Math.round(doneLinks / totalLinks * 100) : 0;
      const sessEmoji  = SESS_EMOJI[s.session_name]   || '🕐';
      const sessLabel  = SESS_DISPLAY[s.session_name] || s.session_name;
      const startLabel = UI.formatTime(s.start_hour, s.start_minute);

      return `<div class="glass rounded-2xl p-5 active:scale-[.98] transition-all cursor-pointer" onclick="App.openSession('${s.session_name}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${sessEmoji}</span>
            <div>
              <h3 class="font-bold text-base">${sessLabel}</h3>
              <p class="text-slate-400 text-xs mt-0.5">${startLabel} WIB</p>
              <p class="text-slate-500 text-[10px] mt-0.5">${todayDisplay}</p>
            </div>
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
    const today = UI.todayWIB();
    // Parallel fetch
    const [cats, progress, sessions] = await Promise.all([
      API.getCategories(),
      API.getProgress(today, sessionName),
      API.getSessions()
    ]);
    const sess = sessions.find(s => s.session_name === sessionName) || {};

    // Emoji & label sesi (siang ditampilkan sebagai "Sore")
    const sessEmoji = SESS_EMOJI[sessionName]   || '🕐';
    const sessLabel = SESS_DISPLAY[sessionName] || sessionName;

    // Hitung rentang waktu sesi (mulai — selesai berdasarkan max_hours)
    const startH  = sess.start_hour   ?? 0;
    const startM  = sess.start_minute ?? 0;
    const maxH    = sess.max_hours    ?? 2;
    const endTotal = startH * 60 + startM + maxH * 60;
    const endH    = Math.floor(endTotal / 60) % 24;
    const endM    = endTotal % 60;
    const timeRange = `${UI.formatTime(startH, startM)} – ${UI.formatTime(endH, endM)} WIB`;

    // Hitung nomor sesi berdasarkan urutan jam mulai (Pagi=#1, Sore=#2, Malam=#3)
    const sortedSessions = [...sessions].sort((a, b) =>
      (a.start_hour * 60 + (a.start_minute || 0)) - (b.start_hour * 60 + (b.start_minute || 0)));
    const sessIdx = sortedSessions.findIndex(s => s.session_name === sessionName);
    const sessNum = sessIdx >= 0 ? sessIdx + 1 : 1;

    // Update header sesi
    document.getElementById('cat-session-label').textContent = `${sessEmoji} ${sessLabel} · ${timeRange}`;
    document.getElementById('cat-session-title').textContent = `Test Link #${sessNum}`;

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
        <p class="text-[10px] text-slate-500">🕐 Terakhir Update: ${updated}</p>
      </div>`;
    };

    // Helper: cek apakah semua link di tipe ini sudah berstatus final
    const finalStatuses = new Set(['normal', 'blocked', 'error_404']);
    const isTypeDone = (type) => {
      const tc  = cats.filter(c => c.type === type);
      const tot = tc.reduce((a, c) => a + Number(c.link_count), 0);
      if (!tot) return false;
      const done = progress.filter(p =>
        tc.some(c => c.id === p.category_id) && finalStatuses.has(p.status)
      ).length;
      return done >= tot;
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
      // Tombol Kirim Laporan: setelah utama (mencakup otomatis+utama), dan setelah manual
      let laporanBtn = '';
      if (type === 'utama') {
        const autoUtamaDone = isTypeDone('otomatis') || isTypeDone('utama');
        if (autoUtamaDone) {
          laporanBtn = `<button onclick="App.kirimLaporan()" class="w-full mt-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
            📤 Kirim Laporan Otomatis &amp; Utama
          </button>`;
        }
      } else if (type === 'manual') {
        if (isTypeDone('manual')) {
          laporanBtn = `<button onclick="App.kirimLaporan()" class="w-full mt-2 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
            📤 Kirim Laporan Manual
          </button>`;
        }
      }
      html += `<div class="pt-3 pb-1">
        <p class="text-xs font-bold ${meta.color} uppercase tracking-wider mb-2 px-1">${meta.label}</p>
        ${groupsHtml}
        ${laporanBtn}
      </div>`;
    });
    container.innerHTML = html || '<p class="text-center text-slate-500 text-sm py-10">Belum ada kategori.</p>';

    // Cek apakah semua link sudah selesai (status final) → tampilkan Kirim Laporan
    _checkCompletion(cats, progress);
  };

  /**
   * Cek apakah minimal 1 kategori sudah selesai (semua link berstatus final).
   * Jika ya, tampilkan tombol floating Kirim Laporan di atas bottom nav.
   */
  const _checkCompletion = (cats, progress) => {
    const btn = document.getElementById('btn-kirim-laporan-float');
    if (!btn) return;
    const finalStatuses = new Set(['normal', 'blocked', 'error_404']);
    // Cek apakah ADA SATU kategori yang sudah selesai semua linknya
    const anyDone = cats.some(cat => {
      const n = Number(cat.link_count);
      if (n === 0) return false;
      const catFinal = progress.filter(p => p.category_id === cat.id && finalStatuses.has(p.status));
      return catFinal.length >= n;
    });
    btn.classList.toggle('hidden', !anyDone);
  };

  /** Render daftar link untuk satu kategori */
  const renderLinks = async (catId, catName, sessionName) => {
    const today = UI.todayWIB();
    // Parallel fetch — 3x lebih cepat dari sequential await
    const [links, progress, cats] = await Promise.all([
      API.getLinks(catId),
      API.getProgress(today, sessionName),
      API.getCategories()
    ]);
    const catProg = progress.filter(p => p.category_id === catId);
    const cat     = cats.find(c => c.id === catId) || {};

    document.getElementById('links-session-label').textContent = SESS_DISPLAY[sessionName] || sessionName;
    document.getElementById('links-cat-name').textContent      = catName;
    document.getElementById('links-updated').textContent       = cat.links_updated_at ? UI.formatDate(cat.links_updated_at) : '';

    // Hitung hanya status final (bukan opened) untuk progress bar
    const finalSet = new Set(['normal', 'blocked', 'error_404']);
    const done  = catProg.filter(p => finalSet.has(p.status)).length;
    const total = links.length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    document.getElementById('links-progress-text').textContent = `${done}/${total}`;
    document.getElementById('links-progress-bar').style.width  = pct + '%';

    const statusIcon  = { normal:'✅', blocked:'🚫', error_404:'❌', opened:'🔵' };
    // Warna jauh lebih kontras: border tebal + background kuat agar beda jelas
    const statusBg = {
      normal:    'border-l-4 border-l-emerald-500 border-emerald-500/30 bg-emerald-500/15',
      blocked:   'border-l-4 border-l-rose-500    border-rose-500/30    bg-rose-500/15',
      error_404: 'border-l-4 border-l-amber-500   border-amber-500/30   bg-amber-500/15',
      opened:    'border-l-4 border-l-indigo-500  border-indigo-500/30  bg-indigo-500/10'
    };
    // Format waktu klik (WIB-aware)
    const fmtTime = dt => dt
      ? new Date(dt).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
      : '';

    const container = document.getElementById('links-list');
    // data-prog-link dipakai untuk optimistic update di reportStatus
    // data-opened dipakai untuk auto-scroll ke link pertama yang belum dibuka
    container.innerHTML = links.map(link => {
      const prog   = catProg.find(p => p.link_id === link.id);
      const s      = prog?.status || 'none';
      const domain = link.url.replace(/^https?:\/\//, '').split('/')[0];
      const timeStr = prog?.updated_at ? `🕐 ${fmtTime(prog.updated_at)}` : '';

      return `<div class="glass rounded-xl p-2.5 flex items-center gap-2.5 cursor-pointer active:scale-[.98] transition-all ${s !== 'none' ? (statusBg[s] || '') : 'hover:bg-white/5'}"
        data-prog-link="${link.id}" ${s !== 'none' ? 'data-opened' : ''}
        onclick="App.openLink(${link.id}, '${link.url.replace(/'/g, "\\'")}', ${catId}, '${catName.replace(/'/g, "\\'")}', '${sessionName}', '${prog?.id || ''}')">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-slate-200 font-mono truncate">${domain}</p>
          <p class="text-[10px] text-slate-500 mt-0.5" data-click-time>${timeStr}</p>
        </div>
        <span class="shrink-0 text-base leading-none" data-status-badge>${s !== 'none' ? (statusIcon[s] || '') : '⬜'}</span>
      </div>`;
    }).join('') || '<p class="text-center text-slate-500 text-sm py-10">Belum ada link di kategori ini.</p>';

    // Auto-scroll ke link pertama yang belum dibuka (setelah DOM dirender)
    setTimeout(() => {
      const firstUnopened = container.querySelector('[data-prog-link]:not([data-opened])');
      if (firstUnopened) firstUnopened.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
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
  /**
   * @param {string} sessionName - nama sesi (pagi/siang/malam)
   * @param {string} provider    - nama provider user
   * @param {string} [type]      - filter tipe: 'otomatis'|'utama'|'manual'. Jika kosong, semua tipe.
   * @returns {Promise<string>}  - teks laporan siap kirim
   */
  const generateReport = async (sessionName, provider, type = null) => {
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
    let sections = [
      { type: 'otomatis', title: 'Test Link Otomatis' },
      { type: 'utama',    title: 'Test Link Utama Manual' },
      { type: 'manual',   title: 'Test Link Manual' }
    ];
    // Filter hanya tipe yang diminta jika parameter type diberikan
    if (type) sections = sections.filter(s => s.type === type);

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

  // ── Riwayat Test Link ─────────────────────────────────────────────────────
  let _histData  = [];
  let _histSess  = '';   // filter sesi aktif

  /**
   * Render grafik bar chart sederhana dari data riwayat.
   * Setiap bar mewakili 1 entri (tanggal+sesi) dengan persentase progress.
   */
  const _renderHistChart = (data) => {
    const el = document.getElementById('hist-chart');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<p class="text-center text-slate-500 text-sm py-4">Belum ada data.</p>'; return; }

    const SESS_EMOJI = { pagi: '🌅', siang: '🌇', malam: '🌙' };
    const SESS_COLOR = { pagi: '#6366f1', siang: '#f59e0b', malam: '#8b5cf6' };

    const bars = data.slice(0, 14).map(d => { // max 14 bar
      const color = SESS_COLOR[d.session] || '#6366f1';
      const pct   = d.pct;
      const emoji = SESS_EMOJI[d.session] || '🔵';
      const shortDate = d.date.slice(5); // MM-DD
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:28px">
        <span style="font-size:.55rem;color:#94a3b8;font-weight:700">${pct}%</span>
        <div style="width:100%;background:rgba(255,255,255,.07);border-radius:4px;height:80px;display:flex;align-items:flex-end">
          <div style="width:100%;height:${Math.max(4, pct)}%;background:${color};border-radius:4px 4px 0 0;transition:height .3s"></div>
        </div>
        <span style="font-size:.6rem;color:#64748b">${emoji}</span>
        <span style="font-size:.55rem;color:#475569;text-align:center;line-height:1.2">${shortDate}</span>
      </div>`;
    }).join('');

    el.innerHTML = `<div style="display:flex;gap:6px;align-items:flex-end;height:130px;overflow-x:auto">${bars}</div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:.75rem;font-size:.65rem;color:#64748b">
        <span>🌅 Pagi</span><span>🌇 Sore</span><span>🌙 Malam</span>
      </div>`;
  };

  /** Render daftar riwayat (cards per sesi). */
  const _renderHistList = (data) => {
    const el = document.getElementById('hist-list');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<p class="text-center text-slate-500 text-sm py-8">Belum ada riwayat.</p>'; return; }

    const SESS_LABEL = { pagi: '🌅 Pagi', siang: '🌇 Sore', malam: '🌙 Malam' };
    el.innerHTML = data.map(d => {
      const bar = `<div class="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-2">
        <div class="h-full rounded-full" style="width:${d.pct}%;background:${d.pct===100?'#10b981':'#6366f1'}"></div></div>`;
      const badges = [
        d.errors  ? `<span class="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-md px-1.5 py-0.5">❌ ${d.errors} Error</span>` : '',
        d.blocked ? `<span class="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-md px-1.5 py-0.5">🚫 ${d.blocked} Blokir</span>` : ''
      ].filter(Boolean).join('');
      return `<div class="glass rounded-2xl p-4 mb-2">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-slate-300">${d.date}</p>
            <p class="text-[11px] text-slate-500 mt-0.5">${SESS_LABEL[d.session] || d.session}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-black ${d.pct===100?'text-emerald-400':'text-indigo-400'}">${d.pct}%</p>
            <p class="text-[10px] text-slate-500">${d.done}/${d.total} link</p>
          </div>
        </div>
        ${bar}
        ${badges ? `<div class="flex gap-1.5 mt-2">${badges}</div>` : ''}
      </div>`;
    }).join('');
  };

  /**
   * Render halaman riwayat test link (dipanggil saat masuk screen-history).
   */
  const renderHistory = async () => {
    try {
      _histData = await API.getHistory(7);
      _applyHistFilter();
    } catch (e) {
      document.getElementById('hist-list').innerHTML  = `<p class="text-center text-rose-400 text-sm py-4">${e.message}</p>`;
      document.getElementById('hist-chart').innerHTML = '';
    }
  };

  /** Terapkan filter sesi ke grafik dan daftar. */
  const _applyHistFilter = () => {
    const filtered = _histSess
      ? _histData.filter(d => d.session === _histSess)
      : _histData;
    _renderHistChart(filtered);
    _renderHistList(filtered);
  };

  return { renderDashboard, renderTestLink, renderCategories, renderLinks, generateReport, renderHistory, setHistSess: (s) => { _histSess = s; _applyHistFilter(); } };
})();
