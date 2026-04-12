// src/components/ui/LoginLoader.jsx
// Écran de chargement post-login.
// Affiché une seule fois après la première connexion réussie.
// Durée : 2.5s visible → 0.9s fondu (blur + scale + opacité) → onDone().
import React, { useEffect, useRef } from 'react';
import '../../styles/login-loader.css';

// Halos : true = attraction vers le curseur, false = répulsion
const HALOS = [
  { cls: 'b1', light: false },
  { cls: 'b2', light: false },
  { cls: 'r1', light: false },
  { cls: 'r2', light: false },
  { cls: 'l1', light: true  },
  { cls: 'l2', light: true  },
];

export default function LoginLoader({ onDone }) {
  const rootRef  = useRef(null);
  const halosRef = useRef([]);

  // ── Interaction souris : attraction / répulsion ──────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      const mx = e.clientX;
      const my = e.clientY;
      halosRef.current.forEach(({ el, light }) => {
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

  // ── Minuterie : 2.5s + fondu 0.9s → onDone ──────────────────────────────
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      const el = rootRef.current;
      if (!el) { onDone?.(); return; }
      el.style.transition = 'opacity 0.9s ease, transform 0.9s cubic-bezier(.4,0,.2,1), filter 0.9s ease';
      el.style.opacity   = '0';
      el.style.filter    = 'blur(12px)';
      el.style.transform = 'scale(1.05)';
    }, 2500);

    const doneTimer = setTimeout(() => {
      onDone?.();
    }, 3400);

    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className="ll-root" ref={rootRef}>
      {/* Fond dégradé animé */}
      <div className="ll-bg" />

      {/* Glow central pulsé */}
      <div className="ll-glow" />

      {/* Halos flottants */}
      <div className="ll-halos">
        {HALOS.map(({ cls, light }, i) => (
          <div
            key={cls}
            className={`ll-hw ${cls}`}
            ref={el => { halosRef.current[i] = { el, light }; }}
          >
            <div className="ll-halo" />
          </div>
        ))}
      </div>

      {/* Logo + texte */}
      <div className="ll-content">
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
