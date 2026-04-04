/**
 * public/js/main.js
 * App controller utama — navigasi, state, semua action handler.
 */

const App = (() => {
  // ── State ─────────────────────────────────────────────────
  let state = {
    user:          null,
    currentSession: null,   // 'pagi' | 'siang' | 'malam'
    currentCatId:  null,
    currentCatName: null,
    pendingLinkId: null,    // link yang baru dibuka, menunggu status report
    pendingProgId: null,    // progress ID yang perlu diupdate statusnya
    pendingCatId:  null,
    screenHistory: [],
    adminEditCatId: null
  };

  // ── Screen Navigation ─────────────────────────────────────
  const showScreen = (id, pushHistory = true) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    if (pushHistory && state.screenHistory.slice(-1)[0] !== id)
      state.screenHistory.push(id);
    // Simpan screen aktif ke localStorage (kecuali login)
    if (id !== 'screen-login') {
      localStorage.setItem('lt_screen',   id);
      localStorage.setItem('lt_session',  state.currentSession  || '');
      localStorage.setItem('lt_cat_id',   state.currentCatId    || '');
      localStorage.setItem('lt_cat_name', state.currentCatName  || '');
    }
    // Scroll to top
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (state.screenHistory.length > 1) {
      state.screenHistory.pop();
      showScreen(state.screenHistory[state.screenHistory.length - 1], false);
    } else {
      showScreen('screen-dashboard', false);
    }
  };

  // ── Auth ──────────────────────────────────────────────────
  /**
   * Toggle form login admin — dipanggil oleh tombol di bawah halaman login.
   */
  const toggleAdminLogin = () => {
    const section = document.getElementById('login-admin-section');
    const btn     = document.getElementById('btn-admin-toggle');
    const isHidden = section.classList.contains('hidden');
    section.classList.toggle('hidden', !isHidden);
    if (isHidden) {
      // Tampilkan form admin
      document.getElementById('login-username').value = 'admin';
      if (btn) { btn.textContent = '✕ Tutup login admin'; btn.classList.add('text-indigo-400','border-indigo-500/50'); }
    } else {
      // Sembunyikan form admin
      document.getElementById('login-username').value = '';
      if (btn) { btn.textContent = '⚙️ Masuk sebagai Admin'; btn.classList.remove('text-indigo-400','border-indigo-500/50'); }
    }
  };

  const login = async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const provider = document.getElementById('login-provider')?.value || '';
    if (!username) return UI.toast('Username wajib diisi!', 'error');
    if (!provider) return UI.toast('Pilih provider internet terlebih dahulu!', 'error');
    UI.loading(true);
    try {
      const res = await API.login(username, password || undefined, provider);
      localStorage.setItem('lt_token', res.token);
      state.user = res.user;
      afterLogin(false);
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally { UI.loading(false); }
  };

  const logout = async () => {
    const ok = await UI.confirm('Keluar?', 'Yakin ingin keluar dari akun ini?', 'Keluar', 'bg-indigo-600');
    if (!ok) return;
    // Bersihkan semua data sesi dari localStorage
    ['lt_token','lt_screen','lt_session','lt_cat_id','lt_cat_name'].forEach(k => localStorage.removeItem(k));
    state = { user: null, currentSession: null, currentCatId: null, currentCatName: null, pendingLinkId: null, pendingProgId: null, pendingCatId: null, screenHistory: [], adminEditCatId: null };
    document.getElementById('bottom-nav').classList.add('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    // Reset tombol admin
    const btn = document.getElementById('btn-admin-toggle');
    if (btn) { btn.textContent = '⚙️ Masuk sebagai Admin'; btn.classList.remove('text-indigo-400','border-indigo-500/50'); }
    document.getElementById('login-admin-section').classList.add('hidden');
    state.screenHistory = ['screen-login'];
    showScreen('screen-login', false);
  };

  // ── Weather Animation ─────────────────────────────────────
  /**
   * Tentukan tema cuaca + salam berdasarkan jam WIB.
   * @param {number} h - jam (0-23)
   */
  const _getWeatherTheme = (h) => {
    if (h >= 5  && h < 7)  return { key: 'dawn',      icon: '🌅', grad: 'linear-gradient(160deg,#4c1d95,#7c3aed,#f97316)', greet: 'Selamat Pagi' };
    if (h >= 7  && h < 11) return { key: 'morning',   icon: '☀️', grad: 'linear-gradient(160deg,#1e3a5f,#2563eb,#0ea5e9)', greet: 'Selamat Pagi' };
    if (h >= 11 && h < 15) return { key: 'midday',    icon: '🌤️', grad: 'linear-gradient(160deg,#0369a1,#0ea5e9,#38bdf8)', greet: 'Selamat Siang' };
    if (h >= 15 && h < 19) return { key: 'afternoon', icon: '🌇', grad: 'linear-gradient(160deg,#7c3aed,#b45309,#f97316)', greet: 'Selamat Sore' };
    return { key: 'night', icon: '🌙', grad: 'linear-gradient(160deg,#020617,#0f172a,#1e1b4b)', greet: 'Selamat Malam' };
  };

  /** Update tampilan weather header di beranda */
  const _updateWeatherHeader = () => {
    const wibH   = new Date(Date.now() + 7 * 3600000).getUTCHours();
    const wibMin = new Date(Date.now() + 7 * 3600000).getUTCMinutes();
    const wibSec = new Date(Date.now() + 7 * 3600000).getUTCSeconds();
    const theme  = _getWeatherTheme(wibH);
    const now    = new Date(Date.now() + 7 * 3600000);

    // Gradient bg
    const overlay = document.getElementById('weather-bg-overlay');
    if (overlay) overlay.style.background = theme.grad;

    // Icon cuaca
    const iconEl = document.getElementById('weather-icon');
    if (iconEl) iconEl.textContent = theme.icon;

    // Greeting + nama user
    const grEl = document.getElementById('dash-greeting');
    if (grEl && state.user) grEl.textContent = `${theme.greet}, ${state.user.username}!`;

    // Jam berjalan
    const clockEl = document.getElementById('dash-clock');
    if (clockEl) clockEl.textContent =
      `${String(wibH).padStart(2,'0')}:${String(wibMin).padStart(2,'0')}:${String(wibSec).padStart(2,'0')}`;

    // Tanggal
    const dateEl = document.getElementById('dash-date');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' });
  };

  // ── Countdown & Notification Scheduling ───────────────────
  let _countdownInterval = null;
  let _notifScheduled    = false;

  /** Hitung sesi berikutnya berdasarkan jam WIB sekarang */
  const _getNextSession = (sessions) => {
    const wibNow   = new Date(Date.now() + 7 * 3600000);
    const wibH     = wibNow.getUTCHours();
    const wibM     = wibNow.getUTCMinutes();
    const nowMins  = wibH * 60 + wibM;

    // Urutkan sesi berdasarkan start time
    const sorted = [...sessions].sort((a, b) =>
      (a.start_hour * 60 + a.start_minute) - (b.start_hour * 60 + b.start_minute)
    );

    // Cari sesi yang belum mulai
    for (const s of sorted) {
      const startMins = s.start_hour * 60 + s.start_minute;
      if (startMins > nowMins) {
        const diffSecs = (startMins - nowMins) * 60 - wibNow.getUTCSeconds();
        return { session: s, diffSecs, tomorrow: false };
      }
    }
    // Semua sesi sudah lewat — hitung hingga sesi pertama besok
    const first     = sorted[0];
    const startMins = first.start_hour * 60 + first.start_minute;
    const diffSecs  = (1440 - nowMins + startMins) * 60 - wibNow.getUTCSeconds();
    return { session: first, diffSecs, tomorrow: true };
  };

  /** Update elemen countdown di beranda */
  const _tickCountdown = (sessions) => {
    const { session, diffSecs, tomorrow } = _getNextSession(sessions);
    const h  = Math.floor(diffSecs / 3600);
    const m  = Math.floor((diffSecs % 3600) / 60);
    const s  = diffSecs % 60;
    const lbl = document.getElementById('next-test-label');
    const cd  = document.getElementById('next-test-countdown');
    const sub = document.getElementById('next-test-sub');
    if (lbl) lbl.textContent = `Sesi ${session.session_name.charAt(0).toUpperCase() + session.session_name.slice(1)} — ${UI.formatTime(session.start_hour, session.start_minute)} WIB`;
    if (cd)  cd.textContent  = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (sub) sub.textContent = tomorrow ? 'besok' : 'hari ini';
  };

  /** Mulai interval untuk clock + countdown */
  const _startLiveClock = async () => {
    if (_countdownInterval) clearInterval(_countdownInterval);
    let sessions = [];
    try { sessions = await API.getSessions(); } catch { /* abaikan */ }
    _updateWeatherHeader();
    if (sessions.length) _tickCountdown(sessions);
    _countdownInterval = setInterval(() => {
      _updateWeatherHeader();
      if (sessions.length) _tickCountdown(sessions);
    }, 1000);
  };

  /** Minta izin notifikasi dari browser */
  const requestNotification = async () => {
    if (!('Notification' in window)) return UI.toast('Browser tidak mendukung notifikasi.', 'error');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      document.getElementById('notif-permission-wrap')?.classList.add('hidden');
      UI.toast('Notifikasi berhasil diaktifkan! 🔔', 'success');
      _scheduleNotifications();
    } else {
      UI.toast('Izin notifikasi ditolak.', 'error');
    }
  };

  /** Jadwalkan notifikasi untuk sesi hari ini */
  const _scheduleNotifications = async () => {
    if (_notifScheduled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    _notifScheduled = true;
    let sessions = [];
    try { sessions = await API.getSessions(); } catch { return; }

    sessions.forEach(s => {
      const wibNow   = new Date(Date.now() + 7 * 3600000);
      const nowSecs  = wibNow.getUTCHours() * 3600 + wibNow.getUTCMinutes() * 60 + wibNow.getUTCSeconds();
      const startSec = s.start_hour * 3600 + s.start_minute * 60;
      const normEnd  = startSec + s.normal_hours * 3600;
      const maxEnd   = startSec + s.max_hours   * 3600;
      const alerts   = [
        { at: startSec - 300, msg: `5 menit lagi Test Link sesi ${s.session_name} dimulai! 🔗` },
        { at: normEnd  - 300, msg: `5 menit lagi batas normal sesi ${s.session_name} habis! ⏰` },
        { at: maxEnd   - 300, msg: `5 menit lagi batas maksimal sesi ${s.session_name} habis! ⚠️` }
      ];
      alerts.forEach(a => {
        const delay = (a.at - nowSecs) * 1000;
        if (delay > 0) setTimeout(() => new Notification('Test Link Tracker', { body: a.msg, icon: '/icons/icon-192.png' }), delay);
      });
    });
  };

  /** Cek apakah notif perlu ditampilkan bannernya */
  const _checkNotifPermission = () => {
    const wrap = document.getElementById('notif-permission-wrap');
    if (!wrap) return;
    if (!('Notification' in window) || Notification.permission === 'granted') {
      wrap.classList.add('hidden');
      if (Notification.permission === 'granted') _scheduleNotifications();
    } else {
      wrap.classList.remove('hidden');
    }
  };

  /**
   * Dipanggil setelah login berhasil atau token valid saat init.
   * @param {boolean} restore - true jika restore dari localStorage (refresh halaman)
   */
  const afterLogin = (restore = false) => {
    const u = state.user;
    // Tampilkan tombol admin di nav jika admin
    if (u.role === 'admin') document.getElementById('nav-admin-btn').style.display = 'flex';
    else document.getElementById('nav-admin-btn').style.display = 'none';
    document.getElementById('bottom-nav').classList.remove('hidden');

    // Daftarkan service worker
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    // Mulai live clock + countdown
    _startLiveClock();
    _checkNotifPermission();

    if (restore) {
      const savedScreen  = localStorage.getItem('lt_screen')   || 'screen-dashboard';
      const savedSession = localStorage.getItem('lt_session')  || null;
      const savedCatId   = localStorage.getItem('lt_cat_id')   || null;
      const savedCatName = localStorage.getItem('lt_cat_name') || null;
      state.currentSession  = savedSession;
      state.currentCatId    = savedCatId;
      state.currentCatName  = savedCatName;
      state.screenHistory   = ['screen-dashboard'];

      if (savedScreen === 'screen-links' && savedCatId) {
        showScreen('screen-links', false);
        state.screenHistory.push('screen-categories');
        state.screenHistory.push('screen-links');
        UI.loading(true);
        Screens.renderLinks(savedCatId, savedCatName, savedSession)
          .catch(e => { UI.toast(e.message, 'error'); showScreen('screen-dashboard', false); loadDashboard(); })
          .finally(() => UI.loading(false));
      } else if (savedScreen === 'screen-categories' && savedSession) {
        state.screenHistory.push('screen-categories');
        showScreen('screen-categories', false);
        UI.loading(true);
        Screens.renderCategories(savedSession)
          .catch(e => { UI.toast(e.message, 'error'); showScreen('screen-dashboard', false); loadDashboard(); })
          .finally(() => UI.loading(false));
      } else if (savedScreen === 'screen-testlink') {
        state.screenHistory.push('screen-testlink');
        showScreen('screen-testlink', false);
        UI.loading(true);
        Screens.renderTestLink()
          .catch(() => { showScreen('screen-dashboard', false); loadDashboard(); })
          .finally(() => UI.loading(false));
      } else {
        showScreen('screen-dashboard', false);
        loadDashboard();
      }
    } else {
      state.screenHistory = ['screen-dashboard'];
      showScreen('screen-dashboard', false);
      loadDashboard();
    }
  };

  const loadDashboard = async () => {
    UI.loading(true);
    try { await Screens.renderDashboard(); }
    catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Nav helpers ───────────────────────────────────────────
  /** Navigasi ke Test Link screen (session cards) */
  const navToTestLink = async () => {
    _showScreenWithLoad('screen-testlink');
    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-nav="testlink"]')?.classList.add('active');
  };

  // ── Profile Bottom Drawer ─────────────────────────────────
  /**
   * Buka profile drawer — isi data user dan check reset_allowed.
   */
  const navToProfile = async () => {
    const u = state.user;
    if (!u) return;
    // Isi drawer info
    const avEl = document.getElementById('drawer-avatar');
    if (avEl) avEl.textContent = u.username.charAt(0).toUpperCase();
    const unEl = document.getElementById('drawer-username');
    if (unEl) unEl.textContent = u.username;
    const prEl = document.getElementById('drawer-provider');
    if (prEl) prEl.textContent = u.provider || 'Provider belum diset';
    const roEl = document.getElementById('drawer-role');
    if (roEl) roEl.textContent = u.role === 'admin' ? '⚙️ Admin' : '👤 User';
    // Tampilkan tombol reset jika allowed (atau admin)
    const resetBtn = document.getElementById('drawer-reset-btn');
    if (resetBtn) {
      const allowed = u.role === 'admin' || u.reset_allowed === true;
      resetBtn.classList.toggle('hidden', !allowed);
    }
    // Buka drawer
    document.getElementById('profile-drawer-overlay')?.classList.remove('hidden');
    document.getElementById('profile-drawer')?.classList.remove('hidden');
  };

  const closeProfileDrawer = () => {
    document.getElementById('profile-drawer-overlay')?.classList.add('hidden');
    document.getElementById('profile-drawer')?.classList.add('hidden');
  };

  /** Buka screen pengaturan dari drawer */
  const openSettings = async () => {
    closeProfileDrawer();
    const u = state.user;
    if (!u) return;
    // Isi info card settings
    const av = document.getElementById('settings-avatar');
    if (av) av.textContent = u.username.charAt(0).toUpperCase();
    const unEl = document.getElementById('settings-username-display');
    if (unEl) unEl.textContent = u.username;
    const prEl = document.getElementById('settings-provider-display');
    if (prEl) prEl.textContent = u.provider || 'Belum diset';
    const roEl = document.getElementById('settings-role-display');
    if (roEl) roEl.textContent = u.role === 'admin' ? '⚙️ Admin' : '👤 User';
    const inp = document.getElementById('settings-new-username');
    if (inp) inp.value = '';
    // Isi dropdown provider
    try {
      const providers = await API.getProviders();
      const sel = document.getElementById('settings-provider-select');
      if (sel) {
        sel.innerHTML = providers.map(p =>
          `<option value="${p.name}" ${p.name === u.provider ? 'selected' : ''} class="bg-slate-900">${p.name}</option>`
        ).join('');
      }
    } catch { /* abaikan */ }
    showScreen('screen-user-settings');
  };

  /** Hapus akun sendiri */
  const deleteAccount = async () => {
    closeProfileDrawer();
    const ok = await UI.confirm(
      '🗑️ Hapus Akun?',
      'Semua progress dan data akunmu akan dihapus secara permanen. Yakin?',
      'Hapus Akun', 'bg-rose-600'
    );
    if (!ok) return;
    // Math verification
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const jawaban = await UI.inputModal('Konfirmasi', `Jawab soal ini: ${a} + ${b} = ?`);
    if (jawaban === null || parseInt(jawaban, 10) !== a + b)
      return UI.toast('Jawaban salah. Penghapusan akun dibatalkan.', 'error');
    UI.loading(true);
    try {
      await API.deleteUser(state.user.id);
      UI.toast('Akun berhasil dihapus.', 'info');
      logout();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  /** Tampilkan detail perubahan link (semua kategori + info) */
  const showLinkChanges = async () => {
    UI.loading(true);
    try {
      const cats = await API.getCategories();
      const sorted = [...cats].sort((a, b) => new Date(b.links_updated_at||0) - new Date(a.links_updated_at||0));
      const lines = sorted.map(c =>
        `<div class="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">${c.name}</p>
            <p class="text-[10px] text-slate-500">${TYPE_META_LABEL[c.type]||c.type} · ${c.group_name||'Situs'}</p>
          </div>
          <div class="text-right shrink-0 ml-3">
            <p class="text-xs text-indigo-400 font-mono">${c.link_count} link</p>
            <p class="text-[10px] text-slate-500">${c.links_updated_at ? UI.formatDate(c.links_updated_at) : 'Belum ada'}</p>
          </div>
        </div>`
      ).join('');
      // Tampilkan di modal konfirmasi (repurpose sebagai info modal)
      await UI.confirm(
        '📊 Detail Update Link',
        `<div class="max-h-64 overflow-y-auto pr-1 -mr-1">${lines}</div>`,
        'Tutup', 'bg-indigo-600', true
      );
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // Label tipe untuk showLinkChanges
  const TYPE_META_LABEL = { otomatis: 'Otomatis', utama: 'Utama Manual', manual: 'Manual' };

  // ── Session & Category Navigation ─────────────────────────
  const openSession = async (sessionName) => {
    state.currentSession = sessionName;
    UI.loading(true);
    try {
      await Screens.renderCategories(sessionName);
      showScreen('screen-categories');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const openCategory = async (catId, catName) => {
    state.currentCatId   = catId;
    state.currentCatName = catName;
    UI.loading(true);
    try {
      await Screens.renderLinks(catId, catName, state.currentSession);
      showScreen('screen-links');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Link Actions ──────────────────────────────────────────
  const openLink = async (linkId, url, catId, catName, sessionName, progId) => {
    const today = UI.todayWIB();
    UI.loading(true);
    try {
      let prog;
      if (!progId) {
        prog = await API.markOpened({ link_id: linkId, category_id: catId, session_name: sessionName, date: today });
        progId = prog.id;
      }
      state.pendingLinkId = linkId;
      state.pendingProgId = progId;
      state.pendingCatId  = catId;
      window.open(url, '_blank');
      // Tampilkan modal status setelah jeda singkat
      setTimeout(() => document.getElementById('modal-status').style.display = 'flex', 600);
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const reportStatus = async (status) => {
    closeStatusModal();
    if (!state.pendingProgId) return;
    UI.loading(true);
    try {
      await API.updateStatus(state.pendingProgId, status);
      UI.toast(`Status: ${status === 'normal' ? '✅ Normal' : status === 'blocked' ? '🚫 Diblokir' : '❌ Error 404'}`, 'success');
      // Refresh daftar link setelah update status
      await Screens.renderLinks(state.currentCatId, state.currentCatName, state.currentSession);
      // Auto-update dashboard di background (tidak await agar tidak blok UI)
      Screens.renderDashboard().catch(() => {});
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); state.pendingProgId = null; }
  };

  const closeStatusModal = (e) => {
    if (!e || e.target === document.getElementById('modal-status'))
      document.getElementById('modal-status').style.display = 'none';
  };

  const markAllDone = async () => {
    const today = UI.todayWIB();
    UI.loading(true);
    try {
      await API.markAllOpened({ category_id: state.currentCatId, session_name: state.currentSession, date: today });
      UI.toast('Semua link ditandai selesai!', 'success');
      await Screens.renderLinks(state.currentCatId, state.currentCatName, state.currentSession);
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const resetCategory = async () => {
    const ok = await UI.confirm('Reset Progress?', 'Hapus semua progress kategori ini di sesi ini?');
    if (!ok) return;
    const today = UI.todayWIB();
    UI.loading(true);
    try {
      await API.resetProgress({ category_id: state.currentCatId, session_name: state.currentSession, date: today });
      UI.toast('Progress direset.', 'info');
      await Screens.renderLinks(state.currentCatId, state.currentCatName, state.currentSession);
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Bottom Nav ─────────────────────────────────────────────
  const navTo = (key) => {
    if (key === 'home') { showScreen('screen-dashboard'); loadDashboard(); }
  };
  const navToSession = () => {
    // Tampilkan pilihan sesi — buka dashboard lalu scroll ke sesi
    showScreen('screen-dashboard');
    loadDashboard();
  };
  const navToAdmin = () => { showScreen('screen-admin'); };

  // ── Admin Actions ──────────────────────────────────────────
  const adminAddCategory = async () => {
    const name = await UI.inputModal('Nama Kategori Baru', 'Contoh: JP1234');
    if (!name) return;
    UI.loading(true);
    try {
      await API.addCategory(name);
      UI.toast('Kategori ditambahkan!', 'success');
      await Admin.renderCategories();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminRenameCategory = async (id, currentName) => {
    const name = await UI.inputModal('Ganti Nama Kategori', 'Nama baru...', currentName);
    if (!name || name === currentName) return;
    UI.loading(true);
    try {
      await API.renameCategory(id, name);
      UI.toast('Nama diperbarui!', 'success');
      await Admin.renderCategories();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminDeleteCategory = async (id, name) => {
    const ok = await UI.confirm('Hapus Kategori?', `"${name}" dan semua linknya akan dihapus permanen.`);
    if (!ok) return;
    UI.loading(true);
    try {
      await API.deleteCategory(id);
      UI.toast('Kategori dihapus.', 'success');
      await Admin.renderCategories();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminEditLinks = async (catId, catName) => {
    state.adminEditCatId = catId;
    document.getElementById('admin-links-title').textContent = catName;
    UI.loading(true);
    try {
      await Admin.renderLinkEdit(catId);
      showScreen('screen-admin-links');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminSaveLinks = async () => {
    const ta    = document.getElementById('admin-links-textarea').value;
    const links = ta.split('\n').map(l => l.trim()).filter(Boolean);
    UI.loading(true);
    try {
      const res = await API.saveLinks(state.adminEditCatId, links);
      UI.toast(`${res.count} link disimpan!`, 'success');
      Admin.updateLinkCounter();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminSaveSession = async (id) => {
    const data = {
      start_hour:   Number(document.getElementById(`sess-h-${id}`).value),
      start_minute: Number(document.getElementById(`sess-m-${id}`).value),
      normal_hours: Number(document.getElementById(`sess-n-${id}`).value),
      max_hours:    Number(document.getElementById(`sess-x-${id}`).value)
    };
    UI.loading(true);
    try {
      await API.updateSession(id, data);
      UI.toast('Jadwal diperbarui!', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminAddNotif = async () => {
    const title = await UI.inputModal('Judul Notifikasi', 'Contoh: Waktu test pagi!');
    if (!title) return;
    UI.loading(true);
    try {
      await API.addNotification({ title });
      UI.toast('Notifikasi ditambahkan!', 'success');
      await Admin.renderNotifications();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminToggleNotif = async (id, isActive) => {
    try {
      await API.updateNotification(id, { is_active: isActive });
      UI.toast(isActive ? 'Notifikasi diaktifkan.' : 'Notifikasi dinonaktifkan.', 'info');
    } catch (e) { UI.toast(e.message, 'error'); }
  };

  const adminDeleteNotif = async (id) => {
    const ok = await UI.confirm('Hapus Notifikasi?', 'Notifikasi ini akan dihapus permanen.');
    if (!ok) return;
    UI.loading(true);
    try {
      await API.deleteNotification(id);
      UI.toast('Notifikasi dihapus.', 'success');
      await Admin.renderNotifications();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminDeleteUser = async (id, username) => {
    const ok = await UI.confirm('Hapus User?', `User "${username}" akan dihapus beserta semua progressnya.`);
    if (!ok) return;
    UI.loading(true);
    try {
      await API.deleteUser(id);
      UI.toast('User dihapus.', 'success');
      await Admin.renderUsers();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Provider Admin Actions ─────────────────────────────────
  const adminAddProvider = async () => {
    const name = await UI.inputModal('Nama Provider Baru', 'Contoh: Telkomsel, XL, By.U ...');
    if (!name) return;
    UI.loading(true);
    try {
      await API.addProvider(name);
      UI.toast('Provider ditambahkan!', 'success');
      await Admin.renderProviders();
      await _refreshProviderSelect();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const adminDeleteProvider = async (id, name) => {
    const ok = await UI.confirm('Hapus Provider?', `Provider "${name}" akan dihapus.`);
    if (!ok) return;
    UI.loading(true);
    try {
      await API.deleteProvider(id);
      UI.toast('Provider dihapus.', 'success');
      await Admin.renderProviders();
      await _refreshProviderSelect();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  /** Ganti tipe kategori (cycle: otomatis → utama → manual → otomatis) */
  const adminCycleType = async (id, nextType) => {
    UI.loading(true);
    try {
      await API.setCategoryType(id, nextType);
      UI.toast(`Tipe diubah ke: ${nextType}`, 'success');
      await Admin.renderCategories();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  /** Ganti group_name kategori (Situs / Lainnya) */
  const adminSetCategoryGroup = async (id, groupName) => {
    try {
      await API.setCategoryGroup(id, groupName);
      UI.toast(`Grup diubah ke: ${groupName}`, 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  };

  // ── Profile / User Settings ────────────────────────────────
  /**
   * Buka screen profil + isi data user.
   */
  const navToProfile = async () => {
    const u = state.user;
    if (!u) return;
    // Isi info card
    const av = document.getElementById('settings-avatar');
    if (av) av.textContent = u.username.charAt(0).toUpperCase();
    const unEl = document.getElementById('settings-username-display');
    if (unEl) unEl.textContent = u.username;
    const prEl = document.getElementById('settings-provider-display');
    if (prEl) prEl.textContent = u.provider || 'Belum diset';
    const roEl = document.getElementById('settings-role-display');
    if (roEl) roEl.textContent = u.role === 'admin' ? '⚙️ Admin' : '👤 User';
    // Pre-fill input username
    const inp = document.getElementById('settings-new-username');
    if (inp) inp.value = '';
    // Isi dropdown provider dan pilih yang aktif
    try {
      const providers = await API.getProviders();
      const sel = document.getElementById('settings-provider-select');
      if (sel) {
        sel.innerHTML = providers.map(p =>
          `<option value="${p.name}" ${p.name === u.provider ? 'selected' : ''} class="bg-slate-900">${p.name}</option>`
        ).join('');
      }
    } catch { /* abaikan */ }
    showScreen('screen-user-settings');
  };

  /** Simpan username baru (PATCH /auth/me) */
  const saveUsername = async () => {
    const newName = document.getElementById('settings-new-username')?.value.trim();
    if (!newName) return UI.toast('Username tidak boleh kosong!', 'error');
    UI.loading(true);
    try {
      const res = await API.updateMe({ username: newName });
      localStorage.setItem('lt_token', res.token);
      state.user = res.user;
      // Refresh tampilan
      document.getElementById('settings-username-display').textContent = res.user.username;
      document.getElementById('settings-new-username').value = '';
      document.getElementById('dash-greeting').textContent = `${_greet()}, ${res.user.username}!`;
      document.getElementById('dash-avatar').textContent   = res.user.username.charAt(0).toUpperCase();
      UI.toast('Username berhasil diubah! ✅', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  /** Simpan provider baru (PATCH /auth/me) */
  const saveProvider = async () => {
    const sel = document.getElementById('settings-provider-select');
    const prov = sel?.value;
    if (!prov) return UI.toast('Pilih provider terlebih dahulu!', 'error');
    UI.loading(true);
    try {
      const res = await API.updateMe({ provider: prov });
      localStorage.setItem('lt_token', res.token);
      state.user = res.user;
      document.getElementById('settings-provider-display').textContent = res.user.provider;
      UI.toast('Provider berhasil diubah! ✅', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  /** Helper: salam berdasarkan jam */
  const _greet = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Selamat Pagi' : h < 17 ? 'Selamat Siang' : 'Selamat Malam';
  };

  /**
   * Reset SEMUA progress hari ini dengan konfirmasi math soal.
   */
  const resetAllProgress = async () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const jawaban = await UI.inputModal(
      '⚠️ Konfirmasi Reset',
      `Jawab soal ini untuk melanjutkan reset:\n${a} + ${b} = ?`
    );
    if (jawaban === null || jawaban === undefined) return;
    if (parseInt(jawaban, 10) !== a + b)
      return UI.toast('Jawaban salah! Reset dibatalkan.', 'error');
    UI.loading(true);
    try {
      const today = UI.todayWIB();
      // Reset semua sesi hari ini
      for (const sess of ['pagi', 'siang', 'malam']) {
        await API.resetProgress({ session_name: sess, date: today }).catch(() => {});
      }
      UI.toast('Semua progress hari ini direset! 🔄', 'info');
      Screens.renderDashboard().catch(() => {});
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Admin: Edit User ───────────────────────────────────────
  /**
   * Admin: buka modal edit username/provider user tertentu.
   */
  const adminEditUser = async (id, currentUsername, currentProvider) => {
    const newUsername = await UI.inputModal('Edit Username', 'Username baru (kosongkan jika tidak diubah):', currentUsername);
    if (newUsername === null) return; // Cancel
    const providers = await API.getProviders().catch(() => []);
    const provList  = providers.map(p => p.name).join(', ') || '';
    const newProvider = await UI.inputModal('Edit Provider', `Provider baru (pilih: ${provList})`, currentProvider);
    if (newProvider === null) return; // Cancel

    const data = {};
    if (newUsername.trim() && newUsername.trim() !== currentUsername) data.username = newUsername.trim();
    if (newProvider.trim() && newProvider.trim() !== currentProvider) data.provider = newProvider.trim();
    if (!Object.keys(data).length) return UI.toast('Tidak ada perubahan.', 'info');

    UI.loading(true);
    try {
      await API.adminUpdateUser(id, data);
      UI.toast('User berhasil diupdate! ✅', 'success');
      await Admin.renderUsers();
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── Admin: App Config ──────────────────────────────────────
  /** Admin: simpan konfigurasi tampilan app */
  const adminSaveAppConfig = async () => {
    const name   = document.getElementById('admin-app-name')?.value.trim();
    const slogan = document.getElementById('admin-app-slogan')?.value.trim();
    const icon   = document.getElementById('admin-app-icon')?.value.trim();
    const data   = {};
    if (name)   data.app_name   = name;
    if (slogan) data.app_slogan = slogan;
    if (icon)   data.app_icon   = icon;
    if (!Object.keys(data).length) return UI.toast('Isi minimal satu field!', 'error');
    UI.loading(true);
    try {
      await API.updateAppConfig(data);
      UI.toast('Konfigurasi aplikasi disimpan! ✅', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  // ── PWA Install Prompt ─────────────────────────────────────
  let _deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('hidden');
  });

  const installPWA = async () => {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    _deferredInstallPrompt = null;
    document.getElementById('pwa-install-banner')?.classList.add('hidden');
    if (outcome === 'accepted') UI.toast('Aplikasi berhasil diinstall! 🎉', 'success');
  };

  const dismissInstall = () => {
    _deferredInstallPrompt = null;
    document.getElementById('pwa-install-banner')?.classList.add('hidden');
  };

  // ── Double-back to Exit (PWA) ──────────────────────────────
  let _backPressedOnce = false;
  window.addEventListener('popstate', (e) => {
    // Jika ada riwayat screen internal → goBack
    if (state.screenHistory.length > 1) {
      e.preventDefault();
      goBack();
      history.pushState(null, '', location.href); // tetap di URL yang sama
      return;
    }
    // Di halaman utama (dashboard / login) — double-back untuk keluar
    if (_backPressedOnce) return; // biarkan keluar
    e.preventDefault();
    _backPressedOnce = true;
    UI.toast('Tekan back sekali lagi untuk keluar', 'info');
    history.pushState(null, '', location.href);
    setTimeout(() => { _backPressedOnce = false; }, 2000);
  });
  // Tambahkan entry awal agar popstate terpicu
  history.pushState(null, '', location.href);

  // ── Report Actions ─────────────────────────────────────────
  /** Tampilkan modal laporan — dipanggil dari tombol Kirim Laporan */
  const kirimLaporan = async () => {
    UI.loading(true);
    try {
      const provider = state.user?.provider || '';
      const text     = await Screens.generateReport(state.currentSession, provider);
      document.getElementById('report-text').value = text;
      document.getElementById('modal-report').style.display = 'flex';
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  };

  const closeReportModal = (e) => {
    if (!e || e.target === document.getElementById('modal-report'))
      document.getElementById('modal-report').style.display = 'none';
  };

  const copyReport = async () => {
    const text = document.getElementById('report-text').value;
    try {
      await navigator.clipboard.writeText(text);
      UI.toast('Laporan disalin ke clipboard! ✅', 'success');
    } catch { UI.toast('Gagal menyalin. Salin manual dari kotak teks.', 'error'); }
  };

  /**
   * Kirim laporan via Signal Messenger.
   * Signal mendukung deep link: https://signal.me/#p/<nomor>
   * Karena tidak ada API Signal publik, kita buka Signal share URL.
   */
  const shareSignal = () => {
    const text = document.getElementById('report-text').value;
    // Coba pakai Web Share API (mobile) yang biasanya muncul pilihan Signal
    if (navigator.share) {
      navigator.share({ title: 'Laporan Test Link', text }).catch(() => {
        // Fallback jika user batalkan
        _fallbackCopyAndHint(text);
      });
    } else {
      // Desktop: salin ke clipboard dan beri petunjuk
      _fallbackCopyAndHint(text);
    }
  };

  const _fallbackCopyAndHint = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      UI.toast('Laporan disalin! Buka Signal dan paste ke chat. 📋', 'info');
    }).catch(() => {
      UI.toast('Salin teks laporan secara manual, lalu kirim via Signal.', 'info');
    });
  };

  // ── Refresh dropdown provider di halaman login ─────────────
  const _refreshProviderSelect = async () => {
    try {
      const providers = await API.getProviders();
      const sel = document.getElementById('login-provider');
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="" class="bg-slate-900">-- Pilih Provider --</option>' +
        providers.map(p => `<option value="${p.name}" class="bg-slate-900">${p.name}</option>`).join('');
      if (cur) sel.value = cur;
    } catch { /* abaikan jika gagal */ }
  };

  // ── Screen loader hooks ─────────────────────────────────────
  const _showScreenWithLoad = (id) => {
    showScreen(id);
    UI.loading(true);
    const loaders = {
      'screen-testlink':            () => Screens.renderTestLink(),
      'screen-admin-categories':    () => Admin.renderCategories(),
      'screen-admin-sessions':      () => Admin.renderSessions(),
      'screen-admin-notifications': () => Admin.renderNotifications(),
      'screen-admin-users':         () => Admin.renderUsers(),
      'screen-admin-providers':     () => Admin.renderProviders(),
      'screen-admin-app':           () => Admin.renderAppConfig()
    };
    if (loaders[id]) loaders[id]().catch(e => UI.toast(e.message,'error')).finally(() => UI.loading(false));
    else UI.loading(false);
  };

  // ── Init ──────────────────────────────────────────────────
  const init = async () => {
    // Muat daftar provider ke dropdown login
    await _refreshProviderSelect();

    const token = localStorage.getItem('lt_token');
    if (token) {
      UI.loading(true);
      try {
        const res = await API.me();
        state.user = res;
        afterLogin(true);
      } catch {
        ['lt_token','lt_screen','lt_session','lt_cat_id','lt_cat_name'].forEach(k => localStorage.removeItem(k));
      }
      finally { UI.loading(false); }
    }

    document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  };

  document.addEventListener('DOMContentLoaded', init);

  return {
    login, logout, toggleAdminLogin, goBack, showScreen: _showScreenWithLoad,
    openSession, openCategory, openLink, reportStatus, closeStatusModal, markAllDone, resetCategory,
    navTo, navToTestLink, navToSession: navToTestLink, navToAdmin, navToProfile,
    closeProfileDrawer, openSettings, deleteAccount, showLinkChanges,
    saveUsername, saveProvider, resetAllProgress,
    requestNotification,
    adminAddCategory, adminRenameCategory, adminDeleteCategory, adminEditLinks, adminSaveLinks,
    adminSaveSession, adminAddNotif, adminToggleNotif, adminDeleteNotif,
    adminDeleteUser, adminEditUser, adminSaveAppConfig,
    adminToggleResetAllowed: async (id, allowed) => {
      UI.loading(true);
      try {
        await API.toggleResetAllowed(id, allowed);
        UI.toast(`Reset progress ${allowed ? 'diaktifkan' : 'dinonaktifkan'} untuk user.`, 'success');
        await Admin.renderUsers();
      } catch (e) { UI.toast(e.message, 'error'); }
      finally { UI.loading(false); }
    },
    adminAddProvider, adminDeleteProvider, adminCycleType, adminSetCategoryGroup,
    installPWA, dismissInstall,
    kirimLaporan, closeReportModal, copyReport, shareSignal,
    closeConfirm: UI?.closeConfirm, closeInputModal: UI?.closeInputModal
  };
})();
