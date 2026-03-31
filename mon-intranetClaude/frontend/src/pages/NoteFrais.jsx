// src/pages/NoteFrais.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { formatDateShort } from '../utils/utils';
import { Car, Building2, Utensils, Package, BookOpen, Megaphone, Lightbulb, Receipt, Plus, ChevronRight, AlertTriangle, CheckCircle2, Clock, FileText, Settings, Trash2, Search, SlidersHorizontal, Users, TrendingUp, ArrowUpDown } from 'lucide-react';
import NdfConfigPanel from '../components/admin/NdfConfigPanel';
import { StatusBadge, NDF_STATUS } from '../components/ui/StatusIcon';

const CAT_ICON = {
  Transport: Car, Hébergement: Building2, Repas: Utensils,
  Fournitures: Package, "Matériel pédagogique": BookOpen,
  Communication: Megaphone, Autre: Lightbulb,
};

const STATUT_META = {
  "Brouillon":       { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  label: "Brouillon",        step: 0 },
  "Soumise":         { color: "#1a56db", bg: "rgba(26,86,219,0.1)",    label: "Soumise",           step: 1 },
  "En vérification": { color: "#d97706", bg: "rgba(217,119,6,0.1)",    label: "En vérification",   step: 2 },
  "Validée":         { color: "#16a34a", bg: "rgba(22,163,74,0.1)",    label: "Validée",           step: 3 },
  "Remboursée":      { color: "#15803d", bg: "rgba(21,128,61,0.12)",   label: "Remboursée",        step: 4 },
  "Refusée":         { color: "#e63946", bg: "rgba(230,57,70,0.1)",    label: "Refusée",           step: -1 },
};

const PIPELINE = ["Soumise", "En vérification", "Validée", "Remboursée"];

// Barre de progression pour une NDF individuelle
const StatusPipeline = ({ statut }) => {
  const isRefused = statut === "Refusée";
  const currentStep = STATUT_META[statut]?.step ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 10 }}>
      {PIPELINE.map((s, i) => {
        const done = currentStep > i;
        const active = PIPELINE[currentStep - 1] === s && !isRefused;
        const meta = STATUT_META[s];
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done || active ? meta.color : "var(--border-light)",
                border: `2px solid ${done || active ? meta.color : "var(--border-light)"}`,
                transition: "all 0.3s",
              }}>
                {done ? <CheckCircle2 size={12} strokeWidth={2.5} color="#fff" /> : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#fff" : "transparent" }} />
                )}
              </div>
              <div style={{ fontSize: 9, fontWeight: active || done ? 700 : 500, color: active || done ? meta.color : "var(--text-muted)", textAlign: "center", wordBreak: "break-word" }}>
                {s}
              </div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: currentStep > i + 1 ? STATUT_META[PIPELINE[i + 1]].color : "var(--border-light)", marginBottom: 14, transition: "background 0.3s" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};



// ── Vue trésorerie (gestionnaire) ─────────────────────────────────────────────
const TresoView = ({ notesFrais, onOpenNoteFrais }) => {
  const [tab, setTab] = useState("traiter"); // "traiter" | "encours" | "archivees" | "toutes"
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date_desc"); // "date_desc"|"date_asc"|"montant_desc"|"montant_asc"|"statut"|"demandeur"

  const aTraiter   = notesFrais.filter(n => ["Soumise"].includes(n.statut));
  const enCours    = notesFrais.filter(n => ["En vérification"].includes(n.statut));
  const archivees  = notesFrais.filter(n => ["Validée", "Remboursée", "Refusée"].includes(n.statut));

  const baseList = tab === "traiter" ? aTraiter
    : tab === "encours" ? enCours
    : tab === "archivees" ? archivees
    : notesFrais;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return baseList.filter(n =>
      !q ||
      (n.numeroDossier || "").toLowerCase().includes(q) ||
      (n.demandeurNom || n.demandeur || "").toLowerCase().includes(q) ||
      (n.description || "").toLowerCase().includes(q) ||
      (n.categorie || "").toLowerCase().includes(q) ||
      (n.pole || "").toLowerCase().includes(q) ||
      (n.projet || "").toLowerCase().includes(q)
    );
  }, [baseList, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const priority = { "Soumise": 5, "En vérification": 4, "Brouillon": 3, "Validée": 2, "Remboursée": 1, "Refusée": 0 };
    switch (sortBy) {
      case "date_asc":    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
      case "montant_desc":return list.sort((a, b) => Number(b.montant) - Number(a.montant));
      case "montant_asc": return list.sort((a, b) => Number(a.montant) - Number(b.montant));
      case "statut":      return list.sort((a, b) => (priority[b.statut] ?? 0) - (priority[a.statut] ?? 0));
      case "demandeur":   return list.sort((a, b) => (a.demandeurNom || a.demandeur || "").localeCompare(b.demandeurNom || b.demandeur || ""));
      default:            return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  }, [filtered, sortBy]);

  // KPIs
  const totalSoumis   = aTraiter.reduce((s, n) => s + Number(n.montant), 0);
  const totalEnCours  = enCours.reduce((s, n) => s + Number(n.montant), 0);
  const totalValide   = notesFrais.filter(n => n.statut === "Validée").reduce((s, n) => s + Number(n.montant), 0);
  const totalRembourse= notesFrais.filter(n => n.statut === "Remboursée").reduce((s, n) => s + Number(n.montant), 0);

  const TABS = [
    { key: "traiter",   label: "À traiter",      count: aTraiter.length,   color: "#1a56db" },
    { key: "encours",   label: "En vérification", count: enCours.length,    color: "#d97706" },
    { key: "archivees", label: "Archivées",        count: archivees.length,  color: "#94a3b8" },
    { key: "toutes",    label: "Toutes",           count: notesFrais.length, color: "#0f2d5e" },
  ];

  const SORTS = [
    { key: "date_desc",    label: "Date ↓" },
    { key: "date_asc",     label: "Date ↑" },
    { key: "montant_desc", label: "Montant ↓" },
    { key: "montant_asc",  label: "Montant ↑" },
    { key: "statut",       label: "Statut" },
    { key: "demandeur",    label: "Demandeur" },
  ];

  const STATUT_META = {
    "Brouillon":       { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    "Soumise":         { color: "#1a56db", bg: "rgba(26,86,219,0.1)" },
    "En vérification": { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
    "Validée":         { color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
    "Remboursée":      { color: "#15803d", bg: "rgba(21,128,61,0.12)" },
    "Refusée":         { color: "#e63946", bg: "rgba(230,57,70,0.1)" },
  };

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 22, borderRadius: 2, background: "#1a56db", flexShrink: 0 }} />
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>Trésorerie</div>
      </div>

      {/* KPIs trésorerie */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "À traiter", val: totalSoumis, count: aTraiter.length, color: "#1a56db", bg: "rgba(26,86,219,0.07)" },
          { label: "En vérif.", val: totalEnCours, count: enCours.length, color: "#d97706", bg: "rgba(217,119,6,0.07)" },
          { label: "À rembourser", val: totalValide, count: notesFrais.filter(n => n.statut === "Validée").length, color: "#16a34a", bg: "rgba(22,163,74,0.07)" },
          { label: "Remboursé", val: totalRembourse, count: notesFrais.filter(n => n.statut === "Remboursée").length, color: "#15803d", bg: "rgba(21,128,61,0.07)" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: k.color, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: k.color }}>{k.val.toFixed(2)} €</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{k.count} dossier{k.count !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid var(--border-light)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
            color: tab === t.key ? t.color : "var(--text-muted)",
            borderBottom: tab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
            marginBottom: -2, transition: "all 0.15s",
          }}>
            {t.label}
            <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 10, fontSize: 10, background: tab === t.key ? `${t.color}18` : "var(--bg-alt)", color: tab === t.key ? t.color : "var(--text-muted)", fontWeight: 700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Barre de recherche + tri */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={13} strokeWidth={1.8} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par demandeur, description, dossier, pôle…"
            style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 9, border: "1px solid var(--border-light)", background: "var(--bg-alt)", fontSize: 12, color: "var(--text-base)", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowUpDown size={12} strokeWidth={1.8} color="var(--text-muted)" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border-light)", background: "var(--bg-alt)", fontSize: 12, color: "var(--text-dim)", cursor: "pointer" }}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          {sorted.length} résultat{sorted.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Liste */}
      {sorted.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, background: "var(--bg-surface)", borderRadius: 12, border: "1px dashed var(--border-light)" }}>
          {search ? "Aucune NDF ne correspond à la recherche." : "Aucune note de frais dans cette catégorie."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(ndf => {
            const meta = STATUT_META[ndf.statut] || STATUT_META["Brouillon"];
            const CatIcon = CAT_ICON[ndf.categorie] || Lightbulb;
            const demandeur = ndf.demandeurNom || ndf.demandeur || "—";
            return (
              <div
                key={ndf.id}
                onClick={() => onOpenNoteFrais(ndf)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "var(--bg-surface)", borderRadius: 10, cursor: "pointer",
                  border: "1px solid var(--border-light)", borderLeft: `4px solid ${meta.color}`,
                  transition: "box-shadow 0.15s, transform 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Icône */}
                <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                  <CatIcon size={17} strokeWidth={1.8} />
                </div>
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{ndf.numeroDossier}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ndf.description || ndf.categorie}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Users size={9} strokeWidth={1.8} /> {demandeur}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDateShort(ndf.date)}</span>
                    {ndf.pole && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text-dim)", fontWeight: 600 }}>{ndf.pole}</span>}
                    {ndf.projet && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(26,86,219,0.08)", color: "#1a56db", fontWeight: 600 }}>{ndf.projet}</span>}
                  </div>
                </div>
                {/* Montant + statut */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-display)", color: meta.color }}>{Number(ndf.montant).toFixed(2)} €</div>
                  <span style={{ display: "inline-flex", marginTop: 3, fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>
                    <StatusBadge map={NDF_STATUS} value={ndf.statut} size={9} />
                  </span>
                </div>
                <ChevronRight size={14} strokeWidth={1.8} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────

const NoteFrais = () => {
  const { currentUser } = useAuth();
  const { setNoteFraisModal, handleNav: navigate } = useAppContext();
  const onOpenNoteFrais = (ndf) => setNoteFraisModal(ndf);
  const onNewNoteFrais = () => setNoteFraisModal({});
  const { notesFrais: allNotesFrais, hasPower, ndfConfig, handleSaveNdfConfig: onSaveNdfConfig } = useDataContext();
  const notesFrais = allNotesFrais.filter(n => n.demandeurId === currentUser?.id);
  const [filter, setFilter] = useState("all"); // "all" | "en_cours" | "archivees"
  const [showConfig, setShowConfig] = useState(false);
  const canConfig = hasPower && hasPower("manage_budgets");

  // notesFrais est déjà filtré au niveau de l'app — ce composant ne voit que les NDFs personnelles
  const enCours = notesFrais.filter(n => ["Brouillon", "Soumise", "En vérification"].includes(n.statut));
  const archivees = notesFrais.filter(n => ["Validée", "Remboursée", "Refusée"].includes(n.statut));

  const totalEnAttente = enCours.filter(n => ["Soumise", "En vérification"].includes(n.statut)).reduce((s, n) => s + Number(n.montant), 0);
  const totalRembourse = notesFrais.filter(n => n.statut === "Remboursée").reduce((s, n) => s + Number(n.montant), 0);
  const totalValide = notesFrais.filter(n => n.statut === "Validée").reduce((s, n) => s + Number(n.montant), 0);

  const displayed = filter === "en_cours" ? enCours : filter === "archivees" ? archivees : notesFrais;
  const sorted = [...displayed].sort((a, b) => {
    const priority = { "En vérification": 5, "Soumise": 4, "Brouillon": 3, "Validée": 2, "Remboursée": 1, "Refusée": 0 };
    return (priority[b.statut] ?? 0) - (priority[a.statut] ?? 0);
  });

  return (
    <>
      {/* ── EN-TÊTE ─────────────────────────────────────────────────── */}
      <div className="eyebrow" data-tour="ndf-main">Mes finances</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Notes de frais</div>
        <div style={{ display: "flex", gap: 8 }}>
          {canConfig && (
            <button
              onClick={() => setShowConfig(s => !s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: showConfig ? "rgba(15,45,94,0.08)" : "var(--bg-hover)", color: showConfig ? "#0f2d5e" : "var(--text-dim)", border: `1px solid ${showConfig ? "rgba(15,45,94,0.2)" : "var(--border-light)"}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}
            >
              <Settings size={14} strokeWidth={1.8} /> Configurer
            </button>
          )}
          <button
            onClick={onNewNoteFrais}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            <Plus size={15} strokeWidth={2.5} /> Nouvelle note de frais
          </button>
        </div>
      </div>

      {/* Panel de configuration (Responsable Trésorerie) */}
      {showConfig && canConfig && ndfConfig && (
        <NdfConfigPanel config={ndfConfig} onSave={onSaveNdfConfig} onClose={() => setShowConfig(false)} />
      )}

      {/* ── INSTRUCTIONS TRÉSORERIE ────────────────────────────────── */}
      {ndfConfig?.instructions && (
        <div style={{ marginBottom: 20, padding: "10px 14px", background: "rgba(26,86,219,0.05)", border: "1px solid rgba(26,86,219,0.15)", borderRadius: 9, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
          {ndfConfig.instructions}
        </div>
      )}

      {/* ── RÉSUMÉ FINANCIER ────────────────────────────────────────── */}
      <div className="kpi-3col">
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={11} strokeWidth={1.8} /> En attente
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: totalEnAttente > 0 ? "#d97706" : "var(--text-muted)" }}>
            {totalEnAttente.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{enCours.filter(n => n.statut !== "Brouillon").length} dossier{enCours.length !== 1 ? "s" : ""} en cours</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={11} strokeWidth={1.8} /> Validé non remboursé
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: totalValide > 0 ? "#16a34a" : "var(--text-muted)" }}>
            {totalValide.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>remboursement à venir</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Receipt size={11} strokeWidth={1.8} /> Remboursé
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: totalRembourse > 0 ? "#15803d" : "var(--text-muted)" }}>
            {totalRembourse.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>total perçu</div>
        </div>
      </div>

      {/* ── FILTRES ──────────────────────────────────────────────────── */}
      {notesFrais.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[
            { key: "all", label: `Tout (${notesFrais.length})` },
            { key: "en_cours", label: `En cours (${enCours.length})` },
            { key: "archivees", label: `Archivées (${archivees.length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)",
                background: filter === f.key ? "#0f2d5e" : "var(--bg-hover)",
                color: filter === f.key ? "#fff" : "var(--text-dim)",
                transition: "all 0.15s",
              }}
            >{f.label}</button>
          ))}
        </div>
      )}

      {/* ── LISTE DES NDF ────────────────────────────────────────────── */}
      {notesFrais.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", background: "var(--bg-surface)", borderRadius: 16, border: "1px dashed var(--border-light)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(26,86,219,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <FileText size={26} strokeWidth={1.5} color="#1a56db" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-base)", marginBottom: 6 }}>Aucune note de frais</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 340, lineHeight: 1.6 }}>
            Soumettez une note de frais pour vous faire rembourser une dépense engagée pour Cité des Chances.
          </div>
          <button onClick={onNewNoteFrais} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#0f2d5e", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            <Plus size={14} strokeWidth={2.5} /> Créer ma première note
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Aucune note dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map(ndf => {
            const meta = STATUT_META[ndf.statut] || STATUT_META["Brouillon"];
            const CatIcon = CAT_ICON[ndf.categorie] || Lightbulb;
            const isDraft = ndf.statut === "Brouillon";
            const isRefused = ndf.statut === "Refusée";
            const isDone = ndf.statut === "Remboursée";
            const hasProblem = !!ndf.justificatifProblem;

            return (
              <div
                key={ndf.id}
                onClick={() => onOpenNoteFrais(ndf)}
                style={{
                  background: "var(--bg-surface)", borderRadius: 14, cursor: "pointer", transition: "box-shadow 0.2s, transform 0.15s",
                  border: `1px solid ${hasProblem ? "rgba(230,57,70,0.35)" : isRefused ? "rgba(230,57,70,0.2)" : "var(--border-light)"}`,
                  borderLeft: `4px solid ${meta.color}`,
                  opacity: isDone ? 0.8 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ padding: "16px 20px" }}>
                  {/* Demande de suppression en attente */}
                  {ndf.suppressionDemandee && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#d97706", fontWeight: 700, marginBottom: 10, padding: "6px 10px", background: "rgba(217,119,6,0.07)", borderRadius: 6 }}>
                      <Trash2 size={12} strokeWidth={2} /> Suppression en attente de validation par la trésorerie
                    </div>
                  )}
                  {/* Alerte justificatif problème */}
                  {hasProblem && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#e63946", fontWeight: 700, marginBottom: 10, padding: "6px 10px", background: "rgba(230,57,70,0.07)", borderRadius: 6 }}>
                      <AlertTriangle size={12} strokeWidth={2} /> Action requise : justificatif non conforme — cliquez pour corriger
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Icône catégorie */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                      <CatIcon size={20} strokeWidth={1.8} />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{ndf.numeroDossier}</span>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ndf.categorie}</span>
                        {ndf.pole && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "var(--bg-alt)", color: "var(--text-dim)", fontWeight: 600 }}>{ndf.pole}</span>}
                        {ndf.projet && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: "rgba(26,86,219,0.08)", color: "#1a56db", fontWeight: 600 }}>{ndf.projet}</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ndf.description || "Sans description"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{formatDateShort(ndf.date)}</div>
                    </div>

                    {/* Montant + statut */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)", color: isRefused ? "#e63946" : isDone ? "#15803d" : "var(--text-base)" }}>
                        {Number(ndf.montant).toFixed(2)} €
                      </div>
                      <span style={{ display: "inline-flex", marginTop: 4, fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: meta.bg }}>
                        <StatusBadge map={NDF_STATUS} value={ndf.statut} size={10} />
                      </span>
                    </div>

                    <ChevronRight size={16} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>

                  {/* Barre de progression (uniquement pour les NDF actives non brouillon) */}
                  {!isDraft && !isRefused && (
                    <StatusPipeline statut={ndf.statut} />
                  )}

                  {/* Message refus */}
                  {isRefused && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(230,57,70,0.06)", borderRadius: 8, fontSize: 11, color: "#e63946" }}>
                      Note refusée — consultez l'historique pour connaître le motif.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── INFO TRÉSORERIE ──────────────────────────────────────────── */}
      {notesFrais.length > 0 && (
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-hover)", borderRadius: 10, border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Le traitement de vos notes est assuré par le <strong style={{ color: "var(--text-dim)" }}>Pôle Trésorerie</strong>.
          </div>
          <button
            onClick={() => navigate("pole", "Trésorerie")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 14px", background: "none", border: "1px solid var(--border-light)", borderRadius: 8, cursor: "pointer", color: "var(--text-dim)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Accéder à la Trésorerie <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
};

export default NoteFrais;
