// src/pages/TresorerieDevisFactures.jsx
// Gestion des devis/factures côté trésorerie — dashboard + liste + drawer de traitement
import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import api, { SERVER_URL } from '../api/apiClient';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  MessageSquare, Paperclip, Eye, Upload, X, Send, Settings,
  RefreshCw, RotateCcw, Trash2,
} from 'lucide-react';

const STATUT_META = {
  Brouillon:           { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Brouillon'           },
  Soumis:              { color: '#1a56db', bg: 'rgba(26,86,219,0.1)',   label: 'Soumis'              },
  'En traitement':     { color: '#d97706', bg: 'rgba(217,119,6,0.1)',   label: 'En traitement'       },
  'Modif. demandée':   { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', label: 'Modif. demandée'     },
  Signé:               { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Signé ✓'             },
  Refusé:              { color: '#e63946', bg: 'rgba(230,57,70,0.1)',   label: 'Refusé'              },
};

const fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const fmtM    = (m) => `${Number(m).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

// ─── Drawer de traitement ─────────────────────────────────────────────────────
function DossierDrawer({ df, onClose, onRefresh, addToast, currentUser }) {
  const [tab, setTab]           = useState('details');   // details | commentaires | fichiers
  const [decision, setDecision] = useState('Signé');
  const [motifRefus, setMotif]  = useState('');
  const [tresoNotes, setNotes]  = useState(df.notes || '');
  const [newComment, setComment]= useState('');
  const [isInternal, setIsInt]  = useState(false);
  const [motifModif, setMotifMod] = useState('');
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const commentaires = Array.isArray(df.commentaires) ? df.commentaires : [];
  const fichiers     = Array.isArray(df.fichiers) ? df.fichiers : [];
  const historique   = Array.isArray(df.historique) ? df.historique : [];
  const modif        = df.demandeModif;
  const meta         = STATUT_META[df.statut] || STATUT_META.Brouillon;

  const run = async (fn, successMsg) => {
    setSaving(true);
    try {
      await fn();
      addToast(successMsg);
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFichier = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm('/upload', fd);
      await api.post(`/devis-factures/${df.id}/fichiers`, {
        nom:   res.nom || file.name,
        url:   res.filename,
        taille: `${Math.round(file.size / 1024)} Ko`,
      });
      addToast('Fichier ajouté.');
      onRefresh();
    } catch (err) {
      addToast(err.message || "Erreur upload", 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFichier = async (idx) => {
    await run(() => api.delete(`/devis-factures/${df.id}/fichiers/${idx}`), 'Fichier supprimé.');
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    await run(
      () => api.post(`/devis-factures/${df.id}/commentaires`, { contenu: newComment.trim(), isInternal }),
      'Commentaire envoyé.'
    );
    setComment('');
  };

  const handlePrendreEnCharge = () =>
    run(() => api.post(`/devis-factures/${df.id}/prendre-en-charge`), 'Prise en charge enregistrée.');

  const handleSigner = () =>
    run(() => api.post(`/devis-factures/${df.id}/signer`, { decision, motifRefus: motifRefus.trim(), notes: tresoNotes }), decision === 'Signé' ? 'Dossier signé ✓' : 'Dossier refusé.');

  const handleValiderModif = (dec) =>
    run(() => api.post(`/devis-factures/${df.id}/valider-modif`, { decision: dec, motifRefus: motifMod }), `Modification ${dec}.`);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 600, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{df.type} · par {df.createdBy}</span>
              {df.horseBudget && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>⚠️ Hors budget</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-base)' }}>{df.titre}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtM(df.montant)} · {df.emetteur} → {df.destinataire}
              {df.soumisAt && ` · soumis le ${fmtDate(df.soumisAt)}`}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Bandeau modif. demandée */}
        {df.statut === 'Modif. demandée' && modif && (
          <div style={{ margin: '12px 24px 0', padding: '12px 16px', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} strokeWidth={2} /> Demande de modification de {modif.demandePar}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>"{modif.message}"</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleValiderModif('approuvée')} disabled={saving}
                style={{ flex: 1, padding: '7px 12px', background: 'rgba(22,163,74,0.1)', border: '1px solid #16a34a', color: '#16a34a', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ✓ Approuver la modification
              </button>
              <button
                onClick={() => handleValiderModif('refusée')} disabled={saving || !motifMod.trim()}
                style={{ flex: 1, padding: '7px 12px', background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.3)', color: '#e63946', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !motifMod.trim() ? 0.5 : 1 }}>
                ✗ Refuser
              </button>
            </div>
            <input className="form-input" style={{ marginTop: 8, fontSize: 12 }} value={motifMod} onChange={e => setMotifMod(e.target.value)} placeholder="Motif du refus de modification (requis pour refuser)…" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 24px' }}>
          {[
            { key: 'details',      label: 'Détails',      icon: <FileText size={12} strokeWidth={1.8} /> },
            { key: 'commentaires', label: `Messages (${commentaires.filter(c => !c.isInternal).length})`, icon: <MessageSquare size={12} strokeWidth={1.8} /> },
            { key: 'fichiers',     label: `Fichiers (${fichiers.length})`, icon: <Paperclip size={12} strokeWidth={1.8} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? '#1a56db' : 'transparent'}`, color: tab === t.key ? '#1a56db' : 'var(--text-muted)', fontWeight: tab === t.key ? 700 : 500, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: -1 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Corps */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Tab Détails ── */}
          {tab === 'details' && (
            <>
              {df.description && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                  {df.description}
                </div>
              )}

              {/* Infos traitement */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                {df.traitePar  && <span>Pris en charge par <strong style={{ color: 'var(--text-base)' }}>{df.traitePar}</strong>{df.traiteAt && ` le ${fmtDate(df.traiteAt)}`}</span>}
                {df.signataire && <span>Décision par <strong style={{ color: 'var(--text-base)' }}>{df.signataire}</strong>{df.signedAt && ` le ${fmtDate(df.signedAt)}`}</span>}
                {df.motifRefus && (
                  <div style={{ padding: '8px 12px', background: 'rgba(230,57,70,0.06)', borderLeft: '3px solid #e63946', borderRadius: '0 8px 8px 0', color: '#e63946' }}>
                    <strong>Motif refus :</strong> {df.motifRefus}
                  </div>
                )}
                {df.transactionId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'rgba(22,163,74,0.07)', borderRadius: 8, color: '#16a34a', fontWeight: 600 }}>
                    <CheckCircle2 size={12} strokeWidth={2} /> Transaction #{df.transactionId} créée automatiquement
                  </div>
                )}
              </div>

              {/* Historique */}
              {historique.length > 0 && (
                <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Historique</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {historique.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11 }}>
                        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 64 }}>{fmtDate(h.date?.slice(0, 10))}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{h.action}</span>
                        {h.detail && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>· {h.detail}</span>}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>par {h.auteur}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone de traitement */}
              {['Soumis', 'En traitement', 'Modif. demandée'].includes(df.statut) && (
                <div style={{ padding: 16, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Settings size={11} strokeWidth={1.8} /> Traitement
                  </div>

                  {df.statut === 'Soumis' && (
                    <button onClick={handlePrendreEnCharge} disabled={saving}
                      style={{ marginBottom: 12, padding: '7px 16px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} strokeWidth={2} /> Prendre en charge
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {['Signé', 'Refusé'].map(d => (
                      <button key={d} onClick={() => setDecision(d)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${decision === d ? (d === 'Signé' ? '#16a34a' : '#e63946') : 'var(--border-light)'}`, background: decision === d ? (d === 'Signé' ? 'rgba(22,163,74,0.08)' : 'rgba(230,57,70,0.08)') : 'transparent', color: decision === d ? (d === 'Signé' ? '#16a34a' : '#e63946') : 'var(--text-dim)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        {d === 'Signé' ? '✓ Accepter' : '✗ Refuser'}
                      </button>
                    ))}
                  </div>

                  {decision === 'Refusé' && (
                    <div style={{ marginBottom: 10 }}>
                      <label className="form-label">Motif de refus *</label>
                      <textarea className="form-input" value={motifRefus} onChange={e => setMotif(e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Motif obligatoire…" />
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Note interne (optionnel)</label>
                    <input className="form-input" value={tresoNotes} onChange={e => setNotes(e.target.value)} placeholder="Archivage interne…" />
                  </div>

                  <button
                    onClick={handleSigner} disabled={saving || (decision === 'Refusé' && !motifRefus.trim())}
                    style={{ width: '100%', padding: '10px 0', background: decision === 'Signé' ? '#16a34a' : '#e63946', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (saving || (decision === 'Refusé' && !motifRefus.trim())) ? 0.5 : 1 }}>
                    {saving ? 'Traitement…' : decision === 'Signé' ? '✓ Confirmer la signature' : '✗ Confirmer le refus'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Tab Commentaires ── */}
          {tab === 'commentaires' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commentaires.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>Aucun message échangé.</div>
                )}
                {commentaires.map((c, i) => {
                  const isMe = c.auteur === currentUser?.nom;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                      {c.isInternal && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note interne</div>
                      )}
                      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: c.isInternal ? 'rgba(148,163,184,0.1)' : isMe ? '#0f2d5e' : 'var(--bg-hover)', color: c.isInternal ? 'var(--text-muted)' : isMe ? '#fff' : 'var(--text-base)', fontSize: 13, lineHeight: 1.5, border: c.isInternal ? '1px dashed var(--border-light)' : 'none' }}>
                        {c.contenu}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.auteur} · {new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  );
                })}
              </div>

              {/* Input commentaire */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <textarea className="form-input" rows={2} value={newComment} onChange={e => setComment(e.target.value)} placeholder="Votre message…" style={{ resize: 'none' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInt(e.target.checked)} style={{ accentColor: '#94a3b8' }} />
                    Note interne (invisible pour le membre)
                  </label>
                  <button onClick={handleSendComment} disabled={!newComment.trim() || saving}
                    style={{ padding: '7px 16px', background: '#0f2d5e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: !newComment.trim() ? 0.5 : 1 }}>
                    <Send size={12} strokeWidth={2} /> Envoyer
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Tab Fichiers ── */}
          {tab === 'fichiers' && (
            <>
              {fichiers.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>Aucun fichier joint.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fichiers.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <FileText size={16} strokeWidth={1.5} color="#1a56db" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nom || f.url}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.taille && `${f.taille} · `}ajouté par {f.addedBy} le {fmtDate(f.addedAt?.slice(0, 10))}</div>
                    </div>
                    <button onClick={() => window.open(`/api/upload/secure/${f.url}`, '_blank')}
                      style={{ padding: '5px 10px', background: 'rgba(26,86,219,0.08)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 6, color: '#1a56db', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Eye size={11} strokeWidth={1.8} /> Voir
                    </button>
                    <button onClick={() => handleDeleteFichier(i)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', flexShrink: 0 }}>
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: uploading ? 'var(--bg-hover)' : '#0f2d5e', color: uploading ? 'var(--text-muted)' : '#fff', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Upload size={13} strokeWidth={2} /> {uploading ? 'Upload en cours…' : 'Ajouter un fichier'}
                  <input ref={fileRef} type="file" style={{ display: 'none' }} disabled={uploading}
                    onChange={e => { if (e.target.files?.[0]) handleAddFichier(e.target.files[0]); }} />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TresorerieDevisFactures({ addToast }) {
  const { currentUser }    = useAuth();
  const { devisFactures: allDf, setDevisFactures } = useDataContext();
  const { setDevisFactureModal } = useAppContext();

  const [filter, setFilter]   = useState('pending');  // pending | all | done
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);     // df ouvert dans le drawer

  const PENDING  = ['Soumis', 'En traitement', 'Modif. demandée'];
  const DONE     = ['Signé', 'Refusé'];

  const filtered = allDf.filter(df => {
    if (filter === 'pending' && !PENDING.includes(df.statut)) return false;
    if (filter === 'done'    && !DONE.includes(df.statut))    return false;
    if (search) {
      const q = search.toLowerCase();
      if (!df.titre?.toLowerCase().includes(q) && !df.createdBy?.toLowerCase().includes(q) && !df.type?.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const p = { 'Modif. demandée': 6, Soumis: 5, 'En traitement': 4, Brouillon: 2, Refusé: 1, Signé: 0 };
    return (p[b.statut] ?? 0) - (p[a.statut] ?? 0);
  });

  const kpiPending    = allDf.filter(d => PENDING.includes(d.statut)).length;
  const kpiModif      = allDf.filter(d => d.statut === 'Modif. demandée').length;
  const kpiSignesMois = allDf.filter(d => {
    if (d.statut !== 'Signé') return false;
    const m = new Date(); return d.signedAt?.startsWith(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}`);
  }).length;
  const kpiMontantAttente = allDf.filter(d => PENDING.includes(d.statut)).reduce((s, d) => s + Number(d.montant), 0);

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const updated = await api.get('/devis-factures');
      setDevisFactures(updated);
      const refreshed = updated.find(d => d.id === selected.id);
      if (refreshed) setSelected(refreshed);
    } catch {}
  };

  return (
    <>
      <div className="eyebrow">Trésorerie</div>
      <div className="ptitle">Devis &amp; Factures — Gestion</div>

      {/* KPIs */}
      <div className="kpi-3col" style={{ marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-surface)', border: kpiPending > 0 ? '1px solid rgba(217,119,6,0.3)' : '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} strokeWidth={1.8} /> À traiter
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: kpiPending > 0 ? '#d97706' : 'var(--text-muted)' }}>{kpiPending}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fmtM(kpiMontantAttente)} en attente</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: kpiModif > 0 ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={11} strokeWidth={1.8} /> Modif. demandées
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: kpiModif > 0 ? '#7c3aed' : 'var(--text-muted)' }}>{kpiModif}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>en attente de validation</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={11} strokeWidth={1.8} /> Signés ce mois
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: kpiSignesMois > 0 ? '#16a34a' : 'var(--text-muted)' }}>{kpiSignesMois}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>documents traités</div>
        </div>
      </div>

      {/* Filtres + recherche */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'pending', label: `À traiter (${allDf.filter(d => PENDING.includes(d.statut)).length})` },
            { key: 'all',     label: `Tout (${allDf.length})` },
            { key: 'done',    label: `Archivés (${allDf.filter(d => DONE.includes(d.statut)).length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-light)', background: filter === f.key ? '#0f2d5e' : 'var(--bg-hover)', color: filter === f.key ? '#fff' : 'var(--text-dim)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un dossier, un membre…" style={{ flex: 1, minWidth: 180, fontSize: 12, padding: '6px 12px' }} />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          {filter === 'pending' ? 'Aucun dossier en attente. 🎉' : 'Aucun dossier dans cette catégorie.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(df => {
            const meta = STATUT_META[df.statut] || STATUT_META.Brouillon;
            const fichiers = Array.isArray(df.fichiers) ? df.fichiers : [];
            const commentaires = Array.isArray(df.commentaires) ? df.commentaires : [];
            const unreadComments = commentaires.filter(c => !c.isInternal).length;

            return (
              <div key={df.id}
                onClick={() => setSelected(df)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: `1px solid ${df.statut === 'Modif. demandée' ? 'rgba(124,58,237,0.3)' : 'var(--border-light)'}`, borderLeft: `4px solid ${meta.color}`, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-base)' }}>{df.titre}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{df.type}</span>
                    {df.horseBudget && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>⚠️ HB</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {df.createdBy}{df.soumisAt && ` · soumis ${fmtDate(df.soumisAt)}`}
                    {fichiers.length > 0 && <span style={{ marginLeft: 6 }}><Paperclip size={9} strokeWidth={1.8} style={{ display: 'inline' }} /> {fichiers.length}</span>}
                    {unreadComments > 0 && <span style={{ marginLeft: 6 }}><MessageSquare size={9} strokeWidth={1.8} style={{ display: 'inline' }} /> {unreadComments}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-base)' }}>{fmtM(df.montant)}</div>
                </div>
                <ChevronRight size={14} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <DossierDrawer
          df={selected}
          onClose={() => setSelected(null)}
          onRefresh={refreshSelected}
          addToast={addToast}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
