/**
 * seedAppConfig.js
 * Injecte les valeurs par défaut dans AppConfig si les clés sont absentes.
 * Idempotent — ne modifie jamais une clé existante.
 *
 * Structure d'un item de liste configurable :
 *   { value: string, label: string, renamedFrom?: string, archived?: boolean }
 *   - value  : identifiant stable, correspond à ce qui est stocké en DB (action.type, etc.)
 *   - label  : libellé affiché — modifiable
 *   - renamedFrom : ancien label si renommé (affiché discrètement)
 *   - archived : masqué des formulaires mais conservé pour les données existantes
 */

const prisma = require('./prisma');

const DEFAULTS = {
  types_action: [
    { value: 'Visite ponctuelle',                        label: 'Visite ponctuelle' },
    { value: 'Simulation Parlementaire — format long',   label: 'Simulation Parlementaire — format long' },
    { value: 'Simulation Parlementaire — format court',  label: 'Simulation Parlementaire — format court' },
    { value: 'Simulation COP',                           label: 'Simulation COP' },
    { value: 'Atelier Orientation',                      label: 'Atelier Orientation' },
    { value: 'Rencontre institutionnelle',               label: 'Rencontre institutionnelle' },
  ],

  niveaux_classe: [
    { value: 'Primaire',                  label: 'Primaire' },
    { value: 'Collège',                   label: 'Collège' },
    { value: 'Lycée',                     label: 'Lycée' },
    { value: 'Étudiants / Supérieur',     label: 'Étudiants / Supérieur' },
    { value: 'Jeunes déscolarisés',       label: 'Jeunes déscolarisés' },
    { value: 'Tous publics',              label: 'Tous publics' },
    { value: 'Autre',                     label: 'Autre' },
  ],

  labels_rep: [
    { value: 'Hors REP', label: 'Hors REP' },
    { value: 'REP',      label: 'REP' },
    { value: 'REP+',     label: 'REP+' },
  ],

  // Seuils d'alerte Analytics
  thresholds: {
    overloadTasks:       6,    // nb tâches actives avant surcharge bénévole
    annulationRateWarn:  25,   // % séances annulées
    budgetWarnPct:       80,   // % budget consommé avant alerte
    ndfBacklogWarn:      5,    // nb NDF en attente avant alerte
  },
};

async function seedAppConfig() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value, updatedBy: 'system' },
      update: {}, // ne rien écraser si déjà présent
    });
  }
  require('./logger').info('[AppConfig] Seed terminé');
}

module.exports = { seedAppConfig, DEFAULTS };
