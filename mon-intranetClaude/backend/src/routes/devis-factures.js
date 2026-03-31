// src/routes/devis-factures.js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const { createNotif } = require('../lib/notifHelper');
const prisma = require('../lib/prisma');

const router = express.Router();

const CATEGORIES_DF = ['Formation', 'Matériel', 'Prestation', 'Communication', 'Transport', 'Hébergement', 'Autre'];
const VALID_STATUTS  = ['Brouillon', 'Soumis', 'En traitement', 'Signé', 'Refusé'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Entrée d'historique immuable — toujours appendée, jamais modifiée */
function makeHistEntry(auteur, action, detail = null) {
  return { date: new Date().toISOString(), auteur, action, ...(detail ? { detail } : {}) };
}

/** Append une entrée dans l'historique JSON d'un DevisFacture */
async function appendHistorique(dfId, entry) {
  const df = await prisma.devisFacture.findUnique({ where: { id: dfId }, select: { historique: true } });
  const hist = Array.isArray(df?.historique) ? df.historique : [];
  await prisma.devisFacture.update({
    where: { id: dfId },
    data:  { historique: [...hist, entry] },
  });
}

function pickDfFields(body) {
  const { titre, description, type, categorie, montant, emetteur, destinataire,
          horseBudget, fichier, fichierOriginal, notes, transactionId } = body;
  return {
    titre:           String(titre        || '').trim(),
    description:     description ? String(description).trim() : null,
    type:            ['Devis', 'Facture'].includes(type) ? type : 'Devis',
    categorie:       CATEGORIES_DF.includes(categorie) ? categorie : (categorie ? 'Autre' : null),
    montant:         Number(montant) || 0,
    emetteur:        String(emetteur     || '').trim(),
    destinataire:    String(destinataire || '').trim(),
    horseBudget:     Boolean(horseBudget),
    fichier:         fichier         || null,
    fichierOriginal: fichierOriginal || null,
    notes:           notes           || null,
    transactionId:   transactionId ? Number(transactionId) : null,
  };
}

function validateRequired(data) {
  if (!data.titre)         return 'Le titre est obligatoire';
  if (!data.montant || data.montant <= 0) return 'Le montant doit être supérieur à 0';
  if (!data.emetteur)      return 'L\'émetteur est obligatoire';
  if (!data.destinataire)  return 'Le destinataire est obligatoire';
  return null;
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/devis-factures
// Admin/Bureau : tout. Autres : uniquement les leurs.
router.get('/', requireAuth, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const where = isPrivileged ? {} : { createdBy: req.user.nom };
    const items = await prisma.devisFacture.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    console.error('GET /devis-factures:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures — crée un brouillon (statut toujours Brouillon)
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pickDfFields(req.body);
    const err  = validateRequired(data);
    if (err) return res.status(400).json({ error: err });

    data.createdBy = req.user.nom;
    data.statut    = 'Brouillon';
    data.historique = [makeHistEntry(req.user.nom, 'Création', `Brouillon créé (${data.type}, ${data.montant} €)`)];

    const item = await prisma.devisFacture.create({ data });
    res.status(201).json(item);

    auditLog(req, {
      action: 'devisFacture.create',
      targetType: 'DevisFacture', targetId: item.id, targetNom: item.titre,
      payload: { type: item.type, montant: item.montant, horseBudget: item.horseBudget },
    });
  } catch (err) {
    console.error('POST /devis-factures:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/devis-factures/:id — modification brouillon uniquement
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (!isPrivileged) {
      if (existing.createdBy !== req.user.nom)    return res.status(403).json({ error: 'Accès refusé' });
      if (existing.statut   !== 'Brouillon')      return res.status(403).json({ error: 'Seuls les brouillons peuvent être modifiés' });
    }

    const data = pickDfFields(req.body);
    const err  = validateRequired(data);
    if (err) return res.status(400).json({ error: err });

    // Append à l'historique existant
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    data.historique = [...hist, makeHistEntry(req.user.nom, 'Modification', 'Brouillon mis à jour')];

    const item = await prisma.devisFacture.update({ where: { id: dfId }, data });
    res.json(item);

    auditLog(req, { action: 'devisFacture.update', targetType: 'DevisFacture', targetId: dfId, targetNom: item.titre });
  } catch (err) {
    console.error('PUT /devis-factures/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/soumettre — Brouillon → Soumis
// Un fichier joint EST OBLIGATOIRE.
router.post('/:id/soumettre', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged && existing.createdBy !== req.user.nom) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    if (existing.statut !== 'Brouillon') {
      return res.status(400).json({ error: 'Ce document a déjà été soumis' });
    }
    if (!existing.fichier) {
      return res.status(400).json({ error: 'Un justificatif (fichier joint) est obligatoire pour soumettre' });
    }

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data:  {
        statut:     'Soumis',
        soumisAt:   now,
        historique: [...hist, makeHistEntry(req.user.nom, 'Soumission', 'Dossier transmis à la trésorerie')],
      },
    });
    res.json(item);

    auditLog(req, {
      action: 'devisFacture.soumettre',
      targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre,
      payload: { montant: existing.montant, horseBudget: existing.horseBudget },
    });

    // Notifier Admin/Bureau
    createNotif({
      titre: `Nouvelle demande ${existing.type}`,
      contenu: `${existing.createdBy} a soumis « ${existing.titre} » — ${existing.montant} €${existing.horseBudget ? ' ⚠️ Hors budget' : ''}.`,
      auteur: req.user.nom,
      cible: 'roles',
      targetUsers: [],
      targetPoles: [],
      priorite: existing.horseBudget ? 'haute' : 'normale',
      source: 'devis-factures',
    });
  } catch (err) {
    console.error('POST /devis-factures/:id/soumettre:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/prendre-en-charge — Soumis → En traitement (Admin/Bureau)
router.post('/:id/prendre-en-charge', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Réservé au bureau' });
    }
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (existing.statut !== 'Soumis') {
      return res.status(400).json({ error: `Statut actuel (${existing.statut}) ne permet pas cette action` });
    }

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data:  {
        statut:    'En traitement',
        traitePar: req.user.nom,
        traiteAt:  now,
        historique: [...hist, makeHistEntry(req.user.nom, 'Prise en charge', `Dossier pris en charge par ${req.user.nom}`)],
      },
    });
    res.json(item);

    auditLog(req, {
      action: 'devisFacture.prendreEnCharge',
      targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre,
    });

    // Notifier le créateur
    if (existing.createdBy && existing.createdBy !== req.user.nom) {
      createNotif({
        titre: 'Demande prise en charge',
        contenu: `Votre demande « ${existing.titre} » est maintenant en cours de traitement par ${req.user.nom}.`,
        auteur: req.user.nom,
        cible: 'personnes',
        targetUsers: [existing.createdBy],
        priorite: 'normale',
      });
    }
  } catch (err) {
    console.error('POST /devis-factures/:id/prendre-en-charge:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devis-factures/:id/signer — décision finale (Admin/Bureau)
// decision: "Signé" | "Refusé"
// Si Refusé, motifRefus est OBLIGATOIRE côté serveur.
router.post('/:id/signer', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Signature réservée au bureau' });
    }
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });
    if (!['Soumis', 'En traitement'].includes(existing.statut)) {
      return res.status(400).json({ error: `Impossible de traiter un dossier au statut « ${existing.statut} »` });
    }

    const { decision, motifRefus, notes } = req.body;
    if (!['Signé', 'Refusé'].includes(decision)) {
      return res.status(400).json({ error: 'Décision invalide — valeurs acceptées : Signé, Refusé' });
    }
    if (decision === 'Refusé' && !String(motifRefus || '').trim()) {
      return res.status(400).json({ error: 'Un motif de refus est obligatoire' });
    }

    const now  = new Date().toISOString().slice(0, 10);
    const hist = Array.isArray(existing.historique) ? existing.historique : [];
    const histDetail = decision === 'Signé'
      ? `Document signé par ${req.user.nom}`
      : `Refusé par ${req.user.nom} — motif : ${motifRefus}`;

    const item = await prisma.devisFacture.update({
      where: { id: dfId },
      data: {
        statut:     decision,
        signataire: req.user.nom,
        signedAt:   now,
        motifRefus: decision === 'Refusé' ? String(motifRefus).trim() : null,
        notes:      notes || existing.notes,
        traitePar:  existing.traitePar || req.user.nom,
        traiteAt:   existing.traiteAt  || now,
        historique: [...hist, makeHistEntry(req.user.nom, decision === 'Signé' ? 'Signature' : 'Refus', histDetail)],
      },
    });
    res.json(item);

    auditLog(req, {
      action: decision === 'Signé' ? 'devisFacture.sign' : 'devisFacture.refuse',
      targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre,
      payload: { type: existing.type, montant: existing.montant, decision, motifRefus: motifRefus || null },
    });

    // Notifier le créateur
    if (existing.createdBy && existing.createdBy !== req.user.nom) {
      createNotif({
        titre: decision === 'Signé' ? `${existing.type} accepté` : `${existing.type} refusé`,
        contenu: decision === 'Signé'
          ? `Votre demande « ${existing.titre} » (${existing.montant} €) a été acceptée et signée par ${req.user.nom}.`
          : `Votre demande « ${existing.titre} » a été refusée. Motif : ${motifRefus}`,
        auteur: req.user.nom,
        cible: 'personnes',
        targetUsers: [existing.createdBy],
        priorite: decision === 'Refusé' ? 'haute' : 'normale',
      });
    }
  } catch (err) {
    console.error('POST /devis-factures/:id/signer:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devis-factures/:id — Brouillon seulement (ou Admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const dfId = Number(req.params.id);
    if (isNaN(dfId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const existing = await prisma.devisFacture.findUnique({ where: { id: dfId } });
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (!isPrivileged) {
      if (existing.createdBy !== req.user.nom) return res.status(403).json({ error: 'Accès refusé' });
      if (existing.statut   !== 'Brouillon')   return res.status(403).json({ error: 'Seuls les brouillons peuvent être supprimés' });
    }

    await prisma.devisFacture.delete({ where: { id: dfId } });
    res.json({ success: true });

    auditLog(req, {
      action: 'devisFacture.delete',
      targetType: 'DevisFacture', targetId: dfId, targetNom: existing.titre,
      payload: { statut: existing.statut, montant: existing.montant },
    });
  } catch (err) {
    console.error('DELETE /devis-factures/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
