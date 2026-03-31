const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const { dispatchToUsers } = require('../services/mailer');
const prisma = require('../lib/prisma');

const router = express.Router();

// Champs autorisés pour la création d'une notification
const NOTIF_ALLOWED = ['titre', 'contenu', 'auteur', 'date', 'cible', 'targetPoles', 'targetUsers', 'priorite', 'source'];

function pickNotifFields(body) {
  const data = {};
  NOTIF_ALLOWED.forEach(k => { if (body[k] !== undefined) data[k] = body[k]; });
  return data;
}

// Normalise les valeurs de cible quel que soit la casse envoyée par le frontend
function normalizeCible(cible) {
  if (!cible) return 'tous';
  const lower = cible.toLowerCase();
  if (lower === 'tous') return 'tous';
  if (lower === 'pôle' || lower === 'pole') return 'pole';
  if (lower === 'individuel' || lower === 'personnes') return 'personnes';
  return lower;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { nom, pole } = req.user;
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';

    // Admin/Bureau voient toutes les notifs ; les autres voient uniquement celles qui les concernent
    const where = isPrivileged ? {} : {
      OR: [
        { cible: 'tous' },
        { cible: 'Tous' },
        { cible: 'pole',    targetPoles: { has: pole } },
        { cible: 'Pôle',   targetPoles: { has: pole } },
        { cible: 'personnes', targetUsers: { has: nom } },
        { cible: 'Individuel', targetUsers: { has: nom } },
        { auteur: nom }, // notifs qu'on a envoyées soi-même
      ],
    };

    const notifs = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(notifs);
  } catch (err) {
    console.error('Erreur GET notifications:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    // Seuls Admin et Bureau peuvent créer des notifications via l'API.
    // Les notifications système sont créées en interne par notifHelper.js.
    // Les rappels manuels (handleSendActionReminder) passent par ce même endpoint
    // mais doivent être du bureau ou de l'émetteur — restreindre ici est suffisant.
    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      return res.status(403).json({ error: 'Création de notifications réservée au bureau' });
    }

    const data = pickNotifFields(req.body);
    if (!data.titre || !data.contenu || !data.cible) {
      return res.status(400).json({ error: 'Champs requis manquants (titre, contenu, cible)' });
    }
    // Normaliser la cible pour garantir la cohérence en base
    data.cible = normalizeCible(data.cible);

    const notif = await prisma.notification.create({ data });
    res.status(201).json(notif);

    auditLog(req, {
      action: 'notification.create',
      targetType: 'Notification', targetId: notif.id, targetNom: notif.titre,
      payload: { cible: notif.cible, targetPoles: notif.targetPoles, targetUsers: notif.targetUsers, source: notif.source },
    });

    // ── Dispatch emails en arrière-plan (ne bloque pas la réponse) ──────────────
    try {
      const { cible, targetPoles, targetUsers, titre, contenu } = notif;
      let usersToNotify = [];

      if (cible === 'tous') {
        usersToNotify = await prisma.user.findMany({ where: { statut: { not: 'Inactif' } } });
      } else if (cible === 'pole' && targetPoles?.length) {
        usersToNotify = await prisma.user.findMany({ where: { pole: { in: targetPoles } } });
      } else if (cible === 'personnes' && targetUsers?.length) {
        usersToNotify = await prisma.user.findMany({ where: { nom: { in: targetUsers } } });
      }

      usersToNotify = usersToNotify.filter(u => u.nom !== notif.auteur);

      await dispatchToUsers({
        users: usersToNotify,
        preferenceKey: 'annonces',
        subject: `[Intranet] ${titre}`,
        titre,
        contenu,
        ctaLabel: "Voir sur l'intranet",
      });
    } catch (emailErr) {
      console.error('[Notifications] Erreur dispatch email :', emailErr.message);
    }
  } catch (err) {
    console.error('Erreur POST notification:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/notifications/reminder — rappel manuel envoyé par un responsable à un autre membre
// Ouvert à tout membre authentifié, mais restreint à cible:'personnes' uniquement
router.post('/reminder', requireAuth, async (req, res) => {
  try {
    const { titre, contenu, targetUsers } = req.body;
    if (!titre || !contenu || !Array.isArray(targetUsers) || targetUsers.length === 0) {
      return res.status(400).json({ error: 'Champs requis manquants (titre, contenu, targetUsers)' });
    }
    const notif = await prisma.notification.create({
      data: {
        titre,
        contenu,
        auteur: req.user.nom,
        date: new Date().toISOString().slice(0, 10),
        cible: 'personnes',
        targetPoles: [],
        targetUsers,
        priorite: 'normale',
        source: 'system',
      },
    });
    res.status(201).json(notif);
  } catch (err) {
    console.error('Erreur POST notification/reminder:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// Marquer comme lu — stocke l'ID utilisateur (insensible aux renommages)
router.patch('/:id/lu', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
    if (!notif) return res.status(404).json({ error: 'Notification introuvable' });
    const userId = String(req.user.id);
    // Vérifier par ID ET par nom (rétrocompatibilité avec les entrées existantes au format nom)
    const alreadyRead = notif.lu.includes(userId) || notif.lu.includes(req.user.nom);
    if (!alreadyRead) {
      await prisma.notification.update({
        where: { id: Number(req.params.id) },
        data: { lu: { push: userId } },
      });
    }
    res.json({ message: 'Marqué comme lu' });
  } catch (err) {
    console.error('Erreur PATCH notification lu:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const notifId = Number(req.params.id);
    const toDelete = await prisma.notification.findUnique({ where: { id: notifId } }).catch(() => null);
    await prisma.notification.delete({ where: { id: notifId } });
    auditLog(req, {
      action: 'notification.delete',
      targetType: 'Notification', targetId: notifId, targetNom: toDelete?.titre,
      payload: { cible: toDelete?.cible, source: toDelete?.source },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE notification:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
