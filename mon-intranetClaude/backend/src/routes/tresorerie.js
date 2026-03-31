const express = require('express');
const { requireAuth }          = require('../middleware/auth');
const { auditLog }             = require('../middleware/auditLogger');
const { isSpaceResponsable }   = require('../lib/spaceAuth');
const { createNotif }          = require('../lib/notifHelper');
const prisma = require('../lib/prisma');

const router = express.Router();

function pickTxFields(body) {
  const { date, libelle, type, montant, imputation, statut, fichiers, categorie, createdBy, horseBudget, horseBudgetRaison, devisFactureId } = body;
  return {
    date,
    libelle,
    type,
    montant: Number(montant) || 0,
    imputation: imputation || 'Fonctionnement Global',
    statut: statut || 'En attente',
    fichiers: fichiers || [],
    categorie: categorie || null,
    createdBy: createdBy || null,
    horseBudget: horseBudget === true,
    horseBudgetRaison: horseBudgetRaison || null,
    devisFactureId: devisFactureId ? Number(devisFactureId) : null,
  };
}

function pickNdfFields(body) {
  const {
    numeroDossier, demandeurNom, demandeurId,
    date, categorie, montant, description,
    justificatif, projet, pole, linkedActionId,
    statut, commentaireTresorerie, transactionId, historique,
    suppressionDemandee,
  } = body;
  return {
    numeroDossier,
    demandeurNom,
    demandeurId: demandeurId ? Number(demandeurId) : null,
    date,
    categorie,
    montant: Number(montant) || 0,
    description,
    justificatif: justificatif
      ? (typeof justificatif === 'string' ? justificatif : JSON.stringify(justificatif))
      : null,
    projet: projet || null,
    pole: pole || null,
    linkedActionId: linkedActionId ? Number(linkedActionId) : null,
    statut,
    commentaireTresorerie: commentaireTresorerie || null,
    transactionId: transactionId ? Number(transactionId) : null,
    historique: historique || [],
    suppressionDemandee: suppressionDemandee === true,
  };
}

// ── Transactions ──────────────────────────────────────────────────────────────
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
    res.json(transactions);
  } catch (err) {
    console.error('Erreur GET transactions:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// Tout utilisateur authentifié peut créer une transaction en attente
router.post('/transactions', requireAuth, async (req, res) => {
  try {
    const data = pickTxFields(req.body);
    if (!data.date || !data.libelle || !data.type || !data.montant) {
      return res.status(400).json({ error: 'Champs requis manquants (date, libelle, type, montant)' });
    }
    data.createdBy = data.createdBy || req.user.nom; // forcer l'identité si non fournie
    const tx = await prisma.transaction.create({ data });
    res.status(201).json(tx);
    auditLog(req, {
      action: 'transaction.create',
      targetType: 'Transaction', targetId: tx.id, targetNom: tx.libelle,
      payload: { type: tx.type, montant: tx.montant, statut: tx.statut },
    });
  } catch (err) {
    console.error('Erreur POST transaction:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/transactions/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès réservé au bureau' });
    }
    const data = pickTxFields(req.body);
    const txId = Number(req.params.id);
    const before = await prisma.transaction.findUnique({ where: { id: txId }, select: { statut: true, montant: true, libelle: true } });
    const tx = await prisma.transaction.update({ where: { id: txId }, data });
    if (before && (before.statut !== tx.statut || before.montant !== tx.montant)) {
      auditLog(req, {
        action: 'transaction.update',
        targetType: 'Transaction', targetId: txId, targetNom: tx.libelle,
        payload: {
          ...(before.statut !== tx.statut && { statut: { from: before.statut, to: tx.statut } }),
          ...(before.montant !== tx.montant && { montant: { from: before.montant, to: tx.montant } }),
        },
      });
    }
    res.json(tx);
  } catch (err) {
    console.error('Erreur PUT transaction:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/transactions/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Accès refusé' });
    const txId = Number(req.params.id);
    // Détacher les NDFs liées avant suppression
    const toDelete = await prisma.transaction.findUnique({ where: { id: txId } }).catch(() => null);
    await prisma.noteFrais.updateMany({ where: { transactionId: txId }, data: { transactionId: null } });
    await prisma.transaction.delete({ where: { id: txId } });
    auditLog(req, {
      action: 'transaction.delete',
      targetType: 'Transaction', targetId: txId, targetNom: toDelete?.libelle,
      payload: { montant: toDelete?.montant, type: toDelete?.type },
    });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE transaction:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/tresorerie/transactions/:id/approuver-hors-budget — Admin/Bureau uniquement
router.post('/transactions/:id/approuver-hors-budget', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès réservé au bureau' });
    }
    const txId = Number(req.params.id);
    if (isNaN(txId)) return res.status(400).json({ error: 'ID invalide' });
    const existing = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!existing) return res.status(404).json({ error: 'Transaction introuvable' });
    if (!existing.horseBudget) return res.status(400).json({ error: 'Cette transaction n\'est pas marquée hors budget' });

    const tx = await prisma.transaction.update({
      where: { id: txId },
      data: { horseBudgetApprovedBy: req.user.nom },
    });
    auditLog(req, {
      action: 'transaction.horseBudget.approve',
      targetType: 'Transaction', targetId: txId, targetNom: existing.libelle,
      payload: { montant: existing.montant, raison: existing.horseBudgetRaison },
    });
    // Notifier le créateur si différent
    if (existing.createdBy && existing.createdBy !== req.user.nom) {
      createNotif({
        titre: 'Dépense hors budget approuvée',
        contenu: `La dépense hors budget « ${existing.libelle} » (${existing.montant} €) a été approuvée par ${req.user.nom}.`,
        auteur: req.user.nom,
        cible: 'personnes',
        targetUsers: [existing.createdBy],
        priorite: 'normale',
      });
    }
    res.json(tx);
  } catch (err) {
    console.error('Erreur POST approuver-hors-budget:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ── Budgets ───────────────────────────────────────────────────────────────────
router.get('/budgets', requireAuth, async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany();
    const result = {};
    budgets.forEach(b => { result[b.pole] = b.montant; });
    res.json(result);
  } catch (err) {
    console.error('Erreur GET budgets:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/budgets/:pole', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Accès réservé au bureau' });
    }
    const pole = decodeURIComponent(req.params.pole);
    const before = await prisma.budget.findUnique({ where: { pole }, select: { montant: true } });
    const budget = await prisma.budget.upsert({
      where: { pole },
      update: { montant: req.body.montant },
      create: { pole, montant: req.body.montant },
    });
    auditLog(req, {
      action: 'budget.update',
      targetType: 'Budget', targetNom: pole,
      payload: { pole, oldMontant: before?.montant ?? null, newMontant: budget.montant },
    });
    res.json(budget);
  } catch (err) {
    console.error('Erreur PUT budget:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ── Notes de frais ────────────────────────────────────────────────────────────
const parseNdfJustif = (note) => {
  // Alias demandeurNom → demandeur for frontend compatibility
  const withAlias = { ...note, demandeur: note.demandeurNom };
  if (!note.justificatif || typeof note.justificatif !== 'string') return withAlias;
  try {
    const parsed = JSON.parse(note.justificatif);
    return { ...withAlias, justificatif: parsed };
  } catch {
    return withAlias;
  }
};

router.get('/notes-frais', requireAuth, async (req, res) => {
  try {
    const canSeeAll = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const where = canSeeAll ? {} : { demandeurId: req.user.id };
    const notes = await prisma.noteFrais.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(notes.map(parseNdfJustif));
  } catch (err) {
    console.error('Erreur GET notes-frais:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/notes-frais', requireAuth, async (req, res) => {
  try {
    const data = pickNdfFields(req.body);
    // Si demandeurId non fourni, utiliser l'utilisateur connecté
    if (!data.demandeurId) data.demandeurId = req.user.id;
    if (!data.demandeurNom) data.demandeurNom = req.user.nom;
    if (!data.date || !data.categorie || !data.montant || !data.description || !data.statut) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    // Générer le numeroDossier atomiquement dans une transaction pour éviter
    // les doublons en cas de requêtes concurrentes (race condition sur count()).
    const year = new Date().getFullYear();
    const note = await prisma.$transaction(async (tx) => {
      const count = await tx.noteFrais.count();
      data.numeroDossier = `NDF-${year}-${String(count + 1).padStart(4, '0')}`;
      return tx.noteFrais.create({ data });
    });
    await auditLog(req, {
      action: 'ndf.create',
      targetType: 'NoteFrais', targetId: note.id, targetNom: note.numeroDossier,
      payload: { montant: note.montant, categorie: note.categorie, statut: note.statut },
    });
    res.status(201).json(parseNdfJustif(note));

    // Notifier la trésorerie si la note est directement soumise
    if (note.statut === 'Soumise') {
      createNotif({
        titre: 'Nouvelle note de frais soumise',
        contenu: `${note.demandeurNom} a soumis une note de frais (${note.numeroDossier}) de ${note.montant} € — ${note.categorie}.`,
        auteur: note.demandeurNom,
        cible: 'pole',
        targetPoles: ['Trésorerie'],
        priorite: 'normale',
      });
    }
  } catch (err) {
    console.error('Erreur POST note-frais:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/notes-frais/:id', requireAuth, async (req, res) => {
  try {
    const ndfId = Number(req.params.id);
    if (isNaN(ndfId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.noteFrais.findUnique({ where: { id: ndfId } });
    if (!existing) return res.status(404).json({ error: 'NDF introuvable' });

    const isAdminOrBureau = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const isOwner         = existing.demandeurId === req.user.id;
    // Trésorier = responsable du pôle Trésorerie dans SpaceSettings ou Permission
    const isTresorier     = isAdminOrBureau
      ? false
      : await isSpaceResponsable(req.user.id, req.user.nom, 'Trésorerie');
    const isPrivileged    = isAdminOrBureau || isTresorier;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id: _id, createdAt: _ca, updatedAt: _ua, demandeur: _dem, ...rest } = req.body;

    // Champs que le demandeur peut modifier sur SES brouillons
    const OWNER_FIELDS  = ['description', 'montant', 'date', 'categorie', 'projet', 'pole', 'justificatif', 'linkedActionId'];
    // Champs réservés à la trésorerie / admin (statut, validation, etc.)
    const TRESOR_FIELDS = ['statut', 'commentaireTresorerie', 'transactionId', 'historique', 'suppressionDemandee'];

    const data = {};

    if (isPrivileged) {
      [...OWNER_FIELDS, ...TRESOR_FIELDS].forEach(k => { if (rest[k] !== undefined) data[k] = rest[k]; });
    } else {
      // Propriétaire non-privilégié : brouillon uniquement
      if (existing.statut !== 'Brouillon') {
        return res.status(403).json({ error: 'Seule la trésorerie peut modifier une NDF déjà soumise' });
      }
      OWNER_FIELDS.forEach(k => { if (rest[k] !== undefined) data[k] = rest[k]; });
      // Autoriser la soumission (Brouillon → Soumise) mais pas les autres transitions
      if (rest.statut === 'Soumise') data.statut = 'Soumise';
      if (rest.historique !== undefined) data.historique = rest.historique;
    }

    // Coercions de type
    if (data.montant      !== undefined) data.montant      = Number(data.montant);
    if (data.transactionId  !== undefined) data.transactionId  = data.transactionId  ? Number(data.transactionId)  : null;
    if (data.linkedActionId !== undefined) data.linkedActionId = data.linkedActionId ? Number(data.linkedActionId) : null;
    if (data.justificatif !== undefined && data.justificatif !== null && typeof data.justificatif !== 'string') {
      data.justificatif = JSON.stringify(data.justificatif);
    }

    const note = await prisma.noteFrais.update({ where: { id: ndfId }, data });

    // Audit + notifications sur changement de statut
    if (data.statut && data.statut !== existing.statut) {
      await auditLog(req, {
        action: 'ndf.statusChange',
        targetType: 'NoteFrais', targetId: ndfId, targetNom: existing.numeroDossier,
        payload: {
          oldStatut: existing.statut,
          newStatut: data.statut,
          montant:   existing.montant,
          commentaire: data.commentaireTresorerie ?? null,
        },
      });

      // Notifier la trésorerie si soumis depuis un brouillon
      if (data.statut === 'Soumise' && existing.statut === 'Brouillon') {
        createNotif({
          titre: 'Nouvelle note de frais soumise',
          contenu: `${existing.demandeurNom} a soumis la note de frais ${existing.numeroDossier} (${existing.montant} €).`,
          auteur: existing.demandeurNom,
          cible: 'pole',
          targetPoles: ['Trésorerie'],
          priorite: 'normale',
        });
      }

      // Notifier le demandeur des autres changements de statut (validation, rejet, remboursement)
      if (data.statut !== 'Soumise') {
        const messages = {
          'En vérification': `Votre note de frais ${existing.numeroDossier} est en cours de vérification par la trésorerie.`,
          'Validée':         `Votre note de frais ${existing.numeroDossier} a été validée !`,
          'Rejetée':         `Votre note de frais ${existing.numeroDossier} a été rejetée.${data.commentaireTresorerie ? ` Motif : ${data.commentaireTresorerie}` : ''}`,
          'Remboursée':      `Votre note de frais ${existing.numeroDossier} a été remboursée (${existing.montant} €).`,
        };
        const contenu = messages[data.statut] || `Le statut de votre note de frais ${existing.numeroDossier} est passé à « ${data.statut} ».`;
        createNotif({
          titre: `Note de frais — ${data.statut}`,
          contenu,
          auteur: 'Trésorerie',
          cible: 'personnes',
          targetUsers: [existing.demandeurNom],
          priorite: data.statut === 'Rejetée' ? 'haute' : 'normale',
        });
      }
    }

    // Notifier la trésorerie en cas de demande de suppression
    if (data.suppressionDemandee === true && existing.suppressionDemandee === false) {
      createNotif({
        titre: 'Demande de suppression de NDF',
        contenu: `${existing.demandeurNom} demande la suppression de la note de frais ${existing.numeroDossier} (${existing.montant} €).`,
        auteur: existing.demandeurNom,
        cible: 'pole',
        targetPoles: ['Trésorerie'],
        priorite: 'haute',
      });
    }

    // Notifier le demandeur si sa demande de suppression est refusée
    if (data.suppressionDemandee === false && existing.suppressionDemandee === true) {
      createNotif({
        titre: 'Demande de suppression refusée',
        contenu: `Votre demande de suppression de la note de frais ${existing.numeroDossier} a été refusée par la trésorerie.`,
        auteur: 'Trésorerie',
        cible: 'personnes',
        targetUsers: [existing.demandeurNom],
        priorite: 'normale',
      });
    }

    res.json(parseNdfJustif(note));
  } catch (err) {
    console.error('Erreur PUT note-frais:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.delete('/notes-frais/:id', requireAuth, async (req, res) => {
  try {
    const ndfId = Number(req.params.id);
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';

    if (!isPrivileged) {
      const ndf = await prisma.noteFrais.findUnique({ where: { id: ndfId } });
      if (!ndf) return res.status(404).json({ error: 'Note de frais introuvable' });
      if (ndf.demandeurId !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
      // Un simple membre ne peut supprimer que ses brouillons directement
      if (ndf.statut !== 'Brouillon') return res.status(403).json({ error: 'Seule la trésorerie peut supprimer une NDF soumise' });
    }

    const toDelete = await prisma.noteFrais.findUnique({ where: { id: ndfId } }).catch(() => null);
    await prisma.noteFrais.delete({ where: { id: ndfId } });
    await auditLog(req, {
      action: 'ndf.delete',
      targetType: 'NoteFrais',
      targetId: ndfId,
      targetNom: toDelete ? `${toDelete.numeroDossier} — ${toDelete.description}` : String(ndfId),
      payload: { montant: toDelete?.montant, statut: toDelete?.statut, demandeurNom: toDelete?.demandeurNom },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE note-frais:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
