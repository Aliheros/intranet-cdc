// src/components/modals/DevisFactureModal.jsx
// Modal unifié : création / vue membre / traitement trésorerie
// Calqué sur NoteFraisModal.jsx
import React, { useState, useRef } from 'react';
import api from '../../api/apiClient';
import { X, AlertTriangle, FileText, Eye, Upload, Clock, CheckCircle2, Settings, Trash2, Camera } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const CATEGORIES_DF = ['Formation', 'Matériel', 'Prestation', 'Communication', 'Transport', 'Hébergement', 'Autre'];

const STATUT_META = {
  Brouillon:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Brouillon'     },
  Soumis:          { color: '#1a56db', bg: 'rgba(26,86,219,0.1)',    label: 'Soumis'        },
  'En traitement': { color: '#d97706', bg: 'rgba(217,119,6,0.1)',    label: 'En traitement' },
  Signé:           { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',    label: 'Signé ✓'       },
  Refusé:          { color: '#e63946', bg: 'rgba(230,57,70,0.1)',    label: 'Refusé'        },
};
const PIPELINE = ['Soumis', 'En traitement', 'Signé'];

const fmtM    = (m) => `${Number(m).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;
const fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = (s.slice(0, 10)).split('-'); return `${d}/${m}/${y}`; };

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
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done || active ? meta.color : 'var(--border-light)', border: `2px solid ${done || active ? meta.color : 'var(--border-light)'}`, transition: 'all 0.25s' }}>
                {done ? <CheckCircle2 size={12} strokeWidth={2.5} color="#fff" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : 'transparent' }} />}
              </div>
              <div style={{ fontSize: 9, fontWeight: active || done ? 700 : 500, color: active || done ? meta.color : 'var(--text-muted)', textAlign: 'center' }}>{s}</div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > sStep + 1 ? STATUT_META[PIPELINE[i + 1]].color : 'var(--border-light)', marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function DevisFactureModal({
  df, onClose,
  onDepose,          // création + soumission atomique
  onSaveDraft,       // création brouillon
  onUpdate,          // mise à jour brouillon
  onSoumettre,       // soumettre brouillon existant
  onDelete,          // supprimer brouillon
  onPrendreEnCharge, // trésorerie : prendre en charge
  onSigner,          // trésorerie : signer / refuser
  currentUser,
  canManage,
  addToast,
  devisFactures = [], // pour la section "Vos derniers dépôts"
}) {
  const { isClosing, handleClose } = useModalClose(onClose);

  const isNew      = !df.id;
  const isEditable = isNew || df.statut === 'Brouillon';
  const isManaging = canManage && !isNew && df.statut !== 'Brouillon';

  const [form, setForm] = useState({
    titre:           df.titre           || '',
    description:     df.description     || '',
    type:            df.type            || 'Devis',
    categorie:       df.categorie       || '',
    montant:         df.montant         || '',
    emetteur:        df.emetteur        || '',
    destinataire:    df.destinataire    || '',
    horseBudget:     df.horseBudget     || false,
    fichier:         df.fichier         || '',
    fichierOriginal: df.fichierOriginal || '',
    notes:           df.notes           || '',
  });
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [decision,   setDecision]   = useState('Signé');
  const [motifRefus, setMotifRefus] = useState('');
  const [tresoNotes, setTresoNotes] = useState(df.notes || '');
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm('/upload', fd);
      set('fichier', res.filename);
      set('fichierOriginal', res.nom || file.name);
    } catch {
      addToast?.("Erreur lors de l'upload", 'error');
    } finally {
      setUploading(false);
    }
  };

  const validBase = form.titre.trim() && Number(form.montant) > 0 && form.emetteur.trim() && form.destinataire.trim();

  const run = async (action) => {
    setSaving(true);
    try { await action(); handleClose(); }
    catch { /* toast géré dans handler */ }
    finally { setSaving(false); }
  };

  const historique  = Array.isArray(df.historique) ? df.historique : [];
  const meta        = STATUT_META[df.statut] || STATUT_META.Brouillon;

  // "Vos derniers dépôts" — visible uniquement en mode création
  const mesDepots = isNew
    ? (devisFactures || [])
        .filter(d => d.createdBy === currentUser?.nom || d.createdByUid === currentUser?.uid)
        .sort((a, b) => new Date(b.createdAt || b.soumisAt || 0) - new Date(a.createdAt || a.soumisAt || 0))
        .slice(0, 5)
    : [];

  return (
    <div className={`modal-overlay${isClosing ? ' is-closing' : ''}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? ' is-closing' : ''}`} style={{ width: '100%', maxWidth: 660, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="modal-header-title">
              <FileText size={16} strokeWidth={1.8} />
              {isNew ? 'Déposer un devis ou une facture' : (df.titre || `${df.type} — ${fmtM(df.montant)}`)}
            </div>
            {!isNew && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Par {df.createdBy}{df.soumisAt && ` · Soumis le ${fmtDate(df.soumisAt)}`}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
                {df.horseBudget && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '2px 7px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <AlertTriangle size={9} /> Hors budget
                  </span>
                )}
              </div>
            )}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* ── CORPS ── */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ─ Vos derniers dépôts (création uniquement) ─ */}
          {isNew && mesDepots.length > 0 && (
            <div style={{ background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.12)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={11} strokeWidth={1.8} /> Vos derniers dépôts
                {(() => {
                  const pending = mesDepots.filter(d => ['Soumis', 'En traitement'].includes(d.statut));
                  return pending.length > 0 ? (
                    <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'rgba(217,119,6,0.12)', color: '#d97706', fontWeight: 700 }}>
                      {pending.length} en attente
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mesDepots.map(d => {
                  const m = STATUT_META[d.statut] || STATUT_META.Brouillon;
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 60 }}>
                        {d.soumisAt ? fmtDate(d.soumisAt) : '—'}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-base)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.titre || d.type}
                      </span>
                      <span style={{ fontWeight: 800, color: m.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {fmtM(d.montant)}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 10 }}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ Historique (document existant) ─ */}
          {!isNew && historique.length > 0 && (
            <div style={{ background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.12)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} strokeWidth={1.8} /> Historique de traitement
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {historique.map((h, i) => {
                  const hm = STATUT_META[h.statut] || STATUT_META.Brouillon;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {fmtDate(h.date?.slice(0, 10))}
                      </span>
                      <span style={{ padding: '1px 8px', borderRadius: 12, fontWeight: 700, background: hm.bg, color: hm.color, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 10 }}>
                        {h.action || hm.label}
                      </span>
                      {h.detail && <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>· {h.detail}</span>}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>par {h.auteur}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ Pipeline statut (document non brouillon, non refusé) ─ */}
          {!isNew && !['Brouillon', 'Refusé'].includes(df.statut) && <StatusPipeline statut={df.statut} />}

          {/* ─ Bandeau refus ─ */}
          {!isNew && df.statut === 'Refusé' && df.motifRefus && (
            <div style={{ padding: '10px 14px', background: 'rgba(230,57,70,0.06)', borderLeft: '3px solid #e63946', borderRadius: '0 8px 8px 0', fontSize: 13, color: '#e63946' }}>
              <strong>Motif de refus :</strong> {df.motifRefus}
            </div>
          )}

          {/* ─ Bandeau accepté ─ */}
          {!isNew && df.statut === 'Signé' && (
            <div style={{ padding: '10px 14px', background: 'rgba(22,163,74,0.06)', borderLeft: '3px solid #16a34a', borderRadius: '0 8px 8px 0', fontSize: 13, color: '#16a34a' }}>
              ✓ Accepté le {fmtDate(df.signedAt)} {df.signataire && `par ${df.signataire}`}
            </div>
          )}

          {/* ─ FORMULAIRE ─ */}
          {isEditable && (
            <>
              {/* Type + Catégorie */}
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
                    {CATEGORIES_DF.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="form-label">Intitulé *</label>
                <input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)}
                  placeholder="Ex : Devis impression flyers, Facture formation…" />
              </div>

              {/* Émetteur + Destinataire */}
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

              {/* Montant + Hors budget */}
              <div className="form-2col">
                <div>
                  <label className="form-label">Montant (€) *</label>
                  <input type="number" min="0.01" step="0.01" className="form-input"
                    value={form.montant} onChange={e => set('montant', e.target.value)}
                    style={{ fontSize: 18, fontWeight: 800, color: '#1a56db' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13, fontWeight: 600, color: form.horseBudget ? '#d97706' : 'var(--text-dim)' }}>
                    <input type="checkbox" checked={form.horseBudget} onChange={e => set('horseBudget', e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: '#d97706', flexShrink: 0 }} />
                    Hors budget
                  </label>
                  {form.horseBudget && (
                    <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, paddingLeft: 23 }}>⚠️ Approbation non garantie</div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description / justification</label>
                <textarea className="form-input" value={form.description || ''} onChange={e => set('description', e.target.value)}
                  placeholder="Contexte, objectif, lien avec une action ou un projet…" rows={2}
                  style={{ resize: 'vertical' }} />
              </div>

              {/* Justificatif upload */}
              <div>
                <label className="form-label">Document joint (PDF, image, Word…)</label>
                <div style={{ border: '2px dashed var(--border-light)', borderRadius: 8, padding: '16px 20px', textAlign: 'center', background: 'var(--bg-alt)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {form.fichier ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <FileText size={20} strokeWidth={1.5} color="#16a34a" />
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, wordBreak: 'break-all' }}>{form.fichierOriginal || form.fichier}</span>
                      <button
                        onClick={() => window.open(`/api/upload/secure/${form.fichier}`, '_blank')}
                        style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(26,86,219,0.1)', color: '#1a56db', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={11} strokeWidth={1.8} /> Voir
                      </button>
                      <button onClick={() => { set('fichier', ''); set('fichierOriginal', ''); }}
                        style={{ background: 'none', border: 'none', color: '#e63946', cursor: 'pointer', display: 'inline-flex' }}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ) : uploading ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload en cours…</div>
                  ) : (
                    <>
                      <span style={{ opacity: 0.4, display: 'inline-flex' }}><Camera size={22} strokeWidth={1.5} /></span>
                      <label style={{ padding: '6px 18px', background: '#1a56db', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Ajouter le document
                        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                      </label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF, Word, Excel, image · max 20 Mo</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ─ VUE LECTURE SEULE (soumis, pas trésorerie) ─ */}
          {!isEditable && !isManaging && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                <span><strong>Type :</strong> {df.type}</span>
                {df.categorie && <span>· <strong>Catégorie :</strong> {df.categorie}</span>}
                <span>· <strong>Montant :</strong> {fmtM(df.montant)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {df.emetteur} → {df.destinataire}
              </div>
              {df.description && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                  {df.description}
                </div>
              )}
              {df.fichier && (
                <button onClick={() => window.open(`/api/upload/secure/${df.fichier}`, '_blank')}
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(26,86,219,0.07)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 8, color: '#1a56db', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Eye size={14} /> {df.fichierOriginal || 'Voir le document'}
                </button>
              )}
            </div>
          )}

          {/* ─ ZONE TRÉSORERIE ─ */}
          {isManaging && (
            <>
              {/* Détails du document */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                <span><strong>Type :</strong> {df.type}</span>
                {df.categorie && <span>· <strong>Catégorie :</strong> {df.categorie}</span>}
                <span>· <strong>Montant :</strong> <strong style={{ fontSize: 15, color: 'var(--text-base)' }}>{fmtM(df.montant)}</strong></span>
                {df.horseBudget && <span style={{ color: '#d97706', fontWeight: 700 }}>· ⚠️ Hors budget</span>}
              </div>
              {df.description && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px' }}>
                  {df.description}
                </div>
              )}

              {/* Justificatif joint */}
              <div style={{ padding: 16, background: 'rgba(26,86,219,0.04)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Document joint</div>
                {df.fichier ? (
                  <button onClick={() => window.open(`/api/upload/secure/${df.fichier}`, '_blank')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(26,86,219,0.07)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 8, color: '#1a56db', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Eye size={14} /> {df.fichierOriginal || 'Voir le document'}
                  </button>
                ) : (
                  <div style={{ padding: '10px 14px', background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 8, fontSize: 12, color: '#e63946', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} strokeWidth={1.8} /> Aucun document joint par le demandeur.
                  </div>
                )}
              </div>

              {/* Prendre en charge */}
              {df.statut === 'Soumis' && (
                <button onClick={() => run(() => onPrendreEnCharge(df.id))} disabled={saving}
                  style={{ alignSelf: 'flex-start', padding: '7px 16px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} /> Prendre en charge
                </button>
              )}

              {/* Décision finale */}
              <div style={{ padding: 16, background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Settings size={11} strokeWidth={1.8} /> Traitement trésorerie
                </div>
                <div className="form-2col" style={{ gap: 12, marginBottom: 10 }}>
                  {['Signé', 'Refusé'].map(d => (
                    <button key={d} onClick={() => setDecision(d)}
                      style={{ padding: '8px 0', borderRadius: 8, border: `2px solid ${decision === d ? (d === 'Signé' ? '#16a34a' : '#e63946') : 'var(--border-light)'}`, background: decision === d ? (d === 'Signé' ? 'rgba(22,163,74,0.08)' : 'rgba(230,57,70,0.08)') : 'transparent', color: decision === d ? (d === 'Signé' ? '#16a34a' : '#e63946') : 'var(--text-dim)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {d === 'Signé' ? '✓ Accepter' : '✗ Refuser'}
                    </button>
                  ))}
                </div>
                {decision === 'Refusé' && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="form-label">Motif de refus *</label>
                    <textarea className="form-input" value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
                      placeholder="Expliquer clairement le motif du refus…" rows={2} style={{ resize: 'vertical' }} />
                  </div>
                )}
                <div>
                  <label className="form-label">Commentaire (optionnel)</label>
                  <input type="text" className="form-input" value={tresoNotes} onChange={e => setTresoNotes(e.target.value)}
                    placeholder="Notes internes pour archivage…" />
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    disabled={saving || (decision === 'Refusé' && !motifRefus.trim())}
                    onClick={() => run(() => onSigner(df.id, decision, motifRefus, tresoNotes))}
                    style={{ padding: '8px 20px', background: decision === 'Signé' ? '#16a34a' : '#e63946', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: (saving || (decision === 'Refusé' && !motifRefus.trim())) ? 0.5 : 1 }}>
                    {saving ? 'Traitement…' : decision === 'Signé' ? 'Confirmer la signature' : 'Confirmer le refus'}
                  </button>
                </div>
              </div>

              {/* Infos traitement */}
              {(df.traitePar || df.signataire) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                  {df.traitePar  && <span>Pris en charge par <strong>{df.traitePar}</strong>{df.traiteAt && ` le ${fmtDate(df.traiteAt)}`}</span>}
                  {df.signataire && <span>Décision par <strong>{df.signataire}</strong>{df.signedAt && ` le ${fmtDate(df.signedAt)}`}</span>}
                </div>
              )}
            </>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className="modal-footer-split" style={{ flexWrap: 'wrap' }}>
          {/* Gauche : suppression brouillon */}
          <div>
            {!isNew && isEditable && df.statut === 'Brouillon' && onDelete && (
              <button
                onClick={() => run(() => onDelete(df.id))}
                style={{ padding: '7px 14px', background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#e63946', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} strokeWidth={1.8} /> Supprimer le brouillon
              </button>
            )}
          </div>

          {/* Droite : actions principales */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-secondary" onClick={handleClose}>Fermer</button>

            {/* Création : brouillon + soumettre */}
            {isNew && (
              <>
                <button className="btn-secondary" disabled={saving || !validBase}
                  onClick={() => run(() => onSaveDraft(form))}>
                  Brouillon
                </button>
                <button
                  className="btn-primary"
                  disabled={saving || uploading || !validBase}
                  onClick={() => {
                    if (!validBase) { addToast?.('Titre, montant, émetteur et destinataire requis.', 'error'); return; }
                    run(() => onDepose(form));
                  }}
                  style={{ background: '#e63946' }}>
                  <Upload size={14} strokeWidth={1.8} style={{ marginRight: 6 }} />
                  {saving ? 'Dépôt en cours…' : 'Soumettre à la trésorerie'}
                </button>
              </>
            )}

            {/* Brouillon existant : sauvegarder + soumettre */}
            {!isNew && isEditable && (
              <>
                <button className="btn-secondary" disabled={saving || !validBase}
                  onClick={() => run(() => onUpdate(df.id, form))}>
                  {saving ? 'Enregistrement…' : 'Brouillon'}
                </button>
                <button
                  className="btn-primary"
                  disabled={saving || !validBase}
                  onClick={() => run(() => onSoumettre(df.id))}
                  style={{ background: '#e63946' }}>
                  <Upload size={14} strokeWidth={1.8} style={{ marginRight: 6 }} />
                  Soumettre à la trésorerie
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
