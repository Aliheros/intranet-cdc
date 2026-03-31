// src/lib/notifHelper.js
// Helper best-effort pour créer des notifications système depuis les routes backend.
// L'échec d'une notification ne doit JAMAIS faire échouer la requête principale.

const prisma = require('./prisma');

/**
 * Crée une notification en base de données (best-effort, ne lève jamais).
 *
 * @param {object} opts
 * @param {string}   opts.titre        — titre de la notification
 * @param {string}   opts.contenu      — contenu texte
 * @param {string}   opts.auteur       — nom de l'auteur (ex: 'Système')
 * @param {string}   [opts.cible]      — 'tous' | 'pole' | 'personnes'  (défaut: 'tous')
 * @param {string[]} [opts.targetPoles]— pôles ciblés (si cible === 'pole')
 * @param {string[]} [opts.targetUsers]— noms ciblés  (si cible === 'personnes')
 * @param {string}   [opts.priorite]   — 'normale' | 'haute'            (défaut: 'normale')
 * @param {string}   [opts.source]     — 'system' | 'bureau'            (défaut: 'system')
 */
const createNotif = async ({
  titre,
  contenu,
  auteur = 'Système',
  cible = 'tous',
  targetPoles = [],
  targetUsers = [],
  priorite = 'normale',
  source = 'system',
}) => {
  try {
    await prisma.notification.create({
      data: {
        titre,
        contenu,
        auteur,
        date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        cible,
        targetPoles,
        targetUsers,
        priorite,
        source,
      },
    });
  } catch (err) {
    console.error('[Notif] Échec création notification :', err.message);
  }
};

module.exports = { createNotif };
