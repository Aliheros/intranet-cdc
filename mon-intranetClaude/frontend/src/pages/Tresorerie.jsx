// src/pages/Tresorerie.jsx
import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import { formatDateShort } from '../utils/utils';
import { POLES } from '../data/constants';
import { Pencil, Trash2, FileText, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

const Tresorerie = ({ transactions, budgets, hasPower, setTransactionModal, deleteTransaction, validerTransaction, devisFactures }) => {
  const [tresorerieTab, setTresorerieTab] = useState("Toutes");
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalRecettes = transactions.filter(t => t.type === "Recette" && t.statut === "Validé").reduce((s, t) => s + t.montant, 0);
  const totalDepenses = transactions.filter(t => t.type === "Dépense" && t.statut === "Validé").reduce((s, t) => s + t.montant, 0);
  const solde = totalRecettes - totalDepenses;

  const pendingHorsBudget = transactions.filter(t => t.horseBudget && !t.horseBudgetApprovedBy);

  const filteredTransactions = transactions.filter(t => {
    if (tresorerieTab === "Hors budget") return t.horseBudget === true;
    if (tresorerieTab !== "Toutes" && t.type !== tresorerieTab) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="eyebrow">Finance</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Trésorerie</div>
        {hasPower("manage_budgets") && (
          <button className="btn-primary" onClick={() => setTransactionModal({ type: "Dépense", montant: "", date: new Date().toISOString().split('T')[0], imputation: "Fonctionnement Global", statut: "Validé" })}>
            <Plus size={13} strokeWidth={2.5} /> Nouvelle Transaction
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <div className="kc">
          <div className="kl">Budget Global Annuel</div>
          <div className="kv">{budgets["Fonctionnement Global"]} €</div>
          <div className="kd" style={{ color: "var(--text-muted)", borderColor: "transparent" }}>Alloué pour l'année</div>
        </div>
        <div className="kc">
          <div className="kl">Total Recettes</div>
          <div className="kv" style={{ color: "#16a34a" }}>+{totalRecettes} €</div>
          <div className="kd" style={{ color: "#16a34a", borderColor: "rgba(22, 163, 74, 0.2)" }}>Subventions & Dons</div>
        </div>
        <div className="kc">
          <div className="kl">Total Dépenses</div>
          <div className="kv" style={{ color: "#e63946" }}>-{totalDepenses} €</div>
          <div className="kd" style={{ color: "#e63946", borderColor: "rgba(230, 57, 70, 0.2)" }}>Frais engagés</div>
        </div>
        <div className="kc" style={{ background: solde >= 0 ? "rgba(26,86,219,0.05)" : "rgba(230,57,70,0.05)", borderColor: solde >= 0 ? "#1a56db" : "#e63946" }}>
          <div className="kl" style={{ color: solde >= 0 ? "#1a56db" : "#e63946" }}>Solde Actuel</div>
          <div className="kv" style={{ color: solde >= 0 ? "#1a56db" : "#e63946" }}>{solde} €</div>
          <div className="kd" style={{ color: solde >= 0 ? "#1a56db" : "#e63946", borderColor: "transparent" }}>Disponible</div>
        </div>
        {pendingHorsBudget.length > 0 && (
          <div className="kc" style={{ borderColor: "#e63946", background: "rgba(230,57,70,0.05)" }}>
            <div className="kl" style={{ color: "#e63946" }}>Dépenses en attente</div>
            <div className="kv" style={{ color: "#e63946" }}>{pendingHorsBudget.length}</div>
            <div className="kd" style={{ color: "#e63946", borderColor: "rgba(230,57,70,0.2)" }}>approbation hors budget</div>
          </div>
        )}
      </div>

      <div className="toolbar-wrap" style={{ marginBottom: 8 }}>
        <div className="toolbar-group">
          {["Toutes", "Recette", "Dépense", "Hors budget"].map(tab => (
            <button key={tab} className={`chip ${tresorerieTab === tab ? "on" : ""}`} onClick={() => setTresorerieTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Du</label>
          <input type="date" className="form-input" style={{ padding: "5px 10px", fontSize: 12 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Au</label>
          <input type="date" className="form-input" style={{ padding: "5px 10px", fontSize: 12 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn-secondary" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Réinitialiser
          </button>
        )}
      </div>

      <div className="table-scroll-wrap">
        <table className="actions-table">
          <thead>
            <tr>
              <th>Date</th><th>Libellé</th><th>Catégorie</th><th>Imputation (Pôle/Projet)</th><th>Montant</th><th>Statut</th><th>Justificatifs</th>
              {hasPower("manage_budgets") && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 && (
              <tr><td colSpan={8}><div className="empty">Aucune transaction trouvée.</div></td></tr>
            )}
            {filteredTransactions.map(t => {
              const linkedDf = devisFactures && t.devisFactureId ? (devisFactures || []).find(df => df.id === t.devisFactureId) : null;
              return (
                <tr key={t.id}>
                  <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDateShort(t.date)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.libelle}</div>
                    {t.horseBudget && (
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        <Badge label="Hors budget" bg="#fff7ed" c="#f97316" />
                        {!t.horseBudgetApprovedBy && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#e63946", fontWeight: 700 }}>
                            <AlertTriangle size={10} strokeWidth={2} /> À approuver
                          </span>
                        )}
                        {t.horseBudgetApprovedBy && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#16a34a", fontWeight: 700 }}>
                            <CheckCircle2 size={10} strokeWidth={2} /> Approuvé par {t.horseBudgetApprovedBy}
                          </span>
                        )}
                      </div>
                    )}
                    {linkedDf && (
                      <div style={{ fontSize: 10, color: "#1a56db", marginTop: 3 }} title={`Lié : ${linkedDf.titre}`}>
                        📎 {linkedDf.titre}
                      </div>
                    )}
                  </td>
                  <td>
                    {t.categorie ? <Badge label={t.categorie} bg="rgba(26,86,219,0.07)" c="#1a56db" /> : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td><Badge label={t.imputation} bg="var(--bg-alt)" c="var(--text-dim)" /></td>
                  <td style={{ fontWeight: 700, color: t.type === "Recette" ? "#16a34a" : "#e63946" }}>
                    {t.type === "Recette" ? "+" : "-"}{t.montant} €
                  </td>
                  <td>
                    <Badge label={t.statut} bg={t.statut === "Validé" ? "#dcfce7" : "#fef3c7"} c={t.statut === "Validé" ? "#16a34a" : "#d97706"} />
                  </td>
                  <td>
                    {t.fichiers && t.fichiers.length > 0 ? (
                      <span style={{ fontSize: 11, color: "#1a56db", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <FileText size={13} strokeWidth={1.8} /> {t.fichiers.length} fichier(s)
                      </span>
                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Aucun</span>}
                  </td>
                  {hasPower("manage_budgets") && (
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {t.statut === "En attente" && (
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 10, color: "#16a34a", borderColor: "#16a34a", background: "transparent" }} onClick={() => validerTransaction(t.id)}>
                            Valider
                          </button>
                        )}
                        <span style={{ color: "#1a56db", cursor: "pointer", display: "inline-flex" }} onClick={() => setTransactionModal({ ...t })} title="Modifier"><Pencil size={14} strokeWidth={1.8} /></span>
                        <span style={{ color: "#e63946", cursor: "pointer", display: "inline-flex" }} onClick={() => deleteTransaction(t.id)} title="Supprimer"><Trash2 size={14} strokeWidth={1.8} /></span>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Tresorerie;
