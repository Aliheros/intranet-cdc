// src/routes/tasks.js
const express = require('express');
const { requireAuth }        = require('../middleware/auth');
const { auditLog }           = require('../middleware/auditLogger');
const { isSpaceResponsable } = require('../lib/spaceAuth');
const prisma = require('../lib/prisma');

const router = express.Router();

// ─── Task Requests ────────────────────────────────────────────────────────────
// (avant /:id pour éviter qu'Express capture "requests" comme un id)

router.get('/requests', requireAuth, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    // Admin/Bureau voient toutes les demandes ; les autres voient uniquement les leurs
    const where = isPrivileged ? {} : { requestedBy: req.user.nom };
    const requests = await prisma.taskRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(requests);
  } catch (err) {
    console.error('Erreur GET task requests:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

function pickTaskRequestFields(body) {
  const { text, description, space, actionId, requestedBy, assignees, targetPool, deadline, cycle, status } = body;
  return {
    text, description: description || '', space,
    actionId:   actionId   || null,
    requestedBy,
    assignees:  assignees  || [],
    targetPool: targetPool || [],
    deadline:   deadline   || null,
    cycle,
    status:     status     || 'En attente',
  };
}

router.post('/requests', requireAuth, async (req, res) => {
  try {
    const data = pickTaskRequestFields(req.body);
    data.requestedBy = req.user.nom; // forcer l'identité — empêche l'usurpation
    const request = await prisma.taskRequest.create({ data });
    res.status(201).json(request);
  } catch (err) {
    console.error('Erreur POST task request:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/requests/:id', requireAuth, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    if (isNaN(reqId)) return res.status(400).json({ error: 'ID invalide' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      const existing = await prisma.taskRequest.findUnique({ where: { id: reqId } });
      if (!existing) return res.status(404).json({ error: 'Demande introuvable' });
      const isOwner   = existing.requestedBy === req.user.nom;
      const spaceResp = await isSpaceResponsable(req.user.id, req.user.nom, existing.space);
      if (!isOwner && !spaceResp) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }

    const request = await prisma.taskRequest.update({
      where: { id: reqId },
      data:  pickTaskRequestFields(req.body),
    });
    res.json(request);
  } catch (err) {
    console.error('Erreur PUT task request:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// Seul Admin/Bureau ou le responsable de l'espace peut gérer les demandes
router.delete('/requests/:id', requireAuth, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    if (isNaN(reqId)) return res.status(400).json({ error: 'ID invalide' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      const taskReq = await prisma.taskRequest.findUnique({ where: { id: reqId } });
      if (!taskReq) return res.status(404).json({ error: 'Demande introuvable' });
      const spaceResp = await isSpaceResponsable(req.user.id, req.user.nom, taskReq.space);
      if (!spaceResp) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }
    await prisma.taskRequest.delete({ where: { id: reqId } });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE task request:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const { cycle, space } = req.query;
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';

    const where = {};
    if (cycle) where.cycle = cycle;
    if (space) where.space = space;

    // Non-privilégiés : uniquement leur pôle + tâches où ils sont créateurs ou assignés
    if (!isPrivileged && !space) {
      where.OR = [
        { space: req.user.pole },
        { createdBy: req.user.nom },
        // Prisma ne supporte pas jsonPath sur assignees[] directement → on filtre post-query
      ];
    }

    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Filtrage post-query : inclure aussi les tâches où l'utilisateur est assigné
    // (Prisma ne supporte pas le filtre JSON contains de façon portable)
    if (!isPrivileged && !space) {
      const nom = req.user.nom;
      const seen = new Set(tasks.map(t => t.id));
      const assignedTasks = await prisma.task.findMany({
        where: {
          ...(cycle ? { cycle } : {}),
          id: { notIn: seen.size > 0 ? [...seen] : [-1] },
        },
      });
      const filtered = assignedTasks.filter(t =>
        (t.assignees || []).some(a => a.name === nom)
      );
      return res.json([...tasks, ...filtered]);
    }

    res.json(tasks);
  } catch (err) {
    console.error('Erreur GET tasks:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

function pickTaskFields(body) {
  const {
    space, text, description, assignees, createdBy,
    lockedBy, forceCompletedBy, deadline, cycle,
    status, completedAt, actionId,
  } = body;
  return {
    space, text, description: description || null,
    assignees:        assignees        || [],
    createdBy:        createdBy        || '',
    lockedBy:         lockedBy         || null,
    forceCompletedBy: forceCompletedBy || null,
    deadline:         deadline         || null,
    cycle,
    status:           status           || 'À faire',
    completedAt:      completedAt      || null,
    actionId:         actionId ? Number(actionId) : null,
  };
}

router.post('/', requireAuth, async (req, res) => {
  const task = await prisma.task.create({ data: pickTaskFields(req.body) });
  res.status(201).json(task);
  auditLog(req, {
    action: 'task.create',
    targetType: 'Task', targetId: task.id, targetNom: task.text,
    payload: { space: task.space, cycle: task.cycle, assignees: (task.assignees || []).map(a => a.name) },
  });

  // ── Email aux assignés (best-effort, ne bloque pas la réponse) ────────────
  try {
    const assigneeNames = (req.body.assignees || []).map(a => a.name).filter(Boolean);
    if (assigneeNames.length > 0) {
      const { dispatchToUsers } = require('../services/mailer');
      const users = await prisma.user.findMany({ where: { nom: { in: assigneeNames } } });
      await dispatchToUsers({
        users,
        preferenceKey: 'taches',
        subject:  `[Intranet] Nouvelle tâche assignée : ${task.text}`,
        titre:    `Nouvelle tâche : ${task.text}`,
        contenu:  task.description
          ? `${task.description}\n\nEspace : ${task.space}${task.deadline ? `\nÉchéance : ${task.deadline}` : ''}`
          : `Vous avez été assigné(e) à cette tâche dans l'espace ${task.space}.${task.deadline ? `\nÉchéance : ${task.deadline}` : ''}`,
        ctaLabel: 'Voir la tâche',
      });
    }
  } catch (err) {
    console.error('[Tasks] Erreur dispatch email :', err.message);
  }
});

// PUT /tasks/:id — règles d'accès :
//   • Admin / Bureau          → accès complet
//   • Créateur de la tâche    → accès complet (force, lock, modify)
//   • Responsable de l'espace → accès complet
//   • Assigné (simple)        → peut uniquement mettre à jour son propre statut
//                               (champs: assignees, status, completedAt)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: 'ID invalide' });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const isCreator  = task.createdBy === req.user.nom;
    const isAssignee = (task.assignees || []).some(a => a.name === req.user.nom);

    let isSpaceResp = false;
    if (!isAdminOrBureau && !isCreator) {
      isSpaceResp = await isSpaceResponsable(req.user.id, req.user.nom, task.space);
    }

    const hasFullAccess = isAdminOrBureau || isCreator || isSpaceResp;

    if (!hasFullAccess && !isAssignee) {
      return res.status(403).json({ error: 'Accès refusé : vous n\'êtes ni assigné ni responsable de cette tâche' });
    }

    // Assigné sans accès complet : uniquement son propre statut de validation
    if (!hasFullAccess && isAssignee) {
      const ASSIGNEE_ALLOWED = new Set(['assignees', 'status', 'completedAt']);
      const bodyKeys = Object.keys(req.body).filter(k => !['id', 'updatedAt', 'createdAt'].includes(k));
      if (bodyKeys.some(k => !ASSIGNEE_ALLOWED.has(k))) {
        return res.status(403).json({ error: 'Un assigné ne peut que valider sa propre participation à la tâche' });
      }
    }

    const data  = pickTaskFields(req.body);
    const updated = await prisma.task.update({ where: { id: taskId }, data });
    res.json(updated);
  } catch (err) {
    console.error('Erreur PUT task:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /tasks/:id — Admin / Bureau / Responsable de l'espace / Créateur
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ error: 'ID invalide' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isAdminOrBureau) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return res.status(404).json({ error: 'Tâche introuvable' });

      const isCreator    = task.createdBy === req.user.nom;
      const isSpaceResp  = await isSpaceResponsable(req.user.id, req.user.nom, task.space);

      if (!isCreator && !isSpaceResp) {
        return res.status(403).json({ error: 'Suppression réservée au créateur ou aux responsables de l\'espace' });
      }
    }

    const toDelete = await prisma.task.findUnique({ where: { id: taskId }, select: { text: true, space: true, cycle: true } }).catch(() => null);
    await prisma.task.delete({ where: { id: taskId } });
    auditLog(req, {
      action: 'task.delete',
      targetType: 'Task', targetId: taskId, targetNom: toDelete?.text,
      payload: { space: toDelete?.space, cycle: toDelete?.cycle },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE task:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
