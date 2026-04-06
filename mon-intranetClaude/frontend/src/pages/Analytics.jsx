// src/pages/Analytics.jsx — Tableau de bord analytique enrichi
import React, { useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { POLES } from '../data/constants';
import { formatDateShort, formatDuree } from '../utils/utils';
import {
  BarChart2, Users, Zap, TrendingUp, Target, Clock, CheckCircle2,
  AlertTriangle, Calendar, Receipt, ChevronRight, Award, Activity,
  PieChart, Layers, MapPin, FileText, Plus, Edit2, Trash2, ArrowUp, ArrowDown,
  Minus, Star, Flame, Info,
} from 'lucide-react';

// ─── Composants graphiques CSS ────────────────────────────────────────────────

const BarRow = ({ label, value, max, color = '#1a56db', suffix = '', small = false, display }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const displayVal = display !== undefined ? display : (typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value) + suffix;
  return (
    <div style={{ marginBottom: small ? 8 : 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: small ? 11 : 12, color: 'var(--text-base)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{label}</span>
        <span style={{ fontSize: small ? 10 : 11, fontWeight: 700, color, flexShrink: 0 }}>{displayVal}</span>
      </div>
      <div style={{ height: small ? 5 : 7, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, color = '#1a56db', onClick, delta, deltaLabel }) => (
  <div
    className="kc"
    style={{ cursor: onClick ? 'pointer' : 'default', borderTop: `3px solid ${color}`, position: 'relative' }}
    onClick={onClick}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Icon size={13} strokeWidth={2} style={{ color }} />
      <div className="kl">{label}</div>
    </div>
    <div className="kv" style={{ color }}>{value}</div>
    {sub && <div className="kd">{sub}</div>}
    {delta != null && (
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: delta > 0 ? '#16a34a' : delta < 0 ? '#e63946' : '#94a3b8' }}>
        {delta > 0 ? <ArrowUp size={9} /> : delta < 0 ? <ArrowDown size={9} /> : <Minus size={9} />}
        {delta > 0 ? '+' : ''}{delta} {deltaLabel || 'vs cycle préc.'}
      </div>
    )}
  </div>
);

const SectionTitle = ({ icon: Icon, children, right }) => (
  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={12} strokeWidth={2} />{children}</span>
    {right && <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: 0, textTransform: 'none' }}>{right}</span>}
  </div>
);

const EmptyState = ({ msg }) => (
  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>{msg}</div>
);

const DeltaBadge = ({ value, suffix = '', inverse = false }) => {
  if (value == null || value === 0) return null;
  const positive = inverse ? value < 0 : value > 0;
  const color = positive ? '#16a34a' : '#e63946';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 6 }}>
      {value > 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

const Analytics = () => {
  const { currentUser } = useAuth();
  const { handleNav } = useAppContext();
  const {
    analyticsStats, activeCycle, cycles, setActiveCycle,
    actions, volunteerHours, directory, notesFrais, tasks,
    isAdmin, isBureau, hasPower,
    impactStudies, handleSaveImpactStudy, handleDeleteImpactStudy,
    evenements,
  } = useDataContext();

  const [impactForm, setImpactForm] = useState(null);
  const [impactSaving, setImpactSaving] = useState(false);
  const [tab, setTab] = useState('overview');

  const {
    cycleActions, actionsByStatus, actionsByType, actionsByPole,
    totalBeneficiaires, beneficiairesPerMonth,
    totalHours, hoursByPerson, hoursByType,
    taskLoadByPerson, budgetExecution, ndfByCategory,
    avgParticipation, annulationRate, seanceTotalCount, seanceAnnuleeCount,
    // enrichissements
    bilanParsed, bilanWithScore, avgBilanSatisfaction, bilanSatisfactionDist,
    annulationByReason, completionVelocity,
    benefParHeure, coutParBenef, totalNdfRemboursee,
    topActions, budgetAlerts,
    prevCycleName, prevTotalActions, prevBeneficiaires, prevCompletionRate,
    byNiveau, byDepartement, byLabelRep, labelRepTotal, pctRep,
    byInstitution, simActions,
  } = analyticsStats;

  const activeMembers   = directory.filter(m => m.statut === 'Actif').length;
  const totalActions    = cycleActions.length;
  const termineeCount   = cycleActions.filter(a => a.statut === 'Terminée').length;
  const completionRate  = totalActions > 0 ? Math.round((termineeCount / totalActions) * 100) : 0;
  const totalNdfAmount  = notesFrais.reduce((s, n) => s + (Number(n.montant) || 0), 0);

  // Heures par personne — top 10 trié
  const hoursRanking = Object.entries(hoursByPerson).sort(([, a], [, b]) => b - a).slice(0, 10);
  const maxHours = hoursRanking[0]?.[1] || 1;

  // Charge tâches — top 10
  const taskRanking = Object.entries(taskLoadByPerson).sort(([, a], [, b]) => b - a).slice(0, 10);
  const maxTasks = taskRanking[0]?.[1] || 1;

  // Budget — tri par allocated desc
  const budgetRows = POLES
    .map(p => ({ pole: p, ...budgetExecution[p] }))
    .filter(r => r.allocated > 0 || r.spent > 0)
    .sort((a, b) => b.allocated - a.allocated);
  const maxBudget = Math.max(1, ...budgetRows.map(r => Math.max(r.allocated, r.spent)));

  // NDF catégories — tri montant desc
  const ndfRows = Object.entries(ndfByCategory).sort(([, a], [, b]) => b - a);
  const maxNdf = ndfRows[0]?.[1] || 1;

  // Actions par type — tri desc
  const typeRows = Object.entries(actionsByType).sort(([, a], [, b]) => b - a);
  const maxType  = typeRows[0]?.[1] || 1;

  const STATUT_COLORS = {
    'Planifiée': '#1a56db',
    'En cours':  '#d97706',
    'Terminée':  '#16a34a',
    'Annulée':   '#e63946',
  };

  // Tableau actions détaillé
  const actionsWithData = cycleActions.map(a => {
    const actionNdfs = notesFrais.filter(n => n.linkedActionId === a.id || n.actionId === a.id);
    const ndfTotal   = actionNdfs.reduce((s, n) => s + (Number(n.montant) || 0), 0);
    const actionTasks = tasks.filter(t => t.actionId === a.id);
    const doneTasks   = actionTasks.filter(t => t.status === 'Terminé' || !!t.forceCompletedBy).length;
    return { ...a, ndfTotal, ndfCount: actionNdfs.length, tasksDone: doneTasks, tasksTotal: actionTasks.length };
  }).sort((a, b) => (b.beneficiaires || 0) - (a.beneficiaires || 0));

  // Annulation par raison — trié desc
  const annulationReasonRows = Object.entries(annulationByReason).sort(([, a], [, b]) => b - a);
  const maxAnnulReason = annulationReasonRows[0]?.[1] || 1;

  // Complétion velocity — trié par mois
  const velocityKeys = Object.keys(completionVelocity).sort();
  const maxVelocity = Math.max(1, ...Object.values(completionVelocity));

  // Bilan satisfaction dist max
  const maxBilanDist = Math.max(1, ...Object.values(bilanSatisfactionDist));

  // Mois bénéficiaires
  const monthKeys = Object.keys(beneficiairesPerMonth).sort();
  const maxBenef  = Math.max(1, ...Object.values(beneficiairesPerMonth));

  // Rapport impact
  const cycleSeances = evenements
    .filter(e => activeCycle === 'Toutes' || e.cycle === activeCycle)
    .flatMap(e => Array.isArray(e.seances) ? e.seances : []);
  const nbAteliersAuto   = cycleSeances.length;
  const nbEtabAuto       = new Set(
    actions.filter(a => activeCycle === 'Toutes' || a.cycle === activeCycle).map(a => a.etablissement).filter(Boolean)
  ).size;
  const heuresAutoTotal  = cycleSeances.reduce((s, sc) => s + (Number(sc.duree) || 0), 0);
  const heureMoyAuto     = totalBeneficiaires > 0 ? heuresAutoTotal / totalBeneficiaires : 0;
  const cycleStudy = impactStudies.find(s => s.cycle === activeCycle);

  const openImpactForm = (study = null) => {
    if (study) {
      setImpactForm({ ...study });
    } else {
      setImpactForm({
        cycle: activeCycle,
        typeAction: 'Simulation Parlementaire',
        nbBeneficiaires: totalBeneficiaires,
        nbAteliers: nbAteliersAuto,
        nbEtablissements: nbEtabAuto,
        heuresAccompagnement: heuresAutoTotal,
        heureMoyParBenef: Math.round(heureMoyAuto * 10) / 10,
        nbBenevoles: activeMembers,
      });
    }
  };

  const saveImpactForm = async () => {
    if (!impactForm) return;
    setImpactSaving(true);
    try {
      await handleSaveImpactStudy(impactForm);
      setImpactForm(null);
    } finally {
      setImpactSaving(false);
    }
  };

  // ── Alertes stratégiques (KPIs structurels, pas d'opérationnel individuel) ──
  const alerts = [];

  // Taux annulation séances — signal de qualité terrain
  if (annulationRate >= 25)
    alerts.push({ level: 'warn', msg: `Taux d'annulation séances : ${annulationRate}% — impacte la régularité du programme.` });

  // Budget — signal financier critique
  if (budgetAlerts.some(p => budgetExecution[p]?.pct >= 100))
    alerts.push({ level: 'danger', msg: `Dépassement budgétaire sur : ${budgetAlerts.filter(p => budgetExecution[p]?.pct >= 100).join(', ')}.` });
  else if (budgetAlerts.length > 0)
    alerts.push({ level: 'warn', msg: `Consommation budget ≥ 80% sur : ${budgetAlerts.join(', ')}.` });

  // NDF backlog — signal de gestion financière
  const ndfPending = notesFrais.filter(n => ['Soumise', 'En vérification'].includes(n.statut));
  if (ndfPending.length >= 5)
    alerts.push({ level: 'info', msg: `Backlog NDF : ${ndfPending.length} dossiers en attente de traitement — montant potentiel ${ndfPending.reduce((s,n) => s+(Number(n.montant)||0),0).toFixed(0)}€.` });

  // Taux de complétion des actions — signal programme
  const actionsEnRetard = cycleActions.filter(a =>
    a.statut !== 'Terminée' && a.statut !== 'Annulée' && a.date_fin && new Date(a.date_fin) < new Date()
  );
  const actionsActives = cycleActions.filter(a => a.statut !== 'Terminée' && a.statut !== 'Annulée');
  const tauxRetard = actionsActives.length > 0 ? Math.round((actionsEnRetard.length / actionsActives.length) * 100) : 0;
  if (tauxRetard >= 30 && actionsEnRetard.length >= 2)
    alerts.push({ level: 'warn', msg: `${tauxRetard}% des actions en cours dépassent leur deadline (${actionsEnRetard.length} sur ${actionsActives.length}).` });

  // Faible couverture bilan — signal qualité rapportage
  if (termineeCount >= 3 && bilanWithScore.length / termineeCount < 0.5)
    alerts.push({ level: 'info', msg: `Couverture bilan faible : ${bilanWithScore.length}/${termineeCount} actions terminées ont un bilan renseigné (${Math.round(bilanWithScore.length/termineeCount*100)}%).` });

  const TABS = [
    { id: 'overview',  label: 'Vue d\'ensemble', icon: BarChart2 },
    { id: 'actions',   label: 'Actions',          icon: Zap },
    { id: 'benevoles', label: 'Bénévoles',        icon: Users },
    { id: 'finances',  label: 'Finances',          icon: Receipt },
    { id: 'rapport',   label: 'Rapport',           icon: FileText },
  ];

  const ALERT_COLORS = { danger: '#e63946', warn: '#d97706', info: '#1a56db' };

  return (
    <>
      <div className="eyebrow">Pilotage</div>
      <div className="ptitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>Analytics</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cycles.map(c => (
            <button key={c} className={`chip ${activeCycle === c ? 'on' : ''}`} style={{ border: 'none', fontSize: 11 }} onClick={() => setActiveCycle(c)}>{c}</button>
          ))}
          <button className={`chip ${activeCycle === 'Toutes' ? 'on' : ''}`} style={{ border: 'none', fontSize: 11 }} onClick={() => setActiveCycle('Toutes')}>Tous cycles</button>
        </div>
      </div>

      {/* Panneau alertes intelligentes */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, background: `${ALERT_COLORS[a.level]}0d`, border: `1px solid ${ALERT_COLORS[a.level]}30`, borderLeft: `3px solid ${ALERT_COLORS[a.level]}`, borderRadius: 6, padding: '8px 12px', color: 'var(--text-base)' }}>
              <AlertTriangle size={13} strokeWidth={2} style={{ color: ALERT_COLORS[a.level], flexShrink: 0, marginTop: 1 }} />
              <span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="toolbar-wrap" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setTab(t.id)}>
            <t.icon size={12} strokeWidth={2} />{t.label}
            {t.id === 'overview' && alerts.length > 0 && (
              <span style={{ background: '#e63946', color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 800, padding: '0 4px', minWidth: 14, textAlign: 'center' }}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════ ONGLET VUE D'ENSEMBLE ═══════════ */}
      {tab === 'overview' && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <KpiCard icon={Zap}          label="Actions ce cycle"          value={totalActions}       sub={`${termineeCount} terminées`}          color="#1a56db"
              delta={prevCycleName ? totalActions - prevTotalActions : null} deltaLabel="vs cycle préc."
              onClick={() => setTab('actions')} />
            <KpiCard icon={Target}       label="Bénéficiaires atteints"    value={totalBeneficiaires.toLocaleString('fr-FR')} sub="personnes touchées" color="#7c3aed"
              delta={prevCycleName && prevBeneficiaires > 0 ? totalBeneficiaires - prevBeneficiaires : null} deltaLabel="vs cycle préc." />
            <KpiCard icon={Clock}        label="Heures bénévoles"          value={totalHours > 0 ? formatDuree(totalHours) : '—'} sub={`${activeMembers} membres actifs`} color="#0891b2"
              onClick={() => setTab('benevoles')} />
            <KpiCard icon={CheckCircle2} label="Taux de complétion"        value={`${completionRate}%`} sub="actions terminées / total"          color="#16a34a"
              delta={prevCycleName && prevCompletionRate != null ? completionRate - prevCompletionRate : null} deltaLabel="pts vs cycle préc." />
            <KpiCard icon={Calendar}     label="Taux participation séances" value={avgParticipation > 0 ? `${avgParticipation}%` : '—'} sub={`${annulationRate}% séances annulées`} color={annulationRate >= 25 ? '#e63946' : '#d97706'} />
            <KpiCard icon={Star}         label="Satisfaction bilan"         value={avgBilanSatisfaction != null ? `${avgBilanSatisfaction}/5` : '—'} sub={bilanWithScore.length > 0 ? `sur ${bilanWithScore.length} bilan${bilanWithScore.length > 1 ? 's' : ''}` : 'Aucun bilan complété'} color="#d97706" onClick={() => setTab('actions')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

            {/* Statuts */}
            <div className="sc">
              <SectionTitle icon={Activity}>Statut des actions — {activeCycle}</SectionTitle>
              {Object.entries(STATUT_COLORS).map(([s, c]) => (
                <BarRow key={s} label={s} value={actionsByStatus[s] || 0} max={totalActions || 1} color={c} suffix={` (${totalActions > 0 ? Math.round((actionsByStatus[s] || 0) / totalActions * 100) : 0}%)`} />
              ))}
              {totalActions === 0 && <EmptyState msg="Aucune action ce cycle." />}
              {actionsEnRetard.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#e63946', background: 'rgba(230,57,70,0.06)', borderRadius: 6, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={11} /> {actionsEnRetard.length} action{actionsEnRetard.length > 1 ? 's' : ''} en retard
                </div>
              )}
            </div>

            {/* Bénéficiaires par mois */}
            <div className="sc">
              <SectionTitle icon={TrendingUp}>Bénéficiaires par mois</SectionTitle>
              {monthKeys.length === 0 ? (
                <EmptyState msg="Aucune donnée de bénéficiaires." />
              ) : (
                monthKeys.map(m => (
                  <BarRow key={m} label={new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} value={beneficiairesPerMonth[m]} max={maxBenef} color="#7c3aed" suffix=" pers." small />
                ))
              )}
            </div>

            {/* Types d'actions */}
            <div className="sc">
              <SectionTitle icon={Layers}>Répartition par type</SectionTitle>
              {typeRows.length === 0 ? <EmptyState msg="Aucune action." /> : (
                typeRows.map(([type, count]) => (
                  <BarRow key={type} label={type} value={count} max={maxType} color="#0891b2" suffix={` (${Math.round(count / totalActions * 100)}%)`} small />
                ))
              )}
            </div>

            {/* Velocity complétion */}
            {velocityKeys.length > 0 && (
              <div className="sc">
                <SectionTitle icon={Zap}>Actions terminées par mois</SectionTitle>
                {velocityKeys.map(m => (
                  <BarRow key={m} label={new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} value={completionVelocity[m]} max={maxVelocity} color="#16a34a" suffix=" action(s)" small />
                ))}
              </div>
            )}

            {/* Annulations par raison */}
            {annulationReasonRows.length > 0 && (
              <div className="sc">
                <SectionTitle icon={AlertTriangle} right={`${seanceAnnuleeCount} séance${seanceAnnuleeCount > 1 ? 's' : ''} sur ${seanceTotalCount}`}>Raisons d'annulation</SectionTitle>
                {annulationReasonRows.map(([raison, count]) => (
                  <BarRow key={raison} label={raison} value={count} max={maxAnnulReason} color="#e63946" suffix={` (${Math.round(count / seanceAnnuleeCount * 100)}%)`} small />
                ))}
              </div>
            )}

            {/* Heures par type */}
            {totalHours > 0 && (
              <div className="sc">
                <SectionTitle icon={Clock}>Heures bénévoles par type</SectionTitle>
                {Object.entries(hoursByType).sort(([, a], [, b]) => b - a).map(([type, h]) => (
                  <BarRow key={type} label={type} value={h} max={totalHours} color="#0891b2" display={formatDuree(h)} small />
                ))}
              </div>
            )}

          </div>
        </>
      )}

      {/* ═══════════ ONGLET ACTIONS ═══════════ */}
      {tab === 'actions' && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <KpiCard icon={Zap}           label="Total actions"       value={totalActions}   sub={activeCycle}           color="#1a56db" />
            <KpiCard icon={Target}        label="Bénéficiaires"       value={totalBeneficiaires.toLocaleString('fr-FR')} sub="cumul cycle" color="#7c3aed" />
            <KpiCard icon={CheckCircle2}  label="Terminées"           value={termineeCount}  sub={`${completionRate}% du cycle`} color="#16a34a" />
            <KpiCard icon={AlertTriangle} label="Annulées"            value={actionsByStatus['Annulée'] || 0} sub="ce cycle" color="#e63946" />
            <KpiCard icon={Star}          label="Satisfaction bilan"  value={avgBilanSatisfaction != null ? `${avgBilanSatisfaction}/5` : '—'} sub={`${bilanWithScore.length} bilan${bilanWithScore.length !== 1 ? 's' : ''} renseigné${bilanWithScore.length !== 1 ? 's' : ''}`} color="#d97706" />
            <KpiCard icon={FileText}      label="Couverture bilan"    value={termineeCount > 0 ? `${Math.round((bilanWithScore.length / termineeCount) * 100)}%` : '—'} sub={`${bilanWithScore.length}/${termineeCount} actions terminées`} color="#0891b2" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>

            {/* Répartition par pôle */}
            <div className="sc">
              <SectionTitle icon={MapPin}>Actions impliquant chaque pôle</SectionTitle>
              {POLES.map(p => (
                <BarRow key={p} label={p} value={actionsByPole[p] || 0} max={Math.max(1, ...Object.values(actionsByPole))} color="#1a56db" suffix=" actions" small />
              ))}
            </div>

            {/* Satisfaction bilan distribution */}
            {bilanWithScore.length > 0 && (
              <div className="sc">
                <SectionTitle icon={Star} right={avgBilanSatisfaction != null ? `Moy. ${avgBilanSatisfaction}/5` : ''}>Distribution satisfaction bilan</SectionTitle>
                {[5, 4, 3, 2, 1].map(n => {
                  const starColor = n >= 4 ? '#16a34a' : n === 3 ? '#d97706' : '#e63946';
                  return (
                    <div key={n} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {'★'.repeat(n)}{'☆'.repeat(5 - n)}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: starColor }}>{bilanSatisfactionDist[n] || 0} action{(bilanSatisfactionDist[n] || 0) !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${maxBilanDist > 0 ? Math.round(((bilanSatisfactionDist[n] || 0) / maxBilanDist) * 100) : 0}%`, background: starColor, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {bilanParsed.filter(a => a.bilanData.pointsPositifs).slice(0, 3).map((a, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 4, padding: '4px 8px', fontStyle: 'italic' }}>
                      "{a.bilanData.pointsPositifs.slice(0, 80)}{a.bilanData.pointsPositifs.length > 80 ? '…' : ''}" — {a.etablissement || 'action'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top actions par bénéficiaires */}
            {topActions.length > 0 && (
              <div className="sc">
                <SectionTitle icon={Award}>Top 5 actions — bénéficiaires</SectionTitle>
                {topActions.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? '#d97706' : 'var(--text-muted)', width: 18, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.etablissement || a.nom || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.type} — {formatDateShort(a.date_debut)}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>{a.beneficiaires}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Par type */}
            <div className="sc">
              <SectionTitle icon={Layers}>Par type d'action</SectionTitle>
              {typeRows.map(([type, count]) => (
                <BarRow key={type} label={type.replace('Simulation Parlementaire', 'Sim. Parl.').replace('format', 'fmt')} value={count} max={maxType} color="#7c3aed" small />
              ))}
              {typeRows.length === 0 && <EmptyState msg="Aucune action." />}
            </div>

            {/* Public / Niveau scolaire */}
            {Object.keys(byNiveau).length > 0 && (() => {
              const niveauRows = Object.entries(byNiveau).sort(([, a], [, b]) => b - a);
              const maxNiveau = niveauRows[0]?.[1] || 1;
              return (
                <div className="sc">
                  <SectionTitle icon={Users}>Public touché (type de classe)</SectionTitle>
                  {niveauRows.map(([niveau, count]) => (
                    <BarRow key={niveau} label={niveau} value={count} max={maxNiveau} color="#0891b2"
                      suffix={` (${totalActions > 0 ? Math.round(count / totalActions * 100) : 0}%)`} small />
                  ))}
                </div>
              );
            })()}

            {/* Label REP */}
            {labelRepTotal > 0 && (
              <div className="sc">
                <SectionTitle icon={MapPin} right={pctRep != null ? `${pctRep}% en zone REP/REP+` : ''}>
                  Actions en zone prioritaire
                </SectionTitle>
                {[['REP+', '#7c3aed'], ['REP', '#1a56db'], ['Hors REP', '#94a3b8']].map(([label, color]) => (
                  <BarRow key={label} label={label} value={byLabelRep[label] || 0} max={labelRepTotal} color={color}
                    suffix={` (${labelRepTotal > 0 ? Math.round((byLabelRep[label] || 0) / labelRepTotal * 100) : 0}%)`} small />
                ))}
                {pctRep != null && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: pctRep >= 50 ? 'rgba(124,58,237,0.06)' : 'rgba(148,163,184,0.08)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Part en éducation prioritaire</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: pctRep >= 50 ? '#7c3aed' : '#94a3b8' }}>{pctRep}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Répartition géographique (département) */}
            {Object.keys(byDepartement).length > 0 && (() => {
              const deptRows = Object.entries(byDepartement).sort(([, a], [, b]) => b - a);
              const maxDept = deptRows[0]?.[1] || 1;
              return (
                <div className="sc">
                  <SectionTitle icon={MapPin}>Répartition géographique (dép.)</SectionTitle>
                  {deptRows.map(([dept, count]) => (
                    <BarRow key={dept} label={`Dép. ${dept}`} value={count} max={maxDept} color="#16a34a"
                      suffix={` (${totalActions > 0 ? Math.round(count / totalActions * 100) : 0}%)`} small />
                  ))}
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                    {deptRows.length} département{deptRows.length > 1 ? 's' : ''} couvert{deptRows.length > 1 ? 's' : ''}
                  </div>
                </div>
              );
            })()}

            {/* Institutions simulées */}
            {Object.keys(byInstitution).length > 0 && (() => {
              const instRows = Object.entries(byInstitution).sort(([, a], [, b]) => b - a);
              const maxInst = instRows[0]?.[1] || 1;
              return (
                <div className="sc">
                  <SectionTitle icon={Layers} right={`${simActions.length} simulation${simActions.length > 1 ? 's' : ''}`}>
                    Institutions simulées
                  </SectionTitle>
                  {instRows.map(([inst, count]) => (
                    <BarRow key={inst} label={inst} value={count} max={maxInst} color="#d97706"
                      suffix={` (${simActions.length > 0 ? Math.round(count / simActions.length * 100) : 0}%)`} small />
                  ))}
                </div>
              );
            })()}

          </div>

          {/* Tableau détaillé */}
          <div className="sc">
            <SectionTitle icon={Zap}>Détail par action</SectionTitle>
            {actionsWithData.length === 0 ? (
              <EmptyState msg="Aucune action ce cycle." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                      {['Établissement', 'Type', 'Statut', 'Bénéf.', 'Bilan', 'Tâches', 'NDF', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: ['Bénéf.', 'Bilan', 'Tâches', 'NDF'].includes(h) ? 'center' : h === 'NDF' ? 'right' : 'left', padding: '8px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actionsWithData.map(a => {
                      const sColor = STATUT_COLORS[a.statut] || 'var(--text-muted)';
                      const taskPct = a.tasksTotal > 0 ? Math.round((a.tasksDone / a.tasksTotal) * 100) : null;
                      const bilanEntry = bilanParsed.find(b => b.id === a.id);
                      const bilanScore = bilanEntry ? Number(bilanEntry.bilanData.satisfaction) : null;
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                          onClick={() => handleNav('actions')}
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.etablissement}
                            {a.ville && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{a.ville}</div>}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {(a.type || '').replace('Simulation Parlementaire', 'Sim. Parl.').replace('format', 'fmt')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: sColor, background: `${sColor}18`, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>{a.statut}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: a.beneficiaires > 0 ? '#7c3aed' : 'var(--text-muted)' }}>
                            {a.beneficiaires > 0 ? a.beneficiaires : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>
                            {bilanScore != null ? (
                              <span style={{ fontWeight: 700, color: bilanScore >= 4 ? '#16a34a' : bilanScore === 3 ? '#d97706' : '#e63946' }}>
                                {'★'.repeat(bilanScore)}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {taskPct !== null ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: taskPct >= 80 ? '#16a34a' : taskPct >= 40 ? '#d97706' : '#1a56db' }}>{a.tasksDone}/{a.tasksTotal}</span>
                                <div style={{ width: 40, height: 3, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${taskPct}%`, background: taskPct >= 80 ? '#16a34a' : taskPct >= 40 ? '#d97706' : '#1a56db' }} />
                                </div>
                              </div>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: a.ndfTotal > 0 ? '#e63946' : 'var(--text-muted)' }}>
                            {a.ndfTotal > 0 ? `${a.ndfTotal.toFixed(0)}€` : '—'}
                            {a.ndfCount > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>{a.ndfCount} NDF</div>}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {formatDateShort(a.date_debut)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════ ONGLET BÉNÉVOLES ═══════════ */}
      {tab === 'benevoles' && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <KpiCard icon={Users}        label="Membres actifs"         value={activeMembers}  sub="dans l'équipe"                     color="#1a56db" />
            <KpiCard icon={Clock}        label="Total heures bénévoles" value={totalHours > 0 ? formatDuree(totalHours) : '—'} sub="enregistrées" color="#0891b2" />
            <KpiCard icon={Award}        label="Moy. heures / bénévole" value={totalHours > 0 && activeMembers > 0 ? formatDuree(totalHours / activeMembers) : '—'} sub="par membre actif" color="#7c3aed" />
            <KpiCard icon={Target}       label="Bénéf. par heure"       value={benefParHeure != null ? benefParHeure : '—'} sub={benefParHeure != null ? 'bénéficiaires / heure bénévole' : 'Données insuffisantes'} color="#16a34a" />
            <KpiCard icon={CheckCircle2} label="Tâches actives"         value={Object.values(taskLoadByPerson).reduce((a, b) => a + b, 0)} sub={overloadedMembers.length > 0 ? `⚠ ${overloadedMembers.length} surchargé${overloadedMembers.length > 1 ? 's' : ''}` : 'non complétées'} color={overloadedMembers.length > 0 ? '#e63946' : '#d97706'} />
            <KpiCard icon={Activity}     label="Actions sans bénévoles" value={cycleActions.filter(a => !(a.responsables || []).length).length} sub="aucun responsable assigné" color="#94a3b8" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

            <div className="sc">
              <SectionTitle icon={Clock}>Heures enregistrées par bénévole (top 10)</SectionTitle>
              {hoursRanking.length === 0 ? <EmptyState msg="Aucune heure bénévole enregistrée." /> : (
                hoursRanking.map(([name, h]) => (
                  <BarRow key={name} label={name} value={h} max={maxHours} color="#0891b2" display={formatDuree(h)} small />
                ))
              )}
            </div>

            <div className="sc">
              <SectionTitle icon={CheckCircle2}>Charge tâches actives par bénévole</SectionTitle>
              {taskRanking.length === 0 ? <EmptyState msg="Aucune tâche active assignée." /> : (
                taskRanking.map(([name, count]) => {
                  const color = count >= 6 ? '#e63946' : count >= 4 ? '#d97706' : '#16a34a';
                  return (
                    <div key={name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-base)', flex: 1 }}>{name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                          {count} tâche{count > 1 ? 's' : ''}{count >= 6 ? ' ⚠' : ''}
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.round((count / maxTasks) * 100))}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })
              )}
              {taskRanking.some(([, c]) => c >= 6) && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#e63946', background: 'rgba(230,57,70,0.06)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={11} strokeWidth={2} /> Certains bénévoles ont 6+ tâches actives — risque de surcharge.
                </div>
              )}
            </div>

            <div className="sc">
              <SectionTitle icon={Users}>Membres par statut</SectionTitle>
              {[
                { s: 'Actif',   c: '#16a34a' },
                { s: 'Congé',   c: '#d97706' },
                { s: 'Inactif', c: '#94a3b8' },
              ].map(({ s, c }) => {
                const count = directory.filter(m => m.statut === s).length;
                return <BarRow key={s} label={s} value={count} max={directory.length || 1} color={c} suffix={` (${directory.length > 0 ? Math.round((count / directory.length) * 100) : 0}%)`} small />;
              })}
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>Total : {directory.length} membres</div>
            </div>

            {Object.keys(hoursByType).length > 0 && (
              <div className="sc">
                <SectionTitle icon={Layers}>Heures par type d'activité</SectionTitle>
                {Object.entries(hoursByType).sort(([, a], [, b]) => b - a).map(([type, h]) => (
                  <BarRow key={type} label={type} value={h} max={totalHours || 1} color="#7c3aed" display={`${formatDuree(h)} (${totalHours > 0 ? Math.round((h / totalHours) * 100) : 0}%)`} small />
                ))}
                {benefParHeure != null && (
                  <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(22,163,74,0.06)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Efficacité : bénéficiaires / heure</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{benefParHeure}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {/* ═══════════ ONGLET FINANCES ═══════════ */}
      {tab === 'finances' && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            {(() => {
              const totalAllocated = budgetRows.reduce((s, r) => s + r.allocated, 0);
              const totalSpent     = budgetRows.reduce((s, r) => s + r.spent, 0);
              const globalPct      = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
              const ndfPending     = notesFrais.filter(n => ['Soumise', 'En vérification'].includes(n.statut));
              const ndfPendingAmt  = ndfPending.reduce((s, n) => s + (Number(n.montant) || 0), 0);
              return (
                <>
                  <KpiCard icon={TrendingUp}   label="Budget global alloué"   value={totalAllocated > 0 ? `${totalAllocated.toLocaleString('fr-FR')}€` : '—'} sub="tous pôles" color="#1a56db" />
                  <KpiCard icon={Receipt}       label="Dépenses totales"        value={totalSpent > 0 ? `${totalSpent.toLocaleString('fr-FR')}€` : '—'} sub={`${globalPct}% consommé`} color={globalPct > 90 ? '#e63946' : globalPct > 70 ? '#d97706' : '#16a34a'} />
                  <KpiCard icon={Clock}         label="NDF en attente"          value={ndfPending.length} sub={ndfPendingAmt > 0 ? `${ndfPendingAmt.toFixed(0)}€` : ''} color="#d97706" />
                  <KpiCard icon={CheckCircle2}  label="NDF remboursées"         value={notesFrais.filter(n => n.statut === 'Remboursée').length} sub={totalNdfRemboursee > 0 ? `${totalNdfRemboursee.toFixed(0)}€ remboursés` : 'ce cycle'} color="#16a34a" />
                  <KpiCard icon={Target}        label="Coût / bénéficiaire"     value={coutParBenef != null ? `${coutParBenef}€` : '—'} sub={coutParBenef != null ? 'NDF remboursées / bénéficiaires' : 'Données insuffisantes'} color="#7c3aed" />
                  <KpiCard icon={AlertTriangle} label="Pôles en alerte budget"  value={budgetAlerts.length} sub={budgetAlerts.length > 0 ? `${budgetAlerts.filter(p => budgetExecution[p]?.pct >= 100).length} en dépassement` : 'Aucune alerte'} color={budgetAlerts.some(p => budgetExecution[p]?.pct >= 100) ? '#e63946' : budgetAlerts.length > 0 ? '#d97706' : '#16a34a'} />
                </>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

            <div className="sc">
              <SectionTitle icon={TrendingUp}>Exécution budgétaire par pôle</SectionTitle>
              {budgetRows.length === 0 ? (
                <EmptyState msg="Aucun budget défini. Renseignez les budgets dans l'espace Bureau." />
              ) : (
                budgetRows.map(r => {
                  const overBudget = r.pct > 100;
                  const barColor   = overBudget ? '#e63946' : r.pct > 80 ? '#d97706' : '#16a34a';
                  return (
                    <div key={r.pole} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)' }}>{r.pole}</span>
                        <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>{r.spent.toLocaleString('fr-FR')}€ / {r.allocated.toLocaleString('fr-FR')}€</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, r.pct)}%`, background: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.pct}% consommé</span>
                        {overBudget && <span style={{ fontSize: 9, fontWeight: 700, color: '#e63946' }}>⚠ Dépassement</span>}
                        {r.pct >= 80 && !overBudget && <span style={{ fontSize: 9, color: '#d97706' }}>Attention</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="sc">
              <SectionTitle icon={Receipt}>Notes de frais par catégorie</SectionTitle>
              {ndfRows.length === 0 ? <EmptyState msg="Aucune note de frais enregistrée." /> : (
                ndfRows.map(([cat, total]) => (
                  <BarRow key={cat} label={cat} value={total} max={maxNdf} color="#e63946" suffix="€" small />
                ))
              )}
            </div>

            <div className="sc">
              <SectionTitle icon={Activity}>Statuts des notes de frais</SectionTitle>
              {[
                { s: 'Brouillon',       c: '#94a3b8' },
                { s: 'Soumise',         c: '#1a56db' },
                { s: 'En vérification', c: '#d97706' },
                { s: 'Validée',         c: '#0891b2' },
                { s: 'Remboursée',      c: '#16a34a' },
                { s: 'Refusée',         c: '#e63946' },
              ].map(({ s, c }) => {
                const items = notesFrais.filter(n => n.statut === s);
                const amt = items.reduce((sum, n) => sum + (Number(n.montant) || 0), 0);
                if (items.length === 0) return null;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      {s}
                    </span>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{items.length}</span>
                      {amt > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{amt.toFixed(0)}€</span>}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </>
      )}

      {/* ═══════════ ONGLET RAPPORT ═══════════ */}
      {tab === 'rapport' && (
        <>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Chiffres clés auto-calculés</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{activeCycle === 'Toutes' ? 'Tous cycles confondus' : `Cycle ${activeCycle}`}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Données issues de l'intranet en temps réel</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              {[
                { label: 'Bénéficiaires touchés', value: totalBeneficiaires, color: '#7c3aed' },
                { label: 'Ateliers réalisés',     value: nbAteliersAuto,    color: '#1a56db' },
                { label: 'Établissements',        value: nbEtabAuto,        color: '#0891b2' },
                { label: 'Bénévoles investis',    value: activeMembers,     color: '#d97706' },
                { label: 'Heures bénévoles',      value: totalHours > 0 ? formatDuree(totalHours) : '—', color: '#16a34a' },
                { label: 'Actions menées',        value: totalActions,      color: '#e63946' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: `${color}0d`, borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle icon={FileText}>Études d'impact (données enquêtes)</SectionTitle>
            {(isAdmin || isBureau) && activeCycle !== 'Toutes' && (
              <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => openImpactForm(cycleStudy || null)}>
                <Plus size={11} strokeWidth={2} />
                {cycleStudy ? 'Modifier' : 'Saisir les données'}
              </button>
            )}
          </div>

          {impactForm && (
            <div style={{ background: 'var(--bg-card)', border: '2px solid #1a56db', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a56db', marginBottom: 14 }}>
                {impactForm.id ? 'Modifier l\'étude d\'impact' : 'Nouvelle étude d\'impact'} — {impactForm.cycle}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type d'action</label>
                <select value={impactForm.typeAction || 'Simulation Parlementaire'} onChange={e => setImpactForm(f => ({ ...f, typeAction: e.target.value }))} style={{ fontSize: 12, padding: '6px 8px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)' }}>
                  {['Simulation Parlementaire', 'Orientation', 'Visite d\'institution', 'La Cité a Voté', 'Autre'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Quantitatif (pré-rempli, ajustable)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { key: 'nbBeneficiaires', label: 'Bénéficiaires' },
                  { key: 'nbAteliers', label: 'Ateliers' },
                  { key: 'nbEtablissements', label: 'Établissements' },
                  { key: 'heuresAccompagnement', label: 'Heures totales accomp.' },
                  { key: 'heureMoyParBenef', label: 'Heures moy/bénéficiaire' },
                  { key: 'nbBenevoles', label: 'Bénévoles investis' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <input type="number" value={impactForm[key] ?? ''} onChange={e => setImpactForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))} style={{ width: '100%', fontSize: 12, padding: '5px 7px', border: '1px solid var(--border-light)', borderRadius: 5, background: 'var(--bg-base)', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Satisfaction élèves (% — depuis questionnaire)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { key: 'pctApprecie', label: 'Ont apprécié (%)' },
                  { key: 'pctTresApprecie', label: 'Très apprécié (%)' },
                  { key: 'pctEmballeInitial', label: 'Emballé en séance 1 (%)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <input type="number" min="0" max="100" value={impactForm[key] ?? ''} onChange={e => setImpactForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))} style={{ width: '100%', fontSize: 12, padding: '5px 7px', border: '1px solid var(--border-light)', borderRadius: 5, background: 'var(--bg-base)', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Progression avant/après simulation (delta en points de %)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { key: 'deltaConnaissanceDepute', label: 'Connaissance député' },
                  { key: 'deltaConnaissanceAN', label: 'Connaissance Assemblée/Sénat' },
                  { key: 'deltaVoteIntent', label: 'Intention de voter' },
                  { key: 'deltaEngagement', label: 'Engagement asso/parti' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <input type="number" value={impactForm[key] ?? ''} onChange={e => setImpactForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))} style={{ width: '100%', fontSize: 12, padding: '5px 7px', border: '1px solid var(--border-light)', borderRadius: 5, background: 'var(--bg-base)', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Données bénévoles</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { key: 'pctBenevoleSatisfait', label: 'Satisfaits (%)' },
                  { key: 'pctBenevoleTresSatisfait', label: 'Très satisfaits (%)' },
                  { key: 'pctBenevolesNouvellesCompet', label: 'Nouvelles compétences (%)' },
                  { key: 'pctBenevolesParlePoliti', label: 'Parlent + de politique (%)' },
                  { key: 'ageMoyenBenevoles', label: 'Âge moyen' },
                  { key: 'pctNouvellesRecru', label: 'Nouvelles recrues (%)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <input type="number" value={impactForm[key] ?? ''} onChange={e => setImpactForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))} style={{ width: '100%', fontSize: 12, padding: '5px 7px', border: '1px solid var(--border-light)', borderRadius: 5, background: 'var(--bg-base)', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Notes libres</label>
                <textarea value={impactForm.notes || ''} onChange={e => setImpactForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: '100%', fontSize: 12, padding: '6px 8px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'var(--bg-base)', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="chip" style={{ border: 'none', fontSize: 11 }} onClick={() => setImpactForm(null)}>Annuler</button>
                <button className="btn-primary" style={{ fontSize: 11, padding: '6px 14px' }} disabled={impactSaving} onClick={saveImpactForm}>
                  {impactSaving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {cycleStudy && !impactForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-base)' }}>{cycleStudy.typeAction} — {cycleStudy.cycle}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saisi par {cycleStudy.createdBy}</div>
                </div>
                {(isAdmin || isBureau) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="chip" style={{ border: 'none', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => openImpactForm(cycleStudy)}><Edit2 size={10} />Modifier</button>
                    <button className="chip" style={{ border: 'none', fontSize: 10, color: '#e63946', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleDeleteImpactStudy(cycleStudy.id)}><Trash2 size={10} />Supprimer</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {(cycleStudy.pctApprecie != null || cycleStudy.pctTresApprecie != null) && (
                  <div className="sc">
                    <SectionTitle icon={Award}>Satisfaction élèves</SectionTitle>
                    {cycleStudy.pctApprecie != null && <BarRow label="Ont apprécié" value={cycleStudy.pctApprecie} max={100} color="#7c3aed" suffix="%" small />}
                    {cycleStudy.pctTresApprecie != null && <BarRow label="Très apprécié" value={cycleStudy.pctTresApprecie} max={100} color="#1a56db" suffix="%" small />}
                    {cycleStudy.pctEmballeInitial != null && (
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 6, padding: '6px 10px' }}>
                        Emballé en séance 1 : <strong>{cycleStudy.pctEmballeInitial}%</strong>
                        {cycleStudy.pctApprecie != null && (
                          <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 700 }}>→ +{Math.round(cycleStudy.pctApprecie - cycleStudy.pctEmballeInitial)} pts de conversion</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {(cycleStudy.deltaConnaissanceDepute != null || cycleStudy.deltaVoteIntent != null) && (
                  <div className="sc">
                    <SectionTitle icon={TrendingUp}>Progression avant → après</SectionTitle>
                    {[
                      { key: 'deltaConnaissanceDepute', label: 'Connaissance député' },
                      { key: 'deltaConnaissanceAN',     label: 'Comprend Assemblée/Sénat' },
                      { key: 'deltaVoteIntent',         label: 'Intention de voter' },
                      { key: 'deltaEngagement',         label: 'Engagement asso/parti' },
                    ].filter(({ key }) => cycleStudy[key] != null).map(({ key, label }) => {
                      const delta = cycleStudy[key];
                      const isPos = delta >= 0;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-base)' }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isPos ? '#16a34a' : '#e63946', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {isPos ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                            {isPos ? '+' : ''}{delta}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(cycleStudy.pctBenevoleSatisfait != null || cycleStudy.ageMoyenBenevoles != null) && (
                  <div className="sc">
                    <SectionTitle icon={Users}>Bénévoles</SectionTitle>
                    {cycleStudy.pctBenevoleSatisfait != null && <BarRow label="Satisfaits" value={cycleStudy.pctBenevoleSatisfait} max={100} color="#0891b2" suffix="%" small />}
                    {cycleStudy.pctBenevoleTresSatisfait != null && <BarRow label="Très satisfaits" value={cycleStudy.pctBenevoleTresSatisfait} max={100} color="#1a56db" suffix="%" small />}
                    {cycleStudy.pctBenevolesNouvellesCompet != null && <BarRow label="Nouvelles compétences" value={cycleStudy.pctBenevolesNouvellesCompet} max={100} color="#7c3aed" suffix="%" small />}
                    {cycleStudy.pctBenevolesParlePoliti != null && <BarRow label="Parlent + de politique" value={cycleStudy.pctBenevolesParlePoliti} max={100} color="#d97706" suffix="%" small />}
                    <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {cycleStudy.ageMoyenBenevoles != null && <div style={{ fontSize: 11 }}>Âge moyen : <strong>{cycleStudy.ageMoyenBenevoles} ans</strong></div>}
                      {cycleStudy.pctNouvellesRecru != null && <div style={{ fontSize: 11 }}>Nouvelles recrues : <strong>{cycleStudy.pctNouvellesRecru}%</strong></div>}
                    </div>
                  </div>
                )}
              </div>
              {cycleStudy.notes && (
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 6, padding: '8px 12px' }}>
                  {cycleStudy.notes}
                </div>
              )}
            </div>
          )}

          {!cycleStudy && !impactForm && activeCycle !== 'Toutes' && (
            <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Aucune étude d'impact saisie pour ce cycle.</div>
              {(isAdmin || isBureau) && (
                <button className="btn-primary" style={{ fontSize: 11, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => openImpactForm()}>
                  <Plus size={11} />Saisir les données du rapport
                </button>
              )}
            </div>
          )}

          {activeCycle === 'Toutes' && impactStudies.length > 0 && (
            <div className="sc">
              <SectionTitle icon={FileText}>Toutes les études d'impact</SectionTitle>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                      {['Cycle', 'Type', 'Bénéficiaires', 'Ateliers', 'Établiss.', 'Apprécié', 'Connais. député', 'Engagement'].map(h => (
                        <th key={h} style={{ textAlign: ['Cycle', 'Type'].includes(h) ? 'left' : 'center', padding: '6px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {impactStudies.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{s.cycle}</td>
                        <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{s.typeAction}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{s.nbBeneficiaires || '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{s.nbAteliers || '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>{s.nbEtablissements || '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: s.pctApprecie != null ? '#1a56db' : 'var(--text-muted)', fontWeight: s.pctApprecie != null ? 700 : 400 }}>{s.pctApprecie != null ? `${s.pctApprecie}%` : '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: s.deltaConnaissanceDepute != null ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{s.deltaConnaissanceDepute != null ? `+${s.deltaConnaissanceDepute}%` : '—'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: s.deltaEngagement != null ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{s.deltaEngagement != null ? `+${s.deltaEngagement}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Analytics;
