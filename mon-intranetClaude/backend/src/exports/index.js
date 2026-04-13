/**
 * exports/index.js — Registre des exporteurs Google Drive
 *
 * Pattern registre : chaque fichier dans ./exporters/ appelle registerExporter()
 * à son chargement. L'auto-loader ci-dessous charge tous les fichiers du dossier.
 *
 * Forme d'un exporteur :
 * {
 *   key:           string    — identifiant unique (ex: 'users')
 *   label:         string    — libellé affiché dans l'UI admin
 *   defaultFormat: 'csv' | 'json'
 *   fileName:      (date: string, format: string) => string
 *   run:           async (prisma, format: string) => Buffer
 * }
 *
 * Pour ajouter un nouvel exporteur :
 *   1. Créer exports/exporters/monModele.js qui appelle registerExporter()
 *   2. L'auto-loader le détecte automatiquement au démarrage
 */

const fs = require('fs');
const path = require('path');

const exporters = [];

/**
 * Enregistre un exporteur dans le registre global.
 * @param {{ key: string, label: string, defaultFormat: string, fileName: Function, run: Function }} exporter
 */
function registerExporter(exporter) {
  if (!exporter.key || !exporter.label || !exporter.run || !exporter.fileName) {
    throw new Error(`[ExportRegistry] Exporteur invalide : ${JSON.stringify(exporter)}`);
  }
  if (exporters.find(e => e.key === exporter.key)) {
    throw new Error(`[ExportRegistry] Clé dupliquée : "${exporter.key}"`);
  }
  exporters.push(exporter);
}

/**
 * Retourne une copie du registre.
 * @returns {Array}
 */
function getAllExporters() {
  return [...exporters];
}

/**
 * Retourne un exporteur par sa clé.
 * @param {string} key
 * @returns {object|undefined}
 */
function getExporter(key) {
  return exporters.find(e => e.key === key);
}

// ── Exports AVANT l'auto-loader pour éviter les dépendances circulaires ──────
// Les fichiers exporteurs font `require('../index')` : module.exports doit déjà
// être défini au moment où ils s'exécutent.
module.exports = { registerExporter, getAllExporters, getExporter };

// ── Auto-loader : charge tous les fichiers de ./exporters/ ───────────────────
const exportersDir = path.join(__dirname, 'exporters');
fs
  .readdirSync(exportersDir)
  .filter(f => f.endsWith('.js'))
  .sort() // ordre alphabétique reproductible
  .forEach(f => {
    try {
      require(path.join(exportersDir, f));
    } catch (err) {
      // Ne pas crasher le serveur si un exporteur est malformé
      console.error(`[ExportRegistry] Erreur chargement ${f} : ${err.message}`);
    }
  });
