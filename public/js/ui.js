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

  /** Modal konfirmasi */
  const confirm = (title, msg, okLabel = 'Lanjutkan', okClass = 'bg-rose-600') => {
    return new Promise(resolve => {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = msg;
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

  /** Modal input teks */
  const inputModal = (title, placeholder = '', defaultVal = '') => {
    return new Promise(resolve => {
      document.getElementById('input-modal-title').textContent = title;
      const field = document.getElementById('input-modal-field');
      field.placeholder = placeholder;
      field.value = defaultVal;
      document.getElementById('modal-input').style.display = 'flex';
      setTimeout(() => field.focus(), 100);

      const cleanup = (val) => {
        document.getElementById('modal-input').style.display = 'none';
        resolve(val);
      };
      document.getElementById('input-modal-ok').onclick = () => cleanup(field.value.trim());
    });
  };

  /** Format tanggal WIB */
  const formatDate = (d) => {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
  };

  /** Format jam:menit */
  const formatTime = (h, m = 0) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

  /** Hitung sisa/overtime waktu sesi */
  const sessionTimer = (startH, startM, normalH, maxH) => {
    const now       = new Date();
    const wibOffset = 7 * 60;
    const utcMin    = now.getUTCHours() * 60 + now.getUTCMinutes();
    const wibMin    = (utcMin + wibOffset) % (24 * 60);

    const startMin  = startH * 60 + startM;
    const endMin    = startMin + normalH * 60;
    const maxMin    = startMin + maxH * 60;

    const diff      = wibMin - startMin;
    if (diff < 0)   return { status: 'waiting', label: `Mulai ${formatTime(startH, startM)} WIB` };
    if (diff > maxH * 60) return { status: 'expired', label: 'Waktu habis' };

    const remaining = (diff < normalH * 60) ? endMin - wibMin : maxMin - wibMin;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const label = h > 0 ? `${h}j ${m}m` : `${m}m`;

    if (diff >= normalH * 60) return { status: 'overtime', label: `⚠️ Overtime · ${label}` };
    return { status: 'active', label: `⏱ Sisa ${label}` };
  };

  /** Tanggal hari ini format YYYY-MM-DD WIB */
  const todayWIB = () => {
    const d = new Date(Date.now() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  };

  return { toast, loading, confirm, inputModal, formatDate, formatTime, sessionTimer, todayWIB };
})();

/** Tutup modal confirm saat klik backdrop */
App = window.App || {};
App.closeConfirm = (e) => {
  if (!e || e.target === document.getElementById('modal-confirm'))
    document.getElementById('modal-confirm').style.display = 'none';
};
App.closeInputModal = (e) => {
  if (!e || e.target === document.getElementById('modal-input'))
    document.getElementById('modal-input').style.display = 'none';
};
