// src/routes/devis-factures.js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const { createNotif } = require('../lib/notifHelper');
const { dispatchToUsers } = require('../services/mailer');
const prisma = require('../lib/prisma');
const log = require('../lib/logger');

const router = express.Router();

const VALID_STATUTS = ['Brouillon', 'Soumis', 'En traitement', 'Modif. demandée', 'Signé', 'Refusé'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeHistEntry(auteur, action, detail = null) {
  return { date: new Date().toISOString(), auteur, action, ...(detail ? { detail } : {}) };
}

function pickDfFields(body) {
  const { titre, description, type, categorie, montant, emetteur, destinataire } = body;
  return {
    titre:        String(titre        || '').trim(),
    description:  description ? String(description).trim() : null,
    type:         ['Devis', 'Facture'].includes(type) ? type : 'Devis',
    categorie:    categorie ? String(categorie).trim() : null,
    montant:      Number(montant) || 0,
    emetteur:     String(emetteur     || '').trim(),
    destinataire: String(destinataire || '').trim(),
    // horseBudget : calculé automatiquement à la soumission, jamais saisi manuellement
    // notes : réservé à la trésorerie, non modifiable via ce helper
  };
}

function validateRequired(data) {
  if (!data.titre)                      return 'Le titre est obligatoire';
  if (!data.montant || data.montant <= 0) return 'Le montant doit être supérieur à 0';
  if (!data.emetteur)                   return "L'émetteur est obligatoire";
  if (!data.destinataire)               return 'Le destinataire est obligatoire';
  return null;
}

function isOwner(existing, user) {
  if (existing.createdById != null) return existing.createdById === user.id;
  return existing.createdBy === user.nom;
}

/** Vérifie que l'utilisateur peut gérer les devis/factures (trésorerie, bureau ou admin) */
function canManage(user) {
  if (user.role === 'Admin' || user.role === 'Bureau') return true;
  return user.permissions?.some(p => p.pole === 'Trésorerie' && p.level === 'edit');
}

/** Envoie notif in-app + email si activé */
async function notify({ titre, contenu, auteur, cible = 'personnes', targetUsers = [], priorite = 'normale', df }) {
  // In-app
  createNotif({ titre, contenu, auteur, cible, targetUsers, priorite, source: 'devis-factures' });

  // Email — filtrée par emailPreferences.devisFactures (activé par défaut si non configuré)
  if (!df || !targetUsers.length) return;
  try {
    const users = await prisma.user.findMany({
      where: { nom: { in: targetUsers }, isDeleted: false },
      select: { email: true, emailPerso: true, emailPreferences: true },
    });
    if (!users.length) return;
    await dispatchToUsers({
      users,
      preferenceKey: 'devisFactures',
      subject: titre,
      titre,
      contenu,
      ctaLabel: 'Voir le dossier',
      ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    });
  } catch (err) {
    log.error({ err }, '[notify] Échec email');
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/devis-factures
router.get('/', requireAuth, async (req, res) => {
  try {
    const privileged = canManage(req.user);
    const where = privileged ? {} : {
      OR: [
        { createdById: req.user.id },
        { createdById: null, createdBy: req.user.nom },
      ],
    };
    const items = await prisma.devisFacture.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) {
    log.error({ err }, 'GET /devis-factures');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devis-factures/:id — récupère un dossier unique
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.devisFacture.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Dossier introuvable' });
    if (!canManage(req.user) && !isOwner(item, req.user))
      return res.status(403).json({ error: 'Accès refusé' });
    res.json(item);
  } catch (err) {
    log.error({ err }, 'GET /devis-factures/:id');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures — crée un brouillon
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pickDfFields(req.body);
    const err  = validateRequired(data);
    if (err) return res.status(400).json({ error: err });

    // Fichier joint à la création (depuis le formulaire de dépôt)
    const pendingFile = req.body._pendingFile;
    const initialFichiers = pendingFile
      ? [{ ...pendingFile, addedBy: req.user.nom, addedAt: new Date().toISOString() }]
      : [];

    data.createdBy   = req.user.nom;
    data.createdById = req.user.id;
    data.statut      = 'Brouillon';
    data.fichiers    = initialFichiers;
    data.commentaires = [];
    data.historique  = [makeHistEntry(req.user.nom, 'Création', `Brouillon créé (${data.type}, ${data.montant} €)`)];

    const item = await prisma.devisFacture.create({ data });
    res.status(201).json(item);
    auditLog(req, { action: 'devisFacture.create', targetType: 'DevisFacture', targetId: item.id, targetNom: item.titre });
  } catch (err) {
    log.error({ err }, 'POST /devis-factures');
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/devis-factures/:id — modification brouillon
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const privileged = canManage(req.user);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (!privileged) {
      if (!isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });
      if (existing.statut !== 'Brouillon') return res.status(403).json({ error: 'Seuls les brouillons peuvent être modifiés directement' });
    }

    const data = pickDfFields(req.body);
    const err  = validateRequired(data);
    if (err) return res.status(400).json({ error: err });

    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    data.historique = [...hist, makeHistEntry(req.user.nom, 'Modification', 'Document mis à jour')];

    const item = await prisma.devisFacture.update({ where: { id: dfId }, data });
    res.json(item);
    auditLog(req, { action: 'devisFacture.update', targetType: 'DevisFacture', targetId: dfId, targetNom: item.titre });
  } catch (err) {
    log.error({ err }, 'PUT /devis-factures/:id');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/fichiers — ajouter un fichier
router.post('/:id/fichiers', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    const privileged = canManage(req.user);
    if (!privileged && !isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });
    if (!privileged && existing.statut === 'Signé') return res.status(403).json({ error: 'Document déjà signé' });

    const { nom, url, taille } = req.body;
    if (!url) return res.status(400).json({ error: 'URL du fichier requise' });

    const fichiers = Array.isArray(existing.fichiers) ? existing.fichiers : [];
    const newFichier = { id: Date.now(), nom: nom || url, url, taille: taille || '', addedBy: req.user.nom, addedAt: new Date().toISOString() };
    const hist = Array.isArray(existing.historique) ? existing.historique : [];

    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        fichiers:   [...fichiers, newFichier],
        historique: [...hist, makeHistEntry(req.user.nom, 'Fichier ajouté', nom || url)],
      },
    });
    res.json(item);
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/fichiers');
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devis-factures/:id/fichiers/:fichierIndex — supprimer un fichier
router.delete('/:id/fichiers/:fichierIndex', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const idx  = Number(req.params.fichierIndex);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    const privileged = canManage(req.user);
    if (!privileged && !isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });

    const fichiers = Array.isArray(existing.fichiers) ? [...existing.fichiers] : [];
    if (idx < 0 || idx >= fichiers.length) return res.status(404).json({ error: 'Fichier introuvable' });
    const removed = fichiers.splice(idx, 1)[0];

    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        fichiers,
        historique: [...hist, makeHistEntry(req.user.nom, 'Fichier supprimé', removed.nom || removed.url)],
      },
    });
    res.json(item);
  } catch (err) {
    log.error({ err }, 'DELETE /devis-factures/:id/fichiers/:fichierIndex');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/soumettre — Brouillon → Soumis
router.post('/:id/soumettre', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    const privileged = canManage(req.user);
    if (!privileged && !isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });
    if (existing.statut !== 'Brouillon') return res.status(400).json({ error: 'Ce document a déjà été soumis' });

    const fichiers = Array.isArray(existing.fichiers) ? existing.fichiers : [];
    if (!fichiers.length) return res.status(400).json({ error: 'Au moins un justificatif est obligatoire pour soumettre' });

    // Auto-détection horseBudget : compare le montant au budget disponible
    let horseBudget = false;
    try {
      const [budgetRow, depenses] = await Promise.all([
        prisma.budget.findFirst({ where: { pole: 'Fonctionnement Global' } }),
        prisma.transaction.aggregate({
          where: { type: 'Dépense', statut: 'Validé' },
          _sum: { montant: true },
        }),
      ]);
      const budgetTotal   = Number(budgetRow?.montant) || 0;
      const depensesTotal = Number(depenses._sum.montant) || 0;
      const disponible    = budgetTotal - depensesTotal;
      horseBudget = disponible > 0 && existing.montant > disponible;
    } catch { /* silencieux — on ne bloque pas la soumission */ }

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        statut:     'Soumis',
        soumisAt:   now,
        horseBudget,
        historique: [...hist, makeHistEntry(req.user.nom, 'Soumission',
          `Dossier transmis à la trésorerie${horseBudget ? ' — ⚠️ Hors budget détecté' : ''}`)],
      },
    });
    res.json(item);

    auditLog(req, { action: 'devisFacture.soumettre', targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre });

    // Notifier la trésorerie (membres avec permission edit)
    const tresoUsers = await prisma.user.findMany({
      where: { isDeleted: false, permissions: { some: { pole: 'Trésorerie', level: 'edit' } } },
      select: { nom: true },
    });
    const tresoNoms = tresoUsers.map(u => u.nom);
    notify({
      titre:   `Nouvelle demande ${existing.type}`,
      contenu: `${existing.createdBy} a soumis « ${existing.titre} » — ${existing.montant} €${horseBudget ? ' ⚠️ Hors budget' : ''}.`,
      auteur:  req.user.nom,
      targetUsers: tresoNoms,
      priorite: horseBudget ? 'haute' : 'normale',
      df: item,
      statut: 'Soumis',
    });
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/soumettre');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/prendre-en-charge — Soumis → En traitement
router.post('/:id/prendre-en-charge', requireAuth, async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ error: 'Accès réservé à la trésorerie' });

    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (!['Soumis', 'Modif. demandée'].includes(existing.statut)) {
      return res.status(400).json({ error: `Statut actuel (${existing.statut}) ne permet pas cette action` });
    }

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        statut:    'En traitement',
        traitePar: req.user.nom,
        traiteAt:  now,
        historique: [...hist, makeHistEntry(req.user.nom, 'Prise en charge', `Dossier pris en charge par ${req.user.nom}`)],
      },
    });
    res.json(item);

    auditLog(req, { action: 'devisFacture.prendreEnCharge', targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre });

    if (existing.createdBy && existing.createdBy !== req.user.nom) {
      notify({
        titre:   'Demande prise en charge',
        contenu: `Votre demande « ${existing.titre} » est en cours de traitement par ${req.user.nom}.`,
        auteur:  req.user.nom,
        targetUsers: [existing.createdBy],
        df: item,
        statut: 'En traitement',
      });
    }
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/prendre-en-charge');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/commentaires — ajouter un commentaire
router.post('/:id/commentaires', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    const privileged = canManage(req.user);
    if (!privileged && !isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });

    const { contenu, isInternal = false } = req.body;
    if (!contenu?.trim()) return res.status(400).json({ error: 'Contenu requis' });

    // isInternal only for privileged users
    const internal = privileged && Boolean(isInternal);

    const commentaires = Array.isArray(existing.commentaires) ? existing.commentaires : [];
    const newComment = {
      id:         Date.now(),
      auteur:     req.user.nom,
      auteurRole: req.user.role,
      contenu:    contenu.trim(),
      date:       new Date().toISOString(),
      isInternal: internal,
    };

    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data:  { commentaires: [...commentaires, newComment] },
    });
    res.json(item);

    // Notifier l'autre partie
    const notifyTarget = privileged
      ? (existing.createdBy && existing.createdBy !== req.user.nom ? [existing.createdBy] : [])
      : (async () => {
          const tresoUsers = await prisma.user.findMany({
            where: { isDeleted: false, permissions: { some: { pole: 'Trésorerie', level: 'edit' } } },
            select: { nom: true },
          });
          return tresoUsers.map(u => u.nom).filter(n => n !== req.user.nom);
        })();

    const targets = Array.isArray(notifyTarget) ? notifyTarget : await notifyTarget;
    if (targets.length && !internal) {
      notify({
        titre:       `Nouveau message — ${existing.titre}`,
        contenu:     `${req.user.nom} a laissé un commentaire sur « ${existing.titre} » : "${contenu.trim().slice(0, 100)}"`,
        auteur:      req.user.nom,
        targetUsers: targets,
        df: existing,
        statut: existing.statut,
      });
    }
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/commentaires');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/demande-modif — trésorerie demande une modification au membre
router.post('/:id/demande-modif', requireAuth, async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ error: 'Accès réservé à la trésorerie' });

    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (!['Soumis', 'En traitement'].includes(existing.statut)) {
      return res.status(400).json({ error: `Le dossier doit être en cours de traitement (statut actuel : ${existing.statut})` });
    }

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Un message explicatif est obligatoire' });

    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        statut: 'Modif. demandée',
        demandeModif: {
          message:    message.trim(),
          demandePar: req.user.nom,
          demandeAt:  new Date().toISOString(),
          statut:     'pending',
        },
        historique: [...hist, makeHistEntry(req.user.nom, 'Modification demandée', message.trim().slice(0, 100))],
      },
    });
    res.json(item);

    auditLog(req, { action: 'devisFacture.demandeModif', targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre });

    if (existing.createdBy) {
      notify({
        titre:       `Modification demandée — ${existing.titre}`,
        contenu:     `La trésorerie demande une modification sur « ${existing.titre} » : "${message.trim().slice(0, 120)}"`,
        auteur:      req.user.nom,
        targetUsers: [existing.createdBy],
        priorite:    'haute',
        df: item,
        statut: 'Modif. demandée',
      });
    }
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/demande-modif');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/repondre-modif — membre signale avoir effectué les modifications
router.post('/:id/repondre-modif', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (!isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });
    if (existing.statut !== 'Modif. demandée') return res.status(400).json({ error: 'Aucune demande de modification en attente' });

    const { message } = req.body;
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const existingModif = typeof existing.demandeModif === 'object' ? existing.demandeModif : {};

    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        statut: 'Soumis',
        demandeModif: { ...existingModif, statut: 'répondue', reponduPar: req.user.nom, reponduAt: new Date().toISOString() },
        historique: [...hist, makeHistEntry(req.user.nom, 'Modifications effectuées', message?.trim() || null)],
      },
    });
    res.json(item);

    auditLog(req, { action: 'devisFacture.repondreModif', targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre });

    const tresoUsers = await prisma.user.findMany({
      where: { isDeleted: false, permissions: { some: { pole: 'Trésorerie', level: 'edit' } } },
      select: { nom: true },
    });
    notify({
      titre:       `Modifications effectuées — ${existing.titre}`,
      contenu:     `${req.user.nom} a effectué les modifications demandées sur « ${existing.titre} » et resoumet le dossier.`,
      auteur:      req.user.nom,
      targetUsers: tresoUsers.map(u => u.nom),
      priorite:    'normale',
      df: item,
      statut: 'Soumis',
    });
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/repondre-modif');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/signer — décision finale (trésorerie)
router.post('/:id/signer', requireAuth, async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ error: 'Accès réservé à la trésorerie' });

    const dfId = Number(req.params.id);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (!['Soumis', 'En traitement', 'Modif. demandée'].includes(existing.statut)) {
      return res.status(400).json({ error: `Impossible de traiter un dossier au statut « ${existing.statut} »` });
    }

    const { decision, motifRefus, notes } = req.body;
    if (!['Signé', 'Refusé'].includes(decision)) return res.status(400).json({ error: 'Décision invalide' });
    if (decision === 'Refusé' && !String(motifRefus || '').trim()) return res.status(400).json({ error: 'Un motif de refus est obligatoire' });

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const histDetail = decision === 'Signé'
      ? `Document signé par ${req.user.nom}`
      : `Refusé par ${req.user.nom} — motif : ${motifRefus}`;

    const updateData = {
      statut:     decision,
      signataire: req.user.nom,
      signedAt:   now,
      motifRefus: decision === 'Refusé' ? String(motifRefus).trim() : null,
      notes:      notes || existing.notes,
      traitePar:  existing.traitePar || req.user.nom,
      traiteAt:   existing.traiteAt  || now,
      historique: [...hist, makeHistEntry(req.user.nom, decision === 'Signé' ? 'Signature' : 'Refus', histDetail)],
    };

    // Créer une transaction automatique si Signé
    let transactionId = existing.transactionId;
    if (decision === 'Signé' && !transactionId) {
      try {
        const tx = await prisma.transaction.create({
          data: {
            date:      now,
            libelle:   `${existing.type} — ${existing.titre}`,
            type:      'Dépense',
            montant:   existing.montant,
            imputation: existing.categorie || 'Fonctionnement Global',
            statut:    'Validé',
            categorie: existing.categorie || null,
            createdBy: req.user.nom,
            devisFactureId: existing.id,
            fichiers:  existing.fichiers || [],
          },
        });
        transactionId = tx.id;
        updateData.transactionId = transactionId;
      } catch (txErr) {
        log.error({ txErr }, 'Échec création transaction auto');
      }
    }

    const item = await prisma.devisFacture.update({ where: { id: dfId }, data: updateData });
    res.json(item);

    auditLog(req, {
      action: decision === 'Signé' ? 'devisFacture.sign' : 'devisFacture.refuse',
      targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre,
      payload: { type: existing.type, montant: existing.montant, decision, transactionId },
    });

    if (existing.createdBy && existing.createdBy !== req.user.nom) {
      notify({
        titre:       decision === 'Signé' ? `${existing.type} accepté` : `${existing.type} refusé`,
        contenu:     decision === 'Signé'
          ? `Votre demande « ${existing.titre} » (${existing.montant} €) a été acceptée et signée par ${req.user.nom}.`
          : `Votre demande « ${existing.titre} » a été refusée. Motif : ${motifRefus}`,
        auteur:      req.user.nom,
        targetUsers: [existing.createdBy],
        priorite:    decision === 'Refusé' ? 'haute' : 'normale',
        df: item,
        statut: decision,
      });
    }
  } catch (err) {
    log.error({ err }, 'POST /devis-factures/:id/signer');
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devis-factures/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    const privileged = canManage(req.user);
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (!privileged) {
      if (!isOwner(existing, req.user)) return res.status(403).json({ error: 'Accès refusé' });
      if (existing.statut !== 'Brouillon') return res.status(403).json({ error: 'Seuls les brouillons peuvent être supprimés' });
    }

    await prisma.devisFacture.delete({ where: { id: dfId } });
    res.json({ success: true });
    auditLog(req, { action: 'devisFacture.delete', targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre });
  } catch (err) {
    log.error({ err }, 'DELETE /devis-factures/:id');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
