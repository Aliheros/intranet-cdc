/**
 * DriveExportPanel.jsx — Configuration et déclenchement de l'export Google Drive
 *
 * Quatre sections :
 *   1. Configuration globale (activé/désactivé, schedule, format, folder ID, sync fichiers)
 *   2. Sélection des exporteurs actifs (checklist) avec override de format par exporteur
 *   3. Déclenchement manuel
 *   4. Historique des runs (10 derniers)
 */

import { useState, useEffect, useCallback } from 'react';
import { CloudUpload, Play, RefreshCw, CheckCircle2, XCircle, Clock, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/apiClient';
import { useAppContext } from '../../contexts/AppContext';

// ─── Styles réutilisables ─────────────────────────────────────────────────────
const S = {
  card: {
    background: 'var(--bg-card)', borderRadius: 12,
    border: '1px solid var(--border-light)', padding: '20px 24px', marginBottom: 20,
  },
  cardTitle: {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16,
  },
  label: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 5,
  },
  input: {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13, boxSizing: 'border-box',
  },
  select: {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-alt)', color: 'var(--text-base)', fontSize: 13,
  },
  btn: (variant = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? 'var(--accent)' : variant === 'danger' ? '#ef4444' : 'var(--bg-alt)',
    color: variant === 'ghost' ? 'var(--text-base)' : '#fff',
  }),
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  badge: (ok) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
    background: ok ? '#16a34a18' : '#ef444418',
    color: ok ? '#16a34a' : '#ef4444',
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Composant Toggle ─────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  const Icon = value ? ToggleRight : ToggleLeft;
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <Icon size={26} color={value ? 'var(--accent)' : 'var(--text-muted)'} />
      <span style={{ fontSize: 13, color: 'var(--text-base)', fontWeight: value ? 600 : 400 }}>{label}</span>
    </button>
  );
}

// ─── Section Historique ───────────────────────────────────────────────────────
function HistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/drive-export/history?limit=10');
      setHistory(data);
    } catch (_) {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>;
  if (history.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun run enregistré.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map(entry => {
        const payload = entry.payload || {};
        const ok      = !payload.error && (payload.failed?.length ?? 0) === 0;
        const isOpen  = expanded === entry.id;
        return (
          <div key={entry.id} style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : entry.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-alt)', border: 'none', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={S.badge(ok)}>
                  {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {ok ? 'Succès' : 'Partiel'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.targetNom}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(entry.createdAt)}</span>
              </div>
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isOpen && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {payload.error && <p style={{ color: '#ef4444', fontWeight: 600 }}>Erreur : {payload.error}</p>}
                {(payload.success?.length ?? 0) > 0 && (
                  <p><span style={{ color: '#16a34a', fontWeight: 600 }}>Réussis ({payload.success.length}) :</span> {payload.success.join(', ')}</p>
                )}
                {(payload.failed?.length ?? 0) > 0 && (
                  <p><span style={{ color: '#ef4444', fontWeight: 600 }}>Échoués ({payload.failed.length}) :</span> {payload.failed.join(', ')}</p>
                )}
                {(payload.skipped?.length ?? 0) > 0 && (
                  <p><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ignorés ({payload.skipped.length}) :</span> {payload.skipped.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DriveExportPanel() {
  const { showToast } = useAppContext();

  // Config chargée depuis AppConfig
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  // Exporteurs disponibles (depuis le backend)
  const [exporters, setExporters] = useState([]);

  // État local du formulaire (clone de config pour édition)
  const [draft, setDraft] = useState(null);

  // ── Chargement ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [status, exporterList] = await Promise.all([
        api.get('/api/admin/drive-export/status'),
        api.get('/api/admin/drive-export/exporters'),
      ]);
      const cfg = status.config || {};
      setConfig(cfg);
      setDraft(cfg);
      setLastRun(status.lastRun);
      setExporters(exporterList);
    } catch (err) {
      showToast('Erreur de chargement : ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers draft ────────────────────────────────────────────────────────────
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const toggleExporter = (key) => {
    const current = draft.activeExporters || [];
    set('activeExporters', current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]);
  };

  const setFormatOverride = (key, fmt) => {
    const overrides = { ...(draft.formatOverrides || {}) };
    if (!fmt) {
      delete overrides[key];
    } else {
      overrides[key] = fmt;
    }
    set('formatOverrides', overrides);
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/app-config/google_drive_export', { value: draft });
      setConfig(draft);
      showToast('Configuration sauvegardée', 'success');
    } catch (err) {
      showToast('Erreur sauvegarde : ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Déclenchement manuel ─────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!config?.enabled) {
      showToast('Activez d\'abord l\'export avant de lancer manuellement.', 'error');
      return;
    }
    if (!config?.rootFolderId) {
      showToast('Configurez le Google Drive Folder ID avant de lancer.', 'error');
      return;
    }
    setRunning(true);
    try {
      const result = await api.post('/api/admin/drive-export/run', {});
      const { success = [], failed = [], skipped = [] } = result;
      if (failed.length === 0) {
        showToast(`Export terminé — ${success.length} fichier(s) envoyés`, 'success');
      } else {
        showToast(`Export partiel — ${success.length} OK, ${failed.length} en échec`, 'error');
      }
      load(); // rafraîchir le statut et l'historique
    } catch (err) {
      showToast('Erreur lors du run : ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading || !draft) {
    return <p style={{ color: 'var(--text-muted)', padding: 24 }}>Chargement…</p>;
  }

  const isActive  = draft.activeExporters || [];
  const overrides = draft.formatOverrides || {};
  const allKeys   = exporters.map(e => e.key);
  const allSelected = allKeys.every(k => isActive.includes(k));

  return (
    <div style={{ maxWidth: 860 }}>

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CloudUpload size={22} color="var(--accent)" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Export automatique Google Drive</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.btn('ghost')} onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button style={S.btn()} onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Section 1 : Configuration globale ───────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Configuration</p>

        <div style={{ marginBottom: 20 }}>
          <Toggle
            value={draft.enabled || false}
            onChange={v => set('enabled', v)}
            label={draft.enabled ? 'Export activé — les données sont envoyées automatiquement sur Google Drive' : 'Export désactivé'}
          />
        </div>

        <div style={{ ...S.row, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Google Drive Folder ID *</label>
            <input
              style={S.input}
              value={draft.rootFolderId || ''}
              onChange={e => set('rootFolderId', e.target.value)}
              placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              ID du dossier Drive partagé avec le Service Account (visible dans l'URL Drive)
            </p>
          </div>
          <div>
            <label style={S.label}>Planification (expression cron)</label>
            <input
              style={S.input}
              value={draft.schedule || '0 7 * * *'}
              onChange={e => set('schedule', e.target.value)}
              placeholder="0 7 * * *"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Défaut : tous les jours à 07:00 (Europe/Paris). Format : min heure jour mois semaine
            </p>
          </div>
        </div>

        <div style={{ ...S.row, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Format global par défaut</label>
            <select style={S.select} value={draft.format || 'csv'} onChange={e => set('format', e.target.value)}>
              <option value="csv">CSV (Excel-compatible)</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Admins à notifier en cas d'échec</label>
            <input
              style={S.input}
              value={(draft.notifyUsers || []).join(', ')}
              onChange={e => set('notifyUsers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="Jean Dupont, Marie Martin"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Noms séparés par des virgules</p>
          </div>
        </div>

        <Toggle
          value={draft.syncFiles !== false}
          onChange={v => set('syncFiles', v)}
          label="Synchroniser aussi les fichiers uploadés (PDFs, images, documents)"
        />
      </div>

      {/* ── Section 2 : Exporteurs ───────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...S.cardTitle, margin: 0 }}>Exporteurs ({exporters.length})</p>
          <button
            type="button"
            style={{ ...S.btn('ghost'), fontSize: 12, padding: '6px 12px' }}
            onClick={() => set('activeExporters', allSelected ? [] : [...allKeys])}
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
          {exporters.map(exp => {
            const active   = isActive.length === 0 || isActive.includes(exp.key);
            const fmtOver  = overrides[exp.key] || '';
            return (
              <div
                key={exp.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border-light)'}`,
                  background: active ? 'var(--accent)08' : 'var(--bg-alt)',
                  gap: 8,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleExporter(exp.key)}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{exp.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    .{fmtOver || draft.format || 'csv'}
                  </span>
                </label>
                <select
                  style={{ ...S.select, fontSize: 11, padding: '3px 6px' }}
                  value={fmtOver}
                  onChange={e => setFormatOverride(exp.key, e.target.value)}
                  title="Surcharger le format pour cet exporteur"
                >
                  <option value="">Défaut</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3 : Déclenchement manuel ─────────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Déclenchement manuel</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button style={S.btn()} onClick={handleRun} disabled={running}>
            {running
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Export en cours…</>
              : <><Play size={14} /> Lancer l'export maintenant</>
            }
          </button>

          {lastRun && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Dernier run : <strong>{lastRun.targetNom}</strong> le {fmt(lastRun.createdAt)}
              {lastRun.payload?.failed?.length > 0 && (
                <span style={{ color: '#ef4444', marginLeft: 6 }}>
                  ({lastRun.payload.failed.length} échec(s))
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-alt)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Prérequis :</strong> Le Service Account Google doit avoir l'accès Éditeur sur le dossier Drive cible.
          Le fichier de clé JSON doit être configuré via <code>GOOGLE_SERVICE_ACCOUNT_KEY_PATH</code> dans le <code>.env</code> du backend.
        </div>
      </div>

      {/* ── Section 4 : Historique ───────────────────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Historique des runs</p>
        <HistorySection />
      </div>

      {/* Astuce CSS pour l'animation spin */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
