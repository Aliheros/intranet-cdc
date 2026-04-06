// src/components/modals/RHProfileModal.jsx
import React, { useState } from 'react';
import { POLE_COLORS } from '../../data/constants';
import { AvatarInner, isAvatarUrl } from '../ui/AvatarDisplay';
import { StatusBadge, MEMBER_STATUS } from '../ui/StatusIcon';
import { X, MessageSquare, Clock, CheckCircle2, Send, Pencil, Trash2, Phone, Mail, MapPin, Calendar, AlertTriangle, FileText, Save, Target, ClipboardList, Award, Activity, Umbrella, CalendarRange, ArrowRight } from 'lucide-react';
import api from '../../api/apiClient';

import { useModalClose } from '../../hooks/useModalClose';
import { formatDuree } from '../../utils/utils';

export default function RHProfileModal({ member, onClose, volunteerHours = [], seancePresences = [], evenements = [], missions = [], tasks = [], actions = [], currentUser, directory, setDirectory, addToast }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [tab, setTab] = useState("profil"); // "profil" | "activite" | "notes"
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteGlobale, setNoteGlobale] = useState(member?.notesRH || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);

  if (!member) return null;

  const poleColor = POLE_COLORS[member.pole] || "#1a56db";
  const commentairesRH = member.commentairesRH || [];

  // ── Cross-reference: enrich each hour with seancePresence context ────────
  const enrichHour = (h) => {
    // Validated hours are linked via hourId on SeancePresence
    const presence = seancePresences.find(p => p.hourId === h.id && p.membreNom === member.nom);
    if (presence) {
      const ev = evenements.find(e => e.id === presence.evenementId);
      const seance = ev ? (ev.seances || []).find(s => String(s.id) === String(presence.seanceId)) : null;
      const action = ev?.actionId ? actions.find(a => a.id === ev.actionId) : null;
      return {
        ...h,
        _evenementTitre: presence.evenementTitre || ev?.titre || null,
        _seanceLibelle: seance?.libelle || null,
        _seanceDate: presence.seanceDate || null,
        _actionEtablissement: action?.etablissement || null,
        _resp1Par: presence.resp1Par || null,
        _rhPar: presence.rhPar || null,
      };
    }
    // Fallback: try to match by eventId
    const ev = h.eventId ? evenements.find(e => e.id === h.eventId) : null;
    const action = ev?.actionId ? actions.find(a => a.id === ev.actionId) : null;
    return {
      ...h,
      _evenementTitre: ev?.titre || null,
      _actionEtablissement: action?.etablissement || null,
      _seanceLibelle: null,
      _seanceDate: null,
      _resp1Par: null,
      _rhPar: null,
    };
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const memberHours = volunteerHours.filter(h => h.user === member.nom);
  const validatedHours = memberHours.filter(h => h.status === "Validé").reduce((s, h) => s + h.hours, 0);
  const pendingHours = memberHours.filter(h => h.status === "En attente").reduce((s, h) => s + h.hours, 0);
  const memberMissions = missions.filter(m => m.candidatures?.some(c => c.nom === member.nom && c.statut === "Accepté"));
  const memberTasks = tasks.filter(t => t.status !== "Terminé" && (t.assignees || []).some(a => a.name === member.nom));
  const completedTasks = tasks.filter(t => t.status === "Terminé" && (t.assignees || []).some(a => a.name === member.nom));
  const memberActions = actions.filter(a => (a.responsables || []).includes(member.nom));
  const pv = member.profileVolontaire || {};

  // ── Chronological activity log ────────────────────────────────────────────
  const activityLog = [
    ...memberHours.map(h => ({
      type: "heure",
      date: h.date || "",
      label: `${formatDuree(h.hours)} — ${h.type || "Bénévolat"}`,
      sub: h.status === "Validé" ? "Validé" : "En attente",
      color: h.status === "Validé" ? "#1a56db" : "#d97706",
      icon: "clock",
    })),
    ...memberMissions.map(m => ({
      type: "mission",
      date: m.dateDebut || m.createdAt?.split("T")[0] || "",
      label: m.titre,
      sub: `${m.pole} · ${m.type}`,
      color: "#7c3aed",
      icon: "mission",
    })),
    ...completedTasks.map(t => ({
      type: "tache",
      date: t.completedAt?.split("T")[0] || t.deadline || "",
      label: t.text,
      sub: `${t.space || ""} · Terminé`,
      color: "#16a34a",
      icon: "task",
    })),
    ...memberActions.map(a => ({
      type: "action",
      date: a.date_debut || "",
      label: a.etablissement,
      sub: `Action · ${a.statut}`,
      color: "#0891b2",
      icon: "action",
    })),
  ].filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const saveComments = async (updated) => {
    setSaving(true);
    try {
      await api.patch(`/users/${member.id}`, { commentairesRH: updated });
      setDirectory(prev => prev.map(m => m.id === member.id ? { ...m, commentairesRH: updated } : m));
      addToast("Commentaire enregistré");
    } catch {
      addToast("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNoteGlobale = async () => {
    setNoteSaving(true);
    try {
      const now = new Date().toISOString();
      const logEntry = { id: Date.now(), type: "note", auteur: currentUser.nom, texte: `Note RH modifiée par ${currentUser.nom}`, createdAt: now };
      const updatedHistorique = [...(member.historiqueRH || []), logEntry];
      await api.patch(`/users/${member.id}`, { notesRH: noteGlobale, historiqueRH: updatedHistorique });
      setDirectory(prev => prev.map(m => m.id === member.id ? { ...m, notesRH: noteGlobale, historiqueRH: updatedHistorique } : m));
      setNoteDirty(false);
      addToast("Note globale enregistrée");
    } catch {
      addToast("Erreur lors de la sauvegarde");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const updated = [
      ...commentairesRH,
      { id: Date.now(), auteur: currentUser.nom, texte: newComment.trim(), createdAt: new Date().toISOString(), editedAt: null },
    ];
    setNewComment("");
    await saveComments(updated);
  };

  const handleEditComment = async (id) => {
    if (!editingText.trim()) return;
    const updated = commentairesRH.map(c =>
      c.id === id ? { ...c, texte: editingText.trim(), editedAt: new Date().toISOString() } : c
    );
    setEditingCommentId(null);
    setEditingText("");
    await saveComments(updated);
  };

  const handleDeleteComment = async (id) => {
    await saveComments(commentairesRH.filter(c => c.id !== id));
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const fmtDateShort = (str) => {
    if (!str) return "";
    try { return new Date(str).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return str; }
  };

  const age = pv.dateNaissance
    ? Math.floor((new Date() - new Date(pv.dateNaissance)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const authorColors = ["#1a56db","#16a34a","#d97706","#8b5cf6","#e63946","#0891b2"];
  const getAuthorColor = (nom) => {
    const idx = (directory.findIndex(m => m.nom === nom) + 1) % authorColors.length;
    return authorColors[idx < 0 ? 0 : idx];
  };

  const TABS = [
    { id: "profil", label: "Profil" },
    { id: "activite", label: `Activité (${activityLog.length})` },
    { id: "notes", label: `Notes RH${commentairesRH.length ? ` (${commentairesRH.length})` : ""}` },
  ];

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 860, maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ background: `linear-gradient(135deg, ${poleColor}, ${poleColor}aa)`, padding: "18px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: isAvatarUrl(member.avatar) ? "transparent" : "rgba(255,255,255,0.25)", color: "#fff", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              <AvatarInner avatar={member.avatar} nom={member.nom} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.nom}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{member.pole} · {member.role}</span>
                <StatusBadge map={MEMBER_STATUS} value={member.statut} size={10} />
                {member.dateInscription && <span>Membre depuis {fmtDateShort(member.dateInscription)}</span>}
              </div>
              {/* KPIs — sous le nom pour ne pas déborder sur mobile */}
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  { val: `${validatedHours}h`, label: "validées", sub: pendingHours > 0 ? `+${pendingHours}h att.` : null },
                  { val: memberMissions.length, label: "missions" },
                  { val: memberActions.length, label: "actions" },
                  { val: memberTasks.length, label: "tâches", warn: memberTasks.length > 0 },
                ].map((k, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.warn ? "#fcd34d" : "#fff", fontFamily: "var(--font-display)", lineHeight: 1 }}>{k.val}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                    {k.sub && <div style={{ fontSize: 9, color: "#fcd34d" }}>{k.sub}</div>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: tab === t.id ? "#fff" : "rgba(255,255,255,0.15)",
                color: tab === t.id ? poleColor : "rgba(255,255,255,0.85)",
                transition: "all 0.15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── TAB PROFIL ─────────────────────────────────────────────────────── */}
          {tab === "profil" && (
            <>
              {/* Contact + Fiche */}
              <div className="form-2col" style={{ gap: 12 }}>
                <div style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.08em" }}>Contact</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {member.email && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}><Mail size={11} strokeWidth={1.8} color="var(--text-muted)" /> {member.email}</div>}
                    {member.telephone && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}><Phone size={11} strokeWidth={1.8} color="var(--text-muted)" /> {member.telephone}</div>}
                    {pv.adresse && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}><MapPin size={11} strokeWidth={1.8} color="var(--text-muted)" /> {pv.adresse}</div>}
                    {age !== null && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}><Calendar size={11} strokeWidth={1.8} color="var(--text-muted)" /> {age} ans ({new Date(pv.dateNaissance).toLocaleDateString("fr-FR")})</div>}
                    {!member.email && !member.telephone && !pv.adresse && age === null && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Aucun contact renseigné.</div>}
                  </div>
                  {(pv.urgenceContact || pv.urgenceTel) && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#d97706" }}>
                      <AlertTriangle size={11} strokeWidth={1.8} />
                      <span>Urgence : <strong>{pv.urgenceContact}</strong>{pv.urgenceTel ? ` · ${pv.urgenceTel}` : ""}</span>
                    </div>
                  )}
                </div>

                <div style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.08em" }}>Fiche bénévole</div>
                  {member.dispos && <div style={{ marginBottom: 7 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>Disponibilités : </span><span style={{ fontSize: 12 }}>{member.dispos}</span></div>}
                  {pv.motivation && <div style={{ marginBottom: 7 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>Motivation : </span><span style={{ fontSize: 12, lineHeight: 1.5 }}>{pv.motivation}</span></div>}
                  {pv.experiencesPassees && <div><span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>Expériences : </span><span style={{ fontSize: 12, lineHeight: 1.5 }}>{pv.experiencesPassees}</span></div>}
                  {!member.dispos && !pv.motivation && !pv.experiencesPassees && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Aucune info renseignée.</div>}
                </div>
              </div>

              {/* Compétences */}
              {(member.competences || []).length > 0 && (
                <div style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><Award size={10} strokeWidth={1.8} /> Compétences</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {member.competences.map((c, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: poleColor + "18", color: poleColor, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tâches actives */}
              {memberTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={10} strokeWidth={1.8} /> Tâches actives ({memberTasks.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {memberTasks.map(t => {
                      const isOverdue = t.deadline && t.deadline < new Date().toISOString().split("T")[0];
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "var(--bg-alt)", borderRadius: 6, border: `1px solid ${isOverdue ? "rgba(230,57,70,0.2)" : "var(--border-light)"}`, borderLeft: `3px solid ${isOverdue ? "#e63946" : "#1a56db"}`, fontSize: 11 }}>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{t.space}</span>
                          {t.deadline && <span style={{ fontSize: 10, color: isOverdue ? "#e63946" : "var(--text-muted)", flexShrink: 0 }}>{t.deadline}</span>}
                          {isOverdue && <AlertTriangle size={10} strokeWidth={1.8} color="#e63946" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB ACTIVITÉ ───────────────────────────────────────────────────── */}
          {tab === "activite" && (
            <>
              {/* Synthèse */}
              <div className="space-kpi-4" style={{ gap: 10, marginBottom: 0 }}>
                {[
                  { label: "Heures totales", val: `${validatedHours}h`, sub: pendingHours > 0 ? `+${pendingHours}h en attente` : null, color: "#1a56db" },
                  { label: "Sessions bénévolat", val: memberHours.length, sub: `${memberHours.filter(h => h.status === "Validé").length} validées`, color: "#0891b2" },
                  { label: "Missions réalisées", val: memberMissions.length, sub: null, color: "#7c3aed" },
                  { label: "Actions encadrées", val: memberActions.length, sub: null, color: "#16a34a" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border-light)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: "var(--font-display)" }}>{k.val}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-base)", marginTop: 2 }}>{k.label}</div>
                    {k.sub && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{k.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Missions */}
              {memberMissions.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><Target size={10} strokeWidth={1.8} /> Missions participées</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {memberMissions.map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)", borderLeft: "3px solid #7c3aed", fontSize: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{m.titre}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{m.pole} · {m.type}</div>
                        </div>
                        {m.dateDebut && <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDateShort(m.dateDebut)}{m.dateFin ? ` → ${fmtDateShort(m.dateFin)}` : ""}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions responsable */}
              {memberActions.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><ClipboardList size={10} strokeWidth={1.8} /> Actions (responsable)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {memberActions.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)", borderLeft: "3px solid #0891b2", fontSize: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{a.etablissement}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{a.type} · {a.lieu}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{a.date_debut}</div>
                          <div style={{ fontSize: 10, color: a.statut === "Terminée" ? "#16a34a" : "#1a56db", fontWeight: 700 }}>{a.statut}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tâches terminées */}
              {completedTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={10} strokeWidth={1.8} /> Tâches terminées ({completedTasks.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                    {completedTasks.map(t => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-alt)", borderRadius: 6, border: "1px solid var(--border-light)", borderLeft: "3px solid #16a34a", fontSize: 11 }}>
                        <span style={{ flex: 1, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{t.space}</span>
                        {t.completedAt && <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDateShort(t.completedAt)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline heures (log chronologique) */}
              {memberHours.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}><Clock size={10} strokeWidth={1.8} /> Journal des heures ({memberHours.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                    {[...memberHours].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((h, i) => {
                      const eh = enrichHour(h);
                      const isValidated = h.status === "Validé";
                      const borderColor = isValidated ? "#1a56db" : "#d97706";
                      return (
                        <div key={i} style={{ padding: "9px 12px", background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)", borderLeft: `3px solid ${borderColor}`, fontSize: 11 }}>
                          {/* Ligne principale */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: borderColor, minWidth: 34, flexShrink: 0 }}>{formatDuree(h.hours)}</span>
                            <span style={{ flex: 1, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {eh._evenementTitre || h.type || "Bénévolat"}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDateShort(eh._seanceDate || h.date)}</span>
                            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: isValidated ? "rgba(26,86,219,0.1)" : "rgba(217,119,6,0.12)", color: borderColor, fontWeight: 700, flexShrink: 0 }}>{h.status}</span>
                          </div>
                          {/* Détails contextuels */}
                          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                            {eh._actionEtablissement && (
                              <span style={{ fontSize: 10, color: "#0891b2", display: "flex", alignItems: "center", gap: 3 }}>
                                <ClipboardList size={9} strokeWidth={1.8} /> {eh._actionEtablissement}
                              </span>
                            )}
                            {eh._seanceLibelle && (
                              <span style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 3 }}>
                                <CalendarRange size={9} strokeWidth={1.8} /> Séance : {eh._seanceLibelle}
                              </span>
                            )}
                            {!eh._seanceLibelle && eh._seanceDate && (
                              <span style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 3 }}>
                                <CalendarRange size={9} strokeWidth={1.8} /> Séance du {fmtDateShort(eh._seanceDate)}
                              </span>
                            )}
                            {eh._resp1Par && (
                              <span style={{ fontSize: 10, color: "#16a34a", display: "flex", alignItems: "center", gap: 3 }}>
                                <CheckCircle2 size={9} strokeWidth={1.8} /> Responsable : {eh._resp1Par}
                              </span>
                            )}
                            {eh._rhPar && (
                              <span style={{ fontSize: 10, color: "#7c3aed", display: "flex", alignItems: "center", gap: 3 }}>
                                <Award size={9} strokeWidth={1.8} /> RH : {eh._rhPar}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activityLog.length === 0 && (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
                  Aucune activité enregistrée pour ce membre.
                </div>
              )}
            </>
          )}

          {/* ── TAB NOTES RH ───────────────────────────────────────────────────── */}
          {tab === "notes" && (
            <div className="form-2col">

              {/* GAUCHE : Note globale */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-base)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={13} strokeWidth={1.8} /> Note globale
                </div>
                <textarea
                  className="form-input"
                  rows={10}
                  placeholder="Synthèse, évaluation générale, points d'attention…"
                  value={noteGlobale}
                  onChange={e => { setNoteGlobale(e.target.value); setNoteDirty(true); }}
                  style={{ resize: "vertical", fontSize: 12, width: "100%", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    onClick={handleSaveNoteGlobale}
                    disabled={!noteDirty || noteSaving}
                    style={{ padding: "6px 14px", background: noteDirty ? "#0f2d5e" : "var(--bg-alt)", color: noteDirty ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 8, cursor: noteDirty ? "pointer" : "default", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
                  >
                    <Save size={12} strokeWidth={2} /> {noteSaving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>

              {/* DROITE : Commentaires individuels */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-base)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare size={13} strokeWidth={1.8} /> Commentaires ({commentairesRH.length})
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Ajouter un commentaire…"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    style={{ flex: 1, resize: "none", fontSize: 12 }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || saving}
                    style={{ padding: "0 12px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, opacity: !newComment.trim() || saving ? 0.45 : 1, flexShrink: 0 }}
                  >
                    <Send size={12} strokeWidth={2} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", maxHeight: 340, display: "flex", flexDirection: "column", gap: 8 }}>
                  {commentairesRH.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>Aucun commentaire pour l'instant.</div>
                  ) : (
                    [...commentairesRH].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => {
                      const aColor = getAuthorColor(c.auteur);
                      return (
                        <div key={c.id} style={{ background: "var(--bg-alt)", border: `1px solid ${aColor}22`, borderLeft: `3px solid ${aColor}`, borderRadius: "0 8px 8px 0", padding: "10px 12px" }}>
                          {editingCommentId === c.id ? (
                            <div>
                              <textarea className="form-input" rows={3} value={editingText} onChange={e => setEditingText(e.target.value)} style={{ resize: "vertical", fontSize: 12, marginBottom: 6, width: "100%" }} autoFocus />
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button onClick={() => { setEditingCommentId(null); setEditingText(""); }} style={{ padding: "4px 10px", background: "none", border: "1px solid var(--border-light)", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Annuler</button>
                                <button onClick={() => handleEditComment(c.id)} style={{ padding: "4px 10px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>OK</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: aColor, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {c.auteur.charAt(0)}
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: aColor }}>{c.auteur}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtDate(c.createdAt)}{c.editedAt ? " · modifié" : ""}</span>
                                  {c.auteur === currentUser.nom && (
                                    <>
                                      <button onClick={() => { setEditingCommentId(c.id); setEditingText(c.texte); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex", alignItems: "center" }}><Pencil size={10} strokeWidth={1.8} /></button>
                                      <button onClick={() => handleDeleteComment(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e63946", padding: 0, display: "flex", alignItems: "center" }}><Trash2 size={10} strokeWidth={1.8} /></button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-base)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.texte}</div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CONGÉS */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const conges = Array.isArray(member.conges) ? member.conges : [];
                const active = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
                const upcoming = conges.filter(c => c.debut > today).sort((a, b) => a.debut.localeCompare(b.debut));
                const past = conges.filter(c => c.fin && c.fin < today).sort((a, b) => b.fin.localeCompare(a.fin));
                const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
                return (
                  <div style={{ marginTop: 20, gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Umbrella size={12} strokeWidth={1.8} /> Congés
                      {active && <span style={{ padding: "2px 7px", borderRadius: 8, background: "rgba(249,115,22,0.1)", color: "#f97316", fontSize: 10, textTransform: "none", letterSpacing: 0 }}>En cours</span>}
                    </div>
                    {conges.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Aucun congé déclaré</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {active && (
                          <div style={{ padding: "9px 12px", borderRadius: 9, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.25)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                              <Umbrella size={11} /> En congé actuellement
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              Depuis le {fmt(active.debut)} · {active.fin ? `Retour prévu le ${fmt(active.fin)}` : <strong>Retour non défini</strong>}
                              {active.motif ? ` · ${active.motif}` : ""}
                            </div>
                          </div>
                        )}
                        {upcoming.map(c => (
                          <div key={c.id} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.12)", fontSize: 11, display: "flex", alignItems: "center", gap: 7 }}>
                            <CalendarRange size={11} color="#1a56db" strokeWidth={1.8} />
                            <span style={{ fontWeight: 600, color: "#1a56db" }}>Prévu</span>
                            <span style={{ color: "var(--text-muted)" }}>{fmt(c.debut)}{c.fin ? ` → ${fmt(c.fin)}` : " · durée indéterminée"}{c.motif ? ` · ${c.motif}` : ""}</span>
                          </div>
                        ))}
                        {past.map(c => (
                          <div key={c.id} style={{ padding: "7px 12px", borderRadius: 8, background: "var(--bg-hover)", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7, opacity: 0.75 }}>
                            <CalendarRange size={10} strokeWidth={1.8} />
                            <span>{fmt(c.debut)} <ArrowRight size={9} style={{ display: "inline" }} /> {fmt(c.fin)}{c.motif ? ` · ${c.motif}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* HISTORIQUE COMPLET DES MODIFICATIONS RH + STATUT */}
              {(member.historiqueRH || []).length > 0 && (
                <div style={{ marginTop: 20, gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Activity size={12} strokeWidth={1.8} /> Historique des modifications
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {[...(member.historiqueRH || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20).map(h => {
                      const isStatut = h.type === 'statut';
                      return (
                        <div key={h.id} style={{ fontSize: 11, color: isStatut ? "var(--text-base)" : "var(--text-muted)", display: "flex", gap: 8, padding: isStatut ? "4px 8px" : "2px 0", borderRadius: isStatut ? 6 : 0, background: isStatut ? "rgba(249,115,22,0.05)" : "none", borderLeft: isStatut ? "2px solid #f97316" : "none", paddingLeft: isStatut ? 8 : 0 }}>
                          <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{fmtDate(h.createdAt)}</span>
                          <span style={{ fontWeight: isStatut ? 600 : 400 }}>{h.texte}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
