const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const prisma          = require('../lib/prisma');

const router = express.Router();

// ─── Guard admin/bureau ───────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
    return res.status(403).json({ error: 'Accès réservé au bureau' });
  }
  next();
}

// GET /api/automation-rules — liste toutes les règles
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation-rules/:id — détail + dernières exécutions
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: Number(req.params.id) },
      include: { executions: { orderBy: { firedAt: 'desc' }, take: 20 } },
    });
    if (!rule) return res.status(404).json({ error: 'Règle introuvable' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation-rules — créer une règle
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nom, description, triggerOffsetDays, triggerDateRef, actionTypeFilter, targetPole, taskText, taskDescription } = req.body;
    if (!nom || triggerOffsetDays == null || !triggerDateRef || !targetPole || !taskText) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    if (!['date_debut', 'date_fin'].includes(triggerDateRef)) {
      return res.status(400).json({ error: 'triggerDateRef invalide' });
    }
    const rule = await prisma.automationRule.create({
      data: {
        nom,
        description: description || null,
        triggerOffsetDays: parseInt(triggerOffsetDays, 10),
        triggerDateRef,
        actionTypeFilter: Array.isArray(actionTypeFilter) ? actionTypeFilter : [],
        targetPole,
        taskText,
        taskDescription: taskDescription || null,
        createdBy: req.user.nom,
      },
    });
    auditLog(req, { action: 'automation.create', targetType: 'AutomationRule', targetId: rule.id, targetNom: rule.nom });
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/automation-rules/:id — modifier une règle
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nom, description, triggerOffsetDays, triggerDateRef, actionTypeFilter, targetPole, taskText, taskDescription, isActive } = req.body;

    if (triggerDateRef && !['date_debut', 'date_fin'].includes(triggerDateRef)) {
      return res.status(400).json({ error: 'triggerDateRef invalide' });
    }

    const data = {};
    if ('nom'               in req.body) data.nom               = nom;
    if ('description'       in req.body) data.description       = description || null;
    if ('triggerOffsetDays' in req.body) data.triggerOffsetDays = parseInt(triggerOffsetDays, 10);
    if ('triggerDateRef'    in req.body) data.triggerDateRef    = triggerDateRef;
    if ('actionTypeFilter'  in req.body) data.actionTypeFilter  = Array.isArray(actionTypeFilter) ? actionTypeFilter : [];
    if ('targetPole'        in req.body) data.targetPole        = targetPole;
    if ('taskText'          in req.body) data.taskText          = taskText;
    if ('taskDescription'   in req.body) data.taskDescription   = taskDescription || null;
    if ('isActive'          in req.body) data.isActive          = Boolean(isActive);

    const rule = await prisma.automationRule.update({ where: { id }, data });
    auditLog(req, { action: 'automation.update', targetType: 'AutomationRule', targetId: rule.id, targetNom: rule.nom });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/automation-rules/:id — supprimer une règle (et ses exécutions par cascade)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: 'Règle introuvable' });
    await prisma.automationRule.delete({ where: { id } });
    auditLog(req, { action: 'automation.delete', targetType: 'AutomationRule', targetId: id, targetNom: rule.nom });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation-rules/:id/run — déclencher manuellement (test/debug)
router.post('/:id/run', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { runAutomationRule } = require('../lib/automationCron');
    const id = Number(req.params.id);
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: 'Règle introuvable' });
    const result = await runAutomationRule(rule, { dryRun: false, forceToday: req.body.forceDate || null });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
