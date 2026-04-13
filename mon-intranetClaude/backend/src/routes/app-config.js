const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const prisma          = require('../lib/prisma');

const router = express.Router();

const ALLOWED_KEYS = ['types_action', 'niveaux_classe', 'labels_rep', 'statuts_action', 'thresholds', 'notification_rules', 'google_drive_export'];

function requireAdmin(req, res, next) {
  if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
    return res.status(403).json({ error: 'Accès réservé au bureau' });
  }
  next();
}

// GET /api/app-config — toutes les clés (lecture pour tous les connectés)
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.appConfig.findMany();
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/app-config/:key — mise à jour d'une clé (admin seulement)
router.patch('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: `Clé "${key}" non autorisée` });
    }
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value requis' });

    const row = await prisma.appConfig.upsert({
      where: { key },
      create: { key, value, updatedBy: req.user.nom },
      update: { value, updatedBy: req.user.nom },
    });

    auditLog(req, { action: 'appconfig.update', targetType: 'AppConfig', targetNom: key, payload: { key } });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
