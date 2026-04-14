/**
 * fileSyncer.js — Synchronisation du dossier uploads/ vers Google Drive
 *
 * Miroir incrémental : seuls les fichiers absents de Drive sont uploadés.
 * Les fichiers existants ne sont pas re-uploadés (optimisation bande passante).
 * Structure Drive : root/uploads/ et root/uploads/avatars/
 */

const fs   = require('fs');
const path = require('path');
const mime = require('mime');
const log  = require('./logger');
const { ensureFolder, uploadFile, listDriveFiles } = require('./driveClient');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Synchronise le dossier local uploads/ vers un dossier Drive.
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} rootFolderId — ID du dossier racine Drive
 */
async function syncUploadsFolder(drive, rootFolderId) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    log.warn('[FileSyncer] Dossier uploads/ introuvable, sync ignorée');
    return;
  }

  // Créer/retrouver le dossier uploads/ dans Drive
  const uploadsDriveFolder = await ensureFolder(drive, 'uploads', rootFolderId);

  // Construire la map des fichiers déjà présents sur Drive (évite les doublons)
  const existingFiles = await listDriveFiles(drive, uploadsDriveFolder);

  let uploaded = 0;
  let skipped  = 0;

  // ── Fichiers racine du dossier uploads/ ───────────────────────────────────
  const rootEntries = fs.readdirSync(UPLOADS_DIR);
  for (const entry of rootEntries) {
    const fullPath = path.join(UPLOADS_DIR, entry);
    const stat     = fs.statSync(fullPath);

    if (stat.isDirectory()) continue; // les sous-dossiers sont traités séparément
    if (entry === '.gitkeep') continue;

    if (existingFiles.has(entry)) {
      skipped++;
      continue;
    }

    try {
      const content  = fs.readFileSync(fullPath);
      const mimeType = mime.getType(entry) || 'application/octet-stream';
      await uploadFile(drive, { name: entry, mimeType, content, folderId: uploadsDriveFolder });
      uploaded++;
      log.debug(`[FileSyncer] Uploadé : ${entry}`);
    } catch (err) {
      log.error({ err, file: entry }, `[FileSyncer] Échec upload fichier : ${entry}`);
    }
  }

  // ── Sous-dossier avatars/ ─────────────────────────────────────────────────
  const avatarsDir = path.join(UPLOADS_DIR, 'avatars');
  if (fs.existsSync(avatarsDir)) {
    const avatarsDriveFolder = await ensureFolder(drive, 'avatars', uploadsDriveFolder);
    const existingAvatars    = await listDriveFiles(drive, avatarsDriveFolder);

    const avatarEntries = fs.readdirSync(avatarsDir);
    for (const entry of avatarEntries) {
      const fullPath = path.join(avatarsDir, entry);
      const stat     = fs.statSync(fullPath);
      if (stat.isDirectory()) continue;
      if (entry === '.gitkeep') continue;

      if (existingAvatars.has(entry)) {
        skipped++;
        continue;
      }

      try {
        const content  = fs.readFileSync(fullPath);
        const mimeType = mime.getType(entry) || 'image/jpeg';
        await uploadFile(drive, { name: entry, mimeType, content, folderId: avatarsDriveFolder });
        uploaded++;
        log.debug(`[FileSyncer] Avatar uploadé : ${entry}`);
      } catch (err) {
        log.error({ err, file: entry }, `[FileSyncer] Échec upload avatar : ${entry}`);
      }
    }
  }

  log.info({ uploaded, skipped }, '[FileSyncer] Sync uploads terminée');
}

module.exports = { syncUploadsFolder };
