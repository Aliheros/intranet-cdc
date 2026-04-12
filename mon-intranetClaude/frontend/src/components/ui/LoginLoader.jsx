// src/components/ui/LoginLoader.jsx
// Écran de chargement post-login.
//
// Séquence de transition (identique au prototype HTML) :
//   t=0      → loader visible : fond sombre animé + halos + logo
//   t=2500ms → contenu (logo, halos, glow) : fondu rapide 600ms
//   t=2500ms → fond sombre (ll-bg) : évaporation lente 2000ms
//              → les couleurs du dashboard apparaissent progressivement
//   t=4600ms → onDone() : loader retiré du DOM
import React, { useEffect, useRef } from 'react';
import '../../styles/login-loader.css';

// Halos : light=true → attraction vers curseur, light=false → répulsion
const HALOS = [
  { cls: 'b1', light: false },
  { cls: 'b2', light: false },
  { cls: 'r1', light: false },
  { cls: 'r2', light: false },
  { cls: 'l1', light: true  },
  { cls: 'l2', light: true  },
];

export default function LoginLoader({ onDone }) {
  const bgRef      = useRef(null);   // fond sombre → fade lent
  const contentRef = useRef(null);   // logo + texte → fade rapide
  const halosRef   = useRef(null);   // halos → fade rapide
  const glowRef    = useRef(null);   // glow → fade rapide
  const haloEls    = useRef([]);     // refs individuelles pour l'interaction souris

  // ── Interaction souris : attraction / répulsion ──────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      const mx = e.clientX;
      const my = e.clientY;
      haloEls.current.forEach(({ el, light }) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const hx = rect.left + rect.width  / 2;
        const hy = rect.top  + rect.height / 2;
        const dx = hx - mx;
        const dy = hy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 600;
        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          const moveX = light
            ? -(dx / dist) * force * 150   // attraction
            :  (dx / dist) * force * 150;  // répulsion
          const moveY = light
            ? -(dy / dist) * force * 150
            :  (dy / dist) * force * 150;
          el.style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
          el.style.transform = 'translate(0px, 0px)';
        }
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // ── Séquence de transition ────────────────────────────────────────────────
  useEffect(() => {
    // t=2500ms : fade rapide du contenu (logo, halos, glow)
    const fadeContent = setTimeout(() => {
      [contentRef, halosRef, glowRef].forEach(r => {
        if (!r.current) return;
        r.current.style.transition = 'opacity 0.6s ease';
        r.current.style.opacity = '0';
      });

      // Simultanément : fond sombre s'évapore lentement (2000ms)
      // → les couleurs du dashboard apparaissent progressivement en dessous
      if (bgRef.current) {
        bgRef.current.style.transition = 'opacity 2s ease-in-out';
        bgRef.current.style.opacity = '0';
      }
    }, 2500);

    // t=4600ms : loader retiré du DOM
    const done = setTimeout(() => onDone?.(), 4600);

    return () => { clearTimeout(fadeContent); clearTimeout(done); };
  }, [onDone]);

  return (
    // ll-root : fond transparent → le dashboard est visible en dessous
    // pendant l'évaporation du ll-bg
    <div className="ll-root">
      {/* Fond sombre animé — s'évapore lentement pour révéler le dashboard */}
      <div className="ll-bg" ref={bgRef} />

      {/* Glow central pulsé */}
      <div className="ll-glow" ref={glowRef} />

      {/* Halos flottants */}
      <div className="ll-halos" ref={halosRef}>
        {HALOS.map(({ cls, light }, i) => (
          <div
            key={cls}
            className={`ll-hw ${cls}`}
            ref={el => { haloEls.current[i] = { el, light }; }}
          >
            <div className="ll-halo" />
          </div>
        ))}
      </div>

      {/* Logo + texte */}
      <div className="ll-content" ref={contentRef}>
        <img
          src="/logoCDC.png"
          alt="Cité des Chances"
          className="ll-logo"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="ll-text">Chargement</div>
      </div>
    </div>
  );
}
