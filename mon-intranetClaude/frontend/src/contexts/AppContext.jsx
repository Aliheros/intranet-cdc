// src/contexts/AppContext.jsx
// État UI global : navigation, toasts, boîte de confirmation, modales, panneau notifs.
// Aucune dépendance aux données métier — peut être consommé par DataContext.
import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Helpers hash URL ──────────────────────────────────────────────────────────
// Format : #page  ou  #pole/NomEspace  ou  #projet/NomEspace
const encodeHash = (page, subPage) => {
  if (!page || page === 'dashboard') return '#dashboard';
  if (page === 'pole' || page === 'projet') return `#${page}/${encodeURIComponent(subPage || '')}`;
  return `#${page}`;
};

const decodeHash = (hash = '') => {
  const h = hash.replace(/^#/, '');
  if (!h || h === 'dashboard') return { page: 'dashboard', subPage: '' };
  const slash = h.indexOf('/');
  if (slash !== -1) {
    const page = h.slice(0, slash);
    const subPage = decodeURIComponent(h.slice(slash + 1));
    return { page, subPage };
  }
  return { page: h, subPage: '' };
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ─── NAVIGATION ──────────────────────────────────────────────────────────
  const initialNav = decodeHash(window.location.hash);
  const [page, setPage]         = useState(initialNav.page);
  const [subPage, setSubPage]   = useState(initialNav.subPage);
  const [activeTab, setActiveTab] = useState('contenu');
  const [globalQuery, setGlobalQuery] = useState('');

  const handleNav = (newPage, newSubPage = null, newTab = 'contenu') => {
    setPage(newPage);
    if (newSubPage !== null) setSubPage(newSubPage);
    setActiveTab(newTab);
    // Sync URL hash (sans rechargement)
    const newHash = encodeHash(newPage, newSubPage !== null ? newSubPage : '');
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  };

  // Réagit au bouton Retour/Avant du navigateur
  useEffect(() => {
    const onPop = () => {
      const { page: p, subPage: sp } = decodeHash(window.location.hash);
      setPage(p);
      setSubPage(sp);
      setActiveTab('contenu');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ─── THÈME ───────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);

  // ─── TOASTS ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // ─── BOÎTE DE CONFIRMATION ────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState(null);

  const requestConfirm = (msg, onConfirm, confirmLabel) => {
    setConfirmDialog({ msg, onConfirm, confirmLabel });
  };

  // ─── PANNEAU NOTIFICATIONS ────────────────────────────────────────────────
  const [showNotifPanel, setShowNotifPanel]   = useState(false);
  const [isNotifClosing, setIsNotifClosing]   = useState(false);
  const [showNewNotifModal, setShowNewNotifModal] = useState(false);
  const [newNotifForm, setNewNotifForm] = useState({
    titre: '', contenu: '', cible: 'tous', targetPoles: [], targetUsers: [], priorite: 'normale',
  });

  const closeNotifPanel = () => {
    setIsNotifClosing(true);
    setTimeout(() => { setShowNotifPanel(false); setIsNotifClosing(false); }, 300);
  };

  // ─── HIGHLIGHTS (navigation croisée) ──────────────────────────────────────
  const [highlightedTaskId,   setHighlightedTaskId]   = useState(null);
  const [highlightedActionId, setHighlightedActionId] = useState(null);
  const [highlightedEventId,  setHighlightedEventId]  = useState(null);
  const [activeEventId,       setActiveEventId]       = useState(null);

  // ─── ONGLET INITIAL ANNUAIRE ──────────────────────────────────────────────
  const [annuaireInitialTab, setAnnuaireInitialTab] = useState(null);

  // ─── MODALES PROFIL ───────────────────────────────────────────────────────
  const [isProfileModalOpen,      setIsProfileModalOpen]      = useState(false);
  const [selectedMemberProfile,   setSelectedMemberProfile]   = useState(null);
  const [showMyProfileModal,      setShowMyProfileModal]      = useState(false);
  const [rhProfileModal,          setRhProfileModal]          = useState(null);
  const openMemberProfile = (member) => { if (member) { setSelectedMemberProfile(member); setIsProfileModalOpen(true); } };

  // ─── MODALES MÉTIER ───────────────────────────────────────────────────────
  const [transactionModal,        setTransactionModal]        = useState(null);
  const [actionModal,             setActionModal]             = useState(null);
  const [eventModal,              setEventModal]              = useState(null);
  const [manageTeamModal,         setManageTeamModal]         = useState(null);
  const [editSpaceModal,          setEditSpaceModal]          = useState(null);
  const [sectionModal,            setSectionModal]            = useState(null);
  const [showWizard,              setShowWizard]              = useState(false);
  const [selectedActionChecklist, setSelectedActionChecklist] = useState(null);
  const [budgetModalOpen,         setBudgetModalOpen]         = useState(false);
  const [missionModal,            setMissionModal]            = useState(null);
  const [noteFraisModal,          setNoteFraisModal]          = useState(null);
  const [devisFactureModal,       setDevisFactureModal]       = useState(null);

  // ─── BARRE CONTEXTUELLE (sous-onglets pôle/projet) ───────────────────────
  // Contenu JSX rendu juste sous la topbar principale. Chaque page qui en a
  // besoin l'alimente via setContextBar(). Réinitialisé à null à chaque nav.
  const [contextBar, setContextBar] = useState(null);

  // contextBar est réinitialisée par le cleanup du useLayoutEffect de chaque page.

  // ─── LOGIN FRESH (transition post-login) ─────────────────────────────────
  // true pendant les ~8s après la connexion manuelle — permet au dashboard
  // d'appliquer les animations textToDark et slideUp.
  const [freshLogin, setFreshLogin] = useState(false);

  // ─── TUTORIEL ─────────────────────────────────────────────────────────────
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <AppContext.Provider value={{
      // Navigation
      page, setPage, subPage, setSubPage, activeTab, setActiveTab,
      globalQuery, setGlobalQuery, handleNav,
      // Thème
      darkMode, setDarkMode,
      // Toasts
      toasts, addToast,
      // Confirm
      confirmDialog, setConfirmDialog, requestConfirm,
      // Notif panel
      showNotifPanel, setShowNotifPanel,
      isNotifClosing, setIsNotifClosing,
      showNewNotifModal, setShowNewNotifModal,
      newNotifForm, setNewNotifForm,
      closeNotifPanel,
      // Highlights
      highlightedTaskId, setHighlightedTaskId,
      highlightedActionId, setHighlightedActionId,
      highlightedEventId, setHighlightedEventId,
      activeEventId, setActiveEventId,
      // Annuaire
      annuaireInitialTab, setAnnuaireInitialTab,
      // Profil
      isProfileModalOpen, setIsProfileModalOpen,
      selectedMemberProfile, setSelectedMemberProfile,
      showMyProfileModal, setShowMyProfileModal,
      rhProfileModal, setRhProfileModal,
      openMemberProfile,
      // Modales
      transactionModal, setTransactionModal,
      actionModal, setActionModal,
      eventModal, setEventModal,
      manageTeamModal, setManageTeamModal,
      editSpaceModal, setEditSpaceModal,
      sectionModal, setSectionModal,
      showWizard, setShowWizard,
      selectedActionChecklist, setSelectedActionChecklist,
      budgetModalOpen, setBudgetModalOpen,
      missionModal, setMissionModal,
      noteFraisModal, setNoteFraisModal,
      devisFactureModal, setDevisFactureModal,
      // Barre contextuelle (sous-onglets pôle/projet)
      contextBar, setContextBar,
      // Login fresh
      freshLogin, setFreshLogin,
      // Tutoriel
      showTutorial, setShowTutorial,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
