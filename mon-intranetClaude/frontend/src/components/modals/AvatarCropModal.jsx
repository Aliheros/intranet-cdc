// src/components/modals/AvatarCropModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const STAGE_W = 320;
const STAGE_H = 300;
const CIRCLE_R = 120; // px, diameter 240

export default function AvatarCropModal({ imageSrc, onConfirm, onCancel, userName, poleColor }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [loaded, setLoaded] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const stageRef = useRef(null);

  // baseScale : la dimension courte de l'image remplit le cercle
  const baseScale = naturalSize.w && naturalSize.h
    ? (CIRCLE_R * 2) / Math.min(naturalSize.w, naturalSize.h)
    : 1;

  const displayScale = baseScale * zoom;
  const imgW = naturalSize.w * displayScale;
  const imgH = naturalSize.h * displayScale;

  // Centre de l'image = centre du stage
  const imgLeft = STAGE_W / 2 - imgW / 2 + offset.x;
  const imgTop  = STAGE_H / 2 - imgH / 2 + offset.y;

  const clamp = useCallback((ox, oy, scale) => {
    const sc = scale ?? zoom;
    const ds = baseScale * sc;
    const iw = naturalSize.w * ds;
    const ih = naturalSize.h * ds;
    const maxX = Math.max(0, (iw - CIRCLE_R * 2) / 2);
    const maxY = Math.max(0, (ih - CIRCLE_R * 2) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, [baseScale, naturalSize, zoom]);

  useEffect(() => {
    if (loaded) setOffset(prev => clamp(prev.x, prev.y));
  }, [zoom, loaded, clamp]);

  // Mouse drag
  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { cx: e.clientX, cy: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging.current || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.cx;
    const dy = e.clientY - dragStart.current.cy;
    setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy));
  }, [clamp]);
  const onMouseUp = () => { dragging.current = false; };

  // Touch drag
  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragging.current = true;
    dragStart.current = { cx: t.clientX, cy: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = useCallback((e) => {
    if (!dragging.current || !dragStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.cx;
    const dy = t.clientY - dragStart.current.cy;
    setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy));
  }, [clamp]);
  const onTouchEnd = () => { dragging.current = false; };

  // Attach non-passive touch listener to avoid passive violation
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); onTouchMove(e); };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [onTouchMove]);

  const handleImgLoad = (e) => {
    setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    setLoaded(true);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');

      // Crop source region
      const circleCenterX = STAGE_W / 2;
      const circleCenterY = STAGE_H / 2;
      const cropLeft = circleCenterX - CIRCLE_R;
      const cropTop  = circleCenterY - CIRCLE_R;
      const srcX = (cropLeft - imgLeft) / displayScale;
      const srcY = (cropTop  - imgTop)  / displayScale;
      const srcSize = (CIRCLE_R * 2) / displayScale;

      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 200, 200);
      canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.88);
    };
    img.src = imageSrc;
  };

  // Small preview initials fallback
  const initials = (userName || '?').trim().split(/\s+/).filter(Boolean)
    .map((w, i, arr) => (i === 0 || i === arr.length - 1) ? w[0] : null)
    .filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 7000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 22,
          width: 380,
          maxWidth: '95vw',
          boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-base)' }}>
              Photo de profil
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Déplacez l'image pour cadrer votre visage
            </div>
          </div>
          <button onClick={handleReset} title="Réinitialiser" style={{ background: 'var(--bg-alt)', border: '1px solid var(--border-light)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Stage */}
        <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div
            ref={stageRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              width: STAGE_W, height: STAGE_H,
              position: 'relative',
              overflow: 'hidden',
              cursor: dragging.current ? 'grabbing' : 'grab',
              borderRadius: 14,
              background: '#111',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {/* Image */}
            {imageSrc && (
              <img
                src={imageSrc}
                onLoad={handleImgLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  width: loaded ? imgW : 'auto',
                  height: loaded ? imgH : '100%',
                  left: loaded ? imgLeft : 0,
                  top: loaded ? imgTop : 0,
                  pointerEvents: 'none',
                  opacity: loaded ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}
              />
            )}

            {/* Dark overlay with circle cutout via SVG */}
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={STAGE_W} height={STAGE_H}
            >
              <defs>
                <mask id="hole-mask">
                  <rect width={STAGE_W} height={STAGE_H} fill="white" />
                  <circle cx={STAGE_W / 2} cy={STAGE_H / 2} r={CIRCLE_R} fill="black" />
                </mask>
              </defs>
              {/* Dark vignette outside circle */}
              <rect
                width={STAGE_W} height={STAGE_H}
                fill="rgba(0,0,0,0.58)"
                mask="url(#hole-mask)"
              />
              {/* Circle border */}
              <circle
                cx={STAGE_W / 2} cy={STAGE_H / 2} r={CIRCLE_R}
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </svg>

            {/* Label inside circle */}
            <div style={{
              position: 'absolute',
              bottom: STAGE_H / 2 - CIRCLE_R + 10,
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.05em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              CE QUE LES AUTRES VERRONT
            </div>
          </div>

          {/* Zoom slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: STAGE_W }}>
            <button
              onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(2)))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}
            >
              <ZoomOut size={15} />
            </button>
            <input
              type="range" min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#1a56db', cursor: 'pointer' }}
            />
            <button
              onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Aperçu miniature */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0 2px', width: STAGE_W }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Aperçu :</div>

            {/* 52px — taille modale / carte */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--border-light)',
                background: poleColor || '#0f2d5e',
                flexShrink: 0,
                position: 'relative',
              }}>
                {imageSrc && loaded && (
                  <img
                    src={imageSrc}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: imgW / (CIRCLE_R * 2) * 52,
                      height: imgH / (CIRCLE_R * 2) * 52,
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${offset.x / (CIRCLE_R * 2) * 52}px), calc(-50% + ${offset.y / (CIRCLE_R * 2) * 52}px))`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Profil</div>
            </div>

            {/* 32px — taille barre latérale / tâche */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--border-light)',
                background: poleColor || '#0f2d5e',
                flexShrink: 0,
                position: 'relative',
              }}>
                {imageSrc && loaded && (
                  <img
                    src={imageSrc}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: imgW / (CIRCLE_R * 2) * 32,
                      height: imgH / (CIRCLE_R * 2) * 32,
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${offset.x / (CIRCLE_R * 2) * 32}px), calc(-50% + ${offset.y / (CIRCLE_R * 2) * 32}px))`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tâche</div>
            </div>

            {/* 22px — taille avatar stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid var(--border-light)',
                background: poleColor || '#0f2d5e',
                flexShrink: 0,
                position: 'relative',
              }}>
                {imageSrc && loaded && (
                  <img
                    src={imageSrc}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: imgW / (CIRCLE_R * 2) * 22,
                      height: imgH / (CIRCLE_R * 2) * 22,
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${offset.x / (CIRCLE_R * 2) * 22}px), calc(-50% + ${offset.y / (CIRCLE_R * 2) * 22}px))`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Initiales</div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 22px 22px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: 11,
              border: '1.5px solid var(--border-light)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2, padding: '11px', borderRadius: 11,
              border: 'none',
              background: 'linear-gradient(135deg, #1a56db, #2563eb)',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 14px rgba(26,86,219,0.35)',
            }}
          >
            Appliquer cette photo
          </button>
        </div>
      </div>
    </div>
  );
}
