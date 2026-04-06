// src/pages/Coordination.jsx
import React, { useState, useEffect, useRef } from 'react';
import Badge from '../components/ui/Badge';
import { POLE_COLORS, PROJET_COLORS, STATUT_STYLE } from '../data/constants';
import { formatDateShort, formatDateLong, isPastDate } from '../utils/utils';
import { Archive, Pencil, Trash2, Calendar, MapPin, RefreshCw, Users, Lightbulb, Lock, Clock, Timer, ClipboardList, FileText, Link2, Zap, RotateCcw, Paperclip, Upload, Download, X, BookMarked, Plus, Settings, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import api from '../api/apiClient';

const Coordination = () => {
  const { currentUser } = useAuth();
  const {
    handleNav, activeEventId, setActiveEventId, highlightedEventId, setHighlightedEventId, setHighlightedActionId,
    setEventModal,
  } = useAppContext();
  const navigate = handleNav;
  const {
    evenements, setEvenements, cycles, actions, directory, isAdmin, isResponsable,
    fichiersPrefaits,
    handleAddDossierPrefait, handleRenameDossierPrefait, handleDeleteDossierPrefait,
    handleAddFichierPrefait, handleDeleteFichierPrefait,
    toggleArchiveEvent, deleteEvent, joinEventTeam, removeEventTeamMember, toggleSeanceRegistration,
    trash, restoreTrash, forceDeleteTrash,
    handleUpdateActionResponsables: onUpdateActionResponsables,
    handleSendActionReminder: onSendReminder,
    seancePresences, handleRespValidation, refreshSeancePresences,
  } = useDataContext();
  const [eventsTab, setEventsTab] = useState("actifs");
  const [eventsCycle, setEventsCycle] = useState(cycles[0]);
  const [eventsSort, setEventsSort] = useState("date_desc");
  const [newResponsable, setNewResponsable] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showBibliotheque, setShowBibliotheque] = useState(false);
  const [openDossierId, setOpenDossierId]       = useState(null);   // null = racine
  const [renamingId, setRenamingId]             = useState(null);   // id dossier en cours de renommage
  const [renameVal, setRenameVal]               = useState('');
  const [newDossierVal, setNewDossierVal]       = useState('');
  const [showNewDossier, setShowNewDossier]     = useState(false);
  const [uploadingPrefait, setUploadingPrefait] = useState(false);
  const [collapsedPresences, setCollapsedPresences] = useState({}); // { seanceId: bool }
  const fileInputRef    = useRef(null);
  const prefaitInputRef = useRef(null);

  // Bascule automatiquement sur le bon tab/cycle quand on navigue vers un événement spécifique
  useEffect(() => {
    if (!activeEventId) return;
    const event = evenements.find(e => e.id === activeEventId);
    if (!event) return;
    if (event.isArchived) setEventsTab("archives");
    if (event.cycle && eventsCycle !== "Toutes" && event.cycle !== eventsCycle) setEventsCycle(event.cycle);
    setShowBibliotheque(false);
    setOpenDossierId(null);
    setRenamingId(null);
    setShowNewDossier(false);
  }, [activeEventId]);

  // Filtrage et Tri
  let finalEvents = eventsTab === "corbeille" ? [] : evenements.filter((e) => e.isArchived === (eventsTab === "archives"));
  if (eventsCycle !== "Toutes") {
    finalEvents = finalEvents.filter((e) => e.cycle === eventsCycle);
  }
  
  finalEvents.sort((a, b) => {
    if (eventsSort === "date_asc") return (a.date || "").localeCompare(b.date || "");
    if (eventsSort === "date_desc") return (b.date || "").localeCompare(a.date || "");
    if (eventsSort === "nom_asc") return a.titre.localeCompare(b.titre);
    if (eventsSort === "nom_desc") return b.titre.localeCompare(a.titre);
    return 0;
  });

  const activeEvent = finalEvents.find((e) => e.id === activeEventId) || finalEvents[0];
  const linkedAction = activeEvent ? actions.find((a) => a.id === activeEvent.actionId) : null;
  const isActionResponsable  = !!(linkedAction && (linkedAction.responsables || []).includes(currentUser?.nom));
  const isEventResponsable   = !!(activeEvent && (activeEvent.responsables  || []).includes(currentUser?.nom));
  // Peut modifier / archiver / supprimer : Admin, Bureau, responsable d'espace, responsable action liée, ou responsable de l'évènement
  const canManageEvent = isAdmin || isResponsable || isActionResponsable || isEventResponsable;
  const canEditEvent   = canManageEvent && !activeEvent?.isArchived;
  // Peut gérer la bibliothèque : admin, responsable de pôle/projet, ou responsable de l'action liée
  const canManageBibliotheque = isResponsable || isActionResponsable;

  // Calcul de la prochaine séance
  const getNextSeanceId = (seances) => {
    if (!seances || seances.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureSeances = seances
      .filter((s) => !s.annulee && new Date(s.date + "T00:00:00") >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return futureSeances.length > 0 ? futureSeances[0].id : null;
  };
  const nextSeanceId = activeEvent ? getNextSeanceId(activeEvent.seances) : null;

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeEvent) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const data = await api.postForm('/upload', formData);
        if (!data?.url) continue;
        const newFichier = {
          nom: file.name,
          url: data.url,
          type: file.type || 'application/octet-stream',
          taille: fmtSize(file.size),
          uploadedBy: currentUser?.nom || '',
          uploadedAt: new Date().toISOString(),
        };
        setEvenements(prev => prev.map(ev => {
          if (ev.id !== activeEvent.id) return ev;
          const updated = { ...ev, fichiers: [...(ev.fichiers || []), newFichier] };
          api.put(`/events/${ev.id}`, { fichiers: updated.fichiers }).catch(console.error);
          return updated;
        }));
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleUploadPrefait = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !openDossierId) return;
    setUploadingPrefait(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const data = await api.postForm('/upload', formData);
        if (!data?.url) continue;
        handleAddFichierPrefait(openDossierId, {
          nom: file.name,
          url: data.url,
          type: file.type || 'application/octet-stream',
          taille: fmtSize(file.size),
          uploadedBy: currentUser?.nom || '',
        });
      }
    } catch (err) {
      console.error('Upload préfait error', err);
    } finally {
      setUploadingPrefait(false);
      e.target.value = '';
    }
  };

  const handleAddPrefaitToEvent = (prefait) => {
    if (!activeEvent) return;
    const already = (activeEvent.fichiers || []).some(f => f.url === prefait.url);
    if (already) return;
    setEvenements(prev => prev.map(ev => {
      if (ev.id !== activeEvent.id) return ev;
      const updated = { ...ev, fichiers: [...(ev.fichiers || []), { nom: prefait.nom, url: prefait.url, type: prefait.type, taille: prefait.taille, uploadedBy: prefait.uploadedBy }] };
      api.put(`/events/${ev.id}`, { fichiers: updated.fichiers }).catch(console.error);
      return updated;
    }));
  };

  const handleSetResponsable = async (nom) => {
    if (!activeEvent) return;
    const equipe = activeEvent.equipe || [];
    if (nom && !equipe.includes(nom)) return; // sécurité : doit être dans l'équipe
    try {
      const updated = await api.put(`/events/${activeEvent.id}`, { responsableNom: nom || null, equipe });
      setEvenements(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, responsableNom: updated.responsableNom } : ev));
    } catch (err) {
      console.error('Erreur mise à jour responsable:', err);
    }
  };

  const handleRemoveFile = (idx) => {
    if (!activeEvent) return;
    setEvenements(prev => prev.map(ev => {
      if (ev.id !== activeEvent.id) return ev;
      const newFichiers = (ev.fichiers || []).filter((_, i) => i !== idx);
      api.put(`/events/${ev.id}`, { fichiers: newFichiers }).catch(console.error);
      return { ...ev, fichiers: newFichiers };
    }));
  };

  return (
    <>
      <div className="eyebrow">Actions transversales</div>
      <div style={{ marginBottom: 22 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Coordination</div>
      </div>

      {/* BARRE D'OUTILS */}
      <div className="toolbar-wrap" style={{ marginBottom: 16 }}>
        <div className="toolbar-group" style={{ borderRight: "1px solid var(--border-light)", paddingRight: "12px" }}>
          <button className={`chip ${eventsTab === "actifs" ? "on" : ""}`} style={{ border: "none" }} onClick={() => { setEventsTab("actifs"); setActiveEventId(null); }}>
            En cours ({evenements.filter((e) => !e.isArchived && (eventsCycle === "Toutes" || e.cycle === eventsCycle)).length})
          </button>
          <button className={`chip ${eventsTab === "archives" ? "on" : ""}`} style={{ border: "none" }} onClick={() => { setEventsTab("archives"); setActiveEventId(null); }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Archive size={12} strokeWidth={1.8}/> Archives ({evenements.filter((e) => e.isArchived && (eventsCycle === "Toutes" || e.cycle === eventsCycle)).length})</span>
          </button>
          <button className={`chip ${eventsTab === "corbeille" ? "on" : ""}`} style={{ border: "none" }} onClick={() => { setEventsTab("corbeille"); setActiveEventId(null); }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
              <Trash2 size={12} strokeWidth={1.8}/>
              Corbeille ({isResponsable
                ? trash.filter(t => t.type === "event").length
                : trash.filter(t => t.type === "event" && t.deletedBy === currentUser?.nom).length})
            </span>
          </button>
        </div>

        <div className="toolbar-group cycles-group" style={{ paddingLeft: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Cycle&nbsp;:</span>
          {cycles.map((y) => (
            <div key={y} className={`year-tab ${eventsCycle === y ? "active" : ""}`} onClick={() => { setEventsCycle(y); setActiveEventId(null); }}>
              {y}
            </div>
          ))}
          <div className={`year-tab ${eventsCycle === "Toutes" ? "active" : ""}`} onClick={() => { setEventsCycle("Toutes"); setActiveEventId(null); }}>
            Tous
          </div>
        </div>

        <div className="toolbar-group" style={{ marginLeft: "auto", borderLeft: "1px solid var(--border-light)", paddingLeft: "12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Trier par&nbsp;:</span>
          <select className="form-select" style={{ width: "auto", border: "none", background: "transparent", paddingLeft: 4 }} value={eventsSort} onChange={(e) => setEventsSort(e.target.value)}>
            <option value="date_desc">Date (Récents)</option>
            <option value="date_asc">Date (Anciens)</option>
            <option value="nom_asc">Nom (A-Z)</option>
            <option value="nom_desc">Nom (Z-A)</option>
          </select>
        </div>
      </div>

      {/* CORBEILLE */}
      {eventsTab === "corbeille" && (() => {
        const allTrashEvents = trash.filter(t => t.type === "event").sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
        // Responsables voient tout ; membres ne voient que leur propre corbeille
        const trashEvents = isResponsable
          ? allTrashEvents
          : allTrashEvents.filter(t => t.deletedBy === currentUser?.nom);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!isResponsable && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={11} strokeWidth={1.8}/> Vous ne pouvez voir et restaurer que vos propres éléments supprimés.
              </div>
            )}
            {trashEvents.length === 0 ? (
              <div className="empty">La corbeille est vide.</div>
            ) : trashEvents.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderLeft: "3px solid #e63946", borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.data.titre}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    {item.data.date && <span><Calendar size={10} strokeWidth={1.8} style={{ verticalAlign: "middle" }}/> {formatDateShort(item.data.date)}</span>}
                    {item.data.cycle && <span>Cycle: {item.data.cycle}</span>}
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

      {/* LAYOUT PRINCIPAL (SPLIT VIEW) */}
      {eventsTab !== "corbeille" && <div className="event-layout" data-tour="events-list">
        {/* COLONNE GAUCHE: LISTE */}
        <div className="event-list">
          <div className="event-list-header">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "var(--text-base)" }}>
              Événements ({finalEvents.length})
            </div>
          </div>
          {finalEvents.map((e) => (
            <div key={e.id} className={`event-item ${activeEvent?.id === e.id ? "active" : ""}`} onClick={() => setActiveEventId(e.id)}>
              {e.projet && (
                <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#fff", background: PROJET_COLORS[e.projet] || "#888", marginBottom: 5 }}>
                  {e.projet}
                </span>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)", marginBottom: 3 }}>
                {e.titre}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {formatDateShort(e.date)} · Cycle: {e.cycle}
              </div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(e.poles || []).slice(0, 3).map((p, i) => (
                  <span key={i} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: POLE_COLORS[p] || "#888" }} />
                ))}
              </div>
            </div>
          ))}
          {finalEvents.length === 0 && <div className="empty">Aucun événement dans cette vue.</div>}
        </div>

        {/* COLONNE DROITE: DETAILS */}
        {activeEvent ? (
          <div className="event-detail" style={{
            background: highlightedEventId === activeEvent.id ? "rgba(26,86,219,0.045)" : "var(--bg-surface)",
            animation: highlightedEventId === activeEvent.id ? "eventHighlight 1.6s ease-in-out infinite" : "none",
            boxShadow: highlightedEventId === activeEvent.id ? undefined : "none",
            borderTop: highlightedEventId === activeEvent.id ? "2px solid rgba(26,86,219,0.5)" : "2px solid transparent",
            transition: "background 0.5s ease, box-shadow 0.6s ease, border-top 0.4s ease",
          }}>
            {/* ── Titre + statut + boutons inline ── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {activeEvent.projet && (
                  <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 9px", borderRadius: 20, color: "#fff", background: PROJET_COLORS[activeEvent.projet] || "#888", marginBottom: 6 }}>
                    {activeEvent.projet}
                  </span>
                )}
                <div className="event-title" style={{ wordBreak: "break-word" }}>{activeEvent.titre}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <Badge label={activeEvent.statut} bg={STATUT_STYLE[activeEvent.statut]?.bg || "var(--bg-alt)"} c={STATUT_STYLE[activeEvent.statut]?.c || "var(--text-dim)"} size={11} />
                {canManageEvent && (
                  <>
                    <button
                      title={activeEvent.isArchived ? "Désarchiver l'événement" : "Archiver l'événement"}
                      onClick={() => toggleArchiveEvent(activeEvent)}
                      style={{ background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-dim)", flexShrink: 0 }}
                    >
                      <Archive size={14} strokeWidth={1.8} />
                    </button>
                    {canEditEvent && (
                      <button
                        title="Modifier l'événement"
                        onClick={() => setEventModal({ ...activeEvent })}
                        style={{ background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-dim)", flexShrink: 0 }}
                      >
                        <Pencil size={14} strokeWidth={1.8} />
                      </button>
                    )}
                    {!activeEvent.isArchived && (
                      <button
                        title="Supprimer l'événement"
                        onClick={() => deleteEvent(activeEvent)}
                        style={{ background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#e63946", flexShrink: 0 }}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Métadonnées ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginBottom: 14, padding: "8px 12px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
              {activeEvent.date && <span style={{ fontSize: 12, color: "var(--text-dim)", display:"flex", alignItems:"center", gap:4 }}><Calendar size={11} strokeWidth={1.8}/> {formatDateShort(activeEvent.date)}</span>}
              {activeEvent.lieu && <span style={{ fontSize: 12, color: "var(--text-dim)", display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} strokeWidth={1.8}/> {activeEvent.lieu}</span>}
              {activeEvent.cycle && <span style={{ fontSize: 12, color: "var(--text-dim)", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={11} strokeWidth={1.8}/> {activeEvent.cycle}</span>}
              {(activeEvent.poles || []).length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {(activeEvent.poles || []).map((p, i) => (
                    <span key={i} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: POLE_COLORS[p] || "#888" }} title={p} />
                  ))}
                </span>
              )}
            </div>

            {/* ── Description ── */}
            {activeEvent.description && (
              <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: "var(--bg-alt)", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", borderLeft: "3px solid var(--border-light)" }}>
                {activeEvent.description}
              </div>
            )}

            {/* ── GRILLE ÉQUIPE / FICHIERS ─────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 14, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-light)", alignItems: "stretch" }}>

              {/* ── Colonne gauche : Équipe + Responsables ── */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0 }}>

                {/* ÉQUIPE */}
                {(() => {
                  const equipe = activeEvent.equipe || [];
                  const isMember = equipe.includes(currentUser.nom);
                  const isEventLocked = activeEvent.isArchived;
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display:"flex", alignItems:"center", gap:5 }}>
                          <Users size={12} strokeWidth={1.8}/> Équipe ({equipe.length})
                        </div>
                        {!isEventLocked && !isMember && (
                          <button className="btn-primary" style={{ padding: "4px 12px", fontSize: 11 }} onClick={() => joinEventTeam(activeEvent.id)}>
                            + Rejoindre
                          </button>
                        )}
                        {!isEventLocked && isMember && (
                          <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: 11, color: "#e63946" }} onClick={() => removeEventTeamMember(activeEvent.id, currentUser.nom)}>
                            Quitter
                          </button>
                        )}
                        {isEventLocked && isMember && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓ Dans l'équipe</span>}
                      </div>
                      {equipe.length === 0 ? (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Aucun membre. Soyez le premier à rejoindre !</div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {equipe.map((nom, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: nom === activeEvent.responsableNom ? "rgba(22,163,74,0.12)" : nom === currentUser.nom ? "rgba(26,86,219,0.12)" : "var(--bg-alt)", color: nom === activeEvent.responsableNom ? "#16a34a" : nom === currentUser.nom ? "#1a56db" : "var(--text-base)", padding: "3px 9px", borderRadius: 20, fontWeight: nom === currentUser.nom ? 700 : 400, border: nom === activeEvent.responsableNom ? "1px solid rgba(22,163,74,0.3)" : nom === currentUser.nom ? "1px solid #1a56db40" : "1px solid var(--border-light)" }}>
                              {nom === activeEvent.responsableNom && <Shield size={9} strokeWidth={2} />}
                              {nom}
                              {nom === currentUser.nom && <span style={{ fontSize: 9, opacity: 0.7 }}>· moi</span>}
                              {isAdmin && nom !== currentUser.nom && !activeEvent.isArchived && (
                                <button onClick={(e) => { e.stopPropagation(); removeEventTeamMember(activeEvent.id, nom); }} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1, marginLeft: 2 }}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── Responsable de l'événement (inline) ── */}
                      {equipe.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--border-light)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <Shield size={11} strokeWidth={2} /> Responsable validation présences
                          </div>
                          {canEditEvent ? (
                            <>
                              {(activeEvent.responsables || []).length === 0 ? (
                                <div style={{ fontSize: 11, color: "#d97706", fontStyle: "italic" }}>Désignez d'abord des responsables ci-dessus.</div>
                              ) : (
                                <select
                                  value={activeEvent.responsableNom || ""}
                                  onChange={e => handleSetResponsable(e.target.value)}
                                  style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: activeEvent.responsableNom ? "1px solid rgba(22,163,74,0.4)" : "1px solid #d97706", background: activeEvent.responsableNom ? "rgba(22,163,74,0.05)" : "rgba(217,119,6,0.05)", color: activeEvent.responsableNom ? "#16a34a" : "#d97706", cursor: "pointer", width: "100%", fontWeight: 600 }}
                                >
                                  <option value="">— Choisir parmi les responsables —</option>
                                  {(activeEvent.responsables || []).map(nom => (
                                    <option key={nom} value={nom}>{nom}</option>
                                  ))}
                                </select>
                              )}
                            </>
                          ) : (
                            activeEvent.responsableNom
                              ? <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Shield size={11} strokeWidth={2} />{activeEvent.responsableNom}</span>
                              : <span style={{ fontSize: 11, color: "#d97706", fontStyle: "italic" }}>Aucun responsable désigné.</span>
                          )}
                          {!activeEvent.responsableNom && (
                            <div style={{ fontSize: 10, color: "#d97706", marginTop: 4 }}>⚠ Requis pour valider les présences bénévoles.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* RESPONSABLES DE L'ÉVÈNEMENT — visible par tous */}
                {(() => {
                  const evResponsables = activeEvent.responsables || [];
                  const equipe = activeEvent.equipe || [];
                  // Pour l'ajout inline, seuls les membres de l'équipe non déjà responsables
                  const canAdd = equipe.filter(n => !evResponsables.includes(n));
                  return (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display:"flex", alignItems:"center", gap:5 }}>
                          <Shield size={12} strokeWidth={1.8}/> Responsables de l'évènement ({evResponsables.length})
                        </div>
                        {canEditEvent && canAdd.length > 0 && (
                          <select className="form-select" value={newResponsable} onChange={async e => {
                            const nom = e.target.value;
                            if (!nom) return;
                            setNewResponsable("");
                            try {
                              const newList = [...evResponsables, nom];
                              await api.put(`/events/${activeEvent.id}`, { responsables: newList, equipe });
                              setEvenements(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, responsables: newList } : ev));
                            } catch (err) { console.error(err); }
                          }} style={{ fontSize: 11, padding: "3px 8px", width: "auto", maxWidth: 160, border: "1px dashed var(--border-light)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                            <option value="">+ Ajouter…</option>
                            {canAdd.map(nom => <option key={nom} value={nom}>{nom}</option>)}
                          </select>
                        )}
                      </div>
                      {evResponsables.length === 0 ? (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Aucun responsable désigné.</div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {evResponsables.map((nom, i) => (
                            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: nom === currentUser?.nom ? "rgba(22,163,74,0.12)" : "var(--bg-alt)", color: nom === currentUser?.nom ? "#16a34a" : "var(--text-base)", padding: "3px 9px", borderRadius: 20, fontWeight: nom === currentUser?.nom ? 700 : 400, border: nom === currentUser?.nom ? "1px solid rgba(22,163,74,0.3)" : "1px solid var(--border-light)" }}>
                              <Shield size={9} strokeWidth={2} style={{ opacity: 0.7 }} />
                              {nom}
                              {nom === currentUser?.nom && <span style={{ fontSize: 9, opacity: 0.6 }}>· moi</span>}
                              {canEditEvent && (
                                <button onClick={async () => {
                                  try {
                                    const newList = evResponsables.filter(r => r !== nom);
                                    const newResp = activeEvent.responsableNom === nom ? null : activeEvent.responsableNom;
                                    await api.put(`/events/${activeEvent.id}`, { responsables: newList, equipe, responsableNom: newResp });
                                    setEvenements(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, responsables: newList, responsableNom: newResp } : ev));
                                  } catch (err) { console.error(err); }
                                }} title="Retirer" style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 12, padding: "0 1px", lineHeight: 1 }}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── Colonne droite : Fichiers ── */}
              <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 10, padding: "10px 10px 8px", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Paperclip size={11} strokeWidth={1.8}/> Fichiers
                    {(activeEvent.fichiers || []).length > 0 && <span style={{ fontSize: 9, background: "rgba(26,86,219,0.1)", color: "#1a56db", padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>{(activeEvent.fichiers || []).length}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Bibliothèque de préfaits */}
                    <button
                      onClick={() => setShowBibliotheque(v => !v)}
                      title="Bibliothèque de fichiers préfaits"
                      style={{ background: showBibliotheque ? "rgba(26,86,219,0.1)" : "none", border: "none", cursor: "pointer", color: showBibliotheque ? "#1a56db" : "var(--text-muted)", display: "flex", alignItems: "center", padding: 3, borderRadius: 4 }}
                    >
                      <BookMarked size={13} strokeWidth={1.8}/>
                    </button>
                    {/* Upload direct */}
                    {canEditEvent && (
                      <>
                        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} multiple />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} title="Uploader un fichier" style={{ background: "none", border: "none", cursor: uploadingFile ? "not-allowed" : "pointer", color: uploadingFile ? "var(--text-muted)" : "#1a56db", display: "flex", alignItems: "center", padding: 3, borderRadius: 4 }}>
                          <Upload size={13} strokeWidth={2}/>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Panneau bibliothèque (overlay 2 niveaux) ── */}
                {showBibliotheque && (() => {
                  const dossierOuvert = fichiersPrefaits.find(d => d.id === openDossierId) || null;
                  const btnBase = { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 };

                  return (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.16)", padding: "11px 11px 10px", maxHeight: 360, display: "flex", flexDirection: "column" }}>

                      {/* ── Header ── */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                        {dossierOuvert && (
                          <button {...btnBase} onClick={() => { setOpenDossierId(null); setRenamingId(null); }} title="Retour" style={{ ...btnBase, color: "var(--text-muted)", marginRight: 0 }}>
                            <FileText size={12} strokeWidth={2} style={{ transform: "scaleX(-1)" }}/>
                          </button>
                        )}
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text-base)", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                          {dossierOuvert ? (
                            renamingId === dossierOuvert.id ? (
                              <input
                                autoFocus
                                value={renameVal}
                                onChange={e => setRenameVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { handleRenameDossierPrefait(dossierOuvert.id, renameVal); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                                onBlur={() => { handleRenameDossierPrefait(dossierOuvert.id, renameVal); setRenamingId(null); }}
                                style={{ flex: 1, fontSize: 11, fontWeight: 700, border: "1px solid #1a56db", borderRadius: 5, padding: "2px 6px", background: "var(--bg-alt)", color: "var(--text-base)", outline: "none" }}
                              />
                            ) : (
                              <>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📁 {dossierOuvert.nom}</span>
                                <span style={{ fontSize: 9, background: "rgba(26,86,219,0.1)", color: "#1a56db", padding: "1px 5px", borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>{(dossierOuvert.fichiers || []).length}</span>
                                {canManageBibliotheque && (
                                  <button {...btnBase} onClick={() => { setRenamingId(dossierOuvert.id); setRenameVal(dossierOuvert.nom); }} title="Renommer" style={{ ...btnBase, color: "var(--text-muted)", flexShrink: 0 }}>
                                    <Pencil size={11} strokeWidth={1.8}/>
                                  </button>
                                )}
                              </>
                            )
                          ) : (
                            <>
                              <BookMarked size={12} strokeWidth={1.8} color="#1a56db"/> Bibliothèque
                              <span style={{ fontSize: 9, background: "rgba(26,86,219,0.1)", color: "#1a56db", padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>{fichiersPrefaits.length}</span>
                            </>
                          )}
                        </div>
                        <button {...btnBase} onClick={() => { setShowBibliotheque(false); setOpenDossierId(null); setRenamingId(null); setShowNewDossier(false); }} style={{ ...btnBase, color: "var(--text-muted)", flexShrink: 0 }}>
                          <X size={13} strokeWidth={2}/>
                        </button>
                      </div>

                      {/* ── Niveau racine : liste des dossiers ── */}
                      {!dossierOuvert && (
                        <>
                          {canManageBibliotheque && (
                            <div style={{ marginBottom: 8 }}>
                              {showNewDossier ? (
                                <div style={{ display: "flex", gap: 5 }}>
                                  <input
                                    autoFocus
                                    value={newDossierVal}
                                    onChange={e => setNewDossierVal(e.target.value)}
                                    placeholder="Nom du dossier"
                                    onKeyDown={e => { if (e.key === 'Enter' && newDossierVal.trim()) { handleAddDossierPrefait(newDossierVal); setNewDossierVal(''); setShowNewDossier(false); } if (e.key === 'Escape') { setShowNewDossier(false); setNewDossierVal(''); } }}
                                    style={{ flex: 1, fontSize: 11, border: "1px solid #1a56db", borderRadius: 6, padding: "4px 8px", background: "var(--bg-alt)", color: "var(--text-base)", outline: "none" }}
                                  />
                                  <button onClick={() => { if (newDossierVal.trim()) { handleAddDossierPrefait(newDossierVal); setNewDossierVal(''); } setShowNewDossier(false); }} style={{ background: "#1a56db", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }}>OK</button>
                                  <button onClick={() => { setShowNewDossier(false); setNewDossierVal(''); }} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)", fontSize: 11 }}>✕</button>
                                </div>
                              ) : (
                                <button onClick={() => setShowNewDossier(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "rgba(26,86,219,0.06)", color: "#1a56db", border: "1.5px dashed rgba(26,86,219,0.3)", borderRadius: 7, cursor: "pointer" }}>
                                  <Plus size={12} strokeWidth={2}/> Nouveau dossier
                                </button>
                              )}
                            </div>
                          )}
                          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                            {fichiersPrefaits.length === 0 ? (
                              <div style={{ padding: "18px 8px", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                                {canManageBibliotheque ? "Aucun dossier. Créez-en un ci-dessus." : "Aucun fichier préfait disponible."}
                              </div>
                            ) : fichiersPrefaits.map(dossier => (
                              <div key={dossier.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 8, background: "var(--bg-alt)", border: "1px solid var(--border-light)", cursor: "pointer" }} onClick={() => setOpenDossierId(dossier.id)}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>📁</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dossier.nom}</div>
                                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{(dossier.fichiers || []).length} fichier{(dossier.fichiers || []).length !== 1 ? "s" : ""}</div>
                                </div>
                                {canManageBibliotheque && (
                                  <button onClick={e => { e.stopPropagation(); handleDeleteDossierPrefait(dossier.id); }} title="Supprimer le dossier" style={{ ...btnBase, color: "var(--text-muted)", flexShrink: 0 }}>
                                    <Trash2 size={11} strokeWidth={1.8}/>
                                  </button>
                                )}
                                <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 10 }}>›</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* ── Niveau dossier : liste des fichiers ── */}
                      {dossierOuvert && (
                        <>
                          {canManageBibliotheque && (
                            <div style={{ marginBottom: 8 }}>
                              <input ref={prefaitInputRef} type="file" style={{ display: "none" }} onChange={handleUploadPrefait} multiple />
                              <button onClick={() => prefaitInputRef.current?.click()} disabled={uploadingPrefait} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: uploadingPrefait ? "var(--bg-alt)" : "rgba(26,86,219,0.06)", color: uploadingPrefait ? "var(--text-muted)" : "#1a56db", border: "1.5px dashed rgba(26,86,219,0.3)", borderRadius: 7, cursor: uploadingPrefait ? "not-allowed" : "pointer" }}>
                                <Upload size={11} strokeWidth={2}/> {uploadingPrefait ? "Envoi…" : "Ajouter des fichiers"}
                              </button>
                            </div>
                          )}
                          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                            {(dossierOuvert.fichiers || []).length === 0 ? (
                              <div style={{ padding: "18px 8px", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                                {canManageBibliotheque ? "Dossier vide. Ajoutez des fichiers ci-dessus." : "Aucun fichier dans ce dossier."}
                              </div>
                            ) : (dossierOuvert.fichiers || []).map((f, i) => {
                              const alreadyAdded = (activeEvent.fichiers || []).some(af => af.url === f.url);
                              return (
                                <div key={f.id || i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7, background: "var(--bg-alt)", border: "1px solid var(--border-light)" }}>
                                  <Paperclip size={11} strokeWidth={1.8} style={{ color: "var(--text-muted)", flexShrink: 0 }}/>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.nom}>{f.nom}</div>
                                    {f.taille && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{f.taille}</div>}
                                  </div>
                                  {canEditEvent && (
                                    <button onClick={() => { handleAddPrefaitToEvent(f); }} disabled={alreadyAdded} title={alreadyAdded ? "Déjà dans l'événement" : "Ajouter à l'événement"} style={{ background: alreadyAdded ? "transparent" : "rgba(26,86,219,0.1)", border: "none", borderRadius: 5, cursor: alreadyAdded ? "default" : "pointer", color: alreadyAdded ? "#16a34a" : "#1a56db", display: "flex", alignItems: "center", padding: "2px 5px", fontSize: 10, fontWeight: 700, flexShrink: 0, gap: 2 }}>
                                      {alreadyAdded ? "✓" : <><Plus size={9} strokeWidth={2.5}/> +</>}
                                    </button>
                                  )}
                                  {canManageBibliotheque && (
                                    <button onClick={() => handleDeleteFichierPrefait(dossierOuvert.id, i)} title="Supprimer du dossier" style={{ ...btnBase, color: "var(--text-muted)", flexShrink: 0 }}>
                                      <X size={11} strokeWidth={2}/>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {(activeEvent.fichiers || []).length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px 0" }}>
                    <Paperclip size={16} strokeWidth={1.3} style={{ color: "var(--text-muted)", opacity: 0.5 }}/>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>Aucun fichier joint</span>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, overflowY: "auto" }}>
                    {(activeEvent.fichiers || []).map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 6px", borderRadius: 6, background: "var(--bg-surface)", border: "1px solid var(--border-light)", minWidth: 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.nom}>{f.nom}</div>
                          {f.taille && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{f.taille}</div>}
                        </div>
                        <a href={f.url} download={f.nom} target="_blank" rel="noreferrer" title="Télécharger" style={{ color: "var(--text-muted)", display: "flex", flexShrink: 0 }}>
                          <Download size={11} strokeWidth={1.8}/>
                        </a>
                        {canEditEvent && (
                          <button onClick={() => handleRemoveFile(i)} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 0, flexShrink: 0 }}>
                            <X size={11} strokeWidth={2}/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RACCOURCI SUIVI TERRAIN ──────────────────────────────────────────── */}
            {linkedAction && (
              <div onClick={() => { navigate("actions"); setHighlightedActionId(linkedAction.id); setTimeout(() => setHighlightedActionId(null), 3000); }} style={{ marginTop: 20, background: "linear-gradient(135deg, #0f2d5e, #1a56db)", borderRadius: 12, padding: "18px 22px", cursor: "pointer" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6, display:"flex", alignItems:"center", gap:4 }}><Link2 size={9} strokeWidth={1.8}/> Lié au suivi terrain</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "#fff" }}>{linkedAction.etablissement}</div>
                {(linkedAction.adresse || linkedAction.ville) && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <span style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>📍</span>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                      {linkedAction.adresse && <div style={{ fontWeight: 600 }}>{linkedAction.adresse}</div>}
                      {linkedAction.ville && <div style={{ opacity: 0.75 }}>{linkedAction.ville}{linkedAction.departement ? ` (${linkedAction.departement})` : ''}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SÉANCES ─────────────────────────────────────────────────────────── */}
            {activeEvent.seances && activeEvent.seances.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>Calendrier des séances</div>
                  {canEditEvent && (
                    <button
                      onClick={() => setEventModal({ ...activeEvent, editingSeances: true })}
                      style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Pencil size={10} strokeWidth={1.8} /> Gérer
                    </button>
                  )}
                </div>

                {/* Info si pas encore dans l'équipe */}
                {!(activeEvent.equipe || []).includes(currentUser.nom) && !activeEvent.isArchived && (
                  <div style={{ padding: "10px 14px", background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 8, fontSize: 12, color: "#d97706", marginBottom: 12 }}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Lightbulb size={13} strokeWidth={1.8}/> Rejoignez l'équipe ci-dessus pour vous inscrire aux séances.</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeEvent.seances.map((s) => {
                    const isNext = s.id === nextSeanceId;
                    const isEnrolled = (s.inscrits || []).includes(currentUser.nom);
                    const isPast = isPastDate(s.date);
                    const isLocked = isPast || activeEvent.isArchived;
                    const isInTeam = (activeEvent.equipe || []).includes(currentUser.nom);

                    return (
                      <div key={s.id} style={{
                        background: s.annulee ? "rgba(231,68,68,0.04)" : isNext && !isLocked ? "rgba(26,86,219,0.05)" : "var(--bg-hover)",
                        padding: "12px 14px", borderRadius: 8,
                        border: s.annulee ? "1px solid #fca5a5" : isNext && !isLocked ? "2px solid #1a56db" : "1px solid var(--border-light)",
                        opacity: isPast && !s.annulee ? 0.75 : s.annulee ? 0.85 : 1,
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                          <div style={{ flex: 1 }}>
                            {s.annulee && <span style={{ fontSize: 10, background: "#fef2f2", color: "#dc2626", padding: "2px 6px", borderRadius: 4, fontWeight: 700, marginRight: 8, border: "1px solid #fca5a5" }}>✕ ANNULÉE</span>}
                            {!s.annulee && isNext && !isLocked && <span style={{ fontSize: 10, background: "#1a56db", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700, marginRight: 8 }}>PROCHAINE</span>}
                            {!s.annulee && isPast && <span style={{ fontSize: 10, background: "var(--bg-alt)", color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4, fontWeight: 700, marginRight: 8 }}>PASSÉE</span>}
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.annulee ? "#dc2626" : isPast ? "var(--text-muted)" : "#1a56db", textDecoration: s.annulee ? "line-through" : "none" }}>{formatDateLong(s.date)}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-base)", textDecoration: s.annulee ? "line-through" : "none" }}> — {s.libelle}</span>
                          </div>

                          {/* Bouton inscription : visible pour tous les membres de l'équipe */}
                          {isInTeam && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              {s.annulee ? (
                                isEnrolled ? (
                                  <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: "rgba(220,38,38,0.08)", color: "#dc2626", fontWeight: 700, border: "1px solid #fca5a5" }}>
                                    ✓ Était inscrit(e)
                                  </span>
                                ) : null
                              ) : isLocked ? (
                                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: isEnrolled ? "rgba(22,163,74,0.1)" : "var(--bg-alt)", color: isEnrolled ? "#16a34a" : "var(--text-muted)", fontWeight: 700 }}>
                                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{isEnrolled ? "✓ Présent(e)" : <><Lock size={10} strokeWidth={1.8}/> Absent(e)</>}</span>
                                </span>
                              ) : (
                                <button
                                  className={isEnrolled ? "btn-secondary" : "btn-primary"}
                                  style={{ padding: "4px 12px", fontSize: 11, whiteSpace: "nowrap" }}
                                  onClick={() => toggleSeanceRegistration(activeEvent.id, s.id)}
                                >
                                  {isEnrolled ? "✓ Inscrit(e) — Se désinscrire" : "S'inscrire"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {!s.annulee && (
                          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-dim)", marginBottom: (s.inscrits || []).length > 0 || s.aVenir || s.bilan ? 8 : 0, flexWrap: "wrap" }}>
                            {s.heure && <span style={{display:"flex",alignItems:"center",gap:4}}><Clock size={11} strokeWidth={1.8}/> {s.heure}</span>}
                            {s.duree && <span style={{display:"flex",alignItems:"center",gap:4}}><Timer size={11} strokeWidth={1.8}/> {s.duree}</span>}
                            <span style={{display:"flex",alignItems:"center",gap:4}}><Users size={11} strokeWidth={1.8}/> {(s.inscrits || []).length} inscrit{(s.inscrits || []).length !== 1 ? "s" : ""}</span>
                          </div>
                        )}

                        {/* Liste des inscrits — toujours visible, même si annulée */}
                        {(s.inscrits || []).length > 0 && (
                          <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: s.annulee ? "1px solid #fca5a5" : "1px solid var(--border-light)" }}>
                            {s.annulee && (
                              <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginBottom: 5 }}>
                                Inscrits au moment de l'annulation :
                              </div>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {s.inscrits.map((nom, i) => (
                                <span key={i} style={{
                                  fontSize: 11,
                                  background: s.annulee ? (nom === currentUser.nom ? "rgba(220,38,38,0.1)" : "rgba(220,38,38,0.06)") : (nom === currentUser.nom ? "rgba(22,163,74,0.15)" : "rgba(26,86,219,0.12)"),
                                  color: s.annulee ? (nom === currentUser.nom ? "#dc2626" : "#991b1b") : (nom === currentUser.nom ? "#16a34a" : "#1a56db"),
                                  padding: "2px 8px", borderRadius: 12,
                                  fontWeight: nom === currentUser.nom ? 700 : 400,
                                  textDecoration: "none",
                                }}>
                                  {nom}{nom === currentUser.nom ? " ✓" : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Spacer for cancelled cards when no inscrits */}
                        {s.annulee && (s.inscrits || []).length === 0 && <div style={{ minHeight: 20 }} />}

                        {/* À venir + Bilan */}
                        {!s.annulee && (
                          <div className="grid-2col" style={{ gap: 8, fontSize: 11 }}>
                            {s.aVenir && (
                              <div style={{ padding: 8, background: "rgba(217,119,6,0.1)", borderRadius: 4 }}>
                                <div style={{ fontWeight: 700, color: "#d97706", marginBottom: 4, display:"flex", alignItems:"center", gap:4 }}><ClipboardList size={11} strokeWidth={1.8}/> À venir :</div>
                                <div style={{ color: "var(--text-dim)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.aVenir}</div>
                              </div>
                            )}
                            {s.bilan && (
                              <div style={{ padding: 8, background: "rgba(16,185,129,0.1)", borderRadius: 4 }}>
                                <div style={{ fontWeight: 700, color: "#10b981", marginBottom: 4, display:"flex", alignItems:"center", gap:4 }}><FileText size={11} strokeWidth={1.8}/> Bilan :</div>
                                <div style={{ color: "var(--text-dim)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.bilan}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── VALIDATION PRÉSENCES (responsable, séances passées) ── */}
                        {isPast && !s.annulee && (s.inscrits || []).length > 0 && activeEvent.responsableNom === currentUser.nom && (() => {
                          const seancePresencesForSeance = seancePresences.filter(
                            p => p.evenementId === activeEvent.id && p.seanceId === String(s.id)
                          );
                          const allValidated = seancePresencesForSeance.length > 0 &&
                            seancePresencesForSeance.every(p => p.resp1Statut !== 'en_attente');
                          const isCollapsed = collapsedPresences[s.id];
                          return (
                            <div style={{ marginTop: 10, borderTop: '2px solid rgba(22,163,74,0.2)', paddingTop: 10 }}>
                              {/* Header repliable */}
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCollapsed ? 0 : 8, cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setCollapsedPresences(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                              >
                                <Shield size={11} strokeWidth={2} style={{ color: '#16a34a' }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', flex: 1 }}>Validation des présences</span>
                                {allValidated && <span style={{ fontSize: 10, background: 'rgba(22,163,74,0.1)', color: '#16a34a', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✓ Complète</span>}
                                {!allValidated && seancePresencesForSeance.some(p => p.resp1Statut === 'en_attente') && (
                                  <span style={{ fontSize: 10, background: 'rgba(217,119,6,0.1)', color: '#d97706', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                                    {seancePresencesForSeance.filter(p => p.resp1Statut === 'en_attente').length} en attente
                                  </span>
                                )}
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{isCollapsed ? '▶' : '▼'}</span>
                              </div>
                              {!isCollapsed && (
                                <>
                                  {seancePresencesForSeance.length === 0 ? (
                                    <button style={{ fontSize: 10, background: 'none', border: '1px solid #16a34a', color: '#16a34a', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                                      onClick={e => { e.stopPropagation(); refreshSeancePresences(); }}>
                                      Générer les fiches
                                    </button>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {seancePresencesForSeance.map(p => {
                                        const rhDone = p.rhStatut !== 'en_attente';
                                        return (
                                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: p.resp1Statut === 'present' ? 'rgba(22,163,74,0.06)' : p.resp1Statut === 'absent' ? 'rgba(220,38,38,0.05)' : 'var(--bg-card)', border: `1px solid ${p.resp1Statut === 'present' ? 'rgba(22,163,74,0.2)' : p.resp1Statut === 'absent' ? 'rgba(220,38,38,0.15)' : 'var(--border-light)'}`, borderRadius: 6, padding: '6px 10px', flexWrap: 'wrap', gap: 6 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.membreNom}</span>
                                              {rhDone && (
                                                <span style={{ fontSize: 10, color: p.rhStatut === 'confirme' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                                  RH : {p.rhStatut === 'confirme' ? '✓ heures confirmées' : '✗ heures rejetées'}
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                              {p.resp1Statut === 'en_attente' ? (
                                                <>
                                                  <button
                                                    style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#16a34a', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                                    onClick={() => handleRespValidation(p.id, 'present')}
                                                  ><CheckCircle2 size={10} strokeWidth={2} /> Présent</button>
                                                  <button
                                                    style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                                    onClick={() => handleRespValidation(p.id, 'absent')}
                                                  ><XCircle size={10} strokeWidth={2} /> Absent</button>
                                                </>
                                              ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: 11, fontWeight: 700, color: p.resp1Statut === 'present' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {p.resp1Statut === 'present' ? <CheckCircle2 size={11} strokeWidth={2} /> : <XCircle size={11} strokeWidth={2} />}
                                                    {p.resp1Statut === 'present' ? 'Présent' : 'Absent'}
                                                  </span>
                                                  {/* Corriger bloqué si RH a déjà traité ce dossier */}
                                                  {!rhDone ? (
                                                    <button style={{ fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                      onClick={() => handleRespValidation(p.id, p.resp1Statut === 'present' ? 'absent' : 'present')}>
                                                      Corriger
                                                    </button>
                                                  ) : (
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }} title="RH a déjà traité ces heures">verrouillé</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {/* ── ANNULATION OVERLAY ── */}
                        {s.annulee && (
                          <>
                            {/* Diagonal slash */}
                            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, borderRadius: 8, overflow: "hidden" }}>
                              <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none">
                                <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(220,38,38,0.35)" strokeWidth="2" />
                              </svg>
                            </div>
                            {/* Cancellation banner */}
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3, pointerEvents: "none" }}>
                              <div style={{ background: "#fff5f5", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "8px 16px", maxWidth: "80%", textAlign: "center", boxShadow: "0 2px 12px rgba(220,38,38,0.15)" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: (s.raisonAnnulation || s.commentaireAnnulation) ? 4 : 0, display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                                  <span>✕</span> Séance annulée
                                </div>
                                {s.raisonAnnulation && (
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 2 }}>{s.raisonAnnulation}</div>
                                )}
                                {s.commentaireAnnulation && (
                                  <div style={{ fontSize: 11, color: "#991b1b", fontStyle: "italic", lineHeight: 1.4 }}>{s.commentaireAnnulation}</div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--text-muted)", padding: 40 }}>
            <div style={{ display:"flex", color:"var(--text-muted)" }}><Zap size={36} strokeWidth={1.2}/></div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sélectionnez un événement</div>
          </div>
        )}
      </div>}
    </>
  );
};

export default Coordination;