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

  /**
   * Dipanggil setelah login berhasil atau token valid saat init.
   * @param {boolean} restore - true jika restore dari localStorage (refresh halaman)
   */
  const afterLogin = (restore = false) => {
    const u = state.user;
    // Update greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';
    document.getElementById('dash-greeting').textContent = `${greet}, ${u.username}!`;
    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('dash-avatar').textContent = u.username.charAt(0).toUpperCase();
    // Tampilkan tombol admin di nav jika admin
    if (u.role === 'admin') document.getElementById('nav-admin-btn').style.display = 'flex';
    else document.getElementById('nav-admin-btn').style.display = 'none';
    document.getElementById('bottom-nav').classList.remove('hidden');

    // Daftarkan service worker
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    if (restore) {
      // Kembalikan ke screen terakhir sebelum refresh
      const savedScreen  = localStorage.getItem('lt_screen')   || 'screen-dashboard';
      const savedSession = localStorage.getItem('lt_session')  || null;
      const savedCatId   = localStorage.getItem('lt_cat_id')   || null;
      const savedCatName = localStorage.getItem('lt_cat_name') || null;

      state.currentSession  = savedSession;
      state.currentCatId    = savedCatId;
      state.currentCatName  = savedCatName;
      state.screenHistory   = ['screen-dashboard'];

      // Navigasi ke screen yang tersimpan
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
      } else {
        showScreen('screen-dashboard', false);
        loadDashboard();
      }
    } else {
      // Login baru — selalu ke dashboard
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

  const shareReport = () => {
    const text = document.getElementById('report-text').value;
    if (navigator.share) {
      navigator.share({ title: 'Laporan Test Link', text }).catch(() => {});
    } else {
      // Fallback ke WhatsApp Web
      const url = 'https://wa.me/?text=' + encodeURIComponent(text);
      window.open(url, '_blank');
    }
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
      'screen-admin-categories':    () => Admin.renderCategories(),
      'screen-admin-sessions':      () => Admin.renderSessions(),
      'screen-admin-notifications': () => Admin.renderNotifications(),
      'screen-admin-users':         () => Admin.renderUsers(),
      'screen-admin-providers':     () => Admin.renderProviders()
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
    navTo, navToSession, navToAdmin,
    adminAddCategory, adminRenameCategory, adminDeleteCategory, adminEditLinks, adminSaveLinks,
    adminSaveSession, adminAddNotif, adminToggleNotif, adminDeleteNotif, adminDeleteUser,
    adminAddProvider, adminDeleteProvider, adminCycleType,
    kirimLaporan, closeReportModal, copyReport, shareReport,
    closeConfirm: UI?.closeConfirm, closeInputModal: UI?.closeInputModal
  };
})();
