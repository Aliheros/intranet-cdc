// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import '../styles/login-loader.css';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  // ── Magnétisme des halos ──────────────────────────────────────────────────
  const haloEls = useRef([]);
  useEffect(() => {
    const handleMove = (e) => {
      haloEls.current.forEach(({ el, light }) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx   = (rect.left + rect.width  / 2) - e.clientX;
        const dy   = (rect.top  + rect.height / 2) - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const max  = 600;
        if (dist < max) {
          const force = (max - dist) / max;
          const mx = light ? -(dx / dist) * force * 120 :  (dx / dist) * force * 120;
          const my = light ? -(dy / dist) * force * 120 :  (dy / dist) * force * 120;
          el.style.transform = `translate(${mx}px, ${my}px)`;
        } else {
          el.style.transform = 'translate(0px,0px)';
        }
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // App.jsx (useLayoutEffect) prend le relais et affiche le LoginLoader
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const HALOS = [
    { cls: 'b1', light: false },
    { cls: 'b2', light: false },
    { cls: 'r1', light: false },
    { cls: 'r2', light: false },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050510', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>

      {/* Dégradé animé de fond */}
      <div className="ll-bg" />

      {/* Glow central */}
      <div className="ll-glow" />

      {/* Halos flottants avec magnétisme */}
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

      {/* Carte de connexion */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24,
        padding: '48px 44px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'll-slide-up 0.7s cubic-bezier(.16,1,.3,1) both',
      }}>

        {/* Logo + titre */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logoCDC.png"
            alt="Cité des Chances"
            style={{
              width: 72, height: 72, objectFit: 'contain',
              marginBottom: 18,
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
              animation: 'll-reveal-logo 0.8s ease forwards, ll-float-logo 4s ease-in-out infinite 1s',
            }}
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
          {/* Fallback si le logo ne charge pas */}
          <div style={{
            display: 'none', width: 64, height: 64,
            background: 'linear-gradient(135deg, #1a56db, #e63946)',
            borderRadius: 16, alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 24px rgba(26,86,219,0.4)',
            fontSize: 28,
          }}>🎓</div>

          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 6,
            textShadow: '0 2px 12px rgba(255,255,255,0.15)',
          }}>
            Cité des Chances
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
            Intranet · Connexion sécurisée
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="prenom@citedeschances.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '13px 16px',
                fontSize: 14, color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(59,130,246,0.7)';
                e.target.style.background  = 'rgba(255,255,255,0.09)';
                e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                e.target.style.background  = 'rgba(255,255,255,0.06)';
                e.target.style.boxShadow   = 'none';
              }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '13px 48px 13px 16px',
                  fontSize: 14, color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.7)';
                  e.target.style.background  = 'rgba(255,255,255,0.09)';
                  e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.target.style.background  = 'rgba(255,255,255,0.06)';
                  e.target.style.boxShadow   = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >
                {showPwd ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{ background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff7a85', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} strokeWidth={1.8} /> {error}
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? 'rgba(59,130,246,0.35)'
                : 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 24px',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(26,86,219,0.45)',
              marginTop: 4,
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,86,219,0.55)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(26,86,219,0.45)'; }}
          >
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Connexion…
                </span>
              : 'Se connecter →'
            }
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
          Accès réservé aux membres de l'association.<br />
          Contacte un administrateur pour obtenir tes accès.
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
