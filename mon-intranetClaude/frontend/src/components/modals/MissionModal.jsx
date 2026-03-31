// src/components/modals/MissionModal.jsx
import React, { useState, useEffect } from 'react';
import { POLES, PROJETS } from '../../data/constants';
import { Pencil, Target, X, Link2 } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const TYPES_MISSION = ["Mission ponctuelle", "Poste annuel", "Bénévolat", "Stage", "Alternance", "Recrutement CDI/CDD"];
const URGENCES = [
  { val: "haute", label: "Urgent", color: "#e63946" },
  { val: "normale", label: "Normal", color: "#d97706" },
  { val: "basse", label: "Non urgent", color: "#16a34a" },
];
const COMPETENCES_PREDEFINIES = [
  "Animation", "Rédaction", "Canva", "Excel", "Communication", "Organisation",
  "Pédagogie", "Contact jeunes", "Vidéo", "Réseaux Sociaux",
  "Recherche de fonds", "Comptabilité", "Logistique", "Programmation",
  "Événementiel", "B2B", "Analyse de données",
];

const MissionModal = ({ mission, onClose, onSave, currentUser, actions = [] }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [form, setForm] = useState({
    titre: "", pole: currentUser?.pole || "", projet: "", type: "Mission ponctuelle",
    description: "", competences: [], duree: "", urgence: "normale",
    statut: "Ouvert", responsable: currentUser?.nom || "",
    dateDebut: "", dateFin: "", linkedActionId: null,
    createdBy: currentUser?.nom, createdAt: new Date().toISOString().split("T")[0],
    candidatures: [],
  });
  const [newComp, setNewComp] = useState("");

  useEffect(() => { if (mission) setForm(mission); }, [mission]);
  if (!mission) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleComp = (c) => setForm(f => ({
    ...f, competences: f.competences.includes(c)
      ? f.competences.filter(x => x !== c)
      : [...f.competences, c]
  }));
  const addComp = () => {
    if (newComp.trim() && !form.competences.includes(newComp.trim())) {
      setForm(f => ({ ...f, competences: [...f.competences, newComp.trim()] }));
      setNewComp("");
    }
  };

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>

        <div className="modal-header">
          <div className="modal-header-title">
            {form.id ? <><Pencil size={16} strokeWidth={1.8} /> Modifier la mission</> : <><Target size={16} strokeWidth={1.8} /> Nouvelle mission / poste</>}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 18 }}>

          {/* Titre */}
          <div>
            <label className="form-label">Titre du poste / de la mission *</label>
            <input type="text" className="form-input" value={form.titre} onChange={e => set("titre", e.target.value)} placeholder="Ex: Coordinateur événements, Graphiste, Intervenant..." />
          </div>

          {/* Type + Pôle + Urgence */}
          <div className="form-3col" style={{ gap: 14 }}>
            <div>
              <label className="form-label">Type de mission</label>
              <select className="form-select" value={form.type} onChange={e => set("type", e.target.value)}>
                {TYPES_MISSION.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Pôle concerné *</label>
              <select className="form-select" value={form.pole} onChange={e => set("pole", e.target.value)}>
                {POLES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Urgence</label>
              <select className="form-select" value={form.urgence} onChange={e => set("urgence", e.target.value)} style={{ color: URGENCES.find(u => u.val === form.urgence)?.color }}>
                {URGENCES.map(u => <option key={u.val} value={u.val}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Projet + Dates + Durée */}
          <div className="form-3col" style={{ gap: 14 }}>
            <div>
              <label className="form-label">Projet lié</label>
              <select className="form-select" value={form.projet} onChange={e => set("projet", e.target.value)}>
                <option value="">Aucun</option>
                {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date de début</label>
              <input type="date" className="form-input" value={form.dateDebut} onChange={e => set("dateDebut", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Date de fin</label>
              <input type="date" className="form-input" value={form.dateFin || ""} onChange={e => set("dateFin", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description détaillée</label>
            <textarea className="form-input" rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Missions confiées, contexte, conditions, niveau requis..." style={{ resize: "vertical" }} />
          </div>

          {/* Compétences */}
          <div>
            <label className="form-label">Compétences recherchées</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {COMPETENCES_PREDEFINIES.map(c => {
                const on = form.competences.includes(c);
                return (
                  <div key={c} onClick={() => toggleComp(c)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? "#1a56db" : "var(--border-light)"}`, background: on ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: on ? "#1a56db" : "var(--text-dim)", transition: "all 0.15s" }}>
                    {on ? "✓ " : ""}{c}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" className="form-input" value={newComp} onChange={e => setNewComp(e.target.value)} placeholder="Ajouter une compétence personnalisée..." style={{ fontSize: 12 }} onKeyDown={e => e.key === "Enter" && addComp()} />
              <button onClick={addComp} className="btn-primary" style={{ padding: "0 14px", flexShrink: 0 }}>+</button>
            </div>
            {form.competences.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {form.competences.map(c => (
                  <span key={c} onClick={() => toggleComp(c)} style={{ fontSize: 11, background: "rgba(26,86,219,0.1)", color: "#1a56db", padding: "2px 10px", borderRadius: 12, cursor: "pointer" }}>
                    {c} ✕
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lien action terrain */}
          <div>
            <label className="form-label">Action terrain liée (optionnel)</label>
            <select className="form-select" value={form.linkedActionId || ""} onChange={e => set("linkedActionId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Aucune action liée</option>
              {actions.filter(a => !a.isArchived).map(a => (
                <option key={a.id} value={a.id}>{a.etablissement} ({a.ville})</option>
              ))}
            </select>
          </div>

          {/* Info intégration */}
          <div style={{ padding: 12, background: "rgba(26,86,219,0.04)", border: "1px dashed rgba(26,86,219,0.2)", borderRadius: 8, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: "#1a56db", display: "inline-flex", alignItems: "center", gap: 4 }}><Link2 size={13} strokeWidth={1.8} /> Intégration automatique :</span> La mission sera visible sur le tableau de bord de tous les membres. Une notification sera envoyée au pôle <strong>{form.pole}</strong>. Si une action terrain est liée, une entrée sera ajoutée à sa timeline.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => { if (form.titre && form.pole) onSave(form); else alert("Titre et pôle requis."); }}>
            {form.id ? "Mettre à jour" : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Target size={15} strokeWidth={1.8} /> Publier la mission</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionModal;
