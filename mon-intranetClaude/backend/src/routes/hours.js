const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');

const router = express.Router();
const prisma = require('../lib/prisma');

router.get('/', requireAuth, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const { userId } = req.query;
    // Non-privilégiés ne peuvent voir que leurs propres heures
    const where = isPrivileged
      ? (userId ? { userId: Number(userId) } : {})
      : { userId: req.user.id };
    const hours = await prisma.hour.findMany({
      where,
      include: { user: { select: { id: true, nom: true, avatar: true } } },
      orderBy: { date: 'desc' },
    });
    // Normaliser : si la relation user est null (compte désactivé/supprimé),
    // reconstruire un objet minimal depuis le snapshot pour ne pas casser l'affichage
    const normalized = hours.map(h => ({
      ...h,
      user: h.user ?? { id: null, nom: h.userNomSnapshot || 'Ancien membre', avatar: '?' },
    }));
    res.json(normalized);
  } catch (err) {
    console.error('Erreur GET hours:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    // Exclure les champs hors-schéma Prisma : "user" (nom snapshot côté front),
    // "id", "createdAt" pour éviter que Prisma tente d'interpréter une relation
    // ou un champ inexistant et lève une erreur silencieusement avalée.
    const { userId, user: _userNomFront, id: _id, createdAt: _ca, updatedAt: _ua, ...body } = req.body;
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const finalUserId = (isPrivileged && userId) ? Number(userId) : req.user.id;

    // Snapshot du nom au moment de la saisie
    let userNomSnapshot = req.user.nom;
    if (isPrivileged && userId && Number(userId) !== req.user.id) {
      const targetUser = await prisma.user.findUnique({
        where: { id: finalUserId },
        select: { nom: true },
      });
      userNomSnapshot = targetUser?.nom || 'Inconnu';
    }

    const hour = await prisma.hour.create({
      data: { ...body, userId: finalUserId, userNomSnapshot },
    });
    res.status(201).json(hour);
    auditLog(req, {
      action: 'hour.create',
      targetType: 'Hour', targetId: hour.id, targetNom: userNomSnapshot,
      payload: { hours: hour.hours, date: hour.date, type: hour.type, forUser: finalUserId !== req.user.id ? userNomSnapshot : undefined },
    });
  } catch (err) {
    console.error('Erreur POST hour:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Validation réservée au bureau' });
    }
    // Exclure les champs non modifiables
    const { id, createdAt, user, userNomSnapshot, ...data } = req.body;
    const hourId = Number(req.params.id);
    const before = await prisma.hour.findUnique({ where: { id: hourId }, select: { status: true, userNomSnapshot: true, hours: true, date: true } });
    const hour = await prisma.hour.update({ where: { id: hourId }, data });
    res.json(hour);

    if (data.status && before && data.status !== before.status) {
      auditLog(req, {
        action: 'hour.validate',
        targetType: 'Hour', targetId: hourId, targetNom: before.userNomSnapshot || '',
        payload: { from: before.status, to: data.status, hours: before.hours, date: before.date },
      });
    }
  } catch (err) {
    console.error('Erreur PUT hour:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Suppression réservée au bureau' });
    }
    const hourId = Number(req.params.id);
    const toDelete = await prisma.hour.findUnique({ where: { id: hourId }, select: { userNomSnapshot: true, hours: true, date: true, type: true } }).catch(() => null);
    await prisma.hour.delete({ where: { id: hourId } });
    auditLog(req, {
      action: 'hour.delete',
      targetType: 'Hour', targetId: hourId, targetNom: toDelete?.userNomSnapshot,
      payload: { hours: toDelete?.hours, date: toDelete?.date, type: toDelete?.type },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE hour:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
