// src/components/modals/TaskRequestModal.jsx
import React, { useState } from 'react';
import { ClipboardList, X, Send, Calendar, Layers } from 'lucide-react';
import { POLES } from '../../data/constants';
import { useModalClose } from '../../hooks/useModalClose';

export default function TaskRequestModal({ action, currentUser, onSend, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);

  const [form, setForm] = useState({
    text: '',
    description: '',
    space: POLES[0],
    deadline: action?.date_fin || action?.date_debut || '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.text.trim()) return;
    setSending(true);
    try {
      await onSend({
        text: form.text.trim(),
        description: form.description.trim(),
        space: form.space,
        deadline: form.deadline,
        actionId: action.id,
        requestedBy: currentUser?.nom || '',
        assignees: [],
        targetPool: [],
        cycle: action.cycle || '',
        status: 'En attente',
      });
      setSent(true);
      setTimeout(handleClose, 1400);
    } catch (err) {
      alert(err?.message || "Erreur lors de l'envoi");
      setSending(false);
    }
  };

  return (
    <div
      className={`modal-overlay${isClosing ? ' is-closing' : ''}`}
      style={{ zIndex: 5000 }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`modal-box${isClosing ? ' is-closing' : ''}`}
        style={{ width: 480 }}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-title">
            <ClipboardList size={16} strokeWidth={1.8} />
            Demander une tâche
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">
          {sent ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: '32px 0', color: '#16a34a',
            }}>
              <Send size={28} strokeWidth={1.6} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Demande envoyée !</span>
            </div>
          ) : (
            <>
              {/* Action liée */}
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                background: 'rgba(26,86,219,0.05)', border: '1px solid rgba(26,86,219,0.15)',
                fontSize: 12, color: 'var(--text-dim)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>Action liée : </span>
                {action?.etablissement || '—'}
                {action?.ville ? ` · ${action.ville}` : ''}
              </div>

              {/* Intitulé */}
              <div>
                <label className="form-label">Intitulé de la tâche *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex : Préparer les supports pédagogiques"
                  value={form.text}
                  onChange={e => set('text', e.target.value)}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description (optionnel)</label>
                <textarea
                  className="form-input"
                  placeholder="Précisez les attentes, le contexte…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 72 }}
                />
              </div>

              {/* Pôle + Échéance */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">
                    <Layers size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                    Pôle destinataire
                  </label>
                  <select
                    className="form-select"
                    value={form.space}
                    onChange={e => set('space', e.target.value)}
                  >
                    {POLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="form-label">
                    <Calendar size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                    Échéance
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.deadline}
                    onChange={e => set('deadline', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!sent && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={handleClose}>Annuler</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!form.text.trim() || sending}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={13} strokeWidth={2} />
              {sending ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
