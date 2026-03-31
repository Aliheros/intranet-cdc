const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');

const router = express.Router();
const prisma = require('../lib/prisma');

// Whitelist — protège contre l'injection de champs Prisma
function pickContactFields(body) {
  const { nom, fonction, organisme, email, telephone, notes, sollicitations } = body;
  return {
    ...(nom          !== undefined && { nom }),
    ...(fonction     !== undefined && { fonction:     fonction     || null }),
    ...(organisme    !== undefined && { organisme:    organisme    || null }),
    ...(email        !== undefined && { email:        email        || null }),
    ...(telephone    !== undefined && { telephone:    telephone    || null }),
    ...(notes        !== undefined && { notes:        notes        || null }),
    ...(sollicitations !== undefined && { sollicitations: Array.isArray(sollicitations) ? sollicitations : [] }),
  };
}

// GET /api/contacts
router.get('/', requireAuth, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({ orderBy: { nom: 'asc' } });
    res.json(contacts);
  } catch (err) {
    console.error('Erreur GET contacts:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/contacts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({ where: { id: Number(req.params.id) } });
    if (!contact) return res.status(404).json({ error: 'Contact introuvable' });
    res.json(contact);
  } catch (err) {
    console.error('Erreur GET contact:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/contacts — tout membre authentifié peut créer
router.post('/', requireAuth, async (req, res) => {
  try {
    const { nom, fonction, organisme, email, telephone, notes } = req.body;
    if (!nom) return res.status(400).json({ error: 'Le nom est requis' });
    const contact = await prisma.contact.create({
      data: {
        nom,
        fonction:    fonction    || null,
        organisme:   organisme   || null,
        email:       email       || null,
        telephone:   telephone   || null,
        notes:       notes       || null,
        sollicitations: [],
        createdBy: req.user.nom,
      },
    });
    res.status(201).json(contact);
    auditLog(req, {
      action: 'contact.create',
      targetType: 'Contact', targetId: contact.id, targetNom: contact.nom,
      payload: { organisme: contact.organisme },
    });
  } catch (err) {
    console.error('Erreur POST contact:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT /api/contacts/:id — créateur ou Admin/Bureau
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const contactId = Number(req.params.id);
    if (isNaN(contactId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const existing = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!existing) return res.status(404).json({ error: 'Contact introuvable' });
      if (existing.createdBy !== req.user.nom) {
        return res.status(403).json({ error: 'Seul le créateur ou le bureau peut modifier ce contact' });
      }
    }

    const data = pickContactFields(req.body);
    const contact = await prisma.contact.update({ where: { id: contactId }, data });
    res.json(contact);
    auditLog(req, {
      action: 'contact.update',
      targetType: 'Contact', targetId: contactId, targetNom: contact.nom,
    });
  } catch (err) {
    console.error('Erreur PUT contact:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/contacts/:id — Admin/Bureau ou créateur du contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const contactId = Number(req.params.id);
    if (isNaN(contactId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) return res.status(404).json({ error: 'Contact introuvable' });
      if (contact.createdBy !== req.user.nom) {
        return res.status(403).json({ error: 'Seul le créateur ou le bureau peut supprimer ce contact' });
      }
    }

    await prisma.contact.delete({ where: { id: contactId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE contact:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
