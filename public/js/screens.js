/**
 * public/js/screens.js
 * Render semua screen: dashboard, kategori, links — logika user.
 */

const Screens = (() => {

  /** Render kartu sesi di dashboard */
  const renderDashboard = async () => {
    const sessions  = await API.getSessions();
    const today     = UI.todayWIB();
    const progress  = await API.getProgress(today);
    const cats      = await API.getCategories();
    const notifs    = await API.getNotifications();
    const container = document.getElementById('session-cards');

    // Notifikasi
    if (notifs.length) {
      document.getElementById('notif-banner').classList.remove('hidden');
      document.getElementById('notif-content').innerHTML = notifs.map(n =>
        `<p class="font-semibold">${n.title}</p>${n.message ? `<p class="text-slate-400 text-xs mt-0.5">${n.message}</p>` : ''}`
      ).join('<hr class="border-indigo-500/20 my-2"/>');
    }

    // Status badge helper
    const badgeFor = (timer) => {
      const cls = { active:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', overtime:'bg-amber-500/20 text-amber-400 border-amber-500/30', expired:'bg-slate-700 text-slate-500 border-slate-600', waiting:'bg-slate-700 text-slate-400 border-slate-600' };
      return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cls[timer.status] || cls.waiting}">${timer.label}</span>`;
    };

    container.innerHTML = sessions.map(s => {
      const timer       = UI.sessionTimer(s.start_hour, s.start_minute, s.normal_hours, s.max_hours);
      const sessProg    = progress.filter(p => p.session_name === s.session_name);
      const totalLinks  = cats.reduce((a, c) => a + Number(c.link_count), 0);
      const doneLinks   = sessProg.length;
      const pct         = totalLinks ? Math.round(doneLinks / totalLinks * 100) : 0;
      const sessionName = s.session_name.charAt(0).toUpperCase() + s.session_name.slice(1);
      const startLabel  = UI.formatTime(s.start_hour, s.start_minute);

      return `<div class="glass rounded-2xl p-5 active:scale-[.98] transition-all cursor-pointer" onclick="App.openSession('${s.session_name}')">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-bold text-base">${sessionName}</h3>
            <p class="text-slate-400 text-xs mt-0.5">${startLabel} WIB</p>
          </div>
          ${badgeFor(timer)}
        </div>
        <div class="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>${doneLinks} / ${totalLinks} link</span><span>${pct}%</span>
        </div>
        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full progress-bar" style="width:${pct}%"></div>
        </div>
      </div>`;
    }).join('');
  };

  /** Render daftar kategori untuk satu sesi */
  const renderCategories = async (sessionName) => {
    const today    = UI.todayWIB();
    const cats     = await API.getCategories();
    const progress = await API.getProgress(today, sessionName);
    const sessions = await API.getSessions();
    const sess     = sessions.find(s => s.session_name === sessionName) || {};

    // Update header
    document.getElementById('cat-session-label').textContent = 'Sesi';
    document.getElementById('cat-session-title').textContent = sessionName.charAt(0).toUpperCase() + sessionName.slice(1);
    const timer = UI.sessionTimer(sess.start_hour, sess.start_minute, sess.normal_hours, sess.max_hours);
    const timerEl = document.getElementById('cat-timer');
    const colors  = { active:'bg-emerald-500/10 text-emerald-400', overtime:'bg-amber-500/10 text-amber-400', expired:'bg-slate-800 text-slate-500', waiting:'bg-slate-800 text-slate-400' };
    timerEl.className = `text-xs font-semibold px-3 py-1.5 rounded-xl ${colors[timer.status] || colors.waiting}`;
    timerEl.textContent = timer.label;

    // Progress keseluruhan sesi
    const totalLinks  = cats.reduce((a, c) => a + Number(c.link_count), 0);
    const doneLinks   = progress.length;
    const overallPct  = totalLinks ? Math.round(doneLinks / totalLinks * 100) : 0;
    document.getElementById('cat-progress-text').textContent = `${doneLinks}/${totalLinks} (${overallPct}%)`;
    document.getElementById('cat-progress-bar').style.width  = overallPct + '%';

    // Render list kategori
    const container = document.getElementById('category-list');
    container.innerHTML = cats.map(cat => {
      const catProg = progress.filter(p => p.category_id === cat.id);
      const total   = Number(cat.link_count);
      const done    = catProg.length;
      const pct     = total ? Math.round(done / total * 100) : 0;
      const isDone  = total > 0 && done >= total;
      const updated = cat.links_updated_at ? UI.formatDate(cat.links_updated_at) : '-';

      return `<div class="glass rounded-2xl p-4 active:scale-[.98] transition-all cursor-pointer ${isDone ? 'border-emerald-500/20' : ''}" onclick="App.openCategory(${cat.id}, '${cat.name.replace(/'/g,"\\'")}')">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-sm truncate flex-1">${cat.name}</h3>
          ${isDone ? '<span class="text-emerald-400 text-xs font-bold ml-2 shrink-0">✓ Selesai</span>' : `<span class="text-xs text-slate-400">${done}/${total}</span>`}
        </div>
        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div class="h-full ${isDone ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} rounded-full progress-bar" style="width:${pct}%"></div>
        </div>
        <p class="text-[10px] text-slate-500">🕐 Diperbarui: ${updated}</p>
      </div>`;
    }).join('');
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

  return { renderDashboard, renderCategories, renderLinks };
})();
