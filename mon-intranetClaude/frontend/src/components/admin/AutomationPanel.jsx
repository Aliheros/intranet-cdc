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

  return (
    <form onSubmit={handleSubmit} className="automation-form">
      {/* Nom */}
      <div className="form-row">
        <label className="automation-label">Nom de la règle *</label>
        <input className="automation-input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex : Questionnaire fin de simulation" required />
      </div>

      {/* Description */}
      <div className="form-row">
        <label className="automation-label">Description (optionnelle)</label>
        <textarea className="automation-input automation-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Contexte de cette automatisation..." />
      </div>

      {/* Déclencheur */}
      <div className="form-grid-2col">
        <div>
          <label className="automation-label">Jours avant la date (J-X) *</label>
          <input className="automation-input" type="number" min={0} max={365} value={form.triggerOffsetDays}
            onChange={e => set('triggerOffsetDays', parseInt(e.target.value, 10) || 0)} />
          <div className="automation-hint">
            La demande sera créée J-{form.triggerOffsetDays} avant la date choisie
          </div>
        </div>
        <div>
          <label className="automation-label">Date de référence *</label>
          <select className="automation-input" value={form.triggerDateRef} onChange={e => set('triggerDateRef', e.target.value)}>
            <option value="date_debut">Date de début</option>
            <option value="date_fin">Date de fin</option>
          </select>
        </div>
      </div>

      {/* Filtre type d'action */}
      <div>
        <label className="automation-label">Filtrer par type d'action (vide = toutes)</label>
        <div className="automation-types">
          {TYPES_ACTION.map(type => {
            const active = form.actionTypeFilter.includes(type);
            return (
              <button key={type} type="button" onClick={() => toggleType(type)}
                className={`automation-type-chip ${active ? 'active' : ''}`}>
                {type}
              </button>
            );
          })}
        </div>
        {form.actionTypeFilter.length === 0 && (
          <div className="automation-hint">S'applique à tous les types d'actions</div>
        )}
      </div>

      {/* Pôle cible */}
      <div className="form-row">
        <label className="automation-label">Pôle destinataire de la demande *</label>
        <select className="automation-input" value={form.targetPole} onChange={e => set('targetPole', e.target.value)}>
          {POLES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Texte de la tâche */}
      <div className="form-row">
        <label className="automation-label">Intitulé de la tâche *</label>
        <input className="automation-input" value={form.taskText} onChange={e => set('taskText', e.target.value)}
          placeholder="ex : Envoyer le questionnaire de fin de simulation" required />
      </div>

      {/* Description de la tâche */}
      <div className="form-row">
        <label className="automation-label">Description de la tâche (optionnelle)</label>
        <textarea className="automation-input automation-textarea" value={form.taskDescription}
          onChange={e => set('taskDescription', e.target.value)}
          placeholder="Instructions complémentaires pour l'équipe..." />
      </div>

      {/* Actions */}
      <div className="automation-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary automation-save-btn" style={{ opacity: saving ? 0.6 : 1 }}>
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
    <div className={`rule-card ${rule.isActive ? 'active' : ''}`}>
      {/* Header */}
      <div className="rule-header">
        <button onClick={() => onToggle(rule)} title={rule.isActive ? 'Désactiver' : 'Activer'}
          className={`rule-toggle ${rule.isActive ? 'active' : 'inactive'}`}>
          {rule.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        <div className="rule-title">
          <div className="rule-title-text">
            {rule.nom}
            {!rule.isActive && <span className="rule-title-badge">Inactif</span>}
          </div>
          <div className="rule-subtitle">
            J-{rule.triggerOffsetDays} avant la {DATE_REF_LABELS[rule.triggerDateRef]} · Pôle {rule.targetPole}
            {rule.actionTypeFilter?.length > 0 && ` · ${rule.actionTypeFilter.length} type(s) filtré(s)`}
          </div>
        </div>

        <div className="rule-actions">
          <button onClick={handleRun} disabled={running} title="Exécuter maintenant"
            className={`rule-action-btn success ${running ? 'disabled' : ''}`}>
            <Play size={13} /> {running ? '…' : 'Tester'}
          </button>
          <button onClick={() => onEdit(rule)} title="Modifier" className="rule-action-btn">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(rule)} title="Supprimer" className="rule-action-btn danger">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded(x => !x)} className="rule-action-btn">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Résultat du test manuel */}
      {lastResult && (
        <div className={`rule-result ${lastResult.triggered > 0 ? 'success' : 'neutral'}`}>
          <span className="rule-result-text success">✓ {lastResult.triggered} déclenchée(s)</span>
          <span>{lastResult.skipped} déjà faite(s)</span>
          {lastResult.errors > 0 && <span className="rule-result-text error">⚠ {lastResult.errors} erreur(s)</span>}
        </div>
      )}

      {/* Détails */}
      {expanded && (
        <div className="rule-body">
          {rule.description && (
            <div className="rule-description">{rule.description}</div>
          )}
          <div className="rule-details">
            <div className="rule-detail-section">
              <div className="rule-detail-label">Tâche créée</div>
              <div className="rule-detail-value">{rule.taskText}</div>
              {rule.taskDescription && <div className="rule-detail-sub">{rule.taskDescription}</div>}
            </div>
            <div className="rule-detail-section">
              <div className="rule-detail-label">Types d'action ciblés</div>
              {rule.actionTypeFilter?.length > 0
                ? <div className="rule-detail-types">
                    {rule.actionTypeFilter.map(t => <span key={t} className="rule-type-chip">{t}</span>)}
                  </div>
                : <span className="rule-detail-empty">Toutes les actions</span>
              }
            </div>
          </div>
          <div className="rule-meta">
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
    <div className="automation-panel">
      {/* Header */}
      <div className="automation-panel-header">
        <div>
          <div className="automation-panel-label">Automatisation</div>
          <div className="automation-panel-title">Règles d'automatisation</div>
          <div className="automation-panel-desc">
            Chaque règle active crée automatiquement une demande de tâche J-X avant une date d'action. Le cron tourne chaque jour à 06h00.
          </div>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="btn-primary automation-new-btn">
            <Plus size={13} /> Nouvelle règle
          </button>
        )}
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <div className="automation-form-container">
          <div className="automation-form-title">
            {editRule ? `Modifier — ${editRule.nom}` : 'Nouvelle règle d\'automatisation'}
          </div>
          <RuleForm initial={editRule || undefined} onSave={handleSave} onCancel={cancelForm} />
        </div>
      )}

      {/* Liste des règles */}
      {loading ? (
        <div className="automation-loading">Chargement…</div>
      ) : rules.length === 0 ? (
        <div className="automation-empty">
          <div className="automation-empty-icon">⚙️</div>
          <div className="automation-empty-title">Aucune règle configurée</div>
          <div className="automation-empty-desc">Créez votre première règle d'automatisation ci-dessus</div>
        </div>
      ) : (
        <div className="automation-rules-list">
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
      <div className="automation-info">
        <strong style={{ color: 'var(--text-dim)' }}>Comment ça fonctionne :</strong> chaque jour à 06h00, le serveur parcourt toutes les règles actives.
        Si une action a sa date de référence dans exactement J-X jours, une demande de tâche est créée dans l'espace du pôle cible,
        associée à l'action. L'auteur est affiché comme <em>automatique</em>. Chaque règle ne se déclenche qu'une seule fois par action.
        Le bouton <strong>Tester</strong> exécute la règle immédiatement pour aujourd'hui.
      </div>
    </div>
  );
}