/**
 * backend/controllers/notificationsController.js
 * CRUD notifikasi — admin kelola, user/publik hanya baca yang aktif.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/notifications — ambil notifikasi aktif untuk user ini
 *  - Notif global (user_id IS NULL) → semua user bisa lihat
 *  - Notif individual (user_id = req.user.id) → hanya user tersebut
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    // Ambil notifikasi global + notifikasi khusus user ini
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** GET /api/notifications/all — semua notifikasi (admin) */
const getAllNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** POST /api/notifications — buat notifikasi baru (admin) */
const createNotification = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Judul notifikasi wajib diisi.' });

    const { data, error } = await supabase
      .from('notifications')
      .insert({ title: title.trim(), message: message?.trim() || null })
      .select().single();

    if (error) return next(error);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/:id — update notifikasi (admin) */
const updateNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, is_active } = req.body;

    const updates = {};
    if (title     !== undefined) updates.title     = title.trim();
    if (message   !== undefined) updates.message   = message?.trim() || null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('notifications').update(updates).eq('id', id).select().single();

    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

/** DELETE /api/notifications/:id — hapus notifikasi (admin) */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return next(error);
    res.json({ success: true });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/notifications/:id/dismiss — user nonaktifkan notifikasi sendiri.
 * Hanya bisa set is_active = false. Tidak butuh admin.
 * User hanya bisa dismiss notif global (user_id IS NULL) atau notif miliknya sendiri.
 */
const dismissNotification = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const userId   = req.user.id;

    // Cek kepemilikan: hanya boleh dismiss miliknya sendiri atau notif global
    const { data: notif, error: fetchErr } = await supabase
      .from('notifications').select('id, user_id').eq('id', id).single();
    if (fetchErr || !notif) return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });
    if (notif.user_id && notif.user_id !== userId)
      return res.status(403).json({ error: 'Tidak bisa menghapus notifikasi milik user lain.' });

    const { data, error } = await supabase
      .from('notifications').update({ is_active: false }).eq('id', id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { getNotifications, getAllNotifications, createNotification, updateNotification, deleteNotification, dismissNotification };
