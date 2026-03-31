// src/pages/Messagerie.jsx
import React, { useState, useRef, useEffect } from 'react';
import { fmtHeure } from '../utils/utils';
import { POLES, PROJETS } from '../data/constants';
import api from '../api/apiClient';
import { AvatarInner, isAvatarUrl, findMemberByName } from '../components/ui/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
import { MessageCircle, Users, Trash2, X, Plus, Paperclip, RotateCcw } from 'lucide-react';
import { MEMBER_STATUS } from '../components/ui/StatusIcon';

const DAY14 = 14 * 24 * 60 * 60 * 1000;

// eslint-disable-next-line no-unused-vars
const Messagerie = ({ globalChatContainerRef }) => {
  const { currentUser } = useAuth();
  const { addToast, setSelectedMemberProfile, setIsProfileModalOpen } = useAppContext();
  const { conversations, setConversations, directory, handleSendNotif, makeNotif } = useDataContext();
  const onSelectMember = (m) => { setSelectedMemberProfile(m); setIsProfileModalOpen(true); };
  const onMentionNotify = (nom, texte, chatTitre) => {
    const member = directory.find(m => m.nom === nom);
    if (!member) return;
    handleSendNotif({ titre: `Mention dans "${chatTitre}"`, contenu: texte, cible: 'personnes', targetUsers: [nom], priorite: 'normale', source: 'systeme' });
  };
  const [activeChatId, setActiveChatId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const [msgInput, setMsgInput] = useState("");
  const [tab, setTab] = useState("actives"); // "actives" | "corbeille"
  const [search, setSearch] = useState("");
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null); // string after @ or null
  const [mentionDropdown, setMentionDropdown] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]); // { nom, url, type, taille }
  const [fileUploading, setFileUploading] = useState(false);
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Formulaire nouvelle conversation
  const [newConvForm, setNewConvForm] = useState({ titre: "", membres: [], filterPole: "", filterProjet: "" });

  // Formulaire ajout de membre
  const [addMemberFilter, setAddMemberFilter] = useState({ search: "", pole: "", projet: "" });

  // Auto-scroll
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeChatId]);

  // Conversations actives (non supprimées)
  const activeConvs = conversations
    .filter(c => !c.isTrashed)
    .filter(c => !search || c.titre.toLowerCase().includes(search.toLowerCase()));

  // Conversations en corbeille (< 14 jours)
  const trashedConvs = conversations
    .filter(c => c.isTrashed && c.trashedAt && (Date.now() - c.trashedAt) < DAY14);

  const displayedConvs = tab === "corbeille" ? trashedConvs : activeConvs;
  const activeChat = conversations.find(c => c.id === activeChatId);

  // ── Détecter @mention dans l'input ───────────────────────────────────────
  const handleMsgChange = (e) => {
    const val = e.target.value;
    setMsgInput(val);
    // Détecter si on est en train de taper après un @
    const match = val.match(/@([\w\u00C0-\u017E ]*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      const filtered = directory.filter(m =>
        m.nom !== currentUser.nom &&
        m.nom.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setMentionDropdown(filtered);
    } else {
      setMentionQuery(null);
      setMentionDropdown([]);
    }
  };

  const insertMention = (memberName) => {
    const newVal = msgInput.replace(/@([\w\u00C0-\u017E ]*)$/, `@${memberName} `);
    setMsgInput(newVal);
    setMentionQuery(null);
    setMentionDropdown([]);
    inputRef.current?.focus();
  };

  // ── Upload fichier ────────────────────────────────────────────────────────
  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setFileUploading(true);
    const uploaded = [];
    for (const f of files) {
      try {
        const formData = new FormData();
        formData.append('file', f);
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await res.json();
        uploaded.push(data);
      } catch {
        uploaded.push({ nom: f.name, url: null, type: f.name.split('.').pop().toUpperCase(), taille: `${Math.round(f.size / 1024)} Ko` });
      }
    }
    setAttachedFiles(prev => [...prev, ...uploaded]);
    setFileUploading(false);
    e.target.value = '';
  };

  // ── Envoyer un message ────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!msgInput.trim() && attachedFiles.length === 0) return;
    if (!activeChat) return;
    const texte = msgInput.trim();
    const fichiers = attachedFiles;
    const tempMsg = { id: Date.now(), auteur: currentUser.nom, avatar: currentUser.avatar, texte: texte || "(fichier)", heure: fmtHeure(), fichiers };
    setConversations(prev => prev.map(c =>
      c.id === activeChat.id
        ? { ...c, messages: [...c.messages, tempMsg] }
        : c
    ));
    setAttachedFiles([]);
    api.post(`/messagerie/conversations/${activeChat.id}/messages`, { texte: tempMsg.texte, fichiers }).catch(console.error);

    // Détecter les @mentions et notifier les membres concernés
    const mentionRegex = /@([\w\u00C0-\u017E]+(?: [\w\u00C0-\u017E]+)*)/g;
    let match;
    const notified = new Set();
    while ((match = mentionRegex.exec(texte)) !== null) {
      const name = match[1];
      const member = directory.find(m => m.nom === name);
      if (member && member.nom !== currentUser.nom && !notified.has(name)) {
        notified.add(name);
        onMentionNotify && onMentionNotify(member.nom, texte, activeChat.titre);
      }
    }

    setMsgInput("");
    setMentionQuery(null);
    setMentionDropdown([]);
  };

  // ── Supprimer (corbeille) ─────────────────────────────────────────────────
  const trashConversation = (convId) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, isTrashed: true, trashedAt: Date.now() } : c
    ));
    setActiveChatId(null);
    setShowConvMenu(false);
    addToast && addToast("Conversation déplacée dans la corbeille");
    api.put(`/messagerie/conversations/${convId}`, { isTrashed: true }).catch(console.error);
  };

  // ── Restaurer depuis la corbeille ─────────────────────────────────────────
  const restoreConversation = (convId) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, isTrashed: false, trashedAt: null } : c
    ));
    addToast && addToast("Conversation restaurée");
    api.put(`/messagerie/conversations/${convId}`, { isTrashed: false }).catch(console.error);
  };

  // ── Supprimer définitivement ──────────────────────────────────────────────
  const deleteConversation = (convId) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    setActiveChatId(null);
    api.delete(`/messagerie/conversations/${convId}`)
      .catch(err => addToast && addToast(`Erreur suppression : ${err?.message || 'Erreur serveur'}`, 'error'));
    addToast && addToast("Conversation supprimée définitivement");
  };

  // ── Créer une nouvelle conversation ──────────────────────────────────────
  const createConversation = async () => {
    if (!newConvForm.titre.trim() || newConvForm.membres.length === 0) return;
    const membres = [currentUser.nom, ...newConvForm.membres.filter(m => m !== currentUser.nom)];
    const tempConv = {
      id: Date.now(),
      titre: newConvForm.titre.trim(),
      type: membres.length === 1 ? "individuel" : "groupe",
      membres,
      isTrashed: false,
      trashedAt: null,
      messages: [],
    };
    setConversations(prev => [tempConv, ...prev]);
    setActiveChatId(tempConv.id);
    setShowNewConvModal(false);
    setNewConvForm({ titre: "", membres: [], filterPole: "", filterProjet: "" });
    addToast && addToast("Conversation créée");
    try {
      const created = await api.post('/messagerie/conversations', { titre: tempConv.titre, type: tempConv.type, membres });
      setConversations(prev => prev.map(c => c.id === tempConv.id ? { ...c, id: created.id } : c));
      setActiveChatId(created.id);
    } catch (e) { console.error(e); }
  };

  // ── Ajouter un membre à la conv active ───────────────────────────────────
  const addMemberToConv = (memberName) => {
    if (!activeChat) return;
    if ((activeChat.membres || []).includes(memberName)) return;
    const newMembres = [...(activeChat.membres || []), memberName];
    setConversations(prev => prev.map(c =>
      c.id === activeChat.id ? { ...c, membres: newMembres } : c
    ));
    addToast && addToast(`${memberName} ajouté(e) à la conversation`);
    api.put(`/messagerie/conversations/${activeChat.id}`, { membres: newMembres }).catch(console.error);
    // Notifier le membre ajouté
    onMentionNotify && onMentionNotify(memberName, `${currentUser.nom} vous a ajouté(e) à la conversation "${activeChat.titre}".`, activeChat.titre);
  };

  // ── Filtrer les membres disponibles ──────────────────────────────────────
  const getFilteredDirectory = (form) => {
    let members = directory.filter(m => m.nom !== currentUser.nom);
    if (form.pole) members = members.filter(m =>
      m.pole === form.pole ||
      (m.permissions || []).some(p => p.pole === form.pole && p.level !== 'none')
    );
    if (form.projet) members = members.filter(m =>
      (m.projets || []).includes(form.projet) ||
      (m.permissions || []).some(p => p.pole === form.projet && p.level !== 'none')
    );
    if (form.search) members = members.filter(m => m.nom.toLowerCase().includes(form.search.toLowerCase()));
    return members;
  };

  // ── Sélectionner tous les membres d'un pôle/projet ───────────────────────
  const selectAllFiltered = () => {
    const filtered = getFilteredDirectory({ pole: newConvForm.filterPole, projet: newConvForm.filterProjet, search: "" });
    const names = filtered.map(m => m.nom);
    setNewConvForm(f => ({ ...f, membres: [...new Set([...f.membres, ...names])] }));
  };

  return (
    <>
      <div className="eyebrow">Communication</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <div className="ptitle" style={{ marginBottom: 0 }}>Messagerie Interne</div>
        <button className="btn-primary" onClick={() => setShowNewConvModal(true)}><Plus size={13} strokeWidth={2.5} /> Nouvelle conversation</button>
      </div>

      <div className="event-layout" style={{ minHeight: isMobile ? "auto" : "600px", height: isMobile ? "auto" : "calc(100vh - 180px)" }} data-tour="messagerie-main">
        {/* ── COLONNE GAUCHE ──────────────────────────────────────────────── */}
        <div className="event-list" style={{ width: isMobile ? "100%" : "300px", display: isMobile && activeChatId ? "none" : "flex", flexDirection: "column", minHeight: isMobile ? 300 : undefined }}>
          {/* Onglets */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
            <button onClick={() => { setTab("actives"); setActiveChatId(null); }} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, background: "none", border: "none", cursor: "pointer", borderBottom: tab === "actives" ? "2px solid #1a56db" : "2px solid transparent", color: tab === "actives" ? "#1a56db" : "var(--text-muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MessageCircle size={13} strokeWidth={1.8} /> Discussions</span>
            </button>
            <button onClick={() => { setTab("corbeille"); setActiveChatId(null); }} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, background: "none", border: "none", cursor: "pointer", borderBottom: tab === "corbeille" ? "2px solid #e63946" : "2px solid transparent", color: tab === "corbeille" ? "#e63946" : "var(--text-muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.8} /> Corbeille {trashedConvs.length > 0 && `(${trashedConvs.length})`}</span>
            </button>
          </div>

          {/* Recherche (actives seulement) */}
          {tab === "actives" && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
              <input type="text" className="form-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 12 }} />
            </div>
          )}

          {/* Liste */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {displayedConvs.length === 0 && (
              <div className="empty">
                {tab === "corbeille" ? "Corbeille vide" : "Aucune conversation"}
              </div>
            )}
            {displayedConvs.map(c => {
              const lastMsg = c.messages[c.messages.length - 1];
              const daysLeft = c.trashedAt ? Math.ceil((DAY14 - (Date.now() - c.trashedAt)) / 86400000) : null;
              return (
                <div
                  key={c.id}
                  className={`event-item ${activeChatId === c.id ? "active" : ""}`}
                  onClick={() => setActiveChatId(c.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)", marginBottom: 3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.type === "groupe" ? <><Users size={11} strokeWidth={1.8} style={{ marginRight: 4, display: "inline" }} /></> : <><MessageCircle size={11} strokeWidth={1.8} style={{ marginRight: 4, display: "inline" }} /></>}{c.titre}
                    </div>
                    {tab === "corbeille" && (
                      <span style={{ fontSize: 9, color: "#e63946", fontWeight: 700, marginLeft: 6, whiteSpace: "nowrap" }}>
                        {daysLeft}j
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastMsg ? `${lastMsg.auteur}: ${lastMsg.texte}` : "Aucun message"}
                  </div>
                  {tab === "corbeille" && (
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); restoreConversation(c.id); }} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                        Restaurer
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(230,57,70,0.1)", color: "#e63946", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLONNE DROITE : CHAT ────────────────────────────────────────── */}
        <div className="event-detail" style={{ padding: 0, display: isMobile && !activeChatId ? "none" : "flex", flexDirection: "column" }}>
          {activeChat ? (
            <>
              {/* En-tête conversation */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isMobile && (
                    <button onClick={() => setActiveChatId(null)} style={{ background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 8, cursor: "pointer", color: "var(--text-base)", padding: "6px 10px", display: "flex", alignItems: "center", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                      ‹
                    </button>
                  )}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{activeChat.titre}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      {(activeChat.membres || []).join(", ")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!activeChat.isTrashed && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      style={{ fontSize: 11, padding: "5px 12px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                    >
                      + Ajouter
                    </button>
                  )}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowConvMenu(v => !v)}
                      style={{ fontSize: 16, padding: "5px 10px", background: "none", border: "1px solid var(--border-light)", borderRadius: 6, cursor: "pointer", color: "var(--text-dim)" }}
                    >⋮</button>
                    {showConvMenu && (
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000, minWidth: 160, overflow: "hidden" }}>
                        {!activeChat.isTrashed && (
                          <button
                            onClick={() => { trashConversation(activeChat.id); setShowConvMenu(false); }}
                            style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12, color: "#e63946", display: "flex", alignItems: "center", gap: 8 }}
                          >
                            <Trash2 size={13} strokeWidth={1.8} /> Supprimer la conversation
                          </button>
                        )}
                        {activeChat.isTrashed && (
                          <>
                            <button onClick={() => { restoreConversation(activeChat.id); setShowConvMenu(false); }} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12, color: "#1a56db", display: "flex", alignItems: "center", gap: 8 }}>
                              <RotateCcw size={13} strokeWidth={1.8} /> Restaurer
                            </button>
                            <button onClick={() => { deleteConversation(activeChat.id); setShowConvMenu(false); }} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 12, color: "#e63946", display: "flex", alignItems: "center", gap: 8 }}>
                              <Trash2 size={13} strokeWidth={1.8} /> Supprimer définitivement
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, background: "var(--bg-alt)" }} onClick={() => setShowConvMenu(false)}>
                {activeChat.messages.length === 0 && (
                  <div className="empty" style={{ flex: 1 }}>Aucun message. Commencez la discussion !</div>
                )}
                {activeChat.messages.map((m, i) => {
                  const isMe = m.auteur === currentUser.nom;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, alignItems: "flex-end" }}>
                      {!isMe && (() => {
                        const senderMember = findMemberByName(directory, m.auteur);
                        return (
                          <div
                            onClick={() => senderMember && onSelectMember && onSelectMember(senderMember)}
                            style={{ width: 28, height: 28, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", flexShrink: 0, cursor: senderMember ? "pointer" : "default", overflow: "hidden" }}
                            title={senderMember ? `Voir le profil de ${m.auteur}` : m.auteur}
                          >
                            <AvatarInner avatar={m.avatar} nom={m.auteur} />
                          </div>
                        );
                      })()}
                      <div style={{ maxWidth: "70%" }}>
                        {!isMe && (() => {
                          const senderMember = findMemberByName(directory, m.auteur);
                          return (
                            <div
                              onClick={() => senderMember && onSelectMember && onSelectMember(senderMember)}
                              style={{ fontSize: 10, color: senderMember ? "#1a56db" : "var(--text-muted)", marginBottom: 3, marginLeft: 2, cursor: senderMember ? "pointer" : "default", fontWeight: senderMember ? 600 : 400 }}
                            >{m.auteur}</div>
                          );
                        })()}
                        <div style={{ background: isMe ? "#1a56db" : "var(--bg-surface)", color: isMe ? "#fff" : "var(--text-base)", padding: "10px 14px", borderRadius: isMe ? "16px 16px 0 16px" : "16px 16px 16px 0", border: isMe ? "none" : "1px solid var(--border-light)", fontSize: 13, lineHeight: 1.4 }}>
                          {m.texte && m.texte !== "(fichier)" && m.texte.split(/(@[\w\u00C0-\u017E]+(?: [\w\u00C0-\u017E]+)*)/).map((part, pi) =>
                            part.startsWith("@") ? (
                              <span key={pi} style={{ fontWeight: 700, background: isMe ? "rgba(255,255,255,0.2)" : "rgba(26,86,219,0.12)", color: isMe ? "#fff" : "#1a56db", borderRadius: 4, padding: "1px 4px" }}>{part}</span>
                            ) : part
                          )}
                          {m.fichiers && m.fichiers.length > 0 && (
                            <div style={{ marginTop: m.texte && m.texte !== "(fichier)" ? 8 : 0, display: "flex", flexDirection: "column", gap: 4 }}>
                              {m.fichiers.map((f, fi) => (
                                <a key={fi} href={f.url ? `${SERVER_URL}${f.url}` : "#"} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: isMe ? "rgba(255,255,255,0.9)" : "#1a56db", textDecoration: "none", background: isMe ? "rgba(255,255,255,0.15)" : "rgba(26,86,219,0.08)", padding: "4px 8px", borderRadius: 6 }}>
                                  <Paperclip size={11} strokeWidth={1.8} /> <span style={{ fontWeight: 600 }}>{f.nom}</span>
                                  {f.taille && <span style={{ opacity: 0.7 }}>{f.taille}</span>}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 3, textAlign: isMe ? "right" : "left" }}>{m.heure}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>

              {/* Zone de saisie */}
              {!activeChat.isTrashed && (
                <div style={{ padding: 14, borderTop: "1px solid var(--border-light)", background: "var(--bg-surface)", flexShrink: 0 }}>
                  {/* Dropdown @mention */}
                  {mentionDropdown.length > 0 && (
                    <div style={{ marginBottom: 8, background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                      {mentionDropdown.map(m => (
                        <div
                          key={m.id}
                          onMouseDown={(e) => { e.preventDefault(); insertMention(m.nom); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                            <AvatarInner avatar={m.avatar} nom={m.nom} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-base)" }}>{m.nom}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.pole}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {attachedFiles.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {attachedFiles.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(26,86,219,0.08)", border: "1px solid rgba(26,86,219,0.2)", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Paperclip size={11} strokeWidth={1.8} /> {f.nom}</span>
                          <span style={{ color: "var(--text-muted)" }}>{f.taille}</span>
                          <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#e63946", display: "inline-flex" }}><X size={12} strokeWidth={2} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFileAttach} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={fileUploading}
                      style={{ flexShrink: 0, padding: "8px 10px", background: "var(--bg-alt)", border: "1px solid var(--border-light)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--text-dim)", opacity: fileUploading ? 0.5 : 1 }}
                      title="Joindre un fichier"
                    >
                      <Paperclip size={15} strokeWidth={1.8} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      className="form-input"
                      placeholder="Écrivez un message… @ pour mentionner"
                      value={msgInput}
                      onChange={handleMsgChange}
                      onKeyDown={e => {
                        if (e.key === "Enter" && mentionDropdown.length === 0) sendMessage();
                        if (e.key === "Escape") { setMentionQuery(null); setMentionDropdown([]); }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-primary" onClick={sendMessage}>Envoyer</button>
                  </div>
                </div>
              )}
              {activeChat.isTrashed && (
                <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--text-muted)", background: "var(--bg-alt)", borderTop: "1px solid var(--border-light)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.8} /> Conversation dans la corbeille — <span style={{ color: "#1a56db", cursor: "pointer", fontWeight: 600 }} onClick={() => restoreConversation(activeChat.id)}>Restaurer</span></span>
                </div>
              )}
            </>
          ) : (
            <div className="empty" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 32 }}><MessageCircle size={40} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} /></div>
              <div>Sélectionnez une conversation</div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALE NOUVELLE CONVERSATION ──────────────────────────────────────── */}
      {showNewConvModal && (
        <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setShowNewConvModal(false)}>
          <div className="modal-box" style={{ width: "100%", maxWidth: 520, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title"><MessageCircle size={16} strokeWidth={1.8} /> Nouvelle conversation</div>
              <button className="modal-close-btn" onClick={() => setShowNewConvModal(false)}><X size={14} strokeWidth={2} /></button>
            </div>

            <div className="modal-body" style={{ gap: 16 }}>
              {/* Nom */}
              <div>
                <label className="form-label">Nom de la conversation *</label>
                <input type="text" className="form-input" placeholder="Ex: Réunion pole comm…" value={newConvForm.titre} onChange={e => setNewConvForm(f => ({ ...f, titre: e.target.value }))} />
              </div>

              {/* Filtres */}
              <div className="form-2col" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Filtrer par pôle</label>
                  <select className="form-select" value={newConvForm.filterPole} onChange={e => setNewConvForm(f => ({ ...f, filterPole: e.target.value }))}>
                    <option value="">Tous</option>
                    {POLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Filtrer par projet</label>
                  <select className="form-select" value={newConvForm.filterProjet} onChange={e => setNewConvForm(f => ({ ...f, filterProjet: e.target.value }))}>
                    <option value="">Tous</option>
                    {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Sélection membres */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Participants *</label>
                  <button onClick={selectAllFiltered} style={{ fontSize: 10, padding: "2px 10px", background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                    Sélectionner tous
                  </button>
                </div>
                <div className="form-2col" style={{ gap: 6, maxHeight: 200, overflowY: "auto", padding: 10, background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  {getFilteredDirectory({ pole: newConvForm.filterPole, projet: newConvForm.filterProjet, search: "" }).map(m => {
                    const isSelected = newConvForm.membres.includes(m.nom);
                    return (
                      <div key={m.id} onClick={() => setNewConvForm(f => ({ ...f, membres: isSelected ? f.membres.filter(x => x !== m.nom) : [...f.membres, m.nom] }))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`, transition: "all 0.15s" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: isSelected ? "#1a56db" : isAvatarUrl(m.avatar) ? "transparent" : "var(--bg-alt)", color: isSelected ? "#fff" : "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                          {isSelected ? "✓" : <AvatarInner avatar={m.avatar} nom={m.nom} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-base)", display: "flex", alignItems: "center", gap: 4 }}>
                            {m.nom}
                            {(() => { const s = MEMBER_STATUS[m.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.pole}</div>
                        </div>
                      </div>
                    );
                  })}
                  {getFilteredDirectory({ pole: newConvForm.filterPole, projet: newConvForm.filterProjet, search: "" }).length === 0 && (
                    <div style={{ gridColumn: "span 2", textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: 16 }}>Aucun membre trouvé</div>
                  )}
                </div>
                {newConvForm.membres.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
                    {newConvForm.membres.length} participant{newConvForm.membres.length > 1 ? "s" : ""} sélectionné{newConvForm.membres.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewConvModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={createConversation} disabled={!newConvForm.titre.trim() || newConvForm.membres.length === 0} style={{ opacity: (!newConvForm.titre.trim() || newConvForm.membres.length === 0) ? 0.5 : 1 }}>
                Créer la conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE AJOUTER UN MEMBRE ───────────────────────────────────────────── */}
      {showAddMemberModal && activeChat && (
        <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-box" style={{ width: "100%", maxWidth: 420, maxHeight: "70vh" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title"><Plus size={15} strokeWidth={2} /> Ajouter des participants</div>
              <button className="modal-close-btn" onClick={() => setShowAddMemberModal(false)}><X size={14} strokeWidth={2} /></button>
            </div>

            <div className="modal-body" style={{ gap: 12 }}>
              {/* Filtres */}
              <div className="form-2col" style={{ gap: 10 }}>
                <div>
                  <label className="form-label">Pôle</label>
                  <select className="form-select" value={addMemberFilter.pole} onChange={e => setAddMemberFilter(f => ({ ...f, pole: e.target.value }))}>
                    <option value="">Tous</option>
                    {POLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Projet</label>
                  <select className="form-select" value={addMemberFilter.projet} onChange={e => setAddMemberFilter(f => ({ ...f, projet: e.target.value }))}>
                    <option value="">Tous</option>
                    {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <input type="text" className="form-input" placeholder="Rechercher…" value={addMemberFilter.search} onChange={e => setAddMemberFilter(f => ({ ...f, search: e.target.value }))} style={{ fontSize: 12 }} />

              {/* Liste */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {getFilteredDirectory(addMemberFilter)
                  .filter(m => !(activeChat.membres || []).includes(m.nom))
                  .map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-alt)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isAvatarUrl(m.avatar) ? "transparent" : "#1a56db", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                        <AvatarInner avatar={m.avatar} nom={m.nom} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{m.nom}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.pole}</div>
                      </div>
                      <button onClick={() => { addMemberToConv(m.nom); }} style={{ fontSize: 11, padding: "4px 12px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                        + Ajouter
                      </button>
                    </div>
                  ))}
                {getFilteredDirectory(addMemberFilter).filter(m => !(activeChat.membres || []).includes(m.nom)).length === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: 16 }}>Tous les membres sont déjà dans la conversation</div>
                )}
              </div>

              {/* Membres actuels */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Membres actuels</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(activeChat.membres || []).map((nom, i) => (
                    <span key={i} style={{ fontSize: 11, background: "rgba(26,86,219,0.1)", color: "#1a56db", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>{nom}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Messagerie;
