// src/contexts/DataContext.jsx
// État métier global + tous les handlers.
// Consomme AppContext pour addToast/requestConfirm/setters de modales.
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import api from '../api/apiClient';
import { POLES, PROJETS } from '../data/constants';
import { generateAutoTasks, buildPropagationMessage, fmtHeure } from '../utils/utils';

const DataContext = createContext(null);

// ─── SLICE CONTEXTS (sélection fine par domaine) ──────────────────────────────
export const UserSliceContext       = createContext(null);
export const SpaceSliceContext      = createContext(null);
export const OperationsSliceContext = createContext(null);
export const FinanceSliceContext    = createContext(null);
export const CommsSliceContext      = createContext(null);

// ─── Helper pour construire un événement Coordination lié à une action ──────
const buildLinkedEvent = (form, actionId, cycle) => {
  const eventDate = form.date_debut || new Date().toISOString().split('T')[0];
  return {
    titre: form.titreCoordination?.trim() || form.etablissement,
    date: eventDate,
    cycle,
    lieu: form.lieu || form.ville || '',
    actionId,
    description: form.description || '',
    poles: form.poles || [],
    projet: form.projet || '',
    equipe: form.equipe || [],
    fichiers: [],
    statut: 'En cours',
    isArchived: false,
    whatsappLink: '',
    seances: [{
      id: Date.now(),
      date: eventDate,
      heure: 'À définir',
      libelle: form.date_debut ? 'Séance initiale' : 'Date à confirmer',
      aVenir: form.description || '',
      inscrits: [],
      bilan: '',
      fichiers: [],
      duree: '',
    }],
  };
};

export function DataProvider({ children }) {
  const { currentUser, updateCurrentUser } = useAuth();
  const {
    addToast, requestConfirm, setConfirmDialog,
    setActionModal, setEventModal, setNoteFraisModal, setTransactionModal,
    setMissionModal, handleNav,
    setHighlightedEventId, setActiveEventId, setHighlightedActionId,
    setAnnuaireInitialTab,
  } = useAppContext();

  // ─── CYCLES ──────────────────────────────────────────────────────────────
  const [cycles, setCycles]           = useState(['2025-2026', '2024-2025', '2023-2024']);
  const [activeCycle, setActiveCycle] = useState('2025-2026');

  // ─── DONNÉES MÉTIER ───────────────────────────────────────────────────────
  const [directory,       setDirectory]       = useState([]);
  const [actions,         setActions]         = useState([]);
  const [evenements,      setEvenements]      = useState([]);
  const [contacts,        setContacts]        = useState([]);
  const [conversations,   setConversations]   = useState([]);
  const [transactions,    setTransactions]    = useState([]);
  const [budgets,         setBudgets]         = useState({});
  const [tasks,           setTasks]           = useState([]);
  const [taskRequests,    setTaskRequests]    = useState([]);
  const [jobOffers,       setJobOffers]       = useState([]);
  const [volunteerHours,  setVolunteerHours]  = useState([]);
  const [missions,        setMissions]        = useState([]);
  const [notesFrais,      setNotesFrais]      = useState([]);
  const [faqs,            setFaqs]            = useState([]);
  const [devisFactures,   setDevisFactures]   = useState([]);
  const [categoriesDF,    setCategoriesDF]    = useState([]);
  const [fichiersPrefaits, setFichiersPrefaits] = useState([]);
  const [ndfConfig,       setNdfConfig]       = useState({
    categories: [
      { label: 'Transport', plafond: '', note: '' },
      { label: 'Hébergement', plafond: '', note: '' },
      { label: 'Repas', plafond: '', note: '' },
      { label: 'Fournitures', plafond: '', note: '' },
      { label: 'Matériel pédagogique', plafond: '', note: '' },
      { label: 'Communication', plafond: '', note: '' },
      { label: 'Autre', plafond: '', note: '' },
    ],
    instructions: '',
    delaiJours: '30',
    plafondGlobal: '',
  });

  // ─── ESPACES ──────────────────────────────────────────────────────────────
  const [spaceChats,      setSpaceChats]      = useState({});
  const [docsData,        setDocsData]        = useState({});
  const [spaceInfos,      setSpaceInfos]      = useState({});
  const [spaceSections,   setSpaceSections]   = useState({});
  const [spaceTeams,      setSpaceTeams]      = useState({});
  const [trash,           setTrash]           = useState([]);
  const [spaceChatInput,  setSpaceChatInput]  = useState('');

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState([]);
  const [notifLues, setNotifLuesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifLues') || '[]'); } catch { return []; }
  });

  const setNotifLues = (val) => {
    const next = typeof val === 'function' ? val(notifLues) : val;
    const newlyRead = next.filter(id => !notifLues.includes(id));
    newlyRead.forEach(id => api.patch(`/notifications/${id}/lu`).catch(() => {}));
    setNotifLuesRaw(next);
    try { localStorage.setItem('notifLues', JSON.stringify(next)); } catch {}
  };

  // ─── CHARGEMENT INITIAL ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    async function loadAllData() {
      try {
        const [
          usersData, actionsData, eventsData, tasksData, taskReqData,
          transactionsData, budgetsData, missionsData, notesFraisData,
          notifsData, hoursData, convsData, spaceSettingsData,
          faqData, devisFacturesData, categoriesDFData,
        ] = await Promise.all([
          api.get('/users'),
          api.get('/actions'),
          api.get('/events'),
          api.get('/tasks'),
          api.get('/tasks/requests'),
          api.get('/tresorerie/transactions'),
          api.get('/tresorerie/budgets'),
          api.get('/missions'),
          api.get('/tresorerie/notes-frais'),
          api.get('/notifications'),
          api.get('/hours'),
          api.get('/messagerie/conversations'),
          api.get('/spaces/settings'),
          api.get('/faq').catch(() => []),
          api.get('/devis-factures').catch(() => []),
          api.get('/categories-df').catch(() => []),
        ]);
        const contactsData = await api.get('/contacts').catch(() => []);

        setDirectory(usersData || []);
        setActions(actionsData || []);
        setEvenements(eventsData || []);
        setContacts(contactsData || []);
        setTasks(tasksData || []);
        setTaskRequests(taskReqData || []);
        setTransactions(transactionsData || []);
        setBudgets(budgetsData || {});
        setMissions(missionsData || []);
        setNotesFrais(notesFraisData || []);
        setFaqs(faqData || []);
        setDevisFactures(devisFacturesData || []);
        setCategoriesDF(categoriesDFData || []);
        setNotifs(notifsData || []);
        // Initialiser notifLues depuis le serveur (ID ou nom de l'utilisateur dans lu[])
        // Fusionne avec le localStorage pour ne pas perdre les marques locales
        if (Array.isArray(notifsData) && currentUser) {
          const userId = String(currentUser.id);
          const serverRead = notifsData
            .filter(n => Array.isArray(n.lu) && (n.lu.includes(userId) || n.lu.includes(currentUser.nom)))
            .map(n => n.id);
          if (serverRead.length > 0) {
            setNotifLuesRaw(prev => {
              const merged = [...new Set([...prev, ...serverRead])];
              try { localStorage.setItem('notifLues', JSON.stringify(merged)); } catch {}
              return merged;
            });
          }
        }
        setVolunteerHours(hoursData || []);
        setConversations(convsData || []);

        if (spaceSettingsData) {
          const teams = {}, sections = {}, docs = {}, infos = {};
          const allTrash = [];
          for (const [space, keys] of Object.entries(spaceSettingsData)) {
            if (keys.teams) teams[space] = keys.teams;
            if (keys.sections) sections[space] = keys.sections;
            if (keys.docs) docs[space] = keys.docs;
            if (keys.info) infos[space] = keys.info;
            if (keys.trash) allTrash.push(...keys.trash);
            if (space === 'Trésorerie' && keys.ndf_config) setNdfConfig(keys.ndf_config);
            if (space === 'Global' && keys.fichiers_prefaits) setFichiersPrefaits(keys.fichiers_prefaits);
          }
          if (Object.keys(teams).length) setSpaceTeams(prev => ({ ...prev, ...teams }));
          if (Object.keys(sections).length) setSpaceSections(prev => ({ ...prev, ...sections }));
          if (Object.keys(docs).length) setDocsData(prev => ({ ...prev, ...docs }));
          if (Object.keys(infos).length) setSpaceInfos(prev => ({ ...prev, ...infos }));
          if (allTrash.length) setTrash(allTrash);
        }
      } catch (err) {
        console.error('Erreur chargement données :', err);
      }
    }
    loadAllData();
  }, [currentUser]);

  // ─── MOTEUR DE PERMISSIONS (RBAC) ─────────────────────────────────────────
  const isAdmin  = currentUser?.role === 'Admin';
  const isBureau = currentUser?.role === 'Bureau';

  const getSpaceRole = (space, userName = currentUser?.nom) => {
    const teamYear = activeCycle === 'Toutes' ? cycles[0] : activeCycle;
    const team = (spaceTeams[space] || {})[teamYear] || [];
    const membership = team.find(m => m.nom === userName);
    if (membership) return membership.role;
    const user = userName === currentUser?.nom ? currentUser : (directory || []).find(u => u.nom === userName);
    const perm = (user?.permissions || []).find(p => p.pole === space);
    if (perm?.level === 'edit') return 'Responsable';
    if (perm?.level === 'view') return 'Membre';
    return null;
  };

  const getSpaceAccess = (space) => {
    if (isAdmin) return { canView: true, canInteract: true, canManage: true };
    const spaceRole = getSpaceRole(space);
    const isManager = spaceRole === 'Responsable' || spaceRole === 'Direction';
    const isMember  = spaceRole !== null;
    if (isManager) return { canView: true, canInteract: true, canManage: true };
    if (isMember)  return { canView: true, canInteract: true, canManage: false };
    if (isBureau)  return { canView: true, canInteract: false, canManage: false };
    const perms    = currentUser?.permissions || [];
    const explicit = perms.find(p => p.pole === space);
    if (explicit?.level === 'edit')  return { canView: true, canInteract: true, canManage: true };
    if (explicit?.level === 'view')  return { canView: true, canInteract: true, canManage: false };
    if (explicit?.level === 'read')  return { canView: true, canInteract: false, canManage: false };
    return { canView: false, canInteract: false, canManage: false };
  };

  const hasPower = (power) => {
    if (isAdmin) return true;
    if (power === 'view_rh') return getSpaceRole('Ressources Humaines') !== null;
    if (power === 'manage_budgets') {
      if (isBureau) return true;
      const r = getSpaceRole('Trésorerie');
      return r === 'Responsable' || r === 'Direction';
    }
    return false;
  };

  // ─── ESPACES ACCESSIBLES ──────────────────────────────────────────────────
  const accessiblePoles   = currentUser ? POLES.filter(p => getSpaceAccess(p).canView) : [];
  const accessibleProjets = currentUser ? PROJETS.filter(p => getSpaceAccess(p).canView) : [];
  const myTeamSpaces = currentUser ? (() => {
    const year = activeCycle === 'Toutes' ? cycles[0] : activeCycle;
    return [...POLES, ...PROJETS].flatMap(space => {
      const m = (spaceTeams[space]?.[year] || []).find(mem => mem.nom === currentUser.nom);
      return m ? [{ space, role: m.role, type: POLES.includes(space) ? 'pole' : 'projet' }] : [];
    });
  })() : [];

  const isResponsable = isAdmin || isBureau || myTeamSpaces.some(s => s.role === 'Responsable' || s.role === 'Direction');

  // ─── HELPER NOTIF ─────────────────────────────────────────────────────────
  const makeNotif = (overrides = {}) => ({
    auteur: currentUser?.nom,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    lu: [],
    targetPoles: [],
    targetUsers: [],
    cible: 'tous',
    priorite: 'normale',
    source: 'system',
    ...overrides,
  });

  // ─── NOTIFICATIONS CALCULÉES ──────────────────────────────────────────────
  const visibleNotifs = useMemo(() =>
    notifs
      .filter(n => (n.source === 'bureau' || (!n.source && n.auteur !== 'Système')) && (
        n.cible === 'tous' ||
        (n.cible === 'pole' && (n.targetPoles || []).includes(currentUser?.pole)) ||
        (n.cible === 'personnes' && (n.targetUsers || []).includes(currentUser?.nom))
      ))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [notifs, currentUser?.pole, currentUser?.nom]);

  const personalNotifs = useMemo(() =>
    notifs
      .filter(n => n.source === 'system' && (
        (n.targetUsers || []).includes(currentUser?.nom) ||
        (n.cible === 'pole' && (n.targetPoles || []).includes(currentUser?.pole))
      ))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [notifs, currentUser?.nom, currentUser?.pole]);

  const unreadCount = useMemo(() =>
    [...visibleNotifs, ...personalNotifs].filter(n => !notifLues.includes(n.id)).length,
  [visibleNotifs, personalNotifs, notifLues]);

  const notifBadgeCount = unreadCount;

  const upcomingNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];
    visibleNotifs.forEach(n => {
      if (!notifLues.includes(n.id)) {
        list.push({ type: 'annonce', id: n.id, title: n.titre, description: n.contenu.substring(0, 50), date: n.createdAt, priority: n.priorite === 'haute' ? 'high' : 'normal', icon: 'announce' });
      }
    });
    tasks.forEach(t => {
      if (!t.assignees?.some(a => a.name === currentUser?.nom) || t.status === 'Terminé' || !t.deadline) return;
      const [y, m, d] = t.deadline.split('-');
      const daysUntil = Math.ceil((new Date(+y, +m - 1, +d) - today) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 7) {
        list.push({ type: 'task', id: `task-${t.id}`, taskId: t.id, space: t.space, title: t.text, description: `Deadline: ${t.deadline}`, date: t.deadline, priority: daysUntil <= 2 ? 'high' : 'normal', icon: 'done', daysUntil });
      }
    });
    evenements.forEach(e => {
      if (e.isArchived || !e.seances) return;
      e.seances.forEach(s => {
        if (!s.date) return;
        const [y, m, d] = s.date.split('-');
        const daysUntil = Math.ceil((new Date(+y, +m - 1, +d) - today) / 86400000);
        if (daysUntil >= 0 && daysUntil <= 7) {
          list.push({ type: 'seance', id: `seance-${e.id}-${s.id}`, eventId: e.id, title: e.titre, description: `${s.libelle} - ${s.heure}`, date: s.date, priority: daysUntil <= 2 ? 'high' : 'normal', icon: 'calendar', daysUntil });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleNotifs, notifLues, tasks, evenements, currentUser?.nom]);

  // ─── AUTO-NOTIFICATIONS AU DÉMARRAGE ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date().toISOString();

    // Tâches en retard — une notif par tâche, une seule fois
    tasks.forEach(task => {
      if (!task.deadline || task.status === 'Terminé' || !task.assignees?.some(a => a.name === currentUser.nom)) return;
      const dl = new Date(task.deadline);
      dl.setHours(0, 0, 0, 0);
      if (dl < today) {
        const alreadyNotified = notifs.some(n =>
          n.source === 'system' && n.titre?.includes(task.text) &&
          (n.targetUsers || []).includes(currentUser.nom)
        );
        if (!alreadyNotified) {
          const notifData = makeNotif({
            titre: `Tâche en retard — ${task.text}`,
            contenu: `La tâche "${task.text}" (${task.space}) devait être terminée le ${task.deadline}.`,
            cible: 'personnes', targetUsers: [currentUser.nom],
            priorite: 'haute',
          });
          setNotifs(prev => [{ id: Date.now() + Math.random(), ...notifData }, ...prev]);
          api.post('/notifications', notifData).catch(console.error);
        }
      }
    });
  }, [currentUser?.nom, tasks.length]);

  // ─── HANDLERS UTILISATEUR ─────────────────────────────────────────────────
  const changeMyStatus = async (newStatut) => {
    if (!currentUser) return;
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, statut: newStatut } : m));
    updateCurrentUser({ statut: newStatut });
    await api.patch(`/users/${currentUser.id}`, { statut: newStatut }).catch(err => addToast(`Erreur mise à jour statut : ${err?.message}`, 'error'));
  };

  const handleDeclareConge = async (conge) => {
    const newConges = [...(currentUser.conges || []), conge];
    const updates = { statut: 'En congé', conges: newConges };
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, ...updates } : m));
    updateCurrentUser(updates);
    await api.patch(`/users/${currentUser.id}`, updates).catch(err => addToast(`Erreur congé : ${err?.message}`, 'error'));
    addToast('Congé déclaré');
  };

  const handleEndCongeNow = async () => {
    const updates = { statut: 'Actif', conges: (currentUser.conges || []).map((c, i, arr) => i === arr.length - 1 ? { ...c, dateFin: new Date().toISOString().split('T')[0] } : c) };
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, ...updates } : m));
    updateCurrentUser(updates);
    await api.patch(`/users/${currentUser.id}`, updates).catch(err => addToast(`Erreur fin congé : ${err?.message}`, 'error'));
    addToast('Congé terminé');
  };

  const handleEditConge = async (index, updatedConge) => {
    const newConges = (currentUser.conges || []).map((c, i) => i === index ? updatedConge : c);
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, conges: newConges } : m));
    updateCurrentUser({ conges: newConges });
    await api.patch(`/users/${currentUser.id}`, { conges: newConges }).catch(err => addToast(`Erreur modification congé : ${err?.message}`, 'error'));
    addToast('Congé modifié');
  };

  const handleDeleteConge = async (index) => {
    const newConges = (currentUser.conges || []).filter((_, i) => i !== index);
    const newStatut = newConges.length === 0 || newConges[newConges.length - 1]?.dateFin ? 'Actif' : currentUser.statut;
    const updates = { conges: newConges, statut: newStatut };
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, ...updates } : m));
    updateCurrentUser(updates);
    await api.patch(`/users/${currentUser.id}`, updates).catch(err => addToast(`Erreur suppression congé : ${err?.message}`, 'error'));
    addToast('Congé supprimé');
  };

  const handleRenameUser = async (userId, newNom) => {
    const oldNom = directory.find(m => m.id === userId)?.nom;
    if (!oldNom || oldNom === newNom) return;
    setDirectory(prev => prev.map(m => m.id === userId ? { ...m, nom: newNom } : m));
    await api.patch(`/users/${userId}`, { nom: newNom }).catch(err => addToast(`Erreur renommage : ${err?.message}`, 'error'));
    addToast(`Membre renommé : ${oldNom} → ${newNom}`);
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    updateCurrentUser({ avatar: null });
    setDirectory(prev => prev.map(m => m.id === currentUser.id ? { ...m, avatar: null } : m));
    await api.patch(`/users/${currentUser.id}`, { avatar: null }).catch(console.error);
  };

  // ─── CYCLES ──────────────────────────────────────────────────────────────
  const handleNextCycle = async () => {
    const [startYear] = (cycles[0] || '2025-2026').split('-').map(Number);
    const newCycle = `${startYear + 1}-${startYear + 2}`;
    if (cycles.includes(newCycle)) { addToast('Ce cycle existe déjà', 'warning'); return; }
    const newCycles = [newCycle, ...cycles];
    setCycles(newCycles);
    setActiveCycle(newCycle);
    await api.post('/cycles', { label: newCycle }).catch(err => addToast(`Erreur création cycle : ${err?.message}`, 'error'));
    addToast(`Cycle ${newCycle} créé`);
  };

  const handleDeleteCycle = async (cycleLabel) => {
    requestConfirm(`Supprimer le cycle "${cycleLabel}" ? Cette action est irréversible.`, async () => {
      const newCycles = cycles.filter(c => c !== cycleLabel);
      setCycles(newCycles);
      if (activeCycle === cycleLabel) setActiveCycle(newCycles[0] || '');
      await api.delete(`/cycles/${encodeURIComponent(cycleLabel)}`).catch(err => addToast(`Erreur suppression cycle : ${err?.message}`, 'error'));
      addToast(`Cycle ${cycleLabel} supprimé`);
    });
  };

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  const handleSendNotif = async (form) => {
    if (!form.titre || !form.contenu) { addToast('Titre et contenu requis', 'warning'); return; }
    if (form.cible === 'pole' && form.targetPoles.length === 0) { addToast('Sélectionnez au least un pôle', 'warning'); return; }
    if (form.cible === 'personnes' && form.targetUsers.length === 0) { addToast('Sélectionnez at least une personne', 'warning'); return; }
    const notifData = makeNotif({ ...form, source: 'bureau' });
    const tempId = Date.now();
    setNotifs(prev => [{ id: tempId, ...notifData }, ...prev]);
    api.post('/notifications', notifData).then(created => {
      if (created?.id) setNotifs(prev => prev.map(n => n.id === tempId ? { ...n, id: created.id } : n));
    }).catch(console.error);
    addToast('Annonce publiée');
  };

  const handleDeleteNotif = (notifId) => {
    setNotifs(prev => prev.filter(n => n.id !== notifId));
    api.delete(`/notifications/${notifId}`).catch(console.error);
  };

  // ─── DEMANDES DE TÂCHES ───────────────────────────────────────────────────
  const handleAssignTaskRequest = (requestId, assignees) => {
    const req = taskRequests.find(r => r.id === requestId);
    if (!req) return;
    const newTask = { ...req, assignees, status: 'À faire', cycle: cycles[0] };
    const tempId = -(Math.floor(Math.random() * 900000) + 100000);
    setTasks(prev => [{ id: tempId, ...newTask }, ...prev]);
    setTaskRequests(prev => prev.filter(r => r.id !== requestId));
    api.post('/tasks', newTask).then(created => {
      if (created?.id) setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: created.id } : t));
    }).catch(console.error);
    api.delete(`/tasks/requests/${requestId}`).catch(console.error);
    addToast('Tâche assignée');
  };

  const handleRefuseTaskRequest = (requestId) => {
    setTaskRequests(prev => prev.filter(r => r.id !== requestId));
    api.delete(`/tasks/requests/${requestId}`).catch(console.error);
    addToast('Demande refusée');
  };

  // ─── CORBEILLE & DOCS ─────────────────────────────────────────────────────
  const moveToTrash = (type, item, space) => {
    const trashItem = { id: Date.now(), type, item, space, deletedAt: new Date().toISOString() };
    setTrash(prev => [...prev, trashItem]);
    api.post(`/spaces/${encodeURIComponent(space)}/settings/trash`, trashItem).catch(console.error);
  };

  const restoreTrash = (trashId) => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return;
    setTrash(prev => prev.filter(t => t.id !== trashId));
    if (item.type === 'doc') setDocsData(prev => ({ ...prev, [item.space]: [...(prev[item.space] || []), item.item] }));
    else if (item.type === 'action') setActions(prev => [...prev, item.item]);
    else if (item.type === 'event') setEvenements(prev => [...prev, item.item]);
    api.delete(`/spaces/${encodeURIComponent(item.space)}/settings/trash/${trashId}`).catch(console.error);
    addToast('Élément restauré');
  };

  const forceDeleteTrash = (trashId) => {
    setTrash(prev => prev.filter(t => t.id !== trashId));
    const item = trash.find(t => t.id === trashId);
    if (item) api.delete(`/spaces/${encodeURIComponent(item.space)}/settings/trash/${trashId}`).catch(console.error);
    addToast('Supprimé définitivement');
  };

  const changeDocSection = (space, docId, newSection) => {
    setDocsData(prev => ({ ...prev, [space]: (prev[space] || []).map(d => d.id === docId ? { ...d, section: newSection } : d) }));
    api.patch(`/spaces/${encodeURIComponent(space)}/docs/${docId}`, { section: newSection }).catch(console.error);
  };

  const moveSection = (space, sectionName, direction) => {
    setSpaceSections(prev => {
      const sections = [...(prev[space] || [])];
      const idx = sections.indexOf(sectionName);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sections.length) return prev;
      [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
      api.put(`/spaces/${encodeURIComponent(space)}/settings/sections`, { value: sections }).catch(console.error);
      return { ...prev, [space]: sections };
    });
  };

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const toggleArchiveAction = (action) => {
    const linkedEv = evenements.find(e => e.actionId === action.id);
    const newArchived = !action.isArchived;
    const newStatut   = newArchived ? 'Terminée' : 'En cours';
    const verb        = newArchived ? 'Archiver' : 'Désarchiver';
    const doArchiveAction = () => {
      setActions(prev => prev.map(x => x.id === action.id ? { ...x, isArchived: newArchived, statut: newStatut } : x));
      api.put(`/actions/${action.id}`, { isArchived: newArchived, statut: newStatut }).catch(console.error);
    };
    const doArchiveLinkedEv = () => {
      if (!linkedEv) return;
      setEvenements(prev => prev.map(x => x.id === linkedEv.id ? { ...x, isArchived: newArchived, statut: newStatut } : x));
      api.put(`/events/${linkedEv.id}`, { isArchived: newArchived, statut: newStatut }).catch(console.error);
    };
    if (linkedEv) {
      setConfirmDialog({
        msg: `${verb} l'action "${action.etablissement}" ? L'événement lié "${linkedEv.titre}" peut aussi être ${newArchived ? 'archivé' : 'désarchivé'}.`,
        confirmLabel: `${verb} l'action seulement`,
        onConfirm: () => { doArchiveAction(); addToast(newArchived ? 'Action archivée' : 'Action désarchivée'); },
        extraAction: { label: `${verb} action + événement`, cb: () => { doArchiveAction(); doArchiveLinkedEv(); addToast(newArchived ? 'Action + événement archivés' : 'Action + événement désarchivés'); } },
      });
    } else {
      requestConfirm(`${verb} "${action.etablissement}" ?`, () => { doArchiveAction(); addToast(newArchived ? 'Action archivée' : 'Action désarchivée'); });
    }
  };

  const deleteAction = (action) => {
    const linkedEv = evenements.find(e => e.actionId === action.id);
    const doDeleteAction = () => {
      moveToTrash('action', action, 'Global');
      setTasks(prev => prev.filter(t => t.actionId !== action.id));
      setVolunteerHours(prev => prev.map(h => h.actionId === action.id ? { ...h, actionId: null } : h));
      setActions(prev => prev.filter(x => x.id !== action.id));
      api.delete(`/actions/${action.id}`).catch(err => addToast(`Erreur suppression action : ${err?.message}`, 'error'));
    };
    const doDeleteLinkedEv = () => {
      if (!linkedEv) return;
      moveToTrash('event', linkedEv, 'Global');
      setEvenements(prev => prev.filter(x => x.id !== linkedEv.id));
      api.delete(`/events/${linkedEv.id}`).catch(console.error);
      setActiveEventId(null);
    };
    if (linkedEv) {
      setConfirmDialog({
        msg: `Supprimer l'action "${action.etablissement}" ? L'événement lié "${linkedEv.titre}" peut aussi être supprimé.`,
        confirmLabel: "Supprimer l'action seulement",
        onConfirm: doDeleteAction,
        extraAction: { label: 'Supprimer action + événement', cb: () => { doDeleteAction(); doDeleteLinkedEv(); } },
      });
    } else {
      requestConfirm(`Supprimer l'action "${action.etablissement}" ?`, doDeleteAction);
    }
  };

  const handleUpdateActionStatus = (actionId, newStatut) => {
    const action = actions.find(a => a.id === actionId);
    const linkedEv = action ? evenements.find(e => e.actionId === actionId) : null;
    const isFinished = newStatut === 'Terminée';
    const wasFinished = action?.statut === 'Terminée';
    const newActionArchived = isFinished ? true : (wasFinished ? false : (action?.isArchived || false));
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, statut: newStatut, isArchived: newActionArchived } : a));
    api.put(`/actions/${actionId}`, { statut: newStatut, isArchived: newActionArchived }).catch(err => addToast(`Erreur mise à jour statut : ${err?.message}`, 'error'));
    if (linkedEv) {
      const newEventArchived = isFinished ? true : (wasFinished ? false : linkedEv.isArchived);
      setEvenements(prev => prev.map(e => e.id === linkedEv.id ? { ...e, statut: newStatut, isArchived: newEventArchived } : e));
      api.put(`/events/${linkedEv.id}`, { statut: newStatut, isArchived: newEventArchived }).catch(console.error);
    }
    if (isFinished) {
      const now = new Date().toISOString();
      setTasks(prev => prev.map(t => {
        if (t.actionId !== actionId || t.status === 'Terminé') return t;
        api.put(`/tasks/${t.id}`, { status: 'Terminé', completedAt: now }).catch(console.error);
        return { ...t, status: 'Terminé', completedAt: now };
      }));
    }
    addToast(isFinished ? `Action terminée et archivée${linkedEv ? ' · événement synchronisé' : ''}` : 'Statut mis à jour');
  };

  const handleUpdateActionResponsables = (actionId, responsables) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, responsables } : a));
    api.put(`/actions/${actionId}`, { responsables }).catch(err => addToast(`Erreur mise à jour responsables : ${err?.message}`, 'error'));
    addToast('Responsables mis à jour');
  };

  const handleSendActionReminder = (targetUser, actionTitle, eventTitle) => {
    const now = new Date();
    const dateStr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][now.getMonth()] + ' ' + now.getDate();
    const notifData = makeNotif({
      titre: `Rappel — ${actionTitle}`,
      contenu: `${currentUser.nom} vous rappelle votre rôle de responsable sur l'action "${actionTitle}"${eventTitle !== actionTitle ? ` (coordination : ${eventTitle})` : ''}.`,
      cible: 'personnes', targetUsers: [targetUser], date: dateStr, source: 'system',
    });
    const tempId = Date.now();
    setNotifs(prev => [{ id: tempId, ...notifData }, ...prev]);
    api.post('/notifications/reminder', {
      titre: notifData.titre,
      contenu: notifData.contenu,
      targetUsers: notifData.targetUsers,
    }).then(created => {
      if (created?.id) setNotifs(prev => prev.map(n => n.id === tempId ? { ...n, id: created.id } : n));
    }).catch(console.error);
    addToast(`Rappel envoyé à ${targetUser}`);
  };

  const handleSaveAction = async (form) => {
    if (form.id) {
      setActions(prev => prev.map(a => a.id === form.id ? form : a));
      const { createdAt, updatedAt, ...data } = form;
      api.put(`/actions/${form.id}`, data).catch(err => addToast(`Erreur sauvegarde action : ${err?.message}`, 'error'));
      const linkedEvent = evenements.find(e => e.actionId === form.id);
      if (linkedEvent) {
        const updatedEvent = { ...linkedEvent, titre: form.titreCoordination?.trim() || form.etablissement || linkedEvent.titre, date: form.date_debut || linkedEvent.date, lieu: form.lieu || form.ville || linkedEvent.lieu || '', cycle: form.cycle || linkedEvent.cycle, projet: form.projet || linkedEvent.projet || '' };
        setEvenements(prev => prev.map(e => e.id === linkedEvent.id ? updatedEvent : e));
        const { createdAt: _c, updatedAt: _u, ...evData } = updatedEvent;
        api.put(`/events/${linkedEvent.id}`, evData).catch(console.error);
      }
      if (form.transactionId) {
        const prevAction = actions.find(a => a.id === form.id);
        if (prevAction?.budgetPrevisionnel !== form.budgetPrevisionnel) {
          const txUpdate = { montant: Number(form.budgetPrevisionnel) };
          setTransactions(prev => prev.map(t => t.id === form.transactionId ? { ...t, ...txUpdate } : t));
          api.put(`/tresorerie/transactions/${form.transactionId}`, txUpdate).catch(console.error);
        }
      }
      addToast('Action mise à jour');
    } else {
      const tempActionId = -(Math.floor(Math.random() * 900000) + 100000);
      const newAction = { ...form, id: tempActionId };
      setActions(prev => [newAction, ...prev]);
      const { id: _id, createdAt: _c, updatedAt: _u, ...actionPayload } = newAction;
      api.post('/actions', actionPayload).then(created => {
        const realActionId = created?.id || tempActionId;
        if (created?.id) setActions(prev => prev.map(a => a.id === tempActionId ? { ...a, id: created.id } : a));
        else { addToast('Erreur : action non sauvegardée en base', 'error'); return; }
        if (form.etablissement) {
          const eventData = buildLinkedEvent(form, realActionId, form.cycle || cycles[0]);
          const tempEventId = Date.now() + 1;
          setEvenements(prev => [{ ...eventData, id: tempEventId }, ...prev]);
          api.post('/events', eventData).then(createdEvent => {
            if (createdEvent?.id) setEvenements(prev => prev.map(e => e.id === tempEventId ? { ...e, id: createdEvent.id } : e));
          }).catch(err => addToast(`Événement non créé : ${err?.message || 'Erreur serveur'}`, 'error'));
        }
      }).catch(err => addToast(`Action non sauvegardée : ${err?.message || 'Erreur serveur'}`, 'error'));
      addToast("Action créée (événement en Coordination)");
    }
    setActionModal(null);
  };

  // ─── WIZARD ───────────────────────────────────────────────────────────────
  const handleWizardComplete = (form, config) => {
    const tempId = -(Math.floor(Math.random() * 900000) + 100000);
    const cycle  = form.cycle || cycles[0];
    const newAction = { ...form, id: tempId, isArchived: false, checklist: config.checklist || null, timeline: [{ date: new Date().toISOString().split('T')[0], icon: 'created', texte: `Action créée par ${currentUser.nom}`, auto: true }], completionScore: 0 };
    setActions(prev => [newAction, ...prev]);
    const { createdAt: _c, updatedAt: _u, id: _id, ...actionPayload } = newAction;
    api.post('/actions', actionPayload).then(created => {
      if (!created?.id) return;
      const realActionId = created.id;
      setActions(prev => prev.map(a => a.id === tempId ? { ...a, id: realActionId } : a));
      if (form.etablissement) {
        const eventData = buildLinkedEvent(form, realActionId, cycle);
        api.post('/events', eventData).then(createdEvent => {
          if (createdEvent?.id) setEvenements(prev => [createdEvent, ...prev]);
        }).catch(err => addToast(`Événement non créé : ${err?.message || 'Erreur serveur'}`, 'error'));
      }
      if (config.createTasks && config.editableTasks?.length > 0) {
        const reqs = config.editableTasks.map(t => ({ text: t.text, description: t.description || '', space: t.space, actionId: realActionId, requestedBy: currentUser.nom, assignees: [], targetPool: [], deadline: t.deadline || form.date_fin || form.date_debut || '', cycle, status: 'En attente' }));
        Promise.all(reqs.map(r => api.post('/tasks/requests', r))).then(created => {
          const valid = created.filter(r => r?.id);
          if (valid.length) setTaskRequests(prev => [...prev, ...valid]);
        }).catch(console.error);
      }
    }).catch(err => addToast(`Erreur lors de la création de l'action : ${err?.message || 'Erreur inconnue'}`, 'error'));
    if (config.notifySpaces?.length > 0) {
      const msg = buildPropagationMessage(newAction, currentUser.nom);
      const now = fmtHeure();
      setSpaceChats(prev => {
        const next = { ...prev };
        config.notifySpaces.forEach(sp => { next[sp] = [...(prev[sp] || []), { id: Date.now() + Math.random(), auteur: 'Système', avatar: 'S', texte: msg, heure: now }]; });
        return next;
      });
      config.notifySpaces.forEach(sp => api.post(`/messagerie/space-chats/${encodeURIComponent(sp)}`, { texte: msg, heure: now }).catch(console.error));
    }
    if (config.budgetPrevisionnel > 0) {
      const txTempId = Date.now() + 2;
      const txPayload = { date: form.date_debut || new Date().toISOString().split('T')[0], libelle: `Prévision — ${form.etablissement}`, type: 'Dépense', montant: Number(config.budgetPrevisionnel), imputation: form.projet || 'Fonctionnement Global', statut: 'En attente', fichiers: [] };
      setTransactions(prev => [{ ...txPayload, id: txTempId }, ...prev]);
      api.post('/tresorerie/transactions', txPayload).then(created => {
        if (created?.id) setTransactions(prev => prev.map(t => t.id === txTempId ? { ...t, id: created.id } : t));
      }).catch(console.error);
    }
    addToast(`Action "${form.etablissement}" créée avec succès.`);
  };

  // ─── ÉVÉNEMENTS ───────────────────────────────────────────────────────────
  const toggleArchiveEvent = (ev) => {
    const linkedAction = ev.actionId ? actions.find(a => a.id === ev.actionId) : null;
    const newArchived = !ev.isArchived;
    const newStatut   = newArchived ? 'Terminée' : 'En cours';
    const verb        = newArchived ? 'Archiver' : 'Désarchiver';
    const doArchiveEvent = () => {
      setEvenements(prev => prev.map(x => x.id === ev.id ? { ...x, isArchived: newArchived, statut: newStatut } : x));
      api.put(`/events/${ev.id}`, { isArchived: newArchived, statut: newStatut }).catch(console.error);
      setActiveEventId(null);
    };
    const doArchiveLinkedAction = () => {
      if (!linkedAction) return;
      setActions(prev => prev.map(x => x.id === linkedAction.id ? { ...x, isArchived: newArchived, statut: newStatut } : x));
      api.put(`/actions/${linkedAction.id}`, { isArchived: newArchived, statut: newStatut }).catch(console.error);
    };
    if (linkedAction) {
      setConfirmDialog({
        msg: `${verb} l'événement "${ev.titre}" ? L'action liée "${linkedAction.etablissement}" peut aussi être ${newArchived ? 'archivée' : 'désarchivée'}.`,
        confirmLabel: `${verb} l'événement seulement`,
        onConfirm: () => { doArchiveEvent(); addToast(newArchived ? 'Événement archivé' : 'Événement désarchivé'); },
        extraAction: { label: `${verb} événement + action`, cb: () => { doArchiveEvent(); doArchiveLinkedAction(); addToast(newArchived ? 'Événement + action archivés' : 'Événement + action désarchivés'); } },
      });
    } else {
      requestConfirm(`${verb} "${ev.titre}" ?`, () => { doArchiveEvent(); addToast(newArchived ? 'Événement archivé' : 'Événement désarchivé'); });
    }
  };

  const deleteEvent = (ev) => {
    const linkedAction = ev.actionId ? actions.find(a => a.id === ev.actionId) : null;
    const doDeleteEvent = () => {
      moveToTrash('event', ev, 'Global');
      setEvenements(prev => prev.filter(x => x.id !== ev.id));
      api.delete(`/events/${ev.id}`).catch(console.error);
      setActiveEventId(null);
    };
    const doDeleteLinkedAction = () => {
      if (!linkedAction) return;
      moveToTrash('action', linkedAction, 'Global');
      setActions(prev => prev.filter(x => x.id !== linkedAction.id));
      api.delete(`/actions/${linkedAction.id}`).catch(console.error);
    };
    if (linkedAction) {
      setConfirmDialog({
        msg: `Supprimer l'événement "${ev.titre}" ? L'action liée "${linkedAction.etablissement}" peut aussi être supprimée.`,
        confirmLabel: "Supprimer l'événement seulement",
        onConfirm: doDeleteEvent,
        extraAction: { label: 'Supprimer événement + action', cb: () => { doDeleteEvent(); doDeleteLinkedAction(); } },
      });
    } else {
      requestConfirm(`Supprimer l'événement "${ev.titre}" ?`, doDeleteEvent);
    }
  };

  const handleSaveEvent = async (form) => {
    if (form.id) {
      let finalForm = form;
      const seances = form.seances || [];
      if (seances.length > 0 && seances.every(s => s.bilan?.trim()) && form.statut !== 'Terminée') {
        finalForm = { ...form, statut: 'Terminée' };
      }
      setEvenements(prev => prev.map(e => e.id === form.id ? finalForm : e));
      const { createdAt, updatedAt, ...data } = finalForm;
      api.put(`/events/${form.id}`, data).catch(console.error);
      if (form.actionId) {
        const linkedAction = actions.find(a => a.id === form.actionId);
        if (linkedAction) {
          const isEventFinished = finalForm.statut === 'Terminée';
          const updates = { etablissement: finalForm.titre, date_debut: finalForm.date, date_fin: finalForm.date, lieu: finalForm.lieu || '', poles: finalForm.poles || [], projet: finalForm.projet || '', statut: finalForm.statut, isArchived: isEventFinished ? true : linkedAction.isArchived };
          setActions(prev => prev.map(a => a.id === form.actionId ? { ...a, ...updates } : a));
          api.put(`/actions/${form.actionId}`, updates).catch(console.error);
        }
        const now = new Date().toISOString().split('T')[0];
        setActions(prev => prev.map(a => a.id === form.actionId ? { ...a, timeline: [...(a.timeline || []), { date: now, icon: 'event', texte: `Événement "${form.titre}" mis à jour`, auto: true }] } : a));
      }
      const prevEvent = evenements.find(e => e.id === form.id);
      const prevSeances = prevEvent?.seances || [];
      const removedSeances = prevSeances.filter(ps => !seances.some(s => s.id === ps.id));
      if (removedSeances.length > 0) {
        removedSeances.forEach(rs => {
          volunteerHours.filter(h => h.eventId === form.id && h.date === rs.date).forEach(h => {
            setVolunteerHours(prev => prev.filter(x => x.id !== h.id));
            api.delete(`/hours/${h.id}`).catch(console.error);
          });
        });
      }
      const newlyBilanned = seances.filter(s => {
        if (!s.bilan?.trim()) return false;
        const prev = prevSeances.find(p => p.id === s.id);
        return !prev?.bilan?.trim();
      });
      if (newlyBilanned.length > 0) {
        const equipe = finalForm.equipe || [];
        newlyBilanned.forEach(s => {
          const hours = s.duree ? parseFloat(s.duree) : 2;
          equipe.forEach(memberNom => {
            const alreadyExists = volunteerHours.some(h => h.eventId === form.id && h.user === memberNom && h.date === s.date);
            if (!alreadyExists) {
              const memberProfile = directory.find(m => m.nom === memberNom);
              const hourData = { eventId: form.id, actionId: finalForm.actionId || null, type: 'Événement', hours, date: s.date, status: 'En attente', user: memberNom, userId: memberProfile?.id || null };
              const tempId = Date.now() + Math.random();
              setVolunteerHours(prev => [...prev, { id: tempId, ...hourData }]);
              api.post('/hours', hourData).then(created => {
                if (created?.id) setVolunteerHours(prev => prev.map(h => h.id === tempId ? { ...h, id: created.id } : h));
              }).catch(console.error);
            }
          });
        });
        if (newlyBilanned.length > 0) addToast(`Heures bénévoles créées pour ${(finalForm.equipe || []).length} membre(s)`);
      }
      addToast(finalForm.statut === 'Terminée' && form.statut !== 'Terminée' ? 'Événement terminé — toutes les séances ont un bilan' : 'Événement mis à jour');
    } else {
      const newEventId = Date.now();
      if (!form.actionId && form.titre && form.date) {
        const newActionId = Date.now() + 1;
        const newAction = { id: newActionId, etablissement: form.titre, date_debut: form.date, date_fin: form.date, lieu: form.lieu || '', ville: form.lieu?.split(',')[1]?.trim() || '', description: '', type: 'Terrain', statut: 'En cours', poles: form.poles || [], projet: form.projet || '', cycle: form.cycle || cycles[0], equipe: form.equipe || [], isArchived: false, timeline: [{ date: new Date().toISOString().split('T')[0], icon: 'created', texte: `Action créée automatiquement depuis l'événement "${form.titre}"`, auto: true }], completionScore: 0, checklist: null };
        const newEvent = { ...form, id: newEventId, actionId: newActionId, equipe: form.equipe || [], seances: form.seances || [], fichiers: [] };
        setActions(prev => [newAction, ...prev]);
        setEvenements(prev => [newEvent, ...prev]);
        addToast('Événement créé et action terrain générée');
      } else {
        setEvenements(prev => [{ ...form, id: newEventId, equipe: form.equipe || [], seances: form.seances || [], fichiers: [] }, ...prev]);
        addToast('Événement créé');
      }
    }
    setEventModal(null);
  };

  const joinEventTeam = (eventId) => {
    setEvenements(prev => prev.map(e => {
      if (e.id !== eventId || (e.equipe || []).includes(currentUser.nom)) return e;
      const updated = { ...e, equipe: [...(e.equipe || []), currentUser.nom] };
      api.put(`/events/${eventId}`, updated).catch(console.error);
      return updated;
    }));
    addToast("Vous avez rejoint l'équipe !");
  };

  const removeEventTeamMember = (eventId, nom) => {
    setEvenements(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const newEquipe  = (e.equipe || []).filter(m => m !== nom);
      const newSeances = (e.seances || []).map(s => ({ ...s, inscrits: (s.inscrits || []).filter(n => n !== nom) }));
      const updated = { ...e, equipe: newEquipe, seances: newSeances };
      api.put(`/events/${eventId}`, { equipe: updated.equipe, seances: updated.seances }).catch(console.error);
      return updated;
    }));
  };

  const toggleSeanceRegistration = (eventId, seanceId) => {
    const targetEvent  = evenements.find(e => e.id === eventId);
    const targetSeance = targetEvent ? (targetEvent.seances || []).find(s => s.id === seanceId) : null;
    const isCurrentlyIn = targetSeance ? (targetSeance.inscrits || []).includes(currentUser.nom) : false;
    setEvenements(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, seances: (e.seances || []).map(s => {
        if (s.id !== seanceId) return s;
        const isIn = (s.inscrits || []).includes(currentUser.nom);
        return { ...s, inscrits: isIn ? s.inscrits.filter(n => n !== currentUser.nom) : [...(s.inscrits || []), currentUser.nom] };
      }) };
    }));
    const updatedEvent = evenements.find(e => e.id === eventId);
    if (updatedEvent) {
      api.put(`/events/${eventId}`, { seances: updatedEvent.seances?.map(s => {
        if (s.id !== seanceId) return s;
        const isIn = (s.inscrits || []).includes(currentUser.nom);
        return { ...s, inscrits: isIn ? s.inscrits.filter(n => n !== currentUser.nom) : [...(s.inscrits || []), currentUser.nom] };
      }) }).catch(console.error);
    }
    if (targetEvent && targetSeance && !isCurrentlyIn) {
      const hours = targetSeance.duree ? parseFloat(targetSeance.duree) : 2;
      const hourData = { eventId, actionId: targetEvent.actionId || null, type: 'Événement', hours, date: targetSeance.date, status: 'En attente', user: currentUser.nom, userId: currentUser.id };
      const tempId = Date.now();
      setVolunteerHours(prev => [...prev, { id: tempId, ...hourData }]);
      api.post('/hours', hourData).then(created => {
        if (created?.id) setVolunteerHours(prev => prev.map(h => h.id === tempId ? { ...h, id: created.id } : h));
      }).catch(console.error);
      addToast(`+${hours}h bénévoles ajoutées en attente de validation`);
    }
  };

  // ─── MISSIONS ─────────────────────────────────────────────────────────────
  const handleSaveMission = async (form) => {
    if (form.id) {
      const prevMission = missions.find(m => m.id === form.id);
      setMissions(prev => prev.map(m => m.id === form.id ? form : m));
      const { updatedAt, ...data } = form;
      api.put(`/missions/${form.id}`, data).catch(err => addToast(`Erreur sauvegarde mission : ${err?.message}`, 'error'));
      addToast('Mission mise à jour');
    } else {
      const newId = Date.now();
      setMissions(prev => [{ ...form, id: newId, candidatures: form.candidatures || [] }, ...prev]);
      api.post('/missions', { ...form, id: undefined, candidatures: [] }).then(created => {
        if (created?.id) setMissions(prev => prev.map(m => m.id === newId ? { ...m, id: created.id } : m));
      }).catch(console.error);
      const poleMembers = directory.filter(m => m.pole === form.pole).map(m => m.nom);
      if (form.linkedActionId) {
        setActions(prev => prev.map(a => a.id === Number(form.linkedActionId) ? { ...a, timeline: [...(a.timeline || []), { date: new Date().toISOString().split('T')[0], icon: 'mission', texte: `Mission "${form.titre}" publiée pour ce suivi`, auto: true }] } : a));
      }
      addToast(`Mission "${form.titre}" publiée ! ${poleMembers.length} membre(s) du pôle ${form.pole} notifié(s).`);
    }
    setMissionModal(null);
  };

  const handleApplyMission = (missionId, message = '') => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    if (mission.candidatures.some(c => c.nom === currentUser.nom)) { addToast('Vous avez déjà postulé à cette mission.', 'warning'); return; }
    const newCandidature = { nom: currentUser.nom, date: new Date().toISOString().split('T')[0], message, statut: 'En attente' };
    const updatedCandidatures = [...mission.candidatures, newCandidature];
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, candidatures: updatedCandidatures } : m));
    api.put(`/missions/${missionId}`, { candidatures: updatedCandidatures }).catch(err => addToast(`Candidature non enregistrée : ${err?.message}`, 'error'));
    addToast('Candidature envoyée ! Les RH et le responsable ont été notifiés.');
  };

  const handleAcceptCandidate = (missionId, candidatNom) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    const updatedMission = { ...mission, statut: 'En cours', candidatures: mission.candidatures.map(c => c.nom === candidatNom ? { ...c, statut: 'Accepté' } : c.statut === 'En attente' ? { ...c, statut: 'Refusé' } : c) };
    setMissions(prev => prev.map(m => m.id !== missionId ? m : updatedMission));
    api.put(`/missions/${missionId}`, { statut: updatedMission.statut, candidatures: updatedMission.candidatures }).catch(console.error);
    const rhTask = { space: 'Ressources Humaines', text: `Onboarding : ${candidatNom} — ${mission.titre}`, description: `Accueillir et intégrer ${candidatNom} dans le pôle ${mission.pole}. Mission : ${mission.type}.`, assignees: [{ name: currentUser.nom, completed: false }], createdBy: currentUser.nom, deadline: mission.dateDebut || '', cycle: cycles[0], status: 'À faire', completedAt: null };
    const rhTempId = -(Math.floor(Math.random() * 900000) + 100000);
    setTasks(prev => [{ id: rhTempId, ...rhTask }, ...prev]);
    api.post('/tasks', rhTask).then(c => { if (c?.id) setTasks(prev => prev.map(t => t.id === rhTempId ? { ...t, id: c.id } : t)); }).catch(console.error);
    const candidatMember = directory.find(m => m.nom === candidatNom);
    const candidatTask = { space: mission.pole || candidatMember?.pole, text: `${mission.type} : ${mission.titre}`, description: `Vous avez été accepté(e) pour cette mission. Pôle : ${mission.pole}. Contact : ${mission.responsable}.`, assignees: [{ name: candidatNom, userId: candidatMember?.id || null, completed: false }], createdBy: currentUser.nom, deadline: mission.dateFin || '', cycle: cycles[0], status: 'À faire', completedAt: null };
    const candTempId = -(Math.floor(Math.random() * 900000) + 100000);
    setTasks(prev => [{ id: candTempId, ...candidatTask }, ...prev]);
    api.post('/tasks', candidatTask).then(c => { if (c?.id) setTasks(prev => prev.map(t => t.id === candTempId ? { ...t, id: c.id } : t)); }).catch(console.error);
    const refusedCandidates = (mission.candidatures || []).filter(c => c.nom !== candidatNom && c.statut === 'En attente').map(c => c.nom);
    const candidatProfile = directory.find(m => m.nom === candidatNom);
    if (candidatProfile) {
      const newProjets = mission.projet && !((candidatProfile.projets || []).includes(mission.projet)) ? [...(candidatProfile.projets || []), mission.projet] : (candidatProfile.projets || []);
      const newCompetences = [...new Set([...(candidatProfile.competences || []), ...(mission.competences || [])])];
      if (newProjets.length !== (candidatProfile.projets || []).length || newCompetences.length !== (candidatProfile.competences || []).length) {
        setDirectory(prev => prev.map(m => m.nom === candidatNom ? { ...m, projets: newProjets, competences: newCompetences } : m));
        api.patch(`/users/${candidatProfile.id}`, { projets: newProjets, competences: newCompetences }).catch(console.error);
      }
    }
    addToast(`${candidatNom} accepté(e) ! ${refusedCandidates.length > 0 ? `${refusedCandidates.length} candidat(s) notifié(s) du refus.` : ''}`);
  };

  const handleRefuseCandidate = (missionId, candidatNom, reason = '') => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    const updatedCandidatures = mission.candidatures.map(c => c.nom === candidatNom ? { ...c, statut: 'Refusé', refusReason: reason } : c);
    setMissions(prev => prev.map(m => m.id !== missionId ? m : { ...m, candidatures: updatedCandidatures }));
    api.put(`/missions/${missionId}`, { candidatures: updatedCandidatures }).catch(console.error);
    addToast(`Candidature de ${candidatNom} refusée — notification envoyée.`);
  };

  const handleUpdateMission = (missionId, updates) => {
    setMissions(prev => prev.map(m => m.id !== missionId ? m : { ...m, ...updates }));
    api.put(`/missions/${missionId}`, updates).catch(err => addToast(`Erreur mise à jour mission : ${err?.message}`, 'error'));
  };

  const handleDeleteMission = (missionId, permanent = false) => {
    if (permanent) {
      requestConfirm('Supprimer définitivement cette mission ? Cette action est irréversible.', () => {
        setMissions(prev => prev.filter(m => m.id !== missionId));
        api.delete(`/missions/${missionId}`).catch(err => addToast(`Erreur suppression : ${err?.message}`, 'error'));
        addToast('Mission supprimée définitivement.');
      });
    } else {
      requestConfirm('Mettre cette mission à la corbeille ?', () => {
        setMissions(prev => prev.map(m => m.id !== missionId ? m : { ...m, statut: 'Annulée' }));
        api.put(`/missions/${missionId}`, { statut: 'Annulée' }).catch(console.error);
        addToast('Mission déplacée vers la corbeille.');
      });
    }
  };

  // ─── FICHIERS PRÉFAITS (structure : [{id, nom, fichiers:[]}]) ────────────
  const _savePrefaits = (updated) => {
    setFichiersPrefaits(updated);
    api.put(`/spaces/${encodeURIComponent('Global')}/settings/fichiers_prefaits`, { value: updated }).catch(console.error);
  };

  const handleAddDossierPrefait = (nom) => {
    _savePrefaits([...fichiersPrefaits, { id: Date.now(), nom: nom.trim() || 'Nouveau dossier', fichiers: [] }]);
  };

  const handleRenameDossierPrefait = (id, newNom) => {
    _savePrefaits(fichiersPrefaits.map(d => d.id === id ? { ...d, nom: newNom.trim() || d.nom } : d));
  };

  const handleDeleteDossierPrefait = (id) => {
    _savePrefaits(fichiersPrefaits.filter(d => d.id !== id));
  };

  const handleAddFichierPrefait = (dossierId, fichier) => {
    _savePrefaits(fichiersPrefaits.map(d =>
      d.id === dossierId ? { ...d, fichiers: [...(d.fichiers || []), { ...fichier, id: Date.now() }] } : d
    ));
  };

  const handleDeleteFichierPrefait = (dossierId, fichierIdx) => {
    _savePrefaits(fichiersPrefaits.map(d =>
      d.id === dossierId ? { ...d, fichiers: (d.fichiers || []).filter((_, i) => i !== fichierIdx) } : d
    ));
  };

  // ─── NOTES DE FRAIS ───────────────────────────────────────────────────────
  const handleSaveNdfConfig = async (config) => {
    setNdfConfig(config);
    api.put(`/spaces/${encodeURIComponent('Trésorerie')}/settings/ndf_config`, { value: config }).catch(console.error);
  };

  const handleSaveNoteFrais = async (form) => {
    const now = new Date().toISOString();
    if (form.id) {
      setNotesFrais(prev => prev.map(n => n.id === form.id ? { ...n, ...form, updatedAt: now } : n));
      const { createdAt, updatedAt, demandeur, historique, ...data } = form;
      api.put(`/tresorerie/notes-frais/${form.id}`, data).catch(console.error);
      if (form.transactionId) {
        const txUpdate = { montant: Number(form.montant), date: form.date, libelle: `[NDF ${form.numeroDossier || form.id}] ${form.description} — ${form.demandeur || currentUser.nom}`, imputation: form.projet || 'Fonctionnement Global' };
        setTransactions(prev => prev.map(t => t.id === form.transactionId ? { ...t, ...txUpdate } : t));
        api.put(`/tresorerie/transactions/${form.transactionId}`, txUpdate).catch(console.error);
      }
      addToast('Brouillon sauvegardé');
      setNoteFraisModal(null);
      return;
    }
    const newId = Date.now();
    const historique = form.statut === 'Soumise' ? [{ date: now, statut: 'Soumise', auteur: currentUser.nom, commentaire: '' }] : [];
    const newNdf = { ...form, id: newId, numeroDossier: '…', createdAt: now, updatedAt: now, historique, transactionId: null, demandeurNom: currentUser.nom };
    setNotesFrais(prev => [newNdf, ...prev]);
    const { id: _ndfId, createdAt: _nc, updatedAt: _nu, demandeur: _dem, numeroDossier: _nd, ...ndfPayload } = newNdf;
    api.post('/tresorerie/notes-frais', { ...ndfPayload, demandeurId: currentUser.id, demandeurNom: currentUser.nom })
      .then(created => {
        const realNdfId = created?.id;
        const realNumero = created?.numeroDossier || `NDF-${new Date().getFullYear()}-????`;
        if (realNdfId) setNotesFrais(prev => prev.map(n => n.id === newId ? { ...n, id: realNdfId, numeroDossier: realNumero } : n));
        if (form.statut === 'Soumise' && realNdfId) {
          const txTempId = Date.now() + 1;
          const txPayload = { date: form.date, libelle: `[NDF ${realNumero}] ${form.description} — ${form.demandeur || currentUser.nom}`, type: 'Dépense', montant: Number(form.montant), imputation: form.projet || 'Fonctionnement Global', statut: 'En attente', fichiers: [] };
          setTransactions(prev => [{ ...txPayload, id: txTempId }, ...prev]);
          api.post('/tresorerie/transactions', txPayload).then(createdTx => {
            if (createdTx?.id) {
              setTransactions(prev => prev.map(t => t.id === txTempId ? { ...t, id: createdTx.id } : t));
              setNotesFrais(prev => prev.map(n => n.id === realNdfId ? { ...n, transactionId: createdTx.id } : n));
              api.put(`/tresorerie/notes-frais/${realNdfId}`, { transactionId: createdTx.id }).catch(console.error);
            }
          }).catch(err => addToast(`Transaction auto non créée : ${err?.message || 'Erreur serveur'}`, 'error'));
          addToast(`${realNumero} soumise — transaction créée en trésorerie.`);
        }
      })
      .catch(err => addToast(`NDF non sauvegardée : ${err?.message || 'Erreur serveur'}`, 'error'));
    if (form.statut !== 'Soumise') addToast('Brouillon sauvegardé');
    setNoteFraisModal(null);
  };

  const handleUpdateNdfStatus = async (ndfId, newStatut, commentaire = '') => {
    const now = new Date().toISOString();
    const ndf = notesFrais.find(n => n.id === ndfId);
    const newHistorique = [...(ndf?.historique || []), { date: now, statut: newStatut, auteur: currentUser.nom, commentaire }];
    setNotesFrais(prev => prev.map(n => n.id !== ndfId ? n : { ...n, statut: newStatut, commentaireTresorerie: commentaire || n.commentaireTresorerie, updatedAt: now, historique: newHistorique }));
    api.put(`/tresorerie/notes-frais/${ndfId}`, { statut: newStatut, commentaireTresorerie: commentaire || ndf?.commentaireTresorerie || null, historique: newHistorique }).catch(err => addToast(`Erreur mise à jour NDF : ${err?.message || 'Erreur serveur'}`, 'error'));
    if (ndf?.transactionId) {
      const txStatut = newStatut === 'Validée' ? 'En attente' : newStatut === 'Remboursée' ? 'Validé' : newStatut === 'Refusée' ? 'Annulé' : null;
      if (txStatut) {
        setTransactions(prev => prev.map(t => t.id === ndf.transactionId ? { ...t, statut: txStatut } : t));
        api.put(`/tresorerie/transactions/${ndf.transactionId}`, { statut: txStatut }).catch(console.error);
      }
    }
    addToast(`NDF mise à jour : ${newStatut}`);
    setNoteFraisModal(null);
  };

  const handleSignalJustificatifProblem = (ndfId, description) => {
    const now = new Date().toISOString();
    const ndf = notesFrais.find(n => n.id === ndfId);
    if (!ndf) return;
    const newHistorique = [...(ndf.historique || []), { date: now, statut: 'En vérification', auteur: currentUser.nom, commentaire: `Justificatif non conforme : ${description}` }];
    setNotesFrais(prev => prev.map(n => n.id !== ndfId ? n : { ...n, statut: 'En vérification', historique: newHistorique }));
    api.put(`/tresorerie/notes-frais/${ndfId}`, { statut: 'En vérification', historique: newHistorique, commentaireTresorerie: `Justificatif non conforme : ${description}` }).catch(err => addToast(`Erreur signalement : ${err?.message || 'Erreur serveur'}`, 'error'));
    addToast(`Problème signalé à ${ndf.demandeurNom || ndf.demandeur} — NDF en vérification`);
    setNoteFraisModal(null);
  };

  const handleDeleteNoteFrais = (ndfId) => {
    const ndf = notesFrais.find(n => n.id === ndfId);
    setNotesFrais(prev => prev.filter(n => n.id !== ndfId));
    api.delete(`/tresorerie/notes-frais/${ndfId}`).catch(err => addToast(`Erreur suppression : ${err?.message}`, 'error'));
    // Supprime aussi la transaction liée pour qu'elle disparaisse de l'espace Finance
    if (ndf?.transactionId) {
      setTransactions(prev => prev.filter(t => t.id !== ndf.transactionId));
      api.delete(`/tresorerie/transactions/${ndf.transactionId}`).catch(console.error);
    }
    setNoteFraisModal(null);
    addToast('Note de frais supprimée');
  };

  const handleRequestNdfDeletion = (ndfId) => {
    setNotesFrais(prev => prev.map(n => n.id === ndfId ? { ...n, suppressionDemandee: true } : n));
    api.put(`/tresorerie/notes-frais/${ndfId}`, { suppressionDemandee: true }).catch(console.error);
    setNoteFraisModal(null);
    addToast('Demande de suppression envoyée à la trésorerie');
  };

  const handleRejectNdfDeletion = (ndfId) => {
    setNotesFrais(prev => prev.map(n => n.id === ndfId ? { ...n, suppressionDemandee: false } : n));
    api.put(`/tresorerie/notes-frais/${ndfId}`, { suppressionDemandee: false }).catch(console.error);
    addToast('Demande de suppression refusée');
  };

  // ─── CALENDRIER ───────────────────────────────────────────────────────────
  const makeCalendarUpdater = (setter, endpoint) => async (id, data) => {
    const { createdAt, updatedAt, ...rest } = data;
    setter(prev => prev.map(item => item.id === id ? { ...item, ...rest } : item));
    await api.put(`/${endpoint}/${id}`, rest);
  };
  const handleCalendarUpdateAction = makeCalendarUpdater(setActions, 'actions');
  const handleCalendarUpdateEvent  = makeCalendarUpdater(setEvenements, 'events');
  const handleCalendarUpdateTask   = makeCalendarUpdater(setTasks, 'tasks');

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────
  const handleSaveTransaction = async (form) => {
    if (form.id) {
      setTransactions(prev => prev.map(t => t.id === form.id ? form : t));
      const { createdAt, updatedAt, ...data } = form;
      api.put(`/tresorerie/transactions/${form.id}`, data).catch(err => addToast(`Erreur sauvegarde transaction : ${err?.message}`, 'error'));
      const linkedNdf = notesFrais.find(n => n.transactionId === form.id);
      if (linkedNdf) {
        const ndfUpdate = {};
        if (linkedNdf.montant !== form.montant) ndfUpdate.montant = form.montant;
        if (linkedNdf.date !== form.date) ndfUpdate.date = form.date;
        if (form.statut === 'Validé' && linkedNdf.statut === 'Soumise') ndfUpdate.statut = 'Validée';
        if (form.statut === 'Annulé' && ['Soumise', 'Validée'].includes(linkedNdf.statut)) ndfUpdate.statut = 'Refusée';
        if (Object.keys(ndfUpdate).length > 0) {
          setNotesFrais(prev => prev.map(n => n.transactionId === form.id ? { ...n, ...ndfUpdate } : n));
          api.put(`/tresorerie/notes-frais/${linkedNdf.id}`, ndfUpdate).catch(console.error);
        }
      }
    } else {
      const tempId = Date.now();
      setTransactions(prev => [{ ...form, id: tempId, fichiers: form.fichiers || [] }, ...prev]);
      api.post('/tresorerie/transactions', { ...form, fichiers: form.fichiers || [] }).then(created => {
        if (created?.id) setTransactions(prev => prev.map(t => t.id === tempId ? { ...t, id: created.id } : t));
      }).catch(console.error);
    }
    setTransactionModal(null);
    addToast('Transaction enregistrée');
  };

  const deleteTransaction = (id) => {
    requestConfirm('Supprimer cette transaction ?', () => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      api.delete(`/tresorerie/transactions/${id}`).catch(err => addToast(`Erreur suppression transaction : ${err?.message}`, 'error'));
      addToast('Transaction supprimée', 'error');
    });
  };

  const validerTransaction = (id) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, statut: 'Validé' } : t));
    api.put(`/tresorerie/transactions/${id}`, { statut: 'Validé' }).catch(err => addToast(`Erreur validation : ${err?.message}`, 'error'));
    const linkedNdf = notesFrais.find(n => n.transactionId === id);
    if (linkedNdf && linkedNdf.statut === 'Soumise') {
      setNotesFrais(prev => prev.map(n => n.transactionId === id ? { ...n, statut: 'Validée' } : n));
      api.put(`/tresorerie/notes-frais/${linkedNdf.id}`, { statut: 'Validée' }).catch(console.error);
    }
    addToast('Transaction validée');
  };

  // ─── ESPACES ──────────────────────────────────────────────────────────────
  const handleSaveTeam = (newTeam, space, year) => {
    const oldTeam = (spaceTeams[space]?.[year]) || [];
    setSpaceTeams(prev => {
      const updated = { ...prev, [space]: { ...(prev[space] || {}), [year]: newTeam } };
      api.put(`/spaces/${encodeURIComponent(space)}/settings/teams`, { value: updated[space] }).catch(console.error);
      return updated;
    });
    const isPole   = POLES.includes(space);
    const isProjet = PROJETS.includes(space);
    const addedMembers   = newTeam.filter(m => !oldTeam.some(o => o.nom === m.nom));
    const removedMembers = oldTeam.filter(m => !newTeam.some(n => n.nom === m.nom));
    const changedRoles   = newTeam.filter(m => { const old = oldTeam.find(o => o.nom === m.nom); return old && old.role !== m.role; });
    addedMembers.forEach(({ nom }) => {
      const member = directory.find(m => m.nom === nom);
      if (!member) return;
      if (isPole && member.pole !== space) { setDirectory(prev => prev.map(m => m.nom === nom ? { ...m, pole: space } : m)); api.patch(`/users/${member.id}`, { pole: space }).catch(console.error); }
      else if (isProjet && !(member.projets || []).includes(space)) { const newProjets = [...(member.projets || []), space]; setDirectory(prev => prev.map(m => m.nom === nom ? { ...m, projets: newProjets } : m)); api.patch(`/users/${member.id}`, { projets: newProjets }).catch(console.error); }
    });
    if (isProjet) {
      removedMembers.forEach(({ nom }) => {
        const member = directory.find(m => m.nom === nom);
        if (!member) return;
        const newProjets = (member.projets || []).filter(p => p !== space);
        setDirectory(prev => prev.map(m => m.nom === nom ? { ...m, projets: newProjets } : m));
        api.patch(`/users/${member.id}`, { projets: newProjets }).catch(console.error);
      });
    }
    const roleToLevel = (role) => (role === 'Responsable' || role === 'Direction') ? 'edit' : 'view';
    [...addedMembers, ...changedRoles].forEach(({ nom, role }) => {
      const member = directory.find(m => m.nom === nom);
      if (!member || member.role === 'Admin') return;
      const level = roleToLevel(role);
      const currentPerms = member.permissions || [];
      const newPerms = currentPerms.some(p => p.pole === space) ? currentPerms.map(p => p.pole === space ? { ...p, level } : p) : [...currentPerms, { pole: space, level }];
      setDirectory(prev => prev.map(m => m.nom === nom ? { ...m, permissions: newPerms } : m));
      api.patch(`/users/${member.id}`, { permissions: newPerms }).catch(console.error);
    });
    removedMembers.forEach(({ nom }) => {
      const member = directory.find(m => m.nom === nom);
      if (!member || member.role === 'Admin') return;
      const currentPerms = member.permissions || [];
      if (!currentPerms.some(p => p.pole === space)) return;
      const newPerms = currentPerms.map(p => p.pole === space ? { ...p, level: 'none' } : p);
      setDirectory(prev => prev.map(m => m.nom === nom ? { ...m, permissions: newPerms } : m));
      api.patch(`/users/${member.id}`, { permissions: newPerms }).catch(console.error);
    });
    addToast('Équipe mise à jour');
  };

  const handleSaveSpaceInfo = (space, info) => {
    setSpaceInfos(prev => ({ ...prev, [space]: info }));
    addToast("Paramètres de l'espace sauvegardés");
    api.put(`/spaces/${encodeURIComponent(space)}/settings/info`, { value: info }).catch(console.error);
  };

  const handleSaveSection = (space, newName, oldName) => {
    if (oldName) {
      setSpaceSections(prev => {
        const updated = { ...prev, [space]: prev[space].map(s => s === oldName ? newName : s) };
        api.put(`/spaces/${encodeURIComponent(space)}/settings/sections`, { value: updated[space] }).catch(console.error);
        return updated;
      });
      setDocsData(prev => ({ ...prev, [space]: (prev[space] || []).map(d => d.section === oldName ? { ...d, section: newName } : d) }));
    } else {
      setSpaceSections(prev => {
        const existing = prev[space] || ['Général', 'Archives'];
        const newArr = [...existing];
        newArr.splice(newArr.length - 1, 0, newName);
        api.put(`/spaces/${encodeURIComponent(space)}/settings/sections`, { value: newArr }).catch(console.error);
        return { ...prev, [space]: newArr };
      });
    }
    addToast('Section enregistrée');
  };

  const handleSaveBudgets = async (newBudgets) => {
    setBudgets(newBudgets);
    Object.entries(newBudgets).forEach(([pole, montant]) => {
      api.put(`/tresorerie/budgets/${encodeURIComponent(pole)}`, { montant }).catch(console.error);
    });
    addToast('Budgets mis à jour');
  };

  // ─── SLICES CONTEXTUELS (pour abonnements fins, sans casser l'API existante) ──

  const userSlice = useMemo(() => ({
    directory, setDirectory,
    isAdmin, isBureau, isResponsable,
    getSpaceRole, getSpaceAccess, hasPower,
    accessiblePoles, accessibleProjets, myTeamSpaces,
    makeNotif,
    changeMyStatus, handleDeclareConge, handleEndCongeNow, handleEditConge, handleDeleteConge,
    handleRenameUser, handleRemoveAvatar,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [directory, isAdmin, isBureau, isResponsable]);

  const spaceSlice = useMemo(() => ({
    spaceChats, setSpaceChats,
    docsData, setDocsData,
    spaceInfos, setSpaceInfos,
    spaceSections, setSpaceSections,
    spaceTeams, setSpaceTeams,
    trash, setTrash,
    spaceChatInput, setSpaceChatInput,
    fichiersPrefaits,
    moveToTrash, restoreTrash, forceDeleteTrash, changeDocSection, moveSection,
    handleAddDossierPrefait, handleRenameDossierPrefait, handleDeleteDossierPrefait,
    handleAddFichierPrefait, handleDeleteFichierPrefait,
    handleSaveTeam, handleSaveSpaceInfo, handleSaveSection,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [spaceChats, docsData, spaceInfos, spaceSections, spaceTeams, trash, spaceChatInput, fichiersPrefaits]);

  const operationsSlice = useMemo(() => ({
    cycles, setCycles, activeCycle, setActiveCycle,
    actions, setActions,
    evenements, setEvenements,
    tasks, setTasks,
    taskRequests, setTaskRequests,
    volunteerHours, setVolunteerHours,
    jobOffers, setJobOffers,
    handleNextCycle, handleDeleteCycle,
    handleAssignTaskRequest, handleRefuseTaskRequest,
    toggleArchiveAction, deleteAction,
    handleUpdateActionStatus, handleUpdateActionResponsables, handleSendActionReminder,
    handleSaveAction, handleWizardComplete,
    toggleArchiveEvent, deleteEvent, handleSaveEvent,
    joinEventTeam, removeEventTeamMember, toggleSeanceRegistration,
    handleCalendarUpdateAction, handleCalendarUpdateEvent, handleCalendarUpdateTask,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cycles, activeCycle, actions, evenements, tasks, taskRequests, volunteerHours, jobOffers]);

  const financeSlice = useMemo(() => ({
    transactions, setTransactions,
    budgets, setBudgets,
    notesFrais, setNotesFrais,
    ndfConfig, setNdfConfig,
    handleSaveNdfConfig, handleSaveNoteFrais, handleUpdateNdfStatus,
    handleSignalJustificatifProblem, handleDeleteNoteFrais,
    handleRequestNdfDeletion, handleRejectNdfDeletion,
    handleSaveTransaction, deleteTransaction, validerTransaction,
    handleSaveBudgets,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transactions, budgets, notesFrais, ndfConfig]);

  const commsSlice = useMemo(() => ({
    conversations, setConversations,
    contacts, setContacts,
    missions, setMissions,
    notifs, setNotifs,
    notifLues, setNotifLues,
    visibleNotifs, personalNotifs, unreadCount, notifBadgeCount, upcomingNotifications,
    handleSendNotif, handleDeleteNotif,
    handleSaveMission, handleApplyMission, handleAcceptCandidate, handleRefuseCandidate,
    handleUpdateMission, handleDeleteMission,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [conversations, contacts, missions, notifs, notifLues, visibleNotifs, personalNotifs, unreadCount]);

  // ─── FAQ ─────────────────────────────────────────────────────────────────
  const handleCreateFaq = async (form) => {
    try {
      const created = await api.post('/faq', form);
      setFaqs(prev => [...prev, created]);
      addToast('Entrée FAQ créée.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur création FAQ', 'error');
      throw err;
    }
  };

  const handleUpdateFaq = async (id, form) => {
    try {
      const updated = await api.put(`/faq/${id}`, form);
      setFaqs(prev => prev.map(f => f.id === id ? updated : f));
      addToast('Entrée FAQ mise à jour.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur mise à jour FAQ', 'error');
      throw err;
    }
  };

  const handleDeleteFaq = async (id) => {
    try {
      await api.delete(`/faq/${id}`);
      setFaqs(prev => prev.filter(f => f.id !== id));
      addToast('Entrée FAQ supprimée.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur suppression FAQ', 'error');
    }
  };

  // ─── DEVIS / FACTURES ─────────────────────────────────────────────────────
  const handleCreateDevisFacture = async (form) => {
    try {
      const created = await api.post('/devis-factures', form);
      setDevisFactures(prev => [created, ...prev]);
      addToast('Document créé.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur création document', 'error');
      throw err;
    }
  };

  const handleUpdateDevisFacture = async (id, form) => {
    try {
      const updated = await api.put(`/devis-factures/${id}`, form);
      setDevisFactures(prev => prev.map(d => d.id === id ? updated : d));
      addToast('Document mis à jour.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur mise à jour', 'error');
      throw err;
    }
  };

  const handleDeleteDevisFacture = async (id) => {
    try {
      await api.delete(`/devis-factures/${id}`);
      setDevisFactures(prev => prev.filter(d => d.id !== id));
      addToast('Document supprimé.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur suppression', 'error');
    }
  };

  const handleSoumettreDevisFacture = async (id) => {
    try {
      const updated = await api.post(`/devis-factures/${id}/soumettre`);
      setDevisFactures(prev => prev.map(d => d.id === id ? updated : d));
      addToast('Demande soumise à la trésorerie.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur soumission', 'error');
      throw err;
    }
  };

  // Crée le brouillon ET le soumet immédiatement (action "Déposer" — fichier obligatoire)
  const handleDeposeDevisFacture = async (form) => {
    try {
      const created = await api.post('/devis-factures', form);
      const soumis  = await api.post(`/devis-factures/${created.id}/soumettre`);
      setDevisFactures(prev => [soumis, ...prev]);
      addToast('Demande déposée et transmise à la trésorerie.');
      return soumis;
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors du dépôt', 'error');
      throw err;
    }
  };

  const handlePrendreEnChargeDevisFacture = async (id) => {
    try {
      const updated = await api.post(`/devis-factures/${id}/prendre-en-charge`);
      setDevisFactures(prev => prev.map(d => d.id === id ? updated : d));
      addToast('Prise en charge enregistrée.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur prise en charge', 'error');
      throw err;
    }
  };

  const handleSignerDevisFacture = async (id, decision, motifRefus, notes) => {
    try {
      const updated = await api.post(`/devis-factures/${id}/signer`, { decision, motifRefus, notes });
      setDevisFactures(prev => prev.map(d => d.id === id ? updated : d));
      addToast(decision === 'Signé' ? 'Demande acceptée et signée.' : 'Demande refusée.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur traitement', 'error');
      throw err;
    }
  };

  const refreshDevisFacture = async (id) => {
    try {
      const updated = await api.get(`/devis-factures/${id}`);
      setDevisFactures(prev => prev.map(d => d.id === id ? updated : d));
      return updated;
    } catch (err) {
      console.error('refreshDevisFacture error:', err);
    }
  };

  const handleApprouverHorsBudget = async (txId) => {
    try {
      const updated = await api.post(`/tresorerie/transactions/${txId}/approuver-hors-budget`);
      setTransactions(prev => prev.map(t => t.id === txId ? updated : t));
      addToast('Dépense hors budget approuvée.');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur approbation', 'error');
    }
  };

  return (
    <UserSliceContext.Provider value={userSlice}>
    <SpaceSliceContext.Provider value={spaceSlice}>
    <OperationsSliceContext.Provider value={operationsSlice}>
    <FinanceSliceContext.Provider value={financeSlice}>
    <CommsSliceContext.Provider value={commsSlice}>
    <DataContext.Provider value={{
      // Cycles
      cycles, setCycles, activeCycle, setActiveCycle,
      // Données
      directory, setDirectory,
      actions, setActions,
      evenements, setEvenements,
      contacts, setContacts,
      conversations, setConversations,
      transactions, setTransactions,
      budgets, setBudgets,
      tasks, setTasks,
      taskRequests, setTaskRequests,
      jobOffers, setJobOffers,
      volunteerHours, setVolunteerHours,
      missions, setMissions,
      notesFrais, setNotesFrais,
      faqs, devisFactures, categoriesDF,
      ndfConfig, setNdfConfig,
      spaceChats, setSpaceChats,
      docsData, setDocsData,
      spaceInfos, setSpaceInfos,
      spaceSections, setSpaceSections,
      spaceTeams, setSpaceTeams,
      trash, setTrash,
      spaceChatInput, setSpaceChatInput,
      notifs, setNotifs,
      notifLues, setNotifLues,
      // RBAC
      isAdmin, isBureau, isResponsable,
      getSpaceRole, getSpaceAccess, hasPower,
      accessiblePoles, accessibleProjets, myTeamSpaces,
      makeNotif,
      // Computed notifs
      visibleNotifs, personalNotifs, unreadCount, notifBadgeCount, upcomingNotifications,
      // Handlers utilisateur
      changeMyStatus, handleDeclareConge, handleEndCongeNow, handleEditConge, handleDeleteConge,
      handleRenameUser, handleRemoveAvatar,
      // Handlers cycles
      handleNextCycle, handleDeleteCycle,
      // Handlers notifs
      handleSendNotif, handleDeleteNotif,
      // Handlers tâches
      handleAssignTaskRequest, handleRefuseTaskRequest,
      // Handlers corbeille/docs
      moveToTrash, restoreTrash, forceDeleteTrash, changeDocSection, moveSection,
      // Handlers actions
      toggleArchiveAction, deleteAction,
      handleUpdateActionStatus, handleUpdateActionResponsables, handleSendActionReminder,
      handleSaveAction, handleWizardComplete,
      // Handlers événements
      toggleArchiveEvent, deleteEvent, handleSaveEvent,
      joinEventTeam, removeEventTeamMember, toggleSeanceRegistration,
      // Handlers missions
      handleSaveMission, handleApplyMission, handleAcceptCandidate, handleRefuseCandidate,
      handleUpdateMission, handleDeleteMission,
      // Fichiers préfaits
      fichiersPrefaits,
      handleAddDossierPrefait, handleRenameDossierPrefait, handleDeleteDossierPrefait,
      handleAddFichierPrefait, handleDeleteFichierPrefait,
      // Handlers NDF
      handleSaveNdfConfig, handleSaveNoteFrais, handleUpdateNdfStatus,
      handleSignalJustificatifProblem, handleDeleteNoteFrais,
      handleRequestNdfDeletion, handleRejectNdfDeletion,
      // Handlers calendrier
      handleCalendarUpdateAction, handleCalendarUpdateEvent, handleCalendarUpdateTask,
      // Handlers FAQ
      handleCreateFaq, handleUpdateFaq, handleDeleteFaq,
      // Handlers devis/factures
      handleCreateDevisFacture, handleUpdateDevisFacture, handleDeleteDevisFacture,
      handleSoumettreDevisFacture, handleDeposeDevisFacture,
      handlePrendreEnChargeDevisFacture, handleSignerDevisFacture,
      refreshDevisFacture,
      // Handlers transactions
      handleSaveTransaction, deleteTransaction, validerTransaction, handleApprouverHorsBudget,
      // Handlers espaces
      handleSaveTeam, handleSaveSpaceInfo, handleSaveSection, handleSaveBudgets,
    }}>
      {children}
    </DataContext.Provider>
    </CommsSliceContext.Provider>
    </FinanceSliceContext.Provider>
    </OperationsSliceContext.Provider>
    </SpaceSliceContext.Provider>
    </UserSliceContext.Provider>
  );
}

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used inside DataProvider');
  return ctx;
}

// ─── HOOKS DOMAINES (abonnements fins — n'invalident pas les autres domaines) ──

export function useUserContext() {
  const ctx = useContext(UserSliceContext);
  if (!ctx) throw new Error('useUserContext must be used inside DataProvider');
  return ctx;
}

export function useSpaceContext() {
  const ctx = useContext(SpaceSliceContext);
  if (!ctx) throw new Error('useSpaceContext must be used inside DataProvider');
  return ctx;
}

export function useOperationsContext() {
  const ctx = useContext(OperationsSliceContext);
  if (!ctx) throw new Error('useOperationsContext must be used inside DataProvider');
  return ctx;
}

export function useFinanceContext() {
  const ctx = useContext(FinanceSliceContext);
  if (!ctx) throw new Error('useFinanceContext must be used inside DataProvider');
  return ctx;
}

export function useCommsContext() {
  const ctx = useContext(CommsSliceContext);
  if (!ctx) throw new Error('useCommsContext must be used inside DataProvider');
  return ctx;
}
