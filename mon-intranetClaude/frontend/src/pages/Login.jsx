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
      // loading reste true → carte disparaît, logo reste visible
      // App.jsx (useLayoutEffect) monte le LoginLoader juste après
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
      {/* Halos */}
      <div className="ll-halos">
        {HALOS.map(({ cls, light }, i) => (
          <div key={cls} className={`ll-hw ${cls}`} ref={el => { haloEls.current[i] = { el, light }; }}>
            <div className="ll-halo" />
          </div>
        ))}
      </div>

      {/* Conteneur principal : logo au-dessus, carte en dessous */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: 420,
        padding: '0 20px', boxSizing: 'border-box',
      }}>

        {/* ── Logo + titre — reste visible et glisse vers le centre pendant loading ── */}
        <div style={{
          textAlign: 'center',
          marginBottom: loading ? 0 : 24,
          transition: 'margin 0.5s cubic-bezier(.16,1,.3,1), transform 0.5s cubic-bezier(.16,1,.3,1)',
          transform: loading ? 'scale(1.12) translateY(44px)' : 'scale(1) translateY(0)',
        }}>
          <img
            src="/logoCDC.png"
            alt="Cité des Chances"
            style={{
              width: 72, height: 72, objectFit: 'contain',
              display: 'block', margin: '0 auto 16px',
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
              animation: 'll-reveal-logo 0.8s ease both, ll-float-logo 4s ease-in-out infinite 1s',
            }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 800, color: '#fff',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            marginBottom: 5,
            textShadow: '0 2px 12px rgba(255,255,255,0.15)',
            transition: 'opacity 0.3s ease',
            opacity: loading ? 0 : 1,
          }}>
            Cité des Chances
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.45)',
            transition: 'opacity 0.3s ease',
            opacity: loading ? 0 : 1,
          }}>
            Intranet · Connexion sécurisée
          </div>
        </div>

        {/* ── Carte de connexion — disparaît quand loading ── */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
          padding: '36px 40px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          opacity: loading ? 0 : 1,
          transform: loading ? 'translateY(18px) scale(0.97)' : 'translateY(0) scale(1)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          pointerEvents: loading ? 'none' : 'auto',
          animation: 'll-slide-up 0.7s cubic-bezier(.16,1,.3,1) both',
        }}>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Adresse e-mail
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus placeholder="prenom@citedeschances.com"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#fff', outline: 'none', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.background = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 48px 13px 16px', fontSize: 14, color: '#fff', outline: 'none', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.7)'; e.target.style.background = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
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
              type="submit" disabled={loading}
              style={{ background: 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(26,86,219,0.45)', marginTop: 4, letterSpacing: '0.02em' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,86,219,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,86,219,0.45)'; }}
            >
              Se connecter →
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
            Accès réservé aux membres de l'association.<br />
            Contacte un administrateur pour obtenir tes accès.
          </div>
        </div>
      </div>

      <style>{`input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
    </div>
  );
}
