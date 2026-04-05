// src/pages/ActionTracker.jsx
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import Badge from '../components/ui/Badge';
import { TYPES_ACTION, STATUTS_ACTION, STATUT_STYLE, POLE_COLORS } from '../data/constants';
import { AvatarInner, isAvatarUrl, findMemberByName } from '../components/ui/AvatarDisplay';
import { formatDateShort, computeCompletionScore, isTaskEffectivelyDone } from '../utils/utils';
import { Archive, Calendar, ClipboardList, CheckCircle2, AlertTriangle, Zap, Pencil, Trash2, RotateCcw, Lock, Plus, Star, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const ActionTracker = () => {
  const { currentUser } = useAuth();
  const {
    handleNav, setActiveEventId, setHighlightedEventId,
    setActionModal, setSelectedActionChecklist, highlightedActionId, setShowWizard,
  } = useAppContext();
  const navigate = handleNav;
  const {
    actions, evenements, cycles, directory, isAdmin, isResponsable,
    toggleArchiveAction, deleteAction, handleUpdateActionStatus: onUpdateActionStatus,
    tasks, trash, restoreTrash, forceDeleteTrash,
    handleSaveBilan,
  } = useDataContext();

  // ─── Bilan post-action ────────────────────────────────────────────────────
  const BILAN_EMPTY = { satisfaction: 0, beneficiaires: 0, pointsPositifs: '', difficultes: '', recommandations: '' };
  const [bilanPending, setBilanPending] = useState(null); // { actionId, ...fields }
  const [bilanSaving, setBilanSaving] = useState(false);

  const handleStatutChange = (action, newStatut) => {
    if (newStatut === 'Terminée' && action.statut !== 'Terminée') {
      setBilanPending({ actionId: action.id, ...BILAN_EMPTY, beneficiaires: action.beneficiaires || 0 });
    } else {
      onUpdateActionStatus(action.id, newStatut);
    }
  };

  const submitBilan = async (skip = false) => {
    if (!bilanPending) return;
    setBilanSaving(true);
    try {
      if (!skip) {
        const bilan = {
          satisfaction: bilanPending.satisfaction,
          beneficiaires: bilanPending.beneficiaires,
          pointsPositifs: bilanPending.pointsPositifs,
          difficultes: bilanPending.difficultes,
          recommandations: bilanPending.recommandations,
          completedAt: new Date().toISOString(),
        };
        await handleSaveBilan(bilanPending.actionId, bilan);
      }
      onUpdateActionStatus(bilanPending.actionId, 'Terminée');
      setBilanPending(null);
    } finally {
      setBilanSaving(false);
    }
  };
  // État pour filtres et tri
  const [actionsTab, setActionsTab] = useState("actifs");
  const [actionsCycle, setActionsCycle] = useState(cycles[0] || "Toutes");
  const [actionsSort, setActionsSort] = useState("date_desc");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous");
  const [expandedTasksActionId, setExpandedTasksActionId] = useState(null);

  // Bascule automatiquement sur le bon tab/cycle quand on navigue vers une action spécifique
  useEffect(() => {
    if (!highlightedActionId) return;
    const action = actions.find(a => a.id === highlightedActionId);
    if (!action) return;
    if (action.isArchived) setActionsTab("archives");
    if (action.cycle && actionsCycle !== "Toutes" && action.cycle !== actionsCycle) setActionsCycle(action.cycle);
  }, [highlightedActionId]);

  // Utilise le helper partagé depuis utils.js
  const isTaskDone = isTaskEffectivelyDone;

  // Fonction pour calculer la progression des tâches pour une action
  const getTasksCompletion = (actionId) => {
    const actionTasks = tasks.filter(t => t.actionId === actionId);
    if (actionTasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = actionTasks.filter(isTaskDone).length;
    const total = actionTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  // Logique de filtrage
  let finalActions = actions.filter(
    (a) =>
      a.isArchived === (actionsTab === "archives") &&
      (filterStatut === "Tous" || a.statut === filterStatut) &&
      (filterType === "Tous" || a.type === filterType) &&
      (filterSearch === "" ||
        (a.etablissement || "").toLowerCase().includes(filterSearch.toLowerCase()) ||
        (a.ville || "").toLowerCase().includes(filterSearch.toLowerCase()))
  );
  
  if (actionsCycle !== "Toutes") {
    finalActions = finalActions.filter((a) => a.cycle === actionsCycle);
  }

  // Logique de tri
  finalActions.sort((a, b) => {
    if (actionsSort === "date_asc") return (a.date_debut || "").localeCompare(b.date_debut || "");
    if (actionsSort === "date_desc") return (b.date_debut || "").localeCompare(a.date_debut || "");
    if (actionsSort === "nom_asc") return (a.etablissement || "").localeCompare(b.etablissement || "");
    if (actionsSort === "nom_desc") return (b.etablissement || "").localeCompare(a.etablissement || "");
    return 0;
  });

  return (
    <>
      <div className="eyebrow">Terrain</div>
      <div className="ptitle">Suivi des actions</div>

      {/* Barre d'outils supérieure */}
      <div className="toolbar-wrap" style={{ marginBottom: 16 }} data-tour="actions-list">
        <div className="toolbar-group" style={{ borderRight: "1px solid var(--border-light)", paddingRight: "12px" }}>
          <button
            className={`chip ${actionsTab === "actifs" ? "on" : ""}`}
            style={{ border: "none" }}
            onClick={() => setActionsTab("actifs")}
          >
            En cours ({actions.filter((a) => !a.isArchived && a.cycle === actionsCycle).length})
          </button>
          <button
            className={`chip ${actionsTab === "archives" ? "on" : ""}`}
            style={{ border: "none" }}
            onClick={() => setActionsTab("archives")}
          >
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Archive size={12} strokeWidth={1.8}/> Archives ({actions.filter((a) => a.isArchived && a.cycle === actionsCycle).length})</span>
          </button>
          <button
            className={`chip ${actionsTab === "corbeille" ? "on" : ""}`}
            style={{ border: "none" }}
            onClick={() => setActionsTab("corbeille")}
          >
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
              <Trash2 size={12} strokeWidth={1.8}/>
              Corbeille ({isResponsable
                ? trash.filter(t => t.type === "action").length
                : trash.filter(t => t.type === "action" && t.deletedBy === currentUser?.nom).length})
            </span>
          </button>
        </div>

        <div className="toolbar-group cycles-group" style={{ paddingLeft: "12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Cycle&nbsp;:</span>
          {cycles.map((y) => (
            <div key={y} className={`year-tab ${actionsCycle === y ? "active" : ""}`} onClick={() => setActionsCycle(y)}>
              {y}
            </div>
          ))}
          <div className={`year-tab ${actionsCycle === "Toutes" ? "active" : ""}`} onClick={() => setActionsCycle("Toutes")}>
            Tous
          </div>
        </div>

        <div className="toolbar-group" style={{ marginLeft: "auto", borderLeft: "1px solid var(--border-light)", paddingLeft: "12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Trier par&nbsp;:</span>
          <select className="form-select" style={{ width: "auto", border: "none", background: "transparent", paddingLeft: 4 }}
            value={actionsSort} onChange={(e) => setActionsSort(e.target.value)}>
            <option value="date_desc">Date (Récents)</option>
            <option value="date_asc">Date (Anciens)</option>
            <option value="nom_asc">Nom (A-Z)</option>
            <option value="nom_desc">Nom (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Corbeille */}
      {actionsTab === "corbeille" && (() => {
        const allTrashActions = trash.filter(t => t.type === "action").sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
        // Responsables voient tout ; membres ne voient que leur propre corbeille
        const trashActions = isResponsable
          ? allTrashActions
          : allTrashActions.filter(t => t.deletedBy === currentUser?.nom);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!isResponsable && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={11} strokeWidth={1.8}/> Vous ne pouvez voir et restaurer que vos propres éléments supprimés.
              </div>
            )}
            {trashActions.length === 0 ? (
              <div className="empty">La corbeille est vide.</div>
            ) : trashActions.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderLeft: "3px solid #e63946", borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.data.etablissement} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {item.data.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    {item.data.ville && <span>{item.data.ville}</span>}
                    {item.data.date_debut && <span><Calendar size={10} strokeWidth={1.8} style={{ verticalAlign: "middle" }}/> {formatDateShort(item.data.date_debut)}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Trash2 size={9} strokeWidth={1.8}/> Supprimé par <strong>{item.deletedBy}</strong> le {new Date(item.deletedAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                {restoreTrash && (isResponsable || item.deletedBy === currentUser?.nom) && (
                  <button
                    onClick={() => restoreTrash(item.id)}
                    style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    <RotateCcw size={11} strokeWidth={1.8}/> Restaurer
                  </button>
                )}
                {forceDeleteTrash && isAdmin && (
                  <button
                    onClick={() => forceDeleteTrash(item.id)}
                    style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#e63946", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    <Trash2 size={11} strokeWidth={1.8}/> Supprimer définitivement
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Barre de Filtres */}
      {actionsTab !== "corbeille" && <div className="toolbar-wrap" style={{ background: "transparent", border: "none", padding: 0, marginBottom: 18 }}>
        <input
          className="form-input"
          style={{ flex: "1 1 auto", maxWidth: 250, minWidth: 0 }}
          placeholder="Rechercher établissement, ville…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
        <div className="toolbar-group">
          {["Tous", ...STATUTS_ACTION].map((s) => (
            <button key={s} className={`chip ${filterStatut === s ? "on" : ""}`} onClick={() => setFilterStatut(s)}>
              {s}
            </button>
          ))}
        </div>
        <select className="form-select" style={{ width: "auto", cursor: "pointer" }}
          value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="Tous">Tous les types</option>
          {TYPES_ACTION.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowWizard(true)}>
            <Plus size={13} strokeWidth={2.5} /> Nouvelle action
          </button>
        )}
      </div>}

      {/* Tableau principal */}
      {actionsTab !== "corbeille" && <div className="table-scroll-wrap">
        <table className="actions-table">
          <thead>
            <tr>
              <th>Type</th><th>Établissement</th><th>Ville</th><th>Contact</th>
              <th>Dates</th><th>Responsables</th><th>Coordination</th>
              <th>Statut</th><th>Barres des tâches</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {finalActions.length === 0 && (
              <tr><td colSpan={11}><div className="empty">Aucune action trouvée.</div></td></tr>
            )}
            {finalActions.map((a) => {
              const linkedEv = evenements.find((e) => e.actionId === a.id);
              const isHighlighted = highlightedActionId === a.id;

              return (
                <React.Fragment key={a.id}>
                <tr style={{
                  opacity: a.isArchived ? 0.6 : 1,
                  background: isHighlighted ? "rgba(26,86,219,0.06)" : "",
                  boxShadow: isHighlighted ? "inset 3px 0 0 0 #1a56db" : "none",
                  transition: "background 0.5s ease, box-shadow 0.5s ease",
                }}>
                  <td><span className="type-chip">{a.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{a.etablissement}</td>
                  <td>{a.ville}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{a.contact_nom}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.contact_email}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.contact_tel}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {a.date_debut && <div style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={11} strokeWidth={1.8} color="var(--text-muted)"/> {formatDateShort(a.date_debut)}</div>}
                    {a.date_fin && a.date_fin !== a.date_debut && <div style={{ color: "var(--text-muted)" }}>→ {formatDateShort(a.date_fin)}</div>}
                    {a.date_debut && a.date_fin && a.date_fin !== a.date_debut && (() => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const start = new Date(a.date_debut + "T00:00:00");
                      const end   = new Date(a.date_fin   + "T00:00:00");
                      const span  = end - start;
                      const pct   = span > 0 ? Math.min(100, Math.max(0, Math.round(((today - start) / span) * 100))) : 0;
                      const isDone    = pct >= 100;
                      const isStarted = pct > 0;
                      const barColor  = isDone ? "#16a34a" : pct >= 70 ? "#d97706" : "#1a56db";
                      return (
                        <div style={{ marginTop: 6, minWidth: 80 }}>
                          <div style={{ height: 4, background: "var(--bg-alt)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.4s ease" }} />
                          </div>
                          <div style={{ fontSize: 9, color: barColor, marginTop: 2, fontWeight: 700 }}>
                            {isDone ? "Terminée" : isStarted ? `${pct}% écoulé` : "Pas encore démarrée"}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ color: "#1a56db", fontSize: 10, fontWeight: 600, marginTop: 4 }}>Cycle: {a.cycle}</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {a.responsables.map((r, i) => {
                        const m = findMemberByName(directory, r);
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: isAvatarUrl(m?.avatar) ? "transparent" : (m ? POLE_COLORS[m.pole] : "var(--text-muted)"), color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                              <AvatarInner avatar={m?.avatar} nom={r} />
                            </div>
                            <span style={{ fontSize: 11 }}>{r}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    {linkedEv ? (
                      <button
                        onClick={() => { navigate("coordination"); setActiveEventId(linkedEv.id); setHighlightedEventId(linkedEv.id); setTimeout(() => setHighlightedEventId(null), 3000); }}
                        style={{ background: "rgba(26,86,219,0.08)", border: "1px solid rgba(26,86,219,0.25)", borderRadius: 5, padding: "3px 7px", cursor: "pointer", color: "#1a56db", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}
                      >
                        <Zap size={9} strokeWidth={1.8}/> Voir
                      </button>
                    ) : <span style={{ fontSize: 10, color: "var(--text-dim)" }}>—</span>}
                  </td>
                  <td>
                    {(isAdmin || (currentUser && (a.responsables || []).includes(currentUser.nom))) && !a.isArchived ? (
                      <select
                        className="form-select"
                        value={a.statut}
                        onChange={(e) => handleStatutChange(a, e.target.value)}
                        style={{ fontSize: 10, padding: "2px 6px", width: "auto", minWidth: 90, background: STATUT_STYLE[a.statut]?.bg || "var(--bg-alt)", color: STATUT_STYLE[a.statut]?.c || "var(--text-dim)", border: "none", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}
                      >
                        {STATUTS_ACTION.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Badge label={a.statut} bg={STATUT_STYLE[a.statut]?.bg} c={STATUT_STYLE[a.statut]?.c} />
                    )}
                    {a.checklist && (
                      <div style={{ marginTop: 6, cursor: "pointer" }} onClick={() => setSelectedActionChecklist(a)}>
                        <div style={{ height: 4, background: "var(--bg-alt)", borderRadius: 2, width: 70, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${computeCompletionScore(a)}%`, background: computeCompletionScore(a) >= 80 ? "#16a34a" : computeCompletionScore(a) >= 40 ? "#d97706" : "#e63946" }} />
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 700 }}>{computeCompletionScore(a)}% prêt</div>
                      </div>
                    )}
                  </td>
                  <td>
                    <ErrorBoundary inline label="barre des tâches">
                    {(() => {
                      // Uniquement les tâches avec au moins un assigné (acceptées et assignées)
                      const actionTasks = tasks.filter(t =>
                        t.actionId === a.id && (t.assignees || []).length > 0
                      );
                      if (actionTasks.length === 0) return <span style={{ fontSize: 10, color: "var(--text-dim)" }}>—</span>;

                      const completed = actionTasks.filter(isTaskDone).length;
                      const active = actionTasks.filter(t => !isTaskDone(t));
                      const total = actionTasks.length;
                      const pct = Math.round((completed / total) * 100);
                      const globalColor = pct >= 80 ? "#16a34a" : pct >= 40 ? "#d97706" : "#1a56db";
                      const isExpanded = expandedTasksActionId === a.id;

                      const POLES_PAGES = ["Relations Publiques","Ressources Humaines","Plaidoyer","Etudes","Développement Financier","Communication","Trésorerie"];

                      return (
                        <div style={{ minWidth: 160 }}>
                          {/* ── Barre cliquable ── */}
                          <div
                            onClick={() => setExpandedTasksActionId(isExpanded ? null : a.id)}
                            style={{ cursor: "pointer", userSelect: "none" }}
                            title="Cliquer pour voir les tâches"
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: globalColor, display: "flex", alignItems: "center", gap: 3 }}>
                                <CheckCircle2 size={9} strokeWidth={2}/> {completed}/{total} tâche{total > 1 ? "s" : ""}
                              </span>
                              <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                                {pct}% <span style={{ fontSize: 8 }}>{isExpanded ? "▲" : "▼"}</span>
                              </span>
                            </div>
                            <div style={{ height: 5, background: "var(--bg-alt)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: globalColor, borderRadius: 3, transition: "width 0.3s ease" }} />
                            </div>
                          </div>

                          {/* ── Liste déroulante ── */}
                          {isExpanded && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, paddingTop: 6, borderTop: "1px solid var(--border-light)" }}>
                              {actionTasks.map((t, i) => {
                                const isDone = isTaskDone(t);
                                const isOverdue = t.deadline && new Date(t.deadline) < new Date() && !isDone;
                                const assigneesList = t.assignees || [];
                                const assigneePct = assigneesList.length > 0
                                  ? Math.round((assigneesList.filter(x => x.completed).length / assigneesList.length) * 100)
                                  : isDone ? 100 : 0;
                                const barColor = isDone ? "#16a34a" : isOverdue ? "#e63946" : "#1a56db";
                                const spaceType = POLES_PAGES.includes(t.space) ? "pole" : "projet";

                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => { if (t.space) { navigate(spaceType, t.space); } }}
                                    style={{ cursor: t.space ? "pointer" : "default", padding: "5px 7px", borderRadius: 6, background: "var(--bg-hover)", border: `1px solid ${isOverdue ? "rgba(230,57,70,0.25)" : "var(--border-light)"}`, borderLeft: `3px solid ${barColor}` }}
                                    title={`${t.text || ""}${t.space ? ` → ${t.space}` : ""}`}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                                      <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, minWidth: 12, flexShrink: 0 }}>{i + 1}.</span>
                                      <span style={{ fontSize: 10, color: isDone ? "#16a34a" : isOverdue ? "#e63946" : "var(--text-base)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110, textDecoration: isDone ? "line-through" : "none" }}>
                                        {t.text || "—"}
                                      </span>
                                      {isOverdue && <AlertTriangle size={8} strokeWidth={2} style={{ color: "#e63946", flexShrink: 0 }} />}
                                    </div>
                                    <div style={{ height: 3, background: "var(--bg-alt)", borderRadius: 2, overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${isDone ? 100 : assigneePct}%`, background: barColor, borderRadius: 2 }} />
                                    </div>
                                    {assigneesList.length > 0 && (
                                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                                        {assigneesList.map(x => (x.name || "").split(" ")[0]).filter(Boolean).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    </ErrorBoundary>
                  </td>
                  <td>
                    {a.notes ? <span title={a.notes} style={{ cursor: "help", borderBottom: "1px dotted var(--text-muted)", color: "var(--text-dim)", fontSize: 11 }}>{a.notes.length > 25 ? a.notes.substring(0, 25) + "..." : a.notes}</span> : <span style={{ color: "var(--text-dim)" }}>-</span>}
                    {a.bilan && (() => {
                      const b = typeof a.bilan === 'string' ? (() => { try { return JSON.parse(a.bilan); } catch { return { notes: a.bilan }; } })() : a.bilan;
                      const stars = b.satisfaction > 0 ? '★'.repeat(b.satisfaction) + '☆'.repeat(5 - b.satisfaction) : null;
                      const tooltip = [
                        stars ? `Satisfaction : ${stars}` : null,
                        b.beneficiaires ? `Bénéficiaires : ${b.beneficiaires}` : null,
                        b.pointsPositifs ? `✓ ${b.pointsPositifs}` : null,
                        b.difficultes ? `⚠ ${b.difficultes}` : null,
                        b.recommandations ? `→ ${b.recommandations}` : null,
                        b.notes || null,
                      ].filter(Boolean).join('\n');
                      return (
                        <div style={{ marginTop: 6, fontSize: 10, color: "#16a34a", display: "flex", alignItems: "flex-start", gap: 4 }} title={tooltip}>
                          <FileText size={10} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}/>
                          <span style={{ cursor: "help" }}>
                            Bilan{stars ? ` ${b.satisfaction}/5` : ''}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {/* PROGRESSION DES TÂCHES */}
                    {(() => {
                      const { completed, total, percentage } = getTasksCompletion(a.id);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 120 }}>
                          {/* Checklist */}
                          {a.checklist && (
                            <div style={{ cursor: "pointer" }} onClick={() => setSelectedActionChecklist(a)}>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, fontWeight: 700, display:"flex", alignItems:"center", gap:3 }}><ClipboardList size={9} strokeWidth={1.8}/> Checklist</div>
                              <div style={{ height: 4, background: "var(--bg-alt)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${computeCompletionScore(a)}%`, background: computeCompletionScore(a) >= 80 ? "#16a34a" : computeCompletionScore(a) >= 40 ? "#d97706" : "#e63946", transition: "width 0.3s ease" }} />
                              </div>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 700 }}>{computeCompletionScore(a)}% fait</div>
                            </div>
                          )}

                          {/* Boutons d'action */}
                          {(isAdmin || (currentUser && (a.responsables || []).includes(currentUser.nom))) && (
                            <div style={{ display: "flex", gap: 5, marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
                              {!a.isArchived && (
                                <button
                                  title="Modifier"
                                  onClick={() => setActionModal({ ...a })}
                                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderRadius: 5, padding: "3px 7px", cursor: "pointer", color: "var(--text-dim)", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600 }}
                                >
                                  <Pencil size={10} strokeWidth={1.8} /> Modifier
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  title={a.isArchived ? "Désarchiver" : "Archiver"}
                                  onClick={() => toggleArchiveAction(a)}
                                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border-light)", borderRadius: 5, padding: "3px 7px", cursor: "pointer", color: "var(--text-dim)", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600 }}
                                >
                                  <Archive size={10} strokeWidth={1.8} /> {a.isArchived ? "Restaurer" : "Archiver"}
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  title="Supprimer définitivement"
                                  onClick={() => deleteAction(a)}
                                  style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 5, padding: "3px 7px", cursor: "pointer", color: "#e63946", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600 }}
                                >
                                  <Trash2 size={10} strokeWidth={1.8} /> Suppr.
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
                {/* Ligne expandable : tâches liées */}
                {expandedTasksActionId === a.id && (() => {
                  const linkedTasks = tasks.filter(t =>
                    t.status !== "Terminé" &&
                    (t.assignees || []).some(as => (a.responsables || []).includes(as.name))
                  );
                  return (
                    <tr key={`tasks-${a.id}`}>
                      <td colSpan={11} style={{ padding: "0 16px 12px 16px", background: "rgba(26,86,219,0.03)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 8 }}>
                          {linkedTasks.map(t => {
                            const isOverdue = t.deadline && new Date(t.deadline) < new Date();
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  if (!t.space) return;
                                  const pageType = ["Relations Publiques","Ressources Humaines","Plaidoyer","Etudes","Développement Financier","Communication","Trésorerie"].includes(t.space) ? "pole" : "projet";
                                  navigate(pageType, t.space);
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, background: "var(--bg-surface)", border: `1px solid ${isOverdue ? "rgba(230,57,70,0.3)" : "var(--border-light)"}`, borderLeft: isOverdue ? "3px solid #e63946" : "3px solid #1a56db", cursor: t.space ? "pointer" : "default", fontSize: 11, maxWidth: 260 }}
                              >
                                <span style={{ fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text || "—"}</span>
                                {isOverdue && <span style={{ display:"inline-flex", color: "#e63946", flexShrink: 0 }}><AlertTriangle size={9} strokeWidth={2}/></span>}
                                <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>{(t.assignees || []).map(a => (a.name || "").split(" ")[0]).filter(Boolean).join(", ")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>}

      {/* ── PANEL BILAN POST-ACTION ────────────────────────────────────────── */}
      {bilanPending && (() => {
        const action = actions.find(a => a.id === bilanPending.actionId);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16a34a', marginBottom: 4 }}>Action terminée</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-base)' }}>{action?.etablissement}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Saisissez le bilan (optionnel — peut être rempli plus tard)</div>
              </div>

              {/* Satisfaction */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-base)', marginBottom: 8 }}>Satisfaction globale</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setBilanPending(f => ({ ...f, satisfaction: n }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 24, color: n <= bilanPending.satisfaction ? '#f59e0b' : 'var(--border-light)', transition: 'color 0.15s' }}
                    >★</button>
                  ))}
                  {bilanPending.satisfaction > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                      {['','Insuffisant','Passable','Bien','Très bien','Excellent'][bilanPending.satisfaction]}
                    </span>
                  )}
                </div>
              </div>

              {/* Bénéficiaires */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-base)', display: 'block', marginBottom: 4 }}>
                  Nombre de bénéficiaires (confirmer)
                </label>
                <input
                  type="number" min="0"
                  value={bilanPending.beneficiaires}
                  onChange={e => setBilanPending(f => ({ ...f, beneficiaires: Number(e.target.value) }))}
                  style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)', width: 100 }}
                />
              </div>

              {/* Points positifs */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: 4 }}>Ce qui a bien marché</label>
                <textarea
                  value={bilanPending.pointsPositifs}
                  onChange={e => setBilanPending(f => ({ ...f, pointsPositifs: e.target.value }))}
                  rows={2} placeholder="Points forts, moments marquants…"
                  style={{ width: '100%', fontSize: 12, padding: '7px 9px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Difficultés */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#d97706', display: 'block', marginBottom: 4 }}>Difficultés rencontrées</label>
                <textarea
                  value={bilanPending.difficultes}
                  onChange={e => setBilanPending(f => ({ ...f, difficultes: e.target.value }))}
                  rows={2} placeholder="Obstacles, frictions, retards…"
                  style={{ width: '100%', fontSize: 12, padding: '7px 9px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Recommandations */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', display: 'block', marginBottom: 4 }}>Recommandations pour le prochain cycle</label>
                <textarea
                  value={bilanPending.recommandations}
                  onChange={e => setBilanPending(f => ({ ...f, recommandations: e.target.value }))}
                  rows={2} placeholder="Améliorations, idées, points d'attention…"
                  style={{ width: '100%', fontSize: 12, padding: '7px 9px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  style={{ fontSize: 11, padding: '6px 14px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => submitBilan(true)}
                  disabled={bilanSaving}
                >
                  Passer — terminer sans bilan
                </button>
                <button
                  className="btn-primary"
                  style={{ fontSize: 11, padding: '6px 16px' }}
                  onClick={() => submitBilan(false)}
                  disabled={bilanSaving}
                >
                  {bilanSaving ? 'Sauvegarde…' : 'Enregistrer le bilan'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default ActionTracker;