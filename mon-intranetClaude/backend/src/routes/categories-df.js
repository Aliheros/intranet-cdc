// src/routes/categories-df.js — Catégories configurables pour Devis/Factures
const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const { requireAuth, requireAdminOrBureau } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const log = require('../lib/logger');

// Vérifie si l'utilisateur a la permission trésorerie (edit) OU est Admin/Bureau
const requireTresoOrAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'Admin' || role === 'Bureau') return next();
  const perm = req.user?.permissions?.find(p => p.pole === 'Trésorerie');
  if (perm?.level === 'edit') return next();
  return res.status(403).json({ error: 'Accès réservé à la trésorerie' });
};

// GET /api/categories-df — liste toutes les catégories actives (tout le monde)
router.get('/', requireAuth, async (req, res) => {
  try {
    const cats = await prisma.categorieDF.findMany({
      where: req.query.all === '1' ? {} : { actif: true },
      orderBy: [{ ordre: 'asc' }, { label: 'asc' }],
    });
    res.json(cats);
  } catch (err) {
    log.error({ err }, 'GET /categories-df');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories-df — créer (Admin/Bureau/Tréso)
router.post('/', requireAuth, requireTresoOrAdmin, async (req, res) => {
  try {
    const { label, ordre } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Label requis' });
    const cat = await prisma.categorieDF.create({
      data: { label: label.trim(), ordre: Number(ordre) || 0 },
    });
    res.status(201).json(cat);
    auditLog(req, { action: 'categorieDF.create', targetType: 'CategorieDF', targetId: cat.id, targetNom: cat.label });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cette catégorie existe déjà' });
    log.error({ err }, 'POST /categories-df');
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories-df/:id — modifier
router.put('/:id', requireAuth, requireTresoOrAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { label, actif, ordre } = req.body;
    const data = {};
    if (label !== undefined)  data.label  = String(label).trim();
    if (actif !== undefined)  data.actif  = Boolean(actif);
    if (ordre !== undefined)  data.ordre  = Number(ordre);
    const cat = await prisma.categorieDF.update({ where: { id }, data });
    res.json(cat);
    auditLog(req, { action: 'categorieDF.update', targetType: 'CategorieDF', targetId: id, targetNom: cat.label });
  } catch (err) {
    log.error({ err }, 'PUT /categories-df/:id');
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories-df/:id — désactiver (soft delete)
router.delete('/:id', requireAuth, requireTresoOrAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cat = await prisma.categorieDF.update({ where: { id }, data: { actif: false } });
    res.json({ success: true });
    auditLog(req, { action: 'categorieDF.disable', targetType: 'CategorieDF', targetId: id, targetNom: cat.label });
  } catch (err) {
    log.error({ err }, 'DELETE /categories-df/:id');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
