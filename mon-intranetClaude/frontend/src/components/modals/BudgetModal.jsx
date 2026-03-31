// src/components/modals/BudgetModal.jsx
import React, { useState } from 'react';
import { POLES, PROJETS } from '../../data/constants';
import { Euro, X } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

export default function BudgetModal({ budgets, onSave, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [form, setForm] = useState({ ...budgets });
  const update = (k, v) => setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }));

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 500 }}>

        <div className="modal-header">
          <div className="modal-header-title"><Euro size={16} strokeWidth={1.8} /> Paramétrage des Budgets</div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: 480 }}>
          {/* Fonctionnement global */}
          <div>
            <label className="form-label">Fonctionnement & Général</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "linear-gradient(135deg, #0f2d5e11, #1a56db08)", border: "1px solid #1a56db30", borderRadius: 8 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-base)" }}>Fonctionnement Global</span>
              <input type="number" className="form-input" style={{ width: 130 }} value={form["Fonctionnement Global"] || 0} onChange={e => update("Fonctionnement Global", e.target.value)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>€</span>
            </div>
          </div>

          {/* Pôles */}
          <div>
            <label className="form-label">Pôles</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {POLES.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text-base)" }}>{p}</span>
                  <input type="number" className="form-input" style={{ width: 110, padding: "6px 10px" }} value={form[p] || 0} onChange={e => update(p, e.target.value)} />
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>€</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projets */}
          <div>
            <label className="form-label">Projets</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROJETS.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text-base)" }}>{p}</span>
                  <input type="number" className="form-input" style={{ width: 110, padding: "6px 10px" }} value={form[p] || 0} onChange={e => update(p, e.target.value)} />
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>€</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}