/**
 * backend/routes/api.js
 * Semua endpoint REST API /api/* — v3 dengan auth JWT + Supabase.
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { requireAuth, requireAdmin } = require('../middleware/auth');

const { login, me }                        = require('../controllers/authController');
const { getCategories, createCategory, renameCategory, deleteCategory } = require('../controllers/categoriesController');
const { getLinks, saveLinks, deleteLink }   = require('../controllers/linksController');
const { getProgress, markOpened, updateStatus, markAllOpened, resetProgress } = require('../controllers/progressController');
const { getUsers, deleteUser }             = require('../controllers/usersController');
const { getSessions, updateSession }       = require('../controllers/configController');
const { getNotifications, getAllNotifications, createNotification, updateNotification, deleteNotification } = require('../controllers/notificationsController');

// ── Auth ─────────────────────────────────────────────────────────────
router.post('/auth/login', login);
router.get('/auth/me',     requireAuth, me);

// ── Kategori ──────────────────────────────────────────────────────────
router.get('/categories',            requireAuth, getCategories);
router.post('/categories',           requireAuth, requireAdmin, createCategory);
router.patch('/categories/:id',      requireAuth, requireAdmin, renameCategory);
router.delete('/categories/:id',     requireAuth, requireAdmin, deleteCategory);

// ── Link per kategori ─────────────────────────────────────────────────
router.get('/categories/:id/links',  requireAuth, getLinks);
router.put('/categories/:id/links',  requireAuth, requireAdmin, saveLinks);
router.delete('/links/:id',          requireAuth, requireAdmin, deleteLink);

// ── Progress sesi ─────────────────────────────────────────────────────
router.get('/progress',              requireAuth, getProgress);
router.post('/progress/mark-all',    requireAuth, markAllOpened);
router.post('/progress',             requireAuth, markOpened);
router.patch('/progress/:id',        requireAuth, updateStatus);
router.delete('/progress',           requireAuth, resetProgress);

// ── Users (admin) ─────────────────────────────────────────────────────
router.get('/users',                 requireAuth, requireAdmin, getUsers);
router.delete('/users/:id',          requireAuth, requireAdmin, deleteUser);

// ── Konfigurasi sesi ──────────────────────────────────────────────────
router.get('/config/sessions',       requireAuth, getSessions);
router.patch('/config/sessions/:id', requireAuth, requireAdmin, updateSession);

// ── Notifikasi ────────────────────────────────────────────────────────
router.get('/notifications',         requireAuth, getNotifications);
router.get('/notifications/all',     requireAuth, requireAdmin, getAllNotifications);
router.post('/notifications',        requireAuth, requireAdmin, createNotification);
router.patch('/notifications/:id',   requireAuth, requireAdmin, updateNotification);
router.delete('/notifications/:id',  requireAuth, requireAdmin, deleteNotification);

module.exports = router;
