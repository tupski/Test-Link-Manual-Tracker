/**
 * public/js/api.js
 * Layer API — semua fetch call ke backend Express/Supabase.
 * Otomatis menyertakan JWT token di setiap request.
 */

const API = (() => {
  const BASE = '/api';

  /** Ambil token dari localStorage */
  const token = () => localStorage.getItem('lt_token');

  /** Wrapper fetch dengan auth header */
  const req = async (method, path, body) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    // Jika token expired/invalid dan bukan endpoint login, bersihkan sesi
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('lt_token');
      localStorage.removeItem('lt_screen');
      localStorage.removeItem('lt_session');
      localStorage.removeItem('lt_cat_id');
      localStorage.removeItem('lt_cat_name');
      window.location.reload();
      return;
    }

    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  };

  return {
    // ── Auth ─────────────────────────────────────────────────
    login:   (username, password, provider) => req('POST', '/auth/login', { username, password, provider }),
    me:      ()                   => req('GET',  '/auth/me'),

    // ── Kategori ─────────────────────────────────────────────
    getCategories:  ()            => req('GET',  '/categories'),
    addCategory:    (name)        => req('POST', '/categories', { name }),
    renameCategory: (id, name)    => req('PATCH',`/categories/${id}`, { name }),
    deleteCategory: (id)          => req('DELETE',`/categories/${id}`),

    // ── Link ─────────────────────────────────────────────────
    getLinks:  (catId)            => req('GET',  `/categories/${catId}/links`),
    saveLinks: (catId, links)     => req('PUT',  `/categories/${catId}/links`, { links }),
    deleteLink:(id)               => req('DELETE',`/links/${id}`),

    // ── Progress ─────────────────────────────────────────────
    getProgress:   (date, session) => req('GET', `/progress?date=${date}${session?`&session=${session}`:''}`),
    markOpened:    (body)          => req('POST', '/progress', body),
    updateStatus:  (id, status)    => req('PATCH',`/progress/${id}`, { status }),
    markAllOpened: (body)          => req('POST', '/progress/mark-all', body),
    resetProgress: (body)          => req('DELETE','/progress', body),

    // ── Config Sesi ──────────────────────────────────────────
    getSessions:   ()             => req('GET',  '/config/sessions'),
    updateSession: (id, data)     => req('PATCH',`/config/sessions/${id}`, data),

    // ── Notifikasi ───────────────────────────────────────────
    getNotifications:    ()       => req('GET',  '/notifications'),
    getAllNotifications:  ()       => req('GET',  '/notifications/all'),
    addNotification:     (data)   => req('POST', '/notifications', data),
    updateNotification:  (id, d)  => req('PATCH',`/notifications/${id}`, d),
    deleteNotification:  (id)     => req('DELETE',`/notifications/${id}`),

    // ── Users (admin) ────────────────────────────────────────
    getUsers:           ()           => req('GET',   '/users'),
    adminUpdateUser:    (id, data)   => req('PATCH', `/users/${id}`, data),
    toggleResetAllowed: (id, allowed)=> req('PATCH', `/users/${id}/reset-allowed`, { allowed }),
    deleteUser:         (id)         => req('DELETE',`/users/${id}`),

    // ── Auth: update profil sendiri ───────────────────────────
    updateMe: (data)                 => req('PATCH', '/auth/me', data),

    // ── Providers (GET publik, tidak butuh auth) ──────────────
    getProviders: () => fetch(BASE + '/providers')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); return d; }),
    addProvider:    (name)           => req('POST',  '/providers', { name }),
    deleteProvider: (id)             => req('DELETE',`/providers/${id}`),

    // ── Kategori: update type / group_name ───────────────────
    setCategoryType:  (id, type)      => req('PATCH', `/categories/${id}`, { type }),
    setCategoryGroup: (id, group_name)=> req('PATCH', `/categories/${id}`, { group_name }),

    // ── App Config (GET publik, PATCH admin) ──────────────────
    getAppConfig: () => fetch(BASE + '/config/app')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); return d; }),
    updateAppConfig: (data)       => req('PATCH', '/config/app', data),

    // ── Password user (self-service) ──────────────────────────
    setMyPassword:    (password, new_password) => req('PATCH', '/auth/me/password', { password, new_password }),
    removeMyPassword: ()                       => req('DELETE', '/auth/me/password'),

    // ── Whitelist username (admin only) ───────────────────────
    getWhitelist:          ()         => req('GET',    '/whitelist'),
    addToWhitelist:        (username) => req('POST',   '/whitelist', { username }),
    removeFromWhitelist:   (id)       => req('DELETE', `/whitelist/${id}`)
  };
})();
