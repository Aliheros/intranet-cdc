const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const USERS_DATA = [
  { id: 1, nom: "Lauren Lolo", avatar: "LL", pole: "Relations Publiques", email: "lauren@citedeschances.com", role: "Admin", permissions: {} },
  { id: 2, nom: "Kevin Traoré", avatar: "KT", pole: "Plaidoyer", email: "kevin@citedeschances.com", role: "Éditeur", permissions: { "Relations Publiques": "edit", "Communication": "view", "Parcours Citoyen": "edit", "Europe": "view", "Orientation": "none", "Trésorerie": "none", "Ressources Humaines": "none", "Etudes": "view", "Plaidoyer": "edit", "Développement Financier": "none" } },
  { id: 3, nom: "Inès Margot", avatar: "IM", pole: "Communication", email: "ines@citedeschances.com", role: "Éditeur", permissions: { "Relations Publiques": "view", "Communication": "edit", "Parcours Citoyen": "view", "Europe": "edit", "Orientation": "edit", "Trésorerie": "none", "Ressources Humaines": "none", "Etudes": "view", "Plaidoyer": "view", "Développement Financier": "none" } },
  { id: 4, nom: "Aryles Attou", avatar: "AA", pole: "Trésorerie", email: "aryles@citedeschances.com", role: "Bureau", permissions: {} },
  { id: 5, nom: "Sonia Rahim", avatar: "SR", pole: "Ressources Humaines", email: "sonia@citedeschances.com", role: "Lecteur", permissions: { "Relations Publiques": "view", "Communication": "view", "Parcours Citoyen": "view", "Europe": "none", "Orientation": "none", "Trésorerie": "none", "Ressources Humaines": "edit", "Etudes": "none", "Plaidoyer": "none", "Développement Financier": "none" } },
  { id: 6, nom: "Djibril Koné", avatar: "DK", pole: "Relations Publiques", email: "djibril@citedeschances.com", role: "Éditeur", permissions: { "Relations Publiques": "edit", "Communication": "none", "Parcours Citoyen": "edit", "Europe": "none", "Orientation": "none", "Trésorerie": "none", "Ressources Humaines": "none", "Etudes": "none", "Plaidoyer": "none", "Développement Financier": "none" } },
  { id: 7, nom: "Laura Pizot", avatar: "LP", pole: "Etudes", email: "laura@citedeschances.com", role: "Éditeur", permissions: { "Relations Publiques": "view", "Communication": "view", "Parcours Citoyen": "edit", "Europe": "edit", "Orientation": "none", "Trésorerie": "none", "Ressources Humaines": "none", "Etudes": "edit", "Plaidoyer": "none", "Développement Financier": "none" } },
];

const ANNUAIRE_EXTRAS = {
  "lauren@citedeschances.com": { statut: "Actif", projets: ["Parcours Citoyen", "Orientation"], dateInscription: "01/09/2023", competences: ["Gestion de projet", "Animation", "Excel"], dispos: "Lundi-vendredi 18h-20h, week-ends", notesRH: "Présidente fondatrice. Référente sur toutes les décisions stratégiques." },
  "kevin@citedeschances.com": { statut: "Actif", projets: ["Parcours Citoyen"], dateInscription: "30/08/2025", competences: ["Animation d'ateliers", "Contact jeunes"], dispos: "Jeudi aprèm, Samedi", notesRH: "Besoin d'être formé sur l'outil de simulation." },
  "ines@citedeschances.com": { statut: "Actif", projets: ["Europe", "Orientation"], dateInscription: "12/12/2024", competences: ["Canva", "Réseaux Sociaux", "Vidéo"], dispos: "Tous les jours 18h-20h", notesRH: "" },
  "aryles@citedeschances.com": { statut: "Actif", projets: [], competences: ["Comptabilité", "Rigueur"], dispos: "Soirs en semaine", notesRH: "" },
  "sonia@citedeschances.com": { statut: "Actif", projets: ["Parcours Citoyen"], dateInscription: "14/02/2024", competences: ["Entretiens", "Onboarding"], dispos: "Week-ends", notesRH: "" },
  "djibril@citedeschances.com": { statut: "Actif", projets: ["Parcours Citoyen"], dateInscription: "01/09/2025", competences: ["Logistique", "Événementiel"], dispos: "Week-ends uniquement", notesRH: "" },
  "laura@citedeschances.com": { statut: "Actif", projets: ["Parcours Citoyen", "Europe"], dateInscription: "18/01/2025", competences: ["Analyse de données", "Excel"], dispos: "Variable", notesRH: "Excellente sur les bilans d'impact." },
};

// Espaces avec leurs équipes initiales (accès configurés)
const SPACE_TEAMS = [
  { space: "Relations Publiques", key: "teams", value: { "2025-2026": [{ nom: "Lauren Lolo", role: "Direction" }, { nom: "Djibril Koné", role: "Responsable" }] } },
  { space: "Communication",       key: "teams", value: { "2025-2026": [{ nom: "Inès Margot", role: "Direction" }] } },
  { space: "Trésorerie",          key: "teams", value: { "2025-2026": [{ nom: "Aryles Attou", role: "Direction" }] } },
  { space: "Ressources Humaines", key: "teams", value: { "2025-2026": [{ nom: "Sonia Rahim", role: "Direction" }] } },
  { space: "Etudes",              key: "teams", value: { "2025-2026": [{ nom: "Laura Pizot", role: "Direction" }] } },
  { space: "Plaidoyer",           key: "teams", value: { "2025-2026": [{ nom: "Kevin Traoré", role: "Direction" }] } },
];

// Sections minimales pour tous les espaces
const ALL_SPACES = [
  "Relations Publiques", "Communication", "Trésorerie", "Ressources Humaines",
  "Etudes", "Plaidoyer", "Développement Financier", "Europe", "Orientation", "Parcours Citoyen",
];

async function main() {
  console.log('🌱 Seeding database...');

  // Tout vider dans l'ordre des dépendances
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.spaceChat.deleteMany();
  await prisma.hour.deleteMany();
  await prisma.noteFrais.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.action.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskRequest.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.spaceSettings.deleteMany();

  // Mot de passe par défaut lu depuis SEED_PASSWORD (fallback dev uniquement)
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) throw new Error('SEED_PASSWORD manquant dans .env — refusé en prod');
  const defaultHash = await bcrypt.hash(seedPassword, 10);

  // Créer les utilisateurs
  for (const u of USERS_DATA) {
    const extras = ANNUAIRE_EXTRAS[u.email] || {};
    const user = await prisma.user.create({
      data: {
        id: u.id,
        nom: u.nom,
        avatar: u.avatar,
        pole: u.pole,
        email: u.email,
        role: u.role,
        passwordHash: defaultHash,
        statut: extras.statut || "Actif",
        dateInscription: extras.dateInscription || null,
        competences: extras.competences || [],
        dispos: extras.dispos || null,
        notesRH: extras.notesRH || null,
        projets: extras.projets || [],
      },
    });

    for (const [pole, level] of Object.entries(u.permissions)) {
      await prisma.permission.create({
        data: { userId: user.id, pole, level },
      });
    }
  }
  await prisma.$executeRaw`SELECT setval('"User_id_seq"', 7, true)`;
  console.log('✅ Users created');

  // Équipes des espaces
  for (const s of SPACE_TEAMS) {
    await prisma.spaceSettings.upsert({
      where: { space_key: { space: s.space, key: s.key } },
      update: { value: s.value },
      create: s,
    });
  }

  // Sections minimales (Général + Archives) pour tous les espaces
  for (const space of ALL_SPACES) {
    await prisma.spaceSettings.upsert({
      where: { space_key: { space, key: "sections" } },
      update: { value: ["Général", "Archives"] },
      create: { space, key: "sections", value: ["Général", "Archives"] },
    });
  }
  console.log('✅ Space settings created');

  console.log('\n🎉 Seed terminé !');
  console.log('📧 Comptes disponibles :');
  for (const u of USERS_DATA) {
    console.log(`   ${u.email}  →  mot de passe: ${seedPassword}  (${u.role})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
