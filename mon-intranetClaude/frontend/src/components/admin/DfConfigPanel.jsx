// src/components/admin/DfConfigPanel.jsx
// Panneau de configuration Devis & Factures — Admin
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronUp, ChevronDown, Info, RefreshCw } from 'lucide-react';
import api from '../../api/apiClient';

const Toggle = ({ value, onChange, label, desc }) => (
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 14px', background: 'var(--bg-alt)', borderRadius: 9, border: '1px solid var(--border-light)' }}>
    <div
      onClick={() => onChange(!value)}
      style={{ flexShrink: 0, marginTop: 2, width: 36, height: 20, borderRadius: 10, background: value ? '#1a56db' : 'var(--border-light)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
    </div>
  </label>
);

const DfConfigPanel = ({ config, onSave, onClose, onCategoriesChange }) => {
  const [draft, setDraft]       = useState(() => JSON.parse(JSON.stringify(config)));
  const [saving, setSaving]     = useState(false);
  const [categories, setCats]   = useState([]);
  const [loadingCats, setLoad]  = useState(true);
  const [catSaving, setCatSave] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  // Charger toutes les catégories (actives + inactives)
  const loadCats = async () => {
    setLoad(true);
    try {
      const data = await api.get('/categories-df?all=1');
      setCats(Array.isArray(data) ? data : []);
    } catch {
      setCats([]);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => { loadCats(); }, []);

  const handleAddCat = async () => {
    if (!newLabel.trim()) return;
    setCatSave(true);
    try {
      await api.post('/categories-df', { label: newLabel.trim(), ordre: categories.filter(c => c.actif).length });
      setNewLabel('');
      await loadCats();
      onCategoriesChange?.();
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setCatSave(false);
    }
  };

  const handleToggleCat = async (cat) => {
    setCatSave(true);
    try {
      await api.put(`/categories-df/${cat.id}`, { actif: !cat.actif });
      await loadCats();
      onCategoriesChange?.();
    } catch {}
    finally { setCatSave(false); }
  };

  const handleMoveCat = async (cat, direction) => {
    const active = categories.filter(c => c.actif).sort((a, b) => a.ordre - b.ordre);
    const idx = active.findIndex(c => c.id === cat.id);
    const swapWith = direction === 'up' ? active[idx - 1] : active[idx + 1];
    if (!swapWith) return;
    setCatSave(true);
    try {
      await Promise.all([
        api.put(`/categories-df/${cat.id}`, { ordre: swapWith.ordre }),
        api.put(`/categories-df/${swapWith.id}`, { ordre: cat.ordre }),
      ]);
      await loadCats();
      onCategoriesChange?.();
    } catch {}
    finally { setCatSave(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    onClose?.();
  };

  const activeCats   = categories.filter(c => c.actif).sort((a, b) => a.ordre - b.ordre);
  const inactiveCats = categories.filter(c => !c.actif);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Trésorerie</div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Configuration Devis &amp; Factures</div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>}
      </div>

      {/* ── Catégories ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Catégories de documents</div>
          <button onClick={loadCats} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <RefreshCw size={11} strokeWidth={2} /> Actualiser
          </button>
        </div>
        {loadingCats ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>Chargement…</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {activeCats.map((cat, i) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button onClick={() => handleMoveCat(cat, 'up')} disabled={i === 0 || catSaving} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--border-light)' : 'var(--text-muted)', padding: 0, display: 'flex' }}><ChevronUp size={11} /></button>
                    <button onClick={() => handleMoveCat(cat, 'down')} disabled={i === activeCats.length - 1 || catSaving} style={{ background: 'none', border: 'none', cursor: i === activeCats.length - 1 ? 'default' : 'pointer', color: i === activeCats.length - 1 ? 'var(--border-light)' : 'var(--text-muted)', padding: 0, display: 'flex' }}><ChevronDown size={11} /></button>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{cat.label}</span>
                  <button onClick={() => handleToggleCat(cat)} disabled={catSaving}
                    style={{ fontSize: 10, padding: '2px 10px', borderRadius: 6, background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#e63946', cursor: 'pointer', fontWeight: 600 }}>
                    Désactiver
                  </button>
                </div>
              ))}
            </div>

            {/* Ajouter une catégorie */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="Nouvelle catégorie…"
                onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); }}
                style={{ flex: 1, padding: '7px 11px', borderRadius: 8, border: '1px dashed var(--border-light)', background: 'var(--bg-alt)', fontSize: 12, color: 'var(--text-base)' }} />
              <button onClick={handleAddCat} disabled={!newLabel.trim() || catSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0f2d5e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: !newLabel.trim() ? 0.5 : 1 }}>
                <Plus size={12} strokeWidth={2.5} /> Ajouter
              </button>
            </div>

            {/* Catégories désactivées */}
            {inactiveCats.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Désactivées ({inactiveCats.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {inactiveCats.map(cat => (
                    <button key={cat.id} onClick={() => handleToggleCat(cat)} disabled={catSaving}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                      + {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Paramètres généraux ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Paramètres généraux</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Délai de traitement cible (jours)</div>
            <input type="number" min="1" value={draft.delaiTraitement || ''} onChange={e => setField('delaiTraitement', e.target.value)}
              placeholder="15"
              style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Affiché aux membres comme SLA de traitement</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Seuil alerte budget (€)</div>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" value={draft.montantAlerteBudget || ''} onChange={e => setField('montantAlerteBudget', e.target.value)}
                placeholder="Automatique"
                style={{ padding: '8px 28px 8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>€</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Force le badge "hors budget" au-delà de ce montant (en plus du calcul automatique)</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Instructions affichées aux déposants</div>
            <textarea value={draft.instructions || ''} onChange={e => setField('instructions', e.target.value)}
              placeholder="Ex : Joindre le devis signé ou la facture originale. Toute facture supérieure à 500 € doit être validée par le Bureau."
              rows={3}
              style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 12, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
        </div>
      </div>

      {/* ── Règles de soumission ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Règles de soumission</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Toggle
            value={draft.requireJustificatif !== false}
            onChange={v => setField('requireJustificatif', v)}
            label="Fichier joint obligatoire"
            desc="Le déposant doit joindre au moins un fichier (devis, facture, bon de commande) pour soumettre"
          />
          <Toggle
            value={draft.notifSoumission !== false}
            onChange={v => setField('notifSoumission', v)}
            label="Notifier la trésorerie à chaque dépôt"
            desc="La trésorerie reçoit une notification dès qu'un nouveau document est soumis"
          />
          <Toggle
            value={!!draft.notifMembre}
            onChange={v => setField('notifMembre', v)}
            label="Notifier le déposant à chaque changement de statut"
            desc="Le déposant reçoit une notification à chaque mise à jour (prise en charge, signature, refus)"
          />
          <Toggle
            value={!!draft.alerteDelaiTraitement}
            onChange={v => setField('alerteDelaiTraitement', v)}
            label="Alerte si dépassement du délai de traitement"
            desc="Une notification est envoyée si un dossier n'est pas traité dans le délai cible configuré ci-dessus"
          />
        </div>
      </div>

      <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(26,86,219,0.05)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Info size={14} color="#1a56db" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Les catégories sont mises à jour en temps réel dans le formulaire de dépôt.
          Les paramètres généraux et les règles s'appliquent immédiatement.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {onClose && <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-hover)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Annuler</button>}
        <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0f2d5e', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
          <Save size={14} strokeWidth={2} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

export default DfConfigPanel;
