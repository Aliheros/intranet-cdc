// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Badge from '../components/ui/Badge';
import { POLE_COLORS, PROJET_COLORS, STATUT_STYLE, POLES, PROJETS } from '../data/constants';
import { formatDateShort, isPastDate, sortTasksSmart, isTaskActiveInFeed } from '../utils/utils';
import api from '../api/apiClient';
import { CheckCircle2, Calendar, Receipt, MapPin, User, Zap, Target, MessageCircle, Megaphone, Sparkles, Timer, ClipboardList, Users, Pencil, Trash2, Clock, Plus, HelpCircle } from 'lucide-react';
import { StatusBadge, NDF_STATUS, MEMBER_STATUS } from '../components/ui/StatusIcon';
import { AvatarInner, isAvatarUrl, findMemberByName } from '../components/ui/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import '../styles/login-loader.css';

const URGENCE_COLOR = { haute: "#e63946", normale: "#d97706", basse: "#16a34a" };

const Dashboard = () => {
  const { currentUser } = useAuth();
  const {
    requestConfirm, addToast, handleNav,
    setActiveEventId, highlightedTaskId, setHighlightedTaskId, setHighlightedActionId, setHighlightedEventId,
    setNoteFraisModal, openMemberProfile, freshLogin,
  } = useAppContext();
  const onNewNoteFrais = () => setNoteFraisModal({});
  const navigate = handleNav;
  const {
    directory, changeMyStatus,
    handleDeclareConge: onDeclareConge,
    handleEndCongeNow, handleEditConge, handleDeleteConge,
    isAdmin, isBureau, hasPower, getSpaceRole,
    actions, evenements, conversations,
    tasks, setTasks, jobOffers, setJobOffers,
    missions, notesFrais,
    transactions,
    devisFactures,
    faqs,
    handleApplyMission: onApplyMission,
    notifs, notifLues, setNotifLues,
    seancePresences,
  } = useDataContext();
  const onEndCongeNow = handleEndCongeNow;
  const onEditConge = ({ id, ...updatedConge }) => handleEditConge(id, updatedConge);
  const onDeleteConge = (id) => handleDeleteConge(id);
  // ── Restart fiable de la transition au login (marche aussi à la re-connexion) ─
  useEffect(() => {
    if (!freshLogin) return;
    const layer = document.querySelector('.gradient-layer');
    if (!layer) return;
    // Force opacity 0 immédiatement (annule tout état précédent)
    layer.style.transition = 'none';
    layer.style.opacity = '0';
    // Puis fondu entrant après le loader
    const t = setTimeout(() => {
      layer.style.transition = 'opacity 3s ease-in-out';
      layer.style.opacity = '1';
    }, 2500);
    return () => clearTimeout(t);
  }, [freshLogin]);

  // ── Drift animé + magnétisme souris sur les halos de fond ───────────────
  useEffect(() => {
    const layer = document.querySelector('.gradient-layer');
    if (!layer) return;

    // Paramètres de dérive sinusoïdale pour chaque halo (cx/cy = centre, ax/ay = amplitude, fx/fy = fréquence, px/py = phase)
    const HALOS = [
      { cx: 0.14, cy: 0.14, ax: 0.22, ay: 0.20, fx: 1.0, fy: 1.3, px: 0.0, py: 0.5 },
      { cx: 0.82, cy: 0.18, ax: 0.18, ay: 0.22, fx: 0.7, fy: 1.1, px: 1.2, py: 0.0 },
      { cx: 0.50, cy: 0.82, ax: 0.24, ay: 0.17, fx: 1.1, fy: 0.8, px: 2.1, py: 1.6 },
      { cx: 0.10, cy: 0.72, ax: 0.19, ay: 0.23, fx: 0.9, fy: 1.5, px: 3.0, py: 2.3 },
    ];
    const MAGNET_RADIUS   = 0.38; // portée en unités normalisées (0-1)
    const MAGNET_STRENGTH = 0.14; // intensité d'attraction

    let mouseX = -1, mouseY = -1;
    let rafId;

    const onMove = (e) => {
      const rect = layer.getBoundingClientRect();
      mouseX = (e.clientX - rect.left)  / rect.width;
      mouseY = (e.clientY - rect.top)   / rect.height;
    };

    const tick = (t) => {
      const s = t / 14000; // vitesse du drift (plus grand = plus lent)
      HALOS.forEach((h, i) => {
        let x = h.cx + Math.sin(s * h.fx + h.px) * h.ax;
        let y = h.cy + Math.cos(s * h.fy + h.py) * h.ay;
        // Attraction magnétique vers le curseur
        if (mouseX >= 0) {
          const dx   = mouseX - x;
          const dy   = mouseY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAGNET_RADIUS && dist > 0.001) {
            const force = (1 - dist / MAGNET_RADIUS) * MAGNET_STRENGTH;
            x += dx * force;
            y += dy * force;
          }
        }
        layer.style.setProperty(`--gx${i + 1}`, `${(x * 100).toFixed(2)}%`);
        layer.style.setProperty(`--gy${i + 1}`, `${(y * 100).toFixed(2)}%`);
      });
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Effet tilt 3D sur les cartes dashboard ────────────────────────────────
  useEffect(() => {
    const attachTilt = (el) => {
      let rafId = null;
      let pendingRx = 0, pendingRy = 0;

      const onMove = (e) => {
        const { left, top, width, height } = el.getBoundingClientRect();
        // Intensité proportionnelle à la taille : même angle max quelle que soit la carte
        const intensity = Math.max(width, height) / 5;
        pendingRx = ((e.clientY - top  - height / 2) / intensity) * -1;
        pendingRy =  (e.clientX - left - width  / 2) / intensity;
        if (rafId) return; // déjà en attente → on accumule juste les valeurs
        rafId = requestAnimationFrame(() => {
          el.style.transform = `perspective(1000px) rotateX(${pendingRx}deg) rotateY(${pendingRy}deg) scale(1.015)`;
          rafId = null;
        });
      };
      const onLeave = () => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        el.style.transition = 'transform .5s cubic-bezier(.25,1,.5,1)';
      };
      const onEnter = () => { el.style.transition = 'transform .1s ease'; };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('mouseenter', onEnter);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        el.removeEventListener('mouseenter', onEnter);
      };
    };
    const targets = document.querySelectorAll('.kpi-grid .kc, .dash-two-col .sc, .sc[data-tour], .sc[data-tilt]');
    const cleanups = Array.from(targets).map(el => attachTilt(el));
    return () => cleanups.forEach(f => f());
  }, []);

  const [showMissionApply, setShowMissionApply] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [ignoredMissions, setIgnoredMissions] = useState([]);
  const [showCongeForm, setShowCongeForm] = useState(false);
  const [congeForm, setCongeForm] = useState({ debut: "", fin: "", motif: "" });
  const [editCongeId, setEditCongeId] = useState(null); // null = nouveau, sinon id du congé édité

  // ─── Calculs ──────────────────────────────────────────────────────────────

  // Espaces où l'utilisateur est responsable/direction
  const managedSpaces = new Set(
    [...POLES, ...PROJETS].filter(space => {
      if (!getSpaceRole) return false;
      const role = getSpaceRole(space);
      return role === "Responsable" || role === "Direction";
    })
  );

  // Tâches visibles :
  //   - assigné à moi (non complété) OU
  //   - responsable/direction du pôle/projet concerné (toutes les tâches du space)
  const visibleTasks = tasks.filter(t => {
    if (!isTaskActiveInFeed(t)) return false;
    const isAssigned = (t.assignees || []).some(a => a.name === currentUser.nom && !a.completed);
    const isManager  = managedSpaces.has(t.space);
    return isAssigned || isManager;
  });

  // KPI : uniquement les tâches où j'ai encore du travail personnel en attente
  const myPendingTasks = visibleTasks.filter(t =>
    (t.assignees || []).some(a => a.name === currentUser.nom && !a.completed)
  );
  const myOverdueTasks = myPendingTasks.filter(t => t.deadline && isPastDate(t.deadline));
  const groupedTasks   = visibleTasks.reduce((acc, t) => { (acc[t.space] ??= []).push(t); return acc; }, {});

  // Navigation vers une tâche dans son espace
  const navigateToTask = (t) => {
    if (!t?.space) return;
    const pageType = PROJETS.includes(t.space) ? "projet" : "pole";
    navigate(pageType, t.space);
    setHighlightedTaskId(t.id);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingSeances = [];
  evenements.filter(e => !e.isArchived).forEach(e => {
    (e.seances || []).forEach(s => {
      if (!s.date) return;
      const [y, m, d] = s.date.split("-");
      const sd = new Date(+y, +m - 1, +d);
      if (sd >= today) {
        const isInscrit = (s.inscrits || []).includes(currentUser.nom);
        const isTeam    = (e.equipe   || []).includes(currentUser.nom);
        if (isInscrit || isTeam) upcomingSeances.push({ event: e, seance: s, seanceDate: sd, isInscrit });
      }
    });
  });
  upcomingSeances.sort((a, b) => a.seanceDate - b.seanceDate);

  const openMissions   = missions.filter(m => (m.statut === "Ouvert" || m.statut === "Ouverte") && !ignoredMissions.includes(m.id));
  const urgentMissions = openMissions.filter(m => m.urgence === "haute");
  const mesNdf         = notesFrais.filter(n => (n.demandeurNom || n.demandeur) === currentUser.nom);
  const mesNdfPending  = mesNdf.filter(n => ["Soumise", "En vérification"].includes(n.statut));
  const membresActifs  = directory.filter(m => m.statut === "Actif").length;
  const pendingDF      = (devisFactures || []).filter(df => ['Soumis', 'En traitement'].includes(df.statut));
  const pendingHorsBudget = (transactions || []).filter(t => t.horseBudget && !t.horseBudgetApprovedBy);
  const recentFaqs     = (faqs || []).slice(0, 3);

  // ─── Séances à valider (responsableNom = moi, séance passée, présences en_attente) ──
  const seancesAValider = [];
  evenements.filter(e => !e.isArchived && e.responsableNom === currentUser.nom).forEach(e => {
    (e.seances || []).forEach(s => {
      if (!s.date || s.annulee) return;
      const [y, m, d] = s.date.split("-");
      const sd = new Date(+y, +m - 1, +d);
      if (sd >= today) return; // séance pas encore passée
      const presences = (seancePresences || []).filter(
        p => p.evenementId === e.id && p.seanceId === String(s.id) && p.resp1Statut === 'en_attente'
      );
      if (presences.length > 0) {
        seancesAValider.push({ event: e, seance: s, seanceDate: sd, count: presences.length });
      }
    });
  });
  seancesAValider.sort((a, b) => a.seanceDate - b.seanceDate);

  return (
    <>
      <div className={`eyebrow${freshLogin ? ' dash-stagger-1 dash-text-to-dark' : ''}`}>Cité des Chances</div>
      <div className={`ptitle${freshLogin ? ' dash-stagger-1 dash-text-to-dark' : ''}`}>Bonjour, {currentUser.nom.split(" ")[0]} 👋</div>

      {/* ── KPIs RAPIDES ──────────────────────────────────────────────────── */}
      <div className={`kpi-grid${freshLogin ? ' dash-stagger-2' : ''}`} style={{ marginBottom: 24 }} data-tour="dashboard-main">
        <div className="kc">
          <div className="kl">Mes tâches actives</div>
          <div className="kv" style={myOverdueTasks.length > 0 ? { color: "#e63946" } : {}}>{myPendingTasks.length}</div>
          <div className="kd" style={myOverdueTasks.length > 0 ? { color: "#e63946", fontWeight: 600 } : {}}>
            {myOverdueTasks.length > 0 ? `${myOverdueTasks.length} en retard` : "à compléter"}
          </div>
        </div>
        <div className="kc">
          <div className="kl">Prochaines séances</div>
          <div className="kv">{upcomingSeances.length}</div>
          <div className="kd">me concernant</div>
        </div>
        <div className="kc">
          <div className="kl">Membres actifs</div>
          <div className="kv">{membresActifs}</div>
          <div className="kd">dans l'équipe</div>
        </div>
        <div className="kc">
          <div className="kl">Conversations</div>
          <div className="kv">{conversations.filter(c => !c.isTrashed).length}</div>
          <div className="kd">en cours</div>
        </div>
        {mesNdfPending.length > 0 && (
          <div className="kc" style={{ cursor: "pointer" }} onClick={() => navigate("notefrais")}>
            <div className="kl">Notes de frais</div>
            <div className="kv" style={{ color: "#d97706" }}>{mesNdfPending.length}</div>
            <div className="kd">en attente de validation</div>
          </div>
        )}
        {(isAdmin || isBureau) && pendingDF.length > 0 && (
          <div className="kc" style={{ cursor: 'pointer', borderColor: '#d97706' }} onClick={() => navigate('devisFactures')}>
            <div className="kl">Devis & Factures</div>
            <div className="kv" style={{ color: '#d97706' }}>{pendingDF.length}</div>
            <div className="kd" style={{ color: '#d97706' }}>en attente de signature</div>
          </div>
        )}
        {(isAdmin || isBureau) && pendingHorsBudget.length > 0 && (
          <div className="kc" style={{ cursor: 'pointer', borderColor: '#e63946' }} onClick={() => navigate('bureau')}>
            <div className="kl">Hors budget</div>
            <div className="kv" style={{ color: '#e63946' }}>{pendingHorsBudget.length}</div>
            <div className="kd" style={{ color: '#e63946' }}>dépense(s) à approuver</div>
          </div>
        )}
        {seancesAValider.length > 0 && (
          <div className="kc" style={{ cursor: 'pointer', borderColor: '#d97706' }} onClick={() => navigate('coordination')}>
            <div className="kl">Présences à valider</div>
            <div className="kv" style={{ color: '#d97706' }}>{seancesAValider.length}</div>
            <div className="kd" style={{ color: '#d97706' }}>séance{seancesAValider.length > 1 ? 's' : ''} en attente</div>
          </div>
        )}
      </div>

      {/* ── ALERTE PRÉSENCES À VALIDER ────────────────────────────────────── */}
      {seancesAValider.length > 0 && (
        <div className="sc" data-tilt style={{ marginBottom: 20, borderLeft: "4px solid #d97706" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Clock size={15} strokeWidth={2} color="#d97706" />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>
              Présences à valider — vous êtes responsable de {seancesAValider.length} séance{seancesAValider.length > 1 ? 's' : ''} passée{seancesAValider.length > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {seancesAValider.map(({ event, seance, seanceDate, count }, i) => (
              <div key={i}
                onClick={() => { navigate('coordination'); setActiveEventId(event.id); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.18)", borderRadius: 8, cursor: "pointer", gap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {seance.titre || event.titre}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {event.titre} · {seanceDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.12)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {count} présence{count > 1 ? 's' : ''} à confirmer
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            Rendez-vous dans <span style={{ color: "#1a56db", cursor: "pointer", fontWeight: 600 }} onClick={() => navigate('coordination')}>Coordination</span> pour valider les présences.
          </div>
        </div>
      )}

      {recentFaqs.length > 0 && (
        <div className="sc" style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate('faq')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={15} color="#1a56db" /> Besoin d'aide ?
            </div>
            <span style={{ fontSize: 11, color: '#1a56db' }}>Voir la FAQ →</span>
          </div>
          {recentFaqs.map(f => (
            <div key={f.id} style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
              {f.question}
            </div>
          ))}
        </div>
      )}

      <div className="dash-two-col">

        {/* ── MES TÂCHES ──────────────────────────────────────────────────── */}
        <div className="sc" data-tour="dashboard-tasks">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={15} strokeWidth={2} style={{ color: "#1a56db" }} /> Mes tâches
            </div>
            {myOverdueTasks.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#e63946", background: "#fee2e2", borderRadius: 10, padding: "2px 8px" }}>
                {myOverdueTasks.length} en retard
              </span>
            )}
          </div>
          {myPendingTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>Aucune tâche en attente ✓</div>
          ) : (
            Object.entries(groupedTasks).map(([space, spaceTasks]) => {
              const spaceColor = POLE_COLORS[space] || PROJET_COLORS[space] || "#1a56db";
              return (
                <div key={space} style={{ marginBottom: 12 }}>
                  {/* En-tête espace */}
                  <div style={{ fontSize: 9, fontWeight: 800, color: spaceColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: spaceColor, flexShrink: 0 }} />
                    {space}
                  </div>
                  {sortTasksSmart(spaceTasks).map(t => {
                    const overdue    = t.deadline && isPastDate(t.deadline);
                    const isMyTask   = (t.assignees || []).some(a => a.name === currentUser.nom && !a.completed);
                    const doneCount  = (t.assignees || []).filter(a => a.completed).length;
                    const totalCount = (t.assignees || []).length;
                    const allDone    = totalCount > 0 && doneCount === totalCount;
                    const borderColor = overdue ? "#e63946" : isMyTask ? "#1a56db" : "#94a3b8";

                    // Deadline display
                    const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
                    let deadlineDate = null;
                    let daysUntil = null;
                    if (t.deadline) {
                      const [y, m, d] = t.deadline.split("-");
                      deadlineDate = new Date(+y, +m - 1, +d);
                      daysUntil = Math.round((deadlineDate - today) / 86400000);
                    }

                    return (
                      <div
                        key={t.id}
                        className="dash-row"
                        onClick={() => navigateToTask(t)}
                        style={{
                          display: "flex", gap: 10, padding: "9px 12px", marginBottom: 5,
                          background: overdue ? "rgba(230,57,70,0.04)" : "var(--bg-alt)",
                          borderRadius: 10, cursor: "pointer",
                          borderLeft: `3px solid ${borderColor}`,
                          opacity: isMyTask ? 1 : 0.8,
                        }}
                      >
                        {/* Colonne deadline / icône */}
                        {deadlineDate ? (
                          <div style={{ minWidth: 34, textAlign: "center", flexShrink: 0 }}>
                            <div style={{ fontSize: 17, fontWeight: 800, color: overdue ? "#e63946" : "#1a56db", lineHeight: 1 }}>{deadlineDate.getDate()}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>{MOIS[deadlineDate.getMonth()]}</div>
                            {overdue && <div style={{ fontSize: 8, fontWeight: 700, color: "#e63946", marginTop: 1 }}>Retard</div>}
                            {!overdue && daysUntil === 0 && <div style={{ fontSize: 8, fontWeight: 700, color: "#e63946", marginTop: 1 }}>Auj.</div>}
                            {!overdue && daysUntil === 1 && <div style={{ fontSize: 8, fontWeight: 700, color: "#d97706", marginTop: 1 }}>Dem.</div>}
                          </div>
                        ) : (
                          <div style={{ minWidth: 34, textAlign: "center", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Clock size={16} strokeWidth={1.5} color="var(--text-muted)" />
                          </div>
                        )}

                        {/* Contenu principal */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                            {t.text}
                          </div>
                          {t.description && (
                            <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                              {t.description}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                            {/* Complété par le responsable */}
                            {t.forceCompletedBy && (
                              <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(22,163,74,0.1)", color: "#16a34a", borderRadius: 4, padding: "1px 5px", display: "flex", alignItems: "center", gap: 2 }}>
                                ✓ Validé par {String(t.forceCompletedBy).split(" ")[0]}
                              </span>
                            )}
                            {/* Statut */}
                            {!t.forceCompletedBy && t.status === "En cours" && (
                              <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(26,86,219,0.1)", color: "#1a56db", borderRadius: 4, padding: "1px 5px" }}>En cours</span>
                            )}
                            {/* Cycle */}
                            {t.cycle && (
                              <span style={{ fontSize: 8, color: "var(--text-muted)", padding: "1px 0" }}>{t.cycle}</span>
                            )}
                            {/* Progression */}
                            {!t.forceCompletedBy && totalCount > 1 && (
                              <span style={{ fontSize: 8, color: allDone ? "#16a34a" : "var(--text-muted)", fontWeight: allDone ? 700 : 400 }}>
                                {doneCount}/{totalCount} validé{doneCount > 1 ? "s" : ""}
                              </span>
                            )}
                            {/* Badge "pour moi" vs "je supervise" */}
                            {!isMyTask && !t.forceCompletedBy && (
                              <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(148,163,184,0.15)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 5px" }}>Supervisé</span>
                            )}
                          </div>
                        </div>

                        {/* Avatars assignés */}
                        {totalCount > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, flexShrink: 0 }}>
                            <div style={{ display: "flex" }}>
                              {(t.assignees || []).slice(0, 4).map((a, idx) => {
                                const member = findMemberByName(directory, a.name);
                                const avatarColors = ["#1a56db","#7c3aed","#d97706","#e63946"];
                                const bg = a.completed ? "#16a34a" : (POLE_COLORS[member?.pole] || avatarColors[idx % avatarColors.length]);
                                return (
                                  <div
                                    key={a.name}
                                    title={`${a.name}${a.completed ? " ✓" : ""}`}
                                    onClick={() => openMemberProfile(member)}
                                    style={{
                                      width: 20, height: 20, borderRadius: "50%",
                                      background: a.completed ? "#16a34a" : isAvatarUrl(member?.avatar) ? "transparent" : bg,
                                      border: `2px solid ${a.completed ? "#dcfce7" : "var(--bg-alt)"}`,
                                      marginLeft: idx === 0 ? 0 : -6,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 7, fontWeight: 700, color: "#fff",
                                      overflow: "hidden", flexShrink: 0, cursor: member ? "pointer" : "default",
                                    }}
                                  >
                                    {a.completed ? "✓" : <AvatarInner avatar={member?.avatar} nom={a.name} />}
                                  </div>
                                );
                              })}
                              {totalCount > 4 && (
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg-hover)", border: "2px solid var(--bg-alt)", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "var(--text-muted)" }}>
                                  +{totalCount - 4}
                                </div>
                              )}
                            </div>
                            {totalCount > 1 && (
                              <span style={{ fontSize: 7, color: "var(--text-muted)" }}>{totalCount} pers.</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ── PROCHAINES SÉANCES ────────────────────────────────────────────── */}
        <div className="sc">
          <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Calendar size={15} strokeWidth={2} style={{ color: "#0891b2" }} /> Prochaines séances
          </div>
          {upcomingSeances.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>Aucune séance prévue</div>
          ) : (
            upcomingSeances.slice(0, 5).map(({ event, seance, seanceDate, isInscrit }, i) => {
              const isTeam = (event.equipe || []).includes(currentUser.nom);
              const nbInscrits = (seance.inscrits || []).length;
              const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
              const daysUntil = Math.round((seanceDate - today) / 86400000);
              const isAnnulee = !!seance.annulee;
              const borderColor = isAnnulee ? "#e63946" : isTeam ? "#0891b2" : "#94a3b8";
              return (
                <div
                  key={i}
                  className="dash-row"
                  style={{
                    display: "flex", gap: 10, padding: "10px 12px", marginBottom: 4,
                    background: isAnnulee ? "rgba(230,57,70,0.04)" : "var(--bg-alt)",
                    borderRadius: 10, cursor: "pointer",
                    borderLeft: `3px solid ${borderColor}`,
                    opacity: isAnnulee ? 0.85 : 1,
                  }}
                  onClick={() => { navigate("coordination"); setActiveEventId(event.id); }}
                >
                  {/* Date */}
                  <div style={{ minWidth: 36, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isAnnulee ? "#e63946" : "#0891b2", lineHeight: 1, textDecoration: isAnnulee ? "line-through" : "none" }}>{seanceDate.getDate()}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>{MOIS[seanceDate.getMonth()]}</div>
                    {isAnnulee && <div style={{ fontSize: 8, fontWeight: 700, color: "#e63946", marginTop: 2 }}>Annulée</div>}
                    {!isAnnulee && daysUntil === 0 && <div style={{ fontSize: 8, fontWeight: 700, color: "#e63946", marginTop: 2 }}>Auj.</div>}
                    {!isAnnulee && daysUntil === 1 && <div style={{ fontSize: 8, fontWeight: 700, color: "#d97706", marginTop: 2 }}>Dem.</div>}
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, minWidth: 0 }}>
                      {isAnnulee && (
                        <span style={{ fontSize: 8, fontWeight: 800, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>✕ ANNULÉE</span>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 700, color: isAnnulee ? "#dc2626" : "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isAnnulee ? "line-through" : "none" }}>
                        {seance.libelle || event.titre}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: seance.aVenir && !isAnnulee ? 4 : 0, textDecoration: isAnnulee ? "line-through" : "none" }}>
                      {seance.libelle ? event.titre : ""}
                      {seance.heure && <span> · {seance.heure}</span>}
                      {seance.duree && <span> · {seance.duree}h</span>}
                      {event.lieu && <span> · 📍 {event.lieu}</span>}
                    </div>
                    {seance.commentaireAnnulation && isAnnulee && (
                      <div style={{ fontSize: 10, color: "#991b1b", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                        {seance.commentaireAnnulation}
                      </div>
                    )}
                    {seance.aVenir && !isAnnulee && (
                      <div style={{ fontSize: 10, color: "#0891b2", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {seance.aVenir}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {isTeam && !isAnnulee && <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(8,145,178,0.1)", color: "#0891b2", borderRadius: 4, padding: "1px 5px" }}>Équipe</span>}
                      {isInscrit && !isTeam && !isAnnulee && <span style={{ fontSize: 8, fontWeight: 700, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "1px 5px" }}>Inscrit</span>}
                    </div>
                  </div>

                  {/* Avatars inscrits — colonne droite, toujours visible */}
                  {nbInscrits > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, flexShrink: 0 }}>
                      <div style={{ display: "flex" }}>
                        {(seance.inscrits || []).slice(0, 4).map((nom, idx) => {
                          const member = findMemberByName(directory, nom);
                          const initials = (member?.avatar) || nom.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                          const avatarColors = ["#0891b2","#7c3aed","#d97706","#16a34a","#e63946"];
                          const bg = isAnnulee ? "#dc2626" : avatarColors[idx % avatarColors.length];
                          return (
                            <div
                              key={nom}
                              title={nom}
                              style={{
                                width: 20, height: 20, borderRadius: "50%",
                                background: bg,
                                border: `2px solid ${isAnnulee ? "rgba(230,57,70,0.15)" : "var(--bg-alt)"}`,
                                marginLeft: idx === 0 ? 0 : -6,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 7, fontWeight: 700, color: "#fff",
                                overflow: "hidden", flexShrink: 0,
                                opacity: isAnnulee ? 0.65 : 1,
                              }}
                            >
                              {initials}
                            </div>
                          );
                        })}
                        {nbInscrits > 4 && (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: "var(--bg-hover)", border: "2px solid var(--bg-alt)",
                            marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 7, fontWeight: 700, color: "var(--text-muted)",
                          }}>
                            +{nbInscrits - 4}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 8, color: isAnnulee ? "#dc2626" : "var(--text-muted)" }}>
                        {nbInscrits} inscrit{nbInscrits > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── MISSIONS OUVERTES ─────────────────────────────────────────────── */}
        <div className="sc">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Target size={15} strokeWidth={2} style={{ color: "#d97706" }} /> Missions ouvertes
            </div>
            {urgentMissions.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#e63946", background: "#fee2e2", borderRadius: 10, padding: "2px 8px" }}>
                {urgentMissions.length} urgent{urgentMissions.length > 1 ? 'es' : 'e'}
              </span>
            )}
          </div>
          {openMissions.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>Aucune mission ouverte</div>
          ) : (
            openMissions.slice(0, 4).map(m => {
              const isCandidatAlready = (m.candidatures || []).some(c => c.nom === currentUser.nom);
              return (
                <div
                  key={m.id}
                  className="dash-row"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4,
                    background: "var(--bg-alt)", borderRadius: 8,
                    borderLeft: `3px solid ${URGENCE_COLOR[m.urgence] || "#d97706"}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)" }}>{m.titre}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {m.pole} · {m.competences?.slice(0, 2).join(", ")}
                    </div>
                  </div>
                  {!isCandidatAlready && (
                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 10, padding: "4px 8px" }}
                        onClick={() => { setShowMissionApply(m); setApplyMsg(""); }}
                      >Postuler</button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 10, padding: "4px 8px", color: "var(--text-muted)" }}
                        onClick={() => setIgnoredMissions(prev => [...prev, m.id])}
                        title="Ne plus afficher cette mission"
                      >Ignorer</button>
                    </div>
                  )}
                  {isCandidatAlready && (
                    <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓ Candidaté</span>
                  )}
                </div>
              );
            })
          )}
          {openMissions.length > 4 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
              +{openMissions.length - 4} autres missions
            </div>
          )}
        </div>

        {/* ── ACCÈS RAPIDES ──────────────────────────────────────────────────── */}
        <div className="sc">
          <div style={{ fontWeight: 700, color: "var(--text-base)", fontSize: 14, marginBottom: 12 }}>Accès rapides</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className="btn-secondary" style={{ fontSize: 11, padding: "7px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => navigate("planning")}>
              <Calendar size={12} strokeWidth={2} /> Planning
            </button>
            <button className="btn-secondary" style={{ fontSize: 11, padding: "7px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => navigate("messagerie")}>
              <MessageCircle size={12} strokeWidth={2} /> Messagerie
            </button>
            <button className="btn-secondary" style={{ fontSize: 11, padding: "7px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => navigate("coordination")}>
              <Zap size={12} strokeWidth={2} /> Coordination
            </button>
            {isAdmin && (
              <button className="btn-primary" style={{ fontSize: 11, padding: "7px 12px" }} onClick={() => navigate("actions")}>
                <Plus size={12} strokeWidth={2.5} /> Action terrain
              </button>
            )}
            {onNewNoteFrais && (
              <button className="btn-secondary" style={{ fontSize: 11, padding: "7px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={onNewNoteFrais}>
                <Receipt size={12} strokeWidth={2} /> Note de frais
              </button>
            )}
          </div>

          {/* Mon statut */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const myDir = directory.find(m => m.id === currentUser.id);
            const conges = Array.isArray(myDir?.conges) ? myDir.conges : [];
            const activeConge = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
            const upcomingConge = conges.filter(c => c.debut > today).sort((a, b) => a.debut.localeCompare(b.debut))[0];
            const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const openNewCongeForm = () => {
              setEditCongeId(null);
              setCongeForm({ debut: "", fin: "", motif: "" });
              setShowCongeForm(true);
            };
            const openEditCongeForm = (c) => {
              setEditCongeId(c.id);
              setCongeForm({ debut: c.debut, fin: c.fin || "", motif: c.motif || "" });
              setShowCongeForm(true);
            };
            const submitConge = () => {
              if (!congeForm.debut) return;
              if (congeForm.fin && congeForm.fin < congeForm.debut) return;
              if (editCongeId) {
                onEditConge && onEditConge({ id: editCongeId, debut: congeForm.debut, fin: congeForm.fin || null, motif: congeForm.motif });
              } else {
                onDeclareConge && onDeclareConge({ debut: congeForm.debut, fin: congeForm.fin || null, motif: congeForm.motif });
              }
              setCongeForm({ debut: "", fin: "", motif: "" });
              setEditCongeId(null);
              setShowCongeForm(false);
            };
            return (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Mon statut</div>

                {/* Bandeau congé actif */}
                {activeConge && (
                  <div style={{ marginBottom: 10, padding: "9px 12px", borderRadius: 9, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge map={MEMBER_STATUS} value="En congé" size={11} />
                    <span style={{ flex: 1, fontSize: 11, color: "var(--text-muted)" }}>
                      {activeConge.fin ? `Retour prévu le ${fmt(activeConge.fin)}` : "Durée indéterminée"}
                      {activeConge.motif ? ` · ${activeConge.motif}` : ""}
                    </span>
                    <button
                      onClick={() => requestConfirm
                        ? requestConfirm("Terminer ce congé maintenant ? Le statut repassera à Actif.", () => onEndCongeNow && onEndCongeNow(activeConge.id))
                        : onEndCongeNow && onEndCongeNow(activeConge.id)
                      }
                      style={{ fontSize: 10, padding: "4px 9px", borderRadius: 6, border: "1px solid rgba(249,115,22,0.4)", background: "none", color: "#f97316", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      Terminer maintenant
                    </button>
                  </div>
                )}

                {/* Bandeau congé à venir */}
                {!activeConge && upcomingConge && (
                  <div style={{ marginBottom: 10, padding: "7px 12px", borderRadius: 9, background: "rgba(26,86,219,0.05)", border: "1px solid rgba(26,86,219,0.15)", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={11} color="#1a56db" />
                    Congé prévu le {fmt(upcomingConge.debut)}{upcomingConge.fin ? ` → ${fmt(upcomingConge.fin)}` : ""}
                  </div>
                )}

                {/* Boutons statut (sans "En congé", géré auto) */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {Object.keys(MEMBER_STATUS).filter(s => s !== "En congé").map(s => (
                    <button
                      key={s}
                      onClick={() => changeMyStatus && changeMyStatus(s)}
                      style={{
                        fontSize: 11, padding: "5px 12px", borderRadius: 20,
                        border: `1px solid ${currentUser.statut === s ? MEMBER_STATUS[s].color : "var(--border-light)"}`,
                        background: currentUser.statut === s ? `${MEMBER_STATUS[s].color}15` : "var(--bg-surface)",
                        color: currentUser.statut === s ? MEMBER_STATUS[s].color : "var(--text-muted)",
                        fontWeight: currentUser.statut === s ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      <StatusBadge map={MEMBER_STATUS} value={s} size={10} />
                    </button>
                  ))}
                  <button
                    onClick={openNewCongeForm}
                    style={{
                      fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                      border: `1px solid ${showCongeForm && !editCongeId ? "#f97316" : "var(--border-light)"}`,
                      background: showCongeForm && !editCongeId ? "rgba(249,115,22,0.1)" : "var(--bg-surface)",
                      color: showCongeForm && !editCongeId ? "#f97316" : "var(--text-muted)",
                      fontWeight: showCongeForm && !editCongeId ? 700 : 400,
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <StatusBadge map={MEMBER_STATUS} value="En congé" size={10} /> Déclarer
                  </button>
                </div>

                {/* Liste des congés déclarés (actif + à venir) avec édition/suppression */}
                {conges.filter(c => !c.fin || c.fin >= today).length > 0 && (
                  <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {conges.filter(c => !c.fin || c.fin >= today).sort((a, b) => a.debut.localeCompare(b.debut)).map(c => {
                      const isActive = c.debut <= today && (!c.fin || c.fin >= today);
                      return (
                        <div key={c.id} className="dash-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: isActive ? "rgba(249,115,22,0.06)" : "var(--bg-alt)", border: `1px solid ${isActive ? "rgba(249,115,22,0.2)" : "var(--border-light)"}`, fontSize: 11 }}>
                          <span style={{ flex: 1, color: "var(--text-muted)" }}>
                            {isActive ? "En cours · " : "Prévu · "}
                            {fmt(c.debut)}{c.fin ? ` → ${fmt(c.fin)}` : " · durée indéterminée"}
                            {c.motif ? ` · ${c.motif}` : ""}
                          </span>
                          <button onClick={() => openEditCongeForm(c)} title="Modifier" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "inline-flex", padding: 3 }}>
                            <Pencil size={11} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => requestConfirm
                              ? requestConfirm("Supprimer ce congé ?", () => onDeleteConge && onDeleteConge(c.id))
                              : onDeleteConge && onDeleteConge(c.id)
                            }
                            title="Supprimer"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#e63946", display: "inline-flex", padding: 3 }}
                          >
                            <Trash2 size={11} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mini-formulaire congé (nouveau ou édition) */}
                {showCongeForm && (
                  <div style={{ padding: "12px", borderRadius: 10, background: "var(--bg-hover)", border: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-base)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={11} /> {editCongeId ? "Modifier le congé" : "Déclarer un congé"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>Début *</div>
                        <input
                          type="date"
                          value={congeForm.debut}
                          onChange={e => setCongeForm(f => ({ ...f, debut: e.target.value }))}
                          style={{ width: "100%", padding: "5px 8px", borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>Fin <span style={{ fontWeight: 400, opacity: 0.7 }}>(optionnel)</span></div>
                        <input
                          type="date"
                          min={congeForm.debut || undefined}
                          value={congeForm.fin}
                          onChange={e => setCongeForm(f => ({ ...f, fin: e.target.value }))}
                          style={{ width: "100%", padding: "5px 8px", borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <input
                      placeholder="Motif (optionnel)"
                      value={congeForm.motif}
                      onChange={e => setCongeForm(f => ({ ...f, motif: e.target.value }))}
                      style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 12, color: "var(--text-base)" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button onClick={() => { setShowCongeForm(false); setEditCongeId(null); setCongeForm({ debut: "", fin: "", motif: "" }); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border-light)", background: "none", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>Annuler</button>
                      <button
                        onClick={submitConge}
                        disabled={!congeForm.debut}
                        style={{ padding: "5px 12px", borderRadius: 7, background: congeForm.debut ? "#f97316" : "#ccc", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: congeForm.debut ? "pointer" : "default" }}
                      >
                        {editCongeId ? "Enregistrer" : "Confirmer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>

      {/* ── MODALE CANDIDATURE MISSION ──────────────────────────────────────── */}
      {showMissionApply && (
        <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setShowMissionApply(null)}>
          <div className="modal-box" style={{ width: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Postuler — {showMissionApply.titre}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{showMissionApply.description}</div>
            <textarea
              value={applyMsg}
              onChange={e => setApplyMsg(e.target.value)}
              placeholder="Message de candidature (optionnel)..."
              style={{ width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid var(--border-light)", padding: 10, fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowMissionApply(null)}>Annuler</button>
              <button className="btn-primary" onClick={() => {
                onApplyMission && onApplyMission(showMissionApply.id, applyMsg);
                setShowMissionApply(null);
                addToast("Candidature envoyée !");
              }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
