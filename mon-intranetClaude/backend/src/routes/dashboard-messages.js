// routes/dashboard-messages.js — Messages rotatifs du Dashboard
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const router  = express.Router();
const prisma  = require('../lib/prisma');

const MAX_CONTENU  = 120;
const MAX_ACTIFS   = 20; // limite globale de messages actifs en base

// ── Vérification rôle Admin/Bureau ───────────────────────────────────────────
function isAdmin(req) {
  return req.user.role === 'Admin' || req.user.role === 'Bureau';
}

// ── GET /  — tous les messages actifs (filtrés pour l'utilisateur courant) ───
// Les messages sont renvoyés triés par score de spécificité décroissant.
// Le frontend gère l'animation et limite la séquence à 10 messages.
router.get('/', requireAuth, async (req, res) => {
  try {
    const messages = await prisma.dashboardMessage.findMany({
      where: { actif: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calcul du score de spécificité pour chaque message
    const scored = messages.map(m => ({ ...m, _score: specificityScore(m) }));
    scored.sort((a, b) => b._score - a._score || b.createdAt - a.createdAt);

    res.json(scored);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /all  — tous les messages (admin seulement, actifs + inactifs) ───────
router.get('/all', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès réservé Admin/Bureau.' });
  try {
    const messages = await prisma.dashboardMessage.findMany({
      orderBy: [{ actif: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /  — créer un message ───────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès réservé Admin/Bureau.' });

  const {
    contenu, actif = true,
    cibleUsers = [], ciblePoles = [], cibleProjets = [],
    cibleRoles = [], cibleGenres = [], cibleStatuts = [],
    cibleAgeMin, cibleAgeMax,
  } = req.body;

  if (!contenu || !contenu.trim())
    return res.status(400).json({ error: 'Le contenu est requis.' });
  if (contenu.length > MAX_CONTENU)
    return res.status(400).json({ error: `Contenu trop long (max ${MAX_CONTENU} caractères).` });

  // Vérifier la limite de messages actifs
  if (actif) {
    const count = await prisma.dashboardMessage.count({ where: { actif: true } });
    if (count >= MAX_ACTIFS)
      return res.status(400).json({ error: `Limite de ${MAX_ACTIFS} messages actifs atteinte.` });
  }

  try {
    const msg = await prisma.dashboardMessage.create({
      data: {
        contenu: contenu.trim(),
        actif,
        cibleUsers, ciblePoles, cibleProjets,
        cibleRoles, cibleGenres, cibleStatuts,
        cibleAgeMin: cibleAgeMin ?? null,
        cibleAgeMax: cibleAgeMax ?? null,
        createdBy: req.user.nom,
      },
    });
    await auditLog(req, { action: 'dashboard_message.create', targetId: msg.id, targetType: 'DashboardMessage', targetNom: msg.contenu.slice(0, 40) });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id  — modifier un message ─────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès réservé Admin/Bureau.' });

  const id = parseInt(req.params.id);
  const {
    contenu, actif,
    cibleUsers, ciblePoles, cibleProjets,
    cibleRoles, cibleGenres, cibleStatuts,
    cibleAgeMin, cibleAgeMax,
  } = req.body;

  if (contenu !== undefined) {
    if (!contenu.trim()) return res.status(400).json({ error: 'Le contenu ne peut pas être vide.' });
    if (contenu.length > MAX_CONTENU)
      return res.status(400).json({ error: `Contenu trop long (max ${MAX_CONTENU} caractères).` });
  }

  // Vérifier la limite si on réactive
  if (actif === true) {
    const existing = await prisma.dashboardMessage.findUnique({ where: { id } });
    if (existing && !existing.actif) {
      const count = await prisma.dashboardMessage.count({ where: { actif: true } });
      if (count >= MAX_ACTIFS)
        return res.status(400).json({ error: `Limite de ${MAX_ACTIFS} messages actifs atteinte.` });
    }
  }

  try {
    const data = {};
    if (contenu     !== undefined) data.contenu     = contenu.trim();
    if (actif       !== undefined) data.actif       = actif;
    if (cibleUsers  !== undefined) data.cibleUsers  = cibleUsers;
    if (ciblePoles  !== undefined) data.ciblePoles  = ciblePoles;
    if (cibleProjets !== undefined) data.cibleProjets = cibleProjets;
    if (cibleRoles  !== undefined) data.cibleRoles  = cibleRoles;
    if (cibleGenres !== undefined) data.cibleGenres = cibleGenres;
    if (cibleStatuts !== undefined) data.cibleStatuts = cibleStatuts;
    if ('cibleAgeMin' in req.body) data.cibleAgeMin = cibleAgeMin ?? null;
    if ('cibleAgeMax' in req.body) data.cibleAgeMax = cibleAgeMax ?? null;

    const msg = await prisma.dashboardMessage.update({ where: { id }, data });
    await auditLog(req, { action: 'dashboard_message.update', targetId: msg.id, targetType: 'DashboardMessage', targetNom: msg.contenu.slice(0, 40) });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id  — supprimer un message ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Accès réservé Admin/Bureau.' });
  const id = parseInt(req.params.id);
  try {
    const msg = await prisma.dashboardMessage.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ error: 'Message introuvable.' });

    await prisma.dashboardMessage.delete({ where: { id } });
    await auditLog(req, { action: 'dashboard_message.delete', targetId: id, targetType: 'DashboardMessage', targetNom: msg.contenu.slice(0, 40) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calcule un score de spécificité : plus un message est ciblé précisément,
 * plus son score est élevé → il apparaît en premier dans la séquence.
 *
 * Règles (cumulatives) :
 *   +60  ciblage utilisateur nommé
 *   +40  ciblage pôle ou projet
 *   +30  ciblage rôle
 *   +20  ciblage statut
 *   +15  ciblage genre
 *   +10  ciblage tranche d'âge
 *    =0  aucun ciblage (message général)
 */
function specificityScore(msg) {
  let s = 0;
  if (msg.cibleUsers?.length)   s += 60;
  if (msg.ciblePoles?.length || msg.cibleProjets?.length) s += 40;
  if (msg.cibleRoles?.length)   s += 30;
  if (msg.cibleStatuts?.length) s += 20;
  if (msg.cibleGenres?.length)  s += 15;
  if (msg.cibleAgeMin != null || msg.cibleAgeMax != null) s += 10;
  return s;
}

module.exports = router;
