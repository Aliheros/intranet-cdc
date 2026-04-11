/**
 * automationCron.js — Moteur d'automatisation
 *
 * Tourne chaque jour à 06:00.
 * Pour chaque règle active, recherche les actions dont la date de référence
 * (date_debut ou date_fin) est dans exactement N jours (triggerOffsetDays),
 * et crée une TaskRequest associée si ce n'est pas déjà fait.
 *
 * Auteur des TaskRequests créées automatiquement : "automatique"
 */

const cron   = require('node-cron');
const log    = require('./logger');
const prisma = require('./prisma');

// ─── Helpers date ─────────────────────────────────────────────────────────────

/** Retourne "YYYY-MM-DD" pour aujourd'hui (ou la date fournie) */
function toDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Calcule "YYYY-MM-DD" dans +N jours à partir d'aujourd'hui */
function dateInNDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ─── Cœur de l'automatisation ─────────────────────────────────────────────────

/**
 * Exécute une règle donnée.
 * @param {object} rule          — enregistrement AutomationRule
 * @param {object} [opts]
 * @param {string} [opts.forceToday]  — override "aujourd'hui" (YYYY-MM-DD) pour tests
 * @returns {{ triggered: number, skipped: number, errors: number }}
 */
async function runAutomationRule(rule, opts = {}) {
  const today        = opts.forceToday || toDateStr();
  const targetDate   = dateInNDays(rule.triggerOffsetDays); // date à laquelle la règle doit être déclenchée

  // On cherche les actions dont la date de référence === targetDate
  // et qui ne sont pas annulées/archivées
  const whereAction = {
    isArchived: false,
    statut: { not: 'Annulée' },
    [rule.triggerDateRef]: targetDate,
  };

  // Filtre optionnel par type d'action
  if (rule.actionTypeFilter && rule.actionTypeFilter.length > 0) {
    whereAction.type = { in: rule.actionTypeFilter };
  }

  const actions = await prisma.action.findMany({ where: whereAction, select: { id: true, etablissement: true, type: true, cycle: true, date_debut: true, date_fin: true } });

  let triggered = 0, skipped = 0, errors = 0;

  for (const action of actions) {
    try {
      // Vérifier si on a déjà déclenché cette règle pour cette action
      const existing = await prisma.automationExecution.findUnique({
        where: { ruleId_actionId: { ruleId: rule.id, actionId: action.id } },
      });
      if (existing) { skipped++; continue; }

      // Créer la TaskRequest
      const taskReq = await prisma.taskRequest.create({
        data: {
          text:        rule.taskText,
          description: rule.taskDescription || null,
          space:       rule.targetPole,
          actionId:    action.id,
          requestedBy: 'automatique',
          assignees:   [],
          targetPool:  [],
          deadline:    action.date_fin || action.date_debut || null,
          cycle:       action.cycle,
          status:      'pending',
        },
      });

      // Enregistrer l'exécution pour éviter les doublons
      await prisma.automationExecution.create({
        data: { ruleId: rule.id, actionId: action.id, taskRequestId: taskReq.id },
      });

      log.info({ ruleId: rule.id, actionId: action.id, taskRequestId: taskReq.id }, `[Automation] Règle "${rule.nom}" → TaskRequest créée pour "${action.etablissement}"`);
      triggered++;
    } catch (err) {
      log.error({ ruleId: rule.id, actionId: action.id, err }, `[Automation] Erreur pour action ${action.id}`);
      errors++;
    }
  }

  return { triggered, skipped, errors };
}

// ─── Runner global (toutes les règles actives) ────────────────────────────────

async function runAllAutomationRules(opts = {}) {
  let rules = [];
  try {
    rules = await prisma.automationRule.findMany({ where: { isActive: true } });
  } catch (err) {
    log.error({ err }, '[Automation] Impossible de charger les règles');
    return;
  }

  if (rules.length === 0) return;

  log.info(`[Automation] Démarrage — ${rules.length} règle(s) active(s)`);

  for (const rule of rules) {
    try {
      const result = await runAutomationRule(rule, opts);
      log.info({ ruleId: rule.id, ...result }, `[Automation] Règle "${rule.nom}" terminée`);
    } catch (err) {
      log.error({ ruleId: rule.id, err }, `[Automation] Erreur règle "${rule.nom}"`);
    }
  }
}

// ─── Planification cron ───────────────────────────────────────────────────────

function startAutomationCron() {
  // Tous les jours à 06:00
  cron.schedule('0 6 * * *', () => {
    log.info('[Automation] Cron 06:00 — lancement');
    runAllAutomationRules().catch(err => log.error({ err }, '[Automation] Erreur cron'));
  }, { timezone: 'Europe/Paris' });

  log.info('[Automation] Cron planifié (06:00 Europe/Paris)');
}

module.exports = { startAutomationCron, runAllAutomationRules, runAutomationRule };
