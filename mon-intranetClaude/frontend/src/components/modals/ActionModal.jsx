// src/components/modals/ActionModal.jsx
import React, { useState, useEffect } from 'react';
import { TYPES_ACTION, STATUTS_ACTION, NIVEAUX_CLASSE, POLES } from '../../data/constants';
import { Pencil, MapPin, X, Plus, Send, Receipt } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { MEMBER_STATUS } from '../ui/StatusIcon';

const STATUT_NDF_COLOR = {
  "Soumise": "#1a56db", "En vérification": "#d97706",
  "Validée": "#16a34a", "Remboursée": "#15803d", "Refusée": "#e63946", "Brouillon": "#94a3b8",
};

const ActionModal = ({ action, onClose, onSave, directory, cycles, onTaskRequest, currentUser, notesFrais = [] }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  // État local pour gérer le formulaire sans polluer App.jsx
  const [form, setForm] = useState(action || {});

  // État pour la demande de tâche
  const emptyReq = { text: "", description: "", space: POLES[0], deadline: "" };
  const [taskReq, setTaskReq] = useState(emptyReq);
  const [showTaskReq, setShowTaskReq] = useState(false);
  const [taskReqSent, setTaskReqSent] = useState(false);

  // Met à jour le formulaire si l'action sélectionnée change
  useEffect(() => {
    if (action) setForm(action);
  }, [action]);

  // Si on ne passe aucune action, on ne rend rien
  if (!action) return null;

  // Raccourci pour mettre à jour un champ
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Gestion des responsables multiples
  const toggleResponsable = (nom) => {
    setForm((f) => {
      const res = f.responsables || [];
      if (res.includes(nom)) return { ...f, responsables: res.filter(r => r !== nom) };
      return { ...f, responsables: [...res, nom] };
    });
  };

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 650, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        
        {/* En-tête */}
        <div className="modal-header">
          <div className="modal-header-title">
            {form.id ? <><Pencil size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} /> Modifier l'action</> : <><MapPin size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} /> Nouvelle action terrain</>}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* Corps du formulaire */}
        <div className="modal-body" style={{ gap: 20 }}>
          
          <div className="form-2col">
            <div>
              <label className="form-label">Établissement / Structure *</label>
              <input type="text" className="form-input" value={form.etablissement || ""} onChange={(e) => set("etablissement", e.target.value)} placeholder="Ex: Lycée Jean Jaurès" />
            </div>
            <div>
              <label className="form-label">Ville *</label>
              <input type="text" className="form-input" value={form.ville || ""} onChange={(e) => set("ville", e.target.value)} placeholder="Ex: Montreuil" />
            </div>
          </div>

          <div>
            <label className="form-label">Nom dans Coordination <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{form.id ? "(modifiable)" : "(laissez vide pour utiliser le nom de l'établissement)"}</span></label>
            <input
              type="text"
              className="form-input"
              value={form.titreCoordination || ""}
              onChange={(e) => set("titreCoordination", e.target.value)}
              placeholder={form.etablissement ? `Ex: Coordination — ${form.etablissement}` : "Ex: Coordination — Lycée Jean Jaurès"}
            />
          </div>

          <div className="form-3col">
            <div>
              <label className="form-label">Type d'action</label>
              <select className="form-select" value={form.type || TYPES_ACTION[0]} onChange={(e) => set("type", e.target.value)}>
                {TYPES_ACTION.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.statut || STATUTS_ACTION[0]} onChange={(e) => set("statut", e.target.value)}>
                {STATUTS_ACTION.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Cycle scolaire</label>
              <select className="form-select" value={form.cycle || cycles[0]} onChange={(e) => set("cycle", e.target.value)}>
                {cycles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-2col">
            <div>
              <label className="form-label">Date de début</label>
              <input type="date" className="form-input" value={form.date_debut || ""} onChange={(e) => set("date_debut", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Date de fin</label>
              <input type="date" className="form-input" value={form.date_fin || ""} onChange={(e) => set("date_fin", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Responsables (Cité des Chances)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, border: "1px solid var(--border-light)", borderRadius: 8, background: "var(--bg-alt)" }}>
              {directory.map(m => {
                const isSelected = (form.responsables || []).includes(m.nom);
                return (
                  <div key={m.nom} onClick={() => toggleResponsable(m.nom)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`, background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: isSelected ? "#1a56db" : "var(--text-dim)", display: "flex", alignItems: "center", gap: 5 }}>
                    {isSelected ? "✓ " : "+ "}{m.nom}
                    {(() => { const s = MEMBER_STATUS[m.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-3col" style={{ padding: 16, background: "rgba(26,86,219,0.03)", borderRadius: 8, border: "1px dashed rgba(26,86,219,0.2)" }}>
            <div>
              <label className="form-label">Public / Niveau</label>
              <select className="form-select" value={form.type_classe || ""} onChange={(e) => set("type_classe", e.target.value)}>
                <option value="">Sélectionner...</option>
                {NIVEAUX_CLASSE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bénéficiaires (Nb)</label>
              <input type="number" className="form-input" value={form.beneficiaires || ""} onChange={(e) => set("beneficiaires", Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Volume Horaire</label>
              <input type="number" className="form-input" value={form.heures || ""} onChange={(e) => set("heures", Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="form-label">Contact sur place (Nom, Email, Tel)</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="text" className="form-input" placeholder="Nom complet" value={form.contact_nom || ""} onChange={(e) => set("contact_nom", e.target.value)} style={{ flex: "1 1 140px", minWidth: 0 }} />
              <input type="email" className="form-input" placeholder="Email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} style={{ flex: "1 1 160px", minWidth: 0 }} />
              <input type="tel" className="form-input" placeholder="Téléphone" value={form.contact_tel || ""} onChange={(e) => set("contact_tel", e.target.value)} style={{ flex: "1 1 120px", minWidth: 0 }} />
            </div>
          </div>

          <div>
            <label className="form-label">Notes et Observations</label>
            <textarea className="form-input" rows={3} placeholder="Informations importantes sur cette action..." value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} style={{ resize: "vertical" }} />
          </div>

        </div>

        {/* Section demande de tâche (édition uniquement) */}
        {form.id && onTaskRequest && (
          <div style={{ padding: "0 24px 20px 24px" }}>
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
              <button
                className="btn-secondary"
                style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => { setShowTaskReq(v => !v); setTaskReqSent(false); }}
              >
                <Plus size={13} strokeWidth={2} />
                Demander une tâche au pôle
              </button>

              {showTaskReq && (
                <div style={{ marginTop: 14, padding: 16, background: "rgba(26,86,219,0.04)", border: "1px dashed rgba(26,86,219,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nouvelle demande de tâche</div>

                  <div className="form-2col">
                    <div>
                      <label className="form-label">Intitulé de la tâche *</label>
                      <input type="text" className="form-input" placeholder="Ex: Préparer la présentation…" value={taskReq.text} onChange={e => setTaskReq(r => ({ ...r, text: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Pôle concerné</label>
                      <select className="form-select" value={taskReq.space} onChange={e => setTaskReq(r => ({ ...r, space: e.target.value }))}>
                        {POLES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-2col">
                    <div>
                      <label className="form-label">Description (optionnel)</label>
                      <textarea className="form-input" rows={2} placeholder="Détails de la tâche…" value={taskReq.description} onChange={e => setTaskReq(r => ({ ...r, description: e.target.value }))} style={{ resize: "vertical" }} />
                    </div>
                    <div>
                      <label className="form-label">Échéance</label>
                      <input type="date" className="form-input" value={taskReq.deadline} onChange={e => setTaskReq(r => ({ ...r, deadline: e.target.value }))} />
                    </div>
                  </div>

                  {taskReqSent ? (
                    <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      ✓ Demande envoyée au pôle {taskReq.space}
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn-primary"
                        style={{ padding: "8px 16px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => {
                          if (!taskReq.text.trim()) return alert("L'intitulé de la tâche est requis.");
                          onTaskRequest({
                            text: taskReq.text.trim(),
                            description: taskReq.description.trim(),
                            space: taskReq.space,
                            actionId: form.id,
                            requestedBy: currentUser?.nom || "",
                            assignees: [],
                            targetPool: [],
                            deadline: taskReq.deadline || form.date_fin || form.date_debut || "",
                            cycle: form.cycle || "",
                            status: "En attente",
                          });
                          setTaskReqSent(true);
                          setTaskReq(emptyReq);
                        }}
                      >
                        <Send size={12} strokeWidth={2} />
                        Envoyer la demande
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dépenses liées (NDF) */}
        {action?.id && (() => {
          const ndfs = notesFrais.filter(n => n.linkedActionId === action.id);
          if (ndfs.length === 0) return null;
          const total = ndfs.reduce((s, n) => s + Number(n.montant || 0), 0);
          const totalValide = ndfs.filter(n => ["Validée", "Remboursée"].includes(n.statut)).reduce((s, n) => s + Number(n.montant || 0), 0);
          return (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ padding: 16, background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.18)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 5 }}>
                    <Receipt size={12} strokeWidth={1.8} /> Dépenses liées ({ndfs.length})
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 1 }}>Total soumis</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-base)" }}>{total.toFixed(2)} €</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 1 }}>Validé / remboursé</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>{totalValide.toFixed(2)} €</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ndfs.map(n => (
                    <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-light)", fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUT_NDF_COLOR[n.statut] || "#94a3b8", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.description || n.categorie}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>{n.demandeurNom || n.demandeur}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-base)", flexShrink: 0 }}>{Number(n.montant).toFixed(2)} €</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${STATUT_NDF_COLOR[n.statut]}18`, color: STATUT_NDF_COLOR[n.statut], fontWeight: 700, flexShrink: 0 }}>{n.statut}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Pied de page */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => { if(form.etablissement && form.ville) onSave(form); else alert("L'établissement et la ville sont requis."); }}>
            {form.id ? "Mettre à jour" : "Créer l'action"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ActionModal;