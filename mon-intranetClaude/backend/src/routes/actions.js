const express = require('express');

const { requireAuth }        = require('../middleware/auth');
const { createNotif }        = require('../lib/notifHelper');
const { auditLog }           = require('../middleware/auditLogger');
const { isSpaceResponsable, isSpaceResponsableAny } = require('../lib/spaceAuth');

const router = express.Router();
const prisma = require('../lib/prisma');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { cycle } = req.query;
    const where = cycle ? { cycle } : {};
    const actions = await prisma.action.findMany({ where, orderBy: { date_debut: 'asc' } });
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const action = await prisma.action.findUnique({ where: { id: Number(req.params.id) } });
    if (!action) return res.status(404).json({ error: 'Action introuvable' });
    res.json(action);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

function pickActionFields(body) {
  const {
    type, etablissement, ville, contact_nom, contact_email, contact_tel,
    date_debut, date_fin, cycle, responsables, statut, notes, projet,
    beneficiaires, type_classe, heures, isArchived, budgetPrevisionnel,
    depensesReelles, transactionId, polesNotifies, checklist, bilan,
    timeline, completionScore,
  } = body;
  return {
    type, etablissement, ville: ville || null, contact_nom, contact_email, contact_tel,
    date_debut: date_debut || null, date_fin: date_fin || null, cycle,
    responsables: responsables || [],
    statut: statut || 'Planifiée',
    notes, projet, beneficiaires: parseInt(beneficiaires, 10) || 0,
    type_classe, heures: parseFloat(heures) || 0,
    isArchived: isArchived || false,
    budgetPrevisionnel: budgetPrevisionnel || 0,
    depensesReelles: depensesReelles || 0,
    transactionId: transactionId || null,
    polesNotifies: polesNotifies || [],
    checklist: checklist || null,
    bilan: bilan || null,
    timeline: timeline || [],
    completionScore: completionScore || 0,
  };
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      // Space responsable d'un des pôles ou du projet peut créer
      const poles  = Array.isArray(req.body.polesNotifies) ? req.body.polesNotifies : [];
      const projet = req.body.projet || null;
      let canCreate = false;
      if (poles.length > 0)  canCreate = await isSpaceResponsableAny(req.user.id, req.user.nom, poles);
      if (!canCreate && projet) canCreate = await isSpaceResponsable(req.user.id, req.user.nom, projet);
      if (!canCreate) {
        return res.status(403).json({ error: 'Création d\'actions réservée au bureau ou aux responsables du pôle' });
      }
    }

    const { type, etablissement, cycle } = req.body;
    const missing = [];
    if (!type) missing.push('type');
    if (!etablissement) missing.push('établissement');
    if (!cycle) missing.push('cycle');
    if (missing.length > 0) {
      return res.status(400).json({ error: `Champs requis manquants : ${missing.join(', ')}` });
    }
    const data = pickActionFields(req.body);
    const action = await prisma.action.create({ data });
    res.status(201).json(action);

    auditLog(req, {
      action: 'action.create',
      targetType: 'Action', targetId: action.id, targetNom: action.etablissement,
      payload: { type: action.type, cycle: action.cycle, statut: action.statut },
    });

    // Notifier les pôles demandés (best-effort)
    if (Array.isArray(action.polesNotifies) && action.polesNotifies.length > 0) {
      createNotif({
        titre: `Nouvelle action : ${action.etablissement}`,
        contenu: `Une nouvelle action ${action.type} a été planifiée${action.ville ? ` à ${action.ville}` : ''} pour le cycle ${action.cycle}. Pôles concernés : ${action.polesNotifies.join(', ')}.`,
        auteur: req.user.nom,
        cible: 'pole',
        targetPoles: action.polesNotifies,
        priorite: 'normale',
      });
    }
  } catch (err) {
    console.error('Erreur création action:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /:id — règles d'accès :
//   • Admin / Bureau                → accès complet
//   • Créateur (dans responsables)  → accès complet
//   • Responsable du pôle/projet    → accès complet
//   • Tout authentifié              → peut uniquement ajouter/retirer son propre nom de responsables
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const actionId = Number(req.params.id);
    if (isNaN(actionId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.action.findUnique({ where: { id: actionId } });
    if (!existing) return res.status(404).json({ error: 'Action introuvable' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const isCreator = (existing.responsables || []).includes(req.user.nom);

    let isSpaceResp = false;
    if (!isAdminOrBureau && !isCreator && existing.projet) {
      isSpaceResp = await isSpaceResponsable(req.user.id, req.user.nom, existing.projet);
    }
    if (!isAdminOrBureau && !isCreator && !isSpaceResp && existing.poles?.length) {
      for (const pole of existing.poles || []) {
        if (await isSpaceResponsable(req.user.id, req.user.nom, pole)) { isSpaceResp = true; break; }
      }
    }

    const hasFullAccess = isAdminOrBureau || isCreator || isSpaceResp;

    if (!hasFullAccess) {
      // Mode self-service : seul responsables peut être modifié (ajout/retrait de soi-même)
      const bodyKeys = Object.keys(req.body).filter(k => !['id', 'updatedAt', 'createdAt'].includes(k));
      if (bodyKeys.some(k => k !== 'responsables')) {
        return res.status(403).json({ error: 'Seuls les responsables ou le bureau peuvent modifier une action' });
      }
      const oldResp = Array.isArray(existing.responsables) ? existing.responsables : [];
      const newResp = Array.isArray(req.body.responsables) ? req.body.responsables : [];
      const added   = newResp.filter(n => !oldResp.includes(n));
      const removed = oldResp.filter(n => !newResp.includes(n));
      if ([...added, ...removed].some(n => n !== req.user.nom)) {
        return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre présence dans les responsables' });
      }
      const action = await prisma.action.update({ where: { id: actionId }, data: { responsables: newResp } });
      return res.json(action);
    }

    const data = pickActionFields(req.body);
    const action = await prisma.action.update({ where: { id: actionId }, data });
    res.json(action);
  } catch (err) {
    console.error('Erreur mise à jour action:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const actionId = Number(req.params.id);

    // ── Cascade : annuler la transaction liée (ne pas supprimer, juste détacher)
    const action = await prisma.action.findUnique({ where: { id: actionId } });
    if (action?.transactionId) {
      await prisma.transaction.update({
        where: { id: action.transactionId },
        data: { statut: 'Annulé', libelle: `[ACTION SUPPRIMÉE] ${action.etablissement}` },
      }).catch(() => {});
    }

    // ── Cascade : supprimer les tâches liées
    await prisma.task.deleteMany({ where: { actionId } }).catch(() => {});

    // ── Cascade : détacher les heures liées (mettre actionId à null)
    await prisma.hour.updateMany({ where: { actionId }, data: { actionId: null } }).catch(() => {});

    // ── Cascade : nettoyer linkedActionId sur NDFs
    await prisma.noteFrais.updateMany({
      where: { linkedActionId: actionId },
      data: { linkedActionId: null },
    }).catch(() => {});

    // ── Supprimer l'action
    await prisma.action.delete({ where: { id: actionId } });
    auditLog(req, {
      action: 'action.delete',
      targetType: 'Action', targetId: actionId, targetNom: action?.etablissement,
      payload: { cycle: action?.cycle, statut: action?.statut },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur suppression action:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
