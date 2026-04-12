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
  return Math.max(4000, text.length * 88);
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
  const { freshLogin }     = useAppContext();
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

  return (
    <div
      className={freshLogin ? 'dash-stagger-1 dash-text-to-dark' : ''}
      style={{
        margin: '-28px -44px 28px',
        padding: '22px 44px 20px',
        background: 'linear-gradient(135deg, rgba(8,20,60,0.97) 0%, rgba(18,10,55,0.95) 55%, rgba(8,30,70,0.93) 100%)',
        borderBottom: '1px solid rgba(100,140,255,0.18)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Lueur décorative */}
      <div style={{
        position: 'absolute', top: -40, right: 100,
        width: 220, height: 100,
        background: 'radial-gradient(ellipse, rgba(80,100,255,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, left: '40%',
        width: 160, height: 80,
        background: 'radial-gradient(ellipse, rgba(120,60,200,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Icône CDC */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      }}>
        {/* Étoile stylisée CDC */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.85)"/>
          <line x1="10" y1="2" x2="10" y2="6"  stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="10" y1="14" x2="10" y2="18" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2"  y1="10" x2="6"  y2="10" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="14" y1="10" x2="18" y2="10" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4.1"  y1="4.1"  x2="6.9"  y2="6.9"  stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="13.1" y1="13.1" x2="15.9" y2="15.9" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="15.9" y1="4.1"  x2="13.1" y2="6.9"  stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="6.9"  y1="13.1" x2="4.1"  y2="15.9" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Texte */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(160,185,255,0.65)',
          lineHeight: 1, marginBottom: 5,
        }}>
          Cité des Chances
        </div>

        {/* Message animé */}
        <div style={{
          fontSize: 17, fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color: '#fff',
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
        }}>
          {current?.contenu}
        </div>
      </div>

      {/* Indicateurs de position (dots) */}
      {sequence.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          marginLeft: 'auto',
        }}>
          {sequence.map((_, i) => (
            <button
              key={i}
              onClick={() => { clearTimeout(timerRef.current); setVisible(false); setTimeout(() => { setIdx(i); setVisible(true); }, FADE_MS); }}
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
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
