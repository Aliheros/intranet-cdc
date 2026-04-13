/**
 * driveExportCron.js — Orchestrateur d'export automatique vers Google Drive
 *
 * Tourne chaque jour à 07:00 Europe/Paris (après l'automationCron à 06:00).
 * Pour chaque exporteur actif dans la configuration AppConfig (clé "google_drive_export"),
 * génère le fichier et l'envoie sur Google Drive.
 *
 * Stratégie best-effort : un exporteur en échec ne bloque pas les autres.
 * Chaque run est tracé dans AuditLog avec action "export.drive.run".
 */

const cron    = require('node-cron');
const log     = require('./logger');
const prisma  = require('./prisma');
const { getDriveClient, ensureFolder, uploadFile } = require('./driveClient');
const { getAllExporters } = require('../exports/index');
const { createNotif } = require('./notifHelper');
const { syncUploadsFolder } = require('./fileSyncer');

// ─── Exécution principale ────────────────────────────────────────────────────

/**
 * Lance un export complet vers Google Drive.
 * Peut être appelé depuis le cron ou manuellement via l'API admin.
 * @returns {Promise<{success: string[], failed: string[], skipped: string[], date: string}>}
 */
async function runDriveExport() {
  // 1. Charger la configuration depuis AppConfig
  let config = {};
  try {
    const configRow = await prisma.appConfig.findUnique({ where: { key: 'google_drive_export' } });
    config = configRow?.value || {};
  } catch (err) {
    log.error({ err }, '[DriveExport] Impossible de charger la configuration');
    return { success: [], failed: [], skipped: [], date: today(), error: 'config_error' };
  }

  if (!config.enabled) {
    log.info('[DriveExport] Export désactivé (enabled: false)');
    return { success: [], failed: [], skipped: [], date: today(), disabled: true };
  }

  const rootFolderId = config.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    log.error('[DriveExport] rootFolderId non configuré (AppConfig ni .env)');
    return { success: [], failed: [], skipped: [], date: today(), error: 'no_folder_id' };
  }

  const activeKeys       = config.activeExporters || [];   // liste vide = tous actifs
  const globalFormat     = config.format || 'csv';
  const formatOverrides  = config.formatOverrides || {};

  const dateStr = today();
  const [year, month, day] = dateStr.split('-');

  const results = { success: [], failed: [], skipped: [], date: dateStr };

  // 2. Authentification Drive
  let drive;
  try {
    drive = await getDriveClient();
  } catch (err) {
    log.error({ err }, '[DriveExport] Échec authentification Google Drive');
    await _auditRun({ ...results, error: 'auth_failed' });
    return { ...results, error: 'auth_failed' };
  }

  // 3. Créer/retrouver la hiérarchie de dossiers : root/YYYY/MM/DD
  let dayFolder;
  try {
    const yearFolder  = await ensureFolder(drive, year, rootFolderId);
    const monthFolder = await ensureFolder(drive, month, yearFolder);
    dayFolder         = await ensureFolder(drive, day, monthFolder);
  } catch (err) {
    log.error({ err }, '[DriveExport] Échec création arborescence de dossiers');
    await _auditRun({ ...results, error: 'folder_error' });
    return { ...results, error: 'folder_error' };
  }

  // 4. Exécuter chaque exporteur
  const exporters = getAllExporters();
  for (const exporter of exporters) {
    // Si activeKeys est renseigné, ne traiter que ceux listés
    if (activeKeys.length > 0 && !activeKeys.includes(exporter.key)) {
      results.skipped.push(exporter.key);
      continue;
    }

    const format   = formatOverrides[exporter.key] || globalFormat;
    const fileName = exporter.fileName(dateStr, format);
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';

    try {
      const content = await exporter.run(prisma, format);
      await uploadFile(drive, { name: fileName, mimeType, content, folderId: dayFolder });
      results.success.push(exporter.key);
      log.info(`[DriveExport] ${exporter.key} → OK (${fileName})`);
    } catch (err) {
      results.failed.push(exporter.key);
      log.error({ err, exporter: exporter.key }, `[DriveExport] Échec exporteur "${exporter.key}"`);
    }
  }

  // 5. Sync des fichiers uploadés (si activé)
  if (config.syncFiles) {
    try {
      await syncUploadsFolder(drive, rootFolderId);
      log.info('[DriveExport] Sync fichiers uploads → OK');
    } catch (err) {
      log.error({ err }, '[DriveExport] Échec sync uploads');
      results.failed.push('__file_sync__');
    }
  }

  // 6. Notification admin en cas d'échec partiel
  if (results.failed.length > 0 && (config.notifyUsers || []).length > 0) {
    await createNotif({
      titre: 'Échec export Google Drive',
      contenu: `${results.failed.length} export(s) en échec le ${dateStr} : ${results.failed.join(', ')}`,
      auteur: 'Système',
      cible: 'personnes',
      targetUsers: config.notifyUsers,
      priorite: 'haute',
      source: 'system',
    });
  }

  // 7. Audit trail
  await _auditRun(results);

  log.info({ success: results.success.length, failed: results.failed.length, skipped: results.skipped.length }, '[DriveExport] Run terminé');
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function _auditRun(results) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    null,
        actorNom:   'Système',
        action:     'export.drive.run',
        targetType: 'System',
        targetNom:  results.date,
        payload:    results,
        ip:         null,
      },
    });
  } catch (err) {
    log.error({ err }, '[DriveExport] Impossible d\'écrire dans AuditLog');
  }
}

// ─── Planification cron ───────────────────────────────────────────────────────

/**
 * Démarre le cron d'export automatique.
 * Le schedule peut être surchargé via AppConfig.google_drive_export.schedule
 * ou la variable d'environnement DRIVE_EXPORT_CRON (défaut: tous les jours à 07:00).
 */
function startDriveExportCron() {
  const expr = process.env.DRIVE_EXPORT_CRON || '0 7 * * *';

  cron.schedule(expr, () => {
    log.info('[DriveExport] Cron déclenché');
    runDriveExport().catch(err => log.error({ err }, '[DriveExport] Erreur non gérée dans runDriveExport'));
  }, { timezone: 'Europe/Paris' });

  log.info(`[DriveExport] Cron planifié (${expr} Europe/Paris)`);
}

module.exports = { startDriveExportCron, runDriveExport };
