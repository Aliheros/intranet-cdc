const express = require('express');

const { requireAuth }        = require('../middleware/auth');
const { createNotif }        = require('../lib/notifHelper');
const { isSpaceResponsable } = require('../lib/spaceAuth');
const { auditLog }           = require('../middleware/auditLogger');
const prisma = require('../lib/prisma');

const router = express.Router();

// Whitelist explicite — protège contre l'injection de champs Prisma (id, createdAt, etc.)
function pickMissionFields(body) {
  const {
    titre, pole, projet, type, description, competences, duree,
    urgence, statut, createdBy, createdAt, linkedActionId,
    responsable, dateDebut, dateFin, candidatures,
  } = body;
  return {
    titre,
    pole,
    projet:        projet        || null,
    type,
    description,
    competences:   Array.isArray(competences)  ? competences  : [],
    duree:         duree         || null,
    urgence:       urgence       || 'normale',
    statut:        statut        || 'Ouverte',
    createdBy:     createdBy     || '',
    createdAt:     createdAt     || new Date().toISOString().split('T')[0],
    linkedActionId: linkedActionId ? Number(linkedActionId) : null,
    responsable:   responsable   || null,
    dateDebut:     dateDebut     || null,
    dateFin:       dateFin       || null,
    candidatures:  Array.isArray(candidatures) ? candidatures : [],
  };
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const missions = await prisma.mission.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(missions);
  } catch (err) {
    console.error('Erreur GET missions:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      const pole = req.body.pole;
      const canCreate = pole && await isSpaceResponsable(req.user.id, req.user.nom, pole);
      if (!canCreate) {
        return res.status(403).json({ error: 'Création de missions réservée au bureau ou aux responsables du pôle' });
      }
    }

    const data = pickMissionFields(req.body);
    if (!data.titre || !data.pole || !data.type || !data.description) {
      return res.status(400).json({ error: 'Champs requis manquants (titre, pole, type, description)' });
    }
    const mission = await prisma.mission.create({ data });
    res.status(201).json(mission);

    auditLog(req, {
      action: 'mission.create',
      targetType: 'Mission', targetId: mission.id, targetNom: mission.titre,
      payload: { pole: mission.pole, type: mission.type, urgence: mission.urgence },
    });

    // Notifier les membres du pôle concerné
    createNotif({
      titre: `Nouvelle mission : ${mission.titre}`,
      contenu: `Une nouvelle mission a été publiée dans le pôle ${mission.pole}${mission.urgence === 'haute' ? ' (urgente)' : ''} : ${mission.description.slice(0, 120)}${mission.description.length > 120 ? '…' : ''}`,
      auteur: mission.createdBy || 'Système',
      cible: 'pole',
      targetPoles: [mission.pole],
      priorite: mission.urgence === 'haute' ? 'haute' : 'normale',
    });
  } catch (err) {
    console.error('Erreur POST mission:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /:id — règles d'accès :
//   • Admin / Bureau               → accès complet (tout modifier, y compris statuts candidatures)
//   • Créateur / Responsable pôle  → peut modifier les champs mission, clôturer, mais PAS les statuts candidatures
//   • Tout authentifié             → peut uniquement ajouter SA candidature (statut: 'En attente')
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const missionId = Number(req.params.id);
    if (isNaN(missionId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!existing) return res.status(404).json({ error: 'Mission introuvable' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const isCreator       = existing.createdBy === req.user.nom;
    let   isSpaceResp     = false;
    if (!isAdminOrBureau && !isCreator) {
      isSpaceResp = await isSpaceResponsable(req.user.id, req.user.nom, existing.pole);
    }
    const hasEditAccess = isAdminOrBureau || isCreator || isSpaceResp;

    const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = req.body;
    const newCandidatures = Array.isArray(rest.candidatures) ? rest.candidatures : null;
    const oldCandidatures = Array.isArray(existing.candidatures) ? existing.candidatures : [];

    if (!hasEditAccess) {
      // Mode candidature uniquement : seul l'ajout de SA propre candidature est permis
      if (!newCandidatures) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      // Vérifier que la seule différence est l'ajout d'une entrée au nom de l'utilisateur
      const added   = newCandidatures.filter(nc => !oldCandidatures.some(oc => oc.nom === nc.nom));
      const removed = oldCandidatures.filter(oc => !newCandidatures.some(nc => nc.nom === oc.nom));

      if (removed.length > 0) {
        return res.status(403).json({ error: 'Vous ne pouvez pas retirer la candidature d\'un autre membre' });
      }
      if (added.length !== 1 || added[0].nom !== req.user.nom) {
        return res.status(403).json({ error: 'Vous ne pouvez postuler qu\'en votre propre nom' });
      }
      // Vérifier que les candidatures existantes n'ont pas été modifiées
      const unchanged = newCandidatures.filter(nc => oldCandidatures.some(oc => oc.nom === nc.nom));
      for (const nc of unchanged) {
        const oc = oldCandidatures.find(c => c.nom === nc.nom);
        if (JSON.stringify(nc) !== JSON.stringify(oc)) {
          return res.status(403).json({ error: 'Vous ne pouvez pas modifier la candidature d\'un autre membre' });
        }
      }
      // Forcer le statut de la nouvelle candidature à 'En attente'
      const safeCandidatures = [...oldCandidatures, { ...added[0], statut: 'En attente' }];
      const mission = await prisma.mission.update({
        where: { id: missionId },
        data:  { candidatures: safeCandidatures },
      });
      res.json(mission);

      // Notifier le créateur/responsable d'une nouvelle candidature
      const notifyUsers = [existing.createdBy, existing.responsable].filter(Boolean);
      if (notifyUsers.length > 0) {
        createNotif({
          titre: 'Nouvelle candidature',
          contenu: `${req.user.nom} a candidaté pour la mission « ${existing.titre } » (${existing.pole}).`,
          auteur: req.user.nom,
          cible: 'personnes',
          targetUsers: [...new Set(notifyUsers)],
          priorite: 'normale',
        });
      }
      return;
    }

    // Accès complet : édition des champs mission
    const data = pickMissionFields({ ...existing, ...rest });

    if (!isAdminOrBureau) {
      // Créateur / responsable pôle : ne peut pas changer le statut des candidatures
      if (newCandidatures) {
        const statusChanged = newCandidatures.some(nc => {
          const oc = oldCandidatures.find(c => c.nom === nc.nom);
          return oc && oc.statut !== nc.statut;
        });
        if (statusChanged) {
          return res.status(403).json({ error: 'Seul le bureau peut accepter ou refuser des candidatures' });
        }
      }
      // Préserver les statuts existants
      data.candidatures = newCandidatures
        ? newCandidatures.map(nc => {
            const oc = oldCandidatures.find(c => c.nom === nc.nom);
            return oc ? { ...nc, statut: oc.statut } : { ...nc, statut: 'En attente' };
          })
        : oldCandidatures;
    }

    const mission = await prisma.mission.update({ where: { id: missionId }, data });
    res.json(mission);

    // ── Notifications post-mise à jour (Admin/Bureau uniquement ici) ──────────
    if (isAdminOrBureau && newCandidatures) {
      // Détecter les candidatures acceptées / refusées depuis ce PUT
      for (const nc of newCandidatures) {
        const oc = oldCandidatures.find(c => c.nom === nc.nom);
        if (!oc) continue;
        if (oc.statut === nc.statut) continue;

        if (nc.statut === 'Accepté') {
          createNotif({
            titre: 'Candidature acceptée',
            contenu: `Votre candidature pour la mission « ${mission.titre} » (${mission.pole}) a été acceptée !`,
            auteur: req.user.nom,
            cible: 'personnes',
            targetUsers: [nc.nom],
            priorite: 'haute',
          });
          auditLog(req, {
            action: 'mission.candidate.accept',
            targetType: 'Mission', targetId: mission.id, targetNom: mission.titre,
            payload: { candidat: nc.nom, pole: mission.pole },
          });
        } else if (nc.statut === 'Refusé') {
          createNotif({
            titre: 'Candidature refusée',
            contenu: `Votre candidature pour la mission « ${mission.titre} » (${mission.pole}) n'a pas été retenue.`,
            auteur: req.user.nom,
            cible: 'personnes',
            targetUsers: [nc.nom],
            priorite: 'normale',
          });
          auditLog(req, {
            action: 'mission.candidate.refuse',
            targetType: 'Mission', targetId: mission.id, targetNom: mission.titre,
            payload: { candidat: nc.nom, pole: mission.pole },
          });
        }
      }
    }

    // Détecter la clôture de la mission → notifier les candidats acceptés
    if (data.statut === 'Clôturée' && existing.statut !== 'Clôturée') {
      const acceptedNames = (mission.candidatures || [])
        .filter(c => c.statut === 'Accepté')
        .map(c => c.nom);
      if (acceptedNames.length > 0) {
        createNotif({
          titre: `Mission clôturée : ${mission.titre}`,
          contenu: `La mission « ${mission.titre} » est maintenant clôturée. Vous faites partie des membres sélectionnés.`,
          auteur: req.user.nom,
          cible: 'personnes',
          targetUsers: acceptedNames,
          priorite: 'normale',
        });
      }
    }
  } catch (err) {
    console.error('Erreur PUT mission:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const missionId = Number(req.params.id);
    const toDelete = await prisma.mission.findUnique({ where: { id: missionId } }).catch(() => null);
    await prisma.mission.delete({ where: { id: missionId } });
    auditLog(req, {
      action: 'mission.delete',
      targetType: 'Mission', targetId: missionId, targetNom: toDelete?.titre,
      payload: { pole: toDelete?.pole, statut: toDelete?.statut },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE mission:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
