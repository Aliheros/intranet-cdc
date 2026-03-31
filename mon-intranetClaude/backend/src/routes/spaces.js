// src/routes/spaces.js
const express = require('express');
const { requireAuth }        = require('../middleware/auth');
const { auditLog }           = require('../middleware/auditLogger');
const { isSpaceResponsable } = require('../lib/spaceAuth');
const prisma = require('../lib/prisma');

const router = express.Router();

// ─── Helper : vérifie qu'un utilisateur peut écrire dans un espace ────────────
async function canWriteSpace(req, space) {
  if (req.user.role === 'Admin' || req.user.role === 'Bureau') return true;
  return isSpaceResponsable(req.user.id, req.user.nom, space);
}

// GET /api/spaces/settings — settings des espaces
// Admin/Bureau : tout. Autres : tout sauf les données 'teams' des espaces étrangers.
router.get('/settings', requireAuth, async (req, res) => {
  const settings = await prisma.spaceSettings.findMany();
  const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';

  const result = {};
  for (const s of settings) {
    if (!result[s.space]) result[s.space] = {};

    if (!isPrivileged && s.key === 'teams') {
      // Vérifier si l'utilisateur appartient à cet espace (par son pôle ou comme membre de l'équipe)
      const isOwnPole = s.space === req.user.pole;
      const isMember  = Object.values(s.value || {}).some(
        yearTeam => Array.isArray(yearTeam) && yearTeam.some(m => m.nom === req.user.nom)
      );
      if (!isOwnPole && !isMember) continue; // masquer les teams des espaces étrangers
    }

    result[s.space][s.key] = s.value;
  }
  res.json(result);
});

// PUT /api/spaces/:space/settings/:key — upsert d'un setting
// Autorisé : Admin, Bureau, et responsables de cet espace
router.put('/:space/settings/:key', requireAuth, async (req, res) => {
  const space = decodeURIComponent(req.params.space);
  const key   = req.params.key;

  if (!(await canWriteSpace(req, space))) {
    return res.status(403).json({ error: 'Accès réservé aux responsables de cet espace' });
  }

  const { value } = req.body;
  const setting = await prisma.spaceSettings.upsert({
    where:  { space_key: { space, key } },
    update: { value },
    create: { space, key, value },
  });
  res.json(setting);
  // Auditer uniquement les clés sensibles (teams, sections) — pas info ni docs
  if (['teams', 'sections'].includes(key)) {
    auditLog(req, {
      action: 'space.settings.update',
      targetType: 'SpaceSettings', targetNom: `${space}/${key}`,
      payload: { space, key },
    });
  }
});

// ─── Docs ─────────────────────────────────────────────────────────────────────

// PATCH /api/spaces/:space/docs/:docId — changer la section d'un document
router.patch('/:space/docs/:docId', requireAuth, async (req, res) => {
  try {
    const space = decodeURIComponent(req.params.space);
    const docId = Number(req.params.docId);
    if (isNaN(docId)) return res.status(400).json({ error: 'ID doc invalide' });

    if (!(await canWriteSpace(req, space))) {
      return res.status(403).json({ error: 'Accès réservé aux responsables de cet espace' });
    }

    const setting = await prisma.spaceSettings.findUnique({
      where: { space_key: { space, key: 'docs' } },
    });
    if (!setting) return res.status(404).json({ error: 'Espace introuvable' });

    const { section } = req.body;
    const docs = (Array.isArray(setting.value) ? setting.value : []).map(d =>
      d.id === docId ? { ...d, section } : d
    );
    const updated = await prisma.spaceSettings.update({
      where: { space_key: { space, key: 'docs' } },
      data:  { value: docs },
    });
    res.json(updated);
  } catch (err) {
    console.error('Erreur PATCH space docs:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ─── Corbeille ────────────────────────────────────────────────────────────────

// POST /api/spaces/:space/settings/trash — ajouter un élément en corbeille
router.post('/:space/settings/trash', requireAuth, async (req, res) => {
  try {
    const space = decodeURIComponent(req.params.space);

    if (!(await canWriteSpace(req, space))) {
      return res.status(403).json({ error: 'Accès réservé aux responsables de cet espace' });
    }

    const item  = req.body;

    const current = await prisma.spaceSettings.findUnique({
      where: { space_key: { space, key: 'trash' } },
    });
    const trash   = [...(Array.isArray(current?.value) ? current.value : []), item];
    const setting = await prisma.spaceSettings.upsert({
      where:  { space_key: { space, key: 'trash' } },
      update: { value: trash },
      create: { space, key: 'trash', value: trash },
    });
    res.json(setting);
  } catch (err) {
    console.error('Erreur POST space trash:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/spaces/:space/settings/trash/:trashId — retirer de la corbeille (restauration ou suppression définitive)
router.delete('/:space/settings/trash/:trashId', requireAuth, async (req, res) => {
  try {
    const space   = decodeURIComponent(req.params.space);
    const trashId = Number(req.params.trashId);
    if (isNaN(trashId)) return res.status(400).json({ error: 'ID corbeille invalide' });

    if (!(await canWriteSpace(req, space))) {
      return res.status(403).json({ error: 'Accès réservé aux responsables de cet espace' });
    }

    const current = await prisma.spaceSettings.findUnique({
      where: { space_key: { space, key: 'trash' } },
    });
    if (!current) return res.status(404).json({ error: 'Corbeille introuvable' });

    const trash = (Array.isArray(current.value) ? current.value : []).filter(t => t.id !== trashId);
    await prisma.spaceSettings.update({
      where: { space_key: { space, key: 'trash' } },
      data:  { value: trash },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE space trash:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
