// src/components/ui/StatusIcon.jsx
// Icônes centralisées pour tous les types de statut de l'application

import {
  UserCheck, Umbrella, UserMinus,
  Circle, Timer, CheckCircle2,
  Pencil, Send, Eye, Banknote, XCircle,
  Calendar, Ban, CircleDot, Lock, Clock,
} from 'lucide-react';

// ── Statut membre / utilisateur ───────────────────────────────────────────────
export const MEMBER_STATUS = {
  "Actif":             { Icon: UserCheck,   color: "#16a34a" },
  "En congé":          { Icon: Umbrella,    color: "#f97316" },
  "Absence prolongée": { Icon: UserMinus,   color: "#e63946" },
};

// ── Statut tâche ──────────────────────────────────────────────────────────────
export const TASK_STATUS = {
  "À faire":  { Icon: Circle,        color: "#94a3b8" },
  "En cours": { Icon: Timer,         color: "#1a56db" },
  "Terminé":  { Icon: CheckCircle2,  color: "#16a34a" },
};

// ── Statut note de frais ──────────────────────────────────────────────────────
export const NDF_STATUS = {
  "Brouillon":       { Icon: Pencil,       color: "#94a3b8" },
  "Soumise":         { Icon: Send,         color: "#1a56db" },
  "En vérification": { Icon: Eye,          color: "#d97706" },
  "Validée":         { Icon: CheckCircle2, color: "#16a34a" },
  "Remboursée":      { Icon: Banknote,     color: "#15803d" },
  "Refusée":         { Icon: XCircle,      color: "#e63946" },
};

// ── Statut action / événement ─────────────────────────────────────────────────
export const ACTION_STATUS = {
  "Planifiée": { Icon: Calendar,     color: "#94a3b8" },
  "En cours":  { Icon: Timer,        color: "#1a56db" },
  "Terminée":  { Icon: CheckCircle2, color: "#16a34a" },
  "Annulée":   { Icon: Ban,          color: "#e63946" },
};

// ── Statut mission ────────────────────────────────────────────────────────────
export const MISSION_STATUS = {
  "Ouvert":   { Icon: CircleDot,    color: "#16a34a" },
  "Ouverte":  { Icon: CircleDot,    color: "#16a34a" },
  "En cours": { Icon: Timer,        color: "#1a56db" },
  "Fermé":    { Icon: Lock,         color: "#94a3b8" },
  "Fermée":   { Icon: Lock,         color: "#94a3b8" },
  "Annulée":  { Icon: Ban,          color: "#e63946" },
};

// ── Statut transaction ────────────────────────────────────────────────────────
export const TRANSACTION_STATUS = {
  "Validé":     { Icon: CheckCircle2, color: "#16a34a" },
  "En attente": { Icon: Clock,        color: "#d97706" },
};

// ── Composant générique ───────────────────────────────────────────────────────
// Usage: <StatusBadge map={MEMBER_STATUS} value="Actif" size={11} />
export const StatusBadge = ({ map, value, size = 11, showText = true }) => {
  const entry = map?.[value];
  if (!entry) return showText ? <span>{value}</span> : null;
  const { Icon, color } = entry;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color }}>
      <Icon size={size} strokeWidth={2} />
      {showText && value}
    </span>
  );
};

export default StatusBadge;
