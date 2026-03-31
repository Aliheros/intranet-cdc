// src/utils/utils.js

// ─── 1. GESTION DES DATES ET HEURES ───────────────────────────────

export const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export const formatDateLong = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const formatted = new Intl.DateTimeFormat("fr-FR", options).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return dateStr;
  }
};

export const isPastDate = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-");
  const itemDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return itemDate < today;
};

export const fmtHeure = () => {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
};

// ─── 1b. TRI INTELLIGENT DES TÂCHES ──────────────────────────────
// Ordre : En cours en retard > À faire en retard > En cours urgent > À faire urgent
//          > En cours normal > À faire normal > Terminé
// À statut égal : deadline croissante ; "En cours" sans deadline : id décroissant (plus récente en tête)
export const sortTasksSmart = (tasks) => {
  const taskScore = (t) => {
    if (t.status === "Terminé") return -1000;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dl = t.deadline ? new Date(t.deadline.split("T")[0] + "T00:00:00") : null;
    const daysLeft = dl ? Math.ceil((dl - now) / (1000 * 60 * 60 * 24)) : null;
    let urgency = 0;
    if (daysLeft !== null) {
      if (daysLeft < 0)  urgency = 300; // en retard
      else if (daysLeft === 0) urgency = 200; // aujourd'hui
      else if (daysLeft === 1) urgency = 100; // demain
      else if (daysLeft <= 3)  urgency = 50;
      else if (daysLeft <= 7)  urgency = 20;
      else if (daysLeft <= 14) urgency = 5;
    }
    return (t.status === "En cours" ? 10 : 0) + urgency;
  };
  return [...tasks].sort((a, b) => {
    const diff = taskScore(b) - taskScore(a);
    if (diff !== 0) return diff;
    // Départage à score égal
    if (a.status === "En cours" && b.status === "En cours") return (b.id || 0) - (a.id || 0);
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return (b.id || 0) - (a.id || 0);
  });
};

// ─── 2. LOGIQUE GLOBALE (SÉANCES & LOGS) ──────────────────────────

export const getNextSeanceId = (seances) => {
  if (!seances || seances.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureSeances = seances
    .filter((s) => new Date(s.date + "T00:00:00") >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return futureSeances.length > 0 ? futureSeances[0].id : null;
};

export const generateLogsForMember = (nom, acts, evs) => {
  const logs = [];
  logs.push({ date: "Aujourd'hui", texte: `Connexion à l'intranet` });
  const mActs = acts.filter((a) => a.responsables.includes(nom));
  if (mActs.length > 0)
    logs.push({
      date: "Il y a 3 jours",
      texte: `A été assigné à l'action : ${mActs[0].etablissement}`,
    });
  const mEvs = evs.filter((e) => (e.equipe || []).includes(nom));
  if (mEvs.length > 0)
    logs.push({
      date: "Semaine dernière",
      texte: `A rejoint l'équipe de l'événement : ${mEvs[0].titre}`,
    });
  logs.push({ date: "Mois dernier", texte: `Mise à jour du profil` });
  return logs;
};

// ─── 3. MOTEUR D'AUTOMATISATION (SPRINT 5) ────────────────────────

export const computeCompletionScore = (action) => {
  if (!action.checklist) return 0;
  const all = [
    ...action.checklist.preparation,
    ...action.checklist.jourJ,
    ...action.checklist.postAction,
  ];
  if (all.length === 0) return 0;
  const done = all.filter((i) => i.done).length;
  return Math.round((done / all.length) * 100);
};

export const computeAutoStatut = (action) => {
  if (!action.checklist) return action.statut;
  const prep = action.checklist.preparation;
  const jourJ = action.checklist.jourJ;
  const post = action.checklist.postAction;

  const allDone = (arr) => arr.length > 0 && arr.every((i) => i.done);
  const anyDone = (arr) => arr.some((i) => i.done);

  if (allDone(post)) return "Terminée";
  if (anyDone(jourJ)) return "En cours";
  if (allDone(prep)) return "En cours";
  return "Planifiée";
};

export const generateAutoTasks = (action, cycle) => {
  const assignees = (action.responsables || []).map((r) => ({
    name: r,
    completed: false,
  }));
  const base = [
    {
      text: `Confirmer la date avec ${action.etablissement}`,
      space: "Relations Publiques",
      assignees,
      deadline: action.date_debut,
      cycle,
      description: "Appeler ou envoyer un mail de confirmation.",
    },
    {
      text: `Post Instagram J-7 — ${action.type}`,
      space: "Communication",
      assignees: [],
      deadline: "",
      cycle,
      description: `Créer et publier le visuel pour l'action du ${action.date_debut}.`,
    },
    {
      text: `Note de frais post-action — ${action.etablissement}`,
      space: "Trésorerie",
      assignees,
      deadline: action.date_fin,
      cycle,
      description: "Déposer les justificatifs dans la Trésorerie.",
    },
    {
      text: `Bilan d'impact — ${action.etablissement}`,
      space: "Etudes",
      assignees,
      deadline: action.date_fin,
      cycle,
      description: "Remplir le formulaire de bilan post-action.",
    },
  ];

  if ((action.type || "").includes("Simulation Parlementaire")) {
    base.push({
      text: `Imprimer les livrets (${action.beneficiaires || 30} ex.)`,
      space: "Relations Publiques",
      assignees,
      deadline: action.date_debut,
      cycle,
      description: "Livrets couleur, recto-verso, reliés.",
    });
  }
  return base.map((t) => ({ ...t, id: Date.now() + Math.random() }));
};

export const buildPropagationMessage = (action, userName) => {
  return `Nouvelle action planifiée par ${userName} : "${action.type}" au ${
    action.etablissement
  } (${action.ville}) le ${formatDateShort(
    action.date_debut
  )}. Vérifiez vos tâches assignées.`;
};