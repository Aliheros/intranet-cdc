// src/lib/spaceAuth.js
// Vérifie si un utilisateur est responsable d'un espace (pôle/projet).
// Consulte dans l'ordre : la table Permission (droits explicites)
// puis SpaceSettings.teams (composition de l'équipe en cours).

const prisma = require('./prisma');

/**
 * Retourne true si l'utilisateur est Responsable ou Direction de l'espace.
 *
 * @param {number|null} userId   — ID Prisma de l'utilisateur (req.user.id)
 * @param {string}      userNom  — Nom snapshot (req.user.nom)
 * @param {string}      space    — Nom du pôle / projet
 * @returns {Promise<boolean>}
 */
async function isSpaceResponsable(userId, userNom, space) {
  // 1. Table Permission — source de vérité pour les droits accordés explicitement
  if (userId) {
    const perm = await prisma.permission.findFirst({
      where: { userId, pole: space },
    });
    if (perm?.level === 'edit') return true;
  }

  // 2. SpaceSettings.teams — { "2025-2026": [{nom, role}, …], … }
  const teamSetting = await prisma.spaceSettings.findUnique({
    where: { space_key: { space, key: 'teams' } },
  });
  if (!teamSetting?.value) return false;

  return Object.values(teamSetting.value).some(
    yearTeam =>
      Array.isArray(yearTeam) &&
      yearTeam.some(
        m => m.nom === userNom && (m.role === 'Responsable' || m.role === 'Direction')
      )
  );
}

/**
 * Vérifie l'accès sur plusieurs espaces (OR logique).
 * Pratique pour les ressources qui appartiennent à plusieurs pôles (ex: événements multi-pôles).
 */
async function isSpaceResponsableAny(userId, userNom, spaces = []) {
  for (const space of spaces) {
    if (await isSpaceResponsable(userId, userNom, space)) return true;
  }
  return false;
}

module.exports = { isSpaceResponsable, isSpaceResponsableAny };
