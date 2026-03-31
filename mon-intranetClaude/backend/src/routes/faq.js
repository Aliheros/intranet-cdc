const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const prisma = require('../lib/prisma');

const router = express.Router();

const CATEGORIES = ['général', 'finances', 'fonctionnement'];

function pickFaqFields(body) {
  const { categorie, question, reponse, ordre } = body;
  return {
    categorie: CATEGORIES.includes(categorie) ? categorie : 'général',
    question:  String(question || '').trim(),
    reponse:   String(reponse  || '').trim(),
    ordre:     Number(ordre)  || 0,
  };
}

// GET /api/faq — accessible à tous les membres authentifiés
router.get('/', requireAuth, async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }, { createdAt: 'asc' }] });
    res.json(faqs);
  } catch (err) {
    console.error('Erreur GET faq:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/faq — Admin/Bureau uniquement
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Création de FAQ réservée au bureau' });
    }
    const data = pickFaqFields(req.body);
    if (!data.question || !data.reponse) {
      return res.status(400).json({ error: 'Question et réponse requises' });
    }
    data.createdBy = req.user.nom;
    const faq = await prisma.faq.create({ data });
    res.status(201).json(faq);
    auditLog(req, {
      action: 'faq.create',
      targetType: 'Faq', targetId: faq.id, targetNom: faq.question,
      payload: { categorie: faq.categorie },
    });
  } catch (err) {
    console.error('Erreur POST faq:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /api/faq/:id — Admin/Bureau uniquement
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Modification de FAQ réservée au bureau' });
    }
    const faqId = Number(req.params.id);
    if (isNaN(faqId)) return res.status(400).json({ error: 'ID invalide' });
    const data = pickFaqFields(req.body);
    const faq = await prisma.faq.update({ where: { id: faqId }, data });
    res.json(faq);
    auditLog(req, {
      action: 'faq.update',
      targetType: 'Faq', targetId: faqId, targetNom: faq.question,
    });
  } catch (err) {
    console.error('Erreur PUT faq:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/faq/:id — Admin/Bureau uniquement
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Bureau') {
      return res.status(403).json({ error: 'Suppression de FAQ réservée au bureau' });
    }
    const faqId = Number(req.params.id);
    if (isNaN(faqId)) return res.status(400).json({ error: 'ID invalide' });
    const toDelete = await prisma.faq.findUnique({ where: { id: faqId } }).catch(() => null);
    await prisma.faq.delete({ where: { id: faqId } });
    auditLog(req, {
      action: 'faq.delete',
      targetType: 'Faq', targetId: faqId, targetNom: toDelete?.question,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE faq:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
