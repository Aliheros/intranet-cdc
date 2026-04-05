// src/App.jsx — Shell léger (~300 lignes).
// Tout l'état métier est dans DataContext ; tout l'état UI dans AppContext.
import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';
import { useAppContext } from './contexts/AppContext';
import { useDataContext } from './contexts/DataContext';
import { PROJETS } from './data/constants';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import api from './api/apiClient';

// Icônes utilisées dans le shell
import { AlertTriangle, Zap, CheckCircle2, MapPin, User, Megaphone, Building2, Bell, X, Calendar, CheckCheck } from 'lucide-react';

// Pages
import Dashboard    from './pages/Dashboard';
import Annuaire     from './pages/Annuaire';
import ActionTracker from './pages/ActionTracker';
import Coordination from './pages/Coordination';
import SpaceView    from './pages/SpaceView';
import Planning     from './pages/Planning';
import Bureau       from './pages/Bureau';
import Messagerie   from './pages/Messagerie';
import Permissions  from './pages/Permissions';
import Admin        from './pages/Admin';
import NoteFrais     from './pages/NoteFrais';
import FAQ           from './pages/FAQ';
import DevisFactures from './pages/DevisFactures';
import TresorerieDevisFactures from './pages/TresorerieDevisFactures';
import Analytics from './pages/Analytics';

// Modales
import ProfileModal         from './components/modals/ProfileModal';
import TransactionModal     from './components/modals/TransactionModal';
import ActionModal          from './components/modals/ActionModal';
import EventModal           from './components/modals/EventModal';
import ManageTeamModal      from './components/modals/ManageTeamModal';
import EditSpaceModal       from './components/modals/EditSpaceModal';
import SectionModal         from './components/modals/SectionModal';
import WizardModal          from './components/modals/WizardModal';
import ChecklistModal       from './components/modals/ChecklistModal';
import BudgetModal          from './components/modals/BudgetModal';
import MyProfileModal       from './components/modals/MyProfileModal';
import RHProfileModal       from './components/modals/RHProfileModal';
import MissionModal         from './components/modals/MissionModal';
import NoteFraisModal       from './components/modals/NoteFraisModal';
import DevisFactureModal    from './components/modals/DevisFactureModal';
import ForcedPasswordChange from './components/modals/ForcedPasswordChange';
import TutorialOverlay      from './components/tutorial/TutorialOverlay';

function App() {
  const { currentUser, loading: authLoading, logout, updateCurrentUser } = useAuth();

  const {
    page, setPage, subPage, setSubPage, activeTab, setActiveTab, darkMode, setDarkMode,
    globalQuery, setGlobalQuery, handleNav,
    toasts, addToast, confirmDialog, setConfirmDialog,
    showNotifPanel, setShowNotifPanel, isNotifClosing, setIsNotifClosing,
    showNewNotifModal, setShowNewNotifModal, newNotifForm, setNewNotifForm,
    closeNotifPanel,
    highlightedTaskId,   setHighlightedTaskId,
    highlightedActionId, setHighlightedActionId,
    highlightedEventId,  setHighlightedEventId,
    activeEventId,       setActiveEventId,
    annuaireInitialTab,  setAnnuaireInitialTab,
    isProfileModalOpen,  setIsProfileModalOpen,
    selectedMemberProfile, setSelectedMemberProfile,
    showMyProfileModal,  setShowMyProfileModal,
    rhProfileModal,      setRhProfileModal,
    transactionModal,    setTransactionModal,
    actionModal,         setActionModal,
    eventModal,          setEventModal,
    manageTeamModal,     setManageTeamModal,
    editSpaceModal,      setEditSpaceModal,
    sectionModal,        setSectionModal,
    showWizard,          setShowWizard,
    selectedActionChecklist, setSelectedActionChecklist,
    budgetModalOpen,     setBudgetModalOpen,
    missionModal,        setMissionModal,
    noteFraisModal,      setNoteFraisModal,
    devisFactureModal,   setDevisFactureModal,
    showTutorial,        setShowTutorial,
  } = useAppContext();

  const {
    directory, setDirectory,
    actions, setActions, evenements, setEvenements, tasks,
    missions, notesFrais, volunteerHours,
    spaceTeams, spaceInfos, taskRequests, setTaskRequests,
    notifs, notifLues, setNotifLues, cycles,
    isAdmin, isBureau, hasPower,
    accessiblePoles, accessibleProjets, myTeamSpaces,
    visibleNotifs, personalNotifs, unreadCount, notifBadgeCount, upcomingNotifications,
    handleRemoveAvatar,
    handleSendNotif,
    handleSaveAction, handleWizardComplete,
    handleSaveEvent,
    handleSaveMission,
    handleSaveNdfConfig, handleSaveNoteFrais, handleUpdateNdfStatus,
    handleSignalJustificatifProblem, handleDeleteNoteFrais,
    handleRequestNdfDeletion, handleRejectNdfDeletion,
    handleSaveTransaction,
    handleSaveTeam, handleSaveSpaceInfo, handleSaveSection, handleSaveBudgets,
    handleUpdateActionResponsables,
    ndfConfig, budgets,
    devisFactures, categoriesDF,
    handleCreateDevisFacture, handleUpdateDevisFacture, handleDeleteDevisFacture,
    handleSoumettreDevisFacture, handleDeposeDevisFacture,
    handlePrendreEnChargeDevisFacture, handleSignerDevisFacture,
    refreshDevisFacture,
    dfConfig,
  } = useDataContext();

  // ─── TUTORIEL — déclenche automatiquement si mustTakeTutorial ───────────────
  useEffect(() => {
    if (currentUser?.mustTakeTutorial) setShowTutorial(true);
  }, [currentUser?.mustTakeTutorial]);

  const handleTutorialDone = () => {
    setShowTutorial(false);
    api.post('/users/me/tutorial-done').catch(console.error);
  };

  // ─── REFS DOM (bannière) ──────────────────────────────────────────────────
  const bannerRef      = useRef(null);
  const bannerOuterRef = useRef(null);
  const spaceWallContainerRef  = useRef(null);
  const spaceFileRef           = useRef(null);
  const globalChatContainerRef = useRef(null);

  // ─── ÉTAT LOCAL BANNIÈRE ──────────────────────────────────────────────────
  const [notifBannerVisible, setNotifBannerVisible] = useState(true);
  const [isBannerClosing,    setIsBannerClosing]    = useState(false);
  const [bannerCarouselIndex,  setBannerCarouselIndex]  = useState(0);
  const [bannerHeight,         setBannerHeight]         = useState(0);
  const [bannerTransitioning,  setBannerTransitioning]  = useState(false);
  const [bannerSlideDirection, setBannerSlideDirection] = useState('right');
  const [bannerHasAppeared,    setBannerHasAppeared]    = useState(false);

  // Seules les annonces non encore lues/fermées alimentent la bannière
  const unreadVisibleNotifs = visibleNotifs.filter(n => !notifLues.includes(n.id));
  const isBannerActive = notifBannerVisible && unreadVisibleNotifs.length > 0;
  // Garde l'index du carousel dans les bornes si des annonces sont lues
  const safeBannerIndex = unreadVisibleNotifs.length > 0
    ? Math.min(bannerCarouselIndex, unreadVisibleNotifs.length - 1)
    : 0;

  const handleCloseBanner = () => {
    // Marquer toutes les annonces actuellement affichées comme lues
    if (unreadVisibleNotifs.length > 0) {
      setNotifLues(prev => [...new Set([...prev, ...unreadVisibleNotifs.map(n => n.id)])]);
    }
    const outer = bannerOuterRef.current;
    const inner = bannerRef.current;
    if (!outer || !inner) { setNotifBannerVisible(false); return; }
    setIsBannerClosing(true);
    const h = inner.offsetHeight;
    outer.style.transition = 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease';
    outer.style.maxHeight  = h + 'px';
    outer.style.opacity    = '1';
    requestAnimationFrame(() => {
      outer.style.maxHeight = '0px';
      outer.style.opacity   = '0';
    });
    setTimeout(() => { setNotifBannerVisible(false); setIsBannerClosing(false); }, 420);
  };

  useLayoutEffect(() => {
    if (!bannerOuterRef.current) return;
    setBannerHeight(isBannerActive ? bannerOuterRef.current.offsetHeight : 0);
  }, [isBannerActive, unreadVisibleNotifs.length]);

  // ─── GARDE AUTH ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1e4a 0%, #0f2d5e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'var(--font-body)', flexDirection: 'column', gap: 16 }}>
        <Building2 size={36} strokeWidth={1.2} />
        <div>Chargement de la session…</div>
      </div>
    );
  }
  if (!currentUser) return <Login />;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; max-height: 0; } to { transform: translateY(0); opacity: 1; max-height: 150px; } }
        @keyframes slideUpOut { from { opacity: 1; transform: translateY(0); max-height: 150px; } to { opacity: 0; transform: translateY(-100%); max-height: 0; } }
        @keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutToLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideInFromLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutToRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes colorShift { 0% { filter: brightness(1) saturate(1); } 50% { filter: brightness(1.15) saturate(1.1); } 100% { filter: brightness(1) saturate(1); } }
        .banner-animated { animation: colorShift 0.7s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .banner-wrapper { transition: background 0.8s ease, box-shadow 0.8s ease; }
        .banner-content-slide-left  { animation: slideOutToLeft  0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .banner-content-slide-right { animation: slideOutToRight 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .banner-content-enter-right { animation: slideInFromRight 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .banner-content-enter-left  { animation: slideInFromLeft  0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
        .banner-content-static { position: relative; width: auto; flex: 1; }
      `}</style>

      {/* ─── BANNIÈRE ANNONCES ─────────────────────────────────────────────── */}
      {isBannerActive && unreadVisibleNotifs.length > 0 && (
        <div ref={bannerOuterRef} style={{ width: '100%', overflow: 'hidden', zIndex: 100 }}>
          <div ref={bannerRef} className={`banner-wrapper ${bannerTransitioning ? 'banner-animated' : ''}`}
            style={{ width: '100%', zIndex: 100, background: unreadVisibleNotifs[safeBannerIndex]?.priorite === 'haute' ? 'linear-gradient(135deg, #e63946 0%, #d1495a 100%)' : 'linear-gradient(135deg, #0f2d5e 0%, #1a3a5c 100%)', color: '#fff', padding: 'clamp(12px,3vw,20px) clamp(14px,4vw,28px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 70, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 0, position: 'relative' }}>
              <span style={{ flexShrink: 0, display: 'inline-flex' }}><Megaphone size={32} strokeWidth={1.5} /></span>
              <div key={`notif-${safeBannerIndex}`} className={bannerTransitioning ? (bannerSlideDirection === 'right' ? 'banner-content-enter-right' : 'banner-content-enter-left') : 'banner-content-static'}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, letterSpacing: '-0.2px' }}>{unreadVisibleNotifs[safeBannerIndex]?.titre}</div>
                <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5, fontWeight: 400 }}>{unreadVisibleNotifs[safeBannerIndex]?.contenu}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {unreadVisibleNotifs.length > 1 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 20 }}>
                  <button onClick={() => { setBannerSlideDirection('left'); setBannerTransitioning(true); setBannerCarouselIndex(i => (i - 1 + unreadVisibleNotifs.length) % unreadVisibleNotifs.length); setTimeout(() => setBannerTransitioning(false), 600); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16, padding: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 35, textAlign: 'center' }}>{safeBannerIndex + 1}/{unreadVisibleNotifs.length}</span>
                  <button onClick={() => { setBannerSlideDirection('right'); setBannerTransitioning(true); setBannerCarouselIndex(i => (i + 1) % unreadVisibleNotifs.length); setTimeout(() => setBannerTransitioning(false), 600); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16, padding: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                </div>
              )}
              {!isBannerClosing && (
                <>
                  <button onClick={() => { setIsNotifClosing(false); setShowNotifPanel(true); }} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Voir tout ({unreadCount})</button>
                  <button onClick={handleCloseBanner} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LAYOUT & ROUTING ─────────────────────────────────────────────── */}
      <Layout
        page={page} setPage={setPage} subPage={subPage} setSubPage={setSubPage}
        setActiveTab={setActiveTab}
        darkMode={darkMode} setDarkMode={setDarkMode}
        currentUser={currentUser}
        isAdmin={isAdmin} isBureau={isBureau}
        accessiblePoles={accessiblePoles} accessibleProjets={accessibleProjets}
        myTeamSpaces={myTeamSpaces}
        globalQuery={globalQuery} setGlobalQuery={setGlobalQuery}
        unreadCount={unreadCount}
        onOpenMyProfile={() => setShowMyProfileModal(true)}
        onRemoveAvatar={handleRemoveAvatar}
        onLogout={logout}
        onOpenNotifPanel={() => { setIsNotifClosing(false); setShowNotifPanel(true); }}
        bannerActive={isBannerActive}
        bannerHeight={bannerHeight}
        upcomingNotifications={upcomingNotifications}
        notifBadgeCount={notifBadgeCount}
        directory={directory}
        actions={actions}
        evenements={evenements}
        missions={missions}
        onSelectMember={(m) => { setSelectedMemberProfile(m); setIsProfileModalOpen(true); }}
        onSelectAction={(a) => { handleNav('actions'); setHighlightedActionId(a.id); setTimeout(() => setHighlightedActionId(null), 3000); }}
        onSelectEvent={(e) => { handleNav('coordination'); setActiveEventId(e.id); setHighlightedEventId(e.id); setTimeout(() => setHighlightedEventId(null), 3000); }}
        onSelectMission={() => { setAnnuaireInitialTab('missions'); handleNav('annuaire'); }}
      >
        <ErrorBoundary label={`la page "${page}"`}>

        {page === 'dashboard' && <Dashboard />}

        {page === 'actions' && <ActionTracker />}

        {page === 'coordination' && <Coordination />}

        {page === 'planning' && <Planning />}

        {page === 'bureau' && !(isAdmin || isBureau) && (
          <div className="empty" style={{ marginTop: 60 }}>Accès réservé au Bureau.</div>
        )}
        {page === 'bureau' && (isAdmin || isBureau) && <Bureau />}

        {page === 'annuaire' && <Annuaire />}

        {page === 'messagerie' && <Messagerie globalChatContainerRef={globalChatContainerRef} />}

        {page === 'notefrais' && <NoteFrais />}

        {page === 'faq' && <FAQ />}

        {page === 'devisFactures' && <DevisFactures />}

        {page === 'tresorerieDF' && <TresorerieDevisFactures addToast={addToast} />}

        {page === 'permissions' && !isAdmin && (
          <div className="empty" style={{ marginTop: 60 }}>Accès réservé aux administrateurs.</div>
        )}
        {page === 'permissions' && isAdmin && <Permissions />}

        {page === 'admin' && !isAdmin && (
          <div className="empty" style={{ marginTop: 60 }}>Accès réservé aux administrateurs.</div>
        )}
        {page === 'admin' && isAdmin && <Admin />}

        {page === 'analytics' && <Analytics />}

        {(page === 'pole' || page === 'projet') && (
          <SpaceView
            spaceWallContainerRef={spaceWallContainerRef}
            spaceFileRef={spaceFileRef}
          />
        )}

        </ErrorBoundary>
      </Layout>

      {/* ─── CHANGEMENT DE MOT DE PASSE FORCÉ ─────────────────────────────── */}
      {currentUser?.mustChangePassword && <ForcedPasswordChange onDone={() => updateCurrentUser({ mustChangePassword: false })} />}

      {/* ─── TOASTS ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === 'error' ? '#e63946' : t.type === 'warning' ? '#d97706' : '#0f2d5e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {t.type === 'error' ? <AlertTriangle size={15} strokeWidth={1.8} /> : t.type === 'warning' ? <Zap size={15} strokeWidth={1.8} /> : <CheckCircle2 size={15} strokeWidth={1.8} />}
            </span>
            {t.msg}
          </div>
        ))}
      </div>

      {/* ─── BOÎTE DE CONFIRMATION ─────────────────────────────────────────── */}
      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 9998 }} onClick={() => setConfirmDialog(null)}>
          <div className="modal-box" style={{ width: 440, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, marginBottom: 12, color: 'var(--text-base)' }}>Confirmation requise</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 28, lineHeight: 1.65 }}>{confirmDialog.msg}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setConfirmDialog(null)}>Annuler</button>
              <button className="btn-primary" style={{ background: '#e63946' }} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>{confirmDialog.confirmLabel || 'Confirmer'}</button>
              {confirmDialog.extraAction && (
                <button className="btn-primary" style={{ background: '#7c3aed' }} onClick={() => { confirmDialog.extraAction.cb(); setConfirmDialog(null); }}>{confirmDialog.extraAction.label}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PANNEAU NOTIFICATIONS ─────────────────────────────────────────── */}
      {showNotifPanel && (
        <div onClick={closeNotifPanel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,29,94,0.35)', zIndex: 8000, backdropFilter: 'blur(3px)', animation: isNotifClosing ? 'overlayFadeOut 0.28s ease forwards' : 'fadeIn 0.28s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px,100vw)', background: 'var(--bg-surface)', boxShadow: '-12px 0 48px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', animation: isNotifClosing ? 'overlayFadeOut 0.28s ease forwards' : 'slideRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1a56db 60%, #2563eb 100%)', padding: '20px 20px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell size={19} strokeWidth={1.8} color="white" />
                    {notifBadgeCount > 0 && <span style={{ position: 'absolute', top: 17, right: 19, width: 18, height: 18, borderRadius: '50%', background: '#e63946', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1a56db' }}>{notifBadgeCount > 9 ? '9+' : notifBadgeCount}</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#fff' }}>Notifications</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{notifBadgeCount > 0 ? `${notifBadgeCount} élément${notifBadgeCount > 1 ? 's' : ''} en attente` : 'Tout est à jour'}</div>
                  </div>
                </div>
                <button onClick={closeNotifPanel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} strokeWidth={2} /></button>
              </div>
              {unreadCount > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setNotifLues([...visibleNotifs.map(n => n.id), ...personalNotifs.map(n => n.id)])} style={{ flex: 1, padding: '7px 12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCheck size={12} strokeWidth={2} /> Tout marquer lu
                  </button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {notifBadgeCount === 0 && visibleNotifs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Bell size={44} strokeWidth={1} style={{ marginBottom: 14, opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dim)' }}>Tout est à jour</div>
                  <div style={{ fontSize: 12, marginTop: 5, color: 'var(--text-muted)' }}>Aucune notification en attente</div>
                </div>
              )}
              {/* Agenda */}
              {(() => {
                const agendaItems = upcomingNotifications.filter(n => n.type === 'task' || n.type === 'seance');
                if (!agendaItems.length) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={11} strokeWidth={1.8} /> Agenda <span style={{ background: 'var(--bg-alt)', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)' }}>{agendaItems.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {agendaItems.map(notif => {
                        const isTask   = notif.type === 'task';
                        const isUrgent = notif.priority === 'high';
                        const base   = isTask ? '#16a34a' : '#1a56db';
                        const urgent = isTask ? '#d97706' : '#e63946';
                        const color  = isUrgent ? urgent : base;
                        return (
                          <div key={notif.id} onClick={() => { closeNotifPanel(); if (isTask) { const sp = PROJETS.includes(notif.space) ? 'projet' : 'pole'; handleNav(sp, notif.space); } else { handleNav('coordination'); if (notif.eventId) { setActiveEventId(notif.eventId); setHighlightedEventId(notif.eventId); setTimeout(() => setHighlightedEventId(null), 3000); } } }}
                            style={{ background: `${color}0d`, border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  {isTask ? <CheckCircle2 size={11} strokeWidth={1.8} color={color} /> : <Calendar size={11} strokeWidth={1.8} color={color} />}
                                  <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isTask ? 'Tâche' : 'Séance'}</span>
                                  {isUrgent && <span style={{ fontSize: 9, background: `${(isTask ? '#d97706' : '#e63946')}20`, color: isTask ? '#d97706' : '#e63946', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>URGENT</span>}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.title}</div>
                                {notif.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{notif.description}</div>}
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, flexShrink: 0 }}>{notif.daysUntil === 0 ? 'Auj.' : notif.daysUntil === 1 ? 'Dem.' : `J-${notif.daysUntil}`}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* Annonces — toutes (lues + non lues) */}
              {visibleNotifs.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Megaphone size={11} strokeWidth={1.8} /> Annonces
                    {unreadVisibleNotifs.length > 0 && <span style={{ background: 'rgba(230,57,70,0.15)', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#e63946' }}>{unreadVisibleNotifs.length} non lu{unreadVisibleNotifs.length > 1 ? 'es' : 'e'}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {visibleNotifs.map(n => {
                      const isRead   = notifLues.includes(n.id);
                      const isUrgent = n.priorite === 'haute';
                      const color    = isRead ? '#94a3b8' : isUrgent ? '#e63946' : '#1a56db';
                      return (
                        <div key={n.id}
                          onClick={() => { if (!isRead) setNotifLues(prev => [...prev, n.id]); }}
                          style={{ background: isRead ? 'var(--bg-hover)' : `${color}08`, border: `1px solid ${isRead ? 'var(--border-light)' : `${color}30`}`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '11px 12px', cursor: isRead ? 'default' : 'pointer', opacity: isRead ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: isRead ? 500 : 700, fontSize: 12, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titre}</div>
                              {n.cible !== 'tous' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>{n.cible === 'pole' ? <MapPin size={9} strokeWidth={1.8} /> : <User size={9} strokeWidth={1.8} />}{n.cible === 'pole' ? n.targetPoles?.join(', ') : n.targetUsers?.join(', ')}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {isUrgent && !isRead && <span style={{ fontSize: 9, background: '#e63946', color: '#fff', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>URGENT</span>}
                              {isRead
                                ? <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--bg-alt)' }}>Lu</span>
                                : <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                              }
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.55 }}>{n.contenu}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                            Par {n.auteur} · {n.date}
                            {!isRead && <em> · Cliquer pour marquer comme lu</em>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Notifications personnelles */}
              {personalNotifs.filter(n => !notifLues.includes(n.id)).length > 0 && (
                <div style={{ marginTop: visibleNotifs.filter(n => !notifLues.includes(n.id)).length > 0 ? 20 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bell size={11} strokeWidth={1.8} /> Mes notifications
                    <span style={{ background: 'rgba(15,45,94,0.12)', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#0f2d5e' }}>{personalNotifs.filter(n => !notifLues.includes(n.id)).length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {personalNotifs.filter(n => !notifLues.includes(n.id)).map(n => {
                      const isUrgent = n.priorite === 'haute';
                      const color = isUrgent ? '#e63946' : '#0f2d5e';
                      return (
                        <div key={n.id} onClick={() => setNotifLues(prev => [...prev, n.id])} style={{ background: `${color}08`, border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-base)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titre}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                              {isUrgent && <span style={{ fontSize: 9, background: '#e63946', color: '#fff', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>URGENT</span>}
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{n.contenu}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>{n.date} · <em>Cliquer pour marquer comme lu</em></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALE NOUVELLE ANNONCE ───────────────────────────────────────── */}
      {showNewNotifModal && (
        <div className="modal-overlay" style={{ zIndex: 9500 }} onClick={() => setShowNewNotifModal(false)}>
          <div className="modal-box" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title"><Megaphone size={16} strokeWidth={1.8} /> Nouvelle annonce</div>
              <button className="modal-close-btn" onClick={() => setShowNewNotifModal(false)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className="modal-body" style={{ gap: 16 }}>
              <div><label className="form-label">Titre *</label><input className="form-input" value={newNotifForm.titre} onChange={e => setNewNotifForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Réunion plénière annuelle" /></div>
              <div><label className="form-label">Contenu *</label><textarea className="form-input" rows={3} value={newNotifForm.contenu} onChange={e => setNewNotifForm(f => ({ ...f, contenu: e.target.value }))} placeholder="Le détail de l'annonce..." style={{ resize: 'vertical' }} /></div>
              <div className="form-2col" style={{ gap: 12 }}>
                <div><label className="form-label">Priorité</label><select className="form-select" value={newNotifForm.priorite} onChange={e => setNewNotifForm(f => ({ ...f, priorite: e.target.value }))}><option value="normale">Normale</option><option value="haute">● Haute (Urgente)</option></select></div>
                <div><label className="form-label">Destinataires</label><select className="form-select" value={newNotifForm.cible} onChange={e => setNewNotifForm(f => ({ ...f, cible: e.target.value, targetPoles: [], targetUsers: [] }))}><option value="tous">Toute l'équipe</option><option value="pole">Cibler des pôles</option><option value="personnes">Cibler des personnes</option></select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewNotifModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={() => { handleSendNotif(newNotifForm); setShowNewNotifModal(false); setNewNotifForm({ titre: '', contenu: '', cible: 'tous', targetPoles: [], targetUsers: [], priorite: 'normale' }); }}>Publier l'annonce</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALES ──────────────────────────────────────────────────────── */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={selectedMemberProfile} actions={actions} tasks={tasks} missions={missions} />

      {showMyProfileModal && <MyProfileModal currentUser={currentUser} directory={directory} setDirectory={setDirectory} addToast={addToast} onClose={() => setShowMyProfileModal(false)} updateCurrentUser={updateCurrentUser} />}

      {rhProfileModal && <RHProfileModal member={directory.find(m => m.id === rhProfileModal?.id) || rhProfileModal} onClose={() => setRhProfileModal(null)} volunteerHours={volunteerHours} missions={missions} tasks={tasks} actions={actions} currentUser={currentUser} directory={directory} setDirectory={setDirectory} addToast={addToast} />}

      {transactionModal && <TransactionModal isOpen={true} transaction={transactionModal} onChange={setTransactionModal} onSave={() => handleSaveTransaction(transactionModal)} onClose={() => setTransactionModal(null)} devisFactures={devisFactures} />}

      <ActionModal action={actionModal} onClose={() => setActionModal(null)} onSave={handleSaveAction} directory={directory} cycles={cycles} currentUser={currentUser} notesFrais={notesFrais}
        onTaskRequest={req => api.post('/tasks/requests', req).then(created => { if (created?.id) setTaskRequests(prev => [...prev, created]); }).catch(console.error)}
      />


      <EventModal event={eventModal} onClose={() => setEventModal(null)} onSave={handleSaveEvent} actions={actions} cycles={cycles} directory={directory} onUpdateActionResponsables={handleUpdateActionResponsables} />

      <ManageTeamModal
        isOpen={!!manageTeamModal}
        space={manageTeamModal?.space}
        year={manageTeamModal?.year}
        currentTeam={manageTeamModal ? (spaceTeams[manageTeamModal.space]?.[manageTeamModal.year] || []) : []}
        directory={directory}
        onClose={() => setManageTeamModal(null)}
        onSave={(newTeam) => { handleSaveTeam(newTeam, manageTeamModal.space, manageTeamModal.year); setManageTeamModal(null); }}
      />

      <EditSpaceModal isOpen={!!editSpaceModal} space={editSpaceModal} initialData={spaceInfos[editSpaceModal]} onClose={() => setEditSpaceModal(null)} onSave={(info) => { handleSaveSpaceInfo(editSpaceModal, info); setEditSpaceModal(null); }} />

      <SectionModal isOpen={!!sectionModal} initialName={sectionModal?.oldName} onClose={() => setSectionModal(null)} onSave={(newName) => { handleSaveSection(subPage, newName, sectionModal?.oldName); setSectionModal(null); }} />

      {budgetModalOpen && <BudgetModal budgets={budgets} onSave={(b) => { handleSaveBudgets(b); setBudgetModalOpen(false); }} onClose={() => setBudgetModalOpen(false)} />}

      {showWizard && <WizardModal cycles={cycles} directory={directory} actions={actions} currentUser={currentUser} onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />}

      {missionModal !== null && (
        <MissionModal
          mission={missionModal && Object.keys(missionModal).length === 0 ? { titre: '', pole: currentUser.pole, projet: '', type: 'Mission ponctuelle', description: '', competences: [], duree: '', urgence: 'normale', statut: 'Ouvert', responsable: currentUser.nom, dateDebut: '', dateFin: '', linkedActionId: null, createdBy: currentUser.nom, createdAt: new Date().toISOString().split('T')[0], candidatures: [] } : missionModal}
          onClose={() => setMissionModal(null)} onSave={handleSaveMission} currentUser={currentUser} actions={actions}
        />
      )}

      {noteFraisModal !== null && (
        <NoteFraisModal
          ndf={noteFraisModal && !noteFraisModal.id ? { demandeur: currentUser.nom, date: new Date().toISOString().split('T')[0], categorie: 'Transport', montant: '', description: '', justificatif: null, projet: '', pole: currentUser.pole, linkedActionId: null, statut: 'Brouillon', historique: [], ...noteFraisModal } : noteFraisModal}
          onClose={() => setNoteFraisModal(null)} onSave={handleSaveNoteFrais} onUpdateStatus={handleUpdateNdfStatus}
          onSignalJustificatifProblem={handleSignalJustificatifProblem} currentUser={currentUser} actions={actions}
          canManage={hasPower('manage_budgets') || isAdmin} ndfConfig={ndfConfig} notesFrais={notesFrais}
          onDelete={handleDeleteNoteFrais} onRequestDeletion={handleRequestNdfDeletion} onRejectDeletion={handleRejectNdfDeletion}
        />
      )}

      {devisFactureModal !== null && (
        <DevisFactureModal
          df={devisFactureModal && !devisFactureModal.id
            ? { type: 'Devis', statut: 'Brouillon', horseBudget: false, historique: [], ...devisFactureModal }
            : (devisFactures.find(d => d.id === devisFactureModal?.id) || devisFactureModal)}
          onClose={() => setDevisFactureModal(null)}
          onDepose={handleDeposeDevisFacture}
          onSaveDraft={handleCreateDevisFacture}
          onUpdate={handleUpdateDevisFacture}
          onSoumettre={handleSoumettreDevisFacture}
          onDelete={handleDeleteDevisFacture}
          onPrendreEnCharge={handlePrendreEnChargeDevisFacture}
          onSigner={handleSignerDevisFacture}
          currentUser={currentUser}
          canManage={hasPower('manage_budgets') || isAdmin}
          addToast={addToast}
          devisFactures={devisFactures}
          categories={categoriesDF}
          onRefreshDf={refreshDevisFacture}
          dfConfig={dfConfig}
        />
      )}

      {selectedActionChecklist && (
        <ChecklistModal action={selectedActionChecklist} currentUser={currentUser} onClose={() => setSelectedActionChecklist(null)}
          onSave={updatedAction => {
            setActions(prev => prev.map(a => a.id === updatedAction.id ? updatedAction : a));
            setSelectedActionChecklist(null);
            api.put(`/actions/${updatedAction.id}`, updatedAction).catch(console.error);
            if ((updatedAction.completionScore || 0) >= 100 && updatedAction.statut !== 'Terminée') {
              const now = new Date().toISOString().split('T')[0];
              const finished = { ...updatedAction, statut: 'Terminée', isArchived: true, timeline: [...(updatedAction.timeline || []), { date: now, icon: 'done', texte: 'Action marquée Terminée automatiquement (checklist complète)', auto: true }] };
              setActions(prev => prev.map(a => a.id === updatedAction.id ? finished : a));
              api.put(`/actions/${updatedAction.id}`, finished).catch(console.error);
              const linkedEv = evenements.find(e => e.actionId === updatedAction.id);
              if (linkedEv) { setEvenements(prev => prev.map(e => e.id === linkedEv.id ? { ...e, statut: 'Terminée', isArchived: true } : e)); api.put(`/events/${linkedEv.id}`, { statut: 'Terminée', isArchived: true }).catch(console.error); }
              addToast(`Action "${updatedAction.etablissement}" terminée et archivée automatiquement${linkedEv ? ' · événement synchronisé' : ''}.`);
            } else {
              addToast('Checklist mise à jour');
            }
          }}
        />
      )}

      {/* ─── TUTORIEL SPOTLIGHT ────────────────────────────────────────────── */}
      {showTutorial && (
        <TutorialOverlay
          handleNav={handleNav}
          onComplete={handleTutorialDone}
          onSkip={handleTutorialDone}
        />
      )}
    </>
  );
}

export default App;
