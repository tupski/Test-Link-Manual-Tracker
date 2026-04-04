/**
 * backend/routes/api.js
 * Definisi semua endpoint REST API /api/*
 */

'use strict';

const express  = require('express');
const router   = express.Router();

const { getCategories, renameCategory } = require('../controllers/categoriesController');
const { getLinks, saveLinks }           = require('../controllers/linksController');
const { getProgress, markOpened, markAllOpened, resetProgress } = require('../controllers/progressController');

// ── Kategori ──────────────────────────────────────────────────────────
// GET  /api/categories          → list semua kategori + link_count + last updated
// PATCH /api/categories/:id     → rename kategori
router.get('/categories',        getCategories);
router.patch('/categories/:id',  renameCategory);

// ── Link per kategori ─────────────────────────────────────────────────
// GET /api/categories/:id/links  → array URL kategori
// PUT /api/categories/:id/links  → replace semua link (+ auto-prefix https://)
router.get('/categories/:id/links', getLinks);
router.put('/categories/:id/links', saveLinks);

// ── Progress sesi ─────────────────────────────────────────────────────
// GET    /api/progress?date=     → semua progress hari ini
// POST   /api/progress           → tandai satu URL
// POST   /api/progress/mark-all  → tandai semua link kategori
// DELETE /api/progress           → reset progress satu kategori
router.get('/progress',           getProgress);
router.post('/progress/mark-all', markAllOpened);   // harus SEBELUM /progress agar tidak conflik
router.post('/progress',          markOpened);
router.delete('/progress',        resetProgress);

module.exports = router;
