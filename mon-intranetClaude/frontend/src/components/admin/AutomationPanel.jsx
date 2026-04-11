import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Play, CheckCircle2, XCircle, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api/apiClient';
import { POLES, TYPES_ACTION } from '../../data/constants';
import { useAppContext } from '../../contexts/AppContext';

const DATE_REF_LABELS = { date_debut: 'date de début', date_fin: 'date de fin' };

const EMPTY_FORM = {
  nom: '',
  description: '',
  triggerOffsetDays: 7,
  triggerDateRef: 'date_debut',
  actionTypeFilter: [],
  targetPole: POLES[3], // "Etudes" par défaut
  taskText: '',
  taskDescription: '',
};

function RuleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleType = (type) => {
    set('actionTypeFilter', form.actionTypeFilter.includes(type)
      ? form.actionTypeFilter.filter(t => t !== type)
      : [...form.actionTypeFilter, type]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.taskText.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
    background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13, boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 5 };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Nom */}
      <div>
        <label style={labelStyle}>Nom de la règle *</label>
        <input style={inputStyle} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex : Questionnaire fin de simulation" required />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description (optionnelle)</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Contexte de cette automatisation..." />
      </div>

      {/* Déclencheur */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Jours avant la date (J-X) *</label>
          <input style={inputStyle} type="number" min={0} max={365} value={form.triggerOffsetDays}
            onChange={e => set('triggerOffsetDays', parseInt(e.target.value, 10) || 0)} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            La demande sera créée J-{form.triggerOffsetDays} avant la date choisie
          </div>
        </div>
        <div>
          <label style={labelStyle}>Date de référence *</label>
          <select style={inputStyle} value={form.triggerDateRef} onChange={e => set('triggerDateRef', e.target.value)}>
            <option value="date_debut">Date de début</option>
            <option value="date_fin">Date de fin</option>
          </select>
        </div>
      </div>

      {/* Filtre type d'action */}
      <div>
        <label style={labelStyle}>Filtrer par type d'action (vide = toutes)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TYPES_ACTION.map(type => {
            const active = form.actionTypeFilter.includes(type);
            return (
              <button key={type} type="button" onClick={() => toggleType(type)}
                style={{ padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? '#1a56db' : 'var(--border-light)'}`,
                  background: active ? 'rgba(26,86,219,0.1)' : 'var(--bg-hover)',
                  color: active ? '#1a56db' : 'var(--text-dim)' }}>
                {type}
              </button>
            );
          })}
        </div>
        {form.actionTypeFilter.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>S'applique à tous les types d'actions</div>
        )}
      </div>

      {/* Pôle cible */}
      <div>
        <label style={labelStyle}>Pôle destinataire de la demande *</label>
        <select style={inputStyle} value={form.targetPole} onChange={e => set('targetPole', e.target.value)}>
          {POLES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Texte de la tâche */}
      <div>
        <label style={labelStyle}>Intitulé de la tâche *</label>
        <input style={inputStyle} value={form.taskText} onChange={e => set('taskText', e.target.value)}
          placeholder="ex : Envoyer le questionnaire de fin de simulation" required />
      </div>

      {/* Description de la tâche */}
      <div>
        <label style={labelStyle}>Description de la tâche (optionnelle)</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.taskDescription}
          onChange={e => set('taskDescription', e.target.value)}
          placeholder="Instructions complémentaires pour l'équipe..." />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Annuler
        </button>
        <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1a56db', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

function RuleCard({ rule, onEdit, onDelete, onToggle, onRun }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning]   = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await onRun(rule.id);
      setLastResult(res);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-alt)', border: `1px solid ${rule.isActive ? 'rgba(26,86,219,0.25)' : 'var(--border-light)'}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
        <button onClick={() => onToggle(rule)} title={rule.isActive ? 'Désactiver' : 'Activer'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: rule.isActive ? '#1a56db' : 'var(--text-muted)', display: 'flex', padding: 2 }}>
          {rule.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {rule.nom}
            {!rule.isActive && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 700 }}>Inactif</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            J-{rule.triggerOffsetDays} avant la {DATE_REF_LABELS[rule.triggerDateRef]} · Pôle {rule.targetPole}
            {rule.actionTypeFilter?.length > 0 && ` · ${rule.actionTypeFilter.length} type(s) filtré(s)`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleRun} disabled={running} title="Exécuter maintenant"
            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'none', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, opacity: running ? 0.5 : 1 }}>
            <Play size={13} /> {running ? '…' : 'Tester'}
          </button>
          <button onClick={() => onEdit(rule)} title="Modifier"
            style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(rule)} title="Supprimer"
            style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border-light)', background: 'none', color: '#e63946', cursor: 'pointer', display: 'flex' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded(x => !x)}
            style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Résultat du test manuel */}
      {lastResult && (
        <div style={{ margin: '0 18px 12px', padding: '8px 12px', borderRadius: 8, background: lastResult.triggered > 0 ? 'rgba(22,163,74,0.08)' : 'var(--bg-hover)', border: `1px solid ${lastResult.triggered > 0 ? 'rgba(22,163,74,0.25)' : 'var(--border-light)'}`, fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 16 }}>
          <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {lastResult.triggered} déclenchée(s)</span>
          <span>{lastResult.skipped} déjà faite(s)</span>
          {lastResult.errors > 0 && <span style={{ color: '#e63946' }}>⚠ {lastResult.errors} erreur(s)</span>}
        </div>
      )}

      {/* Détails */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rule.description && (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>{rule.description}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>Tâche créée</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{rule.taskText}</div>
              {rule.taskDescription && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{rule.taskDescription}</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>Types d'action ciblés</div>
              {rule.actionTypeFilter?.length > 0
                ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{rule.actionTypeFilter.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'rgba(26,86,219,0.08)', color: '#1a56db', fontWeight: 600 }}>{t}</span>)}</div>
                : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toutes les actions</span>
              }
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Créé par {rule.createdBy} · {new Date(rule.createdAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomationPanel() {
  const { addToast, requestConfirm } = useAppContext();
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null); // null = création, objet = édition

  const fetchRules = useCallback(async () => {
    try {
      const data = await api.get('/automation-rules');
      setRules(data);
    } catch (err) {
      addToast('Erreur lors du chargement des règles', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async (form) => {
    try {
      if (editRule) {
        await api.put(`/automation-rules/${editRule.id}`, form);
        addToast('Règle mise à jour');
      } else {
        await api.post('/automation-rules', form);
        addToast('Règle créée');
      }
      setShowForm(false);
      setEditRule(null);
      fetchRules();
    } catch (err) {
      addToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = (rule) => {
    requestConfirm(`Supprimer la règle "${rule.nom}" ? Toutes ses exécutions seront perdues.`, async () => {
      try {
        await api.delete(`/automation-rules/${rule.id}`);
        addToast('Règle supprimée');
        fetchRules();
      } catch (err) {
        addToast(err.message || 'Erreur', 'error');
      }
    });
  };

  const handleToggle = async (rule) => {
    try {
      await api.put(`/automation-rules/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch (err) {
      addToast(err.message || 'Erreur', 'error');
    }
  };

  const handleRun = async (id) => {
    try {
      return await api.post(`/automation-rules/${id}/run`, {});
    } catch (err) {
      addToast(err.message || 'Erreur lors de l\'exécution', 'error');
      return { triggered: 0, skipped: 0, errors: 1 };
    }
  };

  const openEdit = (rule) => { setEditRule(rule); setShowForm(true); };
  const openCreate = () => { setEditRule(null); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditRule(null); };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Automatisation</div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Règles d'automatisation</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Chaque règle active crée automatiquement une demande de tâche J-X avant une date d'action. Le cron tourne chaque jour à 06h00.
          </div>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, background: '#0f2d5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Nouvelle règle
          </button>
        )}
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid rgba(26,86,219,0.3)', borderRadius: 12, padding: '20px 22px', marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            {editRule ? `Modifier — ${editRule.nom}` : 'Nouvelle règle d\'automatisation'}
          </div>
          <RuleForm initial={editRule || undefined} onSave={handleSave} onCancel={cancelForm} />
        </div>
      )}

      {/* Liste des règles */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune règle configurée</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Créez votre première règle d'automatisation ci-dessus</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map(rule => (
            <RuleCard key={rule.id} rule={rule}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onRun={handleRun}
            />
          ))}
        </div>
      )}

      {/* Info bas de page */}
      <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-dim)' }}>Comment ça fonctionne :</strong> chaque jour à 06h00, le serveur parcourt toutes les règles actives.
        Si une action a sa date de référence dans exactement J-X jours, une demande de tâche est créée dans l'espace du pôle cible,
        associée à l'action. L'auteur est affiché comme <em>automatique</em>. Chaque règle ne se déclenche qu'une seule fois par action.
        Le bouton <strong>Tester</strong> exécute la règle immédiatement pour aujourd'hui.
      </div>
    </div>
  );
}
