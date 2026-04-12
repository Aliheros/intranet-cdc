// src/pages/Admin.jsx — Panneau d'administration centralisé
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, ScrollText, BarChart2, RefreshCw, ChevronLeft, ChevronRight, Search, Calendar, User, Activity, MessageSquare, Receipt, Zap, Bell, Download, Settings2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import Permissions from './Permissions';
import NdfConfigPanel     from '../components/admin/NdfConfigPanel';
import DfConfigPanel      from '../components/admin/DfConfigPanel';
import AutomationPanel    from '../components/admin/AutomationPanel';
import AppConfigPanel           from '../components/admin/AppConfigPanel';
import DashboardMessagesPanel   from '../components/admin/DashboardMessagesPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Toutes les actions connues du backend (exhaustif)
const ACTION_LABELS = {
  // Auth
  'auth.login':            { label: 'Connexion',              color: '#16a34a', cat: 'auth' },
  'auth.login.failed':     { label: 'Tentative échouée',      color: '#e63946', cat: 'auth' },
  'auth.logout':           { label: 'Déconnexion',            color: '#64748b', cat: 'auth' },
  'auth.password.change':  { label: 'Mot de passe changé',    color: '#d97706', cat: 'auth' },
  // Utilisateurs
  'user.create':           { label: 'Compte créé',            color: '#16a34a', cat: 'user' },
  'user.update':           { label: 'Compte modifié',         color: '#1a56db', cat: 'user' },
  'user.deactivate':       { label: 'Compte désactivé',       color: '#e63946', cat: 'user' },
  'user.anonymize':        { label: 'Anonymisé',              color: '#7c3aed', cat: 'user' },
  'user.resetPassword':    { label: 'MDP réinitialisé',       color: '#d97706', cat: 'user' },
  'user.avatar.upload':    { label: 'Avatar mis à jour',      color: '#64748b', cat: 'user' },
  'user.avatar.delete':    { label: 'Avatar supprimé',        color: '#94a3b8', cat: 'user' },
  'permission.change':     { label: 'Droits modifiés',        color: '#d97706', cat: 'user' },
  // Devis & Factures
  'devisFacture.create':         { label: 'Devis/Facture créé',       color: '#16a34a', cat: 'devisFacture' },
  'devisFacture.update':         { label: 'Devis/Facture modifié',     color: '#1a56db', cat: 'devisFacture' },
  'devisFacture.soumettre':      { label: 'Dossier soumis',           color: '#0891b2', cat: 'devisFacture' },
  'devisFacture.prendreEnCharge':{ label: 'Pris en charge',           color: '#d97706', cat: 'devisFacture' },
  'devisFacture.sign':           { label: 'Document signé',           color: '#16a34a', cat: 'devisFacture' },
  'devisFacture.refuse':         { label: 'Dossier refusé',           color: '#e63946', cat: 'devisFacture' },
  'devisFacture.delete':         { label: 'Dossier supprimé',         color: '#e63946', cat: 'devisFacture' },
  // Notes de frais
  'ndf.create':            { label: 'NDF créée',              color: '#16a34a', cat: 'ndf' },
  'ndf.statusChange':      { label: 'Statut NDF modifié',     color: '#1a56db', cat: 'ndf' },
  'ndf.approve':           { label: 'NDF approuvée',          color: '#16a34a', cat: 'ndf' },
  'ndf.refuse':            { label: 'NDF refusée',            color: '#e63946', cat: 'ndf' },
  'ndf.delete':            { label: 'NDF supprimée',          color: '#e63946', cat: 'ndf' },
  // Transactions & Budget
  'transaction.create':    { label: 'Transaction créée',      color: '#16a34a', cat: 'tresorerie' },
  'transaction.update':    { label: 'Transaction modifiée',   color: '#1a56db', cat: 'tresorerie' },
  'transaction.delete':    { label: 'Transaction supprimée',  color: '#e63946', cat: 'tresorerie' },
  'transaction.horseBudget.approve': { label: 'Hors budget approuvé', color: '#d97706', cat: 'tresorerie' },
  'budget.update':         { label: 'Budget mis à jour',      color: '#d97706', cat: 'tresorerie' },
  // Actions terrain
  'action.create':         { label: 'Action créée',           color: '#16a34a', cat: 'action' },
  'action.delete':         { label: 'Action supprimée',       color: '#e63946', cat: 'action' },
  'action.archive':        { label: 'Action archivée',        color: '#94a3b8', cat: 'action' },
  // Évènements
  'event.create':          { label: 'Évènement créé',         color: '#16a34a', cat: 'event' },
  'event.update':          { label: 'Évènement modifié',      color: '#1a56db', cat: 'event' },
  'event.delete':          { label: 'Évènement supprimé',     color: '#e63946', cat: 'event' },
  // Missions
  'mission.create':        { label: 'Mission créée',          color: '#16a34a', cat: 'mission' },
  'mission.delete':        { label: 'Mission supprimée',      color: '#e63946', cat: 'mission' },
  'mission.candidate.accept': { label: 'Candidature acceptée', color: '#16a34a', cat: 'mission' },
  'mission.candidate.refuse': { label: 'Candidature refusée',  color: '#e63946', cat: 'mission' },
  // Tâches
  'task.create':           { label: 'Tâche créée',            color: '#16a34a', cat: 'task' },
  'task.delete':           { label: 'Tâche supprimée',        color: '#e63946', cat: 'task' },
  // Heures
  'hour.create':           { label: 'Heures saisies',         color: '#16a34a', cat: 'hour' },
  'hour.validate':         { label: 'Heures validées',        color: '#0891b2', cat: 'hour' },
  'hour.delete':           { label: 'Heures supprimées',      color: '#e63946', cat: 'hour' },
  // Contacts
  'contact.create':        { label: 'Contact créé',           color: '#16a34a', cat: 'contact' },
  'contact.update':        { label: 'Contact modifié',        color: '#1a56db', cat: 'contact' },
  // FAQ
  'faq.create':            { label: 'FAQ créée',              color: '#16a34a', cat: 'faq' },
  'faq.update':            { label: 'FAQ modifiée',           color: '#1a56db', cat: 'faq' },
  'faq.delete':            { label: 'FAQ supprimée',          color: '#e63946', cat: 'faq' },
  // Notifications
  'notification.create':   { label: 'Notification envoyée',   color: '#7c3aed', cat: 'notif' },
  'notification.delete':   { label: 'Notification supprimée', color: '#94a3b8', cat: 'notif' },
  // Cycles
  'cycle.create':          { label: 'Cycle créé',             color: '#16a34a', cat: 'admin' },
  'cycle.delete':          { label: 'Cycle supprimé',         color: '#e63946', cat: 'admin' },
  // Espaces & Admin
  'space.settings.update': { label: 'Paramètres espace',      color: '#1a56db', cat: 'admin' },
  'admin.export':          { label: 'Export CSV',             color: '#64748b', cat: 'admin' },
};

const ACTION_CATEGORIES = [
  { value: '',             label: 'Toutes catégories' },
  { value: 'auth',         label: 'Authentification' },
  { value: 'user',         label: 'Utilisateurs' },
  { value: 'devisFacture', label: 'Devis & Factures' },
  { value: 'ndf',          label: 'Notes de frais' },
  { value: 'tresorerie',   label: 'Trésorerie' },
  { value: 'action',       label: 'Actions terrain' },
  { value: 'event',        label: 'Évènements' },
  { value: 'mission',      label: 'Missions' },
  { value: 'task',         label: 'Tâches' },
  { value: 'hour',         label: 'Heures bénévoles' },
  { value: 'contact',      label: 'Contacts' },
  { value: 'admin',        label: 'Administration' },
];

const TARGET_TYPES = [
  { value: '',              label: 'Tous types' },
  { value: 'User',          label: 'Utilisateur' },
  { value: 'DevisFacture',  label: 'Devis/Facture' },
  { value: 'NoteFrais',     label: 'Note de frais' },
  { value: 'Transaction',   label: 'Transaction' },
  { value: 'Action',        label: 'Action terrain' },
  { value: 'Evenement',     label: 'Évènement' },
  { value: 'Mission',       label: 'Mission' },
  { value: 'Task',          label: 'Tâche' },
  { value: 'Hour',          label: 'Heure' },
  { value: 'Contact',       label: 'Contact' },
];

const ActionBadge = ({ action }) => {
  const meta = ACTION_LABELS[action];
  if (meta) return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: meta.color + '18', color: meta.color, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--bg-alt)', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
      {action}
    </span>
  );
};

// ─── Onglet Journal d'audit ───────────────────────────────────────────────────
const AuditTab = () => {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const EMPTY_FILTERS = { acteur: '', action: '', dateFrom: '', dateTo: '', category: '', targetType: '' };
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draft, setDraft]     = useState(EMPTY_FILTERS);
  const LIMIT = 50;

  const fetchLogs = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (f.acteur)     params.append('acteur',      f.acteur);
      if (f.action)     params.append('action',      f.action);
      if (f.category && !f.action) params.append('actionPrefix', f.category);
      if (f.dateFrom)   params.append('dateFrom',    f.dateFrom);
      if (f.dateTo)     params.append('dateTo',      f.dateTo);
      if (f.targetType) params.append('targetType',  f.targetType);
      const data = await api.get(`/admin/audit?${params}`);
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
    } catch { /* handled by apiClient */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchLogs(1, filters); }, []);

  const applyFilters = () => { setFilters(draft); fetchLogs(1, draft); };
  const resetFilters = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); fetchLogs(1, EMPTY_FILTERS); };
  const hasActiveFilters = Object.values(draft).some(Boolean);

  const inputStyle = { flex: 1, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-hover)', fontSize: 12, color: 'var(--text-base)' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div>
      {/* Filtres */}
      <div style={{ marginBottom: 16, padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
        {/* Ligne 1 : acteur, action texte, catégorie, type cible */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} color="var(--text-muted)" strokeWidth={1.8} />
            <input placeholder="Acteur…" value={draft.acteur}
              onChange={e => setDraft(d => ({ ...d, acteur: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={12} color="var(--text-muted)" strokeWidth={1.8} />
            <input placeholder="Recherche action…" value={draft.action}
              onChange={e => setDraft(d => ({ ...d, action: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} color="var(--text-muted)" strokeWidth={1.8} />
            <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={selectStyle}>
              {ACTION_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={12} color="var(--text-muted)" strokeWidth={1.8} />
            <select value={draft.targetType} onChange={e => setDraft(d => ({ ...d, targetType: e.target.value }))} style={selectStyle}>
              {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {/* Ligne 2 : dates + boutons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={12} color="var(--text-muted)" strokeWidth={1.8} />
            <input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
          <div style={{ flex: 1 }} />
          {hasActiveFilters && (
            <button onClick={resetFilters} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', cursor: 'pointer', fontSize: 12 }}>
              <RefreshCw size={11} /> Réinitialiser
            </button>
          )}
          <button onClick={() => fetchLogs(page)} title="Actualiser" style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 7, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
            <RefreshCw size={13} strokeWidth={1.8} />
          </button>
          <button onClick={applyFilters} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, background: '#0f2d5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            <Search size={12} /> Filtrer
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>
      ) : logs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 14, border: '1px dashed var(--border-light)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(26,86,219,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ScrollText size={24} strokeWidth={1.4} color="#1a56db" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-base)', marginBottom: 6 }}>Aucun log d'audit</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6 }}>
            {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Les entrées apparaîtront ici au fur et à mesure des actions effectuées dans l\'intranet.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            {total.toLocaleString('fr-FR')} entrée{total > 1 ? 's' : ''} · page {page}/{pages}
          </div>
          <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
            {/* En-têtes */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 190px 1fr 26px', gap: 0, background: 'var(--bg-alt)', borderBottom: '1px solid var(--border-light)', padding: '8px 14px' }}>
              {['Date & heure', 'Acteur', 'Action', 'Cible'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{h}</div>
              ))}
              <div />
            </div>
            {logs.map((entry, i) => {
              const isExpanded = expandedId === entry.id;
              const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;
              return (
                <div key={entry.id}>
                  <div
                    onClick={() => hasPayload && setExpandedId(isExpanded ? null : entry.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '150px 140px 190px 1fr 26px', gap: 0,
                      padding: '9px 14px',
                      borderBottom: (!isExpanded && i < logs.length - 1) ? '1px solid var(--border-light)' : 'none',
                      background: isExpanded ? 'rgba(26,86,219,0.04)' : (i % 2 === 0 ? 'var(--bg-surface)' : 'transparent'),
                      cursor: hasPayload ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>{fmt(entry.createdAt)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {entry.actorNom || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Système</span>}
                      {entry.ip && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{entry.ip}</span>}
                    </div>
                    <div style={{ paddingRight: 8 }}><ActionBadge action={entry.action} /></div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.targetType && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 5, background: 'var(--bg-alt)', padding: '1px 5px', borderRadius: 4 }}>{entry.targetType}</span>}
                      {entry.targetNom || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {hasPayload && (
                        <ChevronRight size={13} strokeWidth={2} color="var(--text-muted)"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Payload expandable */}
                  {isExpanded && hasPayload && (
                    <div style={{ padding: '10px 14px 12px 160px', background: 'rgba(26,86,219,0.03)', borderBottom: i < logs.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Détails du contexte</div>
                      <pre style={{ margin: 0, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 7, fontSize: 11, color: 'var(--text-base)', overflowX: 'auto', lineHeight: 1.6, border: '1px solid var(--border-light)' }}>
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: page <= 1 ? 'transparent' : 'var(--bg-hover)', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-base)', cursor: page <= 1 ? 'default' : 'pointer', fontSize: 12 }}>
                <ChevronLeft size={14} /> Précédent
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} / {pages}</span>
              <button onClick={() => fetchLogs(page + 1)} disabled={page >= pages} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: page >= pages ? 'transparent' : 'var(--bg-hover)', color: page >= pages ? 'var(--text-muted)' : 'var(--text-base)', cursor: page >= pages ? 'default' : 'pointer', fontSize: 12 }}>
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Onglet Statistiques ──────────────────────────────────────────────────────
const StatsTab = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>Chargement des statistiques…</div>;
  if (!stats)  return <div style={{ padding: 24, color: '#e63946', fontSize: 13 }}>Erreur lors du chargement des statistiques.</div>;

  const blocks = [
    {
      title: 'Utilisateurs',
      icon: Users,
      color: '#1a56db',
      rows: [
        { label: 'Total actifs',  value: stats.users.actifs,   accent: true },
        { label: 'Comptes inactifs', value: stats.users.inactifs },
        { label: 'Total comptes', value: stats.users.total },
      ],
    },
    {
      title: 'Suivi terrain',
      icon: Zap,
      color: '#d97706',
      rows: [
        { label: 'Actions en cours',  value: stats.actions.enCours, accent: true },
        { label: 'Actions archivées', value: stats.actions.archivees },
        { label: 'Évènements actifs', value: stats.events.total },
      ],
    },
    {
      title: 'Finances',
      icon: Receipt,
      color: '#16a34a',
      rows: [
        { label: 'NDF en attente', value: stats.ndf.enAttente, accent: true },
        { label: 'Montant en attente', value: stats.ndf.montantEnAttente.toFixed(2) + ' €', accent: true },
        { label: 'Total NDF', value: stats.ndf.total },
        { label: 'Transactions', value: stats.transactions.total },
      ],
    },
    {
      title: 'Communications',
      icon: MessageSquare,
      color: '#7c3aed',
      rows: [
        { label: 'Messages envoyés', value: stats.messages.total, accent: true },
        { label: 'Notifications créées', value: stats.notifs.total },
        { label: 'Missions publiées', value: stats.missions.total },
      ],
    },
    {
      title: 'Journal d\'audit',
      icon: ScrollText,
      color: '#64748b',
      rows: [
        { label: 'Entrées enregistrées', value: stats.audit.total },
      ],
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {blocks.map(block => {
        const Icon = block.icon;
        return (
          <div key={block.title} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: block.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} strokeWidth={1.8} color={block.color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{block.title}</div>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {block.rows.map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</div>
                  <div style={{ fontSize: row.accent ? 20 : 15, fontWeight: row.accent ? 800 : 600, fontFamily: row.accent ? 'var(--font-display)' : 'inherit', color: row.accent ? block.color : 'var(--text-base)' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Onglet Exports ───────────────────────────────────────────────────────────
const EXPORTS = [
  { key: 'users',    label: 'Utilisateurs',         desc: 'Tous les comptes (actifs + inactifs)',        color: '#1a56db', icon: Users },
  { key: 'ndf',      label: 'Notes de frais',        desc: 'Toutes les NDF avec statuts et montants',    color: '#16a34a', icon: Receipt },
  { key: 'actions',  label: 'Actions transversales', desc: 'Toutes les actions, responsables, statuts',  color: '#d97706', icon: Zap },
  { key: 'heures',   label: 'Heures bénévoles',      desc: 'Toutes les saisies d\'heures par bénévole',  color: '#7c3aed', icon: Bell },
];

const ExportsTab = () => {
  const [loading, setLoading] = useState({});

  const handleExport = async (key) => {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const response = await fetch(`/api/admin/export/${key}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erreur serveur');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = response.headers.get('content-disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download = match ? match[1] : `export_${key}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silencieux — l'apiClient gère le toast d'erreur
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(26,86,219,0.05)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 10, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Les exports sont générés en temps réel depuis la base de données. Format CSV compatible Excel (encodage UTF-8 BOM).
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {EXPORTS.map(({ key, label, desc, color, icon: Icon }) => (
          <div key={key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.8} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
            <button
              onClick={() => handleExport(key)}
              disabled={loading[key]}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 0', borderRadius: 9, background: loading[key] ? 'var(--bg-alt)' : color, color: loading[key] ? 'var(--text-muted)' : '#fff', border: 'none', cursor: loading[key] ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s' }}
            >
              <Download size={14} strokeWidth={2} />
              {loading[key] ? 'Génération…' : 'Télécharger CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Onglet Paramètres ────────────────────────────────────────────────────────
const ParametresTab = () => {
  const { addToast, requestConfirm } = useAppContext();
  const {
    ndfConfig, handleSaveNdfConfig,
    dfConfig, handleSaveDfConfig,
    refreshDevisFacture,
    cycles, activeCycle, handleNextCycle, handleDeleteCycle,
  } = useDataContext();
  const [section, setSection] = useState('ndf'); // 'ndf' | 'df' | 'cycles' | 'automation'

  const canDeleteCycle = (c) => c !== activeCycle && cycles.length > 1;

  return (
    <div>
      {/* Sous-navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'ndf',        label: 'Notes de Frais' },
          { id: 'df',         label: 'Devis & Factures' },
          { id: 'cycles',     label: 'Cycles / Années' },
          { id: 'references', label: 'Données de référence' },
          { id: 'automation', label: 'Automatisation' },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${section === s.id ? '#1a56db' : 'var(--border-light)'}`, background: section === s.id ? 'rgba(26,86,219,0.08)' : 'var(--bg-hover)', color: section === s.id ? '#1a56db' : 'var(--text-dim)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Config NDF */}
      {section === 'ndf' && ndfConfig && (
        <NdfConfigPanel
          config={ndfConfig}
          onSave={async (cfg) => { await handleSaveNdfConfig(cfg); addToast('Configuration NDF sauvegardée.'); }}
        />
      )}

      {/* Config DF */}
      {section === 'df' && dfConfig && (
        <DfConfigPanel
          config={dfConfig}
          onSave={async (cfg) => { await handleSaveDfConfig(cfg); addToast('Configuration Devis & Factures sauvegardée.'); }}
          onCategoriesChange={() => {
            // Force le rechargement des catégories dans DataContext
            import('../api/apiClient').then(({ default: api }) => {
              api.get('/categories-df').then(data => {
                // On passe par un event custom pour éviter la dépendance circulaire
                window.dispatchEvent(new CustomEvent('df-categories-updated'));
              }).catch(() => {});
            });
          }}
        />
      )}

      {/* Cycles */}
      {section === 'cycles' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>Paramètres</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Cycles annuels</div>
            </div>
            <button onClick={() => requestConfirm(`Créer le nouveau cycle ${(() => { const [y] = (cycles[0]||'2025-2026').split('-').map(Number); return `${y+1}-${y+2}`; })() } ?`, handleNextCycle)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, background: '#0f2d5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Plus size={13} /> Nouveau cycle
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cycles.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: `1px solid ${c === activeCycle ? 'rgba(26,86,219,0.3)' : 'var(--border-light)'}`, background: c === activeCycle ? 'rgba(26,86,219,0.05)' : 'var(--bg-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)' }}>{c}</div>
                  {c === activeCycle && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(26,86,219,0.12)', color: '#1a56db' }}>Actif</span>}
                </div>
                {canDeleteCycle(c) && (
                  <button onClick={() => requestConfirm(`Supprimer le cycle "${c}" ? Les équipes de ce cycle seront perdues.`, () => handleDeleteCycle(c))}
                    style={{ background: 'none', border: 'none', color: '#e63946', cursor: 'pointer', display: 'flex', padding: 4 }}>
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Supprimer un cycle efface les compositions d'équipes de ce cycle dans tous les espaces. Les actions, événements et NDF liés au cycle sont conservés.
            </div>
          </div>
        </div>
      )}

      {/* Données de référence */}
      {section === 'references' && <AppConfigPanel />}

      {/* Automatisation */}
      {section === 'automation' && <AutomationPanel />}
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'utilisateurs', label: 'Utilisateurs',      icon: Users },
  { id: 'messages',     label: 'Messages Dashboard', icon: MessageSquare },
  { id: 'audit',        label: 'Journal d\'audit',  icon: ScrollText },
  { id: 'parametres',   label: 'Paramètres',        icon: Settings2 },
  { id: 'exports',      label: 'Exports',           icon: Download },
  { id: 'statistiques', label: 'Statistiques',      icon: BarChart2 },
];

const Admin = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('utilisateurs');

  if (currentUser?.role !== 'Admin') {
    return <div className="empty" style={{ marginTop: 60 }}>Accès réservé aux administrateurs.</div>;
  }

  return (
    <>
      {/* En-tête */}
      <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={12} strokeWidth={2} /> Administration
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Panneau d'administration</div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', marginBottom: 24, gap: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#1a56db' : 'var(--text-muted)',
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid #1a56db' : '2px solid transparent',
                marginBottom: -2, cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {tab === 'utilisateurs'  && <Permissions />}
      {tab === 'messages'      && <DashboardMessagesPanel />}
      {tab === 'audit'         && <AuditTab />}
      {tab === 'parametres'    && <ParametresTab />}
      {tab === 'exports'       && <ExportsTab />}
      {tab === 'statistiques'  && <StatsTab />}
    </>
  );
};

export default Admin;
