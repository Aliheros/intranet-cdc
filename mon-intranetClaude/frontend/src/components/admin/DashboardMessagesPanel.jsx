// DashboardMessagesPanel.jsx — Gestion des messages du header Dashboard
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Users, Info, X, Check } from 'lucide-react';
import api from '../../api/apiClient';
import { useDataContext } from '../../contexts/DataContext';
import { useAppContext } from '../../contexts/AppContext';
import { POLES, PROJETS } from '../../data/constants';

const MAX_CHARS   = 120;
const MAX_ACTIFS  = 20;
const ROLES       = ['Admin', 'Bureau', 'Éditeur', 'Lecteur'];
const GENRES      = ['Homme', 'Femme', 'Non-binaire', 'Autre'];
const STATUTS     = ['Actif', 'Inactif'];

const EMPTY_FORM = {
  contenu: '',
  actif: true,
  cibleUsers: [],
  ciblePoles: [],
  cibleProjets: [],
  cibleRoles: [],
  cibleGenres: [],
  cibleStatuts: [],
  cibleAgeMin: '',
  cibleAgeMax: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function specificityScore(msg) {
  let s = 0;
  if (msg.cibleUsers?.length)   s += 60;
  if (msg.ciblePoles?.length || msg.cibleProjets?.length) s += 40;
  if (msg.cibleRoles?.length)   s += 30;
  if (msg.cibleStatuts?.length) s += 20;
  if (msg.cibleGenres?.length)  s += 15;
  if (msg.cibleAgeMin != null || msg.cibleAgeMax != null) s += 10;
  return s;
}

function calcAge(dateNaissance) {
  if (!dateNaissance) return null;
  const parts = dateNaissance.includes('/') ? dateNaissance.split('/').reverse() : dateNaissance.split('-');
  const birth = new Date(parts.join('-'));
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

function matchesUser(msg, user) {
  const age = calcAge(user.dateNaissance);
  return [
    !msg.cibleUsers?.length    || msg.cibleUsers.includes(user.nom),
    !msg.ciblePoles?.length    || msg.ciblePoles.includes(user.pole),
    !msg.cibleProjets?.length  || msg.cibleProjets.some(p => (user.projets || []).includes(p)),
    !msg.cibleRoles?.length    || msg.cibleRoles.includes(user.role),
    !msg.cibleGenres?.length   || msg.cibleGenres.includes(user.genre || ''),
    !msg.cibleStatuts?.length  || msg.cibleStatuts.includes(user.statut || 'Actif'),
    (msg.cibleAgeMin == null && msg.cibleAgeMax == null) || (
      age != null &&
      (msg.cibleAgeMin == null || age >= msg.cibleAgeMin) &&
      (msg.cibleAgeMax == null || age <= msg.cibleAgeMax)
    ),
  ].every(Boolean);
}

function targetingSummary(msg) {
  const parts = [];
  if (msg.cibleUsers?.length)   parts.push(`${msg.cibleUsers.length} membre(s) nommé(s)`);
  if (msg.ciblePoles?.length)   parts.push(`Pôles: ${msg.ciblePoles.join(', ')}`);
  if (msg.cibleProjets?.length) parts.push(`Projets: ${msg.cibleProjets.join(', ')}`);
  if (msg.cibleRoles?.length)   parts.push(`Rôles: ${msg.cibleRoles.join(', ')}`);
  if (msg.cibleGenres?.length)  parts.push(`Genre: ${msg.cibleGenres.join(', ')}`);
  if (msg.cibleStatuts?.length) parts.push(`Statut: ${msg.cibleStatuts.join(', ')}`);
  if (msg.cibleAgeMin != null || msg.cibleAgeMax != null) {
    const min = msg.cibleAgeMin ?? '—';
    const max = msg.cibleAgeMax ?? '—';
    parts.push(`Âge: ${min}–${max} ans`);
  }
  return parts.length ? parts.join(' · ') : 'Tous les membres';
}

// ── Multi-select générique ────────────────────────────────────────────────────
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 34, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
          border: '1px solid var(--border-light)', background: 'var(--bg-surface)',
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          fontSize: 12,
        }}
      >
        {value.length === 0
          ? <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
          : value.map(v => (
            <span key={v} style={{ background: 'rgba(26,86,219,0.10)', border: '1px solid rgba(26,86,219,0.25)', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#1a56db', display:'flex', alignItems:'center', gap:3 }}>
              {v}
              <button onClick={e => { e.stopPropagation(); onChange(value.filter(x => x !== v)); }} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'#1a56db', lineHeight:1, fontSize:11 }}>✕</button>
            </span>
          ))
        }
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'var(--bg-surface)', border:'1px solid var(--border-light)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:200, overflowY:'auto', marginTop:2 }}>
          {options.map(opt => {
            const selected = value.includes(opt);
            return (
              <div key={opt} onClick={() => { onChange(selected ? value.filter(x => x !== opt) : [...value, opt]); }} style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, background: selected ? 'rgba(26,86,219,0.07)' : 'transparent', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:14, height:14, borderRadius:3, border:'1.5px solid', borderColor: selected ? '#1a56db' : 'var(--border-light)', background: selected ? '#1a56db' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {selected && <Check size={9} strokeWidth={3} color="#fff"/>}
                </span>
                {opt}
              </div>
            );
          })}
        </div>
      )}
      {open && <div style={{ position:'fixed', inset:0, zIndex:199 }} onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Modale création / édition ─────────────────────────────────────────────────
function MessageModal({ msg, onSave, onClose, memberNames }) {
  const [form, setForm] = useState(msg ? {
    contenu:     msg.contenu,
    actif:       msg.actif,
    cibleUsers:  msg.cibleUsers  || [],
    ciblePoles:  msg.ciblePoles  || [],
    cibleProjets:msg.cibleProjets|| [],
    cibleRoles:  msg.cibleRoles  || [],
    cibleGenres: msg.cibleGenres || [],
    cibleStatuts:msg.cibleStatuts|| [],
    cibleAgeMin: msg.cibleAgeMin ?? '',
    cibleAgeMax: msg.cibleAgeMax ?? '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => set(k, form[k].includes(v) ? form[k].filter(x => x !== v) : [...form[k], v]);
  const charsLeft = MAX_CHARS - (form.contenu?.length || 0);

  async function handleSave() {
    if (!form.contenu.trim()) return setErr('Le message est requis.');
    if (form.contenu.length > MAX_CHARS) return setErr(`Max ${MAX_CHARS} caractères.`);
    if (form.cibleAgeMin !== '' && form.cibleAgeMax !== '' && Number(form.cibleAgeMin) > Number(form.cibleAgeMax))
      return setErr("L'âge minimum doit être inférieur au maximum.");
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        cibleAgeMin: form.cibleAgeMin === '' ? null : Number(form.cibleAgeMin),
        cibleAgeMax: form.cibleAgeMax === '' ? null : Number(form.cibleAgeMax),
      };
      if (msg?.id) {
        await api.put(`/dashboard-messages/${msg.id}`, payload);
      } else {
        await api.post('/dashboard-messages', payload);
      }
      onSave();
    } catch (e) {
      setErr(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  const hasTargeting = form.cibleUsers.length || form.ciblePoles.length || form.cibleProjets.length ||
    form.cibleRoles.length || form.cibleGenres.length || form.cibleStatuts.length ||
    form.cibleAgeMin !== '' || form.cibleAgeMax !== '';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text-base)' }}>
            {msg?.id ? 'Modifier le message' : 'Nouveau message'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Contenu */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:6 }}>
              Message <span style={{ color: charsLeft < 20 ? '#e63946' : 'var(--text-muted)', fontWeight:400 }}>({charsLeft} caractères restants)</span>
            </label>
            <textarea
              value={form.contenu}
              onChange={e => set('contenu', e.target.value)}
              maxLength={MAX_CHARS}
              rows={2}
              placeholder="Ex : Pensez à remplir vos heures bénévoles !"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1.5px solid ${charsLeft < 0 ? '#e63946' : 'var(--border-light)'}`, fontSize:13, resize:'vertical', fontFamily:'var(--font-body)', color:'var(--text-base)', background:'var(--bg-surface)', boxSizing:'border-box' }}
            />
          </div>

          {/* Statut actif */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button
              onClick={() => set('actif', !form.actif)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--text-base)', fontSize:13, fontWeight:600 }}
            >
              <div style={{ width:38, height:22, borderRadius:11, background: form.actif ? '#16a34a' : 'var(--border-light)', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left: form.actif ? 18 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
              </div>
              {form.actif ? 'Actif' : 'Inactif'}
            </button>
          </div>

          {/* Séparateur ciblage */}
          <div style={{ borderTop:'1px solid var(--border-light)', paddingTop:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
              <Users size={12} strokeWidth={2}/> Ciblage
              <span style={{ fontSize:11, fontWeight:400, textTransform:'none', letterSpacing:0 }}>— laisser vide = tout le monde</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Membres nommés */}
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Membres spécifiques</label>
                <MultiSelect options={memberNames} value={form.cibleUsers} onChange={v => set('cibleUsers', v)} placeholder="Sélectionner des membres…"/>
              </div>

              {/* Pôles */}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Pôles</label>
                <MultiSelect options={POLES} value={form.ciblePoles} onChange={v => set('ciblePoles', v)} placeholder="Tous les pôles"/>
              </div>

              {/* Projets */}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Projets</label>
                <MultiSelect options={PROJETS} value={form.cibleProjets} onChange={v => set('cibleProjets', v)} placeholder="Tous les projets"/>
              </div>

              {/* Rôles */}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Rôles</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => toggleArr('cibleRoles', r)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor: form.cibleRoles.includes(r) ? '#1a56db' : 'var(--border-light)', background: form.cibleRoles.includes(r) ? 'rgba(26,86,219,0.10)' : 'var(--bg-hover)', color: form.cibleRoles.includes(r) ? '#1a56db' : 'var(--text-dim)' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Genre</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {GENRES.map(g => (
                    <button key={g} onClick={() => toggleArr('cibleGenres', g)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor: form.cibleGenres.includes(g) ? '#1a56db' : 'var(--border-light)', background: form.cibleGenres.includes(g) ? 'rgba(26,86,219,0.10)' : 'var(--bg-hover)', color: form.cibleGenres.includes(g) ? '#1a56db' : 'var(--text-dim)' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statuts */}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Statut membre</label>
                <div style={{ display:'flex', gap:6 }}>
                  {STATUTS.map(s => (
                    <button key={s} onClick={() => toggleArr('cibleStatuts', s)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor: form.cibleStatuts.includes(s) ? '#1a56db' : 'var(--border-light)', background: form.cibleStatuts.includes(s) ? 'rgba(26,86,219,0.10)' : 'var(--bg-hover)', color: form.cibleStatuts.includes(s) ? '#1a56db' : 'var(--text-dim)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tranche d'âge */}
              <div style={{ gridColumn:'1 / -1', display:'flex', alignItems:'center', gap:10 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Âge min.</label>
                  <input type="number" min={0} max={120} value={form.cibleAgeMin} onChange={e => set('cibleAgeMin', e.target.value)}
                    placeholder="—" style={{ width:70, padding:'6px 10px', borderRadius:7, border:'1px solid var(--border-light)', fontSize:12, background:'var(--bg-surface)', color:'var(--text-base)' }}/>
                </div>
                <span style={{ color:'var(--text-muted)', marginTop:18, fontSize:13 }}>–</span>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Âge max.</label>
                  <input type="number" min={0} max={120} value={form.cibleAgeMax} onChange={e => set('cibleAgeMax', e.target.value)}
                    placeholder="—" style={{ width:70, padding:'6px 10px', borderRadius:7, border:'1px solid var(--border-light)', fontSize:12, background:'var(--bg-surface)', color:'var(--text-base)' }}/>
                </div>
                <span style={{ color:'var(--text-muted)', fontSize:11, marginTop:18 }}>ans</span>
              </div>

            </div>
          </div>

          {/* Résumé ciblage */}
          {hasTargeting && (
            <div style={{ background:'rgba(26,86,219,0.06)', border:'1px solid rgba(26,86,219,0.18)', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#1a56db', display:'flex', gap:6, alignItems:'flex-start' }}>
              <Info size={12} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }}/>
              <span>Ce message sera visible par : <strong>{targetingSummary(form)}</strong></span>
            </div>
          )}

          {err && <div style={{ color:'#e63946', fontSize:12, fontWeight:600 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-light)', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ fontSize:12, padding:'7px 16px' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize:12, padding:'7px 16px' }}>
            {saving ? 'Sauvegarde…' : msg?.id ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function DashboardMessagesPanel() {
  const { directory }      = useDataContext();
  const { addToast, requestConfirm } = useAppContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'new' | msg object
  const [preview, setPreview]   = useState(null); // msg id en prévisualisation

  const memberNames = useMemo(
    () => directory.filter(u => !u.isDeleted).map(u => u.nom).sort(),
    [directory]
  );

  const load = async () => {
    setLoading(true);
    try { setMessages(await api.get('/dashboard-messages/all')); }
    catch { addToast('Erreur lors du chargement des messages.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (msg) => {
    requestConfirm({
      title: 'Supprimer ce message ?',
      message: `"${msg.contenu}"`,
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/dashboard-messages/${msg.id}`);
          addToast('Message supprimé.');
          load();
        } catch (e) { addToast(e.message || 'Erreur.', 'error'); }
      },
    });
  };

  const handleToggleActif = async (msg) => {
    try {
      await api.put(`/dashboard-messages/${msg.id}`, { actif: !msg.actif });
      addToast(msg.actif ? 'Message désactivé.' : 'Message activé.');
      load();
    } catch (e) { addToast(e.message || 'Erreur.', 'error'); }
  };

  const activeCount = messages.filter(m => m.actif).length;

  // Messages système (non éditables, toujours visibles)
  const SYSTEM_MESSAGES = [
    { id: 'sys_1', contenu: 'Bonjour, [prénom] 👋', actif: true, _system: true },
    { id: 'sys_2', contenu: 'Bienvenue !',           actif: true, _system: true },
  ];

  return (
    <div>
      {/* En-tête du panneau */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text-base)' }}>Messages du tableau de bord</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            Ces messages défilent dans le header du Dashboard. Les messages les plus ciblés apparaissent en premier.
            <br/>
            <span style={{ color: activeCount >= MAX_ACTIFS ? '#e63946' : 'var(--text-muted)' }}>
              {activeCount}/{MAX_ACTIFS} messages actifs · max {MAX_CHARS} caractères · séquence max 10 messages par utilisateur
            </span>
          </div>
        </div>
        <button
          onClick={() => setModal('new')}
          disabled={activeCount >= MAX_ACTIFS}
          className="btn-primary"
          style={{ fontSize:12, padding:'8px 16px', display:'flex', alignItems:'center', gap:6 }}
        >
          <Plus size={13} strokeWidth={2}/> Nouveau message
        </button>
      </div>

      {/* Règles de priorité */}
      <div style={{ background:'rgba(26,86,219,0.05)', border:'1px solid rgba(26,86,219,0.15)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:11, color:'var(--text-dim)', lineHeight:1.6 }}>
        <strong style={{ color:'var(--text-base)' }}>Ordre d'affichage automatique :</strong>{' '}
        Bonjour + Bienvenue → Messages ciblés sur un membre nommé → Ciblés par pôle/projet → Par rôle → Par statut → Par genre → Par âge → Messages généraux
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Chargement…</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Messages système (lecture seule) */}
          {SYSTEM_MESSAGES.map(msg => (
            <div key={msg.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg-alt)', border:'1px solid var(--border-light)', borderLeft:'3px solid #d97706', borderRadius:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-base)' }}>{msg.contenu}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Message système · Tous les membres · Non modifiable</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'rgba(217,119,6,0.12)', color:'#d97706', flexShrink:0 }}>Système</span>
            </div>
          ))}

          {/* Messages personnalisés */}
          {messages.length === 0 && (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13, border:'1.5px dashed var(--border-light)', borderRadius:10 }}>
              Aucun message personnalisé. Créez-en un avec le bouton ci-dessus.
            </div>
          )}

          {messages.map(msg => {
            const score   = specificityScore(msg);
            const matches = directory.filter(u => !u.isDeleted && matchesUser(msg, u));
            const isPreview = preview === msg.id;

            return (
              <div key={msg.id} style={{ border:'1px solid var(--border-light)', borderLeft:`3px solid ${msg.actif ? '#1a56db' : 'var(--border-light)'}`, borderRadius:10, overflow:'hidden', opacity: msg.actif ? 1 : 0.6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg-surface)' }}>
                  {/* Contenu */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-base)', wordBreak:'break-word' }}>{msg.contenu}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                      {targetingSummary(msg)}
                      {score > 0 && <span style={{ marginLeft:8, color:'rgba(26,86,219,0.7)' }}>· Priorité +{score}</span>}
                    </div>
                  </div>

                  {/* Badge actif */}
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, flexShrink:0,
                    background: msg.actif ? 'rgba(22,163,74,0.12)' : 'rgba(100,100,100,0.10)',
                    color: msg.actif ? '#16a34a' : 'var(--text-muted)' }}>
                    {msg.actif ? 'Actif' : 'Inactif'}
                  </span>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                    <button onClick={() => setPreview(isPreview ? null : msg.id)} title="Voir les membres ciblés"
                      style={{ background: isPreview ? 'rgba(26,86,219,0.10)' : 'var(--bg-hover)', border:'1px solid var(--border-light)', borderRadius:6, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: isPreview ? '#1a56db' : 'var(--text-dim)' }}>
                      <Eye size={13} strokeWidth={1.8}/>
                    </button>
                    <button onClick={() => handleToggleActif(msg)} title={msg.actif ? 'Désactiver' : 'Activer'}
                      style={{ background:'var(--bg-hover)', border:'1px solid var(--border-light)', borderRadius:6, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-dim)' }}>
                      {msg.actif ? <EyeOff size={13} strokeWidth={1.8}/> : <Eye size={13} strokeWidth={1.8}/>}
                    </button>
                    <button onClick={() => setModal(msg)} title="Modifier"
                      style={{ background:'var(--bg-hover)', border:'1px solid var(--border-light)', borderRadius:6, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-dim)' }}>
                      <Pencil size={13} strokeWidth={1.8}/>
                    </button>
                    <button onClick={() => handleDelete(msg)} title="Supprimer"
                      style={{ background:'rgba(230,57,70,0.06)', border:'1px solid rgba(230,57,70,0.2)', borderRadius:6, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#e63946' }}>
                      <Trash2 size={13} strokeWidth={1.8}/>
                    </button>
                  </div>
                </div>

                {/* Panneau prévisualisation ciblage */}
                {isPreview && (
                  <div style={{ padding:'10px 16px', background:'rgba(26,86,219,0.04)', borderTop:'1px solid var(--border-light)' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#1a56db', marginBottom:6 }}>
                      {matches.length} membre{matches.length !== 1 ? 's' : ''} verront ce message
                    </div>
                    {matches.length === 0 ? (
                      <div style={{ fontSize:11, color:'#e63946' }}>⚠ Aucun membre ne correspond à ce ciblage actuellement.</div>
                    ) : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {matches.map(u => (
                          <span key={u.id} style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'rgba(26,86,219,0.10)', color:'#1a56db', border:'1px solid rgba(26,86,219,0.20)' }}>
                            {u.nom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modale */}
      {modal && (
        <MessageModal
          msg={modal === 'new' ? null : modal}
          memberNames={memberNames}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); addToast(modal === 'new' ? 'Message créé.' : 'Message mis à jour.'); }}
        />
      )}
    </div>
  );
}
