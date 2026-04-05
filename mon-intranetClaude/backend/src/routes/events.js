// src/routes/events.js
const express = require('express');
const { requireAuth }              = require('../middleware/auth');
const { auditLog }                 = require('../middleware/auditLogger');
const { isSpaceResponsableAny }    = require('../lib/spaceAuth');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { cycle } = req.query;
    const where = cycle ? { cycle } : {};
    const events = await prisma.evenement.findMany({ where, orderBy: { date: 'asc' } });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ev = await prisma.evenement.findUnique({ where: { id: Number(req.params.id) } });
    if (!ev) return res.status(404).json({ error: 'Événement introuvable' });
    res.json(ev);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

function pickEventFields(body) {
  const {
    titre, date, cycle, lieu, actionId, description,
    poles, projet, equipe, responsables, fichiers, statut, isArchived, whatsappLink, seances,
    responsableNom,
  } = body;
  return {
    titre, date, cycle,
    lieu:           lieu           || null,
    actionId:       actionId       || null,
    description:    description    || '',
    poles:          poles          || [],
    projet:         projet         || null,
    equipe:         equipe         || [],
    responsables:   responsables   || [],
    fichiers:       fichiers       || [],
    statut:         statut         || 'En cours',
    isArchived:     isArchived     || false,
    whatsappLink:   whatsappLink   || null,
    seances:        seances        || [],
    responsableNom: responsableNom || null,
  };
}

function validateEventConstraints(data, existingEquipe) {
  const equipe = data.equipe !== undefined ? (data.equipe || []) : (existingEquipe || []);
  if (data.responsables !== undefined) {
    const bad = (data.responsables || []).filter(r => !equipe.includes(r));
    if (bad.length > 0) {
      return `Les responsables suivants ne sont pas membres de l'équipe : ${bad.join(', ')}`;
    }
  }
  if (data.responsableNom && !equipe.includes(data.responsableNom)) {
    return 'Le responsable de validation doit être membre de l\'équipe de l\'événement.';
  }
  return null;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      // Space responsable d'un des pôles demandés peut créer
      const poles = Array.isArray(req.body.poles) ? req.body.poles : [];
      const canCreate = poles.length > 0 && await isSpaceResponsableAny(req.user.id, req.user.nom, poles);
      if (!canCreate) {
        return res.status(403).json({ error: 'Création d\'événements réservée au bureau ou aux responsables du pôle' });
      }
    }

    const data = pickEventFields(req.body);
    if (!data.titre || !data.date || !data.cycle) {
      return res.status(400).json({
        error: `Champs requis manquants : ${['titre', 'date', 'cycle'].filter(f => !data[f]).join(', ')}`,
      });
    }
    const err = validateEventConstraints(data, []);
    if (err) return res.status(400).json({ error: err });
    const ev = await prisma.evenement.create({ data });
    res.status(201).json(ev);
    auditLog(req, {
      action: 'event.create',
      targetType: 'Evenement', targetId: ev.id, targetNom: ev.titre,
      payload: { cycle: ev.cycle, poles: ev.poles, projet: ev.projet },
    });
  } catch (err) {
    console.error('Erreur création événement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /events/:id — règles d'accès :
//   • Admin / Bureau                       → accès complet
//   • Responsable d'un des pôles de l'evt  → accès complet
//   • Tout authentifié                     → self-service uniquement :
//       - s'ajouter / se retirer de equipe (uniquement soi-même)
//       - s'inscrire / se désinscrire d'une séance (uniquement soi-même)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.evenement.findUnique({ where: { id: eventId } });
    if (!existing) return res.status(404).json({ error: 'Événement introuvable' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    let hasFullAccess     = isAdminOrBureau;

    if (!hasFullAccess) {
      // Responsable d'un des pôles de l'événement
      const poles = Array.isArray(existing.poles) ? existing.poles : [];
      if (poles.length > 0) {
        hasFullAccess = await isSpaceResponsableAny(req.user.id, req.user.nom, poles);
      }
    }

    if (!hasFullAccess) {
      // Mode self-service : seuls equipe et seances sont autorisés
      const bodyKeys = Object.keys(req.body).filter(k =>
        !['id', 'updatedAt', 'createdAt'].includes(k)
      );
      const SELF_SERVICE = new Set(['equipe', 'seances']);
      if (bodyKeys.some(k => !SELF_SERVICE.has(k))) {
        return res.status(403).json({
          error: 'Seuls les responsables du pôle peuvent modifier un événement',
        });
      }

      // Vérifier que le membre ne modifie que sa propre participation dans equipe
      if (req.body.equipe !== undefined) {
        const oldEquipe = Array.isArray(existing.equipe) ? existing.equipe : [];
        const newEquipe = Array.isArray(req.body.equipe) ? req.body.equipe : [];
        const added   = newEquipe.filter(n => !oldEquipe.includes(n));
        const removed = oldEquipe.filter(n => !newEquipe.includes(n));
        const selfOnly = [...added, ...removed].every(n => n === req.user.nom);
        if (!selfOnly) {
          return res.status(403).json({
            error: 'Vous ne pouvez modifier que votre propre présence dans l\'équipe',
          });
        }
      }

      // Vérifier que dans seances, seul inscrits[] est modifié et uniquement pour soi
      if (req.body.seances !== undefined) {
        const oldSeances = Array.isArray(existing.seances) ? existing.seances : [];
        const newSeances = Array.isArray(req.body.seances) ? req.body.seances : [];
        for (const ns of newSeances) {
          const os = oldSeances.find(s => s.id === ns.id);
          if (!os) continue; // nouvelle séance créée — requiert accès complet, bloquer
          // Comparer tous les champs sauf inscrits
          const { inscrits: newInscrits, ...nsRest } = ns;
          const { inscrits: oldInscrits, ...osRest } = os;
          if (JSON.stringify(nsRest) !== JSON.stringify(osRest)) {
            return res.status(403).json({
              error: 'Seuls les responsables peuvent modifier le contenu des séances',
            });
          }
          // Vérifier que seul l'utilisateur lui-même est ajouté/retiré des inscrits
          const addedI   = (newInscrits || []).filter(n => !(oldInscrits || []).includes(n));
          const removedI = (oldInscrits || []).filter(n => !(newInscrits || []).includes(n));
          if ([...addedI, ...removedI].some(n => n !== req.user.nom)) {
            return res.status(403).json({
              error: 'Vous ne pouvez modifier que votre propre inscription à une séance',
            });
          }
        }
        // Bloquer l'ajout ou la suppression de séances (réservé aux responsables)
        if (newSeances.length !== oldSeances.length) {
          return res.status(403).json({
            error: 'Seuls les responsables peuvent ajouter ou supprimer des séances',
          });
        }
      }
    }

    // ── Appliquer la mise à jour ──────────────────────────────────────────────
    const full = pickEventFields(req.body);
    // N'inclure que les champs explicitement envoyés
    const data = {};
    Object.keys(req.body).forEach(k => { if (full[k] !== undefined) data[k] = full[k]; });
    // Préserver actionId si absent du body
    if (!('actionId' in req.body)) data.actionId = existing.actionId;

    // Valider les contraintes équipe → responsables → responsableNom
    const constraintErr = validateEventConstraints(data, existing.equipe);
    if (constraintErr) return res.status(400).json({ error: constraintErr });

    // Cascade automatique : si equipe change, nettoyer responsables et responsableNom
    if ('equipe' in data) {
      const finalEquipe = data.equipe || [];
      if ('responsables' in data || existing.responsables) {
        const currentResp = 'responsables' in data ? (data.responsables || []) : (existing.responsables || []);
        data.responsables = currentResp.filter(r => finalEquipe.includes(r));
      }
      const currentRespNom = 'responsableNom' in data ? data.responsableNom : existing.responsableNom;
      if (currentRespNom && !finalEquipe.includes(currentRespNom)) {
        data.responsableNom = null;
      }
    }

    const ev = await prisma.evenement.update({ where: { id: eventId }, data });
    res.json(ev);
    // Auditer uniquement les modifications structurelles (pas les self-service)
    if (hasFullAccess) {
      const changed = [];
      if (data.statut    && data.statut    !== existing.statut)    changed.push(`statut: ${existing.statut}→${data.statut}`);
      if (data.isArchived !== undefined && data.isArchived !== existing.isArchived) changed.push(`archivé: ${data.isArchived}`);
      auditLog(req, {
        action: 'event.update',
        targetType: 'Evenement', targetId: eventId, targetNom: existing.titre,
        payload: { changes: changed.length ? changed : undefined },
      });
    }
  } catch (err) {
    console.error('Erreur mise à jour événement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const eventId = Number(req.params.id);

    // Cascade : détacher les heures liées (ne pas supprimer)
    await prisma.hour.updateMany({ where: { eventId }, data: { eventId: null } }).catch(() => {});

    const toDelete = await prisma.evenement.findUnique({ where: { id: eventId } }).catch(() => null);
    await prisma.evenement.delete({ where: { id: eventId } });
    auditLog(req, {
      action: 'event.delete',
      targetType: 'Evenement', targetId: eventId, targetNom: toDelete?.titre,
      payload: { cycle: toDelete?.cycle, statut: toDelete?.statut },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur suppression événement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
