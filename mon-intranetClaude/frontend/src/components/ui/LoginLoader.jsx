// src/components/ui/LoginLoader.jsx
// Écran de chargement post-login — disparaît vite (0.8s) à t=2.5s.
// La transition de couleurs est assurée par AppDarkOverlay dans App.jsx.
import React, { useEffect, useRef } from 'react';
import '../../styles/login-loader.css';

const HALOS = [
  { cls: 'b1', light: false },
  { cls: 'b2', light: false },
  { cls: 'r1', light: false },
  { cls: 'r2', light: false },
];

export default function LoginLoader({ onDone, fromLogin = false }) {
  const rootRef  = useRef(null);
  const haloEls  = useRef([]);

  // ── Interaction souris ───────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      haloEls.current.forEach(({ el, light }) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = (rect.left + rect.width  / 2) - e.clientX;
        const dy = (rect.top  + rect.height / 2) - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 600;
        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          const mx = light ? -(dx / dist) * force * 150 :  (dx / dist) * force * 150;
          const my = light ? -(dy / dist) * force * 150 :  (dy / dist) * force * 150;
          el.style.transform = `translate(${mx}px, ${my}px)`;
        } else {
          el.style.transform = 'translate(0px, 0px)';
        }
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // ── Fade rapide à t=2.5s (opacity + blur + scale) ───────────────────────
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      const el = rootRef.current;
      if (!el) { onDone?.(); return; }
      el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(.4,0,.2,1), filter 0.8s ease';
      el.style.opacity   = '0';
      el.style.filter    = 'blur(10px)';
      el.style.transform = 'scale(1.05)';
    }, 2500);
    const doneTimer = setTimeout(() => onDone?.(), 3300);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className="ll-root" ref={rootRef}>
      <div className="ll-bg" />
      <div className="ll-glow" />
      <div className="ll-halos">
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
      <div className="ll-content">
        <img
          src="/logoCDC.png"
          alt="Cité des Chances"
          className="ll-logo"
          style={{
            width: 80, height: 80,
            ...(fromLogin ? {
              // Vient du login : logo déjà visible à la même taille, juste la flottaison
              opacity: 1,
              animation: 'll-float-logo 4s ease-in-out infinite',
            } : {}),
          }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="ll-text">Chargement</div>
        <div className="ll-progress-track">
          <div className="ll-progress-bar" />
        </div>
      </div>
    </div>
  );
}
