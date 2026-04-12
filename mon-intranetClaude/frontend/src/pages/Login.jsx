// src/pages/Login.jsx
// Structure identique à LoginLoader : ll-root > ll-content > logo
// Le logo ne change jamais de position — la carte apparaît/disparaît en dessous.
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import '../styles/login-loader.css';

const HALOS = [
  { cls: 'b1', light: false },
  { cls: 'b2', light: false },
  { cls: 'r1', light: false },
  { cls: 'r2', light: false },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const haloEls = useRef([]);

  // ── Magnétisme halos ──────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      haloEls.current.forEach(({ el, light }) => {
        if (!el) return;
        const r  = el.getBoundingClientRect();
        const dx = (r.left + r.width  / 2) - e.clientX;
        const dy = (r.top  + r.height / 2) - e.clientY;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 600) {
          const f = (600 - d) / 600;
          el.style.transform = `translate(${(light ? -dx : dx) / d * f * 120}px,${(light ? -dy : dy) / d * f * 120}px)`;
        } else {
          el.style.transform = 'translate(0,0)';
        }
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true); // carte disparaît, logo reste — DOM identique à LoginLoader
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    // Même conteneur racine que LoginLoader → le logo ne change jamais de place
    <div className="ll-root">

      {/* Fond animé */}
      <div className="ll-bg" />
      <div className="ll-glow" />
      <div className="ll-halos">
        {HALOS.map(({ cls, light }, i) => (
          <div key={cls} className={`ll-hw ${cls}`}
            ref={el => { haloEls.current[i] = { el, light }; }}>
            <div className="ll-halo" />
          </div>
        ))}
      </div>

      {/* Contenu centré — même structure que LoginLoader */}
      <div className="ll-content" style={{ width: '100%', maxWidth: 420, padding: '0 20px', boxSizing: 'border-box' }}>

        {/* ── Logo : jamais démonté, jamais déplacé ── */}
        <img
          src="/logoCDC.png"
          alt="Cité des Chances"
          className="ll-logo"
          style={{ width: 80, height: 80 }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />

        {/* ── Titre + sous-titre : disparaît quand submitting ── */}
        <div style={{
          textAlign: 'center', marginTop: 4,
          maxHeight: submitting ? 0 : 60,
          opacity: submitting ? 0 : 1,
          overflow: 'hidden',
          transition: 'opacity 0.3s ease, max-height 0.4s cubic-bezier(.4,0,.2,1)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(255,255,255,0.15)', marginBottom: 4 }}>
            Cité des Chances
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Intranet · Connexion sécurisée
          </div>
        </div>

        {/* ── Carte de formulaire : slide-down + fade quand submitting ── */}
        <div style={{
          width: '100%', marginTop: 20,
          opacity: submitting ? 0 : 1,
          transform: submitting ? 'translateY(16px) scale(0.98)' : 'translateY(0) scale(1)',
          maxHeight: submitting ? 0 : 600,
          overflow: 'hidden',
          transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(.4,0,.2,1), max-height 0.4s cubic-bezier(.4,0,.2,1)',
          pointerEvents: submitting ? 'none' : 'auto',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '32px 36px', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Adresse e-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="prenom@citedeschances.com"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none', transition: 'border-color .2s,background .2s,box-shadow .2s' }}
                  onFocus={e => { e.target.style.borderColor='rgba(59,130,246,0.7)'; e.target.style.background='rgba(255,255,255,0.09)'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.background='rgba(255,255,255,0.06)'; e.target.style.boxShadow='none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 48px 12px 16px', fontSize: 14, color: '#fff', outline: 'none', transition: 'border-color .2s,background .2s,box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor='rgba(59,130,246,0.7)'; e.target.style.background='rgba(255,255,255,0.09)'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.background='rgba(255,255,255,0.06)'; e.target.style.boxShadow='none'; }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, transition: 'color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}
                  >
                    {showPwd ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff7a85', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} strokeWidth={1.8} /> {error}
                </div>
              )}

              <button type="submit"
                style={{ background: 'linear-gradient(135deg,#1a56db 0%,#1e3a8a 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', boxShadow: '0 4px 20px rgba(26,86,219,0.45)', marginTop: 2, letterSpacing: '0.02em' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(26,86,219,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(26,86,219,0.45)'; }}
              >
                Se connecter →
              </button>
            </form>

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
              Accès réservé aux membres de l'association.<br />
              Contacte un administrateur pour obtenir tes accès.
            </div>
          </div>
        </div>

        {/* ── Barre de progression indéterminée : apparaît quand submitting ── */}
        <div style={{
          width: '100%',
          maxHeight: submitting ? 30 : 0,
          opacity: submitting ? 1 : 0,
          overflow: 'hidden',
          marginTop: submitting ? 20 : 0,
          transition: 'opacity 0.3s ease 0.1s, max-height 0.3s ease, margin-top 0.3s ease',
        }}>
          <div className="ll-progress-track" style={{ opacity: 1, margin: '0 auto' }}>
            <div className="ll-progress-bar ll-progress-indeterminate" />
          </div>
        </div>

      </div>

      <style>{`input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
    </div>
  );
}
