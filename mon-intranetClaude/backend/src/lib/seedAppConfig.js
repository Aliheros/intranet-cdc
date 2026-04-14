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

  // Statuts d'action — value = code stocké en DB (IMMUABLE), label = libellé affiché
  statuts_action: [
    { value: 'Planifiée',  label: 'Planifiée' },
    { value: 'En cours',   label: 'En cours' },
    { value: 'Terminée',   label: 'Terminée' },
    { value: 'Annulée',    label: 'Annulée' },
  ],

  // Seuils d'alerte Analytics + Planning
  thresholds: {
    overloadTasks:       6,    // nb tâches actives avant surcharge bénévole
    annulationRateWarn:  25,   // % séances annulées
    budgetWarnPct:       80,   // % budget consommé avant alerte
    ndfBacklogWarn:      5,    // nb NDF en attente avant alerte
    planningAlertDays:   1,    // J-X pour les alertes dans le calendrier
  },

  // Règles de notification — true = activé
  notification_rules: {
    action_created:  true,
    ndf_soumise:     true,
    tache_assignee:  true,
    task_request:    true,
    action_terminee: true,
  },

  // Configuration export automatique Google Drive
  // enabled: false par défaut — à activer manuellement dans le panneau Admin
  google_drive_export: {
    enabled: false,
    schedule: '0 7 * * *',       // Tous les jours à 07:00 (Europe/Paris)
    format: 'csv',               // Format global : 'csv' | 'json'
    rootFolderId: '',            // ID du dossier Drive racine (requis pour activer)
    syncFiles: true,             // Synchroniser aussi les fichiers uploadés
    notifyUsers: [],             // Noms des admins à notifier en cas d'échec
    activeExporters: [           // Liste vide = tous les exporteurs actifs
      'users', 'actions', 'evenements', 'seancePresences',
      'transactions', 'notesFrais', 'devisFactures', 'heures',
      'missions', 'impactStudies', 'contacts', 'auditLogs',
      'tasks', 'taskRequests', 'budgets', 'faq',
      'dashboardMessages', 'appConfig', 'automationRules', 'notifications',
    ],
    formatOverrides: {           // Surcharger le format pour certains exporteurs
      appConfig:  'json',
      auditLogs:  'json',
    },
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
