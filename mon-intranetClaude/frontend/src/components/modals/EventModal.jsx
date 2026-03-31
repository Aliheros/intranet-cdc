// src/components/modals/EventModal.jsx
import React, { useState, useEffect } from 'react';
import { PROJETS, POLES, STATUTS_ACTION } from '../../data/constants';
import { Pencil, X, Calendar, Trash2, ClipboardList, FileText, Clock, Zap, Users } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const EventModal = ({ event, onClose, onSave, actions, cycles, directory = [], onUpdateActionResponsables }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [form, setForm] = useState(event || {});
  const [newSeance, setNewSeance] = useState({ date: "", heure: "", libelle: "", duree: "", aVenir: "", bilan: "" });
  const [newResponsable, setNewResponsable] = useState("");
  const [actionResponsables, setActionResponsables] = useState([]);

  useEffect(() => {
    if (event) {
      setForm(event);
      const linkedAction = event.actionId ? actions.find(a => a.id === event.actionId) : null;
      setActionResponsables(linkedAction?.responsables || []);
      setNewResponsable("");
    }
  }, [event]);
  if (!event) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const togglePole = (p) => {
    setForm((f) => {
      const poles = f.poles || [];
      if (poles.includes(p)) return { ...f, poles: poles.filter(x => x !== p) };
      return { ...f, poles: [...poles, p] };
    });
  };

  const addSeance = () => {
    if (!newSeance.date || !newSeance.libelle) {
      alert("Date et titre de séance requis");
      return;
    }
    setForm((f) => ({
      ...f,
      seances: [...(f.seances || []), { 
        id: Date.now(), 
        date: newSeance.date,
        heure: newSeance.heure,
        libelle: newSeance.libelle,
        duree: newSeance.duree || "",
        aVenir: newSeance.aVenir || "",
        inscrits: [], 
        bilan: "", 
        fichiers: []
      }]
    }));
    setNewSeance({ date: "", heure: "", libelle: "", duree: "", aVenir: "", bilan: "" });
  };

  const deleteSeance = (seanceId) => {
    setForm((f) => ({
      ...f,
      seances: (f.seances || []).filter((s) => s.id !== seanceId)
    }));
  };

  const updateSeance = (seanceId, updates) => {
    setForm((f) => ({
      ...f,
      seances: (f.seances || []).map((s) =>
        s.id === seanceId ? { ...s, ...updates } : s
      )
    }));
  };

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-title">
            {form.id ? <><Pencil size={16} strokeWidth={1.8} /> Modifier l'événement</> : <><Zap size={16} strokeWidth={1.8} /> Nouvel événement</>}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          <div>
            <label className="form-label">Titre de l'événement *</label>
            <input type="text" className="form-input" value={form.titre || ""} onChange={(e) => set("titre", e.target.value)} placeholder="Ex: Réunion de lancement" />
          </div>

          <div className="form-2col">
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date || ""} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Lieu</label>
              <input type="text" className="form-input" value={form.lieu || ""} onChange={(e) => set("lieu", e.target.value)} placeholder="Ex: Visio ou Paris" />
            </div>
          </div>

          <div>
            <label className="form-label">Description (Optionnel)</label>
            <textarea className="form-input" value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Objectifs, contexte, informations pratiques…" style={{ resize: "vertical", minHeight: 60, fontSize: 12 }} />
          </div>

          <div className="form-2col">
            <div>
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.statut || STATUTS_ACTION[0]} onChange={(e) => set("statut", e.target.value)}>
                {STATUTS_ACTION.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Cycle</label>
              <select className="form-select" value={form.cycle || cycles[0]} onChange={(e) => set("cycle", e.target.value)}>
                {cycles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Action terrain liée (Optionnel)</label>
            <select className="form-select" value={form.actionId || ""} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              set("actionId", id);
              const linked = id ? actions.find(a => a.id === id) : null;
              setActionResponsables(linked?.responsables || []);
              setNewResponsable("");
            }}>
              <option value="">-- Aucune action liée --</option>
              {actions.filter(a => !a.isArchived).map(a => (
                <option key={a.id} value={a.id}>{a.etablissement} ({a.ville})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Projet rattaché (Optionnel)</label>
            <select className="form-select" value={form.projet || ""} onChange={(e) => set("projet", e.target.value)}>
              <option value="">-- Aucun --</option>
              {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Pôles impliqués</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {POLES.map(p => {
                const isSelected = (form.poles || []).includes(p);
                return (
                  <div key={p} onClick={() => togglePole(p)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`, background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: isSelected ? "#1a56db" : "var(--text-dim)" }}>
                    {isSelected ? "✓ " : "+ "}{p}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RESPONSABLES DE L'ACTION LIÉE */}
          {form.actionId && (
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, marginTop: 4 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={13} strokeWidth={1.8} /> Responsables de l'action liée</label>
              {actionResponsables.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>Aucun responsable désigné.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {actionResponsables.map((nom, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, background: "rgba(26,86,219,0.08)", color: "#1a56db", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(26,86,219,0.2)", fontWeight: 600 }}>
                      {nom}
                      <button
                        type="button"
                        onClick={() => setActionResponsables(prev => prev.filter(r => r !== nom))}
                        style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1, marginLeft: 2 }}
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
              {directory.length > 0 && (() => {
                const available = directory.map(m => m.nom).filter(n => !actionResponsables.includes(n));
                if (available.length === 0) return null;
                return (
                  <div style={{ display: "flex", gap: 6 }}>
                    <select className="form-select" value={newResponsable} onChange={e => setNewResponsable(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                      <option value="">— Ajouter un responsable —</option>
                      {available.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "6px 14px", fontSize: 11, whiteSpace: "nowrap" }}
                      disabled={!newResponsable}
                      onClick={() => { if (newResponsable) { setActionResponsables(prev => [...prev, newResponsable]); setNewResponsable(""); } }}
                    >+ Ajouter</button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* GESTION DES SÉANCES */}
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, marginTop: 16 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} strokeWidth={1.8} /> Calendrier des séances</label>
            
            {/* Ajouter une séance */}
            <div style={{ background: "var(--bg-hover)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div className="form-2col" style={{ gap: 8, marginBottom: 8 }}>
                <div>
                  <input type="date" className="form-input" value={newSeance.date} onChange={(e) => setNewSeance((s) => ({ ...s, date: e.target.value }))} placeholder="Date" style={{ fontSize: 12 }} />
                </div>
                <div>
                  <input type="text" className="form-input" value={newSeance.libelle} onChange={(e) => setNewSeance((s) => ({ ...s, libelle: e.target.value }))} placeholder="Titre séance *" style={{ fontSize: 12 }} />
                </div>
              </div>
              <div className="form-2col" style={{ gap: 8, marginBottom: 8 }}>
                <div>
                  <input type="text" className="form-input" value={newSeance.heure} onChange={(e) => setNewSeance((s) => ({ ...s, heure: e.target.value }))} placeholder="Heure (ex: 14h00)" style={{ fontSize: 12 }} />
                </div>
                <div>
                  <input type="text" className="form-input" value={newSeance.duree} onChange={(e) => setNewSeance((s) => ({ ...s, duree: e.target.value }))} placeholder="Durée (ex: 2h30)" style={{ fontSize: 12 }} />
                </div>
              </div>
              <textarea className="form-input" value={newSeance.aVenir} onChange={(e) => setNewSeance((s) => ({ ...s, aVenir: e.target.value }))} placeholder="À venir (contenu/travail à faire)" style={{ fontSize: 12, resize: "vertical", minHeight: 50 }} />
              <button onClick={addSeance} style={{ marginTop: 8, width: "100%", padding: "6px 12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                + Ajouter séance
              </button>
            </div>

            {/* Liste des séances avec édition */}
            {(form.seances || []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto" }}>
                {form.seances.map((s) => (
                  <div key={s.id} style={{ background: "var(--bg-hover)", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.libelle} — {s.date}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
                          {s.heure && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} strokeWidth={1.8} /> {s.heure}</span>} {s.duree && `⏱️ ${s.duree}`}
                        </div>
                      </div>
                      <button className="icon-btn danger" onClick={() => deleteSeance(s.id)}><Trash2 size={14} strokeWidth={1.8} /></button>
                    </div>
                    
                    <div className="form-2col" style={{ gap: 8, marginBottom: 8 }}>
                      <textarea
                        className="form-input"
                        value={s.bilan || ""}
                        onChange={(e) => updateSeance(s.id, { bilan: e.target.value })}
                        placeholder="Bilan de la séance"
                        style={{ fontSize: 11, resize: "vertical", minHeight: 50 }}
                      />
                      <textarea
                        className="form-input"
                        value={s.aVenir || ""}
                        onChange={(e) => updateSeance(s.id, { aVenir: e.target.value })}
                        placeholder="À venir / Préparation"
                        style={{ fontSize: 11, resize: "vertical", minHeight: 50 }}
                      />
                    </div>

                    {/* Annulation */}
                    <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={!!s.annulee}
                          onChange={(e) => updateSeance(s.id, { annulee: e.target.checked, commentaireAnnulation: e.target.checked ? (s.commentaireAnnulation || "") : "" })}
                          style={{ width: 14, height: 14, accentColor: "#e63946" }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.annulee ? "#e63946" : "var(--text-dim)" }}>
                          Séance annulée
                        </span>
                      </label>
                      {s.annulee && (
                        <textarea
                          className="form-input"
                          value={s.commentaireAnnulation || ""}
                          onChange={(e) => updateSeance(s.id, { commentaireAnnulation: e.target.value })}
                          placeholder="Motif d'annulation (ex: intervenants indisponibles, météo…)"
                          style={{ fontSize: 11, resize: "vertical", minHeight: 44, marginTop: 6, borderColor: "#fca5a5", background: "#fff5f5" }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!form.seances || form.seances.length === 0) && (
              <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--text-dim)", background: "var(--bg-hover)", borderRadius: 6 }}>
                Aucune séance ajoutée
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => {
            if (!form.titre) { alert("Le titre est requis."); return; }
            onSave(form);
            if (form.actionId && onUpdateActionResponsables) {
              const linkedAction = actions.find(a => a.id === form.actionId);
              const original = linkedAction?.responsables || [];
              const changed = original.length !== actionResponsables.length || actionResponsables.some(r => !original.includes(r));
              if (changed) onUpdateActionResponsables(form.actionId, actionResponsables);
            }
          }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;