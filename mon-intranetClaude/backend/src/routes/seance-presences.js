// routes/seance-presences.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('../middleware/auth');

// ── GET /api/seance-presences ─── toutes les presences (RH) ──────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const presences = await prisma.seancePresence.findMany({
      orderBy: [{ seanceDate: 'desc' }, { membreNom: 'asc' }],
    });
    res.json(presences);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/seance-presences/generate ──────────────────────────────────────
// Génère les enregistrements de présence pour toutes les séances passées non traitées.
// Appelé par le frontend à chaque chargement de la coordination ou du suivi RH.
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = await prisma.evenement.findMany({ where: { isArchived: false } });

    let created = 0;
    for (const ev of events) {
      const seances = Array.isArray(ev.seances) ? ev.seances : [];
      for (const s of seances) {
        if (!s.date || s.date > today) continue; // séance future → ignorer
        if (s.annulee) continue;                  // annulée → ignorer
        const inscrits = Array.isArray(s.inscrits) ? s.inscrits : [];
        const heures   = Number(s.duree) || Number(s.heures) || 0;

        for (const membreNom of inscrits) {
          try {
            await prisma.seancePresence.upsert({
              where: {
                evenementId_seanceId_membreNom: {
                  evenementId: ev.id,
                  seanceId:    String(s.id),
                  membreNom,
                },
              },
              update: {}, // déjà existant → ne rien toucher
              create: {
                evenementId:    ev.id,
                evenementTitre: ev.titre,
                seanceId:       String(s.id),
                seanceDate:     s.date,
                membreNom,
                heures,
                resp1Statut:    'en_attente',
                rhStatut:       'en_attente',
              },
            });
            created++;
          } catch (_) { /* doublon éventuel */ }
        }
      }
    }
    res.json({ generated: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PATCH /api/seance-presences/:id/resp ─────────────────────────────────────
// Validation 1ère instance par le responsable de l'événement.
router.patch('/:id/resp', requireAuth, async (req, res) => {
  const { statut } = req.body; // "present" | "absent"
  if (!['present', 'absent'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    const presence = await prisma.seancePresence.findUnique({ where: { id: Number(req.params.id) } });
    if (!presence) return res.status(404).json({ error: 'Présence introuvable' });

    // Vérifier que l'utilisateur est bien le responsable de l'événement
    const ev = await prisma.evenement.findUnique({ where: { id: presence.evenementId } });
    const isResp  = ev?.responsableNom === req.user.nom;
    const isAdmin = ['Admin', 'Bureau'].includes(req.user.role);
    if (!isResp && !isAdmin) {
      return res.status(403).json({ error: 'Seul le responsable de l\'événement peut valider les présences' });
    }

    const updated = await prisma.seancePresence.update({
      where: { id: Number(req.params.id) },
      data: {
        resp1Statut: statut,
        resp1Par:    req.user.nom,
        resp1At:     new Date(),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PATCH /api/seance-presences/:id/rh ───────────────────────────────────────
// Validation 2ème instance par les RH.
router.patch('/:id/rh', requireAuth, async (req, res) => {
  const { statut } = req.body; // "confirme" | "rejete"
  if (!['confirme', 'rejete'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  // Vérifier permissions RH
  const hasRH = ['Admin', 'Bureau'].includes(req.user.role) || req.user.pole === 'Ressources Humaines';
  if (!hasRH) return res.status(403).json({ error: 'Permissions RH requises' });

  try {
    const presence = await prisma.seancePresence.findUnique({ where: { id: Number(req.params.id) } });
    if (!presence) return res.status(404).json({ error: 'Présence introuvable' });

    const data = {
      rhStatut: statut,
      rhPar:    req.user.nom,
      rhAt:     new Date(),
    };

    // Si confirmé et pas encore créé → créer un Hour
    let hourId = presence.hourId;
    if (statut === 'confirme' && !presence.hourId && presence.heures > 0) {
      // Trouver userId
      const user = await prisma.user.findFirst({ where: { nom: presence.membreNom, isDeleted: false } });
      const hour = await prisma.hour.create({
        data: {
          userId:          user?.id ?? null,
          userNomSnapshot: presence.membreNom,
          eventId:         presence.evenementId,
          type:            'Animation',
          hours:           presence.heures,
          date:            presence.seanceDate,
          status:          'Validé',
        },
      });
      hourId = hour.id;
      data.hourId = hourId;
    }

    // Si rejeté et hourId existe → supprimer l'Hour
    if (statut === 'rejete' && presence.hourId) {
      await prisma.hour.delete({ where: { id: presence.hourId } }).catch(() => {});
      data.hourId = null;
    }

    const updated = await prisma.seancePresence.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PATCH /api/seance-presences/:id/resp-bulk ─────────────────────────────────
// Validation en masse par le responsable pour une séance entière.
router.patch('/bulk-resp', requireAuth, async (req, res) => {
  const { updates } = req.body; // [{ id, statut }]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'Format invalide' });

  try {
    const results = await Promise.all(updates.map(({ id, statut }) =>
      prisma.seancePresence.update({
        where: { id: Number(id) },
        data: {
          resp1Statut: statut,
          resp1Par:    req.user.nom,
          resp1At:     new Date(),
        },
      })
    ));
    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
