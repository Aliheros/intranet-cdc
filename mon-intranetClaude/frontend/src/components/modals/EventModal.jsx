// src/components/modals/EventModal.jsx
import React, { useState, useEffect } from 'react';
import { PROJETS, POLES, STATUTS_ACTION } from '../../data/constants';
import { Pencil, X, Calendar, Trash2, Clock, Zap, Users, Shield, Info } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { parseDuree, formatDuree } from '../../utils/utils';

const TAB_EVENT   = 'event';
const TAB_SEANCES = 'seances';

const EventModal = ({ event, onClose, onSave, actions, cycles, directory = [], onUpdateActionResponsables }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [tab, setTab]               = useState(TAB_EVENT);
  const [form, setForm]             = useState(event || {});
  const [newSeance, setNewSeance]   = useState({ date: "", heure: "", libelle: "", duree: "", aVenir: "" });
  const [newResponsable, setNewResponsable]   = useState("");
  const [actionResponsables, setActionResponsables] = useState([]);
  const [newEquipeMember, setNewEquipeMember] = useState("");

  useEffect(() => {
    if (event) {
      setForm(event);
      const linkedAction = event.actionId ? actions.find(a => a.id === event.actionId) : null;
      setActionResponsables(linkedAction?.responsables || []);
      setNewResponsable("");
      setNewEquipeMember("");
    }
  }, [event]);

  if (!event) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePole = (p) => {
    setForm(f => {
      const poles = f.poles || [];
      return poles.includes(p)
        ? { ...f, poles: poles.filter(x => x !== p) }
        : { ...f, poles: [...poles, p] };
    });
  };

  const addEquipeMember = () => {
    if (!newEquipeMember) return;
    setForm(f => {
      const equipe = f.equipe || [];
      if (equipe.includes(newEquipeMember)) return f;
      return { ...f, equipe: [...equipe, newEquipeMember] };
    });
    setNewEquipeMember("");
  };

  const removeEquipeMember = (nom) => {
    setForm(f => {
      const newEquipe = (f.equipe || []).filter(n => n !== nom);
      const newResp   = f.responsableNom === nom ? "" : f.responsableNom;
      return { ...f, equipe: newEquipe, responsableNom: newResp };
    });
  };

  const addSeance = () => {
    if (!newSeance.date || !newSeance.libelle) {
      alert("Date et titre de séance requis");
      return;
    }
    const dureeNum = parseDuree(newSeance.duree);
    setForm(f => ({
      ...f,
      seances: [...(f.seances || []), {
        id: Date.now(),
        date: newSeance.date,
        heure: newSeance.heure,
        libelle: newSeance.libelle,
        duree: dureeNum,
        aVenir: newSeance.aVenir || "",
        inscrits: [],
        bilan: "",
        fichiers: [],
      }],
    }));
    setNewSeance({ date: "", heure: "", libelle: "", duree: "", aVenir: "" });
  };

  const deleteSeance = (id) => setForm(f => ({ ...f, seances: (f.seances || []).filter(s => s.id !== id) }));

  const updateSeance = (id, updates) =>
    setForm(f => ({ ...f, seances: (f.seances || []).map(s => s.id === id ? { ...s, ...updates } : s) }));

  const equipe             = form.equipe        || [];
  const responsables       = form.responsables  || [];
  const availableForEquipe = directory.map(m => m.nom).filter(n => !equipe.includes(n));

  const toggleResponsable = (nom) => {
    setForm(f => {
      const resp = f.responsables || [];
      const newResp = resp.includes(nom) ? resp.filter(r => r !== nom) : [...resp, nom];
      // Si on retire quelqu'un qui était responsableNom, le désigner aussi
      const newRespNom = !newResp.includes(f.responsableNom) ? "" : f.responsableNom;
      return { ...f, responsables: newResp, responsableNom: newRespNom };
    });
  };
  const seances            = form.seances || [];

  const handleSave = () => {
    if (!form.titre) { alert("Le titre est requis."); return; }
    if (equipe.length > 0 && !form.responsableNom) {
      alert("Veuillez désigner un responsable de l'événement (nécessaire pour la validation des présences).");
      return;
    }
    onSave(form);
    if (form.actionId && onUpdateActionResponsables) {
      const linkedAction = actions.find(a => a.id === form.actionId);
      const original     = linkedAction?.responsables || [];
      const changed      = original.length !== actionResponsables.length || actionResponsables.some(r => !original.includes(r));
      if (changed) onUpdateActionResponsables(form.actionId, actionResponsables);
    }
  };

  /* ─────────────── styles ─────────────── */
  const tabBtn = (active) => ({
    flex: 1,
    padding: "9px 0",
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    borderBottom: active ? "2px solid #1a56db" : "2px solid transparent",
    background: "none",
    color: active ? "#1a56db" : "var(--text-dim)",
    cursor: "pointer",
    transition: "color .15s, border-color .15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  });

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div
        className={`modal-box${isClosing ? " is-closing" : ""}`}
        style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-header-title">
            {form.id
              ? <><Pencil size={16} strokeWidth={1.8} /> Modifier l'événement</>
              : <><Zap size={16} strokeWidth={1.8} /> Nouvel événement</>
            }
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
          <button style={tabBtn(tab === TAB_EVENT)} onClick={() => setTab(TAB_EVENT)}>
            <Info size={13} strokeWidth={1.8} /> Événement
          </button>
          <button style={tabBtn(tab === TAB_SEANCES)} onClick={() => setTab(TAB_SEANCES)}>
            <Calendar size={13} strokeWidth={1.8} /> Séances
            {seances.length > 0 && (
              <span style={{ fontSize: 10, background: tab === TAB_SEANCES ? "#1a56db" : "var(--text-dim)", color: "#fff", borderRadius: 10, padding: "1px 6px", marginLeft: 2 }}>
                {seances.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="modal-body" style={{ gap: 16, overflowY: "auto", flex: 1 }}>

          {/* ════════════ TAB ÉVÉNEMENT ════════════ */}
          {tab === TAB_EVENT && (
            <>
              {/* Titre */}
              <div>
                <label className="form-label">Titre de l'événement *</label>
                <input type="text" className="form-input" value={form.titre || ""} onChange={e => set("titre", e.target.value)} placeholder="Ex: Réunion de lancement" />
              </div>

              {/* Date + Lieu */}
              <div className="form-2col">
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date || ""} onChange={e => set("date", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Lieu</label>
                  <input type="text" className="form-input" value={form.lieu || ""} onChange={e => set("lieu", e.target.value)} placeholder="Visio, Paris…" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description (optionnel)</label>
                <textarea className="form-input" value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Objectifs, contexte, informations pratiques…" style={{ resize: "vertical", minHeight: 60, fontSize: 12 }} />
              </div>

              {/* Statut + Cycle */}
              <div className="form-2col">
                <div>
                  <label className="form-label">Statut</label>
                  <select className="form-select" value={form.statut || STATUTS_ACTION[0]} onChange={e => set("statut", e.target.value)}>
                    {STATUTS_ACTION.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Cycle</label>
                  <select className="form-select" value={form.cycle || cycles[0]} onChange={e => set("cycle", e.target.value)}>
                    {cycles.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Action liée */}
              <div>
                <label className="form-label">Action terrain liée (optionnel)</label>
                <select className="form-select" value={form.actionId || ""} onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  set("actionId", id);
                  const linked = id ? actions.find(a => a.id === id) : null;
                  setActionResponsables(linked?.responsables || []);
                  setNewResponsable("");
                }}>
                  <option value="">— Aucune action liée —</option>
                  {actions.filter(a => !a.isArchived).map(a => (
                    <option key={a.id} value={a.id}>{a.etablissement} ({a.ville})</option>
                  ))}
                </select>
              </div>

              {/* Projet + Pôles */}
              <div>
                <label className="form-label">Projet rattaché (optionnel)</label>
                <select className="form-select" value={form.projet || ""} onChange={e => set("projet", e.target.value)}>
                  <option value="">— Aucun —</option>
                  {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Pôles impliqués</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {POLES.map(p => {
                    const isSelected = (form.poles || []).includes(p);
                    return (
                      <div key={p} onClick={() => togglePole(p)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`, background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: isSelected ? "#1a56db" : "var(--text-dim)" }}>
                        {isSelected ? "✓ " : "+ "}{p}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── ÉQUIPE ── */}
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, marginTop: 4 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={13} strokeWidth={1.8} /> Équipe de l'événement
                </label>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Cliquez sur <Shield size={10} strokeWidth={2} style={{ verticalAlign: "middle", margin: "0 2px" }} /> pour désigner/retirer un gestionnaire de l'évènement.
                </div>

                {equipe.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {equipe.map(nom => {
                      const isResp = responsables.includes(nom);
                      const isRespNom = nom === form.responsableNom;
                      return (
                        <span key={nom} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: isRespNom ? "rgba(22,163,74,0.12)" : isResp ? "rgba(26,86,219,0.08)" : "var(--bg-alt)", color: isRespNom ? "#16a34a" : isResp ? "#1a56db" : "var(--text-dim)", padding: "3px 10px", borderRadius: 20, border: `1px solid ${isRespNom ? "rgba(22,163,74,0.3)" : isResp ? "rgba(26,86,219,0.2)" : "var(--border-light)"}`, fontWeight: isResp ? 600 : 400 }}>
                          {isRespNom && <Shield size={9} strokeWidth={2} />}
                          {nom}
                          <button
                            type="button"
                            title={isResp ? "Retirer des responsables" : "Désigner comme responsable"}
                            onClick={() => toggleResponsable(nom)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: isResp ? "#1a56db" : "var(--text-muted)", padding: 0, lineHeight: 1, display: "flex", alignItems: "center", opacity: 0.8 }}
                          ><Shield size={9} strokeWidth={2} /></button>
                          <button type="button" onClick={() => removeEquipeMember(nom)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>Aucun membre dans l'équipe.</div>
                )}

                {availableForEquipe.length > 0 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <select className="form-select" value={newEquipeMember} onChange={e => setNewEquipeMember(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                      <option value="">— Ajouter un membre —</option>
                      {availableForEquipe.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button type="button" className="btn-primary" style={{ padding: "6px 14px", fontSize: 11, whiteSpace: "nowrap" }} disabled={!newEquipeMember} onClick={addEquipeMember}>+ Ajouter</button>
                  </div>
                )}
              </div>

              {/* ── RESPONSABLE VALIDATION PRÉSENCES ── */}
              {responsables.length > 0 && (
                <div style={{ background: form.responsableNom ? "rgba(22,163,74,0.06)" : "rgba(217,119,6,0.06)", border: `1px solid ${form.responsableNom ? "rgba(22,163,74,0.2)" : "rgba(217,119,6,0.3)"}`, borderRadius: 8, padding: "12px 14px" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, color: form.responsableNom ? "#16a34a" : "#d97706", marginBottom: 8 }}>
                    <Shield size={13} strokeWidth={2} />
                    Responsable validation présences *
                    <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>— parmi les responsables</span>
                  </label>
                  <select className="form-select" value={form.responsableNom || ""} onChange={e => set("responsableNom", e.target.value)} style={{ fontSize: 12, borderColor: form.responsableNom ? "rgba(22,163,74,0.4)" : "#d97706" }}>
                    <option value="">— Choisir —</option>
                    {responsables.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {!form.responsableNom && (
                    <div style={{ fontSize: 10, color: "#d97706", marginTop: 6 }}>⚠ Requis pour la validation des heures bénévoles.</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════ TAB SÉANCES ════════════ */}
          {tab === TAB_SEANCES && (
            <>
              {/* Formulaire ajout séance */}
              <div style={{ background: "var(--bg-hover)", padding: 14, borderRadius: 8, border: "1px solid var(--border-light)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={13} strokeWidth={1.8} /> Nouvelle séance
                </div>
                <div className="form-2col" style={{ gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Date *</label>
                    <input type="date" className="form-input" value={newSeance.date} onChange={e => setNewSeance(s => ({ ...s, date: e.target.value }))} style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Titre *</label>
                    <input type="text" className="form-input" value={newSeance.libelle} onChange={e => setNewSeance(s => ({ ...s, libelle: e.target.value }))} placeholder="Ex: Séance 1 — Découverte" style={{ fontSize: 12 }} />
                  </div>
                </div>
                <div className="form-2col" style={{ gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Heure</label>
                    <input type="text" className="form-input" value={newSeance.heure} onChange={e => setNewSeance(s => ({ ...s, heure: e.target.value }))} placeholder="14h00" style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Durée bénévoles</label>
                    <input type="text" className="form-input" value={newSeance.duree} onChange={e => setNewSeance(s => ({ ...s, duree: e.target.value }))} placeholder="ex: 2h30" style={{ fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>À venir / Contenu prévu</label>
                  <textarea className="form-input" value={newSeance.aVenir} onChange={e => setNewSeance(s => ({ ...s, aVenir: e.target.value }))} placeholder="Travail à faire, objectifs de la séance…" style={{ fontSize: 12, resize: "vertical", minHeight: 48 }} />
                </div>
                <button onClick={addSeance} style={{ marginTop: 10, width: "100%", padding: "7px 12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                  + Ajouter cette séance
                </button>
              </div>

              {/* Liste des séances */}
              {seances.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-dim)", background: "var(--bg-hover)", borderRadius: 6, fontStyle: "italic" }}>
                  Aucune séance planifiée pour cet événement.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {seances.map((s, idx) => (
                    <div key={s.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }}>
                      {/* Séance header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: s.annulee ? "rgba(230,57,70,0.06)" : "var(--bg-hover)", borderBottom: "1px solid var(--border-light)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: s.annulee ? "#e63946" : "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
                          {s.annulee && <span style={{ fontSize: 10, background: "#e63946", color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>ANNULÉE</span>}
                          Séance {idx + 1}
                          {s.inscrits?.length > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>· {s.inscrits.length} inscrit{s.inscrits.length > 1 ? "s" : ""}</span>}
                        </div>
                        <button className="icon-btn danger" onClick={() => deleteSeance(s.id)}><Trash2 size={14} strokeWidth={1.8} /></button>
                      </div>

                      {/* Séance body */}
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Titre + Date + Heure */}
                        <div>
                          <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Titre de la séance</label>
                          <input type="text" className="form-input"
                            value={s.libelle || ""}
                            onChange={e => updateSeance(s.id, { libelle: e.target.value })}
                            style={{ fontSize: 12, fontWeight: 600 }}
                            placeholder="Ex: Séance 1 — Découverte"
                          />
                        </div>
                        <div className="form-2col" style={{ gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Date</label>
                            <input type="date" className="form-input"
                              value={s.date || ""}
                              onChange={e => updateSeance(s.id, { date: e.target.value })}
                              style={{ fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Heure</label>
                            <input type="text" className="form-input"
                              value={s.heure || ""}
                              onChange={e => updateSeance(s.id, { heure: e.target.value })}
                              style={{ fontSize: 12 }}
                              placeholder="14h00"
                            />
                          </div>
                        </div>
                        {/* Durée */}
                        <div>
                          <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Durée (heures bénévoles comptabilisées)</label>
                          <input type="text" className="form-input"
                            defaultValue={formatDuree(s.duree)}
                            onBlur={e => updateSeance(s.id, { duree: parseDuree(e.target.value) })}
                            style={{ fontSize: 12, width: 120 }}
                            placeholder="2h30"
                          />
                        </div>

                        {/* Bilan + À venir */}
                        <div className="form-2col" style={{ gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Bilan de la séance</label>
                            <textarea className="form-input" value={s.bilan || ""} onChange={e => updateSeance(s.id, { bilan: e.target.value })} placeholder="Ce qui a été fait…" style={{ fontSize: 11, resize: "vertical", minHeight: 52 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>À venir / Préparation</label>
                            <textarea className="form-input" value={s.aVenir || ""} onChange={e => updateSeance(s.id, { aVenir: e.target.value })} placeholder="Prochain objectif…" style={{ fontSize: 11, resize: "vertical", minHeight: 52 }} />
                          </div>
                        </div>

                        {/* Annulation */}
                        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                            <input type="checkbox" checked={!!s.annulee} onChange={e => updateSeance(s.id, { annulee: e.target.checked, commentaireAnnulation: e.target.checked ? (s.commentaireAnnulation || "") : "" })} style={{ width: 14, height: 14, accentColor: "#e63946" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.annulee ? "#e63946" : "var(--text-dim)" }}>Séance annulée</span>
                          </label>
                          {s.annulee && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              <select className="form-input" value={s.raisonAnnulation || ""} onChange={e => updateSeance(s.id, { raisonAnnulation: e.target.value })} style={{ fontSize: 11, borderColor: "#fca5a5", background: "#fff5f5" }}>
                                <option value="">— Raison principale —</option>
                                <option>Indisponibilité établissement</option>
                                <option>Indisponibilité bénévoles</option>
                                <option>Problème logistique</option>
                                <option>Report</option>
                                <option>Météo</option>
                                <option>Autre</option>
                              </select>
                              <textarea className="form-input" value={s.commentaireAnnulation || ""} onChange={e => updateSeance(s.id, { commentaireAnnulation: e.target.value })} placeholder="Détails (optionnel)" style={{ fontSize: 11, resize: "vertical", minHeight: 40, borderColor: "#fca5a5", background: "#fff5f5" }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
