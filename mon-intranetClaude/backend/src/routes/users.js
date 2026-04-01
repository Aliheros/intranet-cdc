const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const prisma = require('../lib/prisma');
const log = require('../lib/logger');

const router = express.Router();

// Helpers congés
function syncStatutFromConges(u) {
  const today = new Date().toISOString().split('T')[0];
  const conges = Array.isArray(u.conges) ? u.conges : [];
  if (conges.length === 0) return null; // pas de gestion auto
  // Congé actif : debut <= today ET (pas de fin OU fin >= today)
  const activeConge = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
  if (activeConge && u.statut !== 'En congé') return 'En congé';
  if (!activeConge && u.statut === 'En congé') return 'Actif';
  return null;
}

// GET /api/users — liste les utilisateurs actifs (sans passwordHash)
// ?includeDeleted=true (Admin seulement) pour voir les comptes désactivés
router.get('/', requireAuth, async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true' && req.user.role === 'Admin';
    const where = includeDeleted ? {} : { isDeleted: false };
    const isBureauOrAdmin = req.user.role === 'Admin' || req.user.role === 'Bureau';

    const users = await prisma.user.findMany({
      where,
      include: { permissions: true },
      orderBy: { nom: 'asc' },
    });

    // RH access check : Admin/Bureau ou permission pôle RH non-nulle
    let hasRHAccess = isBureauOrAdmin;
    if (!hasRHAccess) {
      const rhPerm = await prisma.permission.findFirst({
        where: { userId: req.user.id, pole: 'Ressources Humaines' },
      });
      hasRHAccess = !!(rhPerm && rhPerm.level !== 'none');
    }

    // Auto-sync statuts depuis les congés déclarés (uniquement pour les actifs)
    const updates = users
      .filter(u => !u.isDeleted)
      .map(u => ({ u, newStatut: syncStatutFromConges(u) }))
      .filter(({ newStatut }) => newStatut !== null);

    if (updates.length > 0) {
      await Promise.all(updates.map(({ u, newStatut }) =>
        prisma.user.update({ where: { id: u.id }, data: { statut: newStatut } })
      ));
      updates.forEach(({ u, newStatut }) => { u.statut = newStatut; });
    }

    res.json(users.map(({ passwordHash, notesRH, historiqueRH, commentairesRH, ...u }) => {
      if (hasRHAccess) return { ...u, notesRH, historiqueRH, commentairesRH };
      return u;
    }));
  } catch (err) {
    log.error({ err, route: 'GET /users' }, 'Erreur récupération liste utilisateurs');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const isBureauOrAdmin = req.user.role === 'Admin' || req.user.role === 'Bureau';

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      include: { permissions: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // RH access check
    let hasRHAccess = isBureauOrAdmin;
    if (!hasRHAccess) {
      const rhPerm = await prisma.permission.findFirst({
        where: { userId: req.user.id, pole: 'Ressources Humaines' },
      });
      hasRHAccess = !!(rhPerm && rhPerm.level !== 'none');
    }

    const { passwordHash, notesRH, historiqueRH, commentairesRH, ...userSafe } = user;
    if (hasRHAccess) {
      res.json({ ...userSafe, notesRH, historiqueRH, commentairesRH });
    } else {
      res.json(userSafe);
    }
  } catch (err) {
    log.error({ err, route: 'GET /users/:id' }, 'Erreur récupération utilisateur');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PATCH /api/users/:id — mise à jour profil (Admin ou soi-même)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'Admin';
    const isBureauOrAdmin = req.user.role === 'Bureau' || req.user.role === 'Admin';

    // Check RH permission in DB (Responsables / Éditeurs du pôle RH)
    const rhPermission = (!isSelf && !isBureauOrAdmin)
      ? await prisma.permission.findFirst({ where: { userId: req.user.id, pole: 'Ressources Humaines' } })
      : null;
    const hasRHAccess = isBureauOrAdmin || (rhPermission && rhPermission.level !== 'none');

    if (!isSelf && !isAdmin && !hasRHAccess) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { nom, prenom, email, emailPerso, emailPreferences, pole, statut, conges, competences, dispos, telephone, profileVolontaire, notesRH, commentairesRH, historiqueRH, projets, role, permissions } = req.body;
    const updateData = {};

    // Champs que chacun peut modifier (sur soi-même) ou admin sur n'importe qui
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    // nom est un identifiant système (utilisé dans tasks, conversations, notifications…)
    // Il ne peut être modifié que par Admin/Bureau pour éviter de casser les références
    if (nom !== undefined && isBureauOrAdmin) updateData.nom = nom;
    if (conges !== undefined) updateData.conges = conges;
    if (emailPerso !== undefined) updateData.emailPerso = emailPerso || null;
    if (emailPreferences !== undefined) updateData.emailPreferences = emailPreferences;
    if (competences !== undefined) updateData.competences = competences;
    if (dispos !== undefined) updateData.dispos = dispos;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (profileVolontaire !== undefined) updateData.profileVolontaire = profileVolontaire;
    if (statut !== undefined) updateData.statut = statut;

    // Champs RH : accessibles par Bureau/Admin et éditeurs RH
    if (hasRHAccess || isAdmin) {
      if (notesRH !== undefined) updateData.notesRH = notesRH;
      if (commentairesRH !== undefined) updateData.commentairesRH = commentairesRH;
      if (historiqueRH !== undefined) updateData.historiqueRH = historiqueRH;
    }

    // Champs réservés aux admins et bureau (ex: handleSaveTeam sync pôle/projets)
    if (isBureauOrAdmin) {
      if (pole !== undefined) updateData.pole = pole;
      if (projets !== undefined) updateData.projets = projets;
    }

    // Champs réservés aux admins uniquement
    if (isAdmin) {
      if (role !== undefined) updateData.role = role;
    }

    // Auto-log changement de statut dans l'historique RH
    if (statut !== undefined || conges !== undefined) {
      const existing = await prisma.user.findUnique({ where: { id: targetId }, select: { statut: true, historiqueRH: true } });
      const existingStatut = existing?.statut;
      const existingHistorique = Array.isArray(existing?.historiqueRH) ? existing.historiqueRH : [];

      // Statut explicitement changé
      if (statut !== undefined && statut !== existingStatut) {
        existingHistorique.push({
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          texte: `Statut : ${existingStatut} → ${statut}`,
          type: 'statut',
        });
        updateData.historiqueRH = existingHistorique;
      }

      // Congé ajouté ou terminé (via modification des congés)
      if (conges !== undefined && !statut) {
        const today = new Date().toISOString().split('T')[0];
        const newActiveConge = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
        const wasOnConge = existingStatut === 'En congé';
        if (newActiveConge && !wasOnConge) {
          existingHistorique.push({ id: Date.now().toString() + 'c', createdAt: new Date().toISOString(), texte: `Début de congé (${newActiveConge.debut}${newActiveConge.fin ? ` → ${newActiveConge.fin}` : ', durée indéterminée'})`, type: 'statut' });
          updateData.historiqueRH = existingHistorique;
        } else if (!newActiveConge && wasOnConge) {
          existingHistorique.push({ id: Date.now().toString() + 'e', createdAt: new Date().toISOString(), texte: `Fin de congé anticipée`, type: 'statut' });
          updateData.historiqueRH = existingHistorique;
        }
      }
    }

    // Lire les valeurs actuelles avant la mise à jour pour l'audit
    const beforeUpdate = (updateData.role !== undefined || updateData.pole !== undefined || updateData.nom !== undefined)
      ? await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, pole: true, nom: true } })
      : null;

    await prisma.user.update({ where: { id: targetId }, data: updateData });

    // Audit sur les changements sensibles : rôle, pôle, nom
    if (beforeUpdate) {
      const changes = {};
      if (updateData.role !== undefined && updateData.role !== beforeUpdate.role) changes.role = { from: beforeUpdate.role, to: updateData.role };
      if (updateData.pole !== undefined && updateData.pole !== beforeUpdate.pole) changes.pole = { from: beforeUpdate.pole, to: updateData.pole };
      if (updateData.nom  !== undefined && updateData.nom  !== beforeUpdate.nom)  changes.nom  = { from: beforeUpdate.nom,  to: updateData.nom };
      if (Object.keys(changes).length > 0) {
        await auditLog(req, {
          action: 'user.update',
          targetType: 'User', targetId, targetNom: beforeUpdate.nom,
          payload: changes,
        });
      }
    }

    // Mise à jour des permissions (admin seulement)
    if (isAdmin && permissions) {
      await prisma.permission.deleteMany({ where: { userId: targetId } });
      const permsToCreate = Object.entries(permissions).map(([p, level]) => ({
        userId: targetId, pole: p, level,
      }));
      if (permsToCreate.length > 0) {
        await prisma.permission.createMany({ data: permsToCreate });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id: targetId },
      include: { permissions: true },
    });
    const { passwordHash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    log.error({ err, route: 'PATCH /users/:id' }, 'Erreur mise à jour utilisateur');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/users/:id/reset-password — génère un code temporaire (Admin only)
router.post('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Accès refusé' });
    const targetId = Number(req.params.id);
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = raw.slice(0, 4) + '-' + raw.slice(4);
    const passwordHash = await bcrypt.hash(code, 10);
    const target = await prisma.user.findUnique({ where: { id: targetId } }).catch(() => null);
    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash, mustChangePassword: true },
    });
    await auditLog(req, { action: 'user.resetPassword', targetType: 'User', targetId, targetNom: target?.nom });
    res.json({ code });
  } catch (err) {
    log.error({ err, route: 'POST /users/:id/reset-password' }, 'Erreur reset password');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/users/:id/trigger-tutorial — forcer le tutoriel à la prochaine connexion (Admin only)
router.post('/:id/trigger-tutorial', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Accès refusé' });
    const targetId = Number(req.params.id);
    await prisma.user.update({ where: { id: targetId }, data: { mustTakeTutorial: true } });
    res.json({ ok: true });
  } catch (err) {
    log.error({ err, route: 'POST /users/:id/trigger-tutorial' }, 'Erreur trigger tutorial');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/users/me/tutorial-done — marquer le tutoriel comme terminé (soi-même)
router.post('/me/tutorial-done', requireAuth, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { mustTakeTutorial: false } });
    res.json({ ok: true });
  } catch (err) {
    log.error({ err, route: 'POST /users/me/tutorial-done' }, 'Erreur tutorial done');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/users — créer un compte (Admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Accès refusé' });
    const { nom, prenom: prenomBody, email, pole, role = 'Lecteur', password } = req.body;
    if (!nom || !email || !pole || !password) return res.status(400).json({ error: 'Champs manquants' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    const passwordHash = await bcrypt.hash(password, 10);
    const prenom = prenomBody || nom.split(' ')[0] || '';
    const avatar = nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const user = await prisma.user.create({
      data: { nom, prenom, email, pole, role, passwordHash, avatar, dateInscription: new Date().toISOString().split('T')[0] },
      include: { permissions: true },
    });

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        actorId:    req.user.id,
        actorNom:   req.user.nom,
        action:     'user.create',
        targetId:   user.id,
        targetType: 'User',
        targetNom:  nom,
        payload:    { pole, role },
        ip:         req.ip,
      },
    });

    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    log.error({ err, route: 'POST /users' }, 'Erreur création utilisateur');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/users/:id — désactivation (soft delete, Admin only)
// Le compte est marqué isDeleted=true, toutes les données sont conservées.
// La suppression physique n'existe plus : aucune donnée n'est jamais détruite.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Accès refusé' });

    const targetId = Number(req.params.id);
    if (req.user.id === targetId)
      return res.status(400).json({ error: 'Impossible de désactiver son propre compte' });

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (target.isDeleted) return res.status(409).json({ error: 'Ce compte est déjà désactivé' });

    const { reason } = req.body;

    await prisma.$transaction([
      // 1. Soft delete
      prisma.user.update({
        where: { id: targetId },
        data: {
          isDeleted:    true,
          deletedAt:    new Date(),
          deletedBy:    req.user.id,
          deleteReason: reason || null,
          statut:       'Désactivé',
        },
      }),
      // 2. Invalider toutes les sessions actives
      prisma.refreshToken.deleteMany({ where: { userId: targetId } }),
      // 3. Révoquer toutes les permissions (accès bloqué même si le JWT est encore valide)
      prisma.permission.deleteMany({ where: { userId: targetId } }),
      // 4. Log d'audit immuable
      prisma.auditLog.create({
        data: {
          actorId:    req.user.id,
          actorNom:   req.user.nom,
          action:     'user.deactivate',
          targetId:   targetId,
          targetType: 'User',
          targetNom:  target.nom,
          payload:    { reason: reason || null, pole: target.pole, email: target.email },
          ip:         req.ip,
        },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    log.error({ err, route: 'DELETE /users/:id' }, 'Erreur désactivation utilisateur');
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
