/**
 * public/js/admin.js
 * Semua logika screen admin: kategori, link, sesi, notifikasi, users.
 */

const Admin = (() => {

  // Label dan warna per tipe kategori
  const TYPE_BADGES = {
    otomatis: { label:'Otomatis', cls:'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    utama:    { label:'Utama',    cls:'bg-amber-500/20 text-amber-300 border-amber-500/30'   },
    manual:   { label:'Manual',   cls:'bg-slate-600/40 text-slate-300 border-slate-500/30'   }
  };

  /** Render daftar kategori di admin (dengan badge tipe dan tombol ganti tipe) */
  const renderCategories = async () => {
    const cats = await API.getCategories();
    document.getElementById('admin-cat-list').innerHTML = cats.map(cat => {
      const badge  = TYPE_BADGES[cat.type] || TYPE_BADGES.manual;
      const types  = ['otomatis', 'utama', 'manual'];
      const nextT  = types[(types.indexOf(cat.type) + 1) % types.length];
      return `<div class="glass rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <p class="font-semibold text-sm truncate flex-1">${cat.name}</p>
          <button onclick="App.adminCycleType(${cat.id}, '${nextT}')"
            class="px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badge.cls} active:scale-95 shrink-0">${badge.label}</button>
        </div>
        <p class="text-xs text-slate-500 mb-3">${cat.link_count} link · ${cat.links_updated_at ? UI.formatDate(cat.links_updated_at) : '-'}</p>
        <div class="flex gap-2">
          <button onclick="App.adminEditLinks(${cat.id}, '${cat.name.replace(/'/g,"\\'")}', \`${cat.id}\`)"
            class="flex-1 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold active:scale-95">🔗 Link</button>
          <button onclick="App.adminRenameCategory(${cat.id}, '${cat.name.replace(/'/g,"\\'")}', this)"
            class="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95">✏️</button>
          <button onclick="App.adminDeleteCategory(${cat.id}, '${cat.name.replace(/'/g,"\\'")}', this)"
            class="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold active:scale-95">🗑</button>
        </div>
      </div>`;
    }).join('') || '<p class="text-center text-slate-500 text-sm py-8">Belum ada kategori.</p>';
  };

  /** Render form edit link untuk satu kategori */
  const renderLinkEdit = async (catId) => {
    const links = await API.getLinks(catId);
    const ta    = document.getElementById('admin-links-textarea');
    ta.value    = links.map(l => l.url).join('\n');
    updateLinkCounter();
    ta.oninput  = updateLinkCounter;
  };

  const updateLinkCounter = () => {
    const lines = (document.getElementById('admin-links-textarea').value || '').split('\n').filter(l => l.trim());
    document.getElementById('admin-links-counter').textContent = `${lines.length} link`;
  };

  /** Render konfigurasi sesi */
  const renderSessions = async () => {
    const sessions = await API.getSessions();
    document.getElementById('admin-sessions-list').innerHTML = sessions.map(s => `
      <div class="glass rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold capitalize text-base">${s.session_name}</h3>
          <span class="text-xs text-slate-400 font-semibold">ID: ${s.id}</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Jam Mulai</label>
            <div class="flex gap-2">
              <input type="number" min="0" max="23" value="${s.start_hour}" id="sess-h-${s.id}"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"/>
              <input type="number" min="0" max="59" value="${s.start_minute}" id="sess-m-${s.id}"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"/>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 mb-1 block">Normal / Max (jam)</label>
            <div class="flex gap-2">
              <input type="number" min="1" max="12" value="${s.normal_hours}" id="sess-n-${s.id}"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"/>
              <input type="number" min="1" max="24" value="${s.max_hours}" id="sess-x-${s.id}"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"/>
            </div>
          </div>
        </div>
        <button onclick="App.adminSaveSession(${s.id})"
          class="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm active:scale-95 transition-all">
          Simpan Jadwal
        </button>
      </div>`).join('');
  };

  /** Render daftar notifikasi (admin) */
  const renderNotifications = async () => {
    const notifs = await API.getAllNotifications();
    document.getElementById('admin-notif-list').innerHTML = notifs.map(n => `
      <div class="glass rounded-xl p-4">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex-1">
            <p class="font-semibold text-sm">${n.title}</p>
            ${n.message ? `<p class="text-xs text-slate-400 mt-0.5">${n.message}</p>` : ''}
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input type="checkbox" ${n.is_active ? 'checked' : ''} class="sr-only peer" onchange="App.adminToggleNotif(${n.id}, this.checked)">
            <div class="w-9 h-5 bg-slate-700 peer-checked:bg-indigo-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
          </label>
        </div>
        <button onclick="App.adminDeleteNotif(${n.id}, this)"
          class="text-xs text-rose-400 font-semibold active:scale-95">🗑 Hapus</button>
      </div>`).join('') || '<p class="text-center text-slate-500 text-sm py-8">Belum ada notifikasi.</p>';
  };

  /** Render daftar user */
  const renderUsers = async () => {
    const users = await API.getUsers();
    document.getElementById('users-count').textContent = `${users.length} user`;
    document.getElementById('admin-users-list').innerHTML = users.map(u => `
      <div class="glass rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${u.role==='admin'?'from-rose-500 to-pink-600':'from-indigo-500 to-purple-600'} flex items-center justify-center text-sm font-bold shrink-0">
          ${u.username.charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">${u.username} ${u.role==='admin'?'<span class="text-xs text-rose-400 font-bold">ADMIN</span>':''}</p>
          <p class="text-xs text-slate-400">Terakhir: ${u.last_seen ? UI.formatDate(u.last_seen) : '-'}</p>
        </div>
        ${u.role !== 'admin' ? `<button onclick="App.adminDeleteUser('${u.id}', '${u.username}', this)"
          class="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold active:scale-95">Hapus</button>` : ''}
      </div>`).join('');
  };

  /** Render daftar provider internet (admin) */
  const renderProviders = async () => {
    const providers = await API.getProviders();
    document.getElementById('admin-providers-list').innerHTML = providers.map(p => `
      <div class="glass rounded-xl p-4 flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm">${p.name}</p>
        </div>
        <button onclick="App.adminDeleteProvider(${p.id}, '${p.name}')"
          class="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold active:scale-95">🗑 Hapus</button>
      </div>`).join('') || '<p class="text-center text-slate-500 text-sm py-8">Belum ada provider.</p>';
  };

  return { renderCategories, renderLinkEdit, updateLinkCounter, renderSessions, renderNotifications, renderUsers, renderProviders };
})();
