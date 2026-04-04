/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './public/**/*.html',
    './public/**/*.js',
  ],
  /**
   * Safelist: class yang dipakai secara dinamis di template JS.
   * Perlu eksplisit agar tidak di-purge oleh PurgeCSS.
   */
  safelist: [
    // Session badge (dinamis dari sessionTimer)
    'bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/30',
    'bg-amber-500/20',   'text-amber-400',   'border-amber-500/30',
    'bg-slate-700',      'text-slate-500',   'border-slate-600', 'text-slate-400',
    // Progress bars dinamis
    'bg-emerald-500', 'bg-gradient-to-r', 'from-indigo-500', 'to-purple-500',
    'from-emerald-500', 'to-teal-500',
    // TYPE_META colors (screens.js)
    'text-indigo-400', 'border-indigo-500/30', 'bg-indigo-500/5',
    'text-slate-300',  'border-slate-600/40',  'bg-slate-800/30',
    'bg-amber-500/5',
    // TYPE_BADGE (admin.js)
    'bg-indigo-500/10', 'bg-amber-500/10', 'bg-slate-700/20',
    // User avatar gradients (dinamis berdasarkan role)
    'from-rose-500', 'to-pink-600', 'from-indigo-500', 'to-purple-600',
    // Timer colors (categories screen)
    'bg-emerald-500/10', 'bg-amber-500/10', 'bg-slate-800',
    // Reset allowed toggle (admin users)
    'border-emerald-500/20', 'bg-slate-800/60', 'border-slate-700/40',
    // Category cards done state
    'border-emerald-500/20',
  ],
  theme: { extend: {} },
  plugins: [],
};
