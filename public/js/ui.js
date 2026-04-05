/**
 * public/js/ui.js
 * Fungsi UI universal: toast, loading, modal, helper render.
 */

const UI = (() => {
  /** Tampilkan toast notifikasi */
  const toast = (msg, type = 'info', duration = 2500) => {
    const el = document.getElementById('toast-text');
    const colors = {
      success: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
      error:   'bg-rose-500/20 border border-rose-500/30 text-rose-300',
      warn:    'bg-amber-500/20 border border-amber-500/30 text-amber-300',
      info:    'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
    };
    el.className = `px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl slide-up whitespace-nowrap ${colors[type] || colors.info}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), duration);
  };

  /** Tampilkan/sembunyikan loading spinner */
  const loading = (show) => {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
  };

  /** Modal konfirmasi — htmlMode=true agar isi msg dirender sebagai HTML */
  const confirm = (title, msg, okLabel = 'Lanjutkan', okClass = 'bg-rose-600', htmlMode = false) => {
    return new Promise(resolve => {
      document.getElementById('confirm-title').textContent = title;
      const msgEl = document.getElementById('confirm-msg');
      if (htmlMode) msgEl.innerHTML = msg; else msgEl.textContent = msg;
      const okBtn = document.getElementById('confirm-ok');
      okBtn.textContent = okLabel;
      okBtn.className = `flex-1 py-3 rounded-xl ${okClass} text-white font-bold`;
      document.getElementById('modal-confirm').style.display = 'flex';

      const cleanup = (result) => {
        document.getElementById('modal-confirm').style.display = 'none';
        okBtn.onclick = null;
        document.getElementById('confirm-cancel').onclick = null;
        resolve(result);
      };
      okBtn.onclick = () => cleanup(true);
      document.getElementById('confirm-cancel').onclick = () => cleanup(false);
    });
  };

  /** Modal input teks — questionLabel tampil sebagai label di atas input */
  const inputModal = (title, placeholder = '', defaultVal = '', questionLabel = '') => {
    return new Promise(resolve => {
      document.getElementById('input-modal-title').textContent = title;
      // Tampilkan question label di atas input jika ada
      const qEl = document.getElementById('input-modal-question');
      if (qEl) {
        qEl.textContent = questionLabel;
        qEl.style.display = questionLabel ? 'block' : 'none';
      }
      const field = document.getElementById('input-modal-field');
      field.placeholder = placeholder;
      field.value = defaultVal;
      document.getElementById('modal-input').style.display = 'flex';
      setTimeout(() => field.focus(), 100);

      const cleanup = (val) => {
        document.getElementById('modal-input').style.display = 'none';
        // Hapus handler agar tidak terduplikasi pada pemanggilan berikutnya
        document.getElementById('input-modal-ok').onclick     = null;
        document.getElementById('input-modal-cancel').onclick = null;
        resolve(val);
      };
      // OK → resolve dengan nilai input
      document.getElementById('input-modal-ok').onclick     = () => cleanup(field.value.trim());
      // Batal → resolve dengan null (caller harus cek null)
      document.getElementById('input-modal-cancel').onclick = () => cleanup(null);
    });
  };

  /** Format tanggal WIB */
  const formatDate = (d) => {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
  };

  /** Format jam:menit */
  const formatTime = (h, m = 0) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

  /** Hitung sisa/overtime waktu sesi + countdown ke mulai jika belum dimulai */
  const sessionTimer = (startH, startM, normalH, maxH) => {
    const now       = new Date();
    const wibOffset = 7 * 60;
    const utcMin    = now.getUTCHours() * 60 + now.getUTCMinutes();
    const wibMin    = (utcMin + wibOffset) % (24 * 60);

    const startMin  = (startH || 0) * 60 + (startM || 0);
    const endMin    = startMin + (normalH || 2) * 60;
    const maxMin    = startMin + (maxH || 3) * 60;

    const diff      = wibMin - startMin;

    // Belum mulai — tampilkan countdown ke waktu mulai
    if (diff < 0) {
      const waitMin = -diff;
      const wh = Math.floor(waitMin / 60), wm = waitMin % 60;
      const cdStr = wh > 0 ? `${wh}j ${wm}m lagi` : `${wm}m lagi`;
      return { status: 'waiting', label: `⏳ ${cdStr}`, startLabel: formatTime(startH, startM) };
    }

    // Sudah lewat max — selesai
    if (diff > (maxH || 3) * 60) return { status: 'expired', label: 'Selesai' };

    // Aktif — tampilkan sisa waktu (normal atau max)
    const remaining = (diff < (normalH || 2) * 60) ? endMin - wibMin : maxMin - wibMin;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const label = h > 0 ? `${h}j ${m}m` : `${m}m`;

    if (diff >= (normalH || 2) * 60) return { status: 'overtime', label: `⚠️ Overtime · ${label}` };
    return { status: 'active', label: `⏱ Sisa ${label}` };
  };

  /** Tanggal hari ini format YYYY-MM-DD WIB */
  const todayWIB = () => {
    const d = new Date(Date.now() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  };

  /**
   * Toggle visibilitas password field + update ikon mata.
   * @param {string} inputId - id dari input field
   * @param {string} iconId  - id dari span yang berisi ikon mata
   */
  const togglePwd = (inputId, iconId) => {
    const inp  = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!inp) return;
    const isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    if (icon) icon.textContent = isHidden ? '🙈' : '👁️';
  };

  /** Toggle akordion kesiapan test link di dashboard */
  const toggleReadiness = () => {
    const content = document.getElementById('readiness-details');
    const icon    = document.getElementById('readiness-chevron');
    if (!content || !icon) return;
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden', !isHidden);
    
    // Animasi opacity & slide
    if (isHidden) {
      content.style.display = 'block';
      setTimeout(() => {
        content.classList.remove('hidden', 'opacity-0');
        content.classList.add('opacity-100');
      }, 10);
    } else {
      content.classList.add('hidden', 'opacity-0');
      content.classList.remove('opacity-100');
    }
    
    icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  };

  return { toast, loading, confirm, inputModal, formatDate, formatTime, sessionTimer, todayWIB, togglePwd, toggleReadiness };
})();

/** Tutup modal confirm saat klik backdrop */
App = window.App || {};
App.closeConfirm = (e) => {
  if (!e || e.target === document.getElementById('modal-confirm'))
    document.getElementById('modal-confirm').style.display = 'none';
};
App.closeInputModal = (e) => {
  if (!e || e.target === document.getElementById('modal-input')) {
    // Trigger tombol Batal agar Promise ter-resolve dengan null
    const cancelBtn = document.getElementById('input-modal-cancel');
    if (cancelBtn && cancelBtn.onclick) cancelBtn.onclick();
    else document.getElementById('modal-input').style.display = 'none';
  }
};
