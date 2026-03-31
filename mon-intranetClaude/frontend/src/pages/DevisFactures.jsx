// src/pages/DevisFactures.jsx
// Vue personnelle de dépôt et suivi de devis/factures — modélisée sur NoteFrais.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { formatDateShort } from '../utils/utils';
import {
  FileText, Plus, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, Receipt,
} from 'lucide-react';

const STATUT_META = {
  Brouillon:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Brouillon',     step: 0 },
  Soumis:          { color: '#1a56db', bg: 'rgba(26,86,219,0.1)',    label: 'Soumis',        step: 1 },
  'En traitement': { color: '#d97706', bg: 'rgba(217,119,6,0.1)',    label: 'En traitement', step: 2 },
  Signé:           { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',    label: 'Signé ✓',       step: 3 },
  Refusé:          { color: '#e63946', bg: 'rgba(230,57,70,0.1)',    label: 'Refusé',        step: -1 },
};

const PIPELINE = ['Soumis', 'En traitement', 'Signé'];

const fmtDate = (s) => s ? formatDateShort(s) : '—';
const fmtM    = (m) => `${Number(m).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

// ─── Barre de progression (dans chaque carte) ────────────────────────────────
const StatusPipeline = ({ statut }) => {
  const isRefused    = statut === 'Refusé';
  const currentStep  = STATUT_META[statut]?.step ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 10 }}>
      {PIPELINE.map((s, i) => {
        const done   = currentStep > i;
        const active = PIPELINE[currentStep - 1] === s && !isRefused;
        const meta   = STATUT_META[s];
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done || active ? meta.color : 'var(--border-light)',
                border: `2px solid ${done || active ? meta.color : 'var(--border-light)'}`,
                transition: 'all 0.3s',
              }}>
                {done
                  ? <CheckCircle2 size={12} strokeWidth={2.5} color="#fff" />
                  : <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : 'transparent' }} />
                }
              </div>
              <div style={{ fontSize: 9, fontWeight: active || done ? 700 : 500, color: active || done ? meta.color : 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-word' }}>
                {s}
              </div>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: currentStep > i + 1 ? STATUT_META[PIPELINE[i + 1]].color : 'var(--border-light)', marginBottom: 14, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
const DevisFactures = () => {
  const { currentUser }              = useAuth();
  const { setDevisFactureModal, handleNav: navigate } = useAppContext();
  const { devisFactures: allDevisFactures } = useDataContext();

  const onOpen = (df) => setDevisFactureModal(df);
  const onNew  = ()   => setDevisFactureModal({});

  // Filtrer aux documents du user courant (comme NDF filtre par demandeurId)
  const devisFactures = (allDevisFactures || []).filter(d =>
    d.createdById === currentUser?.id ||
    d.createdBy   === currentUser?.nom
  );

  const [filter, setFilter] = useState('all');

  const enCours  = devisFactures.filter(d => ['Brouillon', 'Soumis', 'En traitement'].includes(d.statut));
  const archives = devisFactures.filter(d => ['Signé', 'Refusé'].includes(d.statut));

  const totalEnAttente = enCours.filter(d => ['Soumis', 'En traitement'].includes(d.statut))
    .reduce((s, d) => s + Number(d.montant), 0);
  const totalSignes    = devisFactures.filter(d => d.statut === 'Signé')
    .reduce((s, d) => s + Number(d.montant), 0);
  const totalAll       = devisFactures.reduce((s, d) => s + Number(d.montant), 0);

  const displayed = filter === 'en_cours' ? enCours : filter === 'archives' ? archives : devisFactures;
  const sorted = [...displayed].sort((a, b) => {
    const priority = { 'En traitement': 5, Soumis: 4, Brouillon: 3, Signé: 1, Refusé: 0 };
    return (priority[b.statut] ?? 0) - (priority[a.statut] ?? 0);
  });

  return (
    <>
      {/* ── EN-TÊTE ── */}
      <div className="eyebrow">Mes finances</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 10 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Devis &amp; Factures</div>
        <button
          onClick={onNew}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0f2d5e', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}
        >
          <Plus size={15} strokeWidth={2.5} /> Déposer un document
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-3col">
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={11} strokeWidth={1.8} /> En attente
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: totalEnAttente > 0 ? '#d97706' : 'var(--text-muted)' }}>
            {totalEnAttente.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {enCours.filter(d => d.statut !== 'Brouillon').length} dossier{enCours.length !== 1 ? 's' : ''} en cours
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={11} strokeWidth={1.8} /> Acceptés
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: totalSignes > 0 ? '#16a34a' : 'var(--text-muted)' }}>
            {totalSignes.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {archives.filter(d => d.statut === 'Signé').length} signé{archives.filter(d => d.statut === 'Signé').length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Receipt size={11} strokeWidth={1.8} /> Total déposé
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: totalAll > 0 ? 'var(--text-base)' : 'var(--text-muted)' }}>
            {totalAll.toFixed(2)} €
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {devisFactures.length} dossier{devisFactures.length !== 1 ? 's' : ''} au total
          </div>
        </div>
      </div>

      {/* ── FILTRES ── */}
      {devisFactures.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[
            { key: 'all',      label: `Tout (${devisFactures.length})` },
            { key: 'en_cours', label: `En cours (${enCours.length})` },
            { key: 'archives', label: `Archivés (${archives.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-light)', background: filter === f.key ? '#0f2d5e' : 'var(--bg-hover)', color: filter === f.key ? '#fff' : 'var(--text-dim)', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── LISTE ── */}
      {devisFactures.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-light)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(26,86,219,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <FileText size={26} strokeWidth={1.5} color="#1a56db" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-base)', marginBottom: 6 }}>Aucun document déposé</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 340, lineHeight: 1.6 }}>
            Déposez un devis ou une facture pour le soumettre à la trésorerie pour validation et signature.
          </div>
          <button onClick={onNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0f2d5e', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <Plus size={14} strokeWidth={2.5} /> Déposer mon premier document
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Aucun dossier dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(df => {
            const meta      = STATUT_META[df.statut] || STATUT_META.Brouillon;
            const isDraft   = df.statut === 'Brouillon';
            const isRefused = df.statut === 'Refusé';
            const isDone    = df.statut === 'Signé';
            const missingFile = isDraft && !df.fichier;

            return (
              <div key={df.id}
                onClick={() => onOpen(df)}
                style={{
                  background: 'var(--bg-surface)', borderRadius: 14, cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  border: `1px solid ${isRefused ? 'rgba(230,57,70,0.2)' : 'var(--border-light)'}`,
                  borderLeft: `4px solid ${meta.color}`,
                  opacity: isDone ? 0.85 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ padding: '16px 20px' }}>
                  {missingFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#e63946', fontWeight: 700, marginBottom: 10, padding: '6px 10px', background: 'rgba(230,57,70,0.07)', borderRadius: 6 }}>
                      <AlertTriangle size={12} strokeWidth={2} /> Justificatif manquant — cliquez pour compléter
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Icône */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: meta.color }}>
                      <FileText size={20} strokeWidth={1.8} />
                    </div>
                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{df.type}</span>
                        {df.categorie && (
                          <>
                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{df.categorie}</span>
                          </>
                        )}
                        {df.horseBudget && (
                          <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, background: 'rgba(217,119,6,0.1)', color: '#d97706', fontWeight: 700 }}>⚠️ Hors budget</span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {df.titre || `${df.type} — ${df.emetteur}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        {df.emetteur && `${df.emetteur} → ${df.destinataire}`}
                        {df.soumisAt && ` · ${fmtDate(df.soumisAt)}`}
                      </div>
                    </div>
                    {/* Montant + statut */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: isRefused ? '#e63946' : isDone ? '#16a34a' : 'var(--text-base)' }}>
                        {fmtM(df.montant)}
                      </div>
                      <span style={{ display: 'inline-flex', marginTop: 4, fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>

                  {/* Pipeline de progression */}
                  {!isDraft && !isRefused && <StatusPipeline statut={df.statut} />}

                  {/* Message refus */}
                  {isRefused && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(230,57,70,0.06)', borderRadius: 8, fontSize: 11, color: '#e63946' }}>
                      {df.motifRefus ? `Refusé — ${df.motifRefus}` : 'Document refusé — cliquez pour voir le motif.'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── INFO TRÉSORERIE ── */}
      {devisFactures.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            La validation de vos documents est assurée par le <strong style={{ color: 'var(--text-dim)' }}>Pôle Trésorerie</strong>.
          </div>
          <button
            onClick={() => navigate('pole', 'Trésorerie')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '6px 14px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-dim)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Accéder à la Trésorerie <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
};

export default DevisFactures;
