// src/components/ui/ErrorBoundary.jsx
// Attrape les erreurs de rendu React et affiche une UI de récupération
// au lieu d'une page blanche. Enrouler les sections critiques avec ce composant.
import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Crash attrapé :', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label = 'cette section', inline = false } = this.props;
    const msg = this.state.error?.message || 'Erreur inconnue';

    if (inline) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)',
          borderRadius: 8, fontSize: 12, color: '#e63946',
        }}>
          <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Erreur dans {label} : <code style={{ fontSize: 11 }}>{msg}</code></span>
          <button
            onClick={this.handleReset}
            style={{ background: 'none', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#e63946', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <RotateCcw size={11} strokeWidth={2} /> Réessayer
          </button>
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 260, gap: 16, padding: 40, textAlign: 'center',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(230,57,70,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={26} strokeWidth={1.5} color="#e63946" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-base)', marginBottom: 6 }}>
            Une erreur s'est produite
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Impossible d'afficher {label}.
          </div>
          <code style={{ fontSize: 11, color: '#e63946', background: 'rgba(230,57,70,0.07)', padding: '2px 8px', borderRadius: 4 }}>
            {msg}
          </code>
        </div>
        <button
          onClick={this.handleReset}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0f2d5e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >
          <RotateCcw size={14} strokeWidth={2} /> Réessayer
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
