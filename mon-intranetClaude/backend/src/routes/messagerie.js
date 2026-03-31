const express = require('express');

const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickConvFields(body) {
  const { titre, membres, lastMessage, lastMessageDate } = body;
  return {
    titre:           titre           || '',
    membres:         Array.isArray(membres) ? membres : [],
    lastMessage:     lastMessage     || null,
    lastMessageDate: lastMessageDate || null,
  };
}

// ─── Conversations ────────────────────────────────────────────────────────────

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    // Admin/Bureau voient tout ; les autres uniquement leurs conversations
    const where = isPrivileged ? {} : { membres: { has: req.user.nom } };
    const conversations = await prisma.conversation.findMany({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(conversations);
  } catch (err) {
    console.error('Erreur GET conversations:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const data = pickConvFields(req.body);
    // S'assurer que le créateur est dans les membres
    if (!data.membres.includes(req.user.nom)) {
      data.membres = [req.user.nom, ...data.membres];
    }
    const conv = await prisma.conversation.create({ data });
    res.status(201).json(conv);
  } catch (err) {
    console.error('Erreur POST conversation:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// PUT : seuls les membres de la conversation ou Admin/Bureau
router.put('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const convId = Number(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const existing = await prisma.conversation.findUnique({ where: { id: convId } });
      if (!existing) return res.status(404).json({ error: 'Conversation introuvable' });
      if (!(existing.membres || []).includes(req.user.nom)) {
        return res.status(403).json({ error: 'Vous ne faites pas partie de cette conversation' });
      }
    }

    const { id, createdAt, messages, ...data } = req.body;
    const conv = await prisma.conversation.update({ where: { id: convId }, data: pickConvFields(data) });
    res.json(conv);
  } catch (err) {
    console.error('Erreur PUT conversation:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE : Admin/Bureau ou membre de la conversation
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const convId = Number(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const existing = await prisma.conversation.findUnique({ where: { id: convId } });
      if (!existing) return res.status(404).json({ error: 'Conversation introuvable' });
      if (!(existing.membres || []).includes(req.user.nom)) {
        return res.status(403).json({ error: 'Vous ne faites pas partie de cette conversation' });
      }
    }

    await prisma.conversation.delete({ where: { id: convId } });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE conversation:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST message : vérifier que l'émetteur est membre de la conversation
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const convId = Number(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ error: 'ID invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    const conv = await prisma.conversation.findUnique({ where: { id: convId } });
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });

    if (!isPrivileged && !(conv.membres || []).includes(req.user.nom)) {
      return res.status(403).json({ error: 'Vous ne faites pas partie de cette conversation' });
    }

    const msg = await prisma.message.create({
      data: {
        conversationId: convId,
        auteurId:     req.user.id,
        auteurNom:    req.user.nom,
        auteurAvatar: req.user.avatar,
        auteurPole:   req.user.pole,
        texte:    req.body.texte,
        heure:    req.body.heure,
        fichiers: Array.isArray(req.body.fichiers) ? req.body.fichiers : [],
      },
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error('Erreur POST message:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// ─── Space chats (murs de pôle) ───────────────────────────────────────────────

router.get('/space-chats/:space', requireAuth, async (req, res) => {
  try {
    const messages = await prisma.spaceChat.findMany({
      where: { space: decodeURIComponent(req.params.space) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error('Erreur GET space-chats:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.post('/space-chats/:space', requireAuth, async (req, res) => {
  try {
    const msg = await prisma.spaceChat.create({
      data: {
        space:  decodeURIComponent(req.params.space),
        auteur: req.user.nom,
        avatar: req.user.avatar,
        texte:  req.body.texte,
        heure:  req.body.heure,
      },
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error('Erreur POST space-chat:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
