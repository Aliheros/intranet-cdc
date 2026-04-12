// src/components/layout/Layout.jsx
import React, { useState, useRef, useEffect } from 'react';
import { AvatarInner, isAvatarUrl } from '../ui/AvatarDisplay';
import { POLE_COLORS, PROJET_COLORS } from '../../data/constants';
import { SPACE_LOGO } from '../../data/spaceLogos';
import { LogOut, Moon, Sun, Settings, Search, X, Bell, ClipboardList, MessageCircle, LayoutDashboard, Zap, Users, Receipt, Crown, Shield, Calendar, User, Target, Menu, ExternalLink, HelpCircle, FileSignature, BarChart2, ChevronRight } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { useAppContext } from '../../contexts/AppContext';

const Layout = ({ children, page, setPage, subPage, setSubPage, setActiveTab, darkMode, setDarkMode, currentUser, isAdmin = false, isBureau = false, accessiblePoles = [], accessibleProjets = [], myTeamSpaces = [], onOpenProfile, onOpenMyProfile, onRemoveAvatar, onLogout, globalQuery = "", setGlobalQuery, upcomingNotifications = [], notifBadgeCount = 0, onOpenNotifPanel, bannerHeight = 0, directory = [], actions = [], evenements = [], missions = [], onSelectMember, onSelectAction, onSelectEvent, onSelectMission }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const mainRef = useRef(null);

  // Pause gradient + backdrop-filter pendant le scroll
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let timer;
    const onScroll = () => {
      el.classList.add('scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('scrolling'), 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, []);

  const { notifLues, setNotifLues, visibleNotifs, personalNotifs } = useDataContext();
  const { contextBar, freshLogin } = useAppContext();

  const PAGE_LABELS = {
    dashboard: 'Tableau de bord', actions: 'Suivi des actions', coordination: 'Coordination',
    planning: 'Planning', annuaire: 'Annuaire & RH', messagerie: 'Messagerie',
    analytics: 'Analytics', notefrais: 'Notes de frais', devisFactures: 'Devis & Factures',
    faq: 'FAQ', bureau: 'Espace Bureau', admin: 'Administration',
  };
  const currentPageLabel = (page === 'pole' || page === 'projet') ? subPage : (PAGE_LABELS[page] || page);

  const NOTIF_ICON  = { annonce: '📢', task: '✅', seance: '📅' };
  const NOTIF_COLOR = { annonce: 'rgba(124,58,237,.1)', task: 'rgba(22,163,74,.1)', seance: 'rgba(8,145,178,.1)' };

  const handleMarkAllRead = () => {
    const allIds = [
      ...visibleNotifs.map(n => n.id),
      ...personalNotifs.map(n => n.id),
    ].filter(id => !notifLues.includes(id));
    if (allIds.length > 0) setNotifLues(prev => [...prev, ...allIds]);
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.closest('[data-search-container]')?.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ferme la sidebar si on redimensionne vers desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navGroups = [
    {
      id: "main",
      label: null,
      items: [
        { id: "dashboard", label: "Tableau de bord", IconComp: LayoutDashboard },
      ],
    },
    {
      id: "terrain",
      label: "Terrain",
      items: [
        { id: "actions", label: "Suivi des actions", IconComp: ClipboardList },
        { id: "coordination", label: "Coordination", IconComp: Zap },
        { id: "planning", label: "Planning", IconComp: Calendar },
      ],
    },
    {
      id: "equipe",
      label: "Équipe",
      items: [
        { id: "annuaire", label: "Annuaire & RH", IconComp: Users },
        { id: "messagerie", label: "Messagerie", IconComp: MessageCircle },
      ],
    },
    {
      id: "gestion",
      label: "Gestion",
      items: [
        { id: "analytics",      label: "Analytics",        IconComp: BarChart2 },
        { id: "notefrais",      label: "Notes de frais",   IconComp: Receipt },
        { id: "devisFactures",  label: "Devis & Factures", IconComp: FileSignature },
        { id: "faq",            label: "FAQ",              IconComp: HelpCircle },
        ...(isAdmin || isBureau ? [{ id: "bureau", label: "Espace Bureau", IconComp: Crown }] : []),
        ...(isAdmin ? [{ id: "admin", label: "Administration", IconComp: Shield }] : []),
      ],
    },
  ];

  const myPoles = [currentUser.pole].filter(Boolean);
  const myProjets = (currentUser.projets || []).filter(Boolean);

  // Fusion pôle/projets principaux + espaces d'équipe — déduplication par nom d'espace
  const mySpaceEntries = (() => {
    const entries = [];
    const seen = new Set();
    myPoles.forEach(p => { if (!seen.has(p)) { seen.add(p); entries.push({ space: p, role: null, type: 'pole' }); } });
    myProjets.forEach(p => { if (!seen.has(p)) { seen.add(p); entries.push({ space: p, role: null, type: 'projet' }); } });
    myTeamSpaces.forEach(e => { if (!seen.has(e.space)) { seen.add(e.space); entries.push(e); } else {
      // Enrichir avec le rôle si déjà présent comme pôle/projet principal
      const existing = entries.find(x => x.space === e.space);
      if (existing && !existing.role) existing.role = e.role;
    }});
    return entries;
  })();

  // Sections "Pôles" et "Projets" : uniquement les espaces PAS déjà dans Mon espace
  const mySpaceNames = new Set(mySpaceEntries.map(e => e.space));
  const extraPoles = accessiblePoles.filter(p => !mySpaceNames.has(p));
  const extraProjets = accessibleProjets.filter(p => !mySpaceNames.has(p));

  const ROLE_LABEL_SHORT = { Responsable: 'Resp.', Membre: 'Mbr', Observateur: 'Obs.' };

  const handleNav = (p, sp = "", tab = "contenu") => {
    setPage(p);
    setSubPage(sp);
    if (setActiveTab) setActiveTab(tab);
    setSidebarOpen(false);
    // Sync hash sans rechargement
    const hash = (!p || p === 'dashboard') ? '#dashboard'
      : (p === 'pole' || p === 'projet') ? `#${p}/${encodeURIComponent(sp)}`
      : `#${p}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  };

  // Calcule le href pour un lien sidebar (permet clic droit → nouvel onglet)
  const navHref = (p, sp = "") =>
    (!p || p === 'dashboard') ? '#dashboard'
    : (p === 'pole' || p === 'projet') ? `#${p}/${encodeURIComponent(sp)}`
    : `#${p}`;

  // Handler qui intercepte le clic simple (navigation SPA) tout en laissant
  // clic droit / ctrl+clic / middle-clic ouvrir un vrai nouvel onglet
  const navClick = (e, p, sp = "", tab = "contenu") => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // laisser le browser gérer
    e.preventDefault();
    handleNav(p, sp, tab);
  };

  const openProfile = onOpenMyProfile || onOpenProfile;

  // Éléments de la barre de navigation mobile du bas
  const bottomNavItems = [
    { id: "dashboard",    label: "Accueil",    IconComp: LayoutDashboard },
    { id: "actions",      label: "Actions",    IconComp: ClipboardList },
    { id: "messagerie",   label: "Messages",   IconComp: MessageCircle },
    { id: "annuaire",     label: "Annuaire",   IconComp: Users },
  ];

  return (
    <div className={`app ${darkMode ? "dark-theme" : "light-theme"}`}>

      {/* Overlay post-login : même dégradé que le loader, s'évapore en 5s */}
      {freshLogin && <div className="app-dark-overlay" aria-hidden="true" />}

      {/* ── BARRE DU HAUT MOBILE ──────────────────────────────────────────────── */}
      <div className="mobile-topbar mobile-only" style={{ alignItems: "center" }}>
        <button
          onClick={() => setSidebarOpen(s => !s)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#e63946", color: "#fff", fontFamily: "var(--font-display)", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2 }}>Intranet</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>Cité des Chances</span>
        </div>

        <button
          onClick={onOpenNotifPanel}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", position: "relative" }}
        >
          <Bell size={20} strokeWidth={1.8} />
          {notifBadgeCount > 0 && (
            <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#e63946", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {notifBadgeCount > 9 ? "9+" : notifBadgeCount}
            </span>
          )}
        </button>
      </div>

      <div className="body-row">

        {/* ── OVERLAY SIDEBAR MOBILE ─────────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 8400, backdropFilter: "blur(2px)" }}
          />
        )}

        {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}${freshLogin ? " login-transition" : ""}`} data-tour="sidebar">

          <div className="s-top" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: sidebarCollapsed ? "20px 0 16px" : "20px 20px 16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <img
                src="/logoCDC.png"
                alt="Cité Des Chances"
                style={{ width: sidebarCollapsed ? 36 : 80, height: "auto", display: "block", imageRendering: "auto", transition: "width 0.3s" }}
              />
              {!sidebarCollapsed && (
                <div style={{ textAlign: "center", lineHeight: 1.35 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                    Cité des Chances
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>
                    Intranet · Espace membres
                  </div>
                  <a
                    href="https://www.citedeschances.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 6,
                      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                  >
                    <ExternalLink size={10} strokeWidth={2} />
                    Extranet
                  </a>
                </div>
              )}
            </div>
            {/* Bouton fermer (mobile uniquement) */}
            <button
              className="mobile-only"
              onClick={() => setSidebarOpen(false)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <nav className="nav">
            {navGroups.map((group, gi) => (
              <div key={group.id}>
                {group.label ? (
                  <div className="ns" style={{ marginTop: gi > 0 ? 14 : 4, cursor: "default", pointerEvents: "none", display: "flex", justifyContent: sidebarCollapsed ? "center" : "space-between", alignItems: "center", padding: sidebarCollapsed ? "8px 0 4px" : undefined }}>
                    {!sidebarCollapsed && group.label}
                    {!sidebarCollapsed && group.id === "main" && notifBadgeCount > 0 && (
                      <span style={{ background: "#e63946", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {notifBadgeCount > 9 ? "9+" : notifBadgeCount}
                      </span>
                    )}
                    {sidebarCollapsed && <span style={{ display: "block", width: 20, height: 1, background: "rgba(255,255,255,0.12)", borderRadius: 1 }} />}
                  </div>
                ) : (
                  <div style={{ paddingTop: 8 }} />
                )}
                {group.items.map((item) => (
                  <a key={item.id} href={navHref(item.id)} className={`ni ${page === item.id ? "active" : ""}${sidebarCollapsed ? " ni-collapsed" : ""}`} onClick={e => navClick(e, item.id)} style={{ textDecoration: 'none', justifyContent: sidebarCollapsed ? "center" : undefined, padding: sidebarCollapsed ? "9px 0" : undefined }} title={sidebarCollapsed ? item.label : undefined}>
                    <span style={{ display: "inline-flex", alignItems: "center", marginRight: sidebarCollapsed ? 0 : 8, opacity: page === item.id ? 1 : 0.6 }}>
                      <item.IconComp size={15} strokeWidth={1.8} />
                    </span>
                    {!sidebarCollapsed && item.label}
                    {!sidebarCollapsed && item.id === "dashboard" && notifBadgeCount > 0 && (
                      <span style={{ marginLeft: "auto", background: "#e63946", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {notifBadgeCount > 9 ? "9+" : notifBadgeCount}
                      </span>
                    )}
                    {sidebarCollapsed && item.id === "dashboard" && notifBadgeCount > 0 && (
                      <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#e63946" }} />
                    )}
                  </a>
                ))}
              </div>
            ))}

            {mySpaceEntries.length > 0 && (
              <>
                {!sidebarCollapsed && <div className="ns" style={{ marginTop: 14 }}>Mon espace</div>}
                {sidebarCollapsed && <div className="ns" style={{ marginTop: 14, padding: "8px 0 4px", justifyContent: "center" }}><span style={{ display: "block", width: 20, height: 1, background: "rgba(255,255,255,0.12)", borderRadius: 1 }} /></div>}
                {mySpaceEntries.map(({ space, role, type }) => {
                  const color = POLE_COLORS[space] || PROJET_COLORS[space] || '#94a3b8';
                  const pageType = type === 'pole' ? "pole" : "projet";
                  const isActive = page === pageType && subPage === space;
                  return (
                    <a key={space} href={navHref(pageType, space)} className={`ni ${isActive ? "active" : ""}${sidebarCollapsed ? " ni-collapsed" : ""}`} onClick={e => navClick(e, pageType, space)} style={{ textDecoration: 'none', justifyContent: sidebarCollapsed ? "center" : undefined, padding: sidebarCollapsed ? "7px 0" : undefined }} title={sidebarCollapsed ? space : undefined}>
                      {sidebarCollapsed ? (
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: color, flexShrink: 0 }}>
                          {SPACE_LOGO[space] || <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{space.charAt(0).toUpperCase()}</span>}
                        </span>
                      ) : (
                        <>
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color, marginRight: 8, flexShrink: 0 }} />
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{space}</span>
                          {role && (
                            <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", flexShrink: 0, marginLeft: 4 }}>
                              {ROLE_LABEL_SHORT[role] || role}
                            </span>
                          )}
                        </>
                      )}
                    </a>
                  );
                })}
              </>
            )}

            {extraPoles.length > 0 && (
              <>
                {!sidebarCollapsed && <div className="ns" style={{ marginTop: 14 }}>Pôles</div>}
                {sidebarCollapsed && <div className="ns" style={{ marginTop: 14, padding: "8px 0 4px", justifyContent: "center" }}><span style={{ display: "block", width: 20, height: 1, background: "rgba(255,255,255,0.12)", borderRadius: 1 }} /></div>}
                {extraPoles.map(p => (
                  <a key={p} href={navHref("pole", p)} className={`ni ${page === "pole" && subPage === p ? "active" : ""}${sidebarCollapsed ? " ni-collapsed" : ""}`} onClick={e => navClick(e, "pole", p, p === "Trésorerie" ? "tresorerie" : "contenu")} style={{ textDecoration: 'none', justifyContent: sidebarCollapsed ? "center" : undefined, padding: sidebarCollapsed ? "7px 0" : undefined }} title={sidebarCollapsed ? p : undefined}>
                    {sidebarCollapsed ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: POLE_COLORS[p] || '#94a3b8', flexShrink: 0 }}>
                        {SPACE_LOGO[p] || <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{p.charAt(0).toUpperCase()}</span>}
                      </span>
                    ) : (
                      <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: POLE_COLORS[p], marginRight: 8, flexShrink: 0 }} />{p}</>
                    )}
                  </a>
                ))}
              </>
            )}

            {extraProjets.length > 0 && (
              <>
                {!sidebarCollapsed && <div className="ns" style={{ marginTop: 14 }}>Projets</div>}
                {sidebarCollapsed && <div className="ns" style={{ marginTop: 14, padding: "8px 0 4px", justifyContent: "center" }}><span style={{ display: "block", width: 20, height: 1, background: "rgba(255,255,255,0.12)", borderRadius: 1 }} /></div>}
                {extraProjets.map(p => (
                  <a key={p} href={navHref("projet", p)} className={`ni ${page === "projet" && subPage === p ? "active" : ""}${sidebarCollapsed ? " ni-collapsed" : ""}`} onClick={e => navClick(e, "projet", p)} style={{ textDecoration: 'none', justifyContent: sidebarCollapsed ? "center" : undefined, padding: sidebarCollapsed ? "7px 0" : undefined }} title={sidebarCollapsed ? p : undefined}>
                    {sidebarCollapsed ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: PROJET_COLORS[p] || '#94a3b8', flexShrink: 0 }}>
                        {SPACE_LOGO[p] || <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{p.charAt(0).toUpperCase()}</span>}
                      </span>
                    ) : (
                      <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: PROJET_COLORS[p], marginRight: 8, flexShrink: 0 }} />{p}</>
                    )}
                  </a>
                ))}
              </>
            )}
          </nav>

          <div className="s-bottom" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: sidebarCollapsed ? "12px 0" : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0', justifyContent: sidebarCollapsed ? "center" : undefined }}>
              <div
                style={{ position: 'relative', flexShrink: 0 }}
                onMouseEnter={() => setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
                title={sidebarCollapsed ? currentUser.nom : undefined}
              >
                <div className="uav" style={{ background: isAvatarUrl(currentUser.avatar) ? "transparent" : undefined, overflow: "hidden", padding: 0 }}>
                  <AvatarInner avatar={currentUser.avatar} nom={currentUser.nom} />
                </div>
                {isAvatarUrl(currentUser.avatar) && avatarHovered && onRemoveAvatar && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveAvatar(); }}
                    title="Supprimer la photo"
                    style={{ position: 'absolute', top: -3, right: -3, width: 15, height: 15, borderRadius: '50%', background: '#e63946', border: '1.5px solid rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                  >
                    <X size={7} strokeWidth={3} color="#fff" />
                  </button>
                )}
              </div>
              {!sidebarCollapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="uname">{currentUser.nom}</div>
                  <div className="urole">{currentUser.role}</div>
                </div>
              )}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Se déconnecter"
                style={{
                  background: 'rgba(230,57,70,0.15)',
                  border: '1px solid rgba(230,57,70,0.3)',
                  borderRadius: 8, color: '#ff6b7a',
                  padding: sidebarCollapsed ? '7px 0' : '7px 10px', cursor: 'pointer',
                  fontSize: 13, transition: 'all 0.2s',
                  width: '100%', fontWeight: 600, letterSpacing: '0.3px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(230,57,70,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(230,57,70,0.15)'; }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: sidebarCollapsed ? 0 : 6 }}>
                  <LogOut size={15} strokeWidth={1.8} />
                  {!sidebarCollapsed && " Déconnexion"}
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* ── BOUTON COLLAPSE SIDEBAR (triangle à la jonction sidebar/topbar) ── */}
        <button
          className={`sidebar-collapse-tab desktop-only${sidebarCollapsed ? " sidebar-collapse-tab--collapsed" : ""}`}
          onClick={() => setSidebarCollapsed(v => { const next = !v; localStorage.setItem('sidebarCollapsed', next); return next; })}
          title={sidebarCollapsed ? "Développer la sidebar" : "Réduire la sidebar"}
          aria-label={sidebarCollapsed ? "Développer la sidebar" : "Réduire la sidebar"}
        >
          <ChevronRight size={12} strokeWidth={2.5} className="sidebar-collapse-tab__icon" />
        </button>

        {/* ── CONTENU PRINCIPAL ─────────────────────────────────────────────── */}
        <main ref={mainRef} className={`main ${page === 'dashboard' ? 'main-gradient' : ''}${(page === 'projet' && subPage === 'Europe') ? ' europe-gradient' : ''}${page === 'coordination' ? ' coord-gradient' : ''}${freshLogin ? ' login-transition' : ''}`} style={{ padding: 0, transition: "all 0.3s ease-out" }}>
          {(page === 'dashboard' || (page === 'projet' && subPage === 'Europe') || page === 'coordination') && <div className="gradient-layer" aria-hidden="true" />}

          {/* ── TOPBAR STICKY ───────────────────────────────────────────────── */}
          <div className="topbar">
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
              <LayoutDashboard size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
              <span>Intranet</span>
              <ChevronRight size={12} strokeWidth={2} />
              <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{currentPageLabel}</span>
            </div>

            {/* Barre de recherche */}
            <div data-search-container="true" className="topbar-search-wrap">
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'inline-flex' }}>
                <Search size={13} strokeWidth={1.8} />
              </span>
              <input
                ref={searchRef}
                type="text"
                value={globalQuery}
                onChange={e => { setGlobalQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Rechercher membres, actions, événements…"
                className="topbar-search-input"
              />
              {globalQuery && (
                <button onClick={() => { setGlobalQuery(""); setSearchOpen(false); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'inline-flex' }}>
                  <X size={14} strokeWidth={2} />
                </button>
              )}
              {/* Overlay résultats */}
              {searchOpen && globalQuery.length >= 2 && (() => {
                const q = globalQuery.toLowerCase();
                const memberResults  = directory.filter(m => m.nom.toLowerCase().includes(q) || m.pole.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)).slice(0, 3);
                const actionResults  = actions.filter(a => !a.isArchived && (a.etablissement.toLowerCase().includes(q) || (a.ville || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q))).slice(0, 3);
                const eventResults   = evenements.filter(e => !e.isArchived && (e.titre.toLowerCase().includes(q) || (e.lieu || "").toLowerCase().includes(q))).slice(0, 3);
                const missionResults = missions.filter(m => m.titre.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.pole.toLowerCase().includes(q)).slice(0, 3);
                const hasResults = memberResults.length + actionResults.length + eventResults.length + missionResults.length > 0;
                return (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', zIndex: 9000, overflow: 'hidden', maxHeight: 480, overflowY: 'auto' }}>
                    {!hasResults && <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucun résultat pour "{globalQuery}"</div>}
                    {memberResults.length > 0 && <div>
                      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} strokeWidth={1.8} /> Membres</div>
                      {memberResults.map(m => (
                        <div key={m.id || m.nom} onClick={() => { onSelectMember && onSelectMember(m); setGlobalQuery(''); setSearchOpen(false); }} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAvatarUrl(m.avatar) ? 'transparent' : 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}><AvatarInner avatar={m.avatar} nom={m.nom} /></div>
                          <div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{m.nom}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.pole}</div></div>
                        </div>
                      ))}
                    </div>}
                    {actionResults.length > 0 && <div>
                      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 4 }}><ClipboardList size={11} strokeWidth={1.8} /> Actions</div>
                      {actionResults.map(a => (
                        <div key={a.id} onClick={() => { onSelectAction && onSelectAction(a); setGlobalQuery(''); setSearchOpen(false); }} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <ClipboardList size={18} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.etablissement}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ville} · {a.statut}</div></div>
                        </div>
                      ))}
                    </div>}
                    {eventResults.length > 0 && <div>
                      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={11} strokeWidth={1.8} /> Événements</div>
                      {eventResults.map(e => (
                        <div key={e.id} onClick={() => { onSelectEvent && onSelectEvent(e); setGlobalQuery(''); setSearchOpen(false); }} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-alt)'} onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                          <Zap size={18} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titre}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.date} · {e.lieu || ''}</div></div>
                        </div>
                      ))}
                    </div>}
                    {missionResults.length > 0 && <div>
                      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 4 }}><Target size={11} strokeWidth={1.8} /> Missions</div>
                      {missionResults.map(m => (
                        <div key={m.id} onClick={() => { onSelectMission && onSelectMission(m); setGlobalQuery(''); setSearchOpen(false); }} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Target size={18} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titre}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.pole} · {m.type}</div></div>
                        </div>
                      ))}
                    </div>}
                  </div>
                );
              })()}
            </div>

            {/* Actions topbar droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>

              {/* Thème */}
              <button className="topbar-btn" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Mode clair' : 'Mode sombre'}>
                {darkMode ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
              </button>

              {/* Notifications */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button className="topbar-btn" onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }} title="Notifications">
                  <Bell size={16} strokeWidth={1.8} />
                  {notifBadgeCount > 0 && <span className="notif-badge-dot" />}
                </button>

                {notifOpen && (
                  <div className="topbar-dropdown" style={{ width: 320 }}>
                    {/* Header */}
                    <div style={{ padding: '13px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>Notifications</span>
                      <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: '#0071e3', cursor: 'pointer', fontWeight: 500, background: 'none', border: 'none', fontFamily: 'var(--font-body)' }}>
                        Tout marquer lu
                      </button>
                    </div>
                    {/* Items */}
                    {upcomingNotifications.length === 0 ? (
                      <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Tout est à jour ✓</div>
                    ) : (
                      upcomingNotifications.slice(0, 5).map(n => {
                        const isRead = notifLues.includes(n.id);
                        return (
                          <div key={n.id} className={`topbar-notif-item${isRead ? '' : ' unread'}`}
                            onClick={() => { setNotifLues(prev => prev.includes(n.id) ? prev : [...prev, n.id]); setNotifOpen(false); onOpenNotifPanel(); }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: NOTIF_COLOR[n.type] || 'rgba(148,163,184,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                              {NOTIF_ICON[n.type] || '🔔'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.description}</div>
                            </div>
                            {!isRead && <div style={{ width: 7, height: 7, background: '#0071e3', borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />}
                          </div>
                        );
                      })
                    )}
                    {/* Footer */}
                    <div onClick={() => { setNotifOpen(false); onOpenNotifPanel(); }}
                      style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,.06)', fontSize: 12, color: '#0071e3', cursor: 'pointer', fontWeight: 500 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      Voir toutes les notifications
                    </div>
                  </div>
                )}
              </div>

              <div className="topbar-divider" />

              {/* Profil */}
              <div style={{ position: 'relative' }} ref={profileRef}>
                <div className="topbar-avatar" onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }} title="Mon profil">
                  <AvatarInner avatar={currentUser.avatar} nom={currentUser.nom} />
                </div>

                {profileOpen && (
                  <div className="topbar-dropdown" style={{ width: 220 }}>
                    {/* Header profil */}
                    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e63946', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        <AvatarInner avatar={currentUser.avatar} nom={currentUser.nom} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{currentUser.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentUser.role}</div>
                      </div>
                    </div>
                    <div className="topbar-dropdown-item" onClick={() => { setProfileOpen(false); openProfile && openProfile(); }}>
                      <User size={14} strokeWidth={1.8} /> Mon profil
                    </div>
                    <div className="topbar-dropdown-item danger" onClick={() => { setProfileOpen(false); onLogout && onLogout(); }}>
                      <LogOut size={14} strokeWidth={1.8} /> Déconnexion
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── BARRE CONTEXTUELLE (sous-onglets pôle/projet) ───────────────── */}
          {contextBar && (
            <div style={{
              position: 'sticky', top: 62, zIndex: 40,
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              padding: '0 44px',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {contextBar}
            </div>
          )}

          {/* ── PAGE CONTENT ────────────────────────────────────────────────── */}
          <div className={(page === 'dashboard' || (page === 'projet' && subPage === 'Europe')) ? 'gradient-content' : ''} style={(page !== 'dashboard' && !(page === 'projet' && subPage === 'Europe') && page !== 'coordination') ? { padding: '28px 44px 44px' } : undefined}>
            <div key={page} className="page-transition">{children}</div>
          </div>

        </main>
      </div>

      {/* ── NAVIGATION BAS D'ÉCRAN MOBILE ─────────────────────────────────────── */}
      <nav className="mobile-bottom-nav mobile-only">
        {bottomNavItems.map(item => (
          <button
            key={item.id}
            className={`mob-nav-item ${page === item.id ? "active" : ""}`}
            onClick={() => handleNav(item.id)}
          >
            <item.IconComp size={20} strokeWidth={page === item.id ? 2.2 : 1.8} />
            {item.label}
          </button>
        ))}
        {/* Bouton "Plus" → ouvre la sidebar */}
        <button
          className={`mob-nav-item`}
          onClick={() => setSidebarOpen(true)}
          style={{ position: "relative" }}
        >
          <Menu size={20} strokeWidth={1.8} />
          Plus
          {notifBadgeCount > 0 && (
            <span style={{ position: "absolute", top: 6, right: "calc(50% - 18px)", width: 14, height: 14, borderRadius: "50%", background: "#e63946", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {notifBadgeCount > 9 ? "9+" : notifBadgeCount}
            </span>
          )}
        </button>
      </nav>

    </div>
  );
};

export default Layout;
