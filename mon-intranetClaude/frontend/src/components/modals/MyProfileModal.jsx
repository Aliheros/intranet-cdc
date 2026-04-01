// src/components/modals/MyProfileModal.jsx
import React, { useState, useRef } from 'react';
import { POLE_COLORS } from '../../data/constants';
import api from '../../api/apiClient';
import { Settings, X, KeyRound, Bell, Umbrella, Plus, Trash2, CalendarRange, Camera, Trash } from 'lucide-react';
import { MEMBER_STATUS } from '../ui/StatusIcon';
import AvatarDisplay, { isAvatarUrl } from '../ui/AvatarDisplay';
import AvatarCropModal from './AvatarCropModal';

import { useModalClose } from '../../hooks/useModalClose';

const makeAvatar = (nom) => {
  const parts = (nom || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "??";
};

export default function MyProfileModal({ currentUser, directory, setDirectory, addToast, onClose, updateCurrentUser }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const myData = directory.find(m => m.nom === currentUser.nom) || {};
  const defaultPrefs = {
    annonces: true, taches: true, messagerie: false,
    evenements: true, notesFrais: true, missions: false,
  };
  const savedPrefs = typeof myData.emailPreferences === 'object' && myData.emailPreferences !== null
    ? myData.emailPreferences : {};
  const storedPrenom = myData.prenom || currentUser.prenom || (myData.nom || currentUser.nom || "").split(' ')[0] || "";
  const storedFamilyName = (() => {
    const fullNom = myData.nom || currentUser.nom || "";
    const pren = myData.prenom || currentUser.prenom || fullNom.split(' ')[0] || "";
    return fullNom.startsWith(pren + ' ') ? fullNom.slice(pren.length + 1) : fullNom.split(' ').slice(1).join(' ');
  })();
  // Split stored telephone into dialCode + number
  const storedTel = myData.telephone || "";
  const dialCodeMatch = storedTel.match(/^(\+\d{1,3})\s*(.*)/);
  const [form, setForm] = useState({
    prenom: storedPrenom,
    familyName: storedFamilyName,
    email: myData.email || "",
    emailPerso: myData.emailPerso || "",
    dispos: myData.dispos || "",
    competences: (myData.competences || []).join(", "),
    statut: myData.statut || "Actif",
    telDialCode: dialCodeMatch ? dialCodeMatch[1] : "+33",
    telNumber: dialCodeMatch ? dialCodeMatch[2] : (storedTel.startsWith('+') ? storedTel : storedTel),
    emailPreferences: { ...defaultPrefs, ...savedPrefs },
    profileVolontaire: {
      dateNaissance: myData.profileVolontaire?.dateNaissance || "",
      adresse: myData.profileVolontaire?.adresse || "",
      urgenceContact: myData.profileVolontaire?.urgenceContact || "",
      urgenceTel: myData.profileVolontaire?.urgenceTel || "",
      motivation: myData.profileVolontaire?.motivation || "",
      experiencesPassees: myData.profileVolontaire?.experiencesPassees || "",
    },
  });
  const [conges, setConges] = useState(Array.isArray(myData.conges) ? myData.conges : []);
  const [newConge, setNewConge] = useState({ debut: "", fin: "", motif: "" });
  const [showCongeForm, setShowCongeForm] = useState(false);
  const [confirmEndId, setConfirmEndId] = useState(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null); // déclenche l'éditeur de recadrage
  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Ouvre l'éditeur de recadrage
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropSrc(src);
    e.target.value = '';
  };

  // Appelé par AvatarCropModal avec le blob final recadré
  const handleCropConfirm = async (blob) => {
    setCropSrc(null);
    setAvatarUploading(true);
    try {
      const preview = URL.createObjectURL(blob);
      setAvatarPreview(preview);
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const { url } = await api.postForm('/upload/avatar', formData);
      setAvatarPreview(null);
      setDirectory(prev => prev.map(m => m.nom === currentUser.nom ? { ...m, avatar: url } : m));
      if (updateCurrentUser) updateCurrentUser({ avatar: url });
      addToast('Photo de profil mise à jour !');
    } catch {
      addToast('Erreur lors de l\'upload', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      const { avatar: newAvatar } = await api.delete('/upload/avatar');
      setAvatarPreview(null);
      setDirectory(prev => prev.map(m => m.nom === currentUser.nom ? { ...m, avatar: newAvatar } : m));
      if (updateCurrentUser) updateCurrentUser({ avatar: newAvatar });
      addToast('Photo supprimée');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = () => {
    const compsArray = form.competences.split(",").map(s => s.trim()).filter(s => s !== "");
    const newPrenom = form.prenom.trim();
    const newFamilyName = form.familyName.trim();
    const newNom = [newPrenom, newFamilyName].filter(Boolean).join(' ') || currentUser.nom;
    // Préserver la photo URL si elle existe, sinon utiliser les initiales
    const existingAvatar = myData.avatar || currentUser.avatar;
    const newAvatar = isAvatarUrl(existingAvatar) ? existingAvatar : makeAvatar(newNom);
    const telephone = form.telNumber.trim() ? `${form.telDialCode} ${form.telNumber.trim()}` : "";

    // Statut effectif : priorité aux congés déclarés
    const today = new Date().toISOString().split('T')[0];
    const activeConge = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
    const effectiveStatut = activeConge ? "En congé" : form.statut;

    setDirectory(prev =>
      prev.map(m =>
        m.nom === currentUser.nom
          ? { ...m, nom: newNom, prenom: newPrenom, avatar: newAvatar, email: form.email, emailPerso: form.emailPerso || null, dispos: form.dispos, competences: compsArray, statut: effectiveStatut, telephone, profileVolontaire: form.profileVolontaire, conges }
          : m
      )
    );
    if (updateCurrentUser) updateCurrentUser({ nom: newNom, prenom: newPrenom, avatar: newAvatar, statut: effectiveStatut });
    addToast("Profil mis à jour avec succès !");
    handleClose();
    api.patch(`/users/${currentUser.id}`, { nom: newNom, prenom: newPrenom, avatar: newAvatar, email: form.email, emailPerso: form.emailPerso, dispos: form.dispos, competences: compsArray, statut: effectiveStatut, telephone, conges, profileVolontaire: form.profileVolontaire, emailPreferences: form.emailPreferences }).catch(console.error);
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.next) return setPwError("Remplissez tous les champs.");
    if (pwForm.next !== pwForm.confirm) return setPwError("Les mots de passe ne correspondent pas.");
    if (pwForm.next.length < 8) return setPwError("Minimum 8 caractères.");
    setPwLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      addToast("Mot de passe modifié !");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPwSection(false);
    } catch (e) {
      setPwError(e.message || "Mot de passe actuel incorrect.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
    {cropSrc && (
      <AvatarCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        userName={currentUser.nom}
        poleColor={POLE_COLORS[currentUser.pole]}
      />
    )}
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 6000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 460, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ padding: "22px 26px", background: `linear-gradient(135deg, ${POLE_COLORS[currentUser.pole] || "#0f2d5e"}, ${POLE_COLORS[currentUser.pole] || "#1a56db"}cc)`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <AvatarDisplay
              avatar={avatarPreview || currentUser.avatar}
              nom={currentUser.nom}
              size={52}
              bg="rgba(255,255,255,0.25)"
              color="#fff"
              fontSize={17}
              style={{ border: "2px solid rgba(255,255,255,0.4)" }}
            />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              title="Changer la photo"
              style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
            >
              <Camera size={10} strokeWidth={2} color="#1a56db" />
            </button>
            {isAvatarUrl(currentUser.avatar) && (
              <button
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                title="Supprimer la photo"
                style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#e63946", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
              >
                <X size={9} strokeWidth={2.5} color="#fff" />
              </button>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><Settings size={17} strokeWidth={1.8} /> Mon Profil Personnel</div>
            {(() => {
              const ROLE_ORDER = { edit: 0, view: 1 };
              const ROLE_LABEL = { edit: "Responsable", view: "Membre" };
              const perms = (currentUser.permissions || []).filter(p => p.pole && p.level !== "none");
              const sorted = [...perms].sort((a, b) => (ROLE_ORDER[a.level] ?? 2) - (ROLE_ORDER[b.level] ?? 2));
              if (sorted.length === 0) return <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{currentUser.role}</div>;
              return (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                  {sorted.map(p => (
                    <span key={p.pole} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.12)", borderRadius: 5, padding: "2px 7px" }}>
                      <span style={{ opacity: 0.75, fontSize: 10 }}>{ROLE_LABEL[p.level] || "Membre"}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 600 }}>{p.pole}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* BODY */}
        <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
            Mettez à jour vos informations. Elles seront visibles par le reste de l'équipe dans l'annuaire.
          </p>
          <div className="form-2col" style={{ gap: 12 }}>
            <div>
              <label className="form-label">Prénom</label>
              <input className="form-input" value={form.prenom} onChange={e => set("prenom", e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <label className="form-label">Nom</label>
              <input className="form-input" value={form.familyName} onChange={e => set("familyName", e.target.value)} placeholder="Nom de famille" />
            </div>
          </div>
          {/* ── STATUT + SECTION CONGÉS ── */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const activeConge = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
            const upcomingConges = conges.filter(c => c.debut > today).sort((a, b) => a.debut.localeCompare(b.debut));
            const pastConges = conges.filter(c => c.fin && c.fin < today).sort((a, b) => b.fin.localeCompare(a.fin));
            const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

            const addConge = () => {
              if (!newConge.debut) return;
              if (newConge.fin && newConge.fin < newConge.debut) return;
              const entry = { id: Date.now().toString(), debut: newConge.debut, fin: newConge.fin || null, motif: newConge.motif };
              setConges(prev => [...prev, entry]);
              setNewConge({ debut: "", fin: "", motif: "" });
              setShowCongeForm(false);
            };

            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const endCongeEarly = (id) => {
              setConges(prev => prev.map(c => c.id === id ? { ...c, fin: yesterday } : c));
            };

            const removeConge = (id) => setConges(prev => prev.filter(c => c.id !== id));

            return (
              <>
                {/* Statut — bloqué si congé actif */}
                <div>
                  <label className="form-label">Mon Statut</label>
                  {activeConge ? (
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Umbrella size={14} color="#f97316" strokeWidth={2} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>En congé</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                          {activeConge.fin ? `Retour prévu le ${fmt(activeConge.fin)}` : "Durée indéterminée"}
                          {activeConge.motif ? ` · ${activeConge.motif}` : ""}
                        </div>
                      </div>
                      {confirmEndId === activeConge.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Confirmer ?</span>
                          <button onClick={() => { endCongeEarly(activeConge.id); setConfirmEndId(null); }} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#f97316", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Oui</button>
                          <button onClick={() => setConfirmEndId(null)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "none", border: "1px solid var(--border-light)", color: "var(--text-muted)", cursor: "pointer" }}>Non</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmEndId(activeConge.id)}
                          style={{ fontSize: 10, padding: "4px 9px", borderRadius: 6, border: "1px solid rgba(249,115,22,0.4)", background: "none", color: "#f97316", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Terminer maintenant
                        </button>
                      )}
                    </div>
                  ) : (
                    <select className="form-select" value={form.statut} onChange={e => set("statut", e.target.value)}>
                      {Object.keys(MEMBER_STATUS).filter(s => s !== "En congé").map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                  {!activeConge && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                      Le statut "En congé" est géré automatiquement via les dates de congés.
                    </div>
                  )}
                </div>

                {/* Section congés */}
                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                      <Umbrella size={12} strokeWidth={1.8} /> Mes Congés
                    </div>
                    <button onClick={() => setShowCongeForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, border: "1px solid #1a56db", background: showCongeForm ? "rgba(26,86,219,0.1)" : "rgba(26,86,219,0.06)", color: "#1a56db", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      <Plus size={11} /> Déclarer
                    </button>
                  </div>

                  {/* Formulaire ajout */}
                  {showCongeForm && (
                    <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "14px", marginBottom: 12, border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-base)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <CalendarRange size={12} /> Nouvelle période de congé
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label className="form-label">Date de début *</label>
                          <input type="date" className="form-input" value={newConge.debut} onChange={e => setNewConge(v => ({ ...v, debut: e.target.value }))} />
                        </div>
                        <div>
                          <label className="form-label">Date de fin <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optionnel)</span></label>
                          <input type="date" className="form-input" min={newConge.debut || undefined} value={newConge.fin} onChange={e => setNewConge(v => ({ ...v, fin: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label className="form-label">Motif <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optionnel)</span></label>
                        <input className="form-input" placeholder="Vacances, raison personnelle…" value={newConge.motif} onChange={e => setNewConge(v => ({ ...v, motif: e.target.value }))} />
                      </div>
                      {!newConge.fin && newConge.debut && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, fontStyle: "italic" }}>
                          Sans date de fin, le congé restera actif jusqu'à ce que vous le terminiez manuellement.
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setShowCongeForm(false)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border-light)", background: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                        <button onClick={addConge} disabled={!newConge.debut} style={{ padding: "6px 14px", borderRadius: 7, background: "#1a56db", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !newConge.debut ? 0.5 : 1 }}>
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Congé actif */}
                  {activeConge && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.25)", marginBottom: 6 }}>
                      <Umbrella size={13} color="#f97316" strokeWidth={2} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>
                          En cours · {fmt(activeConge.debut)}{activeConge.fin ? ` → ${fmt(activeConge.fin)}` : " · Durée indéterminée"}
                        </div>
                        {activeConge.motif && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{activeConge.motif}</div>}
                      </div>
                      {confirmEndId === activeConge.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Confirmer ?</span>
                          <button onClick={() => { endCongeEarly(activeConge.id); setConfirmEndId(null); }} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: "#f97316", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Oui</button>
                          <button onClick={() => setConfirmEndId(null)} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: "none", border: "1px solid var(--border-light)", color: "var(--text-muted)", cursor: "pointer" }}>Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmEndId(activeConge.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f97316", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>Terminer</button>
                      )}
                      <button onClick={() => removeConge(activeConge.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}><Trash2 size={12} /></button>
                    </div>
                  )}

                  {/* Congés à venir */}
                  {upcomingConges.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "rgba(26,86,219,0.05)", border: "1px solid rgba(26,86,219,0.15)", marginBottom: 6 }}>
                      <CalendarRange size={13} color="#1a56db" strokeWidth={2} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)" }}>
                          Prévu · {fmt(c.debut)}{c.fin ? ` → ${fmt(c.fin)}` : " · Durée indéterminée"}
                        </div>
                        {c.motif && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{c.motif}</div>}
                      </div>
                      <button onClick={() => removeConge(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}><Trash2 size={12} /></button>
                    </div>
                  ))}

                  {/* Congés passés */}
                  {pastConges.slice(0, 3).map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--bg-hover)", marginBottom: 4, opacity: 0.6 }}>
                      <CalendarRange size={12} color="var(--text-muted)" strokeWidth={1.8} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(c.debut)} → {fmt(c.fin)}{c.motif ? ` · ${c.motif}` : ""}</div>
                      </div>
                    </div>
                  ))}

                  {conges.length === 0 && !showCongeForm && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0", fontStyle: "italic" }}>
                      Aucun congé déclaré
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          <div>
            <label className="form-label">Adresse Email</label>
            <input className="form-input" value={form.email} onChange={e => set("email", e.target.value)} placeholder="votre@email.com" />
          </div>
          <div>
            <label className="form-label">Numéro de téléphone</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={form.telDialCode}
                onChange={e => set("telDialCode", e.target.value)}
                style={{ width: 90, padding: "8px 6px", borderRadius: 8, border: "1.5px solid var(--border-light)", background: "var(--bg-surface)", fontSize: 13, color: "var(--text-base)", flexShrink: 0 }}
              >
                {[
                  { code: "+33", label: "🇫🇷 +33" },
                  { code: "+32", label: "🇧🇪 +32" },
                  { code: "+41", label: "🇨🇭 +41" },
                  { code: "+212", label: "🇲🇦 +212" },
                  { code: "+213", label: "🇩🇿 +213" },
                  { code: "+216", label: "🇹🇳 +216" },
                  { code: "+221", label: "🇸🇳 +221" },
                  { code: "+225", label: "🇨🇮 +225" },
                  { code: "+44", label: "🇬🇧 +44" },
                  { code: "+1",  label: "🇺🇸 +1"  },
                  { code: "+49", label: "🇩🇪 +49" },
                  { code: "+34", label: "🇪🇸 +34" },
                  { code: "+39", label: "🇮🇹 +39" },
                  { code: "+351", label: "🇵🇹 +351" },
                ].map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <input
                className="form-input"
                value={form.telNumber}
                onChange={e => set("telNumber", e.target.value)}
                placeholder="06 12 34 56 78"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Mes Disponibilités</label>
            <input className="form-input" placeholder="Ex: Soirs et week-ends, Jeudi après-midi..." value={form.dispos} onChange={e => set("dispos", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Mes Compétences <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>(séparées par une virgule)</span></label>
            <textarea
              className="form-input" rows={3}
              placeholder="Ex: Gestion de projet, Canva, Rédaction..."
              value={form.competences}
              onChange={e => set("competences", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Fiche bénévole (visible uniquement par les RH) */}
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Fiche bénévole</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(visible uniquement par les RH)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-2col" style={{ gap: 10 }}>
                <div>
                  <label className="form-label">Date de naissance</label>
                  <input type="date" className="form-input" value={form.profileVolontaire.dateNaissance} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, dateNaissance: e.target.value } }))} />
                </div>
                <div>
                  <label className="form-label">Adresse</label>
                  <input className="form-input" value={form.profileVolontaire.adresse} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, adresse: e.target.value } }))} placeholder="Ville ou adresse complète" />
                </div>
              </div>
              <div className="form-2col" style={{ gap: 10 }}>
                <div>
                  <label className="form-label">Contact d'urgence</label>
                  <input className="form-input" value={form.profileVolontaire.urgenceContact} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, urgenceContact: e.target.value } }))} placeholder="Prénom Nom" />
                </div>
                <div>
                  <label className="form-label">Tél. urgence</label>
                  <input className="form-input" value={form.profileVolontaire.urgenceTel} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, urgenceTel: e.target.value } }))} placeholder="06 XX XX XX XX" />
                </div>
              </div>
              <div>
                <label className="form-label">Motivation / Pourquoi j'ai rejoint l'association</label>
                <textarea className="form-input" rows={3} value={form.profileVolontaire.motivation} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, motivation: e.target.value } }))} placeholder="Décrivez votre motivation…" style={{ resize: "vertical" }} />
              </div>
              <div>
                <label className="form-label">Expériences passées</label>
                <textarea className="form-input" rows={3} value={form.profileVolontaire.experiencesPassees} onChange={e => setForm(f => ({ ...f, profileVolontaire: { ...f.profileVolontaire, experiencesPassees: e.target.value } }))} placeholder="Bénévolat antérieur, compétences professionnelles…" style={{ resize: "vertical" }} />
              </div>
            </div>
          </div>

          {/* ── PRÉFÉRENCES DE NOTIFICATIONS PAR EMAIL ── */}
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={12} strokeWidth={1.8} /> Notifications par email
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Email personnel de réception <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>(si différent de votre email de connexion)</span></label>
              <input
                className="form-input"
                value={form.emailPerso}
                onChange={e => set("emailPerso", e.target.value)}
                placeholder={form.email || "votre_email_perso@exemple.com"}
              />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                Laissez vide pour utiliser votre email de connexion : <strong>{form.email}</strong>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>Choisissez les types de notifications que vous souhaitez recevoir par email :</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "annonces",   label: "Annonces & notifications générales",  desc: "Informations envoyées à toute l'équipe ou à votre pôle" },
                { key: "taches",     label: "Tâches",                              desc: "Quand une tâche vous est assignée" },
                { key: "messagerie", label: "Messagerie",                           desc: "Nouveaux messages dans vos conversations" },
                { key: "evenements", label: "Événements",                           desc: "Rappels de séances et nouveaux événements" },
                { key: "notesFrais",    label: "Notes de frais",    desc: "Validation ou rejet de vos notes de frais" },
                { key: "missions",     label: "Missions",          desc: "Résultat de vos candidatures à une mission" },
                { key: "devisFactures", label: "Devis & Factures", desc: "Mises à jour sur vos dépôts (signature, refus, demande de modification)" },
              ].map(({ key, label, desc }) => (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: form.emailPreferences[key] ? "rgba(26,86,219,0.05)" : "var(--bg-hover)", border: `1px solid ${form.emailPreferences[key] ? "rgba(26,86,219,0.2)" : "var(--border-light)"}`, transition: "all 0.15s" }}>
                  <input
                    type="checkbox"
                    checked={!!form.emailPreferences[key]}
                    onChange={e => setForm(f => ({ ...f, emailPreferences: { ...f.emailPreferences, [key]: e.target.checked } }))}
                    style={{ width: 15, height: 15, marginTop: 1, accentColor: "#1a56db", flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-base)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section changement de mot de passe */}
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
            <button
              onClick={() => setShowPwSection(v => !v)}
              style={{ fontSize: 12, fontWeight: 600, color: "#1a56db", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
            >
              <KeyRound size={13} strokeWidth={1.8} /> {showPwSection ? "Masquer" : "Changer mon mot de passe"}
            </button>
            {showPwSection && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="form-label">Mot de passe actuel</label>
                  <input type="password" className="form-input" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} autoComplete="current-password" />
                </div>
                <div>
                  <label className="form-label">Nouveau mot de passe</label>
                  <input type="password" className="form-input" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} autoComplete="new-password" />
                </div>
                <div>
                  <label className="form-label">Confirmer le nouveau mot de passe</label>
                  <input type="password" className="form-input" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password" />
                </div>
                {pwError && <div style={{ fontSize: 12, color: "#e63946", background: "rgba(230,57,70,0.08)", padding: "8px 12px", borderRadius: 6 }}>{pwError}</div>}
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="btn-primary"
                  style={{ alignSelf: "flex-end", opacity: pwLoading ? 0.6 : 1 }}
                >
                  {pwLoading ? "Enregistrement…" : "Changer le mot de passe"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}>Enregistrer mes infos</button>
        </div>
      </div>
    </div>
    </>
  );
}
