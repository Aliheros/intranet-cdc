// src/pages/Planning.jsx — Calendrier intelligent complet
import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const COLORS = {
  Action:    '#16a34a',
  Événement: '#1a56db',
  Séance:    '#0891b2',
  Tâche:     '#f59e0b',
  Retard:    '#e63946',
};

const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const fmt = (d) => d.toISOString().split('T')[0];
const todayStr = fmt(new Date());

const getMondayOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dimanche
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const Planning = () => {
  const { currentUser } = useAuth();
  const { handleNav, setHighlightedActionId, setActiveEventId, setHighlightedEventId, setHighlightedTaskId } = useAppContext();
  const navigate = handleNav;
  const { actions, evenements, tasks, directory, handleCalendarUpdateAction, handleCalendarUpdateEvent, handleCalendarUpdateTask, getThreshold } = useDataContext();
  const [view, setView]           = useState('Mois');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType]   = useState('Tous');
  const [filterUser, setFilterUser]   = useState('Tous');

  const planningAlertDays = getThreshold('planningAlertDays') ?? 1;

  // ─── CONSTRUCTION DES ITEMS ───────────────────────────────────────────────

  const buildItems = useCallback(() => {
    const items = [];

    // Index des événements liés à une action (actionId → événement)
    const linkedEventByActionId = {};
    evenements
      .filter(e => !e.isArchived && e.actionId)
      .forEach(e => { linkedEventByActionId[e.actionId] = e; });

    // Ensemble des actionId déjà couverts par un événement lié
    const coveredActionIds = new Set(Object.keys(linkedEventByActionId).map(Number));

    // ── Actions ──────────────────────────────────────────────────────────────
    actions
      .filter(a => !a.isArchived)
      .forEach(a => {
        if (!a.date_debut) return;
        const isOverdue     = a.statut !== 'Terminée' && a.statut !== 'Annulée' && a.date_debut < todayStr;
        const noResponsable = !a.responsables || a.responsables.length === 0;
        let alert = null;
        if (noResponsable) alert = 'Aucun responsable assigné';
        else if (isOverdue) alert = 'Date dépassée';

        const linkedEvent = linkedEventByActionId[a.id] || null;

        items.push({
          id: `action-${a.id}`, entityId: a.id, type: 'Action',
          date: a.date_debut, dateFin: a.date_fin || null,
          // Si un événement est lié, fusionner les titres
          title: linkedEvent
            ? `${a.etablissement || a.type} · ${linkedEvent.titre}`
            : (a.etablissement || a.type),
          color: isOverdue ? COLORS.Retard : COLORS.Action,
          // Indique la fusion dans l'affichage
          hasLinkedEvent: !!linkedEvent,
          linkedEventId: linkedEvent?.id,
          isOverdue, alert, raw: a,
        });
      });

    // ── Événements sans action liée (standalone) ─────────────────────────────
    evenements
      .filter(e =>
        !e.isArchived &&
        !coveredActionIds.has(e.id) &&      // pas déjà fusionné
        !e.actionId                          // vraiment standalone
      )
      .forEach(e => {
        if (e.date) {
          items.push({
            id: `event-${e.id}`, entityId: e.id, type: 'Événement',
            date: e.date, title: e.titre,
            color: COLORS.Événement, raw: e,
          });
        }
      });

    // ── Séances (tous les événements, liés ou non) ───────────────────────────
    const alertDays = planningAlertDays;
    const jX = new Date(); jX.setDate(jX.getDate() + alertDays);
    const jXstr = fmt(jX);

    evenements
      .filter(e => !e.isArchived)
      .forEach(e => {
        (e.seances || []).forEach(s => {
          if (!s.date) return;
          const noInscrits = !s.inscrits || s.inscrits.length === 0;
          const isJX        = s.date === jXstr;
          const isCancelled = !!s.annulee;
          items.push({
            id: `seance-${e.id}-${s.id}`, entityId: e.id, seanceId: s.id, type: 'Séance',
            date: s.date, title: isCancelled ? `✕ ${s.libelle || e.titre}` : (s.libelle || e.titre),
            color: isCancelled ? '#e63946' : COLORS.Séance, raw: s, parentEvent: e,
            isCancelled,
            alert: isCancelled ? `Annulée${s.commentaireAnnulation ? ` — ${s.commentaireAnnulation}` : ''}` : ((noInscrits && isJX) ? `Séance dans ${alertDays}j sans inscrits (J-${alertDays})` : null),
          });
        });
      });

    // ── Tâches avec deadline ─────────────────────────────────────────────────
    tasks
      .filter(t => t.deadline)
      .forEach(t => {
        const isOverdue = t.status !== 'done' && t.status !== 'Terminé' && t.deadline < todayStr;
        items.push({
          id: `task-${t.id}`, entityId: t.id, type: 'Tâche',
          date: t.deadline, title: t.text,
          color: isOverdue ? COLORS.Retard : COLORS.Tâche,
          isOverdue, alert: isOverdue ? 'Deadline dépassée' : null,
          raw: t, assignees: t.assignees || [],
        });
      });

    return items;
  }, [actions, evenements, tasks]);

  // ─── FILTRES ──────────────────────────────────────────────────────────────

  const applyFilters = (items) => items.filter(item => {
    if (filterType !== 'Tous') {
      // Les items fusionnés (Action + Événement) matchent les deux filtres
      const matchAction     = item.type === 'Action';
      const matchEvenement  = item.type === 'Événement' || (item.type === 'Action' && item.hasLinkedEvent);
      if (filterType === 'Événement' && !matchEvenement) return false;
      if (filterType === 'Action'    && !matchAction)    return false;
      if (filterType !== 'Action' && filterType !== 'Événement' && item.type !== filterType) return false;
    }
    const userName = filterUser === '__me__' ? currentUser?.nom : (filterUser !== 'Tous' ? filterUser : null);
    if (userName) {
      if (item.type === 'Action' && !(item.raw.responsables || []).includes(userName)) return false;
      if (item.type === 'Séance' && !(item.raw.inscrits     || []).includes(userName)) return false;
      if (item.type === 'Tâche'  && !(item.assignees        || []).some(a => a.name === userName)) return false;
    }
    return true;
  });

  const allItems = applyFilters(buildItems());


  // ─── NAVIGATION ───────────────────────────────────────────────────────────

  const goNext = () => {
    if (view === 'Semaine') {
      const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };
  const goPrev = () => {
    if (view === 'Semaine') {
      const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };
  const goToday = () => setCurrentDate(new Date());

  const getHeaderLabel = () => {
    if (view === 'Agenda') return 'Agenda à venir';
    if (view === 'Semaine') {
      const mon = getMondayOf(currentDate);
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      return `${mon.getDate()} – ${sun.getDate()} ${MONTH_NAMES[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  // ─── CLICK SUR UN ITEM ────────────────────────────────────────────────────

  const handleItemClick = (item) => {
    if (item.type === 'Action') {
      navigate('actions');
      setHighlightedActionId(item.entityId);
      setTimeout(() => setHighlightedActionId(null), 3000);
    } else if (item.type === 'Tâche') {
      const task = item.raw;
      if (!task?.space || !task?.id) return;
      // Vérifie que la tâche existe toujours dans le store
      const exists = tasks.some(t => t.id === task.id && t.space === task.space);
      if (!exists) return;
      const POLES = ["Relations Publiques","Ressources Humaines","Plaidoyer","Etudes","Développement Financier","Communication","Trésorerie"];
      const pageType = POLES.includes(task.space) ? 'pole' : 'projet';
      navigate(pageType, task.space);
      setHighlightedTaskId(task.id);
      setTimeout(() => setHighlightedTaskId(null), 3000);
    } else {
      navigate('coordination');
      setActiveEventId(item.entityId);
      setHighlightedEventId(item.entityId);
      setTimeout(() => setHighlightedEventId(null), 3000);
    }
  };

  // ─── RENDU D'UN ITEM (compact) ────────────────────────────────────────────

  const renderChip = (item, compact = false) => {
    // Item fusionné Action + Événement : double bordure colorée
    const isMerged = item.type === 'Action' && item.hasLinkedEvent;
    const borderStyle = isMerged
      ? `3px solid ${COLORS.Action}`
      : `3px solid ${item.color}`;
    const bgColor = isMerged ? COLORS.Action : item.color;

    return (
      <div
        key={item.id}
        onClick={() => handleItemClick(item)}
        title={item.alert || item.title}
        style={{
          fontSize: compact ? 9 : 10,
          background: item.isCancelled ? `${bgColor}0d` : `${bgColor}18`,
          borderLeft: borderStyle,
          borderRight: isMerged ? `3px solid ${COLORS.Événement}` : 'none',
          padding: compact ? '3px 5px' : '4px 7px',
          borderRadius: isMerged ? '4px' : '0 4px 4px 0',
          color: bgColor,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          userSelect: 'none',
          transition: 'transform 0.1s, background 0.1s',
          textDecoration: item.isCancelled ? 'line-through' : 'none',
          opacity: item.isCancelled ? 0.7 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${bgColor}30`; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${bgColor}18`; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {item.alert && <span style={{ fontSize: 9 }}>⚠</span>}
        {isMerged && <span style={{ fontSize: 8, opacity: 0.7 }}>⬡</span>}
        {item.title}
      </div>
    );
  };

  const DropCell = ({ dateStr, children, style = {} }) => (
    <div style={style}>{children}</div>
  );

  // ─── VUE MOIS ─────────────────────────────────────────────────────────────

  const renderMonth = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const firstDay  = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
    // eslint-disable-next-line no-unused-vars

    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
        {/* En-têtes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-alt)', borderBottom: '1px solid var(--border-light)' }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} style={{ minHeight: 110, borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-alt)', opacity: 0.3 }} />
          ))}
          {Array.from({ length: daysCount }).map((_, i) => {
            const dayNum  = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayItems = allItems.filter(it => it.date === dateStr);
            const isToday  = dateStr === todayStr;

            return (
              <DropCell
                key={dayNum}
                dateStr={dateStr}
                style={{ minHeight: 110, padding: '6px', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: isToday ? '#fff' : 'var(--text-dim)',
                  background: isToday ? '#e63946' : 'transparent',
                  width: 24, height: 24, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 5,
                }}>{dayNum}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dayItems.slice(0, 4).map(it => renderChip(it, true))}
                  {dayItems.length > 4 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, paddingLeft: 4 }}>+{dayItems.length - 4} autres</div>
                  )}
                </div>
              </DropCell>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── VUE SEMAINE ──────────────────────────────────────────────────────────

  const renderWeek = () => {
    const monday = getMondayOf(currentDate);
    const days   = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(d.getDate() + i); return d;
    });

    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
        {/* En-têtes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-alt)', borderBottom: '1px solid var(--border-light)' }}>
          {days.map(d => {
            const dateStr = fmt(d);
            const isToday = dateStr === todayStr;
            const dow = d.getDay();
            return (
              <div key={dateStr} style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {DAY_NAMES[dow === 0 ? 6 : dow - 1]}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: isToday ? '#fff' : 'var(--text-base)',
                  background: isToday ? '#e63946' : 'transparent',
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0',
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* Colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map(d => {
            const dateStr  = fmt(d);
            const dayItems = allItems.filter(it => it.date === dateStr);
            return (
              <DropCell
                key={dateStr}
                dateStr={dateStr}
                style={{ minHeight: 320, padding: '8px 6px', borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                {dayItems.map(it => renderChip(it))}
              </DropCell>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── VUE AGENDA ───────────────────────────────────────────────────────────

  const renderAgenda = () => {
    const upcoming = [...allItems]
      .filter(it => it.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const past = [...allItems]
      .filter(it => it.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10); // limiter les anciens

    if (upcoming.length === 0 && past.length === 0) {
      return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>Aucun élément pour les filtres sélectionnés.</div>;
    }

    const byDate = {};
    upcoming.forEach(it => { (byDate[it.date] ??= []).push(it); });

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {past.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>Passés récents</div>
            {past.map(it => (
              <div key={it.id} style={{ display: 'flex', gap: 16, marginBottom: 6, opacity: 0.55 }}>
                <div style={{ minWidth: 70, textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', paddingTop: 12 }}>
                  {it.date?.slice(8, 10)}/{it.date?.slice(5, 7)}
                </div>
                <div style={{ flex: 1 }}>
                  {renderChip(it)}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.entries(byDate).map(([date, items]) => {
          const d = new Date(date + 'T00:00:00');
          const dow = d.getDay();
          const isToday = date === todayStr;
          return (
            <div key={date} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ minWidth: 72, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {DAY_NAMES[dow === 0 ? 6 : dow - 1]}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: isToday ? '#e63946' : 'var(--text-base)', lineHeight: 1 }}>
                  {d.getDate()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: item.isCancelled ? `${item.color}07` : `${item.color}10`,
                      borderLeft: `4px solid ${item.color}`,
                      borderRadius: '0 8px 8px 0',
                      cursor: 'pointer',
                      opacity: item.isCancelled ? 0.75 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: item.color, textDecoration: item.isCancelled ? 'line-through' : 'none' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.type}{item.isCancelled && <span style={{ marginLeft: 6, color: '#dc2626', fontWeight: 700 }}>— Annulée</span>}
                      </div>
                    </div>
                    {item.alert && !item.isCancelled && <span title={item.alert} style={{ fontSize: 15, color: '#f59e0b' }}>⚠</span>}
                    {item.isCancelled && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>✕</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── VUE TIMELINE (Gantt) ─────────────────────────────────────────────────

  const renderTimeline = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days  = Array.from({ length: daysCount }, (_, i) => i + 1);
    const curMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const timelineItems = allItems.filter(it => it.date?.substring(0, 7) === curMonthStr);

    if (timelineItems.length === 0) {
      return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>Aucun élément ce mois-ci.</div>;
    }

    const CELL_W = 30;
    const ROW_H  = 46;

    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12, overflowX: 'auto' }}>
        {/* En-tête jours */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-alt)', position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{ minWidth: 190, padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderRight: '1px solid var(--border-light)' }}>
            Élément
          </div>
          {days.map(d => {
            const dStr = `${curMonthStr}-${String(d).padStart(2, '0')}`;
            const isToday = dStr === todayStr;
            const date = new Date(dStr + 'T00:00:00');
            const dow  = date.getDay();
            const isWE = dow === 0 || dow === 6;
            return (
              <div key={d} style={{
                minWidth: CELL_W, textAlign: 'center', padding: '6px 0', fontSize: 9,
                fontWeight: isToday ? 800 : 600,
                color: isToday ? '#e63946' : isWE ? 'var(--text-muted)' : 'var(--text-dim)',
                background: isWE ? 'rgba(0,0,0,0.03)' : 'transparent',
                borderRight: '1px solid var(--border-light)',
              }}>
                <div>{DAY_NAMES[dow === 0 ? 6 : dow - 1].slice(0, 1)}</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{d}</div>
              </div>
            );
          })}
        </div>

        {/* Lignes */}
        {timelineItems.map(item => {
          const startDay = parseInt(item.date?.split('-')[2] || '1');
          const endDay   = item.dateFin?.substring(0, 7) === curMonthStr
            ? parseInt(item.dateFin.split('-')[2])
            : startDay;
          const barStart = (startDay - 1) * CELL_W;
          const barLen   = Math.max(CELL_W, (endDay - startDay + 1) * CELL_W - 4);

          return (
            <div key={item.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', alignItems: 'center', minHeight: ROW_H }}>
              {/* Label */}
              <div
                onClick={() => handleItemClick(item)}
                style={{
                  minWidth: 190, maxWidth: 190, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600, color: item.color,
                  borderRight: '1px solid var(--border-light)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  cursor: 'pointer',
                }}
              >
                {item.alert && <span style={{ color: '#f59e0b', marginRight: 4 }}>⚠</span>}
                {item.title}
              </div>

              {/* Grille + barre */}
              <div style={{ position: 'relative', display: 'flex', flex: 1, height: ROW_H }}>
                {days.map(d => {
                  const dStr = `${curMonthStr}-${String(d).padStart(2, '0')}`;
                  const date = new Date(dStr + 'T00:00:00');
                  const isWE = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <DropCell
                      key={d}
                      dateStr={dStr}
                      style={{ minWidth: CELL_W, height: ROW_H, borderRight: '1px solid var(--border-light)', background: isWE ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                    />
                  );
                })}
                {/* Barre Gantt */}
                <div
                  title={item.title}
                  style={{
                    position: 'absolute',
                    left: barStart + 2,
                    width: barLen,
                    top: 8, height: 30,
                    background: `${item.color}25`,
                    border: `2px solid ${item.color}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    fontSize: 10, fontWeight: 700, color: item.color,
                    overflow: 'hidden', whiteSpace: 'nowrap',
                    userSelect: 'none',
                    zIndex: 1,
                  }}
                >
                  {item.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── ALERTES ──────────────────────────────────────────────────────────────

  const alertItems = allItems.filter(i => i.alert);

  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────────

  return (
    <>
      <div className="eyebrow">Vue globale</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Planning & Calendrier</div>
        {alertItems.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#d97706' }}>
            ⚠ {alertItems.length} alerte{alertItems.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* TOOLBAR STANDARDISÉE */}
      <div className="toolbar-wrap" style={{ marginBottom: 16 }} data-tour="planning-toolbar">

        {/* Groupe 1 : Vues */}
        <div className="toolbar-group" style={{ borderRight: '1px solid var(--border-light)', paddingRight: '12px' }}>
          {['Mois', 'Semaine', 'Agenda', 'Timeline'].map(v => (
            <button key={v} className={`chip ${view === v ? 'on' : ''}`} style={{ border: 'none' }} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>

        {/* Groupe 2 : Navigation date */}
        {view !== 'Agenda' && (
          <div className="toolbar-group" style={{ paddingLeft: '12px' }}>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={goToday}>Aujourd'hui</button>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={goPrev}>◀</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-base)', whiteSpace: 'nowrap' }}>{getHeaderLabel()}</span>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={goNext}>▶</button>
          </div>
        )}

        {/* Groupe 3 : Filtres (à droite) */}
        <div className="toolbar-group" style={{ marginLeft: 'auto', borderLeft: '1px solid var(--border-light)', paddingLeft: '12px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>Type&nbsp;:</span>
          <select className="form-select" style={{ width: 'auto', border: 'none', background: 'transparent', paddingLeft: 4 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            {['Tous', 'Action', 'Événement', 'Séance', 'Tâche'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>Membre&nbsp;:</span>
          <select className="form-select" style={{ width: 'auto', border: 'none', background: 'transparent', paddingLeft: 4 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="Tous">Tous</option>
            <option value="__me__">Mon agenda</option>
            {directory.filter(u => u.nom !== currentUser?.nom).map(u => (
              <option key={u.id} value={u.nom}>{u.nom}</option>
            ))}
          </select>
        </div>

      </div>

      {/* LÉGENDE */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Groupe : Types d'éléments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type :</span>
          <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS.Action }} />
            Action
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS.Événement }} />
            Événement
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS.Séance }} />
            Séance
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS.Tâche }} />
            Tâche
          </span>
        </div>
        {/* Séparateur */}
        <span style={{ width: 1, height: 20, background: 'var(--border-light)', flexShrink: 0, alignSelf: 'center' }} />
        {/* Groupe : Cas spéciaux */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spécial :</span>
          <span style={{ fontSize: 11, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 13, height: 13, background: `${COLORS.Action}20`, border: `2px solid ${COLORS.Action}`, borderRight: `2px solid ${COLORS.Événement}`, borderRadius: 3, flexShrink: 0 }} />
            Action + Évén. lié
          </span>
          <span style={{ fontSize: 11, color: COLORS.Retard, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS.Retard }} />
            En retard
          </span>
          <span style={{ fontSize: 11, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13 }}>⚠</span>
            Alerte J-{planningAlertDays}
          </span>
        </div>
      </div>

      {/* PANEL ALERTES */}
      {alertItems.length > 0 && (
        <div style={{ background: '#fef9ec', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠ Alertes actives</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {alertItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{ fontSize: 11, color: '#92400e', background: '#fde68a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                title={item.alert}
              >
                {item.title} — {item.alert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDRIER */}
      {(view === 'Mois' || view === 'Semaine') && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12 }}>
          <div style={{ minWidth: 560 }}>
            {view === 'Mois'    && renderMonth()}
            {view === 'Semaine' && renderWeek()}
          </div>
        </div>
      )}
      {view === 'Agenda'   && renderAgenda()}
      {view === 'Timeline' && renderTimeline()}
    </>
  );
};

export default Planning;
