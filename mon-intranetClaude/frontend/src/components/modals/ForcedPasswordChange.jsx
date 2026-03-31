// src/components/modals/ForcedPasswordChange.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../api/apiClient';

export default function ForcedPasswordChange({ onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword: current, newPassword: next });
      onDone();
    } catch (err) {
      setError(err?.message || 'Code incorrect ou erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 40px 11px 14px', borderRadius: 9,
    border: '1.5px solid var(--border-light)', background: 'var(--bg-hover)',
    fontSize: 13, color: 'var(--text-base)', boxSizing: 'border-box', outline: 'none',
  };

  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={() => setShow(v => !v)}
      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
      {show ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div className="modal-box" style={{ background: 'var(--bg-surface)', borderRadius: 18, width: 420, padding: '36px 32px', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1a56db, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <KeyRound size={20} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-display)", color: 'var(--text-base)' }}>Nouveau mot de passe</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Ton compte nécessite un changement de mot de passe.</div>
          </div>
        </div>

        <div style={{ marginBottom: 22, padding: '10px 13px', borderRadius: 8, background: 'rgba(26,86,219,0.06)', border: '1px solid rgba(26,86,219,0.15)', fontSize: 12, color: 'var(--text-dim)' }}>
          Saisis le code temporaire fourni par l'administrateur, puis choisis un nouveau mot de passe.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Code temporaire</div>
            <div style={{ position: 'relative' }}>
              <input type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} placeholder="XXXX-XXXX" required style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em' }} />
              {eyeBtn(showCurrent, setShowCurrent)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nouveau mot de passe</div>
            <div style={{ position: 'relative' }}>
              <input type={showNext ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} placeholder="8 caractères minimum" required style={inputStyle} />
              {eyeBtn(showNext, setShowNext)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Confirmer le mot de passe</div>
            <div style={{ position: 'relative' }}>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, borderColor: confirm && confirm !== next ? '#e63946' : confirm && confirm === next ? '#059669' : undefined }} />
              {confirm && confirm === next && (
                <CheckCircle2 size={15} color="#059669" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', fontSize: 12, color: '#e63946' }}>
              <AlertTriangle size={13} strokeWidth={2} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '12px 20px', borderRadius: 10, background: loading ? 'rgba(26,86,219,0.5)' : '#1a56db', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
