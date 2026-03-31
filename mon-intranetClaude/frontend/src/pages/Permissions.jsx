// src/pages/Permissions.jsx
import React, { useState, useEffect } from 'react';
import { POLES, PROJETS, POLE_COLORS, PROJET_COLORS } from '../data/constants';
import api from '../api/apiClient';
import { Plus, Trash2, Save, X, ShieldCheck, KeyRound, Copy, Check, BookOpen, Play } from 'lucide-react';
import { AvatarInner, isAvatarUrl } from '../components/ui/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const ROLE_COLORS = {
  Admin:  { bg: '#0f2d5e', text: '#fff' },
  Bureau: { bg: '#7c3aed', text: '#fff' },
};

const SPACE_ROLES = ['Responsable', 'Membre', 'Observateur'];
const SPACE_ROLE_COLORS = {
  Responsable: { bg: '#059669', text: '#fff', border: '#059669' },
  Membre:      { bg: '#1a56db', text: '#fff', border: '#1a56db' },
  Observateur: { bg: '#6b7280', text: '#fff', border: '#6b7280' },
};

const DEFAULT_FORM = { nom: '', email: '', pole: POLES[0], role: 'Membre', password: '' };

const Permissions = () => {
  const { currentUser } = useAuth();
  const { addToast, requestConfirm } = useAppContext();
  const {
    directory, setDirectory,
    spaceTeams, setSpaceTeams,
    activeCycle, cycles,
    handleRenameUser: onRenameUser,
  } = useDataContext();
  const teamYear = activeCycle === 'Toutes' ? cycles[0] : activeCycle;
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [resetCode, setResetCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const makeAvatar = (nom) => {
    const parts = (nom || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return "??";
  };

  const selectUser = (u) => {
    const permsObj = {};
    (u.permissions || []).forEach((p) => { permsObj[p.pole] = p.level; });
    // Charger les rôles dans chaque espace depuis spaceTeams, avec fallback sur permissions
    const spaceRolesObj = {};
    [...POLES, ...PROJETS].forEach(space => {
      const membership = ((spaceTeams[space]?.[teamYear]) || []).find(m => m.nom === u.nom);
      if (membership) {
        spaceRolesObj[space] = membership.role;
      } else if (permsObj[space] === 'edit') {
        spaceRolesObj[space] = 'Responsable';
      } else if (permsObj[space] === 'view') {
        spaceRolesObj[space] = 'Membre';
      } else if (permsObj[space] === 'read') {
        spaceRolesObj[space] = 'Observateur';
      }
    });
    // Dériver le nom de famille depuis nom complet et prenom
    const prenomStored = u.prenom || u.nom.split(' ')[0] || '';
    const familyName = u.nom.startsWith(prenomStored + ' ') ? u.nom.slice(prenomStored.length + 1) : u.nom.split(' ').slice(1).join(' ');
    setSelected({ ...u, prenom: prenomStored, familyName, permissions: permsObj, spaceRoles: spaceRolesObj });
  };

  const setSpaceRole = (space, role) => {
    const level = role === 'Responsable' ? 'edit' : role === 'Membre' ? 'view' : role === 'Observateur' ? 'read' : 'none';
    setSelected(s => ({
      ...s,
      permissions: { ...s.permissions, [space]: level },
      spaceRoles: { ...s.spaceRoles, [space]: role || null },
    }));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    // Snapshot des anciennes permissions avant sauvegarde
    const oldUser = directory.find(u => u.id === selected.id);
    const oldPermsObj = {};
    (oldUser?.permissions || []).forEach(p => { oldPermsObj[p.pole] = p.level; });
    const oldNom = oldUser?.nom || selected.nom;

    try {
      const newPrenom = (selected.prenom || "").trim();
      const newFamilyName = (selected.familyName || "").trim();
      const newNom = [newPrenom, newFamilyName].filter(Boolean).join(' ') || selected.nom;
      // Préserver la photo si elle existe
      const existingAvatar = oldUser?.avatar || selected.avatar;
      const newAvatar = existingAvatar?.startsWith('/') || existingAvatar?.startsWith('http')
        ? existingAvatar
        : makeAvatar(newNom);
      const updated = await api.patch(`/users/${selected.id}`, {
        nom: newNom,
        prenom: newPrenom,
        avatar: newAvatar,
        email: selected.email,
        role: selected.role,
        permissions: selected.permissions,
      });
      setDirectory((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      selectUser(updated);
      addToast(`${newNom} mis à jour !`);

      // Propager le renommage partout si le nom a changé
      if (oldNom !== newNom && onRenameUser) {
        onRenameUser(oldNom, newNom);
      }

      // Sync spaceTeams depuis spaceRoles
      if (setSpaceTeams && teamYear && selected.spaceRoles) {
        const teamChanges = {};
        [...POLES, ...PROJETS].forEach(space => {
          const oldTeam = (spaceTeams[space]?.[teamYear]) || [];
          // chercher par ancien nom OU nouveau nom
          const oldMembership = oldTeam.find(m => m.nom === oldNom || m.nom === newNom);
          const newRole = selected.spaceRoles[space] || null;
          if (!newRole && !oldMembership) return;
          if (!newRole) {
            teamChanges[space] = oldTeam.filter(m => m.nom !== oldNom && m.nom !== newNom);
          } else if (!oldMembership) {
            teamChanges[space] = [...oldTeam, { nom: newNom, role: newRole }];
          } else if (oldMembership.role !== newRole || oldMembership.nom !== newNom) {
            teamChanges[space] = oldTeam.map(m =>
              (m.nom === oldNom || m.nom === newNom) ? { ...m, nom: newNom, role: newRole } : m
            );
          }
        });

        if (Object.keys(teamChanges).length > 0) {
          setSpaceTeams(prev => {
            const next = { ...prev };
            for (const [space, newTeam] of Object.entries(teamChanges)) {
              next[space] = { ...(prev[space] || {}), [teamYear]: newTeam };
            }
            return next;
          });
          for (const [space, newTeam] of Object.entries(teamChanges)) {
            const updatedYears = { ...(spaceTeams[space] || {}), [teamYear]: newTeam };
            api.put(`/spaces/${encodeURIComponent(space)}/settings/teams`, { value: updatedYears }).catch(console.error);
          }
        }
      }
    } catch (e) {
      addToast(e?.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = () => {
    if (!selected) return;
    requestConfirm(
      `Réinitialiser le mot de passe de ${selected.nom} ? Un code temporaire sera généré.`,
      async () => {
        try {
          const { code } = await api.post(`/users/${selected.id}/reset-password`, {});
          setResetCode(code);
          addToast(`Code généré pour ${selected.nom}`);
        } catch (e) {
          addToast(e?.message || 'Erreur lors de la réinitialisation', 'error');
        }
      }
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    requestConfirm(
      `Désactiver le compte de ${selected.nom} ? Le compte sera bloqué et ses données conservées.`,
      async () => {
        try {
          await api.delete(`/users/${selected.id}`);
          const nom = selected.nom;
          setDirectory((prev) => prev.filter((u) => u.id !== selected.id));
          // Retirer le membre supprimé de toutes les équipes d'espaces
          const cleanedTeams = {};
          for (const [space, yearMap] of Object.entries(spaceTeams)) {
            const newYearMap = {};
            for (const [year, team] of Object.entries(yearMap || {})) {
              newYearMap[year] = (team || []).filter(m => m.nom !== nom);
            }
            cleanedTeams[space] = newYearMap;
          }
          setSpaceTeams(cleanedTeams);
          for (const [space, yearMap] of Object.entries(cleanedTeams)) {
            api.put(`/spaces/${encodeURIComponent(space)}/settings/teams`, { value: yearMap }).catch(console.error);
          }
          setSelected(null);
          addToast(`Compte de ${nom} désactivé.`, 'error');
        } catch (e) {
          addToast(e?.message || 'Erreur lors de la suppression', 'error');
        }
      }
    );
  };

  const handleCreate = async () => {
    if (!createForm.nom || !createForm.email || !createForm.password) {
      addToast('Remplis tous les champs obligatoires', 'error');
      return;
    }
    setCreating(true);
    try {
      const newUser = await api.post('/users', createForm);
      setDirectory((prev) => [...prev, newUser].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowCreate(false);
      setCreateForm(DEFAULT_FORM);
      addToast(`Compte de ${newUser.nom} créé !`);
      selectUser(newUser);
    } catch (e) {
      addToast(e?.message || 'Erreur lors de la création', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filtered = directory.filter((u) =>
    u.nom.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.pole.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 0, height: isMobile ? 'auto' : 'calc(100vh - 120px)', overflow: isMobile ? 'visible' : 'hidden' }}>

      {/* ── COLONNE GAUCHE : liste des membres ── */}
      <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, borderBottom: isMobile ? '1px solid var(--border-light)' : 'none', display: isMobile && selected ? 'none' : 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden', maxHeight: isMobile ? 360 : undefined, overflowY: isMobile ? 'auto' : undefined, background: 'var(--bg-surface)', border: isMobile ? undefined : '1px solid var(--border-light)', borderRadius: 10 }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>Membres ({directory.length})</div>
            <button
              onClick={() => { setShowCreate(true); setSelected(null); }}
              className="btn-primary"
              style={{ padding: '5px 10px', fontSize: 11 }}
            >
              <Plus size={12} strokeWidth={2.5} /> Nouveau
            </button>
          </div>
          <input
            placeholder="Rechercher..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'var(--bg-hover)', fontSize: 12, color: 'var(--text-base)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.map((u) => {
            const rc = ROLE_COLORS[u.role] || null;
            const isSelected = selected?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => selectUser(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer',
                  background: isSelected ? 'rgba(26,86,219,0.07)' : 'transparent',
                  borderLeft: `3px solid ${isSelected ? '#1a56db' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isAvatarUrl(u.avatar) ? 'transparent' : (POLE_COLORS[u.pole] || '#0f2d5e'), color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <AvatarInner avatar={u.avatar} nom={u.nom} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nom}</span>
                    {u.role === 'Admin' && <ShieldCheck size={11} color="#0f2d5e" />}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.pole || (u.role === 'Admin' ? 'Administrateur' : '')}</span>
                    {rc && <span style={{ flexShrink: 0, padding: '1px 5px', borderRadius: 4, background: rc.bg, color: rc.text, fontSize: 9, fontWeight: 700 }}>{u.role}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-muted)' }}>Aucun résultat</div>}
        </div>
      </div>

      {/* ── PANNEAU DROIT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '28px 32px', display: isMobile && !selected && !showCreate ? 'none' : undefined, }}>
        {isMobile && (selected || showCreate) && (
          <button onClick={() => { setSelected(null); setShowCreate(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'var(--bg-alt)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-base)' }}>
            ‹ Retour à la liste
          </button>
        )}

        {/* Formulaire création */}
        {showCreate && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Administration</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)" }}>Nouveau compte</div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="form-2col" style={{ gap: 14, marginBottom: 14 }}>
              {[
                { label: 'Nom complet *', key: 'nom', type: 'text', placeholder: 'Prénom Nom' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'email@citedeschances.com' },
                { label: 'Mot de passe *', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ gridColumn: key === 'nom' || key === 'email' ? undefined : 'span 1' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={createForm[key]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid var(--border-light)', background: 'var(--bg-surface)', fontSize: 13, color: 'var(--text-base)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Pôle</div>
                <select value={createForm.pole} onChange={(e) => setCreateForm((f) => ({ ...f, pole: e.target.value }))} style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid var(--border-light)', background: 'var(--bg-surface)', fontSize: 13, color: 'var(--text-base)' }}>
                  {POLES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border-light)', background: 'var(--bg-surface)', cursor: 'pointer' }} onClick={() => setCreateForm(f => ({ ...f, role: f.role === 'Bureau' ? 'Membre' : 'Bureau' }))}>
                <input type="checkbox" readOnly checked={createForm.role === 'Bureau'} style={{ accentColor: '#7c3aed', cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)' }}>Accès Bureau</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Espace Bureau + lecture de tous les pôles</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? 'Création…' : 'Créer le compte'}
              </button>
            </div>
          </div>
        )}

        {/* Panel édition utilisateur */}
        {selected && !showCreate && (
          <div style={{ maxWidth: 620 }}>
            {/* Header utilisateur */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: isAvatarUrl(selected.avatar) ? 'transparent' : (POLE_COLORS[selected.pole] || '#0f2d5e'), color: '#fff', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                <AvatarInner avatar={selected.avatar} nom={selected.nom} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 2 }}>Prénom</div>
                    <input
                      value={selected.prenom || ''}
                      onChange={e => setSelected(s => ({ ...s, prenom: e.target.value }))}
                      placeholder="Prénom"
                      style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: 'var(--text-base)', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--border-light)', outline: 'none', width: '100%', padding: '5px 0' }}
                      onFocus={e => e.target.style.borderBottomColor = '#1a56db'}
                      onBlur={e => e.target.style.borderBottomColor = 'var(--border-light)'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 2 }}>Nom</div>
                    <input
                      value={selected.familyName || ''}
                      onChange={e => setSelected(s => ({ ...s, familyName: e.target.value }))}
                      placeholder="Nom de famille"
                      style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: 'var(--text-base)', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--border-light)', outline: 'none', width: '100%', padding: '5px 0' }}
                      onFocus={e => e.target.style.borderBottomColor = '#1a56db'}
                      onBlur={e => e.target.style.borderBottomColor = 'var(--border-light)'}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={selected.email || ''}
                    onChange={e => setSelected(s => ({ ...s, email: e.target.value }))}
                    placeholder="email@exemple.com"
                    style={{ fontSize: 13, color: 'var(--text-muted)', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--border-light)', outline: 'none', padding: '4px 0', minWidth: 0, flex: 1 }}
                    onFocus={e => e.target.style.borderBottomColor = '#1a56db'}
                    onBlur={e => e.target.style.borderBottomColor = 'var(--border-light)'}
                  />
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {selected.role !== 'Admin' && (
                  <>
                    <button onClick={handleResetPassword} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      <KeyRound size={13} /> Réinitialiser MDP
                    </button>
                    <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: 'rgba(230,57,70,0.1)', color: '#e63946', border: '1px solid rgba(230,57,70,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </>
                )}
                <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#1a56db', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* Accès Bureau */}
            {selected.role !== 'Admin' && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Accès spéciaux</div>
                <div
                  onClick={() => setSelected(s => ({ ...s, role: s.role === 'Bureau' ? 'Membre' : 'Bureau' }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `2px solid ${selected.role === 'Bureau' ? '#7c3aed' : 'var(--border-light)'}`, background: selected.role === 'Bureau' ? 'rgba(124,58,237,0.06)' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.15s', maxWidth: 380 }}
                >
                  <input type="checkbox" readOnly checked={selected.role === 'Bureau'} style={{ accentColor: '#7c3aed', cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: selected.role === 'Bureau' ? '#7c3aed' : 'var(--text-base)' }}>Membre du Bureau</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Accès à l'espace Bureau + lecture de tous les pôles/projets</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tutoriel */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Tutoriel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0f2d5e, #1a56db)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={16} strokeWidth={1.8} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', marginBottom: 2 }}>
                    Tutoriel de prise en main
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selected.mustTakeTutorial
                      ? 'Le tutoriel sera affiché à la prochaine connexion.'
                      : 'Déclenche le tutoriel spotlight à la prochaine connexion de ce membre.'}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/users/${selected.id}/trigger-tutorial`);
                      setSelected(s => ({ ...s, mustTakeTutorial: true }));
                      addToast(`Tutoriel activé pour ${selected.nom}`);
                    } catch { addToast('Erreur lors de l\'activation', 'error'); }
                  }}
                  disabled={selected.mustTakeTutorial}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: selected.mustTakeTutorial ? 'var(--bg-alt)' : 'linear-gradient(135deg, #0f2d5e, #1a56db)', color: selected.mustTakeTutorial ? 'var(--text-muted)' : '#fff', border: 'none', cursor: selected.mustTakeTutorial ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.15s' }}
                >
                  <Play size={12} strokeWidth={2} />
                  {selected.mustTakeTutorial ? 'En attente' : 'Activer'}
                </button>
              </div>
            </div>

            {/* Fonction dans chaque espace */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Fonction dans les espaces</div>
              {selected.role === 'Admin' && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,45,94,0.05)', border: '1px solid rgba(15,45,94,0.1)', fontSize: 11, color: 'var(--text-muted)' }}>
                  Accès complet par défaut — assigner un rôle dans un espace permet à l'admin d'y apparaître dans l'annuaire.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
                {[...POLES, ...PROJETS].sort((a, b) => a.localeCompare(b, 'fr')).map((space) => {
                  const currentRole = selected.spaceRoles?.[space] || null;
                  const dotColor = POLE_COLORS[space] || PROJET_COLORS[space] || '#94a3b8';
                  const rc = currentRole ? SPACE_ROLE_COLORS[currentRole] : null;
                  return (
                    <div key={space} style={{ padding: '11px 13px', borderRadius: 10, border: `1px solid ${rc ? rc.border + '60' : 'var(--border-light)'}`, background: rc ? rc.bg + '08' : 'var(--bg-surface)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{space}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {SPACE_ROLES.map(role => {
                          const active = currentRole === role;
                          const c = SPACE_ROLE_COLORS[role];
                          return (
                            <button key={role} onClick={() => setSpaceRole(space, active ? null : role)} style={{ flex: 1, padding: '4px 2px', borderRadius: 6, cursor: 'pointer', fontSize: 9, fontWeight: 700, border: `1.5px solid ${active ? c.border : 'var(--border-light)'}`, background: active ? c.bg : 'transparent', color: active ? c.text : 'var(--text-muted)', transition: 'all 0.12s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {role}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal code de réinitialisation */}
        {resetCode && (
          <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => { setResetCode(null); setCopied(false); }}>
            <div className="modal-box" style={{ width: 380, padding: '32px 28px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #1a56db)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={18} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)" }}>Code temporaire généré</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pour {selected?.nom}</div>
                </div>
              </div>
              <div style={{ padding: '18px 0', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Code à transmettre</div>
                <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.18em', color: 'var(--text-base)', background: 'var(--bg-hover)', borderRadius: 10, padding: '16px 20px', border: '2px dashed var(--border-light)' }}>
                  {resetCode}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, padding: '10px 12px' }}>
                Transmets ce code au membre. Il devra l'utiliser comme mot de passe lors de sa prochaine connexion, puis définir un nouveau mot de passe.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(resetCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 9, background: copied ? '#059669' : '#1a56db', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.2s' }}
                >
                  {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier</>}
                </button>
                <button onClick={() => { setResetCode(null); setCopied(false); }} style={{ padding: '10px 18px', borderRadius: 9, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* État vide */}
        {!selected && !showCreate && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--text-muted)' }}>
            <ShieldCheck size={40} strokeWidth={1.2} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sélectionne un membre</div>
            <div style={{ fontSize: 12 }}>ou crée un nouveau compte</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Permissions;
