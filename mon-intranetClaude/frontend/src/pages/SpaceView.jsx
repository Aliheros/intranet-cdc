// src/pages/SpaceView.jsx
import React, { useState, useEffect } from 'react';
import { AvatarInner, isAvatarUrl, findMemberByName } from '../components/ui/AvatarDisplay';
import Badge from '../components/ui/Badge';
import DocRow from '../components/ui/DocRow';
import Tresorerie from './Tresorerie';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
import { POLE_COLORS, PROJET_COLORS, typeColor } from '../data/constants';
import { isPastDate, formatDateShort, fmtHeure, sortTasksSmart, THREE_DAYS_MS, isTaskEffectivelyDone, isTaskActiveInFeed, formatDuree } from '../utils/utils';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Calendar, Link2, User, Users, MapPin, Lock, Pencil, Trash2, Folder, BarChart2, Receipt, FileText, GraduationCap, BookOpen, Archive, ScrollText, Pin, Star, Car, Building2, Utensils, Package, Megaphone, Lightbulb, Zap, Target, Settings, ClipboardList, ChevronRight, RotateCcw, Download, Upload, Hexagon, Phone, Mail, Send, Plus, X, Search, Umbrella, CalendarRange, TrendingUp, Compass, Navigation, Info, ExternalLink, Shield } from 'lucide-react';
import { StatusBadge, MEMBER_STATUS, TASK_STATUS, NDF_STATUS, MISSION_STATUS, ACTION_STATUS } from '../components/ui/StatusIcon';
const SV_CAT_ICON = { Transport: Car, Hébergement: Building2, Repas: Utensils, Fournitures: Package, "Matériel pédagogique": BookOpen, Communication: Megaphone, Autre: Lightbulb };

// Logos distinctifs par pôle/projet
const EuStars = () => (
  <svg width="30" height="30" viewBox="0 0 30 30">
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      const x = 15 + 10.5 * Math.cos(a), y = 15 + 10.5 * Math.sin(a);
      return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="rgba(255,215,0,0.95)">★</text>;
    })}
  </svg>
);
const RadioWaves = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="13" cy="13" r="2.5" fill="#fff" stroke="none"/>
    <path d="M7.5 13 a5.5 5.5 0 0 1 5.5-5.5" opacity="0.6"/><path d="M18.5 13 a5.5 5.5 0 0 0-5.5-5.5" opacity="0.6"/>
    <path d="M4 13 a9 9 0 0 1 9-9" opacity="0.35"/><path d="M22 13 a9 9 0 0 0-9-9" opacity="0.35"/>
  </svg>
);
// Coffre-fort stylisé (Trésorerie)
const VaultIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="3" width="24" height="21" rx="3" stroke="#fff" strokeWidth="1.6"/>
    <rect x="22" y="10" width="4" height="8" rx="1" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="13" cy="13.5" r="5.5" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="13" cy="13.5" r="2" fill="rgba(255,255,255,0.4)" stroke="#fff" strokeWidth="1.2"/>
    {[0,72,144,216,288].map((deg,i) => {
      const a = (deg - 90) * Math.PI / 180;
      return <line key={i} x1={13 + 3.5*Math.cos(a)} y1={13.5 + 3.5*Math.sin(a)} x2={13 + 5.5*Math.cos(a)} y2={13.5 + 5.5*Math.sin(a)} stroke="#fff" strokeWidth="1.3"/>;
    })}
    <line x1="13" y1="13.5" x2="15.8" y2="10.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
// Balance de la justice (Plaidoyer)
const ScalesIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="14" y1="3" x2="14" y2="25"/>
    <line x1="10" y1="25" x2="18" y2="25"/>
    <line x1="5" y1="8" x2="23" y2="8"/>
    <circle cx="14" cy="4.5" r="1.8" fill="#fff" stroke="none"/>
    <path d="M5 8 L3 15 L7 15 Z" fill="rgba(255,255,255,0.25)"/>
    <line x1="3" y1="15" x2="7" y2="15"/>
    <path d="M23 8 L21 15 L25 15 Z" fill="rgba(255,255,255,0.15)"/>
    <line x1="21" y1="15" x2="25" y2="15"/>
  </svg>
);
// Réseau humain — personnes reliées (RH)
const HumanNetwork = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="6" r="3" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="5" cy="20" r="2.5" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="23" cy="20" r="2.5" stroke="#fff" strokeWidth="1.5"/>
    <line x1="14" y1="9" x2="14" y2="13" stroke="#fff" strokeWidth="1.4"/>
    <line x1="14" y1="13" x2="6" y2="18" stroke="#fff" strokeWidth="1.4"/>
    <line x1="14" y1="13" x2="22" y2="18" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="14" cy="13" r="1.5" fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth="1.2"/>
    <line x1="7.5" y1="20" x2="20.5" y2="20" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 2"/>
  </svg>
);
// Parcours citoyen — chemin avec étapes
const CitizenPath = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="6" cy="22" r="2.5" fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="14" cy="14" r="2.5" fill="rgba(255,255,255,0.7)" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="22" cy="6" r="2.5" fill="#fff" stroke="#fff" strokeWidth="1.4"/>
    <path d="M8 20.5 Q11 17 12 15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M16 13 Q19 10 20 7.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M19 4 L22 6 L20 9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
const SPACE_LOGO = {
  // Pôles
  "Relations Publiques":     <Users size={24} strokeWidth={1.5} color="#fff" />,
  "Ressources Humaines":     <HumanNetwork />,
  "Plaidoyer":               <ScalesIcon />,
  "Etudes":                  <GraduationCap size={24} strokeWidth={1.5} color="#fff" />,
  "Développement Financier": <TrendingUp size={24} strokeWidth={1.5} color="#fff" />,
  "Communication":           <RadioWaves />,
  "Trésorerie":              <VaultIcon />,
  // Projets
  "Europe":                  <EuStars />,
  "Parcours Citoyen":        <CitizenPath />,
  "Orientation":             <Compass size={24} strokeWidth={1.5} color="#fff" />,
};

// --- MODALE DES TÂCHES (100% Sécurisée avec styles intégrés) ---
const TaskModal = ({ task, onSave, onClose, teamMembers, actions = [], directory = [] }) => {
  const [form, setForm] = useState({ assignees: [], ...task });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAssignee = (nom) => {
    setForm((f) => {
      const exists = f.assignees.find((a) => a.name === nom);
      if (exists) return { ...f, assignees: f.assignees.filter((a) => a.name !== nom) };
      return { ...f, assignees: [...f.assignees, { name: nom, completed: false }] };
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={onClose}>
      <div className="modal-box" style={{ width: 480, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-title">
            {task.id ? "Modifier la tâche" : "Nouvelle tâche"}
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 18 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Titre de la tâche *</label>
            <input className="form-input" value={form.text} onChange={(e) => set("text", e.target.value)} placeholder="Ex: Rédiger le compte-rendu..." autoFocus style={{ padding: "10px 14px", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Description (Optionnelle)</label>
            <textarea className="form-input" rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Détails, liens utiles..." style={{ resize: "vertical", padding: "10px 14px", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Date limite</label>
            <input type="date" className="form-input" value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} style={{ padding: "10px 14px" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Lier à une action (Optionnel)</label>
            {actions.filter(a => !a.isArchived).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "9px 14px", borderRadius: 8, background: "var(--bg-hover)", border: "1px dashed var(--border-light)" }}>
                Aucune action disponible — créez-en une dans <strong>Suivi des actions</strong>
              </div>
            ) : (
              <select className="form-select" value={form.actionId || ""} onChange={(e) => set("actionId", e.target.value ? Number(e.target.value) : null)} style={{ padding: "10px 14px", fontSize: 13 }}>
                <option value="">— Aucune action liée —</option>
                {actions.filter(a => !a.isArchived).map(a => (
                  <option key={a.id} value={a.id}>{a.etablissement}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Assigner à (Membres du pôle)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {teamMembers.map((m) => {
                const isAssigned = form.assignees.some((a) => a.name === m.nom);
                return (
                  <div key={m.nom} onClick={() => toggleAssignee(m.nom)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease", border: `1px solid ${isAssigned ? "#1a56db" : "var(--border-light)"}`, background: isAssigned ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: isAssigned ? "#1a56db" : "var(--text-dim)", display: "flex", alignItems: "center", gap: 5 }}>
                    {isAssigned ? "✓ " : "+ "}{m.nom}
                    {(() => { const info = findMemberByName(directory, m.nom); const s = MEMBER_STATUS[info?.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                  </div>
                );
              })}
              {/* Assignés hors équipe (anciens membres, supprimés, changement de pôle) */}
              {form.assignees.filter(a => !teamMembers.some(m => m.nom === a.name)).map(a => {
                const inDirectory = findMemberByName(directory, a.name);
                return (
                  <div key={a.name} onClick={() => toggleAssignee(a.name)} title={inDirectory ? "Hors équipe — cliquer pour retirer" : "Profil introuvable — cliquer pour retirer"} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(217,119,6,0.4)", background: "rgba(217,119,6,0.08)", color: "#d97706", display: "flex", alignItems: "center", gap: 5, textDecoration: !inDirectory ? "line-through" : "none", opacity: !inDirectory ? 0.7 : 1 }}>
                    <AlertTriangle size={10} strokeWidth={2} /> {a.name} ✕
                  </div>
                );
              })}
              {teamMembers.length === 0 && form.assignees.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Ajoutez des membres à l'équipe pour les assigner.</div>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => { if (form.text) onSave(form); }}>Enregistrer</button>
        </div>

      </div>
    </div>
  );
};


const SpaceView = ({ spaceWallContainerRef, spaceFileRef }) => {
  const { currentUser } = useAuth();
  const {
    page, subPage,
    addToast, requestConfirm,
    activeTab, setActiveTab,
    handleNav: navigate,
    setHighlightedActionId, setActiveEventId, setHighlightedEventId,
    highlightedTaskId, setHighlightedTaskId,
    setEditSpaceModal, setManageTeamModal, setSectionModal,
    setTransactionModal,
    setMissionModal, setNoteFraisModal, setDevisFactureModal,
    setRhProfileModal,
  } = useAppContext();
  const {
    directory,
    activeCycle, setActiveCycle, cycles,
    docsData, setDocsData,
    spaceInfos, spaceSections, setSpaceSections,
    spaceTeams, spaceChats, setSpaceChats, trash,
    spaceChatInput, setSpaceChatInput,
    changeDocSection, moveSection,
    moveToTrash, restoreTrash, forceDeleteTrash,
    tasks, setTasks,
    transactions, budgets, deleteTransaction, validerTransaction,
    devisFactures,
    notesFrais, handleUpdateNdfStatus: onUpdateNdfStatus,
    volunteerHours, missions, hasPower,
    handleApplyMission: onApplyMission,
    handleAcceptCandidate: onAcceptCandidate,
    handleRefuseCandidate: onRefuseCandidate,
    handleUpdateMission: onUpdateMission,
    handleDeleteMission: onDeleteMission,
    taskRequests, handleAssignTaskRequest, handleRefuseTaskRequest,
    actions, evenements,
    contacts, setContacts,
    getSpaceAccess, handleUpdateActionStatus,
    seancePresences, handleRhValidation,
  } = useDataContext();

  const accessObj = getSpaceAccess(subPage);
  const onNewMission    = (m) => setMissionModal(m || {});
  const onOpenNoteFrais = (ndf) => setNoteFraisModal(ndf);
  const onOpenRHProfile = hasPower("view_rh") ? (m) => setRhProfileModal(m) : null;
  const setNewSectionModal = () => setSectionModal({ oldName: null });
  const setRenameSectionModal = (sec) => setSectionModal({ oldName: sec });
  const deleteSection = (sec) => {
    setSpaceSections(prev => {
      const updated = { ...prev, [subPage]: (prev[subPage] || []).filter(s => s !== sec) };
      api.put(`/spaces/${encodeURIComponent(subPage)}/settings/sections`, { value: updated[subPage] }).catch(console.error);
      return updated;
    });
  };
  const onTaskComplete = (actionId) => {
    const actionTasks = tasks.filter(t => t.actionId === actionId);
    const allDone = actionTasks.length > 0 && actionTasks.every(isTaskEffectivelyDone);
    if (allDone) {
      const action = actions.find(a => a.id === actionId);
      if (action && action.statut !== "Terminée") handleUpdateActionStatus(actionId, "Terminée");
    }
  };
  
  const maintenant = new Date();
  const [taskModal, setTaskModal] = useState(null);
  const [docsSort, setDocsSort] = useState("date_desc");
  const [taskRequestAssignModal, setTaskRequestAssignModal] = useState(null);
  const [taskRequestSelectedAssignees, setTaskRequestSelectedAssignees] = useState([]);
  const [showTaskArchive, setShowTaskArchive] = useState(false);
  const [taskHistSearch, setTaskHistSearch] = useState("");
  const [taskHistSort, setTaskHistSort] = useState("recent");
  const [taskDetailModal, setTaskDetailModal] = useState(null);
  // Filtres/tri tableau RH
  const [rhFilterPole, setRhFilterPole] = useState("Tous");
  const [rhFilterStatut, setRhFilterStatut] = useState("Tous");
  const [rhSort, setRhSort] = useState("hValidated_desc");
  const [rhSearch, setRhSearch] = useState("");
  const [rhCollapsedEvents, setRhCollapsedEventsRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rh_collapsed_events') || '{}'); } catch { return {}; }
  });
  const setRhCollapsedEvents = (updater) => {
    setRhCollapsedEventsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('rh_collapsed_events', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [rhValidationCollapsed, setRhValidationCollapsedRaw] = useState(() => {
    try { return localStorage.getItem('rh_validation_collapsed') === 'true'; } catch { return false; }
  });
  const setRhValidationCollapsed = (updater) => {
    setRhValidationCollapsedRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('rh_validation_collapsed', String(next)); } catch {}
      return next;
    });
  };
  // Filtres/tri NDF trésorerie
  const [ndfTab, setNdfTab] = useState("traiter");
  const [ndfSearch, setNdfSearch] = useState("");
  const [ndfSort, setNdfSort] = useState("date_desc");
  // Filtres/tri DF trésorerie
  const [dfTab, setDfTab] = useState("traiter");
  const [dfSearch, setDfSearch] = useState("");
  const [dfSort, setDfSort] = useState("date_desc");
  // RP Contacts
  const [rpContactModal, setRpContactModal] = useState(null); // null | {} (new) | contact (edit)
  const [rpSollModal, setRpSollModal] = useState(null); // { contactId, soll? }
  const [rpSearch, setRpSearch] = useState("");
  const [rpFilterStatut, setRpFilterStatut] = useState("Tous");
  // RH Missions (déplacé ici pour respecter les règles des hooks)
  const [rhmView, setRhmView] = useState("missions");
  const [rhmExpandedMission, setRhmExpandedMission] = useState(null);
  const [rhmSearch, setRhmSearch] = useState("");
  const [rhmFilterType, setRhmFilterType] = useState("Tous");
  const [rhmFilterPole, setRhmFilterPole] = useState("Tous");
  const [rhmFilterUrgence, setRhmFilterUrgence] = useState("Tous");
  const [rhmFilterStatut, setRhmFilterStatut] = useState("actives");
  const [rhmFilterCandStatut, setRhmFilterCandStatut] = useState("Toutes");
  const [rhmSearchCand, setRhmSearchCand] = useState("");
  const [rhmRefuseModal, setRhmRefuseModal] = useState(null);
  const [rhmRefuseReason, setRhmRefuseReason] = useState("");
  const [rhmApplyModal, setRhmApplyModal] = useState(null);
  const [rhmApplyMsg, setRhmApplyMsg] = useState("");

  // Auto-réinitialise le surlignage après 2.5 secondes
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId, setHighlightedTaskId]);

  const acc = accessObj?.canInteract ? "edit" : accessObj?.canView ? "view" : "none";
  const canManageSpace = accessObj?.canManage;
  const color = page === "pole" ? POLE_COLORS[subPage] : PROJET_COLORS[subPage];
  const docs = (docsData && docsData[subPage]) ? docsData[subPage] : [];
  const meta = (spaceInfos && spaceInfos[subPage]) ? spaceInfos[subPage] : { description: "", instructions: "" };
  const currentSections = (spaceSections && spaceSections[subPage]) ? spaceSections[subPage] : ["Général", "Archives"];
  const teamYear = activeCycle === "Toutes" ? (cycles ? cycles[0] : "2025-2026") : activeCycle;
  const currentTeam = ((spaceTeams && spaceTeams[subPage] && spaceTeams[subPage][teamYear]) ? spaceTeams[subPage][teamYear] : [])
    .filter(m => directory.some(d => d.nom === m.nom));
  const spaceTrash = trash ? trash.filter(t => t.space === subPage) : [];

  const sendSpaceMessage = (space) => {
    if (!spaceChatInput.trim()) return;
    const texte = spaceChatInput;
    const heure = fmtHeure();
    const newMsg = { id: Date.now(), auteur: currentUser.nom, avatar: currentUser.avatar, texte, heure };
    setSpaceChats(prev => ({ ...prev, [space]: [...(prev[space] || []), newMsg] }));
    setSpaceChatInput("");
    api.post(`/messagerie/space-chats/${encodeURIComponent(space)}`, { texte, heure }).catch(console.error);
  };

  return (
    <>
      {/* --- EN-TÊTE FIXE --- */}
      <div className="space-sticky-header">
        <div className="sh" style={{
          borderRadius: 16, marginBottom: 18,
          background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Cercle décoratif en fond */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, right: 60, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          {/* Icône badge */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff", textTransform: "uppercase",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            {SPACE_LOGO[subPage] ?? (page === "pole" ? subPage.charAt(0) : <Hexagon size={24} strokeWidth={1.5} />)}
          </div>

          {/* Texte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
              {page === "pole" ? "Pôle" : "Projet"}
            </div>
            <div className="stitle" style={{ fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {subPage}
            </div>
            {meta.description && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.5, maxWidth: 480 }}>
                {meta.description}
              </div>
            )}
          </div>

          {/* Badges droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
            <Badge label={acc === "edit" ? "Éditeur" : "Lecteur"} bg="rgba(255,255,255,0.18)" c="#fff" size={11} />
            {canManageSpace && (
              <button onClick={() => setEditSpaceModal(subPage)} style={{
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600,
                color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)",
                display: "inline-flex", alignItems: "center", gap: 5,
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              >
                <Settings size={11} strokeWidth={1.8}/> Paramétrer
              </button>
            )}
          </div>
        </div>

        {/* ONGLETS */}
        <div className="tab-scroll-wrap" style={{ gap: 10 }}>
          <button className={`tab-btn ${activeTab === "contenu" ? "active" : ""}`} onClick={() => setActiveTab("contenu")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Folder size={12} strokeWidth={1.8}/> Contenu de l'espace</span></button>
          {subPage === "Trésorerie" && acc === "edit" && <button className={`tab-btn ${activeTab === "tresorerie" ? "active" : ""}`} onClick={() => setActiveTab("tresorerie")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><BarChart2 size={12} strokeWidth={1.8}/> Finance</span></button>}
          {subPage === "Trésorerie" && acc === "edit" && <button className={`tab-btn ${activeTab === "ndf_treso" ? "active" : ""}`} onClick={() => setActiveTab("ndf_treso")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Receipt size={12} strokeWidth={1.8}/> Notes de frais</span></button>}
          {subPage === "Trésorerie" && acc === "edit" && <button className={`tab-btn ${activeTab === "df_treso" ? "active" : ""}`} onClick={() => setActiveTab("df_treso")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><FileText size={12} strokeWidth={1.8}/> Devis &amp; Factures</span></button>}
          {subPage === "Ressources Humaines" && <button className={`tab-btn ${activeTab === "rh_suivi" ? "active" : ""}`} onClick={() => setActiveTab("rh_suivi")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Users size={12} strokeWidth={1.8}/> Suivi RH</span></button>}
          {subPage === "Ressources Humaines" && <button className={`tab-btn ${activeTab === "rh_missions" ? "active" : ""}`} onClick={() => setActiveTab("rh_missions")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Target size={12} strokeWidth={1.8}/> Bourses aux missions</span></button>}
          {subPage === "Etudes" && <button className={`tab-btn ${activeTab === "etudes_stats" ? "active" : ""}`} onClick={() => setActiveTab("etudes_stats")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><BarChart2 size={12} strokeWidth={1.8}/> Statistiques</span></button>}
          {subPage === "Relations Publiques" && <button className={`tab-btn ${activeTab === "rp_contacts" ? "active" : ""}`} onClick={() => setActiveTab("rp_contacts")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Users size={12} strokeWidth={1.8}/> Contacts & Sollicitations</span></button>}
          {acc === "edit" && <button className={`tab-btn ${activeTab === "corbeille" ? "active" : ""}`} onClick={() => setActiveTab("corbeille")}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Trash2 size={12} strokeWidth={1.8}/> Corbeille ({spaceTrash.length})</span></button>}
        </div>
      </div>

      {/* --- MODALE DES TÂCHES --- */}
      {taskModal && (
        <TaskModal
          task={taskModal} teamMembers={currentTeam} actions={actions} onClose={() => setTaskModal(null)} directory={directory}
          onSave={(updatedTask) => {
            if (updatedTask.id) {
              setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
              const { createdAt, updatedAt, ...data } = updatedTask;
              api.put(`/tasks/${updatedTask.id}`, data).catch(err => addToast(`Erreur sauvegarde tâche : ${err?.message || 'serveur'}`, 'error'));
              // Recalcul score si actionId présent (ou si actionId a changé)
              if (updatedTask.actionId) onTaskComplete?.(updatedTask.actionId);
              const prevTask = tasks.find(t => t.id === updatedTask.id);
              if (prevTask?.actionId && prevTask.actionId !== updatedTask.actionId) onTaskComplete?.(prevTask.actionId);
              addToast("Tâche modifiée", "success");
            } else {
              const tempId = Date.now();
              const newTask = { ...updatedTask, id: tempId, createdBy: currentUser.nom };
              setTasks((prev) => [newTask, ...prev]);
              const { id: _id, ...taskData } = newTask;
              api.post('/tasks', taskData).then(created => {
                if (created?.id) setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: created.id } : t));
              }).catch(err => addToast(`Erreur création tâche : ${err?.message || 'serveur'}`, 'error'));
              if (updatedTask.actionId) onTaskComplete?.(updatedTask.actionId);
              addToast("Nouvelle tâche créée", "success");
            }
            setTaskModal(null);
          }}
        />
      )}

      {/* --- MODAL DÉTAIL TÂCHE (historique) --- */}
      {taskDetailModal && (() => {
        const t = taskDetailModal;
        const assignees = t.assignees || [];
        const done = assignees.filter(a => a.completed);
        const pending = assignees.filter(a => !a.completed);
        const isForcedDone = !!t.forceCompletedBy;
        const pct = assignees.length > 0 ? Math.round((done.length / assignees.length) * 100) : (t.status === "Terminé" ? 100 : 0);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "taskModalOverlay 0.2s ease" }} onClick={() => setTaskDetailModal(null)}>
            <div style={{ background: "var(--bg-surface)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", animation: "taskModalPanel 0.35s cubic-bezier(0.34,1.56,0.64,1)" }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {(() => {
                    const isDoneTask = isTaskEffectivelyDone(t);
                    const now2 = new Date(); now2.setHours(0,0,0,0);
                    const dl2 = t.deadline ? new Date(t.deadline + "T00:00:00") : null;
                    const days2 = dl2 ? Math.ceil((dl2 - now2) / 86400000) : null;
                    const isRetardTask = !isDoneTask && days2 !== null && days2 < 0;
                    const isUrgentTask = !isDoneTask && days2 !== null && days2 >= 0 && days2 <= 3;
                    const statusColor = isDoneTask ? "#16a34a" : isRetardTask ? "#e63946" : isUrgentTask ? "#d97706" : "#1a56db";
                    const statusLabel = isDoneTask ? "Tâche terminée" : isRetardTask ? "En retard" : isUrgentTask ? `Urgent — J-${days2}` : t.status || "En cours";
                    const StatusIcon = isDoneTask ? CheckCircle2 : isRetardTask ? AlertTriangle : isUrgentTask ? Clock : Zap;
                    return (
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: statusColor, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <StatusIcon size={10} strokeWidth={2}/> {statusLabel}
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-base)", lineHeight: 1.3, textDecoration: isTaskEffectivelyDone(t) ? "line-through" : "none", textDecorationColor: "rgba(22,163,74,0.4)" }}>{t.text}</div>
                </div>
                <button onClick={() => setTaskDetailModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}><X size={16}/></button>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Description */}
                {t.description && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Description</div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, background: "var(--bg-alt)", borderRadius: 8, padding: "10px 12px" }}>{t.description}</div>
                  </div>
                )}

                {/* Progression */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Progression des validations</div>
                  <div style={{ height: 6, background: "var(--bg-alt)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#16a34a", borderRadius: 3 }}/>
                  </div>
                  {assignees.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {assignees.map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, background: a.completed ? "rgba(22,163,74,0.07)" : "var(--bg-hover)", border: `1px solid ${a.completed ? "rgba(22,163,74,0.2)" : "var(--border-light)"}`, animation: "taskDetailRow 0.25s ease both", animationDelay: `${0.15 + i * 0.06}s` }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: a.completed ? "rgba(22,163,74,0.15)" : "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: a.completed ? "#16a34a" : "var(--text-muted)", flexShrink: 0 }}>
                            {a.completed ? <CheckCircle2 size={13} strokeWidth={2} color="#16a34a"/> : (a.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-base)" }}>{a.name || "—"}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: a.completed ? "rgba(22,163,74,0.1)" : "var(--bg-alt)", color: a.completed ? "#16a34a" : "var(--text-muted)" }}>
                            {a.completed ? "Validé ✓" : "En attente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun assigné enregistré.</div>
                  )}
                  {isForcedDone && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#16a34a", fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={11} strokeWidth={2}/> Complétée manuellement par <strong>{t.forceCompletedBy}</strong>
                    </div>
                  )}
                </div>

                {/* Métadonnées */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Créée par", value: t.createdBy || "—" },
                    { label: "Espace", value: t.space || "—" },
                    { label: "Deadline", value: t.deadline ? formatDateShort(t.deadline) : "—" },
                    { label: "Cycle", value: t.cycle || "—" },
                    { label: "Terminée le", value: t.completedAt ? formatDateShort(t.completedAt.split("T")[0]) : "—" },
                    { label: "Verrouillée", value: t.lockedBy ? `Oui (${t.lockedBy})` : "Non" },
                  ].map(({ label, value }, i) => (
                    <div key={label} style={{ background: "var(--bg-alt)", borderRadius: 8, padding: "10px 12px", animation: "taskDetailRow 0.25s ease both", animationDelay: `${0.25 + i * 0.05}s` }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Liens de navigation */}
                {(() => {
                  const linkedAction = t.actionId ? actions.find(a => a.id === t.actionId) : null;
                  const linkedEvent  = linkedAction
                    ? evenements.find(e => e.actionId === linkedAction.id)
                    : null;

                  if (!linkedAction && !linkedEvent) return null;
                  return (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Liens rapides</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {linkedAction && (
                          <button
                            onClick={() => { setTaskDetailModal(null); navigate("actions"); setHighlightedActionId(linkedAction.id); setTimeout(() => setHighlightedActionId(null), 3000); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 8, cursor: "pointer", textAlign: "left", animation: "taskDetailRow 0.25s ease both", animationDelay: "0.3s" }}
                          >
                            <ClipboardList size={14} strokeWidth={1.8} color="#16a34a" style={{ flexShrink: 0 }}/>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#16a34a", marginBottom: 1 }}>Action liée</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedAction.etablissement} — {linkedAction.type}</div>
                            </div>
                            <ExternalLink size={11} strokeWidth={1.8} color="#16a34a" style={{ flexShrink: 0 }}/>
                          </button>
                        )}
                        {linkedEvent && (
                          <button
                            onClick={() => { setTaskDetailModal(null); navigate("coordination"); setActiveEventId(linkedEvent.id); setHighlightedEventId(linkedEvent.id); setTimeout(() => setHighlightedEventId(null), 3000); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(26,86,219,0.06)", border: "1px solid rgba(26,86,219,0.15)", borderRadius: 8, cursor: "pointer", textAlign: "left", animation: "taskDetailRow 0.25s ease both", animationDelay: "0.36s" }}
                          >
                            <Calendar size={14} strokeWidth={1.8} color="#1a56db" style={{ flexShrink: 0 }}/>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#1a56db", marginBottom: 1 }}>Événement lié</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedEvent.titre}</div>
                              {linkedEvent.date && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{formatDateShort(linkedEvent.date)}</div>}
                            </div>
                            <ExternalLink size={11} strokeWidth={1.8} color="#1a56db" style={{ flexShrink: 0 }}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- ONGLET PRINCIPAL : CONTENU (TÂCHES, ÉQUIPE, MUR, DOCS) --- */}
      {activeTab === "contenu" && (
        <div className="space-layout">
          
          {/* ================= COLONNE GAUCHE (Tâches + Instructions) ================= */}
          <div className="space-col" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* TÂCHES DE L'ÉQUIPE */}
            {(() => {
              const spaceTasksRaw = tasks.filter(t => t.space === subPage && (activeCycle === "Toutes" || t.cycle === activeCycle));

              const activeTasks = spaceTasksRaw.filter(isTaskActiveInFeed);

              const sortedActiveTasks = sortTasksSmart(activeTasks);

              return (
                <div className="space-card sc" style={{ background: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display:"flex", alignItems:"center", gap:5 }}><CheckCircle2 size={12} strokeWidth={1.8}/> Tâches de l'équipe</div>
                    {(acc === "edit" || acc === "view") && (
                      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => setTaskModal({ id: null, text: "", description: "", deadline: "", assignees: [], space: subPage, cycle: activeCycle, status: "À faire", lockedBy: null, forceCompletedBy: null })}>+ Ajouter</button>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortedActiveTasks.length === 0 && <div className="empty" style={{ padding: 10, fontSize: 11 }}>Aucune tâche en cours.</div>}
                    {sortedActiveTasks.map(t => {
                      const assigneesList = t.assignees || (t.assignee ? [{ name: t.assignee, completed: t.status === "Terminé" }] : []);
                      const myAssignement = assigneesList.find((a) => a.name === currentUser.nom);
                      const isCreator = t.createdBy === currentUser.nom;
                      const isLocked = t.lockedBy !== null && t.lockedBy !== undefined;
                      const isForcedGlobalComplete = t.forceCompletedBy !== null && t.forceCompletedBy !== undefined;
                      const isAutoGlobalComplete = assigneesList.length > 0 && assigneesList.every((a) => a.completed);
                      const isGlobalComplete = isForcedGlobalComplete || isAutoGlobalComplete;
                      const isFullyCompleted = isGlobalComplete;
                      const isHighlighted = false;

                      let isUrgent = false; let isRetard = false;
                      if (!isLocked && t.deadline) {
                        const daysLeft = Math.ceil((new Date(t.deadline) - maintenant) / (1000 * 60 * 60 * 24));
                        if (daysLeft < 0) isRetard = true;
                        else if (daysLeft <= 3) isUrgent = true;
                      }

                      return (
                        <div key={t.id} style={{
                          background: isHighlighted ? "rgba(26,86,219,0.15)" : "var(--bg-hover)", 
                          padding: 14, borderRadius: 8,
                          border: "1px solid var(--border-light)",
                          borderLeft: isRetard && !isFullyCompleted ? "4px solid #e63946" : isUrgent && !isFullyCompleted ? "4px solid #d97706" : "1px solid var(--border-light)",
                          boxShadow: isHighlighted ? "inset 0 0 0 2px #1a56db, 0 0 12px rgba(26,86,219,0.3)" : isLocked ? "inset 0 0 0 1.5px #d97706" : "none",
                          opacity: isFullyCompleted ? 0.6 : 1, 
                          transition: "all 0.3s ease",
                          animation: isHighlighted ? "highlightPulse 0.6s ease-out" : "none",
                          transform: isHighlighted ? "scale(1.01)" : "scale(1)"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                              {(isCreator || canManageSpace) && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", flexShrink: 0 }}>
                                  <button
                                    onClick={() => {
                                      const newLock = isLocked ? null : currentUser.nom;
                                      setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, lockedBy: newLock } : x));
                                      api.put(`/tasks/${t.id}`, { lockedBy: newLock }).catch(err => addToast(`Erreur verrou : ${err?.message || 'serveur'}`, 'error'));
                                      addToast(isLocked ? "Tâche déverrouillée" : "Tâche verrouillée", "success");
                                    }}
                                    style={{
                                      padding: "4px 6px", background: isLocked ? "#d97706" : "var(--bg-alt)", border: "1px solid var(--border-light)",
                                      borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: isLocked ? "#fff" : "var(--text-muted)",
                                      transition: "all 0.2s"
                                    }}
                                    title="Cliquer pour verrouiller/déverrouiller la tâche"
                                  >
                                    <Lock size={12} strokeWidth={1.8}/>
                                  </button>
                                  <input
                                    type="checkbox"
                                    checked={isForcedGlobalComplete}
                                    disabled={isLocked && acc !== "edit"}
                                    onChange={(e) => {
                                      const val = e.target.checked ? currentUser.nom : null;
                                      const now = e.target.checked ? new Date().toISOString() : null;
                                      // completedAt enregistré pour déclencher la règle des 3 jours
                                      const update = { forceCompletedBy: val, ...(now ? { completedAt: now } : {}) };
                                      setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, ...update } : x));
                                      api.put(`/tasks/${t.id}`, update).catch(err => addToast(`Erreur validation : ${err?.message || 'serveur'}`, 'error'));
                                      addToast(e.target.checked ? "Tâche complétée — archivage dans 3 jours" : "Complétion annulée", "success");
                                    }}
                                    style={{ marginTop: 2, cursor: "pointer", accentColor: "#16a34a" }}
                                    title="Forcer la complétion de la tâche"
                                  />
                                </div>
                              )}
                              <div style={{ fontSize: 13, fontWeight: 600, color: isLocked ? "#d97706" : isFullyCompleted ? "#16a34a" : "var(--text-base)", textDecoration: isFullyCompleted ? "line-through" : "none", lineHeight: 1.4, minWidth: 0, wordBreak: "break-word" }}>
                                {t.text}
                                {isLocked && <span style={{ display:"inline-flex", marginLeft: 6, color: "#d97706" }}><Lock size={10} strokeWidth={1.8}/></span>}
                                {isGlobalComplete && <span style={{ display:"inline-flex", marginLeft: 6, color: "#16a34a" }}><CheckCircle2 size={10} strokeWidth={1.8}/></span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <span style={{ cursor: "pointer", color: "var(--text-muted)", display:"inline-flex" }} onClick={() => setTaskDetailModal({ ...t, assignees: assigneesList })} title="Voir le détail"><Info size={12} strokeWidth={1.8}/></span>
                              {(acc === "edit" || myAssignement) && !isLocked && (
                                <span style={{ cursor: "pointer", color: "var(--text-muted)", display:"inline-flex" }} onClick={() => setTaskModal({ ...t, assignees: assigneesList })} title="Modifier"><Pencil size={12} strokeWidth={1.8}/></span>
                              )}
                              {canManageSpace && !isFullyCompleted && !isLocked && (
                                <span
                                  style={{ cursor: "pointer", color: "var(--text-muted)", display:"inline-flex" }}
                                  title="Archiver immédiatement"
                                  onClick={() => {
                                    const now = new Date().toISOString();
                                    // manuallyArchived → disparition immédiate du fil actif
                                    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "Terminé", completedAt: now, manuallyArchived: true } : x));
                                    api.put(`/tasks/${t.id}`, { ...t, assignees: assigneesList, status: "Terminé", completedAt: now, manuallyArchived: true }).catch(err => addToast(`Erreur archivage : ${err?.message || 'serveur'}`, 'error'));
                                    if (t.actionId) onTaskComplete?.(t.actionId);
                                    setShowTaskArchive(true);
                                    addToast("Tâche archivée");
                                  }}
                                >
                                  <Archive size={12} strokeWidth={1.8}/>
                                </span>
                              )}
                              {canManageSpace && (
                                <span
                                  style={{ cursor: "pointer", color: "#e63946", display:"inline-flex" }}
                                  title="Supprimer définitivement"
                                  onClick={() => requestConfirm(`Supprimer définitivement la tâche "${t.text}" ?`, () => {
                                    setTasks(prev => prev.filter(x => x.id !== t.id));
                                    api.delete(`/tasks/${t.id}`).catch(err => addToast(`Erreur suppression : ${err?.message || 'serveur'}`, 'error'));
                                    if (t.actionId) onTaskComplete?.(t.actionId);
                                    addToast("Tâche supprimée");
                                  })}
                                >
                                  <Trash2 size={12} strokeWidth={1.8}/>
                                </span>
                              )}
                            </div>
                          </div>

                          {t.description && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, marginLeft: 24, lineHeight: 1.5 }}>{t.description}</div>}

                          {isForcedGlobalComplete && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, marginLeft: 24, fontSize: 11, color: "#16a34a", fontStyle: "italic" }}>
                              <CheckCircle2 size={11} strokeWidth={2}/> Complétée par le responsable
                            </div>
                          )}

                          {t.actionId && (() => {
                            const relatedAction = actions?.find(a => a.id === t.actionId);
                            return relatedAction ? (
                              <div style={{ fontSize: 10, marginTop: 6, marginLeft: 24 }}>
                                <button
                                  onClick={() => { if (navigate) { navigate("actions"); setHighlightedActionId?.(relatedAction.id); setTimeout(() => setHighlightedActionId?.(null), 3000); }}}
                                  style={{ background: "rgba(26, 86, 219, 0.15)", border: "1px solid rgba(26, 86, 219, 0.3)", color: "#1a56db", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 10, transition: "all 0.2s" }}
                                  title={`Aller à l'action: ${relatedAction.etablissement}`}
                                >
                                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Link2 size={10} strokeWidth={1.8}/> {relatedAction.etablissement}</span>
                                </button>
                              </div>
                            ) : null;
                          })()}

                          {t.deadline && (
                            <div style={{ fontSize: 10, color: isRetard && !isFullyCompleted ? "#e63946" : isUrgent && !isFullyCompleted ? "#d97706" : "var(--text-muted)", marginTop: 8, marginLeft: 24, fontWeight: isRetard && !isFullyCompleted ? 700 : 500 }}>
                              <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{isRetard && !isFullyCompleted ? <AlertTriangle size={10} strokeWidth={2}/> : isUrgent && !isFullyCompleted ? <Clock size={10} strokeWidth={1.8}/> : <Calendar size={10} strokeWidth={1.8}/>}</span> {isRetard && !isFullyCompleted ? "En retard :" : isUrgent && !isFullyCompleted ? "Bientôt :" : ""} {formatDateShort(t.deadline)}
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, borderTop: "1px solid var(--border-light)", paddingTop: 12, marginLeft: 24, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {assigneesList.length === 0 ? <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>Non assigné</span> : (
                                <>
                                  <div style={{ display: "flex", alignItems: "center" }}>
                                    {assigneesList.filter(a => findMemberByName(directory, a.name)).map((a, i) => {
                                      const m = findMemberByName(directory, a.name);
                                      return (
                                        <div key={a.name} title={a.name} style={{
                                          width: 24, height: 24, borderRadius: "50%",
                                          background: a.completed ? "#16a34a" : isAvatarUrl(m?.avatar) ? "transparent" : (m ? POLE_COLORS[m.pole] : "#0f2d5e"),
                                          color: "#fff", fontSize: 9, fontWeight: 700,
                                          display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i > 0 ? -8 : 0, border: "2px solid var(--bg-hover)", zIndex: 10 - i, transition: "all 0.2s", cursor: "pointer", overflow: "hidden",
                                          opacity: (isLocked || isForcedGlobalComplete) ? 0.6 : a.completed ? 1 : 0.6,
                                          filter: !isLocked && !isForcedGlobalComplete && a.completed ? "none" : (isLocked || isForcedGlobalComplete) && !a.completed ? "grayscale(100%) opacity(0.4)" : !a.completed ? "grayscale(60%) opacity(0.8)" : "none"
                                        }}>
                                          {a.completed ? "✓" : <AvatarInner avatar={m?.avatar} nom={a.name} />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {myAssignement && !isLocked && !isForcedGlobalComplete && (
                                    <button 
                                      className={myAssignement.completed ? "btn-secondary" : "btn-primary"} 
                                      style={{ padding: "4px 10px", fontSize: 10, marginLeft: 8 }} 
                                      onClick={() => {
                                        setTasks((prev) => prev.map((x) => {
                                          if (x.id === t.id) {
                                            const newAssignees = (x.assignees || []).map(a => a.name === currentUser.nom ? { ...a, completed: !a.completed } : a);
                                            const allDone = newAssignees.length > 0 && newAssignees.every(a => a.completed);
                                            const now = new Date().toISOString();
                                            const newStatus = allDone ? "Terminé" : (x.status === "Terminé" ? "En cours" : x.status);
                                            const update = { assignees: newAssignees, status: newStatus, ...(allDone ? { completedAt: now } : { completedAt: null }) };
                                            api.put(`/tasks/${t.id}`, update).catch(err => addToast(`Erreur validation : ${err?.message || 'serveur'}`, 'error'));
                                            if (allDone && t.actionId) onTaskComplete?.(t.actionId);
                                            return { ...x, ...update };
                                          } return x;
                                        }));
                                        addToast(myAssignement.completed ? "Validation annulée" : "Partie validée ✓", "success");
                                      }}
                                    >
                                      {myAssignement.completed ? "Annuler" : <span style={{display:"inline-flex",alignItems:"center",gap:4}}><CheckCircle2 size={11} strokeWidth={1.8}/> Valider</span>}
                                    </button>
                                  )}
                                  {isLocked && !isCreator && (
                                    <span style={{ fontSize: 9, color: "#d97706", fontStyle: "italic", marginLeft: 8 }}>
                                      <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Lock size={9} strokeWidth={1.8}/> Verrouillée</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── HISTORIQUE DES TÂCHES (dropdown) ── */}
                  {(() => {
                    const allDone = tasks.filter(t => {
                      if (t.space !== subPage) return false;
                      if (activeCycle !== "Toutes" && t.cycle !== activeCycle) return false;
                      return !isTaskActiveInFeed(t) && isTaskEffectivelyDone(t);
                    });
                    if (allDone.length === 0) return null;

                    const histFiltered = allDone.filter(t => {
                      if (!taskHistSearch) return true;
                      const q = taskHistSearch.toLowerCase();
                      return (t.text || "").toLowerCase().includes(q) ||
                        (t.assignees || []).some(a => (a.name || "").toLowerCase().includes(q)) ||
                        (t.createdBy || "").toLowerCase().includes(q);
                    });

                    const histSorted = (() => {
                      if (taskHistSort === "recent")   return [...histFiltered].sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0));
                      if (taskHistSort === "oldest")   return [...histFiltered].sort((a, b) => new Date(a.completedAt || a.updatedAt || 0) - new Date(b.completedAt || b.updatedAt || 0));
                      if (taskHistSort === "az")       return [...histFiltered].sort((a, b) => (a.text || "").localeCompare(b.text || ""));
                      if (taskHistSort === "assignee") return [...histFiltered].sort((a, b) => ((a.assignees?.[0]?.name) || "").localeCompare((b.assignees?.[0]?.name) || ""));
                      return histFiltered;
                    })();

                    return (
                      <div style={{ marginTop: 12, borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
                        {/* Bouton toggle */}
                        <button
                          onClick={() => setShowTaskArchive(v => !v)}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0", width: "100%" }}
                        >
                          <ScrollText size={11} strokeWidth={1.8}/>
                          Historique — {allDone.length} tâche{allDone.length > 1 ? "s" : ""} terminée{allDone.length > 1 ? "s" : ""}
                          <span style={{ marginLeft: "auto", fontSize: 10 }}>{showTaskArchive ? "▲" : "▼"}</span>
                        </button>

                        {showTaskArchive && (
                          <div style={{ marginTop: 10 }}>
                            {/* Barre recherche + tri */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                              <input
                                className="form-input"
                                placeholder="Rechercher…"
                                value={taskHistSearch}
                                onChange={e => setTaskHistSearch(e.target.value)}
                                style={{ flex: "1 1 auto", minWidth: 0, padding: "5px 10px", fontSize: 11 }}
                              />
                              <select
                                className="form-select"
                                value={taskHistSort}
                                onChange={e => setTaskHistSort(e.target.value)}
                                style={{ width: "auto", fontSize: 11, padding: "5px 8px" }}
                              >
                                <option value="recent">Récentes</option>
                                <option value="oldest">Plus anciennes</option>
                                <option value="az">A → Z</option>
                                <option value="assignee">Par assigné</option>
                              </select>
                            </div>

                            {/* Liste */}
                            {histSorted.length === 0 && <div className="empty" style={{ fontSize: 11, padding: "8px 0" }}>Aucun résultat.</div>}
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {histSorted.map(t => (
                                <div key={t.id} onClick={() => setTaskDetailModal(t)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border-light)", borderLeft: "3px solid #16a34a", opacity: 0.72, cursor: "pointer", transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.72"}>
                                  <CheckCircle2 size={13} strokeWidth={1.8} color="#16a34a" style={{ flexShrink: 0 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, textDecoration: "line-through", color: "var(--text-base)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text || "—"}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      {(t.assignees || []).length > 0 && (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                          <User size={9} strokeWidth={1.8}/> {t.assignees.map(a => (a.name || "").split(" ")[0]).filter(Boolean).join(", ")}
                                        </span>
                                      )}
                                      {t.completedAt && (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                          <CheckCircle2 size={9} strokeWidth={1.8} color="#16a34a"/> {formatDateShort(t.completedAt.split("T")[0])}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {canManageSpace && (
                                    <span
                                      style={{ cursor: "pointer", color: "#e63946", display: "inline-flex", flexShrink: 0 }}
                                      title="Supprimer définitivement"
                                      onClick={e => { e.stopPropagation(); requestConfirm(`Supprimer définitivement "${t.text}" ?`, () => {
                                        setTasks(prev => prev.filter(x => x.id !== t.id));
                                        api.delete(`/tasks/${t.id}`).catch(err => addToast(`Erreur suppression : ${err?.message || 'serveur'}`, 'error'));
                                        if (t.actionId) onTaskComplete?.(t.actionId);
                                        addToast("Tâche supprimée");
                                      }); }}
                                    >
                                      <Trash2 size={11} strokeWidth={1.8}/>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* DEMANDES DE TÂCHE */}
            {(() => {
              const spaceTaskRequests = taskRequests.filter(tr => tr.space === subPage && (activeCycle === "Toutes" || tr.cycle === activeCycle));
              const isResponsible = accessObj?.canManage || currentTeam.some(m => m.nom === currentUser.nom && (m.role === "Responsable" || m.role === "Direction"));
              
              if (spaceTaskRequests.length === 0 || !isResponsible) return null;

              return (
                <div style={{ background: "var(--bg-surface)", borderRadius: 12, border: "2px solid #d97706", padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#d97706", marginBottom: 16, display:"flex", alignItems:"center", gap:5 }}><Star size={12} strokeWidth={1.8}/> Demandes de tâche ({spaceTaskRequests.length})</div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {spaceTaskRequests.map(tr => (
                      <div key={tr.id} style={{ background: "var(--bg-hover)", padding: 14, borderRadius: 8, border: "1px solid #d97706", display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* BOUTONS EN HAUT */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button 
                            className="btn-primary" 
                            style={{ padding: "6px 12px", fontSize: 10, flex: 1 }} 
                            onClick={() => {
                              setTaskRequestAssignModal(tr);
                              setTaskRequestSelectedAssignees([]);
                            }}
                          >
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}><CheckCircle2 size={11} strokeWidth={1.8}/> Assigner</span>
                          </button>
                          <button 
                            style={{ padding: "6px 12px", fontSize: 10, background: "rgba(229,57,70,0.15)", border: "1.5px solid rgba(229,57,70,0.3)", color: "#e63946", borderRadius: 6, cursor: "pointer", fontWeight: 600, transition: "all 0.2s", flex: 1 }} 
                            onClick={() => requestConfirm(`Refuser la demande de tâche "${tr.text}" ?`, () => handleRefuseTaskRequest(tr.id))}
                            title="Refuser cette demande de tâche"
                          >
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}><XCircle size={11} strokeWidth={1.8}/> Refuser</span>
                          </button>
                        </div>

                        {/* CONTENU DE LA DEMANDE */}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-base)", marginBottom: 6 }}>
                            {tr.text}
                            <span style={{ fontSize: 9, marginLeft: 8, color: "#d97706", fontWeight: 700, background: "rgba(217, 119, 6, 0.15)", padding: "2px 6px", borderRadius: 4 }}>
                              DEMANDE
                            </span>
                          </div>
                          {tr.description && <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>{tr.description}</div>}
                          <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Pin size={10} strokeWidth={1.8}/> Par: <strong>{tr.requestedBy}</strong></span>
                            {tr.deadline && <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Calendar size={10} strokeWidth={1.8}/> Délai: <strong>{formatDateShort(tr.deadline)}</strong></span>}
                          </div>
                          {tr.actionId && (() => {
                            const relatedAction = actions?.find(a => a.id === tr.actionId);
                            return relatedAction ? (
                              <div style={{ marginBottom: 8 }}>
                                <button
                                  onClick={() => { if (navigate) { navigate("actions"); setHighlightedActionId?.(relatedAction.id); setTimeout(() => setHighlightedActionId?.(null), 3000); }}}
                                  style={{ background: "rgba(26, 86, 219, 0.15)", border: "1px solid rgba(26, 86, 219, 0.3)", color: "#1a56db", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 11, transition: "all 0.2s" }}
                                  title={`Aller à l'action: ${relatedAction.etablissement}`}
                                >
                                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Link2 size={11} strokeWidth={1.8}/> Vers l'action: <strong>{relatedAction.etablissement}</strong></span>
                                </button>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {/* MODALE D'ASSIGNATION */}
                        {taskRequestAssignModal?.id === tr.id && (
                          <div className="modal-overlay" style={{ zIndex: 5001 }} onClick={() => setTaskRequestAssignModal(null)}>
                            <div className="modal-box" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
                              <div className="modal-header">
                                <div className="modal-header-title">Assigner la tâche</div>
                                <button className="modal-close-btn" onClick={() => setTaskRequestAssignModal(null)}><X size={14} strokeWidth={2} /></button>
                              </div>
                              <div className="modal-body" style={{ gap: 16 }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Assigner à :</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {currentTeam.map(m => {
                                      const isSelected = taskRequestSelectedAssignees.includes(m.nom);
                                      return (
                                        <button
                                          key={m.nom}
                                          onClick={() => {
                                            setTaskRequestSelectedAssignees(prev => 
                                              isSelected ? prev.filter(n => n !== m.nom) : [...prev, m.nom]
                                            );
                                          }}
                                          style={{
                                            padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                            border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`,
                                            background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-hover)",
                                            color: isSelected ? "#1a56db" : "var(--text-base)",
                                            transition: "all 0.2s",
                                            display: "flex", alignItems: "center", gap: 5,
                                          }}
                                        >
                                          {isSelected ? "✓ " : ""}{m.nom}
                                          {(() => { const info = directory?.find(d => d.nom === m.nom); const s = MEMBER_STATUS[info?.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setTaskRequestAssignModal(null)}>Annuler</button>
                                <button
                                  className="btn-primary"
                                  onClick={() => {
                                    if (taskRequestSelectedAssignees.length > 0) {
                                      handleAssignTaskRequest(tr.id, taskRequestSelectedAssignees, [subPage]);
                                      setTaskRequestAssignModal(null);
                                      setTaskRequestSelectedAssignees([]);
                                    }
                                  }}
                                >
                                  Confirmer
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* INSTRUCTIONS DE L'ÉQUIPE */}
            <div className="space-instructions" style={{ background: "rgba(26, 86, 219, 0.04)", border: "1px dashed rgba(26, 86, 219, 0.3)", borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Pin size={11} strokeWidth={1.8}/> Instructions de l'équipe</span></div>
              <div style={{ fontSize: 13, color: "var(--text-base)", lineHeight: 1.6, wordBreak: "break-word" }}>
                {meta.instructions ? meta.instructions : <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Aucune instruction renseignée.</span>}
              </div>
            </div>

          </div>

          {/* ================= COLONNE DROITE (Filtres + Grille Équipe/Mur + Docs) ================= */}
          <div className="space-col">
            <div className="toolbar-wrap" style={{ marginBottom: 20 }}>
              <div className="toolbar-group cycles-group">
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>CYCLE :</span>
                {cycles.map(y => <div key={y} className={`year-tab ${activeCycle === y ? "active" : ""}`} onClick={() => setActiveCycle(y)}>{y}</div>)}
                <div className={`year-tab ${activeCycle === "Toutes" ? "active" : ""}`} onClick={() => setActiveCycle("Toutes")}>Tous</div>
              </div>
              <div className="toolbar-group" style={{ marginLeft: "auto", borderLeft: "1px solid var(--border-light)", paddingLeft: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Trier docs :</span>
                <select className="form-select" style={{ width: "auto", border: "none", background: "transparent", paddingLeft: 4 }} value={docsSort} onChange={(e) => setDocsSort(e.target.value)}>
                  <option value="date_desc">Plus récents</option>
                  <option value="date_asc">Plus anciens</option>
                  <option value="nom_asc">Nom (A-Z)</option>
                  <option value="nom_desc">Nom (Z-A)</option>
                </select>
              </div>
            </div>

            {/* !!! LA GRILLE CORRIGÉE (CÔTE À CÔTE) !!! */}
            <div className="space-two-col" style={{ marginBottom: 24 }}>
              
              {/* BLOC ÉQUIPE */}
              <div className="sc" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600 }}>Équipe {teamYear}</div>
                  {canManageSpace && <button className="btn-secondary" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => setManageTeamModal({ year: teamYear, space: subPage })}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><Settings size={10} strokeWidth={1.8}/> Gérer</span></button>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {currentTeam.map((m, i) => {
                    const memberObj = findMemberByName(directory, m.nom);
                    const avatarVal = memberObj ? memberObj.avatar : m.nom.charAt(0);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderRadius: 20 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: isAvatarUrl(avatarVal) ? "transparent" : color, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <AvatarInner avatar={avatarVal} nom={m.nom} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{m.nom}</div>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", borderLeft: "1px solid var(--border-light)", paddingLeft: 6 }}>{m.role}</div>
                      </div>
                    );
                  })}
                  {currentTeam.length === 0 && <div className="empty" style={{ padding: 10, fontSize: 11 }}>Aucun membre défini.</div>}
                </div>
              </div>

              {/* BLOC MUR DE DISCUSSION */}
              <div className="sc space-wall" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", height: "350px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600, padding: "18px 18px 10px", borderBottom: "1px solid var(--border-light)" }}>Mur de l'espace</div>
                <div ref={spaceWallContainerRef} style={{ flex: 1, overflowY: "auto", padding: "10px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {(spaceChats[subPage] || []).map(m => {
                    const isMe = m.auteur === currentUser.nom;
                    return (
                      <div key={m.id} className={`msg-row ${isMe ? "mine" : ""}`}>
                        <div className="msg-av" style={{ background: isAvatarUrl(m.avatar) ? "transparent" : color, overflow: "hidden", padding: 0 }}>
                          <AvatarInner avatar={m.avatar} nom={m.auteur} />
                        </div>
                        <div className="msg-bubble">
                          {!isMe && <div className="msg-author">{m.auteur}</div>}
                          <div className="msg-text">{m.texte}</div>
                          <div className="msg-time">{m.heure}</div>
                        </div>
                      </div>
                    );
                  })}
                  {(spaceChats[subPage] || []).length === 0 && <div className="empty" style={{ padding: 20 }}>Aucun message sur ce mur.</div>}
                </div>
                <div style={{ padding: "10px", borderTop: "1px solid var(--border-light)", display: "flex", gap: 8, background: "var(--bg-hover)" }}>
                  <input className="form-input" style={{ padding: "8px 12px", fontSize: 12 }} placeholder="Écrire à l'équipe..." value={spaceChatInput} onChange={e => setSpaceChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendSpaceMessage(subPage); }} />
                  <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => sendSpaceMessage(subPage)}>Envoyer</button>
                </div>
              </div>
            </div>

            {/* DOCUMENTS */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div className="sec" style={{ margin: 0 }}>Documents</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <input ref={spaceFileRef} type="file" multiple style={{ display: "none" }} onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files);
                    const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Jil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
                    const targetYear = activeCycle === "Toutes" ? cycles[0] : activeCycle;
                    const newDocs = [];
                    for (const f of files) {
                      try {
                        const formData = new FormData();
                        formData.append('file', f);
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(`${API_URL}/upload`, {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });
                        const uploaded = await res.json();
                        newDocs.push({ id: Date.now() + Math.random(), nom: uploaded.nom, url: uploaded.url, type: uploaded.type, date: `${mois[new Date().getMonth()]} ${new Date().getFullYear()}`, cycle: targetYear, taille: uploaded.taille, section: currentSections[0] });
                      } catch {
                        newDocs.push({ id: Date.now() + Math.random(), nom: f.name, type: f.name.split(".").pop().toUpperCase(), date: `${mois[new Date().getMonth()]} ${new Date().getFullYear()}`, cycle: targetYear, taille: `${Math.round(f.size / 1024)} Ko`, section: currentSections[0] });
                      }
                    }
                    setDocsData(prev => {
                      const updated = { ...prev, [subPage]: [...(prev[subPage] || []), ...newDocs] };
                      api.put(`/spaces/${encodeURIComponent(subPage)}/settings/docs`, { value: updated[subPage] }).catch(console.error);
                      return updated;
                    });
                    addToast(`${files.length} document(s) ajouté(s)`, "success");
                  }
                }} />
                {(acc === "edit" || acc === "view") && <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11, marginRight: "8px" }} onClick={() => spaceFileRef.current?.click()}><Upload size={11} strokeWidth={1.8}/> Ajouter un fichier</button>}
                {acc === "edit" && <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setNewSectionModal(true)}><Plus size={11} strokeWidth={2.5}/> Nouvelle section</button>}
              </div>
            </div>

            {currentSections.map((sec, idx) => {
              let secDocs = docs.filter(d => (d.section || currentSections[0]) === sec && (activeCycle === "Toutes" || d.cycle === activeCycle));
              if (secDocs.length === 0 && acc === "view") return null;

              secDocs.sort((a, b) => {
                if (docsSort === "nom_asc") return a.nom.localeCompare(b.nom);
                if (docsSort === "nom_desc") return b.nom.localeCompare(a.nom);
                if (docsSort === "date_desc") return b.id - a.id;
                if (docsSort === "date_asc") return a.id - b.id;
                return 0;
              });

              return (
                <div key={sec} style={{ marginBottom: 32 }}>
                  <div className="section-title">
                    <div style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 5 }}><Folder size={11} strokeWidth={1.8}/> {sec}</div>
                    {acc === "edit" && sec !== "Archives" && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {idx > 0 && <button className="section-ctrl" onClick={() => moveSection(sec, -1)}>↑</button>}
                        {idx < currentSections.length - 2 && <button className="section-ctrl" onClick={() => moveSection(sec, 1)}>↓</button>}
                        <button className="section-ctrl" onClick={() => setRenameSectionModal(sec)}><Pencil size={11} strokeWidth={1.8}/></button>
                        {idx !== 0 && <button className="section-ctrl" onClick={() => deleteSection(sec)}><Trash2 size={11} strokeWidth={1.8}/></button>}
                      </div>
                    )}
                  </div>
                  <div className="dtw">
                    {secDocs.map((d, i) => (
                      <DocRow key={i} d={d} canEdit={acc === "edit"} sections={currentSections} onChangeSection={changeDocSection} onDelete={() => requestConfirm(`Supprimer ${d.nom} ?`, () => moveToTrash("doc", d, subPage))} />
                    ))}
                    {secDocs.length === 0 && <div className="empty" style={{ padding: 16 }}>Aucun document dans cette section.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ONGLET CORBEILLE --- */}
      {/* ─── ONGLET HISTORIQUE DES TÂCHES (supprimé, remplacé par dropdown inline) ─── */}
      {false && (() => {
        const allSpaceTasks = tasks.filter(t => t.space === subPage);

        // Tri intelligent : actives en haut (par urgence/statut), terminées en bas (par date complétion)
        const activeTasks = allSpaceTasks.filter(t => t.status !== "Terminé");
        const doneTasks   = allSpaceTasks.filter(t => t.status === "Terminé");

        const sortedActive = sortTasksSmart(activeTasks);
        const sortedDone   = (() => {
          const filtered = doneTasks.filter(t => {
            if (!taskHistSearch) return true;
            const q = taskHistSearch.toLowerCase();
            return (t.text || "").toLowerCase().includes(q) ||
              (t.assignees || []).some(a => (a.name || "").toLowerCase().includes(q)) ||
              (t.createdBy || "").toLowerCase().includes(q);
          });
          if (taskHistSort === "recent")    return [...filtered].sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0));
          if (taskHistSort === "oldest")    return [...filtered].sort((a, b) => new Date(a.completedAt || a.updatedAt || 0) - new Date(b.completedAt || b.updatedAt || 0));
          if (taskHistSort === "az")        return [...filtered].sort((a, b) => (a.text || "").localeCompare(b.text || ""));
          if (taskHistSort === "assignee")  return [...filtered].sort((a, b) => ((a.assignees?.[0]?.name) || "").localeCompare((b.assignees?.[0]?.name) || ""));
          return filtered;
        })();

        const allFiltered = sortedActive.filter(t => {
          if (!taskHistSearch) return true;
          const q = taskHistSearch.toLowerCase();
          return (t.text || "").toLowerCase().includes(q) ||
            (t.assignees || []).some(a => (a.name || "").toLowerCase().includes(q)) ||
            (t.createdBy || "").toLowerCase().includes(q);
        });

        return (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>Tâches</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Historique des tâches</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                {activeTasks.length} en cours · {doneTasks.length} terminée{doneTasks.length !== 1 ? "s" : ""} · {allSpaceTasks.length} total
              </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar-wrap" style={{ marginBottom: 20 }}>
              <input
                className="form-input"
                placeholder="Rechercher une tâche, un assigné…"
                value={taskHistSearch}
                onChange={e => setTaskHistSearch(e.target.value)}
                style={{ flex: "1 1 auto", maxWidth: 280 }}
              />
              <div className="toolbar-group" style={{ marginLeft: "auto", borderLeft: "1px solid var(--border-light)", paddingLeft: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Trier&nbsp;:</span>
                <select className="form-select" style={{ width: "auto", border: "none", background: "transparent", paddingLeft: 4 }} value={taskHistSort} onChange={e => setTaskHistSort(e.target.value)}>
                  <option value="recent">Terminées récemment</option>
                  <option value="oldest">Terminées (plus ancien)</option>
                  <option value="az">Alphabétique</option>
                  <option value="assignee">Par assigné</option>
                </select>
              </div>
            </div>

            {/* Tâches actives */}
            {allFiltered.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Zap size={11} strokeWidth={2} color="#d97706" /> En cours ({allFiltered.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {allFiltered.map(t => {
                    const isDone   = isTaskEffectivelyDone(t);
                    const now      = new Date(); now.setHours(0,0,0,0);
                    const dl       = t.deadline ? new Date(t.deadline + "T00:00:00") : null;
                    const daysLeft = dl ? Math.ceil((dl - now) / 86400000) : null;
                    const isRetard = daysLeft !== null && daysLeft < 0 && !isDone;
                    const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !isDone;
                    const pct = (t.assignees || []).length > 0
                      ? Math.round((t.assignees.filter(a => a.completed).length / t.assignees.length) * 100)
                      : (isDone ? 100 : 0);
                    const barColor = isDone ? "#16a34a" : isRetard ? "#e63946" : isUrgent ? "#d97706" : "#1a56db";

                    return (
                      <div key={t.id} style={{ padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderLeft: `3px solid ${barColor}`, borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? "#16a34a" : "var(--text-base)", textDecoration: isDone ? "line-through" : "none", marginBottom: 4 }}>{t.text || "—"}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            {(t.assignees || []).length > 0 && (
                              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <User size={9} strokeWidth={1.8}/> {t.assignees.map(a => (a.name || "").split(" ")[0]).filter(Boolean).join(", ")}
                              </span>
                            )}
                            {t.deadline && (
                              <span style={{ fontSize: 10, color: isRetard ? "#e63946" : isUrgent ? "#d97706" : "var(--text-muted)", fontWeight: isRetard || isUrgent ? 700 : 400, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <CalendarRange size={9} strokeWidth={1.8}/>
                                {isRetard ? `Retard ${Math.abs(daysLeft)}j` : daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? "Demain" : `J-${daysLeft}`}
                              </span>
                            )}
                            {t.status && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: isDone ? "rgba(22,163,74,0.1)" : "var(--bg-alt)", color: isDone ? "#16a34a" : "var(--text-dim)", fontWeight: 600 }}>{t.status}</span>}
                          </div>
                          {(t.assignees || []).length > 0 && (
                            <div style={{ marginTop: 6, height: 3, background: "var(--bg-alt)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
                            </div>
                          )}
                        </div>
                        {(acc === "edit" || (t.assignees || []).some(a => a.name === currentUser.nom)) && (
                          <span style={{ cursor: "pointer", color: "var(--text-muted)", display: "inline-flex", flexShrink: 0 }} onClick={() => setTaskModal({ ...t, assignees: t.assignees || [] })} title="Modifier">
                            <Pencil size={12} strokeWidth={1.8}/>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tâches terminées */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={11} strokeWidth={2} color="#16a34a" /> Terminées ({sortedDone.length})
              </div>
              {sortedDone.length === 0 && (
                <div className="empty" style={{ padding: "20px 0" }}>{taskHistSearch ? "Aucun résultat." : "Aucune tâche terminée."}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedDone.map(t => (
                  <div key={t.id} style={{ padding: "10px 16px", background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderLeft: "3px solid #16a34a", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, opacity: 0.75 }}>
                    <CheckCircle2 size={14} strokeWidth={1.8} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-base)", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text || "—"}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {(t.assignees || []).length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <User size={9} strokeWidth={1.8}/> {t.assignees.map(a => (a.name || "").split(" ")[0]).filter(Boolean).join(", ")}
                          </span>
                        )}
                        {t.completedAt && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <CheckCircle2 size={9} strokeWidth={1.8} color="#16a34a"/> {formatDateShort(t.completedAt.split("T")[0])}
                          </span>
                        )}
                        {t.createdBy && <span>par {t.createdBy}</span>}
                      </div>
                    </div>
                    {canManageSpace && (
                      <span
                        style={{ cursor: "pointer", color: "#e63946", display: "inline-flex", flexShrink: 0 }}
                        title="Supprimer définitivement"
                        onClick={() => requestConfirm(`Supprimer définitivement "${t.text}" ?`, () => {
                          setTasks(prev => prev.filter(x => x.id !== t.id));
                          api.delete(`/tasks/${t.id}`).catch(err => addToast(`Erreur suppression : ${err?.message || 'serveur'}`, 'error'));
                        })}
                      >
                        <Trash2 size={11} strokeWidth={1.8}/>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === "corbeille" && (() => {
        const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
        const commonTrash = spaceTrash.filter(t => t.type === "doc");
        const personalTrash = spaceTrash.filter(t => t.type !== "doc" && t.deletedBy === currentUser.nom);

        const TrashItem = ({ item }) => (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{item.data.nom || item.data.titre || item.data.etablissement || item.data.text || "Élément"}</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "rgba(230,57,70,0.1)", color: "#e63946", fontWeight: 700 }}>{item.type}</span>
                {item.data.type && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "var(--bg-alt)", color: "var(--text-muted)", fontWeight: 700 }}>{item.data.type}</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Trash2 size={9} strokeWidth={1.8}/> Supprimé par <strong>{item.deletedBy}</strong></span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={9} strokeWidth={1.8}/> {new Date(item.deletedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {item.data.taille && <span>{item.data.taille}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              {item.type === "doc" && item.data.url && (
                <a
                  href={`${API_BASE}${item.data.url}`}
                  download={item.data.nom}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#1a56db", cursor: "pointer", textDecoration: "none" }}
                  title="Télécharger avant de supprimer définitivement"
                >
                  <Download size={11} strokeWidth={1.8}/> Télécharger
                </a>
              )}
              <button
                onClick={() => restoreTrash(item.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#16a34a", cursor: "pointer" }}
              >
                <RotateCcw size={11} strokeWidth={1.8}/> Restaurer
              </button>
              <button
                onClick={() => forceDeleteTrash(item.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#e63946", cursor: "pointer" }}
              >
                <Trash2 size={11} strokeWidth={1.8}/> Supprimer définitivement
              </button>
            </div>
          </div>
        );

        return (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>

            {/* INFO */}
            <div style={{ background: "rgba(230,57,70,0.05)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={13} strokeWidth={1.8} color="#e63946"/>
              Les éléments supprimés définitivement ne peuvent pas être récupérés. Les fichiers non restaurés seront purgés automatiquement après 30 jours.
            </div>

            {/* CORBEILLE COMMUNE — fichiers de l'espace */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Folder size={14} strokeWidth={1.8} color="#1a56db"/>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-base)" }}>Fichiers communs de l'espace</span>
                  <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 20, background: commonTrash.length > 0 ? "rgba(230,57,70,0.1)" : "var(--bg-hover)", color: commonTrash.length > 0 ? "#e63946" : "var(--text-muted)", fontWeight: 700 }}>{commonTrash.length}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Visible par tous les éditeurs de l'espace</span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {commonTrash.length === 0
                  ? <div className="empty" style={{ padding: 24 }}>Aucun fichier dans la corbeille commune.</div>
                  : commonTrash.sort((a, b) => b.deletedAt - a.deletedAt).map(item => <TrashItem key={item.id} item={item} />)
                }
              </div>
            </div>

            {/* CORBEILLE PERSONNELLE — mes suppressions */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <User size={14} strokeWidth={1.8} color="#7c3aed"/>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-base)" }}>Ma corbeille personnelle</span>
                  <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 20, background: personalTrash.length > 0 ? "rgba(124,58,237,0.1)" : "var(--bg-hover)", color: personalTrash.length > 0 ? "#7c3aed" : "var(--text-muted)", fontWeight: 700 }}>{personalTrash.length}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Visible uniquement par vous</span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {personalTrash.length === 0
                  ? <div className="empty" style={{ padding: 24 }}>Aucun élément dans votre corbeille personnelle.</div>
                  : personalTrash.sort((a, b) => b.deletedAt - a.deletedAt).map(item => <TrashItem key={item.id} item={item} />)
                }
              </div>
            </div>

          </div>
        );
      })()}

      {/* --- ONGLET TRÉSORERIE --- */}
      {activeTab === "tresorerie" && subPage === "Trésorerie" && acc === "edit" && (
        <div style={{ marginTop: 24 }}>
          <Tresorerie transactions={transactions} budgets={budgets} hasPower={(p) => true} setTransactionModal={setTransactionModal} deleteTransaction={deleteTransaction} validerTransaction={validerTransaction} devisFactures={devisFactures} />
        </div>
      )}

      {/* --- ONGLET NOTES DE FRAIS (TRÉSORERIE) --- */}
      {activeTab === "ndf_treso" && subPage === "Trésorerie" && acc === "edit" && (() => {
        const SC = {
          "Brouillon":       { bg: "var(--bg-alt)",           c: "var(--text-muted)" },
          "Soumise":         { bg: "rgba(26,86,219,0.1)",     c: "#1a56db" },
          "En vérification": { bg: "rgba(217,119,6,0.1)",     c: "#d97706" },
          "Validée":         { bg: "rgba(22,163,74,0.1)",     c: "#16a34a" },
          "Remboursée":      { bg: "rgba(22,163,74,0.18)",    c: "#15803d" },
          "Refusée":         { bg: "rgba(230,57,70,0.1)",     c: "#e63946" },
        };

        const aTraiter  = notesFrais.filter(n => n.statut === "Soumise");
        const enVerif   = notesFrais.filter(n => n.statut === "En vérification");
        const archivees = notesFrais.filter(n => ["Validée","Remboursée","Refusée"].includes(n.statut));

        const baseList = ndfTab === "traiter"  ? aTraiter
          : ndfTab === "encours"   ? enVerif
          : ndfTab === "archivees" ? archivees
          : notesFrais;

        const q = ndfSearch.toLowerCase().trim();
        const filtered = baseList.filter(n =>
          !q ||
          (n.numeroDossier || "").toLowerCase().includes(q) ||
          (n.demandeurNom || n.demandeur || "").toLowerCase().includes(q) ||
          (n.description || "").toLowerCase().includes(q) ||
          (n.categorie || "").toLowerCase().includes(q) ||
          (n.pole || "").toLowerCase().includes(q) ||
          (n.projet || "").toLowerCase().includes(q)
        );

        const sortedNdf = [...filtered].sort((a, b) => {
          if (ndfSort === "date_asc")     return new Date(a.date) - new Date(b.date);
          if (ndfSort === "montant_desc") return Number(b.montant) - Number(a.montant);
          if (ndfSort === "montant_asc")  return Number(a.montant) - Number(b.montant);
          if (ndfSort === "demandeur")    return (a.demandeurNom || a.demandeur || "").localeCompare(b.demandeurNom || b.demandeur || "");
          if (ndfSort === "statut") {
            const o = { "Soumise":0,"En vérification":1,"Brouillon":2,"Validée":3,"Remboursée":4,"Refusée":5 };
            return (o[a.statut]??9)-(o[b.statut]??9);
          }
          return new Date(b.date) - new Date(a.date); // date_desc (default)
        });

        const pendingAmount    = aTraiter.reduce((s, n) => s + Number(n.montant), 0);
        const enVerifAmount    = enVerif.reduce((s, n) => s + Number(n.montant), 0);
        const validatedAmount  = notesFrais.filter(n => n.statut === "Validée").reduce((s, n) => s + Number(n.montant), 0);
        const reimbursedAmount = notesFrais.filter(n => n.statut === "Remboursée").reduce((s, n) => s + Number(n.montant), 0);

        const TABS = [
          { key:"traiter",   label:"À traiter",       count: aTraiter.length,          color:"#e63946" },
          { key:"encours",   label:"En vérification",  count: enVerif.length,           color:"#d97706" },
          { key:"archivees", label:"Archivées",         count: archivees.length,         color:"#94a3b8" },
          { key:"toutes",    label:"Toutes",            count: notesFrais.length,        color:"#0f2d5e" },
        ];

        return (
          <div style={{ marginTop: 24 }}>
            {/* KPIs */}
            <div className="space-kpi-4">
              {[
                { label: "À traiter",       val: `${pendingAmount.toFixed(2)} €`,    unit: `${aTraiter.length} NDF`,  color: "#e63946" },
                { label: "En vérification", val: `${enVerifAmount.toFixed(2)} €`,    unit: `${enVerif.length} NDF`,   color: "#d97706" },
                { label: "Validées",        val: `${validatedAmount.toFixed(2)} €`,  unit: "à rembourser",             color: "#16a34a" },
                { label: "Remboursées",     val: `${reimbursedAmount.toFixed(2)} €`, unit: "total",                   color: "#15803d" },
              ].map((k, i) => (
                <div key={i} className="kc">
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 18 }}>{k.val}</div>
                  <div className="kd">{k.unit}</div>
                </div>
              ))}
            </div>

            {/* Onglets */}
            <div style={{ display:"flex", gap:2, borderBottom:"2px solid var(--border-light)", marginBottom:14 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setNdfTab(t.key)} style={{
                  padding:"7px 14px", border:"none", background:"none", cursor:"pointer", fontSize:11, fontWeight:700,
                  color: ndfTab === t.key ? t.color : "var(--text-muted)",
                  borderBottom: ndfTab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
                  marginBottom:-2, transition:"all 0.15s",
                }}>
                  {t.label}
                  <span style={{ marginLeft:5, padding:"1px 6px", borderRadius:10, fontSize:9, background: ndfTab===t.key ? `${t.color}18` : "var(--bg-alt)", color: ndfTab===t.key ? t.color : "var(--text-muted)", fontWeight:700 }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Barre recherche + tri */}
            <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180, position:"relative" }}>
                <Search size={12} strokeWidth={1.8} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }} />
                <input
                  value={ndfSearch} onChange={e => setNdfSearch(e.target.value)}
                  placeholder="Rechercher demandeur, dossier, description…"
                  style={{ width:"100%", padding:"7px 9px 7px 28px", borderRadius:8, border:"1px solid var(--border-light)", background:"var(--bg-alt)", fontSize:11, color:"var(--text-base)", boxSizing:"border-box" }}
                />
              </div>
              <select value={ndfSort} onChange={e => setNdfSort(e.target.value)} style={{ padding:"7px 10px", borderRadius:8, border:"1px solid var(--border-light)", background:"var(--bg-alt)", fontSize:11, color:"var(--text-dim)", cursor:"pointer" }}>
                <option value="date_desc">Date ↓</option>
                <option value="date_asc">Date ↑</option>
                <option value="montant_desc">Montant ↓</option>
                <option value="montant_asc">Montant ↑</option>
                <option value="statut">Par statut</option>
                <option value="demandeur">Par demandeur</option>
              </select>
              <span style={{ display:"flex", alignItems:"center", fontSize:10, color:"var(--text-muted)", fontWeight:600 }}>{sortedNdf.length} résultat{sortedNdf.length!==1?"s":""}</span>
            </div>

            {/* Liste */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sortedNdf.length === 0 && (
                <div className="empty" style={{ padding:40 }}>
                  {ndfSearch ? "Aucune NDF ne correspond à la recherche." : "Aucune note de frais dans cet onglet."}
                </div>
              )}
              {sortedNdf.map(ndf => {
                const meta = SC[ndf.statut] || SC["Brouillon"];
                const CatIcon = SV_CAT_ICON[ndf.categorie] || Lightbulb;
                const demandeur = ndf.demandeurNom || ndf.demandeur || "—";
                const urgent = ndf.statut === "Soumise";
                return (
                  <div key={ndf.id}
                    onClick={() => onOpenNoteFrais && onOpenNoteFrais(ndf)}
                    style={{ background:"var(--bg-surface)", border:`1px solid ${urgent ? "rgba(230,57,70,0.3)" : "var(--border-light)"}`, borderLeft:`4px solid ${meta.c}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"box-shadow 0.15s, transform 0.1s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,0.07)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}
                  >
                    <div style={{ width:38, height:38, borderRadius:9, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:meta.c }}>
                      <CatIcon size={18} strokeWidth={1.8}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)" }}>{ndf.numeroDossier}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--text-base)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ndf.description || ndf.categorie}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:10, color:"var(--text-muted)" }}>👤 {demandeur}</span>
                        <span style={{ fontSize:10, color:"var(--text-muted)" }}>{formatDateShort(ndf.date)}</span>
                        {ndf.pole && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:7, background:"var(--bg-alt)", color:"var(--text-dim)", fontWeight:600 }}>{ndf.pole}</span>}
                        {ndf.projet && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:7, background:"rgba(26,86,219,0.08)", color:"#1a56db", fontWeight:600 }}>{ndf.projet}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:17, fontWeight:800, fontFamily:"var(--font-display)", color:meta.c, marginBottom:3 }}>{Number(ndf.montant).toFixed(2)} €</div>
                      <span style={{ fontSize:9, padding:"2px 8px", borderRadius:10, fontWeight:700, background:meta.bg, color:meta.c }}>
                        <StatusBadge map={NDF_STATUS} value={ndf.statut} size={9}/>
                      </span>
                    </div>
                    <ChevronRight size={14} strokeWidth={1.8} color="var(--text-muted)"/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* --- ONGLET DEVIS & FACTURES (TRÉSORERIE) --- */}
      {activeTab === "df_treso" && subPage === "Trésorerie" && acc === "edit" && (() => {
        const SC_DF = {
          "Brouillon":         { bg: "var(--bg-alt)",              c: "var(--text-muted)" },
          "Soumis":            { bg: "rgba(26,86,219,0.1)",        c: "#1a56db" },
          "En traitement":     { bg: "rgba(217,119,6,0.1)",        c: "#d97706" },
          "Modif. demandée":   { bg: "rgba(124,58,237,0.1)",       c: "#7c3aed" },
          "Signé":             { bg: "rgba(22,163,74,0.1)",        c: "#16a34a" },
          "Refusé":            { bg: "rgba(230,57,70,0.1)",        c: "#e63946" },
        };

        const aTraiterDF   = devisFactures.filter(d => d.statut === "Soumis");
        const enTraitDF    = devisFactures.filter(d => d.statut === "En traitement");
        const modifDF      = devisFactures.filter(d => d.statut === "Modif. demandée");
        const signesDF     = devisFactures.filter(d => d.statut === "Signé");
        const archivesDF   = devisFactures.filter(d => ["Signé","Refusé"].includes(d.statut));

        const now = new Date();
        const signesMoisDF = signesDF.filter(d => {
          const dt = d.signedAt ? new Date(d.signedAt) : null;
          return dt && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
        });

        const baseDfList = dfTab === "traiter"  ? aTraiterDF
          : dfTab === "encours"   ? enTraitDF
          : dfTab === "modif"     ? modifDF
          : devisFactures;

        const qDf = dfSearch.toLowerCase().trim();
        const filteredDf = baseDfList.filter(d =>
          !qDf ||
          (d.titre || "").toLowerCase().includes(qDf) ||
          (d.createdBy || "").toLowerCase().includes(qDf) ||
          (d.type || "").toLowerCase().includes(qDf) ||
          (d.categorie || "").toLowerCase().includes(qDf) ||
          (d.emetteur || "").toLowerCase().includes(qDf) ||
          (d.destinataire || "").toLowerCase().includes(qDf)
        );

        const sortedDf = [...filteredDf].sort((a, b) => {
          if (dfSort === "date_asc")      return new Date(a.createdAt) - new Date(b.createdAt);
          if (dfSort === "montant_desc")  return Number(b.montant) - Number(a.montant);
          if (dfSort === "montant_asc")   return Number(a.montant) - Number(b.montant);
          if (dfSort === "demandeur")     return (a.createdBy || "").localeCompare(b.createdBy || "");
          if (dfSort === "statut") {
            const o = { "Soumis": 0, "En traitement": 1, "Modif. demandée": 2, "Brouillon": 3, "Signé": 4, "Refusé": 5 };
            return (o[a.statut] ?? 9) - (o[b.statut] ?? 9);
          }
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });

        const aTraiterAmt  = aTraiterDF.reduce((s, d) => s + Number(d.montant), 0);
        const enTraitAmt   = enTraitDF.reduce((s, d) => s + Number(d.montant), 0);
        const modifAmt     = modifDF.reduce((s, d) => s + Number(d.montant), 0);
        const signesMoisAmt = signesMoisDF.reduce((s, d) => s + Number(d.montant), 0);

        const DF_TABS = [
          { key: "traiter",  label: "À traiter",         count: aTraiterDF.length,  color: "#e63946" },
          { key: "encours",  label: "En traitement",     count: enTraitDF.length,   color: "#d97706" },
          { key: "modif",    label: "Modif. demandées",  count: modifDF.length,     color: "#7c3aed" },
          { key: "toutes",   label: "Toutes",            count: devisFactures.length, color: "#0f2d5e" },
        ];

        return (
          <div style={{ marginTop: 24 }}>
            {/* KPIs */}
            <div className="space-kpi-4">
              {[
                { label: "À traiter",          val: `${aTraiterAmt.toFixed(2)} €`,   unit: `${aTraiterDF.length} document${aTraiterDF.length !== 1 ? "s" : ""}`,  color: "#e63946" },
                { label: "En traitement",      val: `${enTraitAmt.toFixed(2)} €`,    unit: `${enTraitDF.length} en cours`,    color: "#d97706" },
                { label: "Modif. demandées",   val: `${modifAmt.toFixed(2)} €`,      unit: `${modifDF.length} en attente`,    color: "#7c3aed" },
                { label: "Signés ce mois",     val: `${signesMoisAmt.toFixed(2)} €`, unit: `${signesMoisDF.length} signé${signesMoisDF.length !== 1 ? "s" : ""}`, color: "#16a34a" },
              ].map((k, i) => (
                <div key={i} className="kc">
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 18 }}>{k.val}</div>
                  <div className="kd">{k.unit}</div>
                </div>
              ))}
            </div>

            {/* Onglets */}
            <div style={{ display: "flex", gap: 2, borderBottom: "2px solid var(--border-light)", marginBottom: 14 }}>
              {DF_TABS.map(t => (
                <button key={t.key} onClick={() => setDfTab(t.key)} style={{
                  padding: "7px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                  color: dfTab === t.key ? t.color : "var(--text-muted)",
                  borderBottom: dfTab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
                  marginBottom: -2, transition: "all 0.15s",
                }}>
                  {t.label}
                  <span style={{ marginLeft: 5, padding: "1px 6px", borderRadius: 10, fontSize: 9, background: dfTab === t.key ? `${t.color}18` : "var(--bg-alt)", color: dfTab === t.key ? t.color : "var(--text-muted)", fontWeight: 700 }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Barre recherche + tri */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
                <Search size={12} strokeWidth={1.8} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  value={dfSearch} onChange={e => setDfSearch(e.target.value)}
                  placeholder="Rechercher titre, demandeur, type, catégorie…"
                  style={{ width: "100%", padding: "7px 9px 7px 28px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-alt)", fontSize: 11, color: "var(--text-base)", boxSizing: "border-box" }}
                />
              </div>
              <select value={dfSort} onChange={e => setDfSort(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-alt)", fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
                <option value="date_desc">Date ↓</option>
                <option value="date_asc">Date ↑</option>
                <option value="montant_desc">Montant ↓</option>
                <option value="montant_asc">Montant ↑</option>
                <option value="statut">Par statut</option>
                <option value="demandeur">Par demandeur</option>
              </select>
              <span style={{ display: "flex", alignItems: "center", fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{sortedDf.length} résultat{sortedDf.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Liste */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedDf.length === 0 && (
                <div className="empty" style={{ padding: 40 }}>
                  {dfSearch ? "Aucun document ne correspond à la recherche." : "Aucun document dans cet onglet."}
                </div>
              )}
              {sortedDf.map(df => {
                const meta = SC_DF[df.statut] || SC_DF["Brouillon"];
                return (
                  <div key={df.id}
                    onClick={() => setDevisFactureModal(df)}
                    style={{ background: "var(--bg-surface)", border: `1px solid ${df.statut === "Soumis" ? "rgba(26,86,219,0.25)" : "var(--border-light)"}`, borderLeft: `4px solid ${meta.c}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow 0.15s, transform 0.1s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.c }}>
                      <FileText size={18} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{df.type}</span>
                        {df.categorie && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {df.categorie}</span>}
                        {df.horseBudget && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 7, background: "rgba(217,119,6,0.12)", color: "#d97706", fontWeight: 700 }}>⚠ Hors budget</span>}
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{df.titre || `${df.emetteur || ""} → ${df.destinataire || ""}`}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {df.createdBy && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>👤 {df.createdBy}</span>}
                        {(df.soumisAt || df.createdAt) && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDateShort(df.soumisAt || df.createdAt)}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-display)", color: meta.c, marginBottom: 3 }}>{Number(df.montant).toFixed(2)} €</div>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: meta.bg, color: meta.c }}>{df.statut}</span>
                    </div>
                    <ChevronRight size={14} strokeWidth={1.8} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}


      {/* --- ONGLET SUIVI RH --- */}
      {activeTab === "rh_suivi" && subPage === "Ressources Humaines" && (() => {
        const totalHours = volunteerHours.filter(h => h.status === "Validé").reduce((s, h) => s + h.hours, 0);
        const pendingHours = volunteerHours.filter(h => h.status === "En attente").reduce((s, h) => s + h.hours, 0);
        const openMissions = missions.filter(m => m.statut !== "Annulée" && m.statut !== "Fermée");
        const pendingCandidatures = missions.flatMap(m => m.candidatures).filter(c => c.statut === "En attente");
        const allPoles = ["Tous", ...Array.from(new Set(directory.map(m => m.pole).filter(Boolean))).sort()];
        const allStatuts = ["Tous", ...Object.keys(MEMBER_STATUS)];

        // Table unifiée par membre
        const today0 = new Date(); today0.setHours(0,0,0,0);
        const SORTS = {
          hValidated_desc: (a, b) => b.hValidated - a.hValidated,
          hValidated_asc:  (a, b) => a.hValidated - b.hValidated,
          hPending_desc:   (a, b) => b.hPending - a.hPending,
          hPending_asc:    (a, b) => a.hPending - b.hPending,
          tasks_desc:      (a, b) => b.activeTasks - a.activeTasks,
          tasks_late_desc: (a, b) => b.lateTasks - a.lateTasks,
          missions_desc:   (a, b) => b.memberMissions - a.memberMissions,
          nom_asc:         (a, b) => a.nom.localeCompare(b.nom),
          pole_asc:        (a, b) => (a.pole || "").localeCompare(b.pole || ""),
        };

        const allMemberRows = directory.map(m => {
          const hValidated = volunteerHours.filter(h => h.user === m.nom && h.status === "Validé").reduce((s, h) => s + h.hours, 0);
          const hPending = volunteerHours.filter(h => h.user === m.nom && h.status === "En attente").reduce((s, h) => s + h.hours, 0);
          const myTasks = (tasks || []).filter(t => (t.assignees || []).some(a => a.name === m.nom));
          const activeTasks  = myTasks.filter(t => !isTaskEffectivelyDone(t));
          const doneTasks    = myTasks.filter(t => isTaskEffectivelyDone(t));
          const lateTasks    = activeTasks.filter(t => t.deadline && new Date(t.deadline + "T00:00:00") < today0);
          const forceDone    = myTasks.filter(t => !!t.forceCompletedBy);
          const lockedTasks  = myTasks.filter(t => !!t.lockedBy && !isTaskEffectivelyDone(t));
          const memberMissions = missions.filter(ms => ms.candidatures?.some(c => c.nom === m.nom && c.statut === "Accepté"));
          return {
            ...m, hValidated, hPending,
            activeTasks: activeTasks.length, doneTasks: doneTasks.length,
            lateTasks: lateTasks.length, forceDone: forceDone.length, lockedTasks: lockedTasks.length,
            memberMissions: memberMissions.length,
          };
        });

        const memberRows = allMemberRows
          .filter(m => rhFilterPole === "Tous" || m.pole === rhFilterPole)
          .filter(m => rhFilterStatut === "Tous" || m.statut === rhFilterStatut)
          .filter(m => !rhSearch.trim() || m.nom.toLowerCase().includes(rhSearch.trim().toLowerCase()))
          .sort(SORTS[rhSort] || SORTS.hValidated_desc);

        // KPIs filtrés sur la sélection courante
        const filteredHours = memberRows.reduce((s, m) => s + m.hValidated, 0);
        const filteredPending = memberRows.reduce((s, m) => s + m.hPending, 0);

        // En-têtes de colonnes cliquables pour tri
        const ColHeader = ({ label, sortKey, sortKeyAlt }) => {
          const active = rhSort === sortKey || rhSort === sortKeyAlt;
          const isDesc = rhSort === sortKey;
          return (
            <div
              onClick={() => setRhSort(active && isDesc && sortKeyAlt ? sortKeyAlt : sortKey)}
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: active ? "#1a56db" : "var(--text-muted)", cursor: sortKey ? "pointer" : "default", display: "flex", alignItems: "center", gap: 3, userSelect: "none" }}
            >
              {label}
              {active && <span style={{ fontSize: 9 }}>{isDesc ? "↓" : "↑"}</span>}
            </div>
          );
        };

        return (
          <div style={{ marginTop: 24 }}>
            {/* KPIs */}
            <div className="space-kpi-5">
              {[
                { label: "Membres actifs", val: directory.filter(m => m.statut === "Actif").length, unit: "membres", color: "#16a34a" },
                { label: "En congé", val: directory.filter(m => { const t = new Date().toISOString().split('T')[0]; return (m.conges || []).some(c => c.debut <= t && c.fin >= t); }).length, unit: "actuellement", color: "#f97316" },
                { label: "Heures validées", val: totalHours, unit: "h", color: "#1a56db" },
                { label: "Heures en attente", val: pendingHours, unit: "h", color: "#d97706" },
                { label: "Missions ouvertes", val: openMissions.length, unit: "missions", color: "#7c3aed" },
                { label: "Candidatures", val: pendingCandidatures.length, unit: "à traiter", color: "#e63946" },
              ].map((k, i) => (
                <div key={i} className="kc">
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 20 }}>{k.val}</div>
                  <div className="kd">{k.unit}</div>
                </div>
              ))}
            </div>

            {/* Tableau unifié des membres */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
              {/* Barre de filtres */}
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "var(--bg-alt)" }}>
                <span style={{ fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <Users size={13} strokeWidth={1.8}/> Équipe ({memberRows.length}{memberRows.length < directory.length ? `/${directory.length}` : ""})
                </span>
                <div style={{ flex: 1 }} />
                {/* Recherche */}
                <input
                  value={rhSearch}
                  onChange={e => setRhSearch(e.target.value)}
                  placeholder="Rechercher un membre…"
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", width: "100%", maxWidth: 180, outline: "none" }}
                />
                {/* Filtre pôle */}
                <select value={rhFilterPole} onChange={e => setRhFilterPole(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", cursor: "pointer" }}>
                  {allPoles.map(p => <option key={p} value={p}>{p === "Tous" ? "Tous les pôles" : p}</option>)}
                </select>
                {/* Filtre statut */}
                <select value={rhFilterStatut} onChange={e => setRhFilterStatut(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", cursor: "pointer" }}>
                  {allStatuts.map(s => <option key={s} value={s}>{s === "Tous" ? "Tous les statuts" : s}</option>)}
                </select>
                {/* Tri rapide */}
                <select value={rhSort} onChange={e => setRhSort(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", cursor: "pointer" }}>
                  <option value="hValidated_desc">↓ Heures validées</option>
                  <option value="hValidated_asc">↑ Heures validées</option>
                  <option value="hPending_desc">↓ Heures en attente</option>
                  <option value="hPending_asc">↑ Heures en attente</option>
                  <option value="tasks_desc">↓ Tâches actives</option>
                  <option value="tasks_late_desc">↓ Tâches en retard</option>
                  <option value="missions_desc">↓ Missions</option>
                  <option value="nom_asc">A → Z Nom</option>
                  <option value="pole_asc">A → Z Pôle</option>
                </select>
                {/* Reset filtres */}
                {(rhFilterPole !== "Tous" || rhFilterStatut !== "Tous" || rhSearch) && (
                  <button onClick={() => { setRhFilterPole("Tous"); setRhFilterStatut("Tous"); setRhSearch(""); }} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e63946", background: "rgba(230,57,70,0.06)", color: "#e63946", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Tableau membres (scroll horizontal sur mobile) */}
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: 700 }}>
              {/* Entête colonnes cliquables */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.4fr 65px 65px 2.2fr 55px", gap: 0, padding: "8px 18px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-alt)" }}>
                <ColHeader label="Membre" sortKey="nom_asc" />
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>Statut</div>
                <ColHeader label="Pôle" sortKey="pole_asc" />
                <ColHeader label="Heures ✓" sortKey="hValidated_desc" sortKeyAlt="hValidated_asc" />
                <ColHeader label="Att." sortKey="hPending_desc" sortKeyAlt="hPending_asc" />
                <ColHeader label="Tâches (actives · retard · terminées)" sortKey="tasks_desc" sortKeyAlt="tasks_late_desc" />
                <ColHeader label="Missions" sortKey="missions_desc" />
              </div>

              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {memberRows.length === 0 ? (
                  <div style={{ padding: "32px 18px", textAlign: "center", fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Aucun membre ne correspond aux filtres sélectionnés.
                  </div>
                ) : memberRows.map((m, i) => (
                  <div key={m.nom}
                    onClick={() => onOpenRHProfile && onOpenRHProfile(m)}
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.4fr 65px 65px 2.2fr 55px", gap: 0, padding: "9px 18px", borderBottom: i < memberRows.length - 1 ? "1px solid var(--border-light)" : "none", cursor: onOpenRHProfile ? "pointer" : "default", transition: "background 0.15s", alignItems: "center" }}
                    onMouseEnter={e => { if (onOpenRHProfile) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                  >
                    {/* Membre */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : (POLE_COLORS[m.pole] || "#1a56db") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, overflow: "hidden" }}>
                        <AvatarInner avatar={m.avatar} nom={m.nom} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: onOpenRHProfile ? "#1a56db" : "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nom}</div>
                        {m.email && <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>}
                      </div>
                    </div>
                    {/* Statut */}
                    <div><StatusBadge map={MEMBER_STATUS} value={m.statut} size={10} /></div>
                    {/* Pôle */}
                    <div style={{ fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.pole}</div>
                    {/* Heures validées */}
                    <div style={{ fontSize: 13, fontWeight: 800, color: m.hValidated > 0 ? "#1a56db" : "var(--text-muted)" }}>{m.hValidated}h</div>
                    {/* Heures en attente */}
                    <div style={{ fontSize: 11, color: m.hPending > 0 ? "#d97706" : "var(--text-muted)", fontWeight: m.hPending > 0 ? 700 : 400 }}>{m.hPending > 0 ? `+${m.hPending}h` : "—"}</div>
                    {/* Tâches — détail enrichi */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      {m.activeTasks === 0 && m.doneTasks === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                      ) : (
                        <>
                          {m.activeTasks > 0 && (
                            <span title={`${m.activeTasks} tâche${m.activeTasks > 1 ? 's' : ''} active${m.activeTasks > 1 ? 's' : ''}`}
                              style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "rgba(26,86,219,0.1)", color: "#1a56db", fontWeight: 700 }}>
                              {m.activeTasks} actives
                            </span>
                          )}
                          {m.lateTasks > 0 && (
                            <span title={`${m.lateTasks} tâche${m.lateTasks > 1 ? 's' : ''} en retard`}
                              style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "rgba(230,57,70,0.1)", color: "#e63946", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={8} strokeWidth={2}/> {m.lateTasks} retard
                            </span>
                          )}
                          {m.doneTasks > 0 && (
                            <span title={`${m.doneTasks} tâche${m.doneTasks > 1 ? 's' : ''} terminée${m.doneTasks > 1 ? 's' : ''}`}
                              style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "rgba(22,163,74,0.09)", color: "#16a34a", fontWeight: 700 }}>
                              {m.doneTasks} ✓
                            </span>
                          )}
                          {m.forceDone > 0 && (
                            <span title={`${m.forceDone} tâche${m.forceDone > 1 ? 's' : ''} validée${m.forceDone > 1 ? 's' : ''} de force`}
                              style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "rgba(124,58,237,0.1)", color: "#7c3aed", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              <Zap size={8} strokeWidth={2}/> {m.forceDone}
                            </span>
                          )}
                          {m.lockedTasks > 0 && (
                            <span title={`${m.lockedTasks} tâche${m.lockedTasks > 1 ? 's' : ''} verrouillée${m.lockedTasks > 1 ? 's' : ''}`}
                              style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "rgba(217,119,6,0.1)", color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              <Lock size={8} strokeWidth={2}/> {m.lockedTasks}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {/* Missions */}
                    <div style={{ fontSize: 12, fontWeight: m.memberMissions > 0 ? 700 : 400, color: m.memberMissions > 0 ? "#7c3aed" : "var(--text-muted)" }}>{m.memberMissions > 0 ? m.memberMissions : "—"}</div>
                  </div>
                ))}
              </div>
              </div>{/* end minWidth wrapper */}
              </div>{/* end scroll wrapper */}
            </div>

            {/* ── Validation RH des heures bénévoles ── */}
            {(() => {
              const pendingRh = seancePresences.filter(p => p.resp1Statut !== 'en_attente' && p.rhStatut === 'en_attente');
              const recentRh  = seancePresences.filter(p => p.rhStatut !== 'en_attente').sort((a, b) => b.seanceDate?.localeCompare(a.seanceDate || '') || 0).slice(0, 30);
              if (pendingRh.length === 0 && recentRh.length === 0) return null;

              // Helper: libellé séance depuis evenements
              const getSeanceLabel = (p) => {
                const ev = evenements.find(e => e.id === p.evenementId);
                const seance = ev ? (ev.seances || []).find(s => String(s.id) === String(p.seanceId)) : null;
                return seance?.libelle || null;
              };

              // Grouper pendingRh par événement → puis par séance
              const pendingByEvent = {};
              pendingRh.forEach(p => {
                const evKey = p.evenementTitre || 'Événement inconnu';
                const seanceKey = p.seanceId || p.seanceDate;
                const seanceLabel = getSeanceLabel(p);
                if (!pendingByEvent[evKey]) pendingByEvent[evKey] = {};
                if (!pendingByEvent[evKey][seanceKey]) {
                  pendingByEvent[evKey][seanceKey] = { label: seanceLabel, date: p.seanceDate, presences: [] };
                }
                pendingByEvent[evKey][seanceKey].presences.push(p);
              });

              // Grouper recentRh par événement → puis par séance
              const recentByEvent = {};
              recentRh.forEach(p => {
                const evKey = p.evenementTitre || 'Événement inconnu';
                const seanceKey = p.seanceId || p.seanceDate;
                const seanceLabel = getSeanceLabel(p);
                if (!recentByEvent[evKey]) recentByEvent[evKey] = {};
                if (!recentByEvent[evKey][seanceKey]) {
                  recentByEvent[evKey][seanceKey] = { label: seanceLabel, date: p.seanceDate, presences: [] };
                }
                recentByEvent[evKey][seanceKey].presences.push(p);
              });

              return (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                  {/* Header principal repliable */}
                  <div
                    onClick={() => setRhValidationCollapsed(v => !v)}
                    style={{ padding: "14px 18px", borderBottom: rhValidationCollapsed ? "none" : "1px solid var(--border-light)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                  >
                    <Shield size={13} strokeWidth={1.8} color="#1a56db" />
                    <span style={{ flex: 1 }}>Validation RH — Heures bénévoles</span>
                    {pendingRh.length > 0 && (
                      <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(217,119,6,0.1)", color: "#d97706", fontSize: 11, fontWeight: 700 }}>
                        {pendingRh.length} en attente
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{rhValidationCollapsed ? '▶' : '▼'}</span>
                  </div>

                  {!rhValidationCollapsed && (
                    <div style={{ padding: 16 }}>

                      {/* ── EN ATTENTE : groupé par événement → séance ── */}
                      {pendingRh.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                            À valider ({pendingRh.length} présence{pendingRh.length > 1 ? 's' : ''})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {Object.entries(pendingByEvent).map(([evTitre, seancesMap]) => {
                              const isEvOpen = !rhCollapsedEvents[`pend_${evTitre}`];
                              const allPresences = Object.values(seancesMap).flatMap(s => s.presences);
                              const totalH = allPresences.reduce((s, p) => s + (p.heures || 0), 0);
                              return (
                                <div key={evTitre} style={{ border: "1px solid rgba(217,119,6,0.25)", borderRadius: 8, overflow: "hidden" }}>
                                  {/* Header événement */}
                                  <div
                                    onClick={() => setRhCollapsedEvents(prev => ({ ...prev, [`pend_${evTitre}`]: !prev[`pend_${evTitre}`] }))}
                                    style={{ padding: "10px 14px", background: "rgba(217,119,6,0.05)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                                  >
                                    <Calendar size={12} strokeWidth={1.8} color="#d97706" />
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "var(--text-base)" }}>{evTitre}</span>
                                    <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>{allPresences.length} bénévole{allPresences.length > 1 ? 's' : ''} · {formatDuree(totalH)}</span>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{isEvOpen ? '▼' : '▶'}</span>
                                  </div>
                                  {isEvOpen && (
                                    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                      {Object.entries(seancesMap).sort(([,a],[,b]) => (a.date||'').localeCompare(b.date||'')).map(([seanceKey, seanceData]) => {
                                        const isSeanceOpen = !rhCollapsedEvents[`pend_${evTitre}_s_${seanceKey}`];
                                        const seanceH = seanceData.presences.reduce((s, p) => s + (p.heures || 0), 0);
                                        const seanceTitle = seanceData.label
                                          ? `${seanceData.label} — ${new Date(seanceData.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                          : new Date(seanceData.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                                        return (
                                          <div key={seanceKey} style={{ border: "1px solid rgba(217,119,6,0.15)", borderRadius: 6, overflow: "hidden" }}>
                                            {/* Header séance */}
                                            <div
                                              onClick={() => setRhCollapsedEvents(prev => ({ ...prev, [`pend_${evTitre}_s_${seanceKey}`]: !prev[`pend_${evTitre}_s_${seanceKey}`] }))}
                                              style={{ padding: "7px 12px", background: "rgba(217,119,6,0.03)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", borderBottom: isSeanceOpen ? "1px solid rgba(217,119,6,0.1)" : "none" }}
                                            >
                                              <Clock size={10} strokeWidth={1.8} color="#d97706" />
                                              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>{seanceTitle}</span>
                                              <span style={{ fontSize: 10, color: "#d97706" }}>{seanceData.presences.length} · {formatDuree(seanceH)}</span>
                                              <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>{isSeanceOpen ? '▼' : '▶'}</span>
                                            </div>
                                            {isSeanceOpen && (
                                              <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                                                {seanceData.presences.map(p => (
                                                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderRadius: 7, padding: "8px 10px", flexWrap: "wrap" }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)" }}>{p.membreNom}</div>
                                                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{formatDuree(p.heures)}</div>
                                                      <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: p.resp1Statut === 'present' ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.08)", color: p.resp1Statut === 'present' ? "#16a34a" : "#dc2626" }}>
                                                        {p.resp1Statut === 'present' ? <CheckCircle2 size={9} strokeWidth={2} /> : <XCircle size={9} strokeWidth={2} />}
                                                        {p.resp1Statut === 'present' ? 'Présent' : 'Absent'}
                                                        {p.resp1Par && <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>— {p.resp1Par}</span>}
                                                      </div>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                                      <button
                                                        style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                                                        onClick={() => handleRhValidation(p.id, 'confirme')}
                                                      ><CheckCircle2 size={11} strokeWidth={2} /> Confirmer {formatDuree(p.heures)}</button>
                                                      <button
                                                        style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                                                        onClick={() => handleRhValidation(p.id, 'rejete')}
                                                      ><XCircle size={11} strokeWidth={2} /> Rejeter</button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── HISTORIQUE : groupé par événement → séance ── */}
                      {recentRh.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                            Historique récent ({recentRh.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {Object.entries(recentByEvent).map(([evTitre, seancesMap]) => {
                              const isEvOpen = !rhCollapsedEvents[`hist_${evTitre}`];
                              const allPresences = Object.values(seancesMap).flatMap(s => s.presences);
                              return (
                                <div key={evTitre} style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }}>
                                  <div
                                    onClick={() => setRhCollapsedEvents(prev => ({ ...prev, [`hist_${evTitre}`]: !prev[`hist_${evTitre}`] }))}
                                    style={{ padding: "9px 14px", background: "var(--bg-alt)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                                  >
                                    <Calendar size={11} strokeWidth={1.8} color="var(--text-muted)" />
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>{evTitre}</span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{allPresences.length} entrée{allPresences.length > 1 ? 's' : ''}</span>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{isEvOpen ? '▼' : '▶'}</span>
                                  </div>
                                  {isEvOpen && (
                                    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                                      {Object.entries(seancesMap).sort(([,a],[,b]) => (b.date||'').localeCompare(a.date||'')).map(([seanceKey, seanceData]) => {
                                        const isSeanceOpen = !rhCollapsedEvents[`hist_${evTitre}_s_${seanceKey}`];
                                        const seanceTitle = seanceData.label
                                          ? `${seanceData.label} — ${new Date(seanceData.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                          : new Date(seanceData.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                                        return (
                                          <div key={seanceKey} style={{ border: "1px solid var(--border-light)", borderRadius: 6, overflow: "hidden" }}>
                                            <div
                                              onClick={() => setRhCollapsedEvents(prev => ({ ...prev, [`hist_${evTitre}_s_${seanceKey}`]: !prev[`hist_${evTitre}_s_${seanceKey}`] }))}
                                              style={{ padding: "6px 10px", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none", borderBottom: isSeanceOpen ? "1px solid var(--border-light)" : "none" }}
                                            >
                                              <Clock size={9} strokeWidth={1.8} color="var(--text-muted)" />
                                              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>{seanceTitle}</span>
                                              <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>{isSeanceOpen ? '▼' : '▶'}</span>
                                            </div>
                                            {isSeanceOpen && (
                                              <div style={{ padding: "5px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
                                                {seanceData.presences.map(p => (
                                                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 10px", borderRadius: 6, background: p.rhStatut === 'confirme' ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)", border: `1px solid ${p.rhStatut === 'confirme' ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.1)"}` }}>
                                                    <div style={{ minWidth: 0 }}>
                                                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.membreNom}</span>
                                                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{formatDuree(p.heures)}</span>
                                                    </div>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                                                      <span style={{ fontSize: 10, fontWeight: 700, color: p.rhStatut === 'confirme' ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: 3 }}>
                                                        {p.rhStatut === 'confirme' ? <><CheckCircle2 size={10} /> Validées</> : <><XCircle size={10} /> Rejetées</>}
                                                        {p.rhPar && <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>par {p.rhPar}</span>}
                                                      </span>
                                                      {p.resp1Par && (
                                                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Resp. : {p.resp1Par}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Congés ── */}
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
              const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              const fmtFull = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
              const membersOnLeave = directory
                .map(m => {
                  const conges = Array.isArray(m.conges) ? m.conges : [];
                  const active = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
                  return active ? { ...m, activeConge: active } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.activeConge.fin.localeCompare(b.activeConge.fin));
              const upcomingLeaves = directory
                .flatMap(m => (Array.isArray(m.conges) ? m.conges : []).filter(c => c.debut > today && c.debut <= in60).map(c => ({ ...c, member: m })))
                .sort((a, b) => a.debut.localeCompare(b.debut));
              if (membersOnLeave.length === 0 && upcomingLeaves.length === 0) return null;
              return (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Umbrella size={13} strokeWidth={1.8} color="#f97316" /> Congés
                    {membersOnLeave.length > 0 && <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(249,115,22,0.1)", color: "#f97316", fontSize: 11 }}>{membersOnLeave.length} en cours</span>}
                    {upcomingLeaves.length > 0 && <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(26,86,219,0.08)", color: "#1a56db", fontSize: 11 }}>{upcomingLeaves.length} à venir</span>}
                  </div>
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    {membersOnLeave.map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : "rgba(249,115,22,0.15)", color: "#f97316", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                          <AvatarInner avatar={m.avatar} nom={m.nom} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{m.nom}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.pole} · Retour le {fmtFull(m.activeConge.fin)}</div>
                          {m.activeConge.motif && <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>{m.activeConge.motif}</div>}
                        </div>
                        <div style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 8, background: "rgba(249,115,22,0.12)", color: "#f97316", fontSize: 11, fontWeight: 700 }}>
                          <Umbrella size={10} style={{ marginRight: 4 }} />En congé
                        </div>
                      </div>
                    ))}
                    {upcomingLeaves.length > 0 && (
                      <>
                        {membersOnLeave.length > 0 && <div style={{ borderTop: "1px solid var(--border-light)", margin: "4px 0" }} />}
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>À venir (60 jours)</div>
                        {upcomingLeaves.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 10, background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.12)" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: isAvatarUrl(c.member.avatar) ? "transparent" : "rgba(26,86,219,0.1)", color: "#1a56db", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                              <AvatarInner avatar={c.member.avatar} nom={c.member.nom} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{c.member.nom}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(c.debut)} → {fmt(c.fin)}{c.motif ? ` · ${c.motif}` : ""}</div>
                            </div>
                            <div style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 8, background: "rgba(26,86,219,0.08)", color: "#1a56db", fontSize: 11, fontWeight: 600 }}>
                              <CalendarRange size={10} style={{ marginRight: 4 }} />Prévu
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Missions en cours */}
            {openMissions.length > 0 && (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Target size={13} strokeWidth={1.8}/> Missions actives ({openMissions.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 12, padding: 16 }}>
                  {openMissions.map(m => (
                    <div key={m.id} style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)", flex: 1, marginRight: 8 }}>{m.titre}</div>
                        <StatusBadge map={MISSION_STATUS} value={m.statut} size={10} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>{m.pole} · {m.type}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10 }}>
                        <span style={{ color: "var(--text-muted)" }}>{m.candidatures.length} candidature{m.candidatures.length !== 1 ? "s" : ""}</span>
                        {m.candidatures.filter(c => c.statut === "En attente").length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d97706", fontWeight: 700 }}>
                            <Zap size={9} strokeWidth={2}/> {m.candidatures.filter(c => c.statut === "En attente").length} à traiter
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* --- ONGLET BOURSES AUX MISSIONS (RH) --- */}
      {activeTab === "rh_missions" && subPage === "Ressources Humaines" && (() => {
        const isRH = hasPower("view_rh") || (currentUser?.pole === "Ressources Humaines");

        // ── Aliases locaux (state déclaré en haut du composant) ───────────────
        const mView = rhmView, setMView = setRhmView;
        const expandedMission = rhmExpandedMission, setExpandedMission = setRhmExpandedMission;
        const search = rhmSearch, setSearch = setRhmSearch;
        const filterType = rhmFilterType, setFilterType = setRhmFilterType;
        const filterPole = rhmFilterPole, setFilterPole = setRhmFilterPole;
        const filterUrgence = rhmFilterUrgence, setFilterUrgence = setRhmFilterUrgence;
        const filterStatut = rhmFilterStatut, setFilterStatut = setRhmFilterStatut;
        const filterCandStatut = rhmFilterCandStatut, setFilterCandStatut = setRhmFilterCandStatut;
        const searchCand = rhmSearchCand, setSearchCand = setRhmSearchCand;
        const refuseModal = rhmRefuseModal, setRefuseModal = setRhmRefuseModal;
        const refuseReason = rhmRefuseReason, setRefuseReason = setRhmRefuseReason;
        const applyModal = rhmApplyModal, setApplyModal = setRhmApplyModal;
        const applyMsg = rhmApplyMsg, setApplyMsg = setRhmApplyMsg;

        // ── Data ───────────────────────────────────────────────────────────────
        const URGENCE_COLOR = { haute: "#e63946", normale: "#d97706", basse: "#16a34a" };
        const TYPE_ICON_MAP = { "Mission ponctuelle": Zap, "Poste annuel": User, "Formation": GraduationCap, "Projet": Folder };
        const getTypeIcon = (type) => TYPE_ICON_MAP[type] || ClipboardList;

        const activeMissions = missions.filter(m => m.statut !== "Annulée");
        const openMissions = missions.filter(m => m.statut === "Ouvert" || m.statut === "Ouverte");
        const corbeilledMissions = missions.filter(m => m.statut === "Annulée");
        const allPendingCand = activeMissions.flatMap(m => (m.candidatures || []).filter(c => c.statut === "En attente"));
        const allCandidatures = activeMissions.flatMap(m =>
          (m.candidatures || []).map(c => ({ ...c, missionId: m.id, missionTitre: m.titre, missionPole: m.pole }))
        );

        const types = ["Tous", ...new Set(activeMissions.map(m => m.type).filter(Boolean))];
        const poles = ["Tous", ...new Set(activeMissions.map(m => m.pole).filter(Boolean))];

        // ── Filtered missions ──────────────────────────────────────────────────
        let filteredMissions = activeMissions;
        if (filterStatut === "actives") filteredMissions = filteredMissions.filter(m => m.statut === "Ouvert" || m.statut === "Ouverte" || m.statut === "En cours");
        if (filterStatut === "fermees") filteredMissions = filteredMissions.filter(m => m.statut === "Clôturée" || m.statut === "Fermée");
        if (filterType !== "Tous") filteredMissions = filteredMissions.filter(m => m.type === filterType);
        if (filterPole !== "Tous") filteredMissions = filteredMissions.filter(m => m.pole === filterPole);
        if (filterUrgence !== "Tous") filteredMissions = filteredMissions.filter(m => m.urgence === filterUrgence);
        if (search.trim()) filteredMissions = filteredMissions.filter(m =>
          m.titre.toLowerCase().includes(search.toLowerCase()) || (m.description || "").toLowerCase().includes(search.toLowerCase())
        );
        const urgOrder = { haute: 0, normale: 1, basse: 2 };
        filteredMissions = [...filteredMissions].sort((a, b) => (urgOrder[a.urgence] ?? 1) - (urgOrder[b.urgence] ?? 1));

        // ── Filtered candidatures ──────────────────────────────────────────────
        let filteredCand = allCandidatures;
        if (filterCandStatut !== "Toutes") filteredCand = filteredCand.filter(c => c.statut === filterCandStatut);
        if (searchCand.trim()) filteredCand = filteredCand.filter(c =>
          c.nom.toLowerCase().includes(searchCand.toLowerCase()) || c.missionTitre.toLowerCase().includes(searchCand.toLowerCase())
        );
        filteredCand = [...filteredCand].sort((a, b) => new Date(b.date) - new Date(a.date));

        // placeholder to satisfy old code reference (unused)
        const displayMissions = filteredMissions;

        return (
          <div style={{ marginTop: 24 }}>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="space-kpi-5" style={{ marginBottom: 20 }}>
              {[
                { label: "Missions ouvertes", val: openMissions.length, color: "#7c3aed" },
                { label: "En cours", val: activeMissions.filter(m => m.statut === "En cours").length, color: "#1a56db" },
                { label: "Candidatures à traiter", val: allPendingCand.length, color: allPendingCand.length > 0 ? "#d97706" : "var(--text-muted)" },
                { label: "Candidats acceptés", val: activeMissions.reduce((s, m) => s + (m.candidatures || []).filter(c => c.statut === "Accepté").length, 0), color: "#16a34a" },
                { label: "Total missions", val: activeMissions.length, color: "var(--text-base)" },
              ].map((k, i) => (
                <div key={i} className="kc">
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 20 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* ── Sous-navigation ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 2, background: "var(--bg-alt)", borderRadius: 10, padding: 3, border: "1px solid var(--border-light)" }}>
                {[
                  ["missions", `Missions (${activeMissions.length})`],
                  ["candidatures", allPendingCand.length > 0 ? `Candidatures · ${allPendingCand.length} en attente` : `Candidatures (${allCandidatures.length})`],
                  ["corbeille", `Corbeille (${corbeilledMissions.length})`],
                ].map(([v, l]) => (
                  <button key={v} onClick={() => setMView(v)} style={{ fontSize: 11, padding: "5px 13px", borderRadius: 8, border: "none", background: mView === v ? "var(--bg-surface)" : "transparent", color: mView === v ? (v === "candidatures" && allPendingCand.length > 0 ? "#d97706" : "var(--text-base)") : "var(--text-muted)", fontWeight: mView === v ? 700 : 500, cursor: "pointer", boxShadow: mView === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>{l}</button>
                ))}
              </div>
              {isRH && mView === "missions" && onNewMission && (
                <button className="btn-primary" onClick={() => onNewMission(null)} style={{ fontSize: 11, padding: "6px 14px" }}>
                  <Plus size={12} strokeWidth={2.5}/> Publier une mission
                </button>
              )}
            </div>

            {/* ── VUE : MISSIONS ──────────────────────────────────────────────── */}
            {mView === "missions" && (
              <>
                {/* Barre de recherche + filtres */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
                    <Search size={13} strokeWidth={1.8} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                    <input type="text" className="form-input" placeholder="Rechercher une mission…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, fontSize: 12 }} />
                  </div>
                  <select className="form-input" value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", width: "auto" }}>
                    <option value="actives">Actives</option>
                    <option value="all">Toutes</option>
                    <option value="fermees">Clôturées</option>
                  </select>
                  <select className="form-input" value={filterUrgence} onChange={e => setFilterUrgence(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", width: "auto" }}>
                    <option value="Tous">Toute urgence</option>
                    <option value="haute">Urgent</option>
                    <option value="normale">Normal</option>
                    <option value="basse">Flexible</option>
                  </select>
                  {types.length > 2 && (
                    <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", width: "auto" }}>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                  {poles.length > 2 && (
                    <select className="form-input" value={filterPole} onChange={e => setFilterPole(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", width: "auto" }}>
                      {poles.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>

                {filteredMissions.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "52px 20px", background: "var(--bg-surface)", borderRadius: 14, border: "1px dashed var(--border-light)", textAlign: "center" }}>
                    <Target size={32} strokeWidth={1.5} color="#7c3aed" />
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)" }}>
                      {activeMissions.length === 0 ? "Aucune mission publiée" : "Aucune mission ne correspond aux filtres"}
                    </div>
                    {activeMissions.length === 0 && isRH && onNewMission && (
                      <button className="btn-primary" onClick={() => onNewMission(null)} style={{ marginTop: 4 }}><Plus size={13} strokeWidth={2.5}/> Publier une mission</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredMissions.map(m => {
                      const isExpanded = expandedMission === m.id;
                      const pending = (m.candidatures || []).filter(c => c.statut === "En attente").length;
                      const accepted = (m.candidatures || []).filter(c => c.statut === "Accepté").length;
                      const Icon = getTypeIcon(m.type);
                      const urgColor = URGENCE_COLOR[m.urgence] || "#94a3b8";
                      const myCandidate = !isRH ? (m.candidatures || []).find(c => c.nom === currentUser?.nom) : null;
                      const isActive = m.statut === "Ouvert" || m.statut === "Ouverte" || m.statut === "En cours";

                      return (
                        <div key={m.id} style={{ background: "var(--bg-surface)", borderRadius: 12, border: pending > 0 ? "1.5px solid rgba(217,119,6,0.3)" : "1px solid var(--border-light)", borderLeft: `4px solid ${urgColor}`, overflow: "hidden" }}>
                          {/* En-tête */}
                          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${urgColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: urgColor, cursor: "pointer" }} onClick={() => setExpandedMission(isExpanded ? null : m.id)}>
                              <Icon size={17} strokeWidth={1.8} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpandedMission(isExpanded ? null : m.id)}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{m.titre}</span>
                                <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: "rgba(26,86,219,0.09)", color: "#1a56db", fontWeight: 700 }}>{m.pole}</span>
                                <StatusBadge map={MISSION_STATUS} value={m.statut} size={9} />
                                {m.urgence === "haute" && <span style={{ fontSize: 9, background: "#fee2e2", color: "#e63946", borderRadius: 20, padding: "1px 6px", fontWeight: 800 }}>URGENT</span>}
                              </div>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  {m.type}{m.duree ? ` · ${m.duree}` : ""}{m.dateDebut ? ` · Dès ${formatDateShort(m.dateDebut)}` : ""}
                                </span>
                                {pending > 0 && <span style={{ fontSize: 10, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "1px 7px", fontWeight: 800 }}>{pending} en attente</span>}
                                {accepted > 0 && <span style={{ fontSize: 10, background: "rgba(22,163,74,0.1)", color: "#16a34a", borderRadius: 20, padding: "1px 7px", fontWeight: 700 }}>✓ {accepted} accepté{accepted > 1 ? "s" : ""}</span>}
                                {pending === 0 && accepted === 0 && (m.candidatures || []).length > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{(m.candidatures || []).length} candidature{(m.candidatures || []).length > 1 ? "s" : ""}</span>}
                                {(m.candidatures || []).length === 0 && <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>Aucune candidature</span>}
                              </div>
                            </div>
                            {/* Actions RH */}
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                              {isRH && onNewMission && (
                                <button onClick={() => onNewMission(m)} title="Modifier" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-alt)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                  <Pencil size={12} strokeWidth={2} />
                                </button>
                              )}
                              {isRH && onUpdateMission && isActive && (
                                <button onClick={() => onUpdateMission(m.id, { statut: "Clôturée" })} title="Clôturer la mission" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-alt)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                                  <Archive size={12} strokeWidth={2} />
                                </button>
                              )}
                              {isRH && onUpdateMission && !isActive && m.statut !== "Annulée" && (
                                <button onClick={() => onUpdateMission(m.id, { statut: "Ouvert" })} title="Rouvrir la mission" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-alt)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                                  <RotateCcw size={12} strokeWidth={2} />
                                </button>
                              )}
                              {isRH && onDeleteMission && (
                                <button onClick={() => onDeleteMission(m.id, false)} title="Mettre à la corbeille" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-alt)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#e63946" }}>
                                  <Trash2 size={12} strokeWidth={2} />
                                </button>
                              )}
                              <button onClick={() => setExpandedMission(isExpanded ? null : m.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-alt)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                                <ChevronRight size={13} strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          {/* Contenu déplié */}
                          {isExpanded && (
                            <div style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-alt)", padding: "14px 16px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                  {m.description && <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, margin: "0 0 8px" }}>{m.description}</p>}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    {m.responsable && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Responsable : <strong style={{ color: "var(--text-base)" }}>{m.responsable}</strong></span>}
                                    {m.dateDebut && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Début : {formatDateShort(m.dateDebut)}{m.dateFin ? ` · Fin : ${formatDateShort(m.dateFin)}` : ""}</span>}
                                    {m.duree && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Durée : {m.duree}</span>}
                                  </div>
                                </div>
                                {(m.competences || []).length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Compétences recherchées</div>
                                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                      {m.competences.map((c, i) => <span key={i} style={{ fontSize: 10, background: "rgba(26,86,219,0.08)", color: "#1a56db", borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>{c}</span>)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Candidatures (vue RH) */}
                              {isRH && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 8 }}>
                                    Candidatures ({(m.candidatures || []).length}){pending > 0 && <span style={{ marginLeft: 8, color: "#d97706" }}>· {pending} à traiter</span>}
                                  </div>
                                  {(m.candidatures || []).length === 0 ? (
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>Aucune candidature pour le moment.</div>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {(m.candidatures || []).map((c, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--bg-surface)", borderRadius: 9, border: "1px solid var(--border-light)", borderLeft: `3px solid ${c.statut === "Accepté" ? "#16a34a" : c.statut === "Refusé" ? "#94a3b8" : "#d97706"}` }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{c.nom}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDateShort(c.date)}{c.message ? ` · "${c.message}"` : ""}</div>
                                            {c.refusReason && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, fontStyle: "italic" }}>Motif refus : {c.refusReason}</div>}
                                          </div>
                                          <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                                            {c.statut !== "En attente" && (
                                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: c.statut === "Accepté" ? "rgba(22,163,74,0.1)" : "rgba(148,163,184,0.12)", color: c.statut === "Accepté" ? "#16a34a" : "#94a3b8" }}>
                                                {c.statut === "Accepté" ? "✓ Accepté" : "✗ Refusé"}
                                              </span>
                                            )}
                                            {c.statut === "En attente" && onAcceptCandidate && onRefuseCandidate && (
                                              <>
                                                <button onClick={() => onAcceptCandidate(m.id, c.nom)} style={{ fontSize: 10, padding: "4px 10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Accepter</button>
                                                <button onClick={() => { setRefuseModal({ missionId: m.id, candidatNom: c.nom }); setRefuseReason(""); }} style={{ fontSize: 10, padding: "4px 10px", background: "var(--bg-hover)", color: "#e63946", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Refuser</button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Candidature (vue membre) */}
                              {!isRH && isActive && (
                                <div style={{ marginTop: 8 }}>
                                  {!myCandidate ? (
                                    <button onClick={() => { setApplyModal(m); setApplyMsg(""); }} style={{ fontSize: 12, padding: "8px 18px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                                      Postuler à cette mission
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, fontWeight: 700, background: myCandidate.statut === "Accepté" ? "rgba(22,163,74,0.1)" : myCandidate.statut === "Refusé" ? "rgba(148,163,184,0.12)" : "rgba(217,119,6,0.1)", color: myCandidate.statut === "Accepté" ? "#16a34a" : myCandidate.statut === "Refusé" ? "#94a3b8" : "#d97706" }}>
                                        {myCandidate.statut === "Accepté" ? "✓ Accepté(e)" : myCandidate.statut === "Refusé" ? "✗ Non retenu(e)" : "⏳ Candidature en attente"}
                                      </span>
                                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>postulé le {formatDateShort(myCandidate.date)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── VUE : CANDIDATURES ──────────────────────────────────────────── */}
            {mView === "candidatures" && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
                    <Search size={13} strokeWidth={1.8} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                    <input type="text" className="form-input" placeholder="Candidat ou mission…" value={searchCand} onChange={e => setSearchCand(e.target.value)} style={{ paddingLeft: 32, fontSize: 12 }} />
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["Toutes", "En attente", "Accepté", "Refusé"].map(s => {
                      const count = s === "Toutes" ? allCandidatures.length : allCandidatures.filter(c => c.statut === s).length;
                      const col = s === "En attente" ? "#d97706" : s === "Accepté" ? "#16a34a" : s === "Refusé" ? "#94a3b8" : "var(--text-base)";
                      return (
                        <button key={s} onClick={() => setFilterCandStatut(s)} style={{ fontSize: 11, padding: "5px 11px", borderRadius: 8, border: `1px solid ${filterCandStatut === s ? col : "var(--border-light)"}`, background: filterCandStatut === s ? `${col}18` : "var(--bg-alt)", color: filterCandStatut === s ? col : "var(--text-dim)", fontWeight: 700, cursor: "pointer" }}>
                          {s} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredCand.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-surface)", borderRadius: 14, border: "1px dashed var(--border-light)", color: "var(--text-muted)", fontSize: 12 }}>
                    Aucune candidature
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {filteredCand.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-light)", borderLeft: `3px solid ${c.statut === "Accepté" ? "#16a34a" : c.statut === "Refusé" ? "#94a3b8" : "#d97706"}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{c.nom}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>→</span>
                            <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{c.missionTitre}</span>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(26,86,219,0.08)", color: "#1a56db", fontWeight: 700 }}>{c.missionPole}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            {formatDateShort(c.date)}{c.message ? ` · "${c.message}"` : ""}
                            {c.refusReason && <span style={{ color: "#94a3b8", fontStyle: "italic" }}> · Motif refus : {c.refusReason}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                          {c.statut !== "En attente" && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: c.statut === "Accepté" ? "rgba(22,163,74,0.1)" : "rgba(148,163,184,0.12)", color: c.statut === "Accepté" ? "#16a34a" : "#94a3b8" }}>
                              {c.statut === "Accepté" ? "✓ Accepté" : "✗ Refusé"}
                            </span>
                          )}
                          {c.statut === "En attente" && isRH && onAcceptCandidate && onRefuseCandidate && (
                            <>
                              <button onClick={() => onAcceptCandidate(c.missionId, c.nom)} style={{ fontSize: 10, padding: "4px 10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Accepter</button>
                              <button onClick={() => { setRefuseModal({ missionId: c.missionId, candidatNom: c.nom }); setRefuseReason(""); }} style={{ fontSize: 10, padding: "4px 10px", background: "var(--bg-hover)", color: "#e63946", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Refuser</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── VUE : CORBEILLE ─────────────────────────────────────────────── */}
            {mView === "corbeille" && (
              <>
                {corbeilledMissions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-surface)", borderRadius: 14, border: "1px dashed var(--border-light)", color: "var(--text-muted)", fontSize: 12 }}>
                    La corbeille est vide
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {corbeilledMissions.map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-light)", opacity: 0.75 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-base)", marginBottom: 2, textDecoration: "line-through" }}>{m.titre}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.pole} · {m.type} · {(m.candidatures || []).length} candidature{(m.candidatures || []).length !== 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {isRH && onUpdateMission && (
                            <button onClick={() => onUpdateMission(m.id, { statut: "Ouvert" })} style={{ fontSize: 10, padding: "5px 11px", background: "var(--bg-alt)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.3)", borderRadius: 7, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <RotateCcw size={11} strokeWidth={2}/> Restaurer
                            </button>
                          )}
                          {isRH && onDeleteMission && (
                            <button onClick={() => onDeleteMission(m.id, true)} style={{ fontSize: 10, padding: "5px 11px", background: "rgba(230,57,70,0.07)", color: "#e63946", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 7, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <Trash2 size={11} strokeWidth={2}/> Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Modale : refus candidature ───────────────────────────────────── */}
            {refuseModal && (
              <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setRefuseModal(null)}>
                <div className="modal-box" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-header-title">Refuser la candidature</div>
                    <button className="modal-close-btn" onClick={() => setRefuseModal(null)}><X size={14} strokeWidth={2} /></button>
                  </div>
                  <div className="modal-body">
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{refuseModal.candidatNom}</div>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Motif du refus (optionnel — visible par le candidat)"
                      value={refuseReason}
                      onChange={e => setRefuseReason(e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setRefuseModal(null)}>Annuler</button>
                    <button className="btn-danger" onClick={() => { if (onRefuseCandidate) onRefuseCandidate(refuseModal.missionId, refuseModal.candidatNom, refuseReason); setRefuseModal(null); }}>
                      Confirmer le refus
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modale : postuler (membres non-RH) ──────────────────────────── */}
            {applyModal && (
              <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setApplyModal(null)}>
                <div className="modal-box" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-header-title"><Target size={16} strokeWidth={1.8} /> Candidater à la mission</div>
                    <button className="modal-close-btn" onClick={() => setApplyModal(null)}><X size={14} strokeWidth={2} /></button>
                  </div>
                  <div className="modal-body">
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{applyModal.titre} · {applyModal.pole}</div>
                    <div>
                      <label className="form-label">Message de motivation (optionnel)</label>
                      <textarea className="form-input" rows={4} value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Présentez votre motivation et vos expériences pertinentes…" style={{ resize: "vertical" }} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setApplyModal(null)}>Annuler</button>
                    <button className="btn-primary" onClick={() => { if (onApplyMission) onApplyMission(applyModal.id, applyMsg); setApplyModal(null); setApplyMsg(""); }}>
                      Envoyer ma candidature
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* --- ONGLET PROGRAMME PÉDAGOGIQUE (PÔLE ÉTUDES) --- */}
      {activeTab === "etudes_stats" && subPage === "Etudes" && (() => {
        const cycleFilter = activeCycle === "Toutes" ? null : activeCycle;
        const now = new Date();

        // ─── Données filtrées ──────────────────────────────────────────────────
        const studiesActions = (actions || []).filter(a => {
          const matchPole = (a.poles || []).some(p => p.toLowerCase().includes("etude") || p.toLowerCase().includes("étude")) || a.pole === "Etudes";
          if (!matchPole) return false;
          if (cycleFilter && a.cycle && a.cycle !== cycleFilter) return false;
          return true;
        });
        const studiesActionIds = new Set(studiesActions.map(a => a.id));
        const studiesEvents = (evenements || []).filter(e => studiesActionIds.has(e.actionId));
        const studiesTasks = (tasks || []).filter(t => {
          if (t.space !== "Etudes") return false;
          if (cycleFilter && t.cycle !== cycleFilter) return false;
          return true;
        });

        // ─── Séances ───────────────────────────────────────────────────────────
        const allSeances = studiesEvents.flatMap(e => (e.seances || []).map(s => ({ ...s, eventId: e.id, actionId: e.actionId })));
        const seancesPassees = allSeances.filter(s => s.date && new Date(s.date) < now);
        const totalInscrits = allSeances.reduce((sum, s) => sum + (s.inscrits || []).length, 0);

        // ─── Durée totale d'intervention ───────────────────────────────────────
        const heuresSeances = allSeances.reduce((sum, s) => sum + (parseFloat(s.duree) || 0), 0);
        const heuresActions = studiesActions.reduce((sum, a) => sum + (parseFloat(a.heures) || 0), 0);
        const totalHeuresIntervention = heuresSeances > 0 ? heuresSeances : heuresActions;

        // ─── Heures bénévolat ──────────────────────────────────────────────────
        const studiesVolHours = (volunteerHours || []).filter(h => studiesActionIds.has(h.actionId) || studiesEvents.some(e => e.id === h.eventId));
        const hBenevValidees = studiesVolHours.filter(h => h.status === "Validé" || h.status === "Validées").reduce((s, h) => s + (h.hours || 0), 0);
        const hBenevAttente  = studiesVolHours.filter(h => h.status === "En attente").reduce((s, h) => s + (h.hours || 0), 0);
        const hBenevTotal    = hBenevValidees + hBenevAttente;
        // Par membre
        const heuresParMembre = {};
        studiesVolHours.forEach(h => {
          if (!h.user) return;
          if (!heuresParMembre[h.user]) heuresParMembre[h.user] = { validees: 0, attente: 0 };
          if (h.status === "Validé" || h.status === "Validées") heuresParMembre[h.user].validees += h.hours || 0;
          else if (h.status === "En attente") heuresParMembre[h.user].attente += h.hours || 0;
        });
        const heuresMembreEntries = Object.entries(heuresParMembre).sort((a, b) => (b[1].validees + b[1].attente) - (a[1].validees + a[1].attente));

        // ─── Notes de frais ────────────────────────────────────────────────────
        const studiesNdf = (notesFrais || []).filter(n =>
          (n.pole || "").toLowerCase().includes("etude") || (n.pole || "").toLowerCase().includes("étude")
        );
        const montantNdfTotal    = studiesNdf.reduce((s, n) => s + Number(n.montant || 0), 0);
        const montantNdfRembourse = studiesNdf.filter(n => n.statut === "Remboursée").reduce((s, n) => s + Number(n.montant || 0), 0);
        const ndfParCategorie = {};
        studiesNdf.forEach(n => {
          const cat = n.categorie || "Autre";
          ndfParCategorie[cat] = (ndfParCategorie[cat] || 0) + Number(n.montant || 0);
        });

        // ─── Répartitions interventions ────────────────────────────────────────
        const typeCount = {};
        studiesActions.forEach(a => { const t = a.type || "Non précisé"; typeCount[t] = (typeCount[t] || 0) + 1; });
        const typeEntries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

        const typeClasseCount = {};
        studiesActions.forEach(a => { if (a.type_classe) { typeClasseCount[a.type_classe] = (typeClasseCount[a.type_classe] || 0) + 1; } });

        const statutCount = {};
        studiesActions.forEach(a => { const s = a.statut || "Inconnu"; statutCount[s] = (statutCount[s] || 0) + 1; });

        // ─── Membres actifs ────────────────────────────────────────────────────
        const membresActifs = [...new Set(studiesActions.flatMap(a => a.responsables || []))];

        // ─── Établissements ────────────────────────────────────────────────────
        const etablissements = [...new Set(studiesActions.map(a => a.etablissement).filter(Boolean))];
        const lieux = [...new Set(studiesActions.map(a => a.lieu).filter(Boolean))];

        // ─── Tâches ────────────────────────────────────────────────────────────
        const tasksDone = studiesTasks.filter(t => t.status === "Terminé").length;
        const tauxTaches = studiesTasks.length > 0 ? Math.round((tasksDone / studiesTasks.length) * 100) : 0;

        // ─── Graphe mensuel (séances) ──────────────────────────────────────────
        const seancesParMois = {};
        allSeances.forEach(s => {
          if (!s.date) return;
          const mois = s.date.slice(0, 7);
          seancesParMois[mois] = (seancesParMois[mois] || 0) + 1;
        });
        const moisEntries = Object.entries(seancesParMois).sort(([a], [b]) => a.localeCompare(b));
        const maxMois = Math.max(...moisEntries.map(([, v]) => v), 1);

        const STAT_COLORS   = { "Sensibilisation": "#1a56db", "Formation": "#7c3aed", "Atelier": "#d97706", "Conférence": "#16a34a", "Non précisé": "#6b7280" };
        const STATUT_COLORS = { "Terminée": "#16a34a", "En cours": "#1a56db", "Planifiée": "#d97706", "Annulée": "#e63946" };

        const SectionTitle = ({ icon, children }) => (
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            {icon} {children}
          </div>
        );

        const Bar = ({ pct, color }) => (
          <div style={{ height: 5, borderRadius: 3, background: "var(--border-light)", overflow: "hidden", marginTop: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
        );

        return (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Bandeau cycle ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-light)", fontSize: 12, color: "var(--text-dim)" }}>
              <BarChart2 size={13} strokeWidth={1.8} color="#1a56db"/>
              Rapport d'impact —&nbsp;<strong style={{ color: "var(--text-base)" }}>{cycleFilter || "Tous les cycles"}</strong>
              <span style={{ color: "var(--text-muted)" }}>· Change de cycle via le sélecteur en haut de page</span>
            </div>

            {/* ── KPIs ligne 1 ── */}
            <div className="space-kpi-4">
              {[
                { label: "Interventions", val: studiesActions.length, sub: `${statutCount["Terminée"] || 0} terminées`, color: "#1a56db", icon: <ClipboardList size={16} strokeWidth={1.8}/> },
                { label: "Bénéficiaires", val: totalInscrits, sub: `${allSeances.length} séance(s)`, color: "#16a34a", icon: <Users size={16} strokeWidth={1.8}/> },
                { label: "Établissements", val: etablissements.length, sub: `${lieux.length} lieu(x)`, color: "#d97706", icon: <GraduationCap size={16} strokeWidth={1.8}/> },
                { label: "Heures bénévolat", val: `${hBenevTotal.toFixed(1)}h`, sub: `${hBenevValidees.toFixed(1)}h validées`, color: "#7c3aed", icon: <Clock size={16} strokeWidth={1.8}/> },
              ].map((k, i) => (
                <div key={i} className="kc" style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 10, right: 12, color: k.color, opacity: 0.18 }}>{k.icon}</div>
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* ── KPIs ligne 2 ── */}
            <div className="space-kpi-4">
              {[
                { label: "Heures d'intervention", val: `${totalHeuresIntervention.toFixed(1)}h`, sub: "durée totale", color: "#0891b2", icon: <Zap size={16} strokeWidth={1.8}/> },
                { label: "Séances passées", val: seancesPassees.length, sub: `sur ${allSeances.length} planifiées`, color: "#16a34a", icon: <Calendar size={16} strokeWidth={1.8}/> },
                { label: "Dépenses totales", val: `${montantNdfTotal.toFixed(2)} €`, sub: `${montantNdfRembourse.toFixed(2)} € remboursés`, color: "#e63946", icon: <Receipt size={16} strokeWidth={1.8}/> },
                { label: "Tâches complétées", val: `${tasksDone}/${studiesTasks.length}`, sub: `${tauxTaches}% du cycle`, color: tauxTaches >= 80 ? "#16a34a" : tauxTaches >= 50 ? "#d97706" : "#e63946", icon: <CheckCircle2 size={16} strokeWidth={1.8}/> },
              ].map((k, i) => (
                <div key={i} className="kc" style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 10, right: 12, color: k.color, opacity: 0.18 }}>{k.icon}</div>
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 22 }}>{k.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Graphe mensuel ── */}
            {moisEntries.length > 0 && (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<Calendar size={12} strokeWidth={1.8}/>}>Activité mensuelle (séances)</SectionTitle>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                  {moisEntries.map(([mois, count]) => {
                    const pct = (count / maxMois) * 100;
                    const label = new Date(mois + "-01").toLocaleDateString("fr-FR", { month: "short" });
                    return (
                      <div key={mois} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#1a56db" }}>{count}</div>
                        <div style={{ width: "100%", maxWidth: 32, height: `${Math.max(pct, 5)}%`, background: "linear-gradient(180deg, #1a56db, #3b82f6)", borderRadius: "3px 3px 0 0", transition: "height 0.6s ease" }} />
                        <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "capitalize" }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Ligne : Type + Statut ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<Target size={12} strokeWidth={1.8}/>}>Type d'intervention</SectionTitle>
                {typeEntries.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>—</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {typeEntries.map(([type, count]) => {
                      const pct = Math.round((count / studiesActions.length) * 100);
                      const col = STAT_COLORS[type] || "#6b7280";
                      return (
                        <div key={type}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-base)" }}>{type}</span>
                            <span style={{ color: col, fontWeight: 700 }}>{count} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
                          </div>
                          <Bar pct={pct} color={col}/>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Type de classe */}
                {Object.keys(typeClasseCount).length > 0 && (
                  <>
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Niveaux de classe</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(typeClasseCount).map(([tc, n]) => (
                        <span key={tc} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(26,86,219,0.08)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.15)" }}>{tc} <strong>{n}</strong></span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<Zap size={12} strokeWidth={1.8}/>}>Avancement</SectionTitle>
                {Object.entries(statutCount).length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>—</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(statutCount).sort((a,b) => b[1]-a[1]).map(([statut, count]) => {
                      const pct = Math.round((count / studiesActions.length) * 100);
                      const col = STATUT_COLORS[statut] || "#6b7280";
                      return (
                        <div key={statut}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-base)" }}>{statut}</span>
                            <span style={{ color: col, fontWeight: 700 }}>{count} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
                          </div>
                          <Bar pct={pct} color={col}/>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Dépenses par catégorie */}
                {Object.keys(ndfParCategorie).length > 0 && (
                  <>
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Dépenses par catégorie</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(ndfParCategorie).sort((a,b)=>b[1]-a[1]).map(([cat, montant]) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--text-dim)" }}>{cat}</span>
                          <span style={{ fontWeight: 700, color: "var(--text-base)" }}>{montant.toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Heures bénévolat par membre ── */}
            {heuresMembreEntries.length > 0 && (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<Clock size={12} strokeWidth={1.8}/>}>Heures de bénévolat par membre</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {heuresMembreEntries.map(([nom, h]) => {
                    const total = h.validees + h.attente;
                    const maxH = heuresMembreEntries[0][1].validees + heuresMembreEntries[0][1].attente;
                    const pct = maxH > 0 ? Math.round((total / maxH) * 100) : 0;
                    return (
                      <div key={nom}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#7c3aed", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                              {nom.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: "var(--text-base)" }}>{nom}</span>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            {h.attente > 0 && <span style={{ fontSize: 10, color: "#d97706" }}>{h.attente.toFixed(1)}h en attente</span>}
                            <span style={{ fontWeight: 700, color: "#7c3aed" }}>{h.validees.toFixed(1)}h validées</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "var(--border-light)", overflow: "hidden", display: "flex" }}>
                          <div style={{ width: `${maxH > 0 ? (h.validees/maxH)*100 : 0}%`, height: "100%", background: "#7c3aed", transition: "width 0.6s ease" }}/>
                          <div style={{ width: `${maxH > 0 ? (h.attente/maxH)*100 : 0}%`, height: "100%", background: "#ddd6fe", transition: "width 0.6s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 16 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#7c3aed", display: "inline-block" }}/> Validées</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#ddd6fe", display: "inline-block" }}/> En attente</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Établissements + Membres actifs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<GraduationCap size={12} strokeWidth={1.8}/>}>Établissements ({etablissements.length})</SectionTitle>
                {etablissements.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun renseigné</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {etablissements.map(etab => {
                      const actE = studiesActions.filter(a => a.etablissement === etab);
                      const seancesE = actE.flatMap(a => { const ev = studiesEvents.find(e => e.actionId === a.id); return ev ? (ev.seances || []) : []; });
                      const inscritsE = seancesE.reduce((s, sec) => s + (sec.inscrits || []).length, 0);
                      return (
                        <div key={etab} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-hover)", borderRadius: 8, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-base)" }}>{etab}</span>
                          <div style={{ display: "flex", gap: 10, color: "var(--text-muted)", fontSize: 11 }}>
                            <span style={{display:"inline-flex",alignItems:"center",gap:3}}><ClipboardList size={9} strokeWidth={1.8}/>{actE.length}</span>
                            {inscritsE > 0 && <span style={{display:"inline-flex",alignItems:"center",gap:3}}><Users size={9} strokeWidth={1.8}/>{inscritsE}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "18px 20px" }}>
                <SectionTitle icon={<Users size={12} strokeWidth={1.8}/>}>Membres actifs ({membresActifs.length})</SectionTitle>
                {membresActifs.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun responsable renseigné</div> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {membresActifs.map(nom => {
                      const nb = studiesActions.filter(a => (a.responsables || []).includes(nom)).length;
                      return (
                        <div key={nom} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(26,86,219,0.08)", border: "1px solid rgba(26,86,219,0.15)", borderRadius: 20, fontSize: 11 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                            {nom.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--text-base)" }}>{nom}</span>
                          <span style={{ fontWeight: 700, color: "#1a56db", fontSize: 10 }}>{nb} action{nb > 1 ? "s" : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── État vide ── */}
            {studiesActions.length === 0 && (
              <div className="empty" style={{ padding: 48, textAlign: "center" }}>
                <BarChart2 size={32} strokeWidth={1} style={{ margin: "0 auto 12px", opacity: 0.3 }}/>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Aucune donnée pour ce cycle</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Crée des actions avec le pôle Études depuis le Suivi des actions — les statistiques apparaîtront automatiquement ici.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* --- ONGLET CONTACTS & SOLLICITATIONS (RELATIONS PUBLIQUES) --- */}
      {activeTab === "rp_contacts" && subPage === "Relations Publiques" && (() => {
        const SOLL_STATUTS = ["À contacter", "En attente de réponse", "Confirmé", "Refusé", "Annulé"];
        const SOLL_COLORS = {
          "À contacter": "#1a56db",
          "En attente de réponse": "#d97706",
          "Confirmé": "#16a34a",
          "Refusé": "#e63946",
          "Annulé": "#6b7280",
        };

        // Détection de conflits : un contact a 2+ sollicitations actives par des membres différents
        const getConflicts = (contact) => {
          const active = (contact.sollicitations || []).filter(s => !["Refusé","Annulé"].includes(s.statut));
          if (active.length < 2) return [];
          const members = [...new Set(active.map(s => s.membreNom))];
          return members.length > 1 ? active : [];
        };

        const filteredContacts = contacts
          .filter(c =>
            (!rpSearch.trim() || c.nom.toLowerCase().includes(rpSearch.toLowerCase()) || (c.organisme || "").toLowerCase().includes(rpSearch.toLowerCase()))
          )
          .filter(c => {
            if (rpFilterStatut === "Tous") return true;
            if (rpFilterStatut === "Conflits") return getConflicts(c).length > 0;
            return (c.sollicitations || []).some(s => s.statut === rpFilterStatut);
          });

        const totalConflicts = contacts.filter(c => getConflicts(c).length > 0).length;

        // ── Modale Contact (create/edit) ───────────────────────────────────────
        const ContactModal = ({ contact, onClose, onSave }) => {
          const [form, setForm] = React.useState({ nom: "", fonction: "", organisme: "", email: "", telephone: "", notes: "", ...(contact || {}) });
          const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
          return (
            <div className="modal-overlay" style={{ zIndex: 7000 }} onClick={onClose}>
              <div className="modal-box" style={{ width: 480, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-header-title">{contact?.id ? "Modifier le contact" : "Nouveau contact"}</div>
                  <button className="modal-close-btn" onClick={onClose}><X size={14} strokeWidth={2}/></button>
                </div>
                <div className="modal-body" style={{ gap: 14 }}>
                  <div className="form-2col" style={{ gap: 12 }}>
                    <div><label className="form-label">Nom *</label><input className="form-input" value={form.nom} onChange={e => f("nom", e.target.value)} placeholder="Ex: Jean-Paul Dupont" /></div>
                    <div><label className="form-label">Fonction</label><input className="form-input" value={form.fonction} onChange={e => f("fonction", e.target.value)} placeholder="Ex: Député, Président..." /></div>
                  </div>
                  <div><label className="form-label">Organisme / Institution</label><input className="form-input" value={form.organisme} onChange={e => f("organisme", e.target.value)} placeholder="Ex: Assemblée Nationale, Mairie..." /></div>
                  <div className="form-2col" style={{ gap: 12 }}>
                    <div><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => f("email", e.target.value)} /></div>
                    <div><label className="form-label">Téléphone</label><input className="form-input" value={form.telephone} onChange={e => f("telephone", e.target.value)} /></div>
                  </div>
                  <div><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => f("notes", e.target.value)} style={{ resize: "vertical" }} placeholder="Informations utiles, préférences de contact..." /></div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={onClose}>Annuler</button>
                  <button className="btn-primary" onClick={() => { if (form.nom.trim()) onSave(form); }}>
                    {contact?.id ? "Enregistrer" : "Créer"}
                  </button>
                </div>
              </div>
            </div>
          );
        };

        // ── Modale Sollicitation (add/edit) ────────────────────────────────────
        const SollModal = ({ contactId, soll, onClose, onSave }) => {
          const contact = contacts.find(c => c.id === contactId);
          const [form, setForm] = React.useState({
            membreNom: currentUser.nom,
            actionId: "",
            dateSolicitation: new Date().toISOString().split("T")[0],
            dateCible: "",
            statut: "À contacter",
            notes: "",
            ...(soll || {}),
          });
          const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
          const activeActions = actions.filter(a => !a.isArchived);
          return (
            <div className="modal-overlay" style={{ zIndex: 7000 }} onClick={onClose}>
              <div className="modal-box" style={{ width: 460, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-header-title">{soll ? "Modifier la sollicitation" : `Solliciter — ${contact?.nom}`}</div>
                  <button className="modal-close-btn" onClick={onClose}><X size={14} strokeWidth={2}/></button>
                </div>
                <div className="modal-body" style={{ gap: 13 }}>
                  <div><label className="form-label">Membre RP qui sollicite</label>
                    <select className="form-select" value={form.membreNom} onChange={e => f("membreNom", e.target.value)}>
                      {directory.map(m => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Action liée <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optionnel)</span></label>
                    <select className="form-select" value={form.actionId} onChange={e => f("actionId", e.target.value)}>
                      <option value="">— Aucune action spécifique —</option>
                      {activeActions.map(a => <option key={a.id} value={a.id}>{a.etablissement} ({a.ville})</option>)}
                    </select>
                  </div>
                  <div className="form-2col" style={{ gap: 12 }}>
                    <div><label className="form-label">Date de sollicitation</label><input type="date" className="form-input" value={form.dateSolicitation} onChange={e => f("dateSolicitation", e.target.value)} /></div>
                    <div><label className="form-label">Date cible (intervention)</label><input type="date" className="form-input" value={form.dateCible} onChange={e => f("dateCible", e.target.value)} /></div>
                  </div>
                  <div><label className="form-label">Statut</label>
                    <select className="form-select" value={form.statut} onChange={e => f("statut", e.target.value)}>
                      {SOLL_STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => f("notes", e.target.value)} style={{ resize: "vertical" }} placeholder="Objet de la sollicitation, contexte..." /></div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={onClose}>Annuler</button>
                  <button className="btn-primary" onClick={() => onSave({ ...form, id: soll?.id || Date.now(), actionTitre: activeActions.find(a => String(a.id) === String(form.actionId))?.etablissement || "" })}>
                    {soll ? "Enregistrer" : "Ajouter"}
                  </button>
                </div>
              </div>
            </div>
          );
        };

        // ── Handlers ───────────────────────────────────────────────────────────
        const handleSaveContact = async (form) => {
          if (form.id) {
            const { createdAt, updatedAt, ...data } = form;
            const updated = await api.put(`/contacts/${form.id}`, data).catch(console.error);
            if (updated) setContacts(prev => prev.map(c => c.id === form.id ? updated : c));
          } else {
            const created = await api.post('/contacts', form).catch(console.error);
            if (created?.id) setContacts(prev => [created, ...prev]);
          }
          setRpContactModal(null);
        };

        const handleSaveSoll = async (soll) => {
          const contact = contacts.find(c => c.id === rpSollModal.contactId);
          if (!contact) return;
          const existing = contact.sollicitations || [];
          const updated = rpSollModal.soll
            ? existing.map(s => s.id === soll.id ? soll : s)
            : [...existing, soll];
          const result = await api.put(`/contacts/${contact.id}`, { sollicitations: updated }).catch(console.error);
          if (result) setContacts(prev => prev.map(c => c.id === contact.id ? result : c));
          setRpSollModal(null);
        };

        const handleDeleteSoll = async (contactId, sollId) => {
          const contact = contacts.find(c => c.id === contactId);
          if (!contact) return;
          const updated = (contact.sollicitations || []).filter(s => s.id !== sollId);
          const result = await api.put(`/contacts/${contactId}`, { sollicitations: updated }).catch(console.error);
          if (result) setContacts(prev => prev.map(c => c.id === contactId ? result : c));
        };

        const handleDeleteContact = (contact) => {
          requestConfirm(`Supprimer le contact "${contact.nom}" et toutes ses sollicitations ?`, async () => {
            await api.delete(`/contacts/${contact.id}`).catch(console.error);
            setContacts(prev => prev.filter(c => c.id !== contact.id));
          });
        };

        const fmtDate = (str) => { if (!str) return ""; try { return new Date(str).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return str; } };

        return (
          <div style={{ marginTop: 24 }}>
            {/* Modales */}
            {rpContactModal !== null && (
              <ContactModal contact={rpContactModal} onClose={() => setRpContactModal(null)} onSave={handleSaveContact} />
            )}
            {rpSollModal !== null && (
              <SollModal contactId={rpSollModal.contactId} soll={rpSollModal.soll} onClose={() => setRpSollModal(null)} onSave={handleSaveSoll} />
            )}

            {/* KPIs */}
            <div className="space-kpi-4" style={{ marginBottom: 22 }}>
              {[
                { label: "Contacts", val: contacts.length, color: "#1a56db" },
                { label: "Sollicitations actives", val: contacts.reduce((s, c) => s + (c.sollicitations || []).filter(x => !["Refusé","Annulé"].includes(x.statut)).length, 0), color: "#d97706" },
                { label: "Confirmés", val: contacts.reduce((s, c) => s + (c.sollicitations || []).filter(x => x.statut === "Confirmé").length, 0), color: "#16a34a" },
                { label: "Conflits détectés", val: totalConflicts, color: totalConflicts > 0 ? "#e63946" : "var(--text-muted)" },
              ].map((k, i) => (
                <div key={i} className="kc">
                  <div className="kl">{k.label}</div>
                  <div className="kv" style={{ color: k.color, fontSize: 20 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* Alerte conflits */}
            {totalConflicts > 0 && (
              <div style={{ background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.25)", borderLeft: "4px solid #e63946", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={16} strokeWidth={1.8} color="#e63946" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13 }}>
                  <strong style={{ color: "#e63946" }}>{totalConflicts} contact{totalConflicts > 1 ? "s" : ""} en conflit</strong>
                  <span style={{ color: "var(--text-dim)" }}> — plusieurs membres sollicitent ce{totalConflicts > 1 ? "s" : ""} contact{totalConflicts > 1 ? "s" : ""} pour des actions différentes. Coordonnez-vous !</span>
                </div>
              </div>
            )}

            {/* Barre de filtres */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder="Rechercher un contact…" style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", width: "100%", maxWidth: 200, outline: "none" }} />
              <select value={rpFilterStatut} onChange={e => setRpFilterStatut(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", cursor: "pointer" }}>
                <option value="Tous">Tous les statuts</option>
                {SOLL_STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Conflits">⚠ Conflits seulement</option>
              </select>
              <div style={{ flex: 1 }} />
              {acc === "edit" && (
                <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setRpContactModal({})}>
                  <Plus size={13} strokeWidth={2} /> Nouveau contact
                </button>
              )}
            </div>

            {/* Liste des contacts */}
            {filteredContacts.length === 0 && (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
                {contacts.length === 0 ? "Aucun contact enregistré. Ajoutez des contacts institutionnels (députés, élus, partenaires…)" : "Aucun contact ne correspond aux filtres."}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredContacts.map(contact => {
                const sollicitations = contact.sollicitations || [];
                const conflicts = getConflicts(contact);
                const hasConflict = conflicts.length > 0;
                const activeSoll = sollicitations.filter(s => !["Refusé","Annulé"].includes(s.statut));

                return (
                  <div key={contact.id} style={{ background: "var(--bg-surface)", border: `1px solid ${hasConflict ? "rgba(230,57,70,0.35)" : "var(--border-light)"}`, borderRadius: 12, overflow: "hidden" }}>
                    {/* En-tête contact */}
                    <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", borderBottom: sollicitations.length > 0 ? "1px solid var(--border-light)" : "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: hasConflict ? "rgba(230,57,70,0.12)" : "rgba(26,86,219,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: hasConflict ? "#e63946" : "#1a56db", flexShrink: 0 }}>
                        {contact.nom.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-base)" }}>{contact.nom}</span>
                          {contact.fonction && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-alt)", padding: "2px 8px", borderRadius: 10 }}>{contact.fonction}</span>}
                          {contact.organisme && <span style={{ fontSize: 11, color: "#1a56db", background: "rgba(26,86,219,0.08)", padding: "2px 8px", borderRadius: 10 }}>{contact.organisme}</span>}
                          {hasConflict && <span style={{ fontSize: 11, color: "#e63946", background: "rgba(230,57,70,0.08)", padding: "2px 8px", borderRadius: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} strokeWidth={2}/> Conflit</span>}
                        </div>
                        <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                          {contact.email && <span style={{ fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={10} strokeWidth={1.8}/> {contact.email}</span>}
                          {contact.telephone && <span style={{ fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={10} strokeWidth={1.8}/> {contact.telephone}</span>}
                          {contact.notes && <span style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>{contact.notes}</span>}
                        </div>
                      </div>
                      {acc === "edit" && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setRpSollModal({ contactId: contact.id })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #1a56db", background: "rgba(26,86,219,0.07)", color: "#1a56db", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <Plus size={11} strokeWidth={2}/> Solliciter
                          </button>
                          <button onClick={() => setRpContactModal(contact)} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--text-muted)" }}><Pencil size={11} strokeWidth={1.8}/></button>
                          <button onClick={() => handleDeleteContact(contact)} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "#e63946" }}><Trash2 size={11} strokeWidth={1.8}/></button>
                        </div>
                      )}
                    </div>

                    {/* Liste des sollicitations */}
                    {sollicitations.length > 0 && (
                      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-alt)" }}>
                        {[...sollicitations].sort((a, b) => (b.dateSolicitation || "").localeCompare(a.dateSolicitation || "")).map(soll => {
                          const isConflict = hasConflict && activeSoll.includes(soll);
                          const sc = SOLL_COLORS[soll.statut] || "#6b7280";
                          const linkedAction = actions.find(a => String(a.id) === String(soll.actionId));
                          return (
                            <div key={soll.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", background: "var(--bg-surface)", borderRadius: 8, border: `1px solid ${isConflict ? "rgba(230,57,70,0.3)" : "var(--border-light)"}`, borderLeft: `3px solid ${sc}` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)" }}>{soll.membreNom}</span>
                                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sc + "18", color: sc, fontWeight: 700 }}>{soll.statut}</span>
                                  {isConflict && <span style={{ fontSize: 10, color: "#e63946", fontWeight: 700 }}>⚠ Conflit</span>}
                                </div>
                                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                                  {soll.dateSolicitation && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Calendar size={10} strokeWidth={1.8}/> Sollicité le {fmtDate(soll.dateSolicitation)}</span>}
                                  {soll.dateCible && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Target size={10} strokeWidth={1.8}/> Cible : {fmtDate(soll.dateCible)}</span>}
                                  {linkedAction && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><ClipboardList size={10} strokeWidth={1.8}/> {linkedAction.etablissement}</span>}
                                </div>
                                {soll.notes && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>{soll.notes}</div>}
                              </div>
                              {acc === "edit" && (
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                  <button onClick={() => setRpSollModal({ contactId: contact.id, soll })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}><Pencil size={11} strokeWidth={1.8}/></button>
                                  <button onClick={() => requestConfirm("Supprimer cette sollicitation ?", () => handleDeleteSoll(contact.id, soll.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#e63946", padding: "2px" }}><Trash2 size={11} strokeWidth={1.8}/></button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default SpaceView;