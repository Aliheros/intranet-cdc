// src/data/constants.js

export const POLES = [
  "Relations Publiques",
  "Ressources Humaines",
  "Plaidoyer",
  "Etudes",
  "Développement Financier",
  "Communication",
  "Trésorerie",
];

export const PROJETS = ["Parcours Citoyen", "Europe", "Orientation"];

export const TYPES_ACTION = [
  "Visite ponctuelle",
  "Simulation Parlementaire — format long",
  "Simulation Parlementaire — format court",
  "Simulation COP",
  "Atelier Orientation",
  "Rencontre institutionnelle",
];

export const TYPES_CLASSE = [
  "Collège",
  "Seconde",
  "Première",
  "Terminale",
  "Post-bac",
  "Mixte",
  "Autre",
];

export const STATUTS_ACTION = ["Planifiée", "En cours", "Terminée", "Annulée"];

export const GENERIC_ROLES = [
  "Bureau",
  "Direction",
  "Responsable",
  "Référent",
  "Membre",
];

export const POLE_COLORS = {
  "Relations Publiques": "#1a56db",
  "Ressources Humaines": "#7c3aed",
  "Plaidoyer": "#e63946",
  "Etudes": "#0891b2",
  "Développement Financier": "#16a34a",
  "Communication": "#ea580c",
  "Trésorerie": "#0f2d5e",
};

export const PROJET_COLORS = {
  "Parcours Citoyen": "#e63946",
  "Europe": "#1a56db",
  "Orientation": "#16a34a",
};

export const typeColor = {
  PDF: "#c0392b",
  DOCX: "#1a56db",
  XLSX: "#16a34a",
  PPTX: "#ea580c",
  PNG: "#0891b2",
  JPG: "#0891b2",
};

export const STATUT_STYLE = {
  "Planifiée": { bg: "#fef3c7", c: "#d97706" },
  "En cours": { bg: "#dbeafe", c: "#1d4ed8" },
  "Terminée": { bg: "#dcfce7", c: "#16a34a" },
  "Annulée": { bg: "#fee2e2", c: "#dc2626" },
};
export const NIVEAUX_CLASSE = [
  "Primaire",
  "Collège",
  "Lycée",
  "Étudiants / Supérieur",
  "Jeunes déscolarisés",
  "Tous publics",
  "Autre"
];

// Correspondance espace → préfixe CSS (gradient, header, tab-bar)
export const SPACE_CLASS_MAP = {
  'Europe':                  'europe',
  'Parcours Citoyen':        'parcours',
  'Orientation':             'orientation',
  'Relations Publiques':     'rp',
  'Ressources Humaines':     'rh',
  'Plaidoyer':               'plaidoyer',
  'Etudes':                  'etudes',
  'Développement Financier': 'devfin',
  'Communication':           'comm',
  'Trésorerie':              'treso',
};

// Correspondance page → préfixe CSS gradient pour les pages hors pôle/projet
export const PAGE_GRADIENT_MAP = {
  'actions':      'actions',
  'planning':     'planning',
  'annuaire':     'annuaire',
  'messagerie':   'messagerie',
  'analytics':    'analytics',
  'notefrais':    'notefrais',
  'devisFactures':'devis',
  'faq':          'faq',
  'bureau':       'bureau',
  'admin':        'admin',
};
