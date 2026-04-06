// src/components/modals/NoteFraisModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { PROJETS, POLES } from '../../data/constants';
import { X, AlertTriangle, ClipboardList, Upload, Eye, Paperclip, Search, Settings, FileText, Receipt, Image, Camera, Car, Trash2 } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { StatusBadge, NDF_STATUS } from '../ui/StatusIcon';

const CATEGORIES = ["Transport", "Hébergement", "Repas", "Fournitures", "Matériel pédagogique", "Communication", "Autre"];
const STATUTS_NDF = ["Brouillon", "Soumise", "En vérification", "Validée", "Remboursée", "Refusée"];
const STATUT_COLORS = {
  "Brouillon":       { bg: "var(--bg-alt)",            c: "var(--text-muted)" },
  "Soumise":         { bg: "rgba(26,86,219,0.1)",      c: "#1a56db" },
  "En vérification": { bg: "rgba(217,119,6,0.1)",      c: "#d97706" },
  "Validée":         { bg: "rgba(22,163,74,0.1)",       c: "#16a34a" },
  "Remboursée":      { bg: "rgba(22,163,74,0.15)",      c: "#15803d" },
  "Refusée":         { bg: "rgba(230,57,70,0.1)",       c: "#e63946" },
};
const BAREMES_KM = { voiture: 0.502, moto: 0.315 };

// ── Helpers fichier ───────────────────────────────────────────────────────────
const getJustifName = (j) => {
  if (!j) return null;
  if (typeof j === "string") return j;
  return j.name || null;
};
const getJustifDataUrl = (j) => {
  if (!j || typeof j === "string") return null;
  return j.dataUrl || null;
};
const isImageFile = (j) => /\.(jpg|jpeg|png|gif|webp)$/i.test(getJustifName(j) || "");
const isPdfFile  = (j) => /\.pdf$/i.test(getJustifName(j) || "");

const STATUT_META_MODAL = {
  "Brouillon":       { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  "Soumise":         { color: "#1a56db", bg: "rgba(26,86,219,0.1)" },
  "En vérification": { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  "Validée":         { color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  "Remboursée":      { color: "#15803d", bg: "rgba(21,128,61,0.12)" },
  "Refusée":         { color: "#e63946", bg: "rgba(230,57,70,0.1)" },
};

const NoteFraisModal = ({
  ndf, onClose, onSave, onUpdateStatus, onSignalJustificatifProblem,
  currentUser, actions = [], canManage = false, ndfConfig, notesFrais = [],
  onDelete, onRequestDeletion, onRejectDeletion,
}) => {
  const categories = ndfConfig?.categories?.map(c => c.label).filter(Boolean) || CATEGORIES;
  const { isClosing, handleClose } = useModalClose(onClose);
  const [form, setForm] = useState({
    demandeur: currentUser?.nom || "",
    date: new Date().toISOString().split("T")[0],
    categorie: "Transport",
    montant: "",
    description: "",
    justificatif: null,
    projet: "",
    pole: currentUser?.pole || "",
    linkedActionId: null,
    statut: "Brouillon",
    historique: [],
    justificatifProblem: null,
  });
  const [useKm, setUseKm] = useState(false);
  const [km, setKm] = useState({ depart: "", arrivee: "", distance: "", vehicule: "voiture" });
  const [tresoCmt, setTresoCmt] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemDesc, setProblemDesc] = useState("");
  const [justifPreviewOpen, setJustifPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  useEffect(() => {
    if (ndf) { setForm(ndf); setNewStatus(ndf.statut); }
  }, [ndf]);

  if (!ndf) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !ndf.id;
  const isEditable = isNew || form.statut === "Brouillon";
  const canReplaceJustif = !isEditable && form.statut === "En vérification" && form.justificatifProblem;
  const isManaging = canManage && !isNew && form.statut !== "Brouillon";

  const calcKm = () => {
    const dist = parseFloat(km.distance) || 0;
    if (!dist) return;
    const montant = parseFloat((dist * 2 * BAREMES_KM[km.vehicule]).toFixed(2));
    setForm(f => ({
      ...f, montant,
      description: `Trajet ${km.depart || "?"} → ${km.arrivee || "?"} (${dist}km A/R, barème ${km.vehicule} ${BAREMES_KM[km.vehicule]}€/km)`,
    }));
  };

  const readFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => callback({ name: file.name, type: file.type, dataUrl: e.target.result });
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e, isReplace = false) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Fichier trop lourd (max 5 Mo)"); return; }
    readFile(file, (justif) => {
      if (isReplace) {
        setForm(f => ({ ...f, justificatif: justif, justificatifProblem: null, statut: "Soumise" }));
      } else {
        set("justificatif", justif);
      }
    });
  };

  const handleSignalProblem = () => {
    if (!problemDesc.trim()) { alert("Veuillez décrire le problème."); return; }
    onSignalJustificatifProblem && onSignalJustificatifProblem(form.id, problemDesc.trim());
    setShowProblemForm(false);
    setProblemDesc("");
  };

  const justifName = getJustifName(form.justificatif);
  const justifDataUrl = getJustifDataUrl(form.justificatif);

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 660, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-header-title">
              <Receipt size={16} strokeWidth={1.8} /> {isNew ? "Nouvelle note de frais" : form.numeroDossier}
            </div>
            {!isNew && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Par {form.demandeurNom || form.demandeur} · {new Date(form.createdAt).toLocaleDateString("fr-FR")}</span>
                <StatusBadge map={NDF_STATUS} value={form.statut} size={11} />
              </div>
            )}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Bannière problème justificatif — vue utilisateur */}
          {form.justificatifProblem && !canManage && (
            <div style={{ background: "rgba(230,57,70,0.07)", border: "1.5px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ display: "inline-flex", color: "#e63946" }}><AlertTriangle size={16} strokeWidth={1.8} /></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e63946" }}>Justificatif non conforme — action requise</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-base)", marginBottom: 10, lineHeight: 1.6 }}>
                <strong>Problème signalé par la trésorerie :</strong><br />
                {form.justificatifProblem.description}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
                Signalé par {form.justificatifProblem.reportedBy} · {new Date(form.justificatifProblem.reportedAt).toLocaleDateString("fr-FR")}
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", background: "#e63946", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                <Upload size={13} strokeWidth={1.8} /> Remplacer le justificatif
                <input ref={replaceFileInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => handleFileChange(e, true)} />
              </label>
            </div>
          )}

          {/* Mes dernières demandes — visible uniquement en mode création */}
          {isNew && (() => {
            const mesNdf = notesFrais.filter(n => (n.demandeurNom || n.demandeur) === currentUser?.nom).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5);
            const pending = mesNdf.filter(n => ["Soumise", "En vérification"].includes(n.statut));
            if (mesNdf.length === 0) return null;
            return (
              <div style={{ background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.12)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <Receipt size={11} strokeWidth={1.8} /> Vos dernières demandes
                  {pending.length > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "rgba(217,119,6,0.12)", color: "#d97706", fontWeight: 700 }}>
                      {pending.length} en attente
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {mesNdf.map(n => {
                    const meta = STATUT_META_MODAL[n.statut] || STATUT_META_MODAL["Brouillon"];
                    return (
                      <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0, minWidth: 60 }}>
                          {new Date(n.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--text-base)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.description || n.categorie}
                        </span>
                        <span style={{ fontWeight: 800, color: meta.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {Number(n.montant).toFixed(2)} €
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: "nowrap", flexShrink: 0, fontSize: 10 }}>
                          <StatusBadge map={NDF_STATUS} value={n.statut} size={10} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Historique */}
          {!isNew && (form.historique || []).length > 0 && (
            <div style={{ background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.12)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}><ClipboardList size={11} strokeWidth={1.8} /> Historique de traitement</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(form.historique || []).map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                    <span style={{ padding: "1px 8px", borderRadius: 12, fontWeight: 700, background: STATUT_COLORS[h.statut]?.bg || "var(--bg-alt)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      <StatusBadge map={NDF_STATUS} value={h.statut} size={10} />
                    </span>
                    {h.commentaire && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>· {h.commentaire}</span>}
                    <span style={{ color: "var(--text-muted)", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>par {h.auteur}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catégorie + Date */}
          <div className="form-2col">
            <div>
              <label className="form-label">Catégorie *</label>
              <select className="form-select" value={form.categorie} onChange={e => set("categorie", e.target.value)} disabled={!isEditable}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(() => {
                const catCfg = ndfConfig?.categories?.find(c => c.label === form.categorie);
                if (!catCfg) return null;
                return (<>
                  {catCfg.note && <div style={{ fontSize: 11, color: "#1a56db", marginTop: 5, lineHeight: 1.4 }}>{catCfg.note}</div>}
                  {catCfg.plafond && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Plafond : <strong>{catCfg.plafond} €</strong></div>}
                </>);
              })()}
            </div>
            <div>
              <label className="form-label">Date de la dépense *</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set("date", e.target.value)} disabled={!isEditable} />
            </div>
          </div>

          {/* Calcul kilométrique */}
          {form.categorie === "Transport" && isEditable && (
            <div style={{ background: "var(--bg-alt)", padding: 14, borderRadius: 8, border: "1px dashed rgba(26,86,219,0.2)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: useKm ? 12 : 0 }}>
                <input type="checkbox" checked={useKm} onChange={e => setUseKm(e.target.checked)} />
                <Car size={13} strokeWidth={1.8} /> Calculer par kilométrage (barème fiscal)
              </label>
              {useKm && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <input className="form-input" placeholder="Ville départ" style={{ fontSize: 12 }} value={km.depart} onChange={e => setKm(k => ({ ...k, depart: e.target.value }))} />
                    <input className="form-input" placeholder="Ville arrivée" style={{ fontSize: 12 }} value={km.arrivee} onChange={e => setKm(k => ({ ...k, arrivee: e.target.value }))} />
                    <input className="form-input" placeholder="km" type="number" style={{ fontSize: 12 }} value={km.distance} onChange={e => setKm(k => ({ ...k, distance: e.target.value }))} />
                    <select className="form-select" style={{ fontSize: 11 }} value={km.vehicule} onChange={e => setKm(k => ({ ...k, vehicule: e.target.value }))}>
                      <option value="voiture">Voiture</option>
                      <option value="moto">Moto</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={calcKm} style={{ padding: "6px 16px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                      Calculer → {km.distance ? `${(parseFloat(km.distance) * 2 * BAREMES_KM[km.vehicule]).toFixed(2)} €` : ""}
                    </button>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Barème {km.vehicule} : {BAREMES_KM[km.vehicule]}€/km × 2 trajets</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Montant + Description */}
          <div className="form-2col">
            <div>
              <label className="form-label">Montant (€) *</label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.montant} onChange={e => set("montant", parseFloat(e.target.value) || "")} disabled={!isEditable} style={{ fontSize: 18, fontWeight: 800, color: "#1a56db" }} />
            </div>
            <div>
              <label className="form-label">Objet de la dépense *</label>
              <input type="text" className="form-input" value={form.description} onChange={e => set("description", e.target.value)} disabled={!isEditable} placeholder="Décrivez précisément la dépense..." />
            </div>
          </div>

          {/* Imputation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="form-3col" style={{ gap: 14 }}>
              <div>
                <label className="form-label">Action terrain liée</label>
                <select className="form-select" value={form.linkedActionId || ""} onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const action = id ? actions.find(a => a.id === id) : null;
                  setForm(f => ({
                    ...f,
                    linkedActionId: id,
                    pole: action ? (action.poles?.[0] || f.pole) : f.pole,
                    projet: action ? (action.projet || f.projet) : f.projet,
                  }));
                }} disabled={!isEditable}>
                  <option value="">Aucune action</option>
                  {actions.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.etablissement}{a.ville ? ` — ${a.ville}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Pôle</label>
                <select className="form-select" value={form.pole} onChange={e => set("pole", e.target.value)} disabled={!isEditable}>
                  <option value="">Aucun pôle</option>
                  {POLES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Projet</label>
                <select className="form-select" value={form.projet} onChange={e => set("projet", e.target.value)} disabled={!isEditable}>
                  <option value="">Aucun projet</option>
                  {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {form.linkedActionId && (() => {
              const a = actions.find(x => x.id === Number(form.linkedActionId));
              return a ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(26,86,219,0.05)", border: "1px solid rgba(26,86,219,0.15)", borderRadius: 8, fontSize: 11, color: "#1a56db" }}>
                  <ClipboardList size={12} strokeWidth={1.8} />
                  <span style={{ fontWeight: 700 }}>{a.etablissement}</span>
                  {a.ville && <span style={{ color: "var(--text-muted)" }}>· {a.ville}</span>}
                  {a.cycle && <span style={{ color: "var(--text-muted)" }}>· {a.cycle}</span>}
                </div>
              ) : null;
            })()}
          </div>

          {/* Justificatif — upload (brouillon / nouvelle) */}
          {isEditable && (
            <div>
              <label className="form-label">Justificatif (photo, PDF)</label>
              <div style={{ border: "2px dashed var(--border-light)", borderRadius: 8, padding: "16px 20px", textAlign: "center", background: "var(--bg-alt)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {justifName ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    <span style={{ fontSize: 20, display: "inline-flex", color: "var(--text-muted)" }}>{isImageFile(form.justificatif) ? <Image size={20} strokeWidth={1.5} /> : <FileText size={20} strokeWidth={1.5} />}</span>
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{justifName}</span>
                    {justifDataUrl && (
                      <button onClick={() => setJustifPreviewOpen(true)} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={11} strokeWidth={1.8} /> Prévisualiser</button>
                    )}
                    <button onClick={() => set("justificatif", null)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", display: "inline-flex" }}><X size={12} strokeWidth={2} /></button>
                  </div>
                ) : (
                  <>
                    <span style={{ opacity: 0.4, display: "inline-flex" }}><Camera size={22} strokeWidth={1.5} /></span>
                    <label style={{ padding: "6px 18px", background: "#1a56db", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      Ajouter un justificatif
                      <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => handleFileChange(e, false)} />
                    </label>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Photo ou PDF · Max 5 Mo</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Justificatif — lecture seule (utilisateur, NDF soumise) */}
          {!isEditable && !canManage && !form.justificatifProblem && justifName && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
              <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{isImageFile(form.justificatif) ? <Image size={18} strokeWidth={1.5} /> : <FileText size={18} strokeWidth={1.5} />}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{justifName}</span>
              {justifDataUrl && (
                <button onClick={() => setJustifPreviewOpen(true)} style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Eye size={11} strokeWidth={1.8} /> Voir
                </button>
              )}
            </div>
          )}

          {/* Justificatif — section trésorerie */}
          {isManaging && (
            <div style={{ padding: 16, background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.15)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a56db", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}><Paperclip size={11} strokeWidth={1.8} /> Justificatif joint</div>
              {justifName ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Aperçu */}
                  {justifDataUrl && isImageFile(form.justificatif) ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={justifDataUrl}
                        alt="Justificatif"
                        style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--border-light)", objectFit: "contain", cursor: "pointer", display: "block" }}
                        onClick={() => setJustifPreviewOpen(true)}
                      />
                      <div
                        onClick={() => setJustifPreviewOpen(true)}
                        style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      ><Search size={10} strokeWidth={1.8} /> Agrandir</div>
                    </div>
                  ) : justifDataUrl && isPdfFile(form.justificatif) ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                      <span style={{ display: "inline-flex", color: "var(--text-muted)" }}><FileText size={24} strokeWidth={1.5} /></span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{justifName}</div>
                        <a href={justifDataUrl} download={justifName} style={{ fontSize: 11, color: "#1a56db", fontWeight: 600 }}>Télécharger</a>
                      </div>
                      <button onClick={() => setJustifPreviewOpen(true)} style={{ marginLeft: "auto", fontSize: 11, padding: "4px 12px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Eye size={11} strokeWidth={1.8} /> Ouvrir
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg-surface)", borderRadius: 8 }}>
                      <span style={{ display: "inline-flex" }}><Paperclip size={16} strokeWidth={1.8} /></span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{justifName}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>(non prévisualisable — ancien format)</span>
                    </div>
                  )}

                  {/* Bouton signaler problème */}
                  {!showProblemForm && !form.justificatifProblem && (
                    <button
                      onClick={() => setShowProblemForm(true)}
                      style={{ alignSelf: "flex-start", padding: "6px 14px", background: "rgba(230,57,70,0.08)", color: "#e63946", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <AlertTriangle size={13} strokeWidth={1.8} /> Signaler un problème avec ce justificatif
                    </button>
                  )}
                  {form.justificatifProblem && (
                    <div style={{ padding: "8px 12px", background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, fontSize: 11, color: "#e63946" }}>
                      Problème déjà signalé : <em>"{form.justificatifProblem.description}"</em>
                    </div>
                  )}

                  {/* Formulaire description du problème */}
                  {showProblemForm && (
                    <div style={{ background: "rgba(230,57,70,0.05)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e63946", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} strokeWidth={1.8} /> Décrivez le problème pour le demandeur</div>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Ex : Le justificatif est illisible, la date est manquante, le montant ne correspond pas à la facture..."
                        value={problemDesc}
                        onChange={e => setProblemDesc(e.target.value)}
                        style={{ resize: "vertical", fontSize: 12 }}
                      />
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        La NDF passera en "En vérification" et le demandeur recevra une notification avec votre description.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={handleSignalProblem}
                          style={{ padding: "7px 16px", background: "#e63946", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                        >
                          <Upload size={13} strokeWidth={1.8} style={{ marginRight: 4 }} /> Envoyer la notification au demandeur
                        </button>
                        <button onClick={() => { setShowProblemForm(false); setProblemDesc(""); }} style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border-light)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "10px 14px", background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 8, fontSize: 12, color: "#e63946", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={1.8} /> Aucun justificatif joint par le demandeur.
                </div>
              )}
            </div>
          )}

          {/* Demande de suppression en attente — alerte trésorerie */}
          {isManaging && form.suppressionDemandee && (
            <div style={{ padding: 14, background: "rgba(230,57,70,0.07)", border: "1.5px solid rgba(230,57,70,0.3)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e63946", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} strokeWidth={2} /> Le demandeur souhaite supprimer cette note de frais
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onDelete && onDelete(form.id)}
                  style={{ padding: "7px 16px", background: "#e63946", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Trash2 size={13} strokeWidth={1.8} /> Approuver et supprimer
                </button>
                <button
                  onClick={() => onRejectDeletion && onRejectDeletion(form.id)}
                  style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border-light)", borderRadius: 8, fontSize: 12, color: "var(--text-dim)", cursor: "pointer", fontWeight: 600 }}
                >
                  Refuser la demande
                </button>
              </div>
            </div>
          )}

          {/* Zone traitement trésorerie */}
          {isManaging && (
            <div style={{ padding: 16, background: "rgba(255,193,7,0.06)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}><Settings size={11} strokeWidth={1.8} /> Traitement trésorerie</div>
              <div className="form-2col" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Nouveau statut</label>
                  <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {STATUTS_NDF.filter(s => s !== "Brouillon").map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Commentaire (optionnel)</label>
                  <input type="text" className="form-input" value={tresoCmt} onChange={e => setTresoCmt(e.target.value)} placeholder="Motif, précision..." />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => onUpdateStatus && onUpdateStatus(form.id, newStatus, tresoCmt)}
                  style={{ padding: "8px 20px", background: "#d97706", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Enregistrer le traitement
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(form.id)}
                    style={{ padding: "8px 16px", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#e63946", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Trash2 size={13} strokeWidth={1.8} /> Supprimer la NDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer-split" style={{ flexWrap: "wrap" }}>
          {/* Gauche : suppression brouillon ou demande de suppression */}
          <div>
            {/* Brouillon : suppression directe (aucune transaction liée) */}
            {!isNew && isEditable && form.statut === "Brouillon" && onDelete && (
              <button
                onClick={() => onDelete(form.id)}
                style={{ padding: "7px 14px", background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#e63946", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={13} strokeWidth={1.8} /> Supprimer le brouillon
              </button>
            )}
            {!isNew && !isEditable && !canManage && !form.suppressionDemandee && onRequestDeletion && (
              <button
                onClick={() => onRequestDeletion(form.id)}
                style={{ padding: "7px 14px", background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#e63946", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={13} strokeWidth={1.8} /> Demander la suppression
              </button>
            )}
            {!isNew && !isEditable && !canManage && form.suppressionDemandee && (
              <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={13} strokeWidth={1.8} /> Suppression en attente de validation
              </span>
            )}
          </div>

          {/* Droite : actions principales */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-secondary" onClick={handleClose}>Fermer</button>
            {isEditable && (
              <>
                <button className="btn-secondary" onClick={() => onSave({ ...form, statut: "Brouillon" })}>Brouillon</button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!form.montant || !form.description) { alert("Montant et description requis."); return; }
                    onSave({ ...form, statut: "Soumise" });
                  }}
                  style={{ background: "#e63946" }}
                >
                  <Upload size={14} strokeWidth={1.8} style={{ marginRight: 6 }} /> Soumettre à la trésorerie
                </button>
              </>
            )}
            {canReplaceJustif && !form.justificatifProblem && (
              <button className="btn-primary" onClick={() => onSave({ ...form, statut: "Soumise" })}>
                <Upload size={14} strokeWidth={1.8} style={{ marginRight: 6 }} /> Resoumettre avec le nouveau justificatif
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prévisualisation plein écran */}
      {justifPreviewOpen && justifDataUrl && (
        <div
          onClick={() => setJustifPreviewOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 7000 }}
        >
          <button
            onClick={() => setJustifPreviewOpen(false)}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >✕ Fermer</button>
          {isImageFile(form.justificatif) ? (
            <img
              src={justifDataUrl}
              alt="Justificatif"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
            />
          ) : isPdfFile(form.justificatif) ? (
            <iframe
              src={justifDataUrl}
              title="Justificatif PDF"
              onClick={e => e.stopPropagation()}
              style={{ width: "80vw", height: "85vh", border: "none", borderRadius: 8, background: "#fff" }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default NoteFraisModal;
