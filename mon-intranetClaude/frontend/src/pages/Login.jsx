// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertTriangle, Loader, BookOpen } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1e4a 0%, #0f2d5e 50%, #1a3a6e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "var(--font-body)",
      padding: 20,
    }}>
      {/* Arrière-plan décoratif */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,86,219,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-5%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.1) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '48px 44px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        position: 'relative',
      }}>
        {/* Logo / En-tête */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #1a56db, #e63946)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(26,86,219,0.4)',
          }}>
            <BookOpen size={26} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 24, fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Cité des Chances
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
            Intranet — Connexion sécurisée
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.6)', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="prenom@citedeschances.com"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14, color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(26,86,219,0.8)';
                e.target.style.background = 'rgba(255,255,255,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.background = 'rgba(255,255,255,0.07)';
              }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.6)', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '12px 48px 12px 16px',
                  fontSize: 14, color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(26,86,219,0.8)';
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.target.style.background = 'rgba(255,255,255,0.07)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                {showPwd ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div style={{
              background: 'rgba(230,57,70,0.15)',
              border: '1px solid rgba(230,57,70,0.4)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#ff6b7a',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} strokeWidth={1.8} /> {error}
            </div>
          )}

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? 'rgba(26,86,219,0.5)'
                : 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '14px 24px',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(26,86,219,0.4)',
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Loader size={15} strokeWidth={1.8} /> Connexion en cours...</span> : 'Se connecter →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          lineHeight: 1.6,
        }}>
          Accès réservé aux membres de l'association.<br />
          Contacte un administrateur pour obtenir tes accès.
        </div>
      </div>
    </div>
  );
}
