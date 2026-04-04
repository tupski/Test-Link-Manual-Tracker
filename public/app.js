/* ================================================
 * app.js — Link Tester v2
 * Frontend: Vanilla JS ES6+ · async/await · fetch API
 * ================================================ */
'use strict';

// ── CONFIG ───────────────────────────────────────────────────────────
/** Jadwal sesi harian · normalDuration & maxDuration dalam menit */
const SESSIONS = [
  { id:'pagi',  label:'Pagi',  time:'10:00 WIB', hour:10, minute:0, normalDuration:120, maxDuration:240 },
  { id:'siang', label:'Siang', time:'15:00 WIB', hour:15, minute:0, normalDuration:120, maxDuration:240 },
  { id:'malam', label:'Malam', time:'19:00 WIB', hour:19, minute:0, normalDuration:120, maxDuration:240 }
];

// ── API ───────────────────────────────────────────────────────────────
const Api = {
  BASE: '/api',

  /** Fetch helper: parse JSON, lempar Error jika respons tidak OK */
  async _f(url, opts = {}) {
    const res  = await fetch(url, { headers:{'Content-Type':'application/json'}, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  /** GET /api/categories → [{ id, name, sort_order, link_count, links_updated_at }] */
  getCategories() { return this._f(`${this.BASE}/categories`); },

  /** PATCH /api/categories/:id  body: { name } */
  renameCategory(id, name) {
    return this._f(`${this.BASE}/categories/${id}`, { method:'PATCH', body:JSON.stringify({ name }) });
  },

  /** GET /api/categories/:id/links → string[] */
  getLinks(catId) { return this._f(`${this.BASE}/categories/${catId}/links`); },

  /** PUT /api/categories/:id/links  body: { links: string[] } */
  saveLinks(catId, links) {
    return this._f(`${this.BASE}/categories/${catId}/links`, { method:'PUT', body:JSON.stringify({ links }) });
  },

  /** GET /api/progress?date=  → { pagi:{catId:[url]}, siang:{...}, malam:{...} } */
  getProgress(date) { return this._f(`${this.BASE}/progress?date=${date}`); },

  /** POST /api/progress  body: { date, session, category_id, url } */
  markOpened(date, session, catId, url) {
    return this._f(`${this.BASE}/progress`, { method:'POST',
      body: JSON.stringify({ date, session, category_id:catId, url }) });
  },

  /** POST /api/progress/mark-all  body: { date, session, category_id } */
  markAllOpened(date, session, catId) {
    return this._f(`${this.BASE}/progress/mark-all`, { method:'POST',
      body: JSON.stringify({ date, session, category_id:catId }) });
  },

  /** DELETE /api/progress  body: { date, session, category_id } */
  resetProgress(date, session, catId) {
    return this._f(`${this.BASE}/progress`, { method:'DELETE',
      body: JSON.stringify({ date, session, category_id:catId }) });
  }
};

// ── DATETIME ──────────────────────────────────────────────────────────
const DateTime = {
  /** "2026-04-04" */
  getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  /** "Sabtu, 4 April 2026" */
  getTodayFormatted() {
    const d = new Date();
    const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  },

  /** Format ISO string → "4 Apr 2026" (lokal) · null → "Belum pernah diisi" */
  formatUpdatedAt(iso) {
    if (!iso) return 'Belum pernah diisi';
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  },

  isSessionReady(s) {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes() >= s.hour * 60 + s.minute;
  },

  getCurrentSession() {
    return [...SESSIONS].reverse().find(s => this.isSessionReady(s)) || null;
  },

  /** Format menit → "1j 23m" atau "45m" */
  fmtMin(min) {
    const h = Math.floor(min / 60), m = Math.floor(min % 60);
    if (h > 0 && m > 0) return `${h}j ${m}m`;
    return h > 0 ? `${h}j` : `${m}m`;
  },

  /**
   * Hitung info waktu tersisa sesi.
   * @returns {{ text:string|null, color:string|null }}
   */
  getTimeInfo(s) {
    const n      = new Date();
    const nowMin = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
    const start  = s.hour * 60 + s.minute;
    const norm   = start + s.normalDuration;
    const max    = start + s.maxDuration;
    if (nowMin < start) return { text: null, color: null };
    if (nowMin < norm)  return { text: `⏱ Sisa ${this.fmtMin(norm - nowMin)}`,              color: '#185FA5' };
    if (nowMin < max)   return { text: `⚠️ Overtime · Sisa ${this.fmtMin(max - nowMin)}`,    color: '#c07000' };
    return               { text: '⏰ Waktu habis', color: '#c0392b' };
  }
};

// ── STATE ─────────────────────────────────────────────────────────────
const state = {
  categories:    [],    // [{ id, name, sort_order, link_count, links_updated_at }]
  todayProgress: {},    // { pagi:{catId:[url]}, siang:{...}, malam:{...} }
  currentSession:  null,
  currentCategory: null,
  currentLinks:    [],
  pendingUrl:      null,
  renamingCatId:   null,
  navHistory:      [],
  _toastTimer:     null,
  _timerInterval:  null
};


// ── APP ───────────────────────────────────────────────────────────────
const App = {

  async init() {
    document.getElementById('edit-textarea')
      .addEventListener('input', () => this._updateEditCounter());
    await this.renderHome();
  },

  showLoading() { document.getElementById('loading').classList.remove('hidden'); },
  hideLoading() { document.getElementById('loading').classList.add('hidden'); },

  // ── Navigasi ────────────────────────────────────────────────────────
  goTo(screenId) {
    const cur = document.querySelector('.screen.active');
    if (cur && cur.id !== screenId) { state.navHistory.push(cur.id); cur.classList.remove('active'); }
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
  },

  async goBack() {
    if (!state.navHistory.length) return;
    const prevId = state.navHistory.pop();
    document.querySelector('.screen.active')?.classList.remove('active');
    document.getElementById(prevId).classList.add('active');
    window.scrollTo(0, 0);
    if (prevId === 'screen-home')     await this.renderHome();
    if (prevId === 'screen-category') this.renderCategoryScreen();
    if (prevId === 'screen-manage')   this.renderManageScreen();
  },

  async goManage() { this.renderManageScreen(); this.goTo('screen-manage'); },

  // ── Screen 1: BERANDA ───────────────────────────────────────────────
  async renderHome() {
    document.getElementById('home-date').textContent = DateTime.getTodayFormatted();
    this.showLoading();
    try {
      const [cats, prog] = await Promise.all([
        Api.getCategories(),
        Api.getProgress(DateTime.getToday())
      ]);
      state.categories    = cats;
      state.todayProgress = prog;
    } catch (e) {
      this.showToast('❌ Gagal memuat: ' + e.message);
    } finally { this.hideLoading(); }
    this._renderBanner();
    this._renderSessionCards();
    this._startTimer();
  },

  _renderBanner() {
    const banner = document.getElementById('session-banner');
    const cur    = DateTime.getCurrentSession();
    if (!cur) { banner.classList.add('hidden'); return; }
    banner.textContent = `🔔 Sesi ${cur.label} (${cur.time}) sedang aktif!`;
    banner.classList.remove('hidden');
  },

  _renderSessionCards() {
    document.getElementById('session-cards').innerHTML =
      SESSIONS.map(s => this._sessionCardHTML(s)).join('');
  },

  _sessionCardHTML(s) {
    let total = 0, opened = 0;
    const sessProg = state.todayProgress[s.id] || {};
    state.categories.forEach(cat => {
      total  += cat.link_count;
      opened += (sessProg[cat.id] || []).length;
    });
    const pct    = total > 0 ? Math.round(opened / total * 100) : 0;
    const done   = total > 0 && opened >= total;
    const active = DateTime.isSessionReady(s);
    let badgeClass, badgeLabel;
    if (done)        { badgeClass='badge-done';    badgeLabel='Selesai';  }
    else if (active) { badgeClass='badge-active';  badgeLabel='Aktif';    }
    else             { badgeClass='badge-waiting';  badgeLabel='Menunggu'; }
    const timeInfo = DateTime.getTimeInfo(s);
    const timeHTML = timeInfo.text
      ? `<div class="session-time-remaining" style="color:${timeInfo.color}">${timeInfo.text}</div>` : '';
    return `
      <div class="session-card" onclick="App.openSession('${s.id}')">
        <div class="session-card-header">
          <div><div class="session-name">${s.label}</div><div class="session-time">${s.time}</div></div>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="progress-track" style="margin-top:12px;">
          <div class="progress-fill" style="width:${pct}%;background:${done?'#639922':'#378ADD'};"></div>
        </div>
        <div class="progress-label-row" style="margin-top:6px;font-size:13px;color:#888;">
          <span>${opened} dari ${total} link dibuka</span><span>${pct}%</span>
        </div>
        ${timeHTML}
      </div>`;
  },

  /** Update tampilan waktu tersisa tiap 30 detik tanpa re-fetch API */
  _startTimer() {
    clearInterval(state._timerInterval);
    state._timerInterval = setInterval(() => {
      document.querySelectorAll('.session-card').forEach((card, i) => {
        const info = DateTime.getTimeInfo(SESSIONS[i]);
        let el = card.querySelector('.session-time-remaining');
        if (!info.text) { if (el) el.remove(); return; }
        if (!el) { el = document.createElement('div'); el.className = 'session-time-remaining'; card.appendChild(el); }
        el.textContent = info.text; el.style.color = info.color;
      });
    }, 30_000);
  },

  openSession(sessionId) {
    state.currentSession = SESSIONS.find(s => s.id === sessionId);
    this.renderCategoryScreen();
    this.goTo('screen-category');
  },


  // ── Screen 2: PILIH KATEGORI ────────────────────────────────────────
  renderCategoryScreen() {
    const s        = state.currentSession;
    const sessProg = state.todayProgress[s.id] || {};
    document.getElementById('cat-session-name').textContent = `Sesi ${s.label}`;
    document.getElementById('cat-session-time').textContent = s.time;

    let total = 0, opened = 0;
    state.categories.forEach(cat => {
      total  += cat.link_count;
      opened += (sessProg[cat.id] || []).length;
    });
    const pct  = total > 0 ? Math.round(opened / total * 100) : 0;
    const done = total > 0 && opened >= total;
    document.getElementById('cat-overall-text').textContent = `${opened}/${total}`;
    const bar = document.getElementById('cat-overall-bar');
    bar.style.width = `${pct}%`; bar.style.background = done ? '#639922' : '#378ADD';

    document.getElementById('category-list').innerHTML =
      state.categories.map(cat => this._categoryItemHTML(cat, sessProg)).join('');
  },

  _categoryItemHTML(cat, sessProg) {
    const opened = (sessProg[cat.id] || []).length;
    const total  = cat.link_count;
    let cls = 'list-item-waiting';
    if (total > 0 && opened >= total) cls = 'list-item-done';
    else if (opened > 0)              cls = 'list-item-active';
    const upd = cat.links_updated_at ? `· Diperbarui ${DateTime.formatUpdatedAt(cat.links_updated_at)}` : '';
    return `
      <div class="list-item ${cls}" onclick="App.openCategory(${cat.id})">
        <div class="list-item-info">
          <div class="list-item-name">${cat.name}</div>
          <div class="list-item-sub">${opened}/${total} dibuka ${upd}</div>
        </div>
        <span class="list-item-arrow">›</span>
      </div>`;
  },

  async openCategory(catId) {
    state.currentCategory = state.categories.find(c => c.id === catId);
    this.showLoading();
    try {
      state.currentLinks = await Api.getLinks(catId);
    } catch (e) {
      this.showToast('❌ ' + e.message);
    } finally { this.hideLoading(); }
    this.renderLinksScreen();
    this.goTo('screen-links');
  },

  // ── Screen 3: DAFTAR LINK ───────────────────────────────────────────
  renderLinksScreen() {
    const cat      = state.currentCategory;
    const s        = state.currentSession;
    const sessProg = state.todayProgress[s.id] || {};
    const prog     = sessProg[cat.id] || [];
    const links    = state.currentLinks;

    document.getElementById('links-cat-name').textContent       = cat.name;
    document.getElementById('links-progress-text').textContent  = `${prog.length} dari ${links.length} link dibuka`;

    const pct  = links.length > 0 ? Math.round(prog.length / links.length * 100) : 0;
    const done = links.length > 0 && prog.length >= links.length;
    const bar  = document.getElementById('links-progress-bar');
    bar.style.width = `${pct}%`; bar.style.background = done ? '#639922' : '#378ADD';

    // Tampilkan tanggal terakhir link diperbarui
    const updEl = document.getElementById('links-last-updated');
    updEl.innerHTML = cat.links_updated_at
      ? `🕐 Link terakhir diperbarui: <span>${DateTime.formatUpdatedAt(cat.links_updated_at)}</span>`
      : `<span style="color:#ccc">Link belum pernah diisi</span>`;

    const listEl = document.getElementById('links-list');
    if (!links.length) {
      listEl.innerHTML = '<div class="empty-state">📭 Belum ada link.<br>Tambahkan di menu ⚙️ Kelola Link.</div>';
      return;
    }
    listEl.innerHTML = links.map(url => this._linkItemHTML(url, prog)).join('');
  },

  _linkItemHTML(url, prog) {
    const opened  = prog.includes(url);
    const safeUrl = encodeURIComponent(url);
    const short   = url.length > 42 ? url.slice(0, 39) + '…' : url;
    const action  = opened ? '' : `onclick="App.openLink(decodeURIComponent('${safeUrl}'))"`;
    return `
      <div class="link-item${opened ? ' link-item-opened' : ''}">
        <div class="link-checkbox${opened ? ' checked' : ''}">${opened ? '✓' : ''}</div>
        <div class="link-url${opened ? ' strikethrough' : ''}" title="${url}">${short}</div>
        <button class="btn btn-open ${opened ? 'btn-opened' : 'btn-primary'}" ${opened ? 'disabled' : action}>
          ${opened ? 'Dibuka' : 'Buka'}
        </button>
      </div>`;
  },

  openLink(url) {
    state.pendingUrl = url;
    document.getElementById('modal-url').textContent = url;
    document.getElementById('modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal').classList.add('hidden');
    state.pendingUrl = null;
  },

  handleModalClick(e) { if (e.target === document.getElementById('modal')) this.closeModal(); },

  async confirmOpen() {
    const url = state.pendingUrl;
    if (!url) return;
    window.open(url, '_blank');
    const today = DateTime.getToday();
    const sid   = state.currentSession.id;
    const catId = state.currentCategory.id;
    try {
      await Api.markOpened(today, sid, catId, url);
      // Update cache lokal
      if (!state.todayProgress[sid])         state.todayProgress[sid] = {};
      if (!state.todayProgress[sid][catId])  state.todayProgress[sid][catId] = [];
      if (!state.todayProgress[sid][catId].includes(url)) state.todayProgress[sid][catId].push(url);
    } catch (e) { this.showToast('❌ ' + e.message); }
    this.closeModal();
    this.renderLinksScreen();
  },

  async markAllDone() {
    const today = DateTime.getToday();
    const sid   = state.currentSession.id;
    const catId = state.currentCategory.id;
    try {
      await Api.markAllOpened(today, sid, catId);
      if (!state.todayProgress[sid])       state.todayProgress[sid] = {};
      state.todayProgress[sid][catId] = [...state.currentLinks];
    } catch (e) { this.showToast('❌ ' + e.message); return; }
    this.renderLinksScreen();
    this.showToast('✓ Semua link ditandai selesai!');
  },

  async resetCategory() {
    if (!confirm(`Reset progress "${state.currentCategory.name}" di sesi ini?`)) return;
    const today = DateTime.getToday();
    const sid   = state.currentSession.id;
    const catId = state.currentCategory.id;
    try {
      await Api.resetProgress(today, sid, catId);
      if (state.todayProgress[sid]) state.todayProgress[sid][catId] = [];
    } catch (e) { this.showToast('❌ ' + e.message); return; }
    this.renderLinksScreen();
    this.showToast('↺ Progress kategori direset.');
  },


  // ── Screen 4: KELOLA LINK ───────────────────────────────────────────
  renderManageScreen() {
    document.getElementById('manage-list').innerHTML =
      state.categories.map(cat => {
        const upd = cat.links_updated_at
          ? `· Diperbarui ${DateTime.formatUpdatedAt(cat.links_updated_at)}` : '';
        return `
          <div class="list-item" onclick="App.openEditCategory(${cat.id})"
               style="gap:8px;">
            <div class="list-item-info">
              <div class="list-item-name">${cat.name}</div>
              <div class="list-item-sub">${cat.link_count} link ${upd}</div>
            </div>
            <button class="btn-edit-name" title="Ganti nama"
                    onclick="event.stopPropagation(); App.openRenameModal(${cat.id}, '${cat.name.replace(/'/g,"\\'")}')">
              ✏️
            </button>
            <span class="list-item-arrow">›</span>
          </div>`;
      }).join('');
  },

  // ── Screen 5: EDIT LINK ─────────────────────────────────────────────
  async openEditCategory(catId) {
    state.currentCategory = state.categories.find(c => c.id === catId);
    document.getElementById('edit-title').textContent = `Edit Link — ${state.currentCategory.name}`;
    this.showLoading();
    try {
      const links = await Api.getLinks(catId);
      document.getElementById('edit-textarea').value = links.join('\n');
    } catch (e) {
      this.showToast('❌ ' + e.message);
    } finally { this.hideLoading(); }
    this._updateEditCounter();
    this.goTo('screen-edit');
  },

  _updateEditCounter() {
    const lines   = document.getElementById('edit-textarea').value.split('\n');
    const nonEmpty = lines.filter(l => l.trim() !== '');
    const autoAdd  = nonEmpty.filter(l =>
      !l.trim().startsWith('http://') && !l.trim().startsWith('https://')
    ).length;
    const ctr = document.getElementById('edit-counter');
    if (autoAdd > 0) {
      ctr.textContent = `${nonEmpty.length} link · ${autoAdd} domain akan otomatis ditambah https://`;
      ctr.style.color = '#b07d00';
    } else {
      ctr.textContent = `${nonEmpty.length} link valid`;
      ctr.style.color = '#185FA5';
    }
  },

  async saveLinks() {
    const catId = state.currentCategory.id;
    const lines = document.getElementById('edit-textarea').value.split('\n');
    const links = lines.map(l => l.trim()).filter(Boolean);
    this.showLoading();
    try {
      const result = await Api.saveLinks(catId, links);
      // Perbarui cache lokal
      const cat = state.categories.find(c => c.id === catId);
      if (cat) { cat.link_count = result.count; cat.links_updated_at = result.updated_at; }
      this.showToast(`✅ Tersimpan! ${result.count} link`);
      this.renderManageScreen();
      this.goBack();
    } catch (e) {
      this.showToast('❌ ' + e.message);
    } finally { this.hideLoading(); }
  },

  // ── Modal Rename Kategori ────────────────────────────────────────────
  openRenameModal(catId, currentName) {
    state.renamingCatId = catId;
    const input = document.getElementById('rename-input');
    input.value = currentName;
    document.getElementById('modal-rename').classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
  },

  closeRenameModal() {
    document.getElementById('modal-rename').classList.add('hidden');
    state.renamingCatId = null;
  },

  handleRenameClick(e) {
    if (e.target === document.getElementById('modal-rename')) this.closeRenameModal();
  },

  async confirmRename() {
    const newName = document.getElementById('rename-input').value.trim();
    if (!newName) { this.showToast('⚠️ Nama tidak boleh kosong.'); return; }
    const catId = state.renamingCatId;
    this.showLoading();
    try {
      await Api.renameCategory(catId, newName);
      // Perbarui cache lokal
      const cat = state.categories.find(c => c.id === catId);
      if (cat) cat.name = newName;
      this.closeRenameModal();
      this.renderManageScreen();
      this.showToast(`✅ Nama diubah ke "${newName}"`);
    } catch (e) {
      this.showToast('❌ ' + e.message);
    } finally { this.hideLoading(); }
  },

  // ── Toast ────────────────────────────────────────────────────────────
  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state._toastTimer);
    state._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

}; // ← akhir App

// ── BOOT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
