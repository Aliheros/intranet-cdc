/**
 * driveClient.js — Client Google Drive
 *
 * Authentification par Service Account (JSON key file).
 * Le chemin du fichier de clé est défini dans la variable d'environnement
 * GOOGLE_SERVICE_ACCOUNT_KEY_PATH. Ce fichier ne doit jamais être commité.
 *
 * Fonctions exportées :
 *   getDriveClient()                          → drive (google.drive v3 authentifié)
 *   ensureFolder(drive, name, parentId)       → folderId (crée si absent, idempotent)
 *   uploadFile(drive, { name, mimeType, content, folderId }) → fileId
 *   listDriveFiles(drive, folderId)           → Map<name, {id, size}>
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const log = require('./logger');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Cache du client pour éviter de recréer l'auth à chaque appel
let _driveClient = null;

/**
 * Retourne un client Drive authentifié via Service Account.
 * @returns {import('googleapis').drive_v3.Drive}
 */
async function getDriveClient() {
  if (_driveClient) return _driveClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) throw new Error('[DriveClient] GOOGLE_SERVICE_ACCOUNT_KEY_PATH non défini');

  const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`[DriveClient] Fichier de clé introuvable : ${resolvedPath}`);
  }

  const keyFile = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: SCOPES,
  });

  _driveClient = google.drive({ version: 'v3', auth });
  log.info('[DriveClient] Client Google Drive initialisé');
  return _driveClient;
}

/**
 * Trouve ou crée un sous-dossier par nom dans un dossier parent.
 * Idempotent — ne crée pas de doublons sur des runs successifs.
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} name
 * @param {string} parentId
 * @returns {Promise<string>} folderId
 */
async function ensureFolder(drive, name, parentId) {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `'${parentId}' in parents`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ].join(' and ');

  const { data } = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Créer le dossier
  const { data: folder } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  log.info(`[DriveClient] Dossier créé : "${name}" dans ${parentId}`);
  return folder.id;
}

/**
 * Crée ou met à jour un fichier dans un dossier Drive.
 * Si un fichier du même nom existe déjà, il est écrasé (update).
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {{ name: string, mimeType: string, content: Buffer, folderId: string }} opts
 * @returns {Promise<string>} fileId
 */
async function uploadFile(drive, { name, mimeType, content, folderId }) {
  // Chercher si le fichier existe déjà dans ce dossier
  const { data: existing } = await drive.files.list({
    q: `name = '${name.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  const { Readable } = require('stream');
  const body = Readable.from(content);

  if (existing.files && existing.files.length > 0) {
    // Mise à jour du fichier existant
    const fileId = existing.files[0].id;
    await drive.files.update({
      fileId,
      media: { mimeType, body },
    });
    return fileId;
  }

  // Création du fichier
  const { data: file } = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body },
    fields: 'id',
  });

  return file.id;
}

/**
 * Liste tous les fichiers d'un dossier Drive.
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} folderId
 * @returns {Promise<Map<string, {id: string, size: string}>>} Map name → {id, size}
 */
async function listDriveFiles(drive, folderId) {
  const map = new Map();
  let pageToken = null;

  do {
    const params = {
      q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name, size)',
      spaces: 'drive',
      pageSize: 1000,
    };
    if (pageToken) params.pageToken = pageToken;

    const { data } = await drive.files.list(params);
    (data.files || []).forEach(f => map.set(f.name, { id: f.id, size: f.size }));
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return map;
}

// Réinitialise le cache (utile pour les tests)
function resetClient() {
  _driveClient = null;
}

module.exports = { getDriveClient, ensureFolder, uploadFile, listDriveFiles, resetClient };
