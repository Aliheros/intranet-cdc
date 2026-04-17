// src/components/tutorial/TutorialOverlay.jsx
// Tour spotlight interactif : met en surbrillance les vrais éléments de l'UI
// Les étapes sont dans tutorialSteps.js — c'est là qu'il faut les modifier.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';
import { TOUR_STEPS } from './tutorialSteps';

// ─── CONSTANTES LAYOUT ────────────────────────────────────────────────────────
const PADDING   = 10;  // px autour de l'élément spotlighté
const TOOLTIP_W = 380; // largeur du tooltip

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
const TutorialOverlay = ({ onComplete, onSkip, handleNav }) => {
  const [stepIdx, setStepIdx]   = useState(0);
  const [rect, setRect]         = useState(null);    // DOMRect de la cible
  const [tooltip, setTooltip]   = useState({ top: 0, left: 0, arrowSide: 'top' });
  const [visible, setVisible]   = useState(false);   // fade-in initial
  const [navigating, setNavigating] = useState(false);
  const measureRef = useRef(null);

  const step = TOUR_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === TOUR_STEPS.length - 1;

  // Fade-in au montage
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Mesure l'élément cible ──────────────────────────────────────────────────
  const measure = useCallback(() => {
    const s = TOUR_STEPS[stepIdx];
    if (!s.target) { setRect(null); return; }
    const el = document.querySelector(s.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [stepIdx]);

  // Re-mesure à chaque changement d'étape (avec délai pour la navigation)
  useEffect(() => {
    // Annule toute mesure en cours
    if (measureRef.current) clearTimeout(measureRef.current);
    measureRef.current = setTimeout(measure, navigating ? 450 : 200);
    return () => clearTimeout(measureRef.current);
  }, [stepIdx, navigating, measure]);

  // Re-mesure sur resize
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // ── Position du tooltip ────────────────────────────────────────────────────
  useEffect(() => {
    if (!rect) {
      // Centré si pas de cible
      setTooltip({ top: window.innerHeight / 2 - 120, left: (window.innerWidth - TOOLTIP_W) / 2, arrowSide: null });
      return;
    }
    const pad = step.padding ?? PADDING;
    const margin = 16; // espace entre spotlight et tooltip
    const TH = 220;    // hauteur estimée du tooltip

    const spotTop    = rect.top    - pad;
    const spotLeft   = rect.left   - pad;
    const spotRight  = rect.right  + pad;
    const spotBottom = rect.bottom + pad;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left, arrowSide;

    if (step.placement === 'right' && spotRight + TOOLTIP_W + margin < vw) {
      left      = spotRight + margin;
      top       = Math.max(12, Math.min(spotTop, vh - TH - 12));
      arrowSide = 'left';
    } else if (step.placement === 'left' && spotLeft - TOOLTIP_W - margin > 0) {
      left      = spotLeft - TOOLTIP_W - margin;
      top       = Math.max(12, Math.min(spotTop, vh - TH - 12));
      arrowSide = 'right';
    } else if (step.placement === 'top' && spotTop - TH - margin > 0) {
      top       = spotTop - TH - margin;
      left      = Math.max(12, Math.min(spotLeft, vw - TOOLTIP_W - 12));
      arrowSide = 'bottom';
    } else {
      // bottom (défaut)
      top       = spotBottom + margin;
      left      = Math.max(12, Math.min(spotLeft, vw - TOOLTIP_W - 12));
      arrowSide = 'top';
    }

    // Garde dans la fenêtre
    top  = Math.max(12, Math.min(top,  vh - TH - 12));
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));

    setTooltip({ top, left, arrowSide });
  }, [rect, step]);

  // ── Navigation au clavier ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') handleSkip();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Changement d'étape ────────────────────────────────────────────────────
  const goTo = (idx) => {
    const target = TOUR_STEPS[idx];
    if (target?.navigate && handleNav) {
      setNavigating(true);
      handleNav(target.navigate.page, target.navigate.subPage || null);
      setTimeout(() => setNavigating(false), 500);
    }
    setStepIdx(idx);
  };

  const goNext = () => {
    if (isLast) { handleComplete(); return; }
    goTo(stepIdx + 1);
  };

  const goPrev = () => {
    if (!isFirst) goTo(stepIdx - 1);
  };

  const handleComplete = () => {
    setVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setVisible(false);
    setTimeout(onSkip, 300);
  };

  // ── Styles spotlight ──────────────────────────────────────────────────────
  const pad = step.padding ?? PADDING;

  const spotlightStyle = rect ? {
    position: 'fixed',
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
    borderRadius: 8,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
    zIndex: 9800,
    pointerEvents: 'none',
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    outline: '2px solid rgba(255,255,255,0.25)',
    outlineOffset: 2,
  } : {
    // Pas de cible : overlay plein écran semi-transparent
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    zIndex: 9800,
    pointerEvents: 'none',
  };

  // Arrow du tooltip (styles dynamiques pour les 4 directions)
  const arrowBase = { position: 'absolute', width: 0, height: 0 };
  const arrows = {
    top:    { ...arrowBase, bottom: -8, left: 20, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid var(--bg-surface)' },
    bottom: { ...arrowBase, top: -8,   left: 20, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid var(--bg-surface)' },
    left:   { ...arrowBase, right: -8, top: 20,  borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid var(--bg-surface)' },
    right:  { ...arrowBase, left: -8,  top: 20,  borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--bg-surface)' },
  };

  return (
    <div className="tutorial-overlay">
      {/* Backdrop (cliquable pour skip) — uniquement si pas de spotlight */}
      {!rect && (
        <div
          className="tutorial-overlay-backdrop"
          onClick={handleSkip}
        />
      )}

      {/* Spotlight */}
      <div style={spotlightStyle} />

      {/* Tooltip */}
      <div
        className="tutorial-tooltip"
        style={{
          top:   tooltip.top,
          left:  tooltip.left,
          width: TOOLTIP_W,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Flèche directionnelle */}
        {tooltip.arrowSide && <div style={arrows[tooltip.arrowSide]} />}

        {/* Header */}
        <div className="tutorial-tooltip-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="tutorial-tooltip-icon">
              <BookOpen size={14} strokeWidth={2} color="#fff" />
            </div>
            <div className="tutorial-tooltip-title">
              {step.title}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="tutorial-tooltip-close"
            title="Quitter le tutoriel"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Corps */}
        <p className="tutorial-tooltip-body">
          {step.body}
        </p>

        {/* Barre de progression */}
        <div className="tutorial-tooltip-progress">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              className={`tutorial-tooltip-progress-dot ${i <= stepIdx ? 'active' : ''}`}
              style={{
                flex: i === stepIdx ? 2 : 1,
                opacity: i > stepIdx ? 0.4 : 1,
              }}
            />
          ))}
          <span className="tutorial-tooltip-progress-text">
            {stepIdx + 1}/{TOUR_STEPS.length}
          </span>
        </div>

        {/* Footer boutons */}
        <div className="tutorial-tooltip-footer">
          <button
            onClick={handleSkip}
            className="tutorial-tooltip-skip"
          >
            Passer le tutoriel
          </button>
          <div className="tutorial-tooltip-nav">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="tutorial-tooltip-btn-prev"
              >
                <ChevronLeft size={14} strokeWidth={2} /> Préc.
              </button>
            )}
            <button
              onClick={goNext}
              className="tutorial-tooltip-btn-next"
            >
              {isLast ? 'Terminer' : (<>Suivant <ChevronRight size={14} strokeWidth={2} /></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;