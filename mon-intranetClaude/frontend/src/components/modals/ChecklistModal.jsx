// src/components/modals/ChecklistModal.jsx
import React, { useState } from 'react';
import { computeCompletionScore } from '../../utils/utils';
import { X, CheckCircle2, Zap } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const PHASES = [
  { key: "preparation", label: "Préparation", color: "#1a56db" },
  { key: "jourJ", label: "Jour J", icon: Zap, color: "#d97706" },
  { key: "postAction", label: "Post-action", color: "#16a34a" },
];

export default function ChecklistModal({ action, currentUser, onClose, onSave }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [local, setLocal] = useState(() => {
    const copy = JSON.parse(JSON.stringify(action));
    return {
      ...copy,
      checklist: {
        preparation: copy.checklist?.preparation || [],
        jourJ: copy.checklist?.jourJ || [],
        postAction: copy.checklist?.postAction || [],
      },
    };
  });

  if (!action) return null;

  const toggleItem = (phase, id) => {
    const today = new Date().toISOString().split("T")[0];
    setLocal(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [phase]: prev.checklist[phase].map(item =>
          item.id === id
            ? {
                ...item,
                done: !item.done,
                doneBy: !item.done ? currentUser.nom : null,
                doneAt: !item.done ? today : null,
              }
            : item
        ),
      },
    }));
  };

  const score = computeCompletionScore(local);
  const scoreColor = score >= 80 ? "#16a34a" : score >= 40 ? "#d97706" : "#e63946";

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 640, maxHeight: "90vh", overflowY: "auto" }}>

        {/* HEADER */}
        <div className="modal-header">
          <div>
            <div className="section-label" style={{ marginBottom: 4, color: "#1a56db" }}>Suivi des actions</div>
            <div className="modal-header-title">Checklist — {action.etablissement}</div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* SCORE BAR */}
        <div style={{ padding: "16px 26px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-hover)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>Score de préparation</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor, fontFamily: "var(--font-display)" }}>{score}%</span>
          </div>
          <div style={{ height: 10, background: "var(--bg-alt)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, background: scoreColor, borderRadius: 5, transition: "width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
          </div>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ gap: 24 }}>
          {PHASES.map(phase => {
            const items = (local.checklist || {})[phase.key] || [];
            const done = items.filter(i => i.done).length;
            return (
              <div key={phase.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-base)", display: "flex", alignItems: "center", gap: 6 }}>{phase.icon && <phase.icon size={14} strokeWidth={1.8} color={phase.color} />}{phase.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, background: done === items.length && items.length > 0 ? "#dcfce7" : "var(--bg-alt)", color: done === items.length && items.length > 0 ? "#16a34a" : "var(--text-muted)", padding: "2px 10px", borderRadius: 20, marginLeft: "auto" }}>
                    {done}/{items.length}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(phase.key, item.id)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${item.done ? phase.color + "40" : "var(--border-light)"}`, background: item.done ? `${phase.color}08` : "var(--bg-surface)", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.done ? phase.color : "var(--border-light)"}`, background: item.done ? phase.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.2s" }}>
                        {item.done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: item.done ? 500 : 600, color: item.done ? "var(--text-dim)" : "var(--text-base)", textDecoration: item.done ? "line-through" : "none" }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                          {item.space}
                          {item.done && item.doneBy && (
                            <span style={{ marginLeft: 8, color: phase.color, fontWeight: 600 }}>
                              ✓ {item.doneBy} · {item.doneAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave({ ...local, completionScore: score })}>Enregistrer la checklist</button>
        </div>
      </div>
    </div>
  );
}