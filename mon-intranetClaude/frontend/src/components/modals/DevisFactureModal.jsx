// src/components/modals/DevisFactureModal.jsx
// Modal devis/factures — sans onglets, page unique, inspiré NoteFraisModal
import React, { useState, useRef } from 'react';
import api, { SERVER_URL } from '../../api/apiClient';
import { useModalClose } from '../../hooks/useModalClose';
import {
  X, FileText, Upload, Eye, Trash2, Plus, Send,
  CheckCircle2, AlertTriangle, RefreshCw, Settings, Paperclip,
  ClipboardList, MessageSquare,
} from 'lucide-react';

const STATUT_META = {
  Brouillon:          { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Brouillon'       },
  Soumis:             { color: '#1a56db', bg: 'rgba(26,86,219,0.1)',   label: 'Soumis'          },
  'En traitement':    { color: '#d97706', bg: 'rgba(217,119,6,0.1)',   label: 'En traitement'   },
  'Modif. demandée':  { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', label: 'Modif. demandée' },
  Signé:              { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Signé ✓'         },
  Refusé:             { color: '#e63946', bg: 'rgba(230,57,70,0.1)',   label: 'Refusé'          },
};
const PIPELINE = ['Soumis', 'En traitement', 'Signé'];

const fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = (s || '').slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const fmtM    = (v) => `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

const StatusPipeline = ({ statut }) => {
  const step = statut === 'Soumis' ? 1 : statut === 'En traitement' ? 2 : statut === 'Signé' ? 3 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
      {PIPELINE.map((s, i) => {
        const sStep = i + 1;
        const done   = step > sStep;
        const active = step === sStep;
        const meta   = STATUT_META[s];
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done || active ? meta.color : 'var(--border-light)', border: `2px solid ${done || active ? meta.color : 'var(--border-light)'}`, transition: 'all 0.3s' }}>
                {done ? <CheckCircle2 size={12} strokeWidth={2.5} color="#fff" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : 'transparent' }} />}
              </div>
              <div style={{ fontSize: 9, fontWeight: active || done ? 700 : 500, color: active || done ? meta.color : 'var(--text-muted)', textAlign: 'center', transition: 'color 0.3s' }}>{s}</div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > sStep + 1 ? STATUT_META[PIPELINE[i + 1]].color : 'var(--border-light)', marginBottom: 14, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function DevisFactureModal({
  df, onClose,
  onSaveDraft,
  onDepose,
  onUpdate,
  onSoumettre,
  onDelete,
  onPrendreEnCharge,
  onSigner,
  onRefreshDf,
  currentUser,
  canManage = false,
  addToast,
  categories = [],
  devisFactures = [],
}) {
  const { isClosing, handleClose } = useModalClose(onClose);

  const isNew      = !df?.id;
  const isEditable = isNew || df?.statut === 'Brouillon' || (!canManage && df?.statut === 'Modif. demandée');
  const meta       = STATUT_META[df?.statut] || STATUT_META.Brouillon;

  const [form, setForm] = useState({
    titre:        df?.titre        || '',
    description:  df?.description  || '',
    type:         df?.type         || 'Devis',
    categorie:    df?.categorie    || '',
    montant:      df?.montant      || '',
    emetteur:     df?.emetteur     || '',
    destinataire: df?.destinataire || '',
  });
  const [saving,       setSaving]   = useState(false);
  const [uploading,    setUploading] = useState(false);
  const [deletingIdx,  setDelIdx]   = useState(null);
  const [newComment,   setComment]  = useState('');

  // Tréso management panel state
  const [tresoPanel,   setTresoPanel]  = useState(null); // null | 'modif' | 'signer' | 'refuser'
  const [modifMsg,     setModifMsg]    = useState('');
  const [signerNotes,  setSignerNotes] = useState('');
  const [refusMsg,     setRefusMsg]    = useState('');

  // Member response to modif request
  const [reponseMsg,   setReponseMsg]  = useState('');

  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fichiers     = Array.isArray(df?.fichiers)     ? df.fichiers     : [];
  const commentaires = Array.isArray(df?.commentaires) ? df.commentaires : [];
  const historique   = Array.isArray(df?.historique)   ? df.historique   : [];
  const modif        = df?.demandeModif;

  const validBase = form.titre.trim() && Number(form.montant) > 0 && form.emetteur.trim() && form.destinataire.trim();

  const run = async (fn, successMsg) => {
    setSaving(true);
    try {
      await fn();
      if (successMsg) addToast?.(successMsg);
      handleClose();
    } catch (err) {
      addToast?.(err.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runRefresh = async (fn, successMsg) => {
    setSaving(true);
    try {
      await fn();
      if (successMsg) addToast?.(successMsg);
      await onRefreshDf?.(df.id);
    } catch (err) {
      addToast?.(err.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm('/upload', fd);
      if (df?.id) {
        await api.post(`/devis-factures/${df.id}/fichiers`, {
          nom:    res.nom || file.name,
          url:    res.filename,
          taille: `${Math.round(file.size / 1024)} Ko`,
        });
        addToast?.('Fichier ajouté.');
        await onRefreshDf?.(df.id);
      } else {
        set('_pendingFile', { nom: res.nom || file.name, url: res.filename, taille: `${Math.round(file.size / 1024)} Ko` });
        addToast?.('Fichier joint — il sera transmis avec la soumission.');
      }
    } catch (err) {
      addToast?.(err.message || 'Erreur upload', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteFichier = async (idx) => {
    if (!df?.id) return;
    setDelIdx(idx);
    try {
      await api.delete(`/devis-factures/${df.id}/fichiers/${idx}`);
      addToast?.('Fichier supprimé.');
      await onRefreshDf?.(df.id);
    } catch (err) {
      addToast?.(err.message || 'Erreur', 'error');
    } finally {
      setDelIdx(null);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !df?.id) return;
    await runRefresh(
      () => api.post(`/devis-factures/${df.id}/commentaires`, { contenu: newComment.trim() }),
      'Message envoyé.'
    );
    setComment('');
  };

  const handleDemandeModif = async () => {
    if (!modifMsg.trim()) return;
    await runRefresh(
      () => api.post(`/devis-factures/${df.id}/demande-modif`, { message: modifMsg.trim() }),
      'Demande de modification envoyée au déposant.'
    );
    setTresoPanel(null);
    setModifMsg('');
  };

  const handleRepondreModif = async () => {
    await runRefresh(
      () => api.post(`/devis-factures/${df.id}/repondre-modif`, { message: reponseMsg.trim() || undefined }),
      'Dossier renvoyé à la trésorerie pour examen.'
    );
    setReponseMsg('');
  };

  const catOptions = categories.length > 0
    ? categories.map(c => c.label)
    : ['Formation', 'Matériel', 'Prestation', 'Communication', 'Transport', 'Hébergement', 'Autre'];

  const isManaging = canManage && !isNew && df?.statut !== 'Brouillon';
  const pubComments = commentaires.filter(c => !c.isInternal);

  const mesDepots = isNew
    ? (devisFactures || [])
        .filter(d => d.createdBy === currentUser?.nom)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3)
    : [];

  return (
    <div className={`modal-overlay${isClosing ? ' is-closing' : ''}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? ' is-closing' : ''}`}
        style={{ width: '100%', maxWidth: 660, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-header-title">
              <FileText size={16} strokeWidth={1.8} />
              {isNew ? 'Déposer un document' : (df.titre || `${df.type} — ${fmtM(df.montant)}`)}
            </div>
            {!isNew && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Par {df.createdBy}{df.soumisAt && ` · Soumis le ${fmtDate(df.soumisAt)}`}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color, transition: 'all 0.3s' }}>{meta.label}</span>
                {df.horseBudget && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>⚠ Hors budget</span>}
              </div>
            )}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>

          {/* Derniers dépôts (création) */}
          {isNew && mesDepots.length > 0 && (
            <div style={{ background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.12)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Vos derniers dépôts</div>
              {mesDepots.map(d => {
                const m = STATUT_META[d.statut] || STATUT_META.Brouillon;
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 60 }}>{fmtDate(d.soumisAt || d.createdAt?.slice(0, 10))}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{d.titre || d.type}</span>
                    <span style={{ fontWeight: 800, color: m.color }}>{fmtM(d.montant)}</span>
                    <span style={{ padding: '2px 7px', borderRadius: 10, fontWeight: 700, background: m.bg, color: m.color, fontSize: 10 }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bannière — modification demandée (membre voit la demande de la tréso) */}
          {!canManage && df?.statut === 'Modif. demandée' && modif && (
            <div style={{ padding: '14px 16px', background: 'rgba(124,58,237,0.07)', border: '1.5px solid rgba(124,58,237,0.3)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, color: '#7c3aed', marginBottom: 8, fontSize: 13 }}>
                <RefreshCw size={14} strokeWidth={2} /> La trésorerie demande une modification
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 12 }}>
                « {modif.message} »
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Demandé par {modif.demandePar} · {fmtDate(modif.demandeAt?.slice(0, 10))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, background: 'rgba(124,58,237,0.05)', padding: '8px 12px', borderRadius: 8 }}>
                Mettez à jour votre document et/ou les fichiers joints ci-dessous, puis cliquez sur "J'ai effectué les modifications".
              </div>
              <textarea className="form-input" rows={2} value={reponseMsg} onChange={e => setReponseMsg(e.target.value)}
                placeholder="Message optionnel à la trésorerie (résumé des changements effectués)…"
                style={{ resize: 'vertical', marginBottom: 10, fontSize: 12 }} />
              <button onClick={handleRepondreModif} disabled={saving}
                style={{ padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} strokeWidth={2} /> {saving ? 'Envoi…' : "J'ai effectué les modifications"}
              </button>
            </div>
          )}

          {/* Bannière — tréso a envoyé une demande, attente de réponse */}
          {canManage && df?.statut === 'Modif. demandée' && modif && (
            <div style={{ padding: '12px 14px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} strokeWidth={2} /> Modification demandée — en attente du déposant
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Message : « {modif.message} » — envoyé par {modif.demandePar}
              </div>
            </div>
          )}

          {/* Bannière refusé */}
          {df?.statut === 'Refusé' && (
            <div style={{ padding: '12px 14px', background: 'rgba(230,57,70,0.06)', borderLeft: '3px solid #e63946', borderRadius: '0 8px 8px 0', fontSize: 13 }}>
              <strong style={{ color: '#e63946' }}>Dossier refusé</strong>
              {df.motifRefus && <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>{df.motifRefus}</div>}
            </div>
          )}

          {/* Bannière signé */}
          {df?.statut === 'Signé' && (
            <div style={{ padding: '12px 14px', background: 'rgba(22,163,74,0.06)', borderLeft: '3px solid #16a34a', borderRadius: '0 8px 8px 0', fontSize: 13 }}>
              <strong style={{ color: '#16a34a' }}>Dossier accepté et signé</strong>
              <div style={{ marginTop: 4, color: 'var(--text-dim)', fontSize: 12 }}>
                Signé le {fmtDate(df.signedAt)}{df.signataire && ` par ${df.signataire}`}
                {df.transactionId && <span> · Transaction #{df.transactionId} créée.</span>}
              </div>
              {df.notes && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>{df.notes}</div>}
            </div>
          )}

          {/* Pipeline statut */}
          {!isNew && !['Brouillon', 'Refusé', 'Modif. demandée'].includes(df?.statut) && (
            <StatusPipeline statut={df.statut} />
          )}

          {/* Synthèse infos */}
          {!isNew && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-dim)', background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 8 }}>
              <span><strong>Type :</strong> {df.type}</span>
              {df.categorie && <span>· <strong>Catégorie :</strong> {df.categorie}</span>}
              <span>· <strong>Montant :</strong> <strong style={{ fontSize: 15, color: 'var(--text-base)' }}>{fmtM(df.montant)}</strong></span>
              <div style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)' }}>{df.emetteur} → {df.destinataire}</div>
              {df.description && <div style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{df.description}</div>}
            </div>
          )}

          {/* Formulaire (nouveau ou brouillon ou modif demandée membre) */}
          {isEditable && (
            <>
              <div className="form-2col">
                <div>
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option>Devis</option>
                    <option>Facture</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Catégorie</label>
                  <select className="form-select" value={form.categorie || ''} onChange={e => set('categorie', e.target.value)}>
                    <option value="">— Choisir —</option>
                    {catOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Intitulé *</label>
                <input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)}
                  placeholder="Ex : Devis impression flyers, Facture formation…" />
              </div>
              <div className="form-2col">
                <div>
                  <label className="form-label">Émetteur *</label>
                  <input className="form-input" value={form.emetteur} onChange={e => set('emetteur', e.target.value)}
                    placeholder="Prestataire / organisme" />
                </div>
                <div>
                  <label className="form-label">Destinataire *</label>
                  <input className="form-input" value={form.destinataire} onChange={e => set('destinataire', e.target.value)}
                    placeholder="Association / pôle" />
                </div>
              </div>
              <div>
                <label className="form-label">Montant (€) *</label>
                <input type="number" min="0.01" step="0.01" className="form-input"
                  value={form.montant} onChange={e => set('montant', e.target.value)}
                  style={{ fontSize: 20, fontWeight: 800, color: '#1a56db', maxWidth: 200 }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Le statut "hors budget" est déterminé automatiquement à la soumission.
                </div>
              </div>
              <div>
                <label className="form-label">Description / justification</label>
                <textarea className="form-input" value={form.description || ''} onChange={e => set('description', e.target.value)}
                  placeholder="Contexte, objectif, lien avec une action ou un projet…"
                  rows={2} style={{ resize: 'vertical' }} />
              </div>
            </>
          )}

          {/* Fichiers — section trésorerie (canManage, non-nouveau) */}
          {isManaging && (
            <div style={{ padding: 16, background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Paperclip size={11} strokeWidth={1.8} /> Documents joints
              </div>
              {fichiers.length === 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 8, fontSize: 12, color: '#e63946', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={1.8} /> Aucun fichier joint par le déposant.
                </div>
              )}
              {fichiers.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-light)', marginBottom: 6, transition: 'opacity 0.2s', opacity: deletingIdx === i ? 0.4 : 1 }}>
                  <FileText size={16} strokeWidth={1.5} color="#1a56db" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nom || f.url}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.taille && `${f.taille} · `}par {f.addedBy || '—'}</div>
                  </div>
                  <a href={`${SERVER_URL}/api/upload/secure/${f.url}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 10px', background: 'rgba(26,86,219,0.08)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 6, color: '#1a56db', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <Eye size={11} strokeWidth={1.8} /> Voir
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Fichiers — zone éditable (membre) */}
          {!isManaging && (
            <div>
              <label className="form-label">
                Documents joints{isEditable && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}> (au moins 1 requis pour soumettre)</span>}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fichiers.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-light)', transition: 'opacity 0.2s', opacity: deletingIdx === i ? 0.4 : 1 }}>
                    <FileText size={16} strokeWidth={1.5} color="#1a56db" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nom || f.url}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.taille}</div>
                    </div>
                    <a href={`${SERVER_URL}/api/upload/secure/${f.url}`} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '5px 10px', background: 'rgba(26,86,219,0.08)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 6, color: '#1a56db', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      <Eye size={11} strokeWidth={1.8} /> Voir
                    </a>
                    {isEditable && (
                      <button onClick={() => handleDeleteFichier(i)} disabled={deletingIdx !== null}
                        style={{ background: 'none', border: 'none', cursor: deletingIdx !== null ? 'not-allowed' : 'pointer', color: '#e63946', opacity: deletingIdx !== null ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                ))}
                {form._pendingFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(22,163,74,0.06)', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)' }}>
                    <FileText size={14} strokeWidth={1.5} color="#16a34a" />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{form._pendingFile.nom}</span>
                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>Prêt</span>
                    <button onClick={() => set('_pendingFile', null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946' }}>
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                )}
                {(isEditable || ['Soumis', 'En traitement', 'Modif. demandée'].includes(df?.statut)) && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: uploading ? 'var(--bg-hover)' : '#1a56db', color: uploading ? 'var(--text-muted)' : '#fff', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, alignSelf: 'flex-start', transition: 'background 0.2s' }}>
                    <Upload size={13} strokeWidth={2} />
                    {uploading ? 'Upload en cours…' : fichiers.length + (form._pendingFile ? 1 : 0) > 0 ? 'Ajouter un autre fichier' : 'Joindre un document'}
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                      style={{ display: 'none' }} disabled={uploading}
                      onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Historique */}
          {!isNew && historique.length > 0 && (
            <div style={{ background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.12)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClipboardList size={11} strokeWidth={1.8} /> Historique de traitement
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...historique].reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, opacity: i === 0 ? 1 : 0.75 }}>
                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 60 }}>{fmtDate(h.date?.slice(0, 10))}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>{h.action}</span>
                    {h.detail && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>· {h.detail}</span>}
                    {h.auteur && <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>par {h.auteur}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages — échanges membre / trésorerie */}
          {!isNew && ['Soumis', 'En traitement', 'Modif. demandée', 'Signé'].includes(df?.statut) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={11} strokeWidth={1.8} /> Messages
                {pubComments.length > 0 && <span style={{ padding: '1px 6px', borderRadius: 8, background: 'var(--bg-alt)', fontSize: 9, fontWeight: 700 }}>{pubComments.length}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pubComments.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0', fontStyle: 'italic' }}>
                    Aucun message échangé.
                  </div>
                )}
                {pubComments.map((c, i) => {
                  const isMe = c.auteur === currentUser?.nom;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMe ? '#0f2d5e' : 'var(--bg-hover)', color: isMe ? '#fff' : 'var(--text-base)', fontSize: 13, lineHeight: 1.5 }}>
                        {c.contenu}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {c.auteur} · {new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, marginTop: 8, borderTop: '1px solid var(--border-light)' }}>
                <input className="form-input" value={newComment} onChange={e => setComment(e.target.value)}
                  placeholder={canManage ? 'Message au déposant…' : 'Message à la trésorerie…'}
                  style={{ flex: 1, fontSize: 12 }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} />
                <button onClick={handleSendComment} disabled={!newComment.trim() || saving}
                  style={{ padding: '0 14px', background: '#0f2d5e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', opacity: !newComment.trim() || saving ? 0.5 : 1, flexShrink: 0, transition: 'opacity 0.15s' }}>
                  <Send size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {/* ── Zone traitement trésorerie ── */}
          {isManaging && (
            <div style={{ padding: 16, background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Settings size={11} strokeWidth={1.8} /> Traitement trésorerie
              </div>

              {/* Prendre en charge */}
              {df?.statut === 'Soumis' && (
                <button onClick={() => run(() => onPrendreEnCharge(df.id), 'Dossier pris en charge.')}
                  disabled={saving}
                  style={{ padding: '9px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <CheckCircle2 size={14} strokeWidth={2} /> Prendre en charge
                </button>
              )}

              {/* Actions si En traitement (ou Modif. demandée — on peut quand même signer/refuser) */}
              {['En traitement', 'Modif. demandée'].includes(df?.statut) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Demander une modification (seulement si En traitement) */}
                  {df?.statut === 'En traitement' && (
                    <>
                      {tresoPanel !== 'modif' ? (
                        <button onClick={() => { setTresoPanel('modif'); setModifMsg(''); }}
                          style={{ alignSelf: 'flex-start', padding: '7px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', color: '#7c3aed', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}>
                          <RefreshCw size={12} strokeWidth={2} /> Demander une modification
                        </button>
                      ) : (
                        <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>Message pour le déposant *</div>
                          <textarea className="form-input" rows={3} value={modifMsg} onChange={e => setModifMsg(e.target.value)}
                            placeholder="Expliquez ce qui doit être corrigé ou complété…"
                            style={{ resize: 'vertical', marginBottom: 10 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleDemandeModif} disabled={saving || !modifMsg.trim()}
                              style={{ padding: '7px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !modifMsg.trim() || saving ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                              {saving ? 'Envoi…' : 'Envoyer la demande'}
                            </button>
                            <button onClick={() => setTresoPanel(null)}
                              style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Signer / Accepter */}
                  {tresoPanel !== 'signer' ? (
                    <button onClick={() => { setTresoPanel('signer'); setSignerNotes(''); }}
                      style={{ alignSelf: 'flex-start', padding: '7px 14px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', color: '#16a34a', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}>
                      <CheckCircle2 size={12} strokeWidth={2} /> Signer / Accepter
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>Notes internes (optionnel)</div>
                      <textarea className="form-input" rows={2} value={signerNotes} onChange={e => setSignerNotes(e.target.value)}
                        placeholder="Conditions, numéro de bon de commande, remarques…"
                        style={{ resize: 'vertical', marginBottom: 10 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => run(() => onSigner(df.id, 'Signé', null, signerNotes || null), 'Dossier accepté et signé.')}
                          disabled={saving}
                          style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                          {saving ? 'Traitement…' : 'Confirmer la signature'}
                        </button>
                        <button onClick={() => setTresoPanel(null)}
                          style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Refuser */}
                  {tresoPanel !== 'refuser' ? (
                    <button onClick={() => { setTresoPanel('refuser'); setRefusMsg(''); }}
                      style={{ alignSelf: 'flex-start', padding: '7px 14px', background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.25)', color: '#e63946', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}>
                      <X size={12} strokeWidth={2} /> Refuser
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(230,57,70,0.05)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e63946', marginBottom: 8 }}>Motif du refus *</div>
                      <textarea className="form-input" rows={3} value={refusMsg} onChange={e => setRefusMsg(e.target.value)}
                        placeholder="Expliquez pourquoi ce dossier est refusé…"
                        style={{ resize: 'vertical', marginBottom: 10 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => run(() => onSigner(df.id, 'Refusé', refusMsg, null), 'Dossier refusé.')}
                          disabled={saving || !refusMsg.trim()}
                          style={{ padding: '7px 16px', background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !refusMsg.trim() || saving ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                          {saving ? 'Traitement…' : 'Confirmer le refus'}
                        </button>
                        <button onClick={() => setTresoPanel(null)}
                          style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer sticky ── */}
        <div className="modal-footer-split" style={{ flexWrap: 'wrap', flexShrink: 0, borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface)', position: 'sticky', bottom: 0 }}>
          <div>
            {!isNew && df?.statut === 'Brouillon' && onDelete && (
              <button onClick={() => run(() => onDelete(df.id), 'Brouillon supprimé.')}
                style={{ padding: '7px 14px', background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#e63946', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} strokeWidth={1.8} /> Supprimer
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={handleClose}>Fermer</button>

            {isNew && (
              <>
                <button className="btn-secondary" disabled={saving || !validBase}
                  onClick={() => run(() => onSaveDraft(form), 'Brouillon sauvegardé.')}>
                  Brouillon
                </button>
                <button className="btn-primary" disabled={saving || uploading || !validBase || (!fichiers.length && !form._pendingFile)}
                  onClick={() => {
                    if (!validBase) { addToast?.('Tous les champs requis sont obligatoires.', 'error'); return; }
                    if (!fichiers.length && !form._pendingFile) { addToast?.('Un justificatif est obligatoire.', 'error'); return; }
                    run(() => onDepose({ ...form }), 'Demande transmise à la trésorerie.');
                  }}
                  style={{ background: '#0f2d5e', transition: 'opacity 0.15s' }}>
                  <Upload size={13} strokeWidth={2} /> {saving ? 'Dépôt…' : 'Soumettre'}
                </button>
              </>
            )}

            {!isNew && df?.statut === 'Brouillon' && (
              <>
                <button className="btn-secondary" disabled={saving || !validBase}
                  onClick={() => run(() => onUpdate(df.id, form), 'Brouillon mis à jour.')}>
                  {saving ? 'Enreg…' : 'Enregistrer'}
                </button>
                <button className="btn-primary" disabled={saving || !validBase || fichiers.length === 0}
                  onClick={() => run(() => onSoumettre(df.id), 'Demande transmise à la trésorerie.')}
                  style={{ background: '#0f2d5e' }}>
                  <Upload size={13} strokeWidth={2} /> Soumettre
                </button>
              </>
            )}

            {/* Membre avec Modif. demandée — peut sauvegarder les champs */}
            {!isNew && !canManage && df?.statut === 'Modif. demandée' && (
              <button className="btn-secondary" disabled={saving || !validBase}
                onClick={() => runRefresh(() => onUpdate(df.id, form), 'Document mis à jour.')}>
                {saving ? 'Enreg…' : 'Enregistrer les modifications'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
