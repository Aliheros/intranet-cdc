// src/routes/cycles.js
// Gestion des cycles associatifs (ex: "2025-2026").
// Stockés dans SpaceSettings { space: 'Global', key: 'cycles' }.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const prisma          = require('../lib/prisma');

const router = express.Router();
const WHERE  = { space_key: { space: 'Global', key: 'cycles' } };
const DEFAULT_CYCLES = ['2025-2026', '2024-2025', '2023-2024'];

async function readCycles() {
  const s = await prisma.spaceSettings.findUnique({ where: WHERE });
  return Array.isArray(s?.value) ? s.value : DEFAULT_CYCLES;
}

// GET /api/cycles
router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await readCycles());
  } catch (err) {
    console.error('Erreur GET cycles:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/cycles  { label: "2026-2027" }
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès réservé au bureau' });
    }
    const { label } = req.body;
    if (!label || typeof label !== 'string' || !/^\d{4}-\d{4}$/.test(label.trim())) {
      return res.status(400).json({ error: 'Label requis, format attendu : YYYY-YYYY' });
    }
    const current = await readCycles();
    if (current.includes(label)) {
      return res.status(409).json({ error: 'Ce cycle existe déjà' });
    }
    const updated = [label, ...current];
    await prisma.spaceSettings.upsert({
      where:  WHERE,
      update: { value: updated },
      create: { space: 'Global', key: 'cycles', value: updated },
    });
    await auditLog(req, { action: 'cycle.create', payload: { label } });
    res.status(201).json(updated);
  } catch (err) {
    console.error('Erreur POST cycles:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/cycles/:label
router.delete('/:label', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès réservé au bureau' });
    }
    const label = decodeURIComponent(req.params.label);
    const current = await readCycles();
    if (!current.includes(label)) {
      return res.status(404).json({ error: 'Cycle introuvable' });
    }
    const updated = current.filter(c => c !== label);
    await prisma.spaceSettings.upsert({
      where:  WHERE,
      update: { value: updated },
      create: { space: 'Global', key: 'cycles', value: updated },
    });
    await auditLog(req, { action: 'cycle.delete', payload: { label } });
    res.json(updated);
  } catch (err) {
    console.error('Erreur DELETE cycles:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
