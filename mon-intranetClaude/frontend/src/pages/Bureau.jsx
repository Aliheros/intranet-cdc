// src/pages/Bureau.jsx
import React, { useState } from 'react';
import { MapPin, User, Calendar, Eye, Trash2, Megaphone, Mail, Search, FileSignature, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const Bureau = () => {
  const { currentUser } = useAuth();
  const { notifs, handleDeleteNotif, devisFactures, transactions, handleApprouverHorsBudget } = useDataContext();
  const { requestConfirm, setShowNewNotifModal, handleNav } = useAppContext();
  const navigate = handleNav;
  const [expandedNotif, setExpandedNotif] = useState(null);
  // Seules les annonces spontanées du Bureau (pas les notifications système auto)
  const annonces = notifs.filter(n => n.source === "bureau" || (!n.source && n.auteur !== "Système"));
  return (
    <>
      <div className="eyebrow">Administration & Gouvernance</div>
      <div className="ptitle">Espace Bureau</div>

      {/* Devis & Factures en attente de signature */}
      <div className="sc" style={{ maxWidth: "100%", marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="sct" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileSignature size={16} strokeWidth={1.8} /> Devis & Factures en attente de signature
          </div>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => navigate("devisFactures")}>
            Voir tous →
          </button>
        </div>
        {(devisFactures || []).filter(df => ['Soumis', 'En traitement'].includes(df.statut)).length === 0 ? (
          <div className="empty" style={{ padding: "20px 0", textAlign: "center" }}>
            Aucun document en attente de traitement.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(devisFactures || []).filter(df => ['Soumis', 'En traitement'].includes(df.statut)).map(df => (
              <div key={df.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-hover)", border: `1px solid ${df.horseBudget ? 'rgba(217,119,6,0.3)' : 'var(--border-light)'}`, borderRadius: 8, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{df.titre}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card)", padding: "1px 6px", borderRadius: 4 }}>{df.type}</span>
                    {df.horseBudget && <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>⚠️ Hors budget</span>}
                    <span style={{ fontSize: 11, background: df.statut === "Soumis" ? "rgba(26,86,219,0.1)" : "rgba(217,119,6,0.1)", color: df.statut === "Soumis" ? "#1a56db" : "#d97706", padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>{df.statut}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {Number(df.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € · par {df.createdBy}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onClick={() => navigate("devisFactures")}
                >
                  <CheckCircle2 size={12} strokeWidth={2} /> Traiter →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dépenses hors budget en attente d'approbation */}
      <div className="sc" style={{ maxWidth: "100%", marginTop: 24 }}>
        <div className="sct" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={16} strokeWidth={1.8} color="#e63946" /> Dépenses hors budget en attente d'approbation
        </div>
        {(transactions || []).filter(tx => tx.horseBudget === true && !tx.horseBudgetApprovedBy).length === 0 ? (
          <div className="empty" style={{ padding: "20px 0", textAlign: "center" }}>
            Aucune dépense hors budget en attente.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(transactions || []).filter(tx => tx.horseBudget === true && !tx.horseBudgetApprovedBy).map(tx => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(230,57,70,0.04)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 8, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.libelle}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {tx.montant} € · {tx.date}
                    {tx.horseBudgetRaison && <span style={{ marginLeft: 6, color: "#e63946" }}>"{tx.horseBudgetRaison}"</span>}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: "5px 10px", color: "#16a34a", borderColor: "#16a34a", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
                  onClick={() => handleApprouverHorsBudget && handleApprouverHorsBudget(tx.id)}
                >
                  <CheckCircle2 size={12} strokeWidth={2} /> Approuver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gestion des annonces */}
      <div className="sc" style={{ maxWidth: "100%", marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sct" style={{display:"flex",alignItems:"center",gap:8}}>Gestion des Annonces <Megaphone size={16} strokeWidth={1.8}/></div>
            <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
              Historique de toutes les annonces créées par le Bureau. Vous pouvez voir qui les a consultées et les supprimer si nécessaire.
            </p>
          </div>
          <button
            onClick={() => setShowNewNotifModal(true)}
            className="btn-primary"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            <Megaphone size={13} strokeWidth={1.8} /> Créer annonce
          </button>
        </div>
        
        {annonces.length === 0 && (
          <div className="empty" style={{ marginBottom: 16, textAlign: "center", padding: 40 }}>
            <div style={{ marginBottom: 10, display:"flex", justifyContent:"center" }}><Mail size={40} strokeWidth={1} color="var(--text-muted)"/></div>
            Aucune annonce n'a été créée encore.
          </div>
        )}
        <div className="annonces-grid">
          {annonces.map((n) => (
            <div
              key={n.id}
              style={{
                background: "var(--bg-hover)",
                border: "1px solid var(--border-light)",
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#1a56db"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-light)"}
            >
              {/* En-tête avec titre et actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)", wordBreak: "break-word" }}>
                    {n.titre}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    Par {n.auteur} · {n.date}
                  </div>
                </div>
                {n.priorite === "haute" && (
                  <span style={{ fontSize: 9, background: "#e63946", color: "#fff", padding: "2px 7px", borderRadius: 20, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>URGENT</span>
                )}
              </div>

              {/* Contenu */}
              <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 12, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" }}>
                {n.contenu}
              </div>

              {/* Ciblage */}
              {n.cible !== "tous" && (
                <div style={{ fontSize: 10, background: "rgba(26, 86, 219, 0.05)", color: "#1a56db", padding: 8, borderRadius: 4, marginBottom: 12, borderLeft: "3px solid #1a56db" }}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>{n.cible === "pole" ? <><MapPin size={10} strokeWidth={1.8}/> Pôles ciblés: </> : <><User size={10} strokeWidth={1.8}/> Personnes ciblées: </>}</span>
                  <strong>
                    {n.cible === "pole" ? n.targetPoles?.join(", ") : n.targetUsers?.join(", ")}
                  </strong>
                </div>
              )}

              {/* Stats de consultation */}
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12, display:"flex", alignItems:"center", gap:4 }}>
                <Eye size={10} strokeWidth={1.8}/> {n.lu?.length || 0} consultation(s)
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setExpandedNotif(expandedNotif === n.id ? null : n.id)}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    background: "var(--bg-alt)",
                    border: "1px solid var(--border-light)",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-base)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#1a56db"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-alt)"}
                >
                  {expandedNotif === n.id ? "Masquer" : "Détails"}
                </button>
                <button
                  onClick={() => handleDeleteNotif?.(n.id)}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(230, 57, 70, 0.1)",
                    border: "1px solid #fca5a5",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#e63946",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(230, 57, 70, 0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(230, 57, 70, 0.1)"}
                >
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Trash2 size={11} strokeWidth={1.8}/> Supprimer</span>
                </button>
              </div>

              {/* Détails étendus */}
              {expandedNotif === n.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)", fontSize: 12, lineHeight: 1.6, color: "var(--text-base)" }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Message complet:</strong><br />
                    {n.contenu}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><Calendar size={10} strokeWidth={1.8}/> Créée: {new Date(n.createdAt).toLocaleString("fr-FR")}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><Search size={10} strokeWidth={1.8}/> Ciblage: {n.cible === "tous" ? "Toute l'équipe" : `${n.cible === "pole" ? "Pôles" : "Personnes"} spécifiques`}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};


export default Bureau;