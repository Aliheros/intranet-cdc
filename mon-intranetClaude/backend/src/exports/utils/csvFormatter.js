/**
 * csvFormatter.js — Utilitaires de formatage CSV
 *
 * Reprend et étend les helpers toCSV/esc de admin.js.
 * Utilisé par tous les exporteurs CSV.
 */

/**
 * Échappe une valeur pour l'inclusion dans un CSV Excel-compatible.
 * @param {*} v
 * @returns {string}
 */
const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

/**
 * Génère un CSV UTF-8 avec BOM (compatible Excel).
 * @param {object[]} rows   — tableau d'objets plats
 * @param {string[]} headers — ordre et sélection des colonnes
 * @returns {string}
 */
function toCSV(rows, headers) {
  return (
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
    ].join('\r\n')
  );
}

/**
 * Sérialise un tableau d'objets en JSON indenté (Buffer UTF-8).
 * @param {*} data
 * @returns {Buffer}
 */
function toJSON(data) {
  return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Aplatit récursivement un objet imbriqué en notation pointée.
 * Ex : { bilan: { note: 3 } } → { 'bilan.note': 3 }
 * Utile pour les champs JSON si on souhaite les décomposer en colonnes.
 * @param {object} obj
 * @param {string} [prefix]
 * @returns {object}
 */
function flattenJson(obj, prefix = '') {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return { [prefix]: Array.isArray(obj) ? obj.join('; ') : obj };
  }
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    Object.assign(acc, flattenJson(val, fullKey));
    return acc;
  }, {});
}

/**
 * Convertit un Buffer ou une chaîne en Buffer UTF-8 avec BOM pour CSV.
 * @param {string} csvString
 * @returns {Buffer}
 */
function csvToBuffer(csvString) {
  return Buffer.from(csvString, 'utf8');
}

module.exports = { esc, toCSV, toJSON, flattenJson, csvToBuffer };
