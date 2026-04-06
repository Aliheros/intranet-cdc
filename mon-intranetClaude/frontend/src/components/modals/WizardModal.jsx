// src/components/modals/WizardModal.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TYPES_ACTION, TYPES_CLASSE, PROJETS, POLES, POLE_COLORS, PROJET_COLORS } from '../../data/constants';
import { AvatarInner, isAvatarUrl } from '../ui/AvatarDisplay';
import { formatDateShort, generateAutoTasks } from '../../utils/utils';
import { X, ClipboardList, Calendar, Users, CheckCircle2, Trash2, ChevronLeft, ChevronRight, Euro, Rocket, MapPin, Search } from 'lucide-react';
import { MEMBER_STATUS } from '../ui/StatusIcon';
import { useModalClose } from '../../hooks/useModalClose';

const DEPT_NAMES = {
  "01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes",
  "06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube",
  "11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal",
  "16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud",
  "2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne",
  "25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère",
  "30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault",
  "35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura",
  "40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique",
  "45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire",
  "50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle",
  "55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord",
  "60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques",
  "65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône",
  "70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie",
  "75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres",
  "80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse",
  "85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne",
  "90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis",
  "94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique",
  "973":"Guyane","974":"La Réunion","976":"Mayotte",
};

const LABEL_REP = ["Hors REP", "REP", "REP+"];

const GeoSearch = ({ ville, onSelect }) => {
  const [query, setQuery]             = useState(ville || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const [confirmed, setConfirmed]     = useState(!!ville);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { setQuery(ville || ''); setConfirmed(!!ville); }, [ville]);

  const computeDropdown = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setDropdownStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: rect.width, zIndex: 99999 });
  }, []);

  const doSearch = useCallback(async (q) => {
    const t = q.trim();
    if (t.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const isPostal = /^\d{2,5}$/.test(t);
      const url = isPostal
        ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(t)}&fields=nom,codeDepartement,codesPostaux&limit=10`
        : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(t)}&fields=nom,codeDepartement,codesPostaux&boost=population&limit=10`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      computeDropdown();
      setOpen(true);
    } catch { setSuggestions([]); } finally { setLoading(false); }
  }, [computeDropdown]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    if (!v) { onSelect({ ville: '', departement: '' }); setSuggestions([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 350);
  };

  const handleSelect = (commune) => {
    const cp = commune.codesPostaux?.[0] || '';
    setQuery(`${commune.nom}${cp ? ` (${cp})` : ''}`);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onSelect({ ville: commune.nom, departement: commune.codeDepartement });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text" className="form-input" value={query}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) { computeDropdown(); setOpen(true); } }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Ville ou code postal…" autoComplete="off"
          style={{ paddingRight: 28 }}
        />
        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>…</span>
            : confirmed
              ? <CheckCircle2 size={13} strokeWidth={2} style={{ color: '#4ade80' }} />
              : <Search size={13} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />
          }
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ ...dropdownStyle, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', maxHeight: 230, overflowY: 'auto' }}>
          {suggestions.map((c, i) => {
            const cp = c.codesPostaux?.[0] || '';
            const deptLabel = DEPT_NAMES[c.codeDepartement] || c.codeDepartement;
            return (
              <div key={i} onMouseDown={() => handleSelect(c)}
                style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <MapPin size={11} strokeWidth={1.8} style={{ color: '#1a56db', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                  {cp && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-alt)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>{cp}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1a56db', background: 'rgba(26,86,219,0.08)', borderRadius: 4, padding: '1px 6px' }}>{c.codeDepartement} — {deptLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CHECKLIST_TEMPLATE = {
  preparation: [
    { id: "contact_confirmed", label: "Contact établissement confirmé", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
    { id: "date_validated", label: "Date validée par le proviseur", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
    { id: "team_confirmed", label: "Équipe confirmée (min. 2 personnes)", done: false, doneBy: null, doneAt: null, space: "Ressources Humaines" },
    { id: "materials_ready", label: "Matériel prêt (livrets, badges...)", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
    { id: "transport_ok", label: "Transport organisé", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
    { id: "comm_post", label: "Post réseaux sociaux J-7 publié", done: false, doneBy: null, doneAt: null, space: "Communication" },
  ],
  jourJ: [
    { id: "presences", label: "Présences enregistrées", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
    { id: "photos", label: "Photos prises et envoyées à Comm.", done: false, doneBy: null, doneAt: null, space: "Communication" },
    { id: "emargement", label: "Feuille d'émargement récupérée", done: false, doneBy: null, doneAt: null, space: "Relations Publiques" },
  ],
  postAction: [
    { id: "bilan_filled", label: "Bilan rempli dans l'intranet", done: false, doneBy: null, doneAt: null, space: "Etudes" },
    { id: "expenses_filed", label: "Note de frais déposée", done: false, doneBy: null, doneAt: null, space: "Trésorerie" },
    { id: "hours_declared", label: "Heures bénévoles déclarées", done: false, doneBy: null, doneAt: null, space: "Ressources Humaines" },
  ],
};

const EMPTY_FORM = {
  type: "", etablissement: "", ville: "", departement: "", labelRep: "", adresse: "", titreCoordination: "",
  contact_nom: "", contact_email: "", contact_tel: "",
  date_debut: "", date_fin: "",
  responsables: [], statut: "Planifiée",
  notes: "", projet: "", beneficiaires: "",
  type_classe: "", heures: "", isArchived: false,
  checklist: JSON.parse(JSON.stringify(CHECKLIST_TEMPLATE)),
  bilan: null, timeline: [], completionScore: 0,
};

const EMPTY_CONFIG = {
  budgetPrevisionnel: 0,
  notifySpaces: [],
  createTasks: true,
};

const STEPS = [
  { num: 1, label: "Identification" },
  { num: 2, label: "Équipe & Dates" },
  { num: 3, label: "Impact & Budget" },
  { num: 4, label: "Automatisation" },
];

export default function WizardModal({ cycles, directory, onClose, onComplete, currentUser }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM, cycle: cycles[0] });
  const [config, setConfig] = useState({ ...EMPTY_CONFIG });
  const [editableTasks, setEditableTasks] = useState(null);
  const [newTaskForm, setNewTaskForm] = useState({ text: "", space: "Ressources Humaines", deadline: "" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setConf = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const toggleResp = (nom) =>
    setForm(f => ({
      ...f,
      responsables: f.responsables.includes(nom)
        ? f.responsables.filter(r => r !== nom)
        : [...f.responsables, nom],
    }));

  const toggleSpace = (sp) =>
    setConfig(c => ({
      ...c,
      notifySpaces: c.notifySpaces.includes(sp)
        ? c.notifySpaces.filter(x => x !== sp)
        : [...c.notifySpaces, sp],
    }));

  const handleNext = () => {
    if (step === 1 && (!form.type || !form.etablissement || !form.ville)) {
      alert("Veuillez remplir les champs obligatoires (*)");
      return;
    }
    // Initialiser les tâches éditables à la première visite de l'étape 4
    if (step === 3 && config.createTasks && !editableTasks) {
      const autoTasks = generateAutoTasks(form, form.cycle);
      setEditableTasks(autoTasks.map((t, i) => ({ ...t, id: i, isCustom: false })));
    }
    setStep(s => s + 1);
  };

  // Fonctions d'édition des tâches
  const editTask = (taskId, field, value) => {
    if (!editableTasks) return;
    setEditableTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, [field]: value } : t)
    );
  };

  const deleteTask = (taskId) => {
    if (!editableTasks) return;
    setEditableTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addCustomTask = () => {
    if (!newTaskForm.text.trim()) return;
    if (!editableTasks) return;
    const newTask = {
      ...newTaskForm,
      id: `custom-${Date.now()}`,
      isCustom: true,
      assignees: [],
    };
    setEditableTasks(prev => [...prev, newTask]);
    setNewTaskForm({ text: "", space: "Ressources Humaines", deadline: "" });
  };

  const autoTasks = generateAutoTasks(form, form.cycle);

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 700, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid var(--border-light)", background: "linear-gradient(135deg, #0f2d5e, #1a56db)", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Suivi des actions</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Rocket size={18} strokeWidth={1.8} /> Nouvelle action — Workflow guidé</div>
            </div>
            <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2} /></button>
          </div>
          {/* STEPPER */}
          <div style={{ display: "flex", gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: step > s.num ? "#16a34a" : step === s.num ? "#fff" : "rgba(255,255,255,0.2)", color: step > s.num ? "#fff" : step === s.num ? "#1a56db" : "rgba(255,255,255,0.6)", transition: "all 0.3s" }}>
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: step >= s.num ? "#fff" : "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > s.num ? "#16a34a" : "rgba(255,255,255,0.2)", margin: "0 8px", marginBottom: 20, transition: "all 0.3s" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 28, flex: 1 }}>

          {/* ÉTAPE 1 — Identification */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Ligne 1 : Type + Cycle */}
              <div className="form-2col">
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Type d'action *</label>
                  <select className="form-select" value={form.type} onChange={e => set("type", e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {TYPES_ACTION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Ligne 2 : Établissement */}
              <div>
                <label className="form-label">Établissement / Structure *</label>
                <input className="form-input" value={form.etablissement} onChange={e => set("etablissement", e.target.value)} placeholder="Ex: Lycée Jean Jaurès" />
              </div>

              {/* Ligne 3 : Ville + Département */}
              <div className="form-2col">
                <div>
                  <label className="form-label">
                    Ville *
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>— ville ou code postal</span>
                  </label>
                  <GeoSearch
                    ville={form.ville}
                    onSelect={({ ville, departement }) => setForm(f => ({ ...f, ville, departement }))}
                  />
                </div>
                <div>
                  <label className="form-label">Département</label>
                  <input
                    className="form-input"
                    readOnly
                    value={form.departement ? `${form.departement}${DEPT_NAMES[form.departement] ? ` — ${DEPT_NAMES[form.departement]}` : ''}` : ''}
                    placeholder="Sélectionnez une ville d'abord"
                    style={{ cursor: "not-allowed", opacity: 0.6 }}
                  />
                </div>
              </div>

              {/* Ligne 3b : Adresse précise */}
              <div>
                <label className="form-label">Adresse précise <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>(optionnel — ex: 15 rue de la Paix)</span></label>
                <input className="form-input" value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="Ex: 15 rue de la Paix, Bâtiment A" />
              </div>

              {/* Ligne 4 : Label REP */}
              <div>
                <label className="form-label">Label REP</label>
                <select className="form-select" value={form.labelRep} onChange={e => set("labelRep", e.target.value)}>
                  <option value="">Non renseigné</option>
                  {LABEL_REP.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Ligne 5 : Contact */}
              <div className="form-2col">
                {[["contact_nom", "Nom du contact", "Mme Leclerc"], ["contact_email", "Email", "contact@lycee.fr"], ["contact_tel", "Téléphone", "01 48 00 00 01"]].map(([k, l, p]) => (
                  <div key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} />
                  </div>
                ))}
              </div>

              {/* Ligne 6 : Coordination + Projet */}
              <div className="form-2col">
                <div>
                  <label className="form-label">Nom dans Coordination <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>(vide = établissement)</span></label>
                  <input className="form-input" value={form.titreCoordination} onChange={e => set("titreCoordination", e.target.value)} placeholder={form.etablissement || "Ex: Lycée Jean Jaurès"} />
                </div>
                <div>
                  <label className="form-label">Projet associé</label>
                  <select className="form-select" value={form.projet} onChange={e => set("projet", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* ÉTAPE 2 — Équipe & Dates */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-2col">
                {[["date_debut", "Date de début"], ["date_fin", "Date de fin"]].map(([k, l]) => (
                  <div key={k}>
                    <label className="form-label">{l}</label>
                    <input type="date" className="form-input" value={form[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: 10 }}>Responsables affectés</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {directory.map(m => {
                    const sel = form.responsables.includes(m.nom);
                    return (
                      <div key={m.nom} onClick={() => toggleResp(m.nom)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${sel ? POLE_COLORS[m.pole] : "var(--border-light)"}`, background: sel ? `${POLE_COLORS[m.pole]}18` : "var(--bg-surface)", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : POLE_COLORS[m.pole], color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <AvatarInner avatar={m.avatar} nom={m.nom} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? POLE_COLORS[m.pole] : "var(--text-dim)" }}>{m.nom}</span>
                        {(() => { const s = MEMBER_STATUS[m.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="form-label">Notes (visibles dans le tableau)</label>
                <textarea className="form-input" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} style={{ resize: "vertical" }} placeholder="Ex: Matériel à prévoir, point de RDV..." />
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Impact & Budget */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-3col" style={{ padding: 16, background: "var(--bg-hover)", borderRadius: 10, border: "1px solid var(--border-light)" }}>
                <div>
                  <label className="form-label">Bénéficiaires (nb)</label>
                  <input type="number" className="form-input" value={form.beneficiaires} onChange={e => set("beneficiaires", e.target.value)} placeholder="Ex: 30" />
                </div>
                <div>
                  <label className="form-label">Heures d'intervention</label>
                  <input type="number" className="form-input" value={form.heures} onChange={e => set("heures", e.target.value)} placeholder="Ex: 2" />
                </div>
                <div>
                  <label className="form-label">Type de classe</label>
                  <select className="form-select" value={form.type_classe} onChange={e => set("type_classe", e.target.value)}>
                    <option value="">— Aucun —</option>
                    {TYPES_CLASSE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-2col">
                <div>
                  <label className="form-label">Budget prévisionnel (€)</label>
                  <input type="number" className="form-input" value={config.budgetPrevisionnel} onChange={e => setConf("budgetPrevisionnel", parseFloat(e.target.value) || 0)} placeholder="Ex: 150" />
                </div>
                <div>
                  <label className="form-label">Imputation budgétaire</label>
                  <select className="form-select" value={form.projet || "Fonctionnement Global"} onChange={e => set("projet", e.target.value)}>
                    <option value="Fonctionnement Global">Fonctionnement Global</option>
                    {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {config.budgetPrevisionnel > 0 && (
                <div style={{ padding: 14, background: "#fef3c7", borderRadius: 8, border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Euro size={14} strokeWidth={1.8} /> Une transaction prévisionnelle de <strong>{config.budgetPrevisionnel} €</strong> sera créée automatiquement dans la Trésorerie (statut "En attente").</span>
                </div>
              )}
              <div>
                <label className="form-label" style={{ marginBottom: 10 }}>Espaces à notifier (mur de discussion)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[...POLES, ...PROJETS].map(sp => {
                    const sel = config.notifySpaces.includes(sp);
                    const col = POLE_COLORS[sp] || PROJET_COLORS[sp] || "#888";
                    return (
                      <div key={sp} onClick={() => toggleSpace(sp)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${sel ? col : "var(--border-light)"}`, background: sel ? `${col}18` : "var(--bg-surface)", color: sel ? col : "var(--text-dim)", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
                        {sp}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Automatisation */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--bg-hover)", padding: 16, borderRadius: 10, border: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>Créer les tâches automatiquement</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Les tâches seront dispatchées dans les bons espaces de travail.</div>
                  </div>
                  <input type="checkbox" style={{ width: 20, height: 20, cursor: "pointer" }} checked={config.createTasks} onChange={e => setConf("createTasks", e.target.checked)} />
                </div>
              </div>
              {config.createTasks ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Liste des tâches éditables */}
                  {editableTasks && editableTasks.map((t) => (
                    <div key={t.id} style={{ padding: "14px 16px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-light)", display: "flex", gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: POLE_COLORS[t.space] || PROJET_COLORS[t.space] || "var(--text-muted)" }} />
                      <div style={{ flex: 1 }}>
                        <input 
                          type="text"
                          value={t.text}
                          onChange={(e) => editTask(t.id, "text", e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", fontSize: 13, fontWeight: 600, background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 6, marginBottom: 8, color: "var(--text-base)" }}
                          placeholder="Titre de la tâche"
                        />
                        <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                          <select 
                            value={t.space}
                            onChange={(e) => editTask(t.id, "space", e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 4, color: "var(--text-base)", fontSize: 11 }}
                          >
                            {[...POLES, ...PROJETS].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input 
                            type="date"
                            value={t.deadline || ""}
                            onChange={(e) => editTask(t.id, "deadline", e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 4, color: "var(--text-base)", fontSize: 11 }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteTask(t.id)}
                        style={{ background: "rgba(229,57,70,0.1)", border: "1px solid rgba(229,57,70,0.2)", color: "#e63946", padding: "6px 10px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Formulaire d'ajout de tâche */}
                  <div style={{ padding: "14px 16px", background: "rgba(22,163,74,0.08)", borderRadius: 8, border: "2px dashed #16a34a" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", marginBottom: 10, textTransform: "uppercase" }}>+ Ajouter une tâche</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input 
                        type="text"
                        value={newTaskForm.text}
                        onChange={(e) => setNewTaskForm(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="Titre de la tâche"
                        style={{ flex: 1, padding: "8px 12px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 6, color: "var(--text-base)" }}
                      />
                      <select 
                        value={newTaskForm.space}
                        onChange={(e) => setNewTaskForm(prev => ({ ...prev, space: e.target.value }))}
                        style={{ padding: "8px 12px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 6, color: "var(--text-base)" }}
                      >
                        {[...POLES, ...PROJETS].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input 
                        type="date"
                        value={newTaskForm.deadline}
                        onChange={(e) => setNewTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                        style={{ padding: "8px 12px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 6, color: "var(--text-base)" }}
                      />
                      <button 
                        onClick={addCustomTask}
                        style={{ background: "#16a34a", color: "#fff", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">Création automatique de tâches désactivée.</div>
              )}
              {/* RÉCAP FINAL */}
              <div style={{ marginTop: 8, padding: 18, background: "linear-gradient(135deg, #0f2d5e11, #1a56db08)", borderRadius: 12, border: "1px solid #1a56db30" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1a56db", marginBottom: 12 }}>Récapitulatif</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-base)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><ClipboardList size={13} strokeWidth={1.8} /> <strong>{form.type}</strong> — {form.etablissement} ({form.ville}{form.departement ? `, dép. ${form.departement}` : ''})</div>
                  {form.date_debut && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={13} strokeWidth={1.8} /> Du {formatDateShort(form.date_debut)}{form.date_fin && form.date_fin !== form.date_debut ? ` au ${formatDateShort(form.date_fin)}` : ""}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={13} strokeWidth={1.8} /> {form.responsables.length > 0 ? form.responsables.join(", ") : "Aucun responsable"}</div>
                  {config.budgetPrevisionnel > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Euro size={13} strokeWidth={1.8} /> Prévision : {config.budgetPrevisionnel} €</div>}
                  {config.notifySpaces.length > 0 && <div>Notifs : {config.notifySpaces.join(", ")}</div>}
                  {config.createTasks && editableTasks && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={13} strokeWidth={1.8} /> {editableTasks.length} tâche{editableTasks.length > 1 ? "s" : ""} (customisées)</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer-split">
          <button className="btn-secondary" style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? "none" : "auto", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={15} strokeWidth={2} /> Précédent
          </button>
          {step < 4 ? (
            <button className="btn-primary" onClick={handleNext} style={{ display: "flex", alignItems: "center", gap: 6 }}>Suivant <ChevronRight size={15} strokeWidth={2} /></button>
          ) : (
            <button className="btn-primary" style={{ background: "#16a34a", display: "flex", alignItems: "center", gap: 6 }} onClick={() => onComplete(form, { ...config, editableTasks })}>
              <Rocket size={15} strokeWidth={2} /> Lancer le Workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}