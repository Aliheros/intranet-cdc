// src/routes/admin.js — Panneau d'administration (Admin uniquement)
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const log = require('../lib/logger');

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
};

// ─── JOURNAL D'AUDIT ──────────────────────────────────────────────────────────

// GET /api/admin/audit?page=1&limit=50&acteur=&action=&dateFrom=&dateTo=&targetType=&actionPrefix=
router.get('/audit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, acteur, action, dateFrom, dateTo, targetType, actionPrefix } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const where = {};
    if (acteur)       where.actorNom   = { contains: acteur,      mode: 'insensitive' };
    if (action)       where.action     = { contains: action,       mode: 'insensitive' };
    if (actionPrefix) where.action     = { startsWith: actionPrefix + '.', mode: 'insensitive' };
    // action text filter takes precedence over prefix if both given
    if (action && actionPrefix) where.action = { contains: action, mode: 'insensitive' };
    if (targetType)   where.targetType = { equals: targetType,    mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * safeLimit,
        take:  safeLimit,
      }),
    ]);

    res.json({ data: logs, total, page: Number(page), pages: Math.ceil(total / safeLimit) });
  } catch (err) {
    log.error({ err }, 'Erreur GET /admin/audit');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ─── STATISTIQUES SYSTÈME ────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  const [
    usersTotal,
    usersActifs,
    usersInactifs,
    actionsTotal,
    actionsArchivees,
    eventsTotal,
    ndfTotal,
    ndfEnAttente,
    ndfMontantAgg,
    transactionsTotal,
    notifTotal,
    messagesTotal,
    missionsTotal,
    auditTotal,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, statut: 'Actif' } }),
    prisma.user.count({ where: { isDeleted: true } }),
    prisma.action.count(),
    prisma.action.count({ where: { isArchived: true } }),
    prisma.evenement.count({ where: { isArchived: false } }),
    prisma.noteFrais.count(),
    prisma.noteFrais.count({ where: { statut: { in: ['Soumise', 'En vérification'] } } }),
    prisma.noteFrais.aggregate({
      _sum: { montant: true },
      where: { statut: { in: ['Soumise', 'En vérification'] } },
    }),
    prisma.transaction.count(),
    prisma.notification.count(),
    prisma.message.count(),
    prisma.mission.count(),
    prisma.auditLog.count(),
  ]);

  res.json({
    users: {
      total:    usersTotal,
      actifs:   usersActifs,
      inactifs: usersInactifs,
    },
    actions: {
      total:     actionsTotal,
      enCours:   actionsTotal - actionsArchivees,
      archivees: actionsArchivees,
    },
    events:       { total: eventsTotal },
    ndf: {
      total:         ndfTotal,
      enAttente:     ndfEnAttente,
      montantEnAttente: ndfMontantAgg._sum.montant || 0,
    },
    transactions: { total: transactionsTotal },
    notifs:       { total: notifTotal },
    messages:     { total: messagesTotal },
    missions:     { total: missionsTotal },
    audit:        { total: auditTotal },
  });
});

// ─── EXPORTS CSV ─────────────────────────────────────────────────────────────

const toCSV = (rows, headers) => {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return '\uFEFF' + [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');
};

const sendCSV = (res, csv, filename) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

// GET /api/admin/export/users
router.get('/export/users', requireAuth, requireAdmin, async (req, res) => {
  auditLog(req, { action: 'admin.export', payload: { type: 'users' } });
  const users = await prisma.user.findMany({ orderBy: { nom: 'asc' } });
  const rows = users.map(u => ({
    ID: u.id, Nom: u.nom, Prénom: u.prenom, Email: u.email,
    Pôle: u.pole, Rôle: u.role, Statut: u.statut,
    'Date inscription': u.dateInscription || '',
    Désactivé: u.isDeleted ? 'Oui' : 'Non',
  }));
  sendCSV(res, toCSV(rows, ['ID','Nom','Prénom','Email','Pôle','Rôle','Statut','Date inscription','Désactivé']),
    `utilisateurs_${new Date().toISOString().slice(0,10)}.csv`);
});

// GET /api/admin/export/ndf
router.get('/export/ndf', requireAuth, requireAdmin, async (req, res) => {
  auditLog(req, { action: 'admin.export', payload: { type: 'ndf' } });
  const ndfs = await prisma.noteFrais.findMany({ orderBy: { createdAt: 'desc' } });
  const rows = ndfs.map(n => ({
    'N° Dossier': n.numeroDossier, Demandeur: n.demandeurNom,
    Date: n.date, Catégorie: n.categorie,
    'Montant (€)': n.montant, Description: n.description,
    Projet: n.projet || '', Pôle: n.pole || '',
    Statut: n.statut, Créé: n.createdAt?.toISOString().slice(0,10) || '',
  }));
  sendCSV(res, toCSV(rows, ['N° Dossier','Demandeur','Date','Catégorie','Montant (€)','Description','Projet','Pôle','Statut','Créé']),
    `notes_frais_${new Date().toISOString().slice(0,10)}.csv`);
});

// GET /api/admin/export/actions
router.get('/export/actions', requireAuth, requireAdmin, async (req, res) => {
  auditLog(req, { action: 'admin.export', payload: { type: 'actions' } });
  const actions = await prisma.action.findMany({ orderBy: { createdAt: 'desc' } });
  const rows = actions.map(a => ({
    ID: a.id, Type: a.type, Établissement: a.etablissement,
    Ville: a.ville || '', Cycle: a.cycle,
    Responsables: (a.responsables || []).join(', '),
    Statut: a.statut, Projet: a.projet || '',
    'Bénéficiaires': a.beneficiaires, 'Heures': a.heures,
    'Budget prévisionnel (€)': a.budgetPrevisionnel,
    Archivé: a.isArchived ? 'Oui' : 'Non',
    'Début': a.date_debut || '', 'Fin': a.date_fin || '',
  }));
  sendCSV(res, toCSV(rows, ['ID','Type','Établissement','Ville','Cycle','Responsables','Statut','Projet','Bénéficiaires','Heures','Budget prévisionnel (€)','Archivé','Début','Fin']),
    `actions_${new Date().toISOString().slice(0,10)}.csv`);
});

// GET /api/admin/export/heures
router.get('/export/heures', requireAuth, requireAdmin, async (req, res) => {
  auditLog(req, { action: 'admin.export', payload: { type: 'heures' } });
  const heures = await prisma.hour.findMany({ orderBy: { date: 'desc' } });
  const rows = heures.map(h => ({
    ID: h.id, Bénévole: h.userNomSnapshot || '',
    Date: h.date, Type: h.type,
    'Heures': h.hours, Statut: h.status,
    'Action ID': h.actionId || '', 'Évènement ID': h.eventId || '',
  }));
  sendCSV(res, toCSV(rows, ['ID','Bénévole','Date','Type','Heures','Statut','Action ID','Évènement ID']),
    `heures_benevoles_${new Date().toISOString().slice(0,10)}.csv`);
});

module.exports = router;
