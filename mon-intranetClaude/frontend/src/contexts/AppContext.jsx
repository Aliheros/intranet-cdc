// src/contexts/AppContext.jsx
// État UI global : navigation, toasts, boîte de confirmation, modales, panneau notifs.
// Aucune dépendance aux données métier — peut être consommé par DataContext.
import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ─── NAVIGATION ──────────────────────────────────────────────────────────
  const [page, setPage]         = useState('dashboard');
  const [subPage, setSubPage]   = useState('');
  const [activeTab, setActiveTab] = useState('contenu');
  const [globalQuery, setGlobalQuery] = useState('');

  const handleNav = (newPage, newSubPage = null) => {
    setPage(newPage);
    if (newSubPage !== null) setSubPage(newSubPage);
    setActiveTab('contenu');
  };

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
