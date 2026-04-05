// src/components/admin/NdfConfigPanel.jsx
// Panneau de configuration NDF — partagé entre NoteFrais et Admin.
import React, { useState } from 'react';
import { Plus, Trash2, Save, X, ChevronUp, ChevronDown, Info } from 'lucide-react';

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

const NdfConfigPanel = ({ config, onSave, onClose }) => {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(config)));
  const [saving, setSaving] = useState(false);

  const setCat = (i, field, val) => setDraft(d => ({
    ...d, categories: d.categories.map((c, idx) => idx === i ? { ...c, [field]: val } : c),
  }));
  const addCat    = () => setDraft(d => ({ ...d, categories: [...d.categories, { label: '', plafond: '', note: '' }] }));
  const removeCat = (i) => setDraft(d => ({ ...d, categories: d.categories.filter((_, idx) => idx !== i) }));
  const moveUp    = (i) => { if (i === 0) return; setDraft(d => { const cats = [...d.categories]; [cats[i-1], cats[i]] = [cats[i], cats[i-1]]; return { ...d, categories: cats }; }); };
  const moveDown  = (i) => setDraft(d => { const cats = [...d.categories]; if (i >= cats.length - 1) return d; [cats[i], cats[i+1]] = [cats[i+1], cats[i]]; return { ...d, categories: cats }; });
  const setField  = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    onClose?.();
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Trésorerie</div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Configuration des Notes de Frais</div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>}
      </div>

      {/* ── Catégories ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Catégories de dépenses</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {draft.categories.map((cat, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 100px 1fr auto', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 9, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button onClick={() => moveUp(i)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--border-light)' : 'var(--text-muted)', padding: 0, display: 'flex' }}><ChevronUp size={12} /></button>
                <button onClick={() => moveDown(i)} disabled={i === draft.categories.length - 1} style={{ background: 'none', border: 'none', cursor: i === draft.categories.length - 1 ? 'default' : 'pointer', color: i === draft.categories.length - 1 ? 'var(--border-light)' : 'var(--text-muted)', padding: 0, display: 'flex' }}><ChevronDown size={12} /></button>
              </div>
              <input value={cat.label} onChange={e => setCat(i, 'label', e.target.value)} placeholder="Nom de la catégorie"
                style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
              <div style={{ position: 'relative' }}>
                <input type="number" min="0" value={cat.plafond} onChange={e => setCat(i, 'plafond', e.target.value)} placeholder="Plafond"
                  style={{ padding: '6px 22px 6px 9px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-surface)', fontSize: 12, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>€</span>
              </div>
              <input value={cat.note} onChange={e => setCat(i, 'note', e.target.value)} placeholder="Note / instruction visible par les membres"
                style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-surface)', fontSize: 12, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
              <button onClick={() => removeCat(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', display: 'flex', padding: 2 }}><Trash2 size={13} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
        <button onClick={addCat} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 8, border: '1px dashed var(--border-light)', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          <Plus size={13} strokeWidth={2} /> Ajouter une catégorie
        </button>
      </div>

      {/* ── Paramètres généraux ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Paramètres généraux</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Plafond global par note (€)</div>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" value={draft.plafondGlobal || ''} onChange={e => setField('plafondGlobal', e.target.value)}
                placeholder="Aucun plafond"
                style={{ padding: '8px 28px 8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>€</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Délai max de soumission (jours)</div>
            <input type="number" min="1" value={draft.delaiJours || ''} onChange={e => setField('delaiJours', e.target.value)}
              placeholder="30"
              style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Validation automatique sous (€)</div>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" value={draft.autoValidationMontant || ''} onChange={e => setField('autoValidationMontant', e.target.value)}
                placeholder="Désactivé"
                style={{ padding: '8px 28px 8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>€</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>NDF en dessous de ce montant passent directement en "Validée"</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Rappel remboursement après (jours)</div>
            <input type="number" min="1" value={draft.notifDelaiRemboursement || ''} onChange={e => setField('notifDelaiRemboursement', e.target.value)}
              placeholder="Désactivé"
              style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-base)', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Notification envoyée si non remboursée X jours après validation</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5 }}>Instructions affichées aux membres</div>
            <textarea value={draft.instructions || ''} onChange={e => setField('instructions', e.target.value)}
              placeholder="Ex : Joindre obligatoirement le justificatif original. Les notes doivent être soumises dans les 30 jours suivant la dépense."
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
            label="Justificatif obligatoire"
            desc="Le membre doit joindre un fichier (photo ou PDF) pour soumettre sa note de frais"
          />
          <Toggle
            value={!!draft.allowKmCalculator}
            onChange={v => setField('allowKmCalculator', v)}
            label="Activer le calculateur kilométrique"
            desc="Affiche un outil pour calculer automatiquement le montant selon le barème fiscal (Transport)"
          />
          <Toggle
            value={draft.notifSoumission !== false}
            onChange={v => setField('notifSoumission', v)}
            label="Notifier la trésorerie à chaque soumission"
            desc="Un email/notification est envoyé à la trésorerie dès qu'une NDF est soumise"
          />
          <Toggle
            value={!!draft.notifMembre}
            onChange={v => setField('notifMembre', v)}
            label="Notifier le membre à chaque changement de statut"
            desc="Le déposant reçoit une notification à chaque mise à jour (validation, remboursement, refus)"
          />
        </div>
      </div>

      {/* Info récapitulative */}
      <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(26,86,219,0.05)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Info size={14} color="#1a56db" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Ces paramètres s'appliquent immédiatement au formulaire de dépôt, à la validation et aux notifications.
          Les plafonds par catégorie sont affichés aux membres lors de la saisie.
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

export default NdfConfigPanel;
