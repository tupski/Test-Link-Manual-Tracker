/**
 * backend/routes/api.js
 * Semua endpoint REST API /api/* — v3 dengan auth JWT + Supabase.
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { requireAuth, requireAdmin } = require('../middleware/auth');

const { login, me, updateMe }              = require('../controllers/authController');
const { getCategories, createCategory, renameCategory, deleteCategory } = require('../controllers/categoriesController');
const { getLinks, saveLinks, deleteLink }   = require('../controllers/linksController');
const { getProgress, markOpened, updateStatus, markAllOpened, resetProgress } = require('../controllers/progressController');
const { getUsers, toggleResetAllowed, updateUser, deleteUser } = require('../controllers/usersController');
const { getSessions, updateSession }        = require('../controllers/configController');
const { getNotifications, getAllNotifications, createNotification, updateNotification, deleteNotification } = require('../controllers/notificationsController');
const { getProviders, createProvider, deleteProvider } = require('../controllers/providersController');
const { getAppConfig, updateAppConfig }     = require('../controllers/appConfigController');
const { getPublicCategories, getPublicLinks, getPublicSessions, getPublicStats } = require('../controllers/publicController');

// ── Auth ─────────────────────────────────────────────────────────────
router.post('/auth/login', login);
router.get('/auth/me',     requireAuth, me);
router.patch('/auth/me',    requireAuth, updateMe);

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
router.get('/users',                          requireAuth, requireAdmin, getUsers);
router.patch('/users/:id',                    requireAuth, requireAdmin, updateUser);
router.patch('/users/:id/reset-allowed',      requireAuth, requireAdmin, toggleResetAllowed);
router.delete('/users/:id',                   requireAuth, requireAdmin, deleteUser);

// ── Konfigurasi sesi ──────────────────────────────────────────────────
router.get('/config/sessions',       requireAuth, getSessions);
router.patch('/config/sessions/:id', requireAuth, requireAdmin, updateSession);

// ── Notifikasi ────────────────────────────────────────────────────────
router.get('/notifications',         requireAuth, getNotifications);
router.get('/notifications/all',     requireAuth, requireAdmin, getAllNotifications);
router.post('/notifications',        requireAuth, requireAdmin, createNotification);
router.patch('/notifications/:id',   requireAuth, requireAdmin, updateNotification);
router.delete('/notifications/:id',  requireAuth, requireAdmin, deleteNotification);

// ── Providers ─────────────────────────────────────────────────────────
// GET publik (tanpa auth) agar dropdown login bisa tampil sebelum masuk
router.get('/providers',             getProviders);
router.post('/providers',            requireAuth, requireAdmin, createProvider);
router.delete('/providers/:id',      requireAuth, requireAdmin, deleteProvider);

// ── Config Aplikasi (publik GET, admin PATCH) ─────────────────────────
router.get('/config/app',            getAppConfig);
router.patch('/config/app',          requireAuth, requireAdmin, updateAppConfig);

// ── Public API (tanpa auth) — untuk Android automation ───────────────
// Endpoint read-only, tidak butuh token JWT.
// Gunakan untuk mengambil data kategori, link, sesi, dan statistik.
router.get('/public/categories',     getPublicCategories);
router.get('/public/links/:catId',   getPublicLinks);
router.get('/public/sessions',       getPublicSessions);
router.get('/public/stats',          getPublicStats);

module.exports = router;
