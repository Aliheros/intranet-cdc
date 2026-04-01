// src/middleware/auditLogger.js
// Helper léger pour écrire dans l'AuditLog sans dupliquer le code dans chaque route.
// L'échec d'un log d'audit ne doit JAMAIS faire échouer la requête principale.

const prisma = require('../lib/prisma');

/**
 * Enregistre une entrée dans l'AuditLog.
 *
 * @param {import('express').Request} req  — requête Express (pour actorId, actorNom, ip)
 * @param {object} opts
 * @param {string}      opts.action      — identifiant de l'action  ex: "user.create"
 * @param {string}      [opts.targetType]— type de ressource         ex: "User"
 * @param {number}      [opts.targetId]  — ID de la ressource
 * @param {string}      [opts.targetNom] — libellé lisible de la cible
 * @param {object|null} [opts.payload]   — contexte additionnel (diff, motif…)
 */
const auditLog = async (req, { action, targetType = null, targetId = null, targetNom = null, payload = null }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    req.user?.id    ?? null,
        actorNom:   req.user?.nom   ?? 'Système',
        action,
        targetType: targetType ?? '',
        targetId:   targetId ? Number(targetId) : null,
        targetNom:  targetNom ?? null,
        payload:    payload   ?? undefined,
        ip:         (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || null,
      },
    });
  } catch (err) {
    // Le log d'audit est best-effort : on loggue l'erreur mais on ne la propage pas
    console.error('[AuditLog] Échec enregistrement :', err.message);
  }
};

module.exports = { auditLog };
