// src/components/modals/ActionModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TYPES_ACTION, STATUTS_ACTION, NIVEAUX_CLASSE } from '../../data/constants';
import { Pencil, MapPin, X, Receipt, School, Search, CheckCircle2 } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { MEMBER_STATUS } from '../ui/StatusIcon';

const STATUT_NDF_COLOR = {
  "Soumise": "#1a56db", "En vérification": "#d97706",
  "Validée": "#16a34a", "Remboursée": "#15803d", "Refusée": "#e63946", "Brouillon": "#94a3b8",
};

const LABEL_REP = ["Hors REP", "REP", "REP+"];

const INSTITUTIONS_SIMULEES = [
  "Assemblée Nationale", "Sénat", "Parlement Européen",
  "Conseil Régional", "Conseil Départemental", "Conseil Municipal",
  "COP Climatique", "Autre",
];

const isSimulation = (type) =>
  type && (type.includes('Simulation') || type.includes('COP'));

// ── Noms des départements (code → label) ──────────────────────────────────────
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

// ── Composant de recherche géographique ───────────────────────────────────────
const GeoSearch = ({ ville, departement, onSelect }) => {
  const [query, setQuery]           = useState(ville || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [confirmed, setConfirmed]   = useState(!!ville);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  // Sync si la modale s'ouvre avec une ville existante
  useEffect(() => { setQuery(ville || ''); setConfirmed(!!ville); }, [ville]);

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const isPostal = /^\d{2,5}$/.test(trimmed);
      const url = isPostal
        ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(trimmed)}&fields=nom,codeDepartement,codesPostaux&limit=10`
        : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(trimmed)}&fields=nom,codeDepartement,codesPostaux&boost=population&limit=10`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      computeDropdown();
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const computeDropdown = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    });
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    if (!v) { onSelect({ ville: '', departement: '', codesPostaux: [] }); setSuggestions([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 350);
  };

  const handleSelect = (commune) => {
    const cp = commune.codesPostaux?.[0] || '';
    setQuery(`${commune.nom}${cp ? ` (${cp})` : ''}`);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onSelect({
      ville: commune.nom,
      departement: commune.codeDepartement,
      codesPostaux: commune.codesPostaux || [],
    });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) { computeDropdown(); setOpen(true); } }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Ville ou code postal…"
          autoComplete="off"
          style={{ paddingRight: 28 }}
        />
        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>…</span>
            : confirmed
              ? <CheckCircle2 size={13} strokeWidth={2} style={{ color: '#16a34a' }} />
              : <Search size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
          }
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ ...dropdownStyle, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', maxHeight: 230, overflowY: 'auto' }}>
          {suggestions.map((c, i) => {
            const cp = c.codesPostaux?.[0] || '';
            const deptLabel = DEPT_NAMES[c.codeDepartement] || c.codeDepartement;
            return (
              <div
                key={i}
                onMouseDown={() => handleSelect(c)}
                style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <MapPin size={11} strokeWidth={1.8} style={{ color: '#1a56db', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                  {cp && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-alt)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>{cp}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1a56db', background: 'rgba(26,86,219,0.08)', borderRadius: 4, padding: '1px 6px' }}>
                    {c.codeDepartement} — {deptLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ActionModal = ({ action, onClose, onSave, directory, cycles, currentUser, notesFrais = [],
  onTaskRequest, configTypesAction, configNiveaux, configLabelsRep, getConfigLabel }) => {
  const typesAction = (configTypesAction && configTypesAction.length > 0) ? configTypesAction : TYPES_ACTION.map(v => ({ value: v, label: v }));
  const niveaux     = (configNiveaux     && configNiveaux.length > 0)     ? configNiveaux     : NIVEAUX_CLASSE.map(v => ({ value: v, label: v }));
  const labelsRep   = (configLabelsRep   && configLabelsRep.length > 0)   ? configLabelsRep   : ['Hors REP','REP','REP+'].map(v => ({ value: v, label: v }));
  const { isClosing, handleClose } = useModalClose(onClose);
  const [form, setForm] = useState(action || {});
  const [geoPostalCodes, setGeoPostalCodes] = useState([]);

  useEffect(() => {
    if (action) setForm(action);
  }, [action?.id]);

  if (!action) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleGeoSelect = ({ ville, departement, codesPostaux }) => {
    setForm(f => ({ ...f, ville, departement, arrondissement: '' }));
    setGeoPostalCodes(codesPostaux || []);
  };

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

        <div className="modal-header">
          <div className="modal-header-title">
            {form.id ? <><Pencil size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} /> Modifier l'action</> : <><MapPin size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} /> Nouvelle action terrain</>}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 20 }}>

          {/* ── Établissement ── */}
          <div>
            <label className="form-label">Établissement / Structure *</label>
            <input type="text" className="form-input" value={form.etablissement || ""} onChange={(e) => set("etablissement", e.target.value)} placeholder="Ex: Lycée Jean Jaurès" />
          </div>

          {/* ── Géolocalisation intelligente ── */}
          <div style={{ background: "rgba(26,86,219,0.03)", border: "1px dashed rgba(26,86,219,0.18)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a56db", display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={12} strokeWidth={2} /> Localisation
              <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>Tapez une ville ou un code postal pour remplir automatiquement</span>
            </div>
            <div className="form-2col">
              <div>
                <label className="form-label">Ville *
                  <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>— ville ou code postal</span>
                </label>
                <GeoSearch
                  ville={form.ville || ""}
                  departement={form.departement || ""}
                  onSelect={handleGeoSelect}
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
            {/* Arrondissement — affiché si la ville a plusieurs codes postaux */}
            {(geoPostalCodes.length > 1 || form.arrondissement) && (
              <div>
                <label className="form-label">Arrondissement <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>(optionnel)</span></label>
                <select
                  className="form-select"
                  value={form.arrondissement || ''}
                  onChange={e => set('arrondissement', e.target.value)}
                >
                  <option value="">— Sélectionner un arrondissement</option>
                  {(geoPostalCodes.length > 1 ? geoPostalCodes : [form.arrondissement]).filter(Boolean).map(cp => (
                    <option key={cp} value={cp}>{cp}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="form-label">Adresse précise <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>(optionnel — ex: 15 rue de la Paix)</span></label>
              <input type="text" className="form-input" value={form.adresse || ""} onChange={(e) => set("adresse", e.target.value)} placeholder="Ex: 15 rue de la Paix, Bâtiment A" />
            </div>
            <div style={{ marginTop: 2 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <School size={12} strokeWidth={1.8} /> Label REP
              </label>
              <select className="form-select" value={form.labelRep || ""} onChange={(e) => set("labelRep", e.target.value)}>
                <option value="">Non renseigné</option>
                {labelsRep.map(l => <option key={l.value} value={l.value}>{l.label}{l.renamedFrom ? ` (ex: ${l.renamedFrom})` : ''}</option>)}
              </select>
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

          {/* ── Type, statut, cycle ── */}
          <div className="form-3col">
            <div>
              <label className="form-label">Type d'action</label>
              <select className="form-select" value={form.type || typesAction[0]?.value || ''} onChange={(e) => {
                set("type", e.target.value);
                // Réinitialise institution si on sort des simulations
                if (!isSimulation(e.target.value)) set("institutionSimulee", "");
              }}>
                {typesAction.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}{t.renamedFrom ? ` (ex: ${t.renamedFrom})` : ''}
                  </option>
                ))}
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

          {/* ── Institution simulée (conditionnelle) ── */}
          {isSimulation(form.type || typesAction[0]?.value || '') && (
            <div style={{ background: "rgba(26,86,219,0.04)", border: "1px dashed rgba(26,86,219,0.2)", borderRadius: 8, padding: "12px 14px" }}>
              <label className="form-label" style={{ color: "#1a56db" }}>Institution simulée</label>
              <select className="form-select" value={form.institutionSimulee || ""} onChange={(e) => set("institutionSimulee", e.target.value)}>
                <option value="">— Sélectionner —</option>
                {INSTITUTIONS_SIMULEES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          )}

          {/* ── Dates ── */}
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

          {/* ── Responsables ── */}
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

          {/* ── Public & bénéficiaires ── */}
          <div className="form-2col" style={{ padding: 16, background: "rgba(26,86,219,0.03)", borderRadius: 8, border: "1px dashed rgba(26,86,219,0.2)" }}>
            <div>
              <label className="form-label">Public / Niveau</label>
              <select className="form-select" value={form.type_classe || ""} onChange={(e) => set("type_classe", e.target.value)}>
                <option value="">Sélectionner...</option>
                {niveaux.map(n => <option key={n.value} value={n.value}>{n.label}{n.renamedFrom ? ` (ex: ${n.renamedFrom})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bénéficiaires (Nb)</label>
              <input type="number" className="form-input" value={form.beneficiaires || ""} onChange={(e) => set("beneficiaires", Number(e.target.value))} />
            </div>
          </div>

          {/* ── Contact ── */}
          <div>
            <label className="form-label">Contact sur place (Nom, Email, Tel)</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="text" className="form-input" placeholder="Nom complet" value={form.contact_nom || ""} onChange={(e) => set("contact_nom", e.target.value)} style={{ flex: "1 1 140px", minWidth: 0 }} />
              <input type="email" className="form-input" placeholder="Email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} style={{ flex: "1 1 160px", minWidth: 0 }} />
              <input type="tel" className="form-input" placeholder="Téléphone" value={form.contact_tel || ""} onChange={(e) => set("contact_tel", e.target.value)} style={{ flex: "1 1 120px", minWidth: 0 }} />
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="form-label">Notes et Observations</label>
            <textarea className="form-input" rows={3} placeholder="Informations importantes sur cette action..." value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} style={{ resize: "vertical" }} />
          </div>

        </div>

        {/* NDF liées */}
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

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => { if (form.etablissement && form.ville) onSave(form); else alert("L'établissement et la ville sont requis."); }}>
            {form.id ? "Mettre à jour" : "Créer l'action"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ActionModal;
