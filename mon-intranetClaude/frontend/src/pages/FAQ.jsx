// src/pages/FAQ.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, HelpCircle, DollarSign, Settings, Search } from 'lucide-react';

const CATEGORIES = [
  { key: 'général',        label: 'Général',       icon: HelpCircle, color: '#1a56db' },
  { key: 'finances',       label: 'Finances',       icon: DollarSign, color: '#16a34a' },
  { key: 'fonctionnement', label: 'Fonctionnement', icon: Settings,   color: '#d97706' },
];

const EMPTY_FORM = { categorie: 'général', question: '', reponse: '', ordre: 0 };

// Surligne les occurrences de `term` dans `text`
const Highlight = ({ text, term }) => {
  if (!term.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase()
          ? <mark key={i} style={{ background: 'rgba(26,86,219,0.15)', color: '#1a56db', borderRadius: 3, padding: '0 1px' }}>{part}</mark>
          : part
      )}
    </>
  );
};

export default function FAQ() {
  const { currentUser } = useAuth();
  const { faqs, handleCreateFaq, handleUpdateFaq, handleDeleteFaq } = useDataContext();
  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'Bureau';

  const [activeCategorie, setActiveCategorie] = useState('tous');
  const [openIds,         setOpenIds]         = useState(new Set());
  const [editModal,       setEditModal]       = useState(null);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [saving,          setSaving]          = useState(false);
  const [searchQ,         setSearchQ]         = useState('');

  const filtered = useMemo(() => {
    let list = [...(faqs || [])].sort((a, b) => a.ordre - b.ordre || a.id - b.id);
    if (activeCategorie !== 'tous') list = list.filter(f => f.categorie === activeCategorie);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(f => f.question.toLowerCase().includes(q) || f.reponse.toLowerCase().includes(q));
    }
    return list;
  }, [faqs, activeCategorie, searchQ]);

  const grouped = useMemo(() => {
    const g = {};
    CATEGORIES.forEach(c => { g[c.key] = []; });
    filtered.forEach(f => { if (!g[f.categorie]) g[f.categorie] = []; g[f.categorie].push(f); });
    return g;
  }, [filtered]);

  const toggle = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditModal({ mode: 'create' }); };
  const openEdit   = (faq) => {
    setForm({ categorie: faq.categorie, question: faq.question, reponse: faq.reponse, ordre: faq.ordre });
    setEditModal({ mode: 'edit', id: faq.id });
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.reponse.trim()) return;
    setSaving(true);
    try {
      if (editModal.mode === 'create') await handleCreateFaq(form);
      else await handleUpdateFaq(editModal.id, form);
      setEditModal(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette entrée FAQ ?')) return;
    await handleDeleteFaq(id);
  };

  const displayCats = activeCategorie === 'tous' ? CATEGORIES : CATEGORIES.filter(c => c.key === activeCategorie);

  return (
    <>
      <div className="eyebrow">Base de connaissances</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>FAQ</div>
        {isPrivileged && (
          <button className="btn-primary" onClick={openCreate}><Plus size={13} strokeWidth={2.5} /> Nouvelle entrée</button>
        )}
      </div>

      {/* Recherche + filtre catégories */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Rechercher dans la FAQ…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-base)', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <div className="toolbar-group">
          {[{ key: 'tous', label: 'Toutes', color: null }, ...CATEGORIES.map(c => ({ key: c.key, label: c.label, color: c.color }))].map(c => (
            <button key={c.key}
              className={`chip ${activeCategorie === c.key ? 'on' : ''}`}
              onClick={() => setActiveCategorie(c.key)}
              style={activeCategorie === c.key && c.color ? { borderColor: c.color, color: c.color, background: `${c.color}18` } : {}}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats quand recherche active */}
      {searchQ.trim() && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour « {searchQ} »
        </div>
      )}

      {/* FAQ groupée par catégorie */}
      {displayCats.map(cat => {
        const items = grouped[cat.key] || [];
        if (!items.length) return null;
        const Icon = cat.icon;
        return (
          <div key={cat.key} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${cat.color}22` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} strokeWidth={2} color={cat.color} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: cat.color }}>{cat.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(faq => {
                const isOpen = openIds.has(faq.id);
                return (
                  <div key={faq.id} style={{ background: 'var(--bg-card)', border: `1px solid ${isOpen ? cat.color + '44' : 'var(--border-light)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', cursor: 'pointer', gap: 12, userSelect: 'none' }}
                      onClick={() => toggle(faq.id)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-base)', flex: 1, lineHeight: 1.4 }}>
                        <Highlight text={faq.question} term={searchQ} />
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                        {isPrivileged && (
                          <>
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                              onClick={e => { e.stopPropagation(); openEdit(faq); }}
                              title="Modifier">
                              <Pencil size={12} />
                            </button>
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                              onClick={e => { e.stopPropagation(); handleDelete(faq.id); }}
                              title="Supprimer">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        <div style={{ color: isOpen ? cat.color : 'var(--text-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                          <ChevronDown size={15} />
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${cat.color}22`, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                        <Highlight text={faq.reponse} term={searchQ} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty" style={{ marginTop: 40 }}>
          {searchQ ? `Aucun résultat pour « ${searchQ} ».` : 'Aucune entrée FAQ pour cette catégorie.'}
        </div>
      )}

      {/* Modal create/edit */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal-box" style={{ width: 560, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>
              {editModal.mode === 'create' ? 'Nouvelle entrée FAQ' : 'Modifier l\'entrée'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Catégorie</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setForm(f => ({ ...f, categorie: c.key }))}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${form.categorie === c.key ? c.color : 'var(--border-light)'}`, background: form.categorie === c.key ? `${c.color}18` : 'transparent', color: form.categorie === c.key ? c.color : 'var(--text-dim)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Question</label>
                <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="La question à afficher…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-base)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Réponse</label>
                <textarea value={form.reponse} onChange={e => setForm(f => ({ ...f, reponse: e.target.value }))}
                  placeholder="La réponse détaillée…" rows={5}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-base)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Ordre d'affichage</label>
                <input type="number" min="0" value={form.ordre} onChange={e => setForm(f => ({ ...f, ordre: Number(e.target.value) }))}
                  style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-base)', fontSize: 13 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0 = premier</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.question.trim() || !form.reponse.trim()}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
