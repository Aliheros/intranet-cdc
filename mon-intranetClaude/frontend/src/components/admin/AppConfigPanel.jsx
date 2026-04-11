/**
 * AppConfigPanel.jsx — Données de référence configurables
 *
 * Gère : types d'action, niveaux de classe, labels REP, seuils Analytics.
 *
 * Principe de sécurité data :
 *   - `value` d'un item = ce qui est stocké dans action.type / type_classe / labelRep en DB → IMMUABLE
 *   - `label` = libellé affiché → modifiable
 *   - Renommer = renseigner renamedFrom (ancien label affiché discrètement)
 *   - Archiver = item masqué des formulaires mais conservé pour les données historiques
 *   - Supprimer = INTERDIT si des actions utilisent cette valeur (vérification client-side)
 */
import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { useAppContext } from '../../contexts/AppContext';

// ─── Composant liste configurable générique ───────────────────────────────────

function ConfigList({ configKey, title, description, items, usedValues = new Set(), onSave }) {
  const [editingIdx, setEditingIdx] = useState(null); // index de l'item en cours d'édition
  const [editLabel, setEditLabel]   = useState('');
  const [newLabel, setNewLabel]     = useState('');
  const [adding, setAdding]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const { addToast, requestConfirm } = useAppContext();

  const saveAll = async (nextItems) => {
    setSaving(true);
    try { await onSave(configKey, nextItems); }
    finally { setSaving(false); }
  };

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditLabel(items[idx].label);
  };

  const confirmEdit = async () => {
    if (!editLabel.trim() || editingIdx === null) return;
    const item = items[editingIdx];
    const nextItems = items.map((it, i) => i === editingIdx
      ? { ...it, label: editLabel.trim(), renamedFrom: it.label !== editLabel.trim() ? it.label : it.renamedFrom }
      : it
    );
    await saveAll(nextItems);
    setEditingIdx(null);
  };

  const toggleArchive = async (idx) => {
    const item = items[idx];
    if (!item.archived && usedValues.has(item.value)) {
      // Avertir si des données utilisent cet item
      addToast(`Attention : des actions utilisent "${item.label}". L'item sera archivé mais conservé pour l'historique.`, 'warn');
    }
    const nextItems = items.map((it, i) => i === idx ? { ...it, archived: !it.archived } : it);
    await saveAll(nextItems);
  };

  const handleDelete = (idx) => {
    const item = items[idx];
    if (usedValues.has(item.value)) {
      addToast(`Impossible de supprimer "${item.label}" : des actions existantes utilisent cette valeur. Archivez-le à la place.`, 'error');
      return;
    }
    requestConfirm(`Supprimer définitivement "${item.label}" ?`, async () => {
      await saveAll(items.filter((_, i) => i !== idx));
    });
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const value = newLabel.trim(); // Pour les nouveaux items, value = label initial
    if (items.some(it => it.value === value)) {
      addToast('Cette valeur existe déjà.', 'error');
      return;
    }
    await saveAll([...items, { value, label: value }]);
    setNewLabel('');
    setAdding(false);
  };

  const inputStyle = {
    padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border-light)',
    background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13, width: '100%', boxSizing: 'border-box',
  };

  const activeItems   = items.filter(i => !i.archived);
  const archivedItems = items.filter(i => i.archived);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{title}</div>
          {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
        </div>
        <button onClick={() => setAdding(true)} disabled={adding}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: '#0f2d5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: adding ? 0.5 : 1 }}>
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {adding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="Nouveau libellé..." autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewLabel(''); }}} />
          <button onClick={handleAdd} style={{ padding: '6px 10px', borderRadius: 7, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}><Check size={14} /></button>
          <button onClick={() => { setAdding(false); setNewLabel(''); }} style={{ padding: '6px 10px', borderRadius: 7, background: 'none', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={14} /></button>
        </div>
      )}

      {/* Items actifs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {activeItems.map((item) => {
          const globalIdx = items.indexOf(item);
          const isEditing = editingIdx === globalIdx;
          const isUsed = usedValues.has(item.value);
          return (
            <div key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border-light)', background: 'var(--bg-hover)' }}>
              {isEditing ? (
                <>
                  <input style={{ ...inputStyle, flex: 1 }} value={editLabel} onChange={e => setEditLabel(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingIdx(null); }} />
                  <button onClick={confirmEdit} disabled={saving} style={{ padding: '4px 8px', borderRadius: 6, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}><Check size={13} /></button>
                  <button onClick={() => setEditingIdx(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={13} /></button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{item.label}</span>
                    {item.renamedFrom && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontStyle: 'italic' }}>ex : {item.renamedFrom}</span>
                    )}
                    {isUsed && (
                      <span style={{ fontSize: 10, marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'rgba(26,86,219,0.08)', color: '#1a56db', fontWeight: 700 }}>utilisé</span>
                    )}
                  </div>
                  <button onClick={() => startEdit(globalIdx)} title="Renommer" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><Pencil size={13} /></button>
                  <button onClick={() => toggleArchive(globalIdx)} title="Archiver" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: '#d97706', display: 'flex' }}><Archive size={13} /></button>
                  <button onClick={() => handleDelete(globalIdx)} title="Supprimer" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: isUsed ? 'var(--text-muted)' : '#e63946', display: 'flex', opacity: isUsed ? 0.4 : 1 }} disabled={isUsed}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Items archivés */}
      {archivedItems.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Archivés ({archivedItems.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {archivedItems.map((item) => {
              const globalIdx = items.indexOf(item);
              return (
                <div key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 8, border: '1px dashed var(--border-light)', background: 'var(--bg-alt)', opacity: 0.7 }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>value: {item.value}</span>
                  <button onClick={() => toggleArchive(globalIdx)} title="Restaurer" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex' }}><ArchiveRestore size={13} /></button>
                  <button onClick={() => handleDelete(globalIdx)} title="Supprimer définitivement" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: '#e63946', display: 'flex' }}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Statuts d'action (renommer uniquement) ───────────────────────────────────

function StatutsConfig({ items, onSave }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editLabel, setEditLabel]   = useState('');
  const [saving, setSaving]         = useState(false);
  const { addToast } = useAppContext();

  const saveAll = async (nextItems) => {
    setSaving(true);
    try { await onSave('statuts_action', nextItems); }
    finally { setSaving(false); }
  };

  const startEdit = (idx) => { setEditingIdx(idx); setEditLabel(items[idx].label); };

  const confirmEdit = async () => {
    if (!editLabel.trim() || editingIdx === null) return;
    const item = items[editingIdx];
    const nextItems = items.map((it, i) => i === editingIdx
      ? { ...it, label: editLabel.trim(), renamedFrom: it.label !== editLabel.trim() ? it.label : it.renamedFrom }
      : it
    );
    await saveAll(nextItems);
    setEditingIdx(null);
  };

  const inputStyle = { padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13, flex: 1, boxSizing: 'border-box' };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', marginBottom: 4 }}>Statuts d'action</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Renommage uniquement — les codes internes (Planifiée, En cours…) sont immuables et ne peuvent pas être supprimés.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item, idx) => (
          <div key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border-light)', background: 'var(--bg-hover)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 90 }}>{item.value}</span>
            {editingIdx === idx ? (
              <>
                <input style={inputStyle} value={editLabel} onChange={e => setEditLabel(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingIdx(null); }} />
                <button onClick={confirmEdit} disabled={saving} style={{ padding: '4px 8px', borderRadius: 6, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}><Check size={13} /></button>
                <button onClick={() => setEditingIdx(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={13} /></button>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                  {item.renamedFrom && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontStyle: 'italic' }}>ex : {item.renamedFrom}</span>}
                </div>
                <button onClick={() => startEdit(idx)} title="Renommer" style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><Pencil size={13} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Seuils Analytics + Planning ──────────────────────────────────────────────

function ThresholdsConfig({ thresholds, onSave }) {
  const [form, setForm] = useState(thresholds || {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave('thresholds', {
        overloadTasks:      parseInt(form.overloadTasks, 10)    || 6,
        annulationRateWarn: parseInt(form.annulationRateWarn, 10) || 25,
        budgetWarnPct:      parseInt(form.budgetWarnPct, 10)    || 80,
        ndfBacklogWarn:     parseInt(form.ndfBacklogWarn, 10)   || 5,
        planningAlertDays:  parseInt(form.planningAlertDays, 10) || 1,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13, width: 80 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', marginBottom: 12 }}>Seuils d'alerte</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          { key: 'overloadTasks',      label: 'Surcharge tâches bénévole',     suffix: 'tâches' },
          { key: 'annulationRateWarn', label: 'Alerte taux annulation séances', suffix: '%' },
          { key: 'budgetWarnPct',      label: 'Alerte budget consommé',         suffix: '%' },
          { key: 'ndfBacklogWarn',     label: 'Alerte backlog NDF',             suffix: 'dossiers' },
          { key: 'planningAlertDays',  label: 'Alerte Planning séance sans inscrits', suffix: 'j avant' },
        ].map(({ key, label, suffix }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border-light)', background: 'var(--bg-hover)' }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
            <input type="number" min={1} max={365} style={inputStyle} value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{suffix}</span>
          </div>
        ))}
      </div>
      <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1a56db', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les seuils'}
      </button>
    </form>
  );
}

// ─── Règles de notifications ───────────────────────────────────────────────────

const NOTIFICATION_EVENTS = [
  { key: 'action_created',   label: 'Nouvelle action créée',           desc: 'Notifie l\'équipe à la création d\'une action' },
  { key: 'ndf_soumise',      label: 'Note de frais soumise',           desc: 'Notifie le bureau à chaque NDF déposée' },
  { key: 'tache_assignee',   label: 'Tâche assignée',                  desc: 'Notifie la personne quand une tâche lui est assignée' },
  { key: 'task_request',     label: 'Demande de tâche',                desc: 'Notifie l\'équipe à chaque nouvelle TaskRequest' },
  { key: 'action_terminee',  label: 'Action terminée',                 desc: 'Notifie le bureau quand une action passe en "Terminée"' },
];

function NotificationRulesConfig({ rules, onSave }) {
  const [form, setForm] = useState(() => {
    const defaults = {};
    NOTIFICATION_EVENTS.forEach(e => { defaults[e.key] = true; });
    return { ...defaults, ...(rules || {}) };
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave('notification_rules', form); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', marginBottom: 12 }}>Règles de notification</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {NOTIFICATION_EVENTS.map(({ key, label, desc }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border-light)', background: 'var(--bg-hover)', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1a56db' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: form[key] ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.1)', color: form[key] ? '#16a34a' : 'var(--text-muted)' }}>
              {form[key] ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        ))}
      </div>
      <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1a56db', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les notifications'}
      </button>
    </form>
  );
}

// ─── Panneau principal ────────────────────────────────────────────────────────

const HR = () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0 0 24px' }} />;

export default function AppConfigPanel() {
  const { appConfig, getActiveConfigList, handleSaveAppConfig, actions } = useDataContext();

  const usedTypes   = new Set(actions.map(a => a.type).filter(Boolean));
  const usedNiveaux = new Set(actions.map(a => a.type_classe).filter(Boolean));
  const usedRep     = new Set(actions.map(a => a.labelRep).filter(Boolean));

  const typesItems   = appConfig?.types_action    || [];
  const niveauxItems = appConfig?.niveaux_classe   || [];
  const repItems     = appConfig?.labels_rep       || [];
  const statutsItems = appConfig?.statuts_action   || [];
  const thresholds   = appConfig?.thresholds       || {};
  const notifRules   = appConfig?.notification_rules || {};

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Paramètres</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Données de référence</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
          Ces listes sont utilisées dans les formulaires et les statistiques.
          Renommer un libellé ne modifie pas les données existantes — l'ancien nom reste affiché discrètement.
          Archiver masque un item des formulaires sans toucher aux actions déjà créées.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', marginBottom: 24 }}>
        <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Les valeurs <strong>utilisées</strong> (badge bleu) ne peuvent pas être supprimées — seulement archivées ou renommées.
          La valeur interne stockée en DB ne change jamais : seul le libellé affiché est modifié.
        </div>
      </div>

      <HR />

      <ConfigList configKey="types_action" title="Types d'action"
        description="Utilisé dans le wizard de création et les statistiques Analytics"
        items={typesItems} usedValues={usedTypes} onSave={handleSaveAppConfig} />

      <HR />

      <ConfigList configKey="niveaux_classe" title="Niveaux de classe (type_classe)"
        description="Public touché par l'action"
        items={niveauxItems} usedValues={usedNiveaux} onSave={handleSaveAppConfig} />

      <HR />

      <ConfigList configKey="labels_rep" title="Labels REP"
        description="Zone prioritaire de l'établissement"
        items={repItems} usedValues={usedRep} onSave={handleSaveAppConfig} />

      <HR />

      <StatutsConfig items={statutsItems} onSave={handleSaveAppConfig} />

      <HR />

      <ThresholdsConfig thresholds={thresholds} onSave={handleSaveAppConfig} />

      <HR />

      <NotificationRulesConfig rules={notifRules} onSave={handleSaveAppConfig} />
    </div>
  );
}
