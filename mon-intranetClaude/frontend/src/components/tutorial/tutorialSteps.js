// src/components/tutorial/tutorialSteps.js
// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURATION DES ÉTAPES DU TUTORIEL
// Modifie ce fichier pour changer les textes, l'ordre, les cibles ou les pages.
//
// Propriétés disponibles par étape :
//   id         — identifiant unique (string)
//   title      — titre affiché dans le tooltip
//   body       — texte explicatif
//   target     — sélecteur CSS de l'élément à mettre en surbrillance
//                null = pas de spotlight, tooltip centré
//   navigate   — { page, subPage? } l'app navigue avant d'afficher l'étape
//                null = reste sur la page courante
//   placement  — 'top' | 'bottom' | 'left' | 'right' | 'center'
//   padding    — espace (px) autour du spotlight (défaut : 10)
// ──────────────────────────────────────────────────────────────────────────────

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenue sur l\'intranet !',
    body: 'Ce tutoriel te guide à travers les fonctionnalités essentielles en quelques minutes. Tu peux naviguer avec les boutons ci-dessous, appuyer sur les touches ← → ou appuyer sur Échap pour quitter à tout moment.',
    target: null,
    placement: 'center',
  },
  {
    id: 'sidebar',
    title: 'La navigation principale',
    body: 'La barre latérale donne accès à toutes les sections : terrain, équipe, gestion. Tes pôles et projets apparaissent en bas. Sur mobile, un bouton hamburger l\'ouvre.',
    target: '[data-tour="sidebar"]',
    navigate: null,
    placement: 'right',
    padding: 0,
  },
  {
    id: 'dashboard',
    title: 'Ton tableau de bord',
    body: 'Résumé personnalisé de ta journée : tâches assignées, prochains événements, notes de frais en attente et ton statut de présence. Tout ce dont tu as besoin en un coup d\'œil.',
    target: '[data-tour="dashboard-main"]',
    navigate: { page: 'dashboard' },
    placement: 'top',
  },
  {
    id: 'dashboard-tasks',
    title: 'Tes tâches personnelles',
    body: 'Les tâches qui te sont assignées dans tes pôles et projets apparaissent ici, groupées par espace. Un code couleur indique l\'urgence : rouge = dépassé, bleu = en cours.',
    target: '[data-tour="dashboard-tasks"]',
    navigate: { page: 'dashboard' },
    placement: 'top',
  },
  {
    id: 'planning',
    title: 'Planning & Calendrier',
    body: 'Vue globale de toutes les actions, événements, séances et tâches sur un calendrier. Bascule entre vue Mois, Semaine, Agenda et Timeline. Filtre par type ou par membre pour voir ton agenda personnel.',
    target: '[data-tour="planning-toolbar"]',
    navigate: { page: 'planning' },
    placement: 'bottom',
  },
  {
    id: 'actions',
    title: 'Suivi des actions',
    body: 'Chaque action terrain est suivie ici : statut, responsables, checklist, bilan. Les actions en retard sont signalées automatiquement. Tu peux aussi voir l\'historique et les archives.',
    target: '[data-tour="actions-list"]',
    navigate: { page: 'actions' },
    placement: 'right',
  },
  {
    id: 'coordination',
    title: 'Coordination des événements',
    body: 'Organise les événements et leurs séances. Rejoins l\'équipe, inscris-toi à une séance, consulte les bilans. Chaque événement peut être lié à une action terrain.',
    target: '[data-tour="events-list"]',
    navigate: { page: 'coordination' },
    placement: 'right',
  },
  {
    id: 'annuaire',
    title: 'L\'annuaire & RH',
    body: 'Retrouve tous les membres, leurs coordonnées, compétences et disponibilités. Tu peux aussi consulter et postuler aux offres de missions disponibles dans l\'association.',
    target: '[data-tour="annuaire-main"]',
    navigate: { page: 'annuaire' },
    placement: 'top',
  },
  {
    id: 'messagerie',
    title: 'La messagerie',
    body: 'Échange avec les membres par pôle, en groupe ou en direct. Utilise @nom pour mentionner quelqu\'un et lui envoyer une notification. Tu peux aussi partager des fichiers.',
    target: '[data-tour="messagerie-main"]',
    navigate: { page: 'messagerie' },
    placement: 'top',
  },
  {
    id: 'ndf',
    title: 'Notes de frais',
    body: 'Soumets tes frais de déplacement, repas, hébergement ou matériel. Tu peux suivre l\'état de validation et consulter l\'historique de tes remboursements.',
    target: '[data-tour="ndf-main"]',
    navigate: { page: 'notefrais' },
    placement: 'top',
  },
  {
    id: 'done',
    title: 'Tu es prêt !',
    body: 'Tu connais maintenant les bases de l\'intranet. Explore les pôles et projets auxquels tu appartiens dans la sidebar. N\'hésite pas à relancer ce tutoriel depuis les Permissions si besoin.',
    target: null,
    placement: 'center',
  },
];
