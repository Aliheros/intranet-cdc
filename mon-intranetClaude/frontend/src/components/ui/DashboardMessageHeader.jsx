// DashboardMessageHeader.jsx
// Header rotatif du Dashboard : messages système + messages personnalisés admin
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { useDataContext } from '../../contexts/DataContext';
import api from '../../api/apiClient';

// ── Constantes ────────────────────────────────────────────────────────────────
const MAX_SEQUENCE  = 10;   // messages max visibles dans la séquence
const FADE_MS       = 450;  // durée du fondu (ms)
const PAUSE_MS      = 2200; // pause après le dernier message avant relance

/** Durée d'affichage en ms selon la longueur du texte */
function getDuration(text) {
  return Math.max(6000, text.length * 130);
}

/** Score de spécificité du ciblage (même règle que le backend) */
function specificityScore(msg) {
  let s = 0;
  if (msg.cibleUsers?.length)   s += 60;
  if (msg.ciblePoles?.length || msg.cibleProjets?.length) s += 40;
  if (msg.cibleRoles?.length)   s += 30;
  if (msg.cibleStatuts?.length) s += 20;
  if (msg.cibleGenres?.length)  s += 15;
  if (msg.cibleAgeMin != null || msg.cibleAgeMax != null) s += 10;
  return s;
}

/** Calcule l'âge à partir d'une date (string "YYYY-MM-DD" ou "DD/MM/YYYY") */
function calcAge(dateNaissance) {
  if (!dateNaissance) return null;
  const parts = dateNaissance.includes('/') ? dateNaissance.split('/').reverse() : dateNaissance.split('-');
  const birth = new Date(parts.join('-'));
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

/** Vérifie si un message est visible pour l'utilisateur courant */
function matchesUser(msg, user) {
  const age = calcAge(user.dateNaissance);
  return [
    !msg.cibleUsers?.length    || msg.cibleUsers.includes(user.nom),
    !msg.ciblePoles?.length    || msg.ciblePoles.includes(user.pole),
    !msg.cibleProjets?.length  || msg.cibleProjets.some(p => (user.projets || []).includes(p)),
    !msg.cibleRoles?.length    || msg.cibleRoles.includes(user.role),
    !msg.cibleGenres?.length   || msg.cibleGenres.includes(user.genre || ''),
    !msg.cibleStatuts?.length  || msg.cibleStatuts.includes(user.statut || 'Actif'),
    (msg.cibleAgeMin == null && msg.cibleAgeMax == null) || (
      age != null &&
      (msg.cibleAgeMin == null || age >= msg.cibleAgeMin) &&
      (msg.cibleAgeMax == null || age <= msg.cibleAgeMax)
    ),
  ].every(Boolean);
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function DashboardMessageHeader() {
  const { currentUser }    = useAuth();
  const { freshLogin, darkMode } = useAppContext();
  const { directory }      = useDataContext();

  const [rawMessages, setRawMessages] = useState([]);
  const [idx, setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  // Profil complet de l'utilisateur courant (avec genre, dateNaissance, etc.)
  const fullUser = useMemo(
    () => directory.find(u => u.id === currentUser?.id) || currentUser || {},
    [directory, currentUser]
  );

  // Récupération des messages depuis l'API
  useEffect(() => {
    api.get('/dashboard-messages').then(setRawMessages).catch(() => {});
  }, []);

  // Construction de la séquence finale pour cet utilisateur
  const sequence = useMemo(() => {
    const firstName = (fullUser.nom || '').split(' ')[0] || 'toi';

    // Messages système — toujours en premier, non modifiables
    const system = [
      { id: 'sys_bonjour',  contenu: `Bonjour, ${firstName} 👋`, _system: true },
      { id: 'sys_bienvenue', contenu: 'Bienvenue !',              _system: true },
    ];

    // Messages personnalisés filtrés pour cet utilisateur, triés par spécificité
    const custom = rawMessages
      .filter(m => matchesUser(m, fullUser))
      .sort((a, b) => specificityScore(b) - specificityScore(a) || b.id - a.id)
      .slice(0, MAX_SEQUENCE - system.length);

    return [...system, ...custom];
  }, [rawMessages, fullUser]);

  // Machine à états de l'animation
  const timerRef = useRef(null);

  useEffect(() => {
    if (sequence.length <= 1) return;
    clearTimeout(timerRef.current);

    const current = sequence[idx];
    const duration = getDuration(current.contenu);

    timerRef.current = setTimeout(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        const next = (idx + 1) % sequence.length;
        const pause = next === 0 ? PAUSE_MS : 0;
        setTimeout(() => {
          setIdx(next);
          setVisible(true);
        }, pause);
      }, FADE_MS);
    }, duration);

    return () => clearTimeout(timerRef.current);
  }, [idx, sequence]);

  if (!currentUser) return null;

  const current = sequence[idx] || sequence[0];

  // ── Thèmes clair / sombre ────────────────────────────────────────────────────
  const theme = darkMode ? {
    // fond aurora : dégradé multi-stops animé
    background:    'linear-gradient(135deg, rgba(6,14,50,0.98) 0%, rgba(20,8,65,0.96) 30%, rgba(8,28,75,0.97) 55%, rgba(30,6,55,0.95) 78%, rgba(6,18,60,0.98) 100%)',
    borderBottom:  '1px solid rgba(100,140,255,0.22)',
    // orbes flottantes
    orb1: 'radial-gradient(ellipse, rgba(80,110,255,0.28) 0%, transparent 65%)',
    orb2: 'radial-gradient(ellipse, rgba(140,60,230,0.22) 0%, transparent 60%)',
    orb3: 'radial-gradient(ellipse, rgba(30,160,220,0.16) 0%, transparent 60%)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(160,180,255,0.07) 50%, transparent 100%)',
    iconBg:        'rgba(255,255,255,0.10)',
    iconBorder:    '1px solid rgba(255,255,255,0.16)',
    iconShadow:    'inset 0 1px 0 rgba(255,255,255,0.12)',
    iconCenter:    'rgba(255,255,255,0.85)',
    iconBranch:    'rgba(255,255,255,0.60)',
    iconDiag:      'rgba(255,255,255,0.35)',
    eyebrow:       'rgba(160,185,255,0.65)',
    message:       '#fff',
    dotActive:     'rgba(255,255,255,0.85)',
    dotInactive:   'rgba(255,255,255,0.25)',
  } : {
    background:    'linear-gradient(135deg, rgba(235,242,255,0.97) 0%, rgba(220,232,255,0.95) 55%, rgba(230,245,255,0.93) 100%)',
    borderBottom:  '1px solid rgba(100,140,255,0.20)',
    orb1: 'radial-gradient(ellipse, rgba(100,140,255,0.18) 0%, transparent 65%)',
    orb2: 'radial-gradient(ellipse, rgba(120,80,230,0.12) 0%, transparent 60%)',
    orb3: 'radial-gradient(ellipse, rgba(60,180,230,0.10) 0%, transparent 60%)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
    iconBg:        'rgba(60,90,220,0.10)',
    iconBorder:    '1px solid rgba(60,90,220,0.22)',
    iconShadow:    'inset 0 1px 0 rgba(255,255,255,0.60)',
    iconCenter:    'rgba(30,60,180,0.90)',
    iconBranch:    'rgba(30,60,180,0.55)',
    iconDiag:      'rgba(30,60,180,0.28)',
    eyebrow:       'rgba(60,100,200,0.70)',
    message:       '#0f1e5a',
    dotActive:     'rgba(40,80,200,0.80)',
    dotInactive:   'rgba(40,80,200,0.22)',
  };

  return (
    <div
      className="dmh-aurora"
      style={{
        margin: '-28px -44px 28px',
        padding: '22px 44px 20px',
        background: theme.background,
        borderBottom: freshLogin ? '1px solid transparent' : theme.borderBottom,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Overlay de transition post-login : part des couleurs du loader, s'efface vers le thème */}
      {freshLogin && (
        <div className="dmh-loader-overlay" style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }} />
      )}

      {/* Orbe 1 — grand, coin droit */}
      <div className="dmh-orb-1" style={{
        position: 'absolute', top: -50, right: 80,
        width: 260, height: 130,
        background: theme.orb1,
        pointerEvents: 'none',
      }} />
      {/* Orbe 2 — gauche bas */}
      <div className="dmh-orb-2" style={{
        position: 'absolute', bottom: -40, left: '35%',
        width: 200, height: 110,
        background: theme.orb2,
        pointerEvents: 'none',
      }} />
      {/* Orbe 3 — milieu haut */}
      <div className="dmh-orb-3" style={{
        position: 'absolute', top: -20, left: '55%',
        width: 170, height: 90,
        background: theme.orb3,
        pointerEvents: 'none',
      }} />
      {/* Shimmer sweep */}
      <div className="dmh-shimmer-line" style={{
        position: 'absolute', top: 0, left: 0,
        width: '35%', height: '100%',
        background: theme.shimmer,
        pointerEvents: 'none',
      }} />

      {/* Icône CDC */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: theme.iconBg,
        border: theme.iconBorder,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: theme.iconShadow,
        position: 'relative', zIndex: 11,
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill={theme.iconCenter}/>
          <line x1="10" y1="2" x2="10" y2="6"  stroke={theme.iconBranch} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="10" y1="14" x2="10" y2="18" stroke={theme.iconBranch} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2"  y1="10" x2="6"  y2="10" stroke={theme.iconBranch} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="14" y1="10" x2="18" y2="10" stroke={theme.iconBranch} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4.1"  y1="4.1"  x2="6.9"  y2="6.9"  stroke={theme.iconDiag} strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="13.1" y1="13.1" x2="15.9" y2="15.9" stroke={theme.iconDiag} strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="15.9" y1="4.1"  x2="13.1" y2="6.9"  stroke={theme.iconDiag} strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="6.9"  y1="13.1" x2="4.1"  y2="15.9" stroke={theme.iconDiag} strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Texte */}
      <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 11 }}>
        <div
          className={freshLogin ? (darkMode ? 'dmh-eyebrow-dark-fresh' : 'dmh-eyebrow-light-fresh') : ''}
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: freshLogin ? undefined : theme.eyebrow,
            lineHeight: 1, marginBottom: 5,
          }}
        >
          Cité des Chances
        </div>

        {/* Message animé */}
        <div
          className={freshLogin ? (darkMode ? 'dmh-msg-dark-fresh' : 'dmh-msg-light-fresh') : ''}
          style={{
            fontSize: 17, fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: freshLogin ? undefined : theme.message,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-4px)',
            transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
            minHeight: '1.3em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '60vw',
          }}
        >
          {current?.contenu}
        </div>
      </div>

      {/* Indicateurs de position (dots) */}
      {sequence.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          marginLeft: 'auto', position: 'relative', zIndex: 11,
        }}>
          {sequence.map((_, i) => (
            <button
              key={i}
              onClick={() => { clearTimeout(timerRef.current); setVisible(false); setTimeout(() => { setIdx(i); setVisible(true); }, FADE_MS); }}
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx ? theme.dotActive : theme.dotInactive,
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              title={`Message ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
