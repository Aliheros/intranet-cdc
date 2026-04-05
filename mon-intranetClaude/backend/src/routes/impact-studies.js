const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/impact-studies — liste toutes les études
router.get('/', requireAuth, async (req, res) => {
  try {
    const studies = await prisma.impactStudy.findMany({
      orderBy: [{ cycle: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(studies);
  } catch (err) {
    console.error('Erreur GET impact-studies:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/impact-studies — créer une étude
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!['Admin', 'Bureau'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé au bureau' });
    }
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...data } = req.body;
    const study = await prisma.impactStudy.create({
      data: { ...data, createdBy: req.user.nom },
    });
    res.status(201).json(study);
  } catch (err) {
    console.error('Erreur POST impact-studies:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /api/impact-studies/:id — mettre à jour
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!['Admin', 'Bureau'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé au bureau' });
    }
    const { id: _id, createdAt: _ca, updatedAt: _ua, createdBy: _cb, ...data } = req.body;
    const study = await prisma.impactStudy.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(study);
  } catch (err) {
    console.error('Erreur PUT impact-studies:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/impact-studies/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!['Admin', 'Bureau'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé au bureau' });
    }
    await prisma.impactStudy.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE impact-studies:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
