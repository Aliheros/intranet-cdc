// src/pages/Annuaire.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { POLE_COLORS, PROJET_COLORS } from '../data/constants';
import { AvatarInner, isAvatarUrl } from '../components/ui/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const getSpaceColor = name => POLE_COLORS[name] || PROJET_COLORS[name] || "#0f2d5e";
const isPoleSpace = name => !!POLE_COLORS[name];
const isProjetSpace = name => !!PROJET_COLORS[name];
import {
  Zap, User, Users, GraduationCap, BookOpen, ClipboardList, Target,
  Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus, Search, X,
  LayoutGrid, List, Mail, Phone, CalendarDays, SlidersHorizontal, Layers,
} from 'lucide-react';
import { StatusBadge, MEMBER_STATUS, MISSION_STATUS } from '../components/ui/StatusIcon';

const URGENCE_COLOR = { haute: "#e63946", normale: "#d97706", basse: "#16a34a" };

// Ordre d'affichage des rôles dans la vue "Par espace"
const ROLE_ORDER = { "Responsable": 0, "Direction": 0, "Membre": 1, "Observateur": 2 };
const STATUT_ORDER = s => (!s || s === "Actif") ? 0 : 1;
const TYPE_ICON = {
  "Mission ponctuelle": Zap,
  "Poste annuel": User,
  "Bénévolat": Users,
  "Alternance": GraduationCap,
  "Stage": BookOpen,
  "CDD": ClipboardList,
  "Recrutement CDI/CDD": ClipboardList,
};

// ── Sous-composant gestion candidatures (vue RH) ─────────────────────────────
const CandidaturePanel = ({ mission, onAccept, onRefuse }) => {
  const [refusingNom, setRefusingNom] = useState(null);
  const [refuseReason, setRefuseReason] = useState("");

  if (mission.candidatures.length === 0)
    return <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: "12px 0" }}>Aucune candidature reçue pour l'instant.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {mission.candidatures.map((c, i) => (
        <div key={i} style={{
          background: "var(--bg-surface)", borderRadius: 10, padding: "12px 16px",
          border: c.statut === "Accepté" ? "1.5px solid rgba(22,163,74,0.3)" : c.statut === "Refusé" ? "1px solid var(--border-light)" : "1.5px solid rgba(26,86,219,0.2)",
          opacity: c.statut === "Refusé" ? 0.65 : 1,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: c.statut === "Accepté" ? "rgba(22,163,74,0.12)" : "rgba(26,86,219,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: c.statut === "Accepté" ? "#16a34a" : "#1a56db", flexShrink: 0 }}>
              {c.nom[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>{c.nom}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.date}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                  background: c.statut === "Accepté" ? "rgba(22,163,74,0.1)" : c.statut === "Refusé" ? "rgba(148,163,184,0.12)" : "rgba(217,119,6,0.1)",
                  color: c.statut === "Accepté" ? "#16a34a" : c.statut === "Refusé" ? "#94a3b8" : "#d97706"
                }}>
                  {c.statut === "En attente" ? "En attente" : c.statut === "Accepté" ? "✓ Accepté(e)" : "Non retenu(e)"}
                </span>
              </div>
              {c.message && (
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic", lineHeight: 1.5, borderLeft: "2px solid var(--border-light)", paddingLeft: 8 }}>"{c.message}"</div>
              )}
              {c.refusReason && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Retour transmis : "{c.refusReason}"</div>
              )}
            </div>
            {c.statut === "En attente" && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => onAccept(mission.id, c.nom)} style={{ padding: "5px 12px", background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1.5px solid rgba(22,163,74,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} strokeWidth={2} /> Accepter
                </button>
                <button onClick={() => setRefusingNom(refusingNom === c.nom ? null : c.nom)} style={{ padding: "5px 12px", background: "none", color: "#e63946", border: "1.5px solid rgba(230,57,70,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <XCircle size={12} strokeWidth={2} /> Refuser
                </button>
              </div>
            )}
          </div>
          {refusingNom === c.nom && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>Motif du refus (optionnel — transmis au candidat)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" className="form-input" placeholder="Ex : Profil non correspondant, poste pourvu…" value={refuseReason} onChange={e => setRefuseReason(e.target.value)} style={{ fontSize: 12, flex: 1 }} />
                <button onClick={() => { onRefuse(mission.id, c.nom, refuseReason); setRefusingNom(null); setRefuseReason(""); }} style={{ padding: "0 14px", background: "#e63946", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Confirmer</button>
                <button onClick={() => { setRefusingNom(null); setRefuseReason(""); }} style={{ padding: "0 10px", background: "none", border: "1px solid var(--border-light)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)" }}><X size={14} /></button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Carte membre ──────────────────────────────────────────────────────────────
const MemberCard = ({ m, onClick, memberships = [], highlightPole }) => {
  const [hovered, setHovered] = useState(false);
  const color = getSpaceColor(m.pole);
  return (
    <div
      onClick={() => onClick(m)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${hovered ? color + "40" : "var(--border-light)"}`,
        borderRadius: 10,
        padding: "14px",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: hovered ? `0 4px 16px ${color}14` : "none",
      }}
    >
      {/* En-tête : avatar + nom + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: isAvatarUrl(m.avatar) ? "transparent" : `linear-gradient(135deg, ${color}, ${color}bb)`,
          color: "#fff", fontSize: 15, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          <AvatarInner avatar={m.avatar} nom={m.nom} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {m.nom}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11 }}>
            <StatusBadge map={MEMBER_STATUS} value={m.statut} size={10} />
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const conges = Array.isArray(m.conges) ? m.conges : [];
              const active = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
              const upcoming = conges.filter(c => c.debut > today).sort((a, b) => a.debut.localeCompare(b.debut))[0];
              const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
              if (active) return (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(249,115,22,0.12)", color: "#f97316" }}>
                  {active.fin ? `Retour ${fmt(active.fin)}` : "Retour non défini"}
                </span>
              );
              if (upcoming) return (
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "rgba(26,86,219,0.08)", color: "#1a56db" }}>
                  Congé {fmt(upcoming.debut)}{!upcoming.fin ? " · temporaire" : ""}
                </span>
              );
              return null;
            })()}
          </div>
          {(() => {
            const spaceMb = highlightPole
              ? memberships.find(mb => mb.type === "space" && mb.label === highlightPole)
              : null;
            const displayRole = spaceMb?.role || m.role;
            if (!displayRole) return null;
            const isResponsable = displayRole === "Responsable" || displayRole === "Direction";
            return (
              <div style={{
                fontSize: 10, marginTop: 3, fontWeight: isResponsable ? 700 : 400,
                color: isResponsable ? color : "var(--text-muted)",
              }}>
                {displayRole}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Contact */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {m.email && (
          <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", overflow: "hidden" }}>
            <Mail size={11} strokeWidth={1.8} style={{ flexShrink: 0, color: color }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
          </a>
        )}
        {m.telephone && (
          <a href={`tel:${m.telephone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Phone size={11} strokeWidth={1.8} style={{ flexShrink: 0, color: color }} />
            {m.telephone}
          </a>
        )}
        {m.dispos && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "flex-start", gap: 6, fontStyle: "italic" }}>
            <CalendarDays size={10} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1, color: color }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.dispos}</span>
          </div>
        )}
      </div>

      {/* Compétences */}
      {(m.competences || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {(m.competences || []).slice(0, 3).map(c => (
            <span key={c} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: `${color}14`, color: color, fontWeight: 600 }}>{c}</span>
          ))}
          {(m.competences || []).length > 3 && (
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "var(--bg-alt)", color: "var(--text-muted)", fontWeight: 600 }}>+{(m.competences || []).length - 3}</span>
          )}
        </div>
      )}

      {/* Appartenances aux équipes */}
      {memberships.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Layers size={9} strokeWidth={2} /> Équipes
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {memberships.map((mb, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
                background: mb.type === "space" ? `${mb.color || "#0f2d5e"}14` : "rgba(16,163,74,0.1)",
                color: mb.type === "space" ? (mb.color || "#0f2d5e") : "#16a34a",
                border: `1px solid ${mb.type === "space" ? `${mb.color || "#0f2d5e"}30` : "rgba(16,163,74,0.25)"}`,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                {mb.label}
                {mb.role && mb.role !== "Membre" && (
                  <span style={{ opacity: 0.7 }}>· {mb.role}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────
const Annuaire = () => {
  const { currentUser } = useAuth();
  const {
    setSelectedMemberProfile, setIsProfileModalOpen,
    setMissionModal,
    annuaireInitialTab: initialTab, setAnnuaireInitialTab: onTabMounted,
  } = useAppContext();
  const onOpenProfile = (m) => { setSelectedMemberProfile(m); setIsProfileModalOpen(true); };
  const onNewMission  = () => setMissionModal({});
  const {
    directory, hasPower, missions, spaceTeams, activeCycle, evenements,
    handleAcceptCandidate: onAcceptCandidate,
    handleRefuseCandidate: onRefuseCandidate,
    handleApplyMission: onApplyMission,
  } = useDataContext();

  const [tab, setTab] = useState(initialTab || "annuaire");

  useEffect(() => {
    if (initialTab) { setTab(initialTab); onTabMounted?.(null); }
  }, [initialTab]);

  // ── Membres
  const [search, setSearch] = useState("");
  const [filterRoles, setFilterRoles] = useState([]);
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterSpace, setFilterSpace] = useState("Tous");
  const [viewMode, setViewMode] = useState("grille");

  // ── Missions
  const [searchMission, setSearchMission] = useState("");
  const [filterType, setFilterType] = useState("Tous");
  const [expandedMission, setExpandedMission] = useState(null);
  const [applyModal, setApplyModal] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");


  const isRH = hasPower && hasPower("view_rh");

  // ── Appartenances aux équipes par membre ─────────────────────────────────
  const memberMemberships = useMemo(() => {
    const map = {};

    // Espaces (pôles & projets) — chercher dans tous les cycles disponibles du spaceTeams
    Object.entries(spaceTeams).forEach(([space, yearMap]) => {
      Object.entries(yearMap || {}).forEach(([year, team]) => {
        if (activeCycle && year !== activeCycle) return; // filtrer sur le cycle actif si défini
        (team || []).forEach(({ nom, role }) => {
          if (!map[nom]) map[nom] = [];
          // éviter les doublons si même espace apparaît plusieurs fois
          if (!map[nom].find(mb => mb.label === space && mb.type === "space")) {
            map[nom].push({ type: "space", label: space, role, color: getSpaceColor(space), spaceType: isPoleSpace(space) ? "pole" : isProjetSpace(space) ? "projet" : "other" });
          }
        });
      });
    });

    // Événements Coordination — equipe[] contient des noms
    evenements.filter(e => !e.isArchived).forEach(ev => {
      (ev.equipe || []).forEach(nom => {
        if (!map[nom]) map[nom] = [];
        if (!map[nom].find(mb => mb.label === ev.titre && mb.type === "event")) {
          map[nom].push({ type: "event", label: ev.titre });
        }
      });
    });

    return map;
  }, [spaceTeams, evenements, activeCycle]);

  // Listes dérivées membres — pôles + projets traités à égalité
  const spaces = useMemo(() => {
    const fromDirectory = directory.map(m => m.pole).filter(Boolean);
    const fromSpaces = Object.keys(spaceTeams);
    const all = [...new Set([...fromDirectory, ...fromSpaces])];
    // Trier : pôles en premier, puis projets, puis autres
    return ["Tous", ...all.sort((a, b) => {
      const rankA = isPoleSpace(a) ? 0 : isProjetSpace(a) ? 1 : 2;
      const rankB = isPoleSpace(b) ? 0 : isProjetSpace(b) ? 1 : 2;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    })];
  }, [directory, spaceTeams]);
  // Rétrocompatibilité interne
  const poles = spaces;
  const statutsPresents = useMemo(() => [...new Set(directory.map(m => m.statut || "Actif"))], [directory]);

  const toggleRole = (role) => {
    setFilterRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const filteredMembers = useMemo(() => {
    return directory
      .filter(m => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          m.nom.toLowerCase().includes(q) ||
          (m.pole || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q) ||
          (m.role || "").toLowerCase().includes(q) ||
          (m.dispos || "").toLowerCase().includes(q) ||
          (m.competences || []).some(c => c.toLowerCase().includes(q));
        const matchStatut = filterStatut === "Tous" || (m.statut || "Actif") === filterStatut;
        const matchRole = filterRoles.length === 0 || filterRoles.some(role => {
          const mbs = memberMemberships[m.nom] || [];
          return mbs.some(mb => {
            if (mb.type !== "space") return false;
            if (role === "Responsable") return mb.role === "Responsable" || mb.role === "Direction";
            return mb.role === role;
          });
        });
        const matchSpace = filterSpace === "Tous" ||
          m.pole === filterSpace ||
          (memberMemberships[m.nom] || []).some(mb => mb.label === filterSpace);
        return matchSearch && matchStatut && matchRole && matchSpace;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [directory, search, filterRoles, filterStatut, filterSpace, memberMemberships]);

  // Vue par pôle : un membre peut apparaître dans plusieurs groupes (pôle natif + équipes)
  const membersByPole = useMemo(() => {
    const grouped = {};
    filteredMembers.forEach(m => {
      // Groupe du pôle natif
      if (!grouped[m.pole]) grouped[m.pole] = [];
      if (!grouped[m.pole].find(x => x.nom === m.nom)) grouped[m.pole].push(m);
      // Groupes des équipes d'espace
      (memberMemberships[m.nom] || [])
        .filter(mb => mb.type === "space" && mb.label !== m.pole)
        .forEach(mb => {
          if (!grouped[mb.label]) grouped[mb.label] = [];
          if (!grouped[mb.label].find(x => x.nom === m.nom)) grouped[mb.label].push(m);
        });
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        // Pôles avant projets, puis alphabétique
        const rankA = isPoleSpace(a) ? 0 : isProjetSpace(a) ? 1 : 2;
        const rankB = isPoleSpace(b) ? 0 : isProjetSpace(b) ? 1 : 2;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b, 'fr');
      })
      .map(([pole, members]) => [
        pole,
        [...members].sort((a, b) => {
          const mbA = (memberMemberships[a.nom] || []).find(mb => mb.type === "space" && mb.label === pole);
          const mbB = (memberMemberships[b.nom] || []).find(mb => mb.type === "space" && mb.label === pole);
          // 1. Rôle dans l'espace (Responsable → Membre → Observateur → natif sans rôle)
          const roleOrderA = mbA ? (ROLE_ORDER[mbA.role] ?? 3) : 4;
          const roleOrderB = mbB ? (ROLE_ORDER[mbB.role] ?? 3) : 4;
          if (roleOrderA !== roleOrderB) return roleOrderA - roleOrderB;
          // 2. Statut (Actif en premier)
          const statutA = STATUT_ORDER(a.statut);
          const statutB = STATUT_ORDER(b.statut);
          if (statutA !== statutB) return statutA - statutB;
          // 3. Nom alphabétique
          return a.nom.localeCompare(b.nom, 'fr');
        }),
      ]);
  }, [filteredMembers, memberMemberships]);

  const statsActifs = directory.filter(m => !m.statut || m.statut === "Actif").length;
  const statsAbsents = directory.filter(m => m.statut && m.statut !== "Actif").length;


  // Missions
  const openMissions = missions.filter(m => m.statut !== "Annulée" && m.statut !== "Fermée");
  const types = ["Tous", ...new Set(missions.map(m => m.type))];
  const filteredMissions = openMissions.filter(m => {
    const matchSearch = !searchMission || m.titre.toLowerCase().includes(searchMission.toLowerCase()) || m.description.toLowerCase().includes(searchMission.toLowerCase());
    const matchType = filterType === "Tous" || m.type === filterType;
    return matchSearch && matchType;
  });
  const mesCandidatures = missions.map(m => {
    const cand = m.candidatures.find(c => c.nom === currentUser?.nom);
    return cand ? { mission: m, candidature: cand } : null;
  }).filter(Boolean);
  const totalCandidaturesEnAttente = missions.reduce((s, m) => s + m.candidatures.filter(c => c.statut === "En attente").length, 0);

  const TABS = [
    { id: "annuaire", label: `Membres (${directory.length})`, Icon: Users },
    { id: "missions", label: `Bourse aux missions (${openMissions.length})`, Icon: Target },
  ];

  return (
    <>
      <div className="eyebrow">Organisation</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Annuaire</div>
        {isRH && tab === "missions" && (
          <button className="btn-primary" onClick={onNewMission} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} strokeWidth={2.5} /> Publier une mission
          </button>
        )}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-light)", marginBottom: 28, gap: 2 }} data-tour="annuaire-main">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 700, background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === t.id ? "2px solid #1a56db" : "2px solid transparent",
            color: tab === t.id ? "#1a56db" : "var(--text-muted)",
            marginBottom: -2, display: "inline-flex", alignItems: "center", gap: 6, transition: "color 0.15s",
          }}>
            <t.Icon size={14} strokeWidth={1.8} />
            {t.label}
            {t.id === "missions" && isRH && totalCandidaturesEnAttente > 0 && (
              <span style={{ fontSize: 10, background: "#e63946", color: "#fff", borderRadius: 20, padding: "1px 7px", fontWeight: 800 }}>
                {totalCandidaturesEnAttente}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB ANNUAIRE ─────────────────────────────────────────────────────── */}
      {tab === "annuaire" && (
        <>
          {/* Stats rapides */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            {[
              { label: "Membres au total", v: directory.length, c: "#1a56db", bg: "rgba(26,86,219,0.07)" },
              { label: "Actifs", v: statsActifs, c: "#16a34a", bg: "rgba(22,163,74,0.07)" },
              ...(statsAbsents > 0 ? [{ label: "Absents / Congés", v: statsAbsents, c: "#d97706", bg: "rgba(217,119,6,0.07)" }] : []),
              { label: "Pôles", v: spaces.filter(s => s !== "Tous" && isPoleSpace(s)).length, c: "#7c3aed", bg: "rgba(124,58,237,0.07)" },
              { label: "Projets", v: spaces.filter(s => s !== "Tous" && isProjetSpace(s)).length, c: "#ea580c", bg: "rgba(234,88,12,0.07)" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "10px 18px", background: s.bg, border: `1px solid ${s.c}25`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, lineHeight: 1.3 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Barre de recherche + toggle vue */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
              <Search size={14} strokeWidth={1.8} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text" className="form-input"
                placeholder="Nom, pôle, compétence, email, disponibilités…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: "100%" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
                  <X size={13} strokeWidth={2} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, background: "var(--bg-alt)", borderRadius: 8, padding: 3 }}>
              {[{ v: "grille", Icon: LayoutGrid, label: "Grille" }, { v: "poles", Icon: List, label: "Par espace" }].map(({ v, Icon, label }) => (
                <button key={v} onClick={() => setViewMode(v)} title={label} style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: viewMode === v ? "var(--bg-surface)" : "none",
                  color: viewMode === v ? "#1a56db" : "var(--text-muted)",
                  boxShadow: viewMode === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                }}>
                  <Icon size={13} strokeWidth={1.8} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres rôle + statut */}
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
            <SlidersHorizontal size={13} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            {[
              { label: "Responsable", color: "#7c3aed" },
              { label: "Membre", color: "#1a56db" },
              { label: "Observateur", color: "#0891b2" },
            ].map(({ label, color }) => {
              const active = filterRoles.includes(label);
              return (
                <button key={label} onClick={() => toggleRole(label)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${active ? color : "var(--border-light)"}`,
                  background: active ? `${color}18` : "var(--bg-hover)",
                  color: active ? color : "var(--text-dim)",
                  transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
            {statutsPresents.length > 1 && (
              <>
                <div style={{ width: 1, height: 18, background: "var(--border-light)", margin: "0 2px", flexShrink: 0 }} />
                <button onClick={() => setFilterStatut("Tous")} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border-light)",
                  background: filterStatut === "Tous" ? "rgba(15,29,94,0.08)" : "var(--bg-hover)",
                  color: filterStatut === "Tous" ? "#0f2d5e" : "var(--text-dim)", transition: "all 0.15s",
                }}>Tous statuts</button>
                {statutsPresents.map(s => (
                  <button key={s} onClick={() => setFilterStatut(filterStatut === s ? "Tous" : s)} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: "1px solid var(--border-light)",
                    background: filterStatut === s ? "rgba(15,29,94,0.08)" : "var(--bg-hover)",
                    color: filterStatut === s ? "#0f2d5e" : "var(--text-dim)", transition: "all 0.15s",
                  }}>{s}</button>
                ))}
              </>
            )}
          </div>

          {/* Filtre pôle / projet */}
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
            <Layers size={13} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            {spaces.map(s => {
              const active = filterSpace === s;
              const color = s === "Tous" ? "#0f2d5e" : getSpaceColor(s);
              return (
                <button key={s} onClick={() => setFilterSpace(s)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${active ? color : "var(--border-light)"}`,
                  background: active ? `${color}18` : "var(--bg-hover)",
                  color: active ? color : "var(--text-dim)",
                  transition: "all 0.15s",
                }}>
                  {s}
                </button>
              );
            })}
          </div>

          {/* Résultats */}
          {filteredMembers.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>Aucun membre ne correspond à votre recherche.</div>
          ) : viewMode === "grille" ? (
            <>
              {search || filterRoles.length > 0 || filterStatut !== "Tous" || filterSpace !== "Tous" ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                  {filteredMembers.length} résultat{filteredMembers.length > 1 ? "s" : ""}
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(230px, 100%), 1fr))", gap: 14 }}>
                {filteredMembers.map((m, i) => (
                  <MemberCard key={m.id || i} m={m} onClick={onOpenProfile} memberships={memberMemberships[m.nom] || []} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              {membersByPole.map(([pole, members]) => (
                <div key={pole}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${getSpaceColor(pole)}28` }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: getSpaceColor(pole), flexShrink: 0 }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: getSpaceColor(pole), textTransform: "uppercase", letterSpacing: "0.08em" }}>{pole}</span>
                    {isPoleSpace(pole) && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${getSpaceColor(pole)}14`, color: getSpaceColor(pole), textTransform: "uppercase", letterSpacing: "0.06em" }}>Pôle</span>}
                    {isProjetSpace(pole) && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${getSpaceColor(pole)}14`, color: getSpaceColor(pole), textTransform: "uppercase", letterSpacing: "0.06em" }}>Projet</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-alt)", padding: "2px 9px", borderRadius: 20, fontWeight: 600 }}>
                      {members.length} membre{members.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(230px, 100%), 1fr))", gap: 12 }}>
                    {members.map((m, i) => (
                      <MemberCard key={m.id || i} m={m} onClick={onOpenProfile} memberships={memberMemberships[m.nom] || []} highlightPole={pole} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB BOURSE AUX MISSIONS ──────────────────────────────────────────── */}
      {tab === "missions" && (
        <>
          {isRH ? (
            <>
              {missions.length > 0 && (
                <div className="kpi-3col" style={{ gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Missions ouvertes", v: openMissions.length, color: "#1a56db" },
                    { label: "Candidatures en attente", v: totalCandidaturesEnAttente, color: totalCandidaturesEnAttente > 0 ? "#d97706" : "var(--text-muted)" },
                    { label: "Candidats acceptés", v: missions.reduce((s, m) => s + m.candidatures.filter(c => c.statut === "Accepté").length, 0), color: "#16a34a" },
                  ].map((k, i) => (
                    <div key={i} className="kc">
                      <div className="kl">{k.label}</div>
                      <div className="kv" style={{ color: k.color, fontSize: 20 }}>{k.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {missions.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", background: "var(--bg-surface)", borderRadius: 16, border: "1px dashed var(--border-light)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(26,86,219,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Target size={24} strokeWidth={1.5} color="#1a56db" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-base)", marginBottom: 6 }}>Aucune mission publiée</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Publiez une mission pour commencer à recevoir des candidatures.</div>
                  <button onClick={onNewMission} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    <Plus size={14} strokeWidth={2.5} /> Publier une mission
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {missions.filter(m => m.statut !== "Annulée").map(m => {
                    const isExpanded = expandedMission === m.id;
                    const pending = m.candidatures.filter(c => c.statut === "En attente").length;
                    const TypeIcon = TYPE_ICON[m.type] || ClipboardList;
                    return (
                      <div key={m.id} style={{ background: "var(--bg-surface)", borderRadius: 12, border: pending > 0 ? "1.5px solid rgba(217,119,6,0.25)" : "1px solid var(--border-light)", borderLeft: `4px solid ${URGENCE_COLOR[m.urgence] || "#ddd"}`, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }} onClick={() => setExpandedMission(isExpanded ? null : m.id)}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${URGENCE_COLOR[m.urgence]}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: URGENCE_COLOR[m.urgence] }}>
                            <TypeIcon size={18} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>{m.titre}</span>
                              <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "rgba(26,86,219,0.1)", color: "#1a56db", fontWeight: 700 }}>{m.pole}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.type}</span>
                              {m.duree && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· {m.duree}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: pending > 0 ? "#d97706" : "var(--text-muted)" }}>
                                {pending > 0 ? `${pending} en attente` : m.candidatures.length === 0 ? "Aucune candidature" : `${m.candidatures.length} candidature${m.candidatures.length > 1 ? "s" : ""}`}
                              </span>
                              <StatusBadge map={MISSION_STATUS} value={m.statut} size={10} />
                            </div>
                          </div>
                          <div style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)", flexShrink: 0 }}>
                            {isExpanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid var(--border-light)", padding: "16px 18px", background: "var(--bg-alt)" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
                              Candidatures reçues ({m.candidatures.length})
                            </div>
                            <CandidaturePanel mission={m} onAccept={onAcceptCandidate} onRefuse={onRefuseCandidate} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {mesCandidatures.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>Mes candidatures</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {mesCandidatures.map(({ mission: m, candidature: c }, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-light)", borderLeft: `4px solid ${c.statut === "Accepté" ? "#16a34a" : c.statut === "Refusé" ? "#94a3b8" : "#d97706"}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)", marginBottom: 2 }}>{m.titre}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.pole} · {m.type}</div>
                          {c.refusReason && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontStyle: "italic" }}>Retour RH : "{c.refusReason}"</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {c.statut === "En attente" && <Clock size={13} strokeWidth={1.8} color="#d97706" />}
                          {c.statut === "Accepté" && <CheckCircle2 size={13} strokeWidth={1.8} color="#16a34a" />}
                          {c.statut === "Refusé" && <XCircle size={13} strokeWidth={1.8} color="#94a3b8" />}
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: c.statut === "Accepté" ? "rgba(22,163,74,0.1)" : c.statut === "Refusé" ? "rgba(148,163,184,0.12)" : "rgba(217,119,6,0.1)", color: c.statut === "Accepté" ? "#16a34a" : c.statut === "Refusé" ? "#94a3b8" : "#d97706" }}>
                            {c.statut === "En attente" ? "En attente" : c.statut === "Accepté" ? "Accepté(e)" : "Non retenu(e)"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: "0 0 240px" }}>
                  <Search size={14} strokeWidth={1.8} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input type="text" className="form-input" placeholder="Rechercher une mission…" value={searchMission} onChange={e => setSearchMission(e.target.value)} style={{ paddingLeft: 36 }} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {types.map(t => (
                    <button key={t} onClick={() => setFilterType(t)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)", background: filterType === t ? "#0f2d5e" : "var(--bg-hover)", color: filterType === t ? "#fff" : "var(--text-dim)", transition: "all 0.15s" }}>{t}</button>
                  ))}
                </div>
              </div>

              {filteredMissions.length === 0 ? (
                <div className="empty" style={{ padding: 40 }}>Aucune mission disponible pour le moment.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredMissions.map(m => {
                    const myCandidate = m.candidatures.find(c => c.nom === currentUser?.nom);
                    const TypeIcon = TYPE_ICON[m.type] || ClipboardList;
                    return (
                      <div key={m.id} style={{ background: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--border-light)", borderLeft: `4px solid ${URGENCE_COLOR[m.urgence] || "#ddd"}` }}>
                        <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${URGENCE_COLOR[m.urgence]}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: URGENCE_COLOR[m.urgence] }}>
                            <TypeIcon size={18} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>{m.titre}</span>
                              <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "rgba(26,86,219,0.1)", color: "#1a56db", fontWeight: 700 }}>{m.pole}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.type}{m.duree ? ` · ${m.duree}` : ""}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: URGENCE_COLOR[m.urgence], display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: URGENCE_COLOR[m.urgence] }} />
                                {m.urgence === "haute" ? "Urgent" : m.urgence === "basse" ? "Flexible" : "Normal"}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10 }}>{m.description}</div>
                            {(m.competences || []).length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {m.competences.map(c => (
                                  <span key={c} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--bg-alt)", color: "var(--text-dim)", fontWeight: 600 }}>{c}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {myCandidate ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "6px 12px", borderRadius: 8, fontWeight: 700, background: myCandidate.statut === "Accepté" ? "rgba(22,163,74,0.1)" : myCandidate.statut === "Refusé" ? "rgba(148,163,184,0.12)" : "rgba(217,119,6,0.1)", color: myCandidate.statut === "Accepté" ? "#16a34a" : myCandidate.statut === "Refusé" ? "#94a3b8" : "#d97706" }}>
                                {myCandidate.statut === "En attente" ? <><Clock size={11} strokeWidth={1.8} /> En attente</> : myCandidate.statut === "Accepté" ? <><CheckCircle2 size={11} strokeWidth={1.8} /> Accepté(e)</> : <><XCircle size={11} strokeWidth={1.8} /> Non retenu(e)</>}
                              </span>
                            ) : (
                              <button onClick={() => setApplyModal(m)} style={{ padding: "8px 16px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Postuler</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {applyModal && (
            <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setApplyModal(null)}>
              <div className="modal-box" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
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
                  <button className="btn-primary" onClick={() => { onApplyMission(applyModal.id, applyMsg); setApplyModal(null); setApplyMsg(""); }}>
                    Envoyer ma candidature
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB COMPÉTENCES ──────────────────────────────────────────────────── */}
    </>
  );
};

export default Annuaire;
