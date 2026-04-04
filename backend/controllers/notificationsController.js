/**
 * backend/controllers/notificationsController.js
 * CRUD notifikasi — admin kelola, user/publik hanya baca yang aktif.
 */

'use strict';

const supabase = require('../models/supabase');

/** GET /api/notifications — ambil notifikasi aktif */
const getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true)
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

module.exports = { getNotifications, getAllNotifications, createNotification, updateNotification, deleteNotification };
