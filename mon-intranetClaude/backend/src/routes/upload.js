const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');

const router = express.Router();
const prisma = require('../lib/prisma');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // Fichier prévisible par userId — écrase l'ancienne photo
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  // Images (SVG exclu — peut embarquer du JavaScript → XSS)
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Tableurs
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Présentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Texte
  'text/plain', 'text/csv',
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
    }
    cb(null, true);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max pour les avatars
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Seules les images sont acceptées'));
    cb(null, true);
  },
});

// POST /api/upload — upload a single file
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();
  const taille = req.file.size < 1024 * 1024
    ? `${Math.round(req.file.size / 1024)} Ko`
    : `${(req.file.size / (1024 * 1024)).toFixed(1)} Mo`;
  res.status(201).json({
    nom: req.file.originalname,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    type: ext || 'FILE',
    taille,
  });
});

// POST /api/upload/avatar — upload/remplace la photo de profil
router.post('/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  // Mettre à jour le champ avatar en DB
  await prisma.user.update({ where: { id: req.user.id }, data: { avatar: avatarUrl } });
  res.status(201).json({ url: avatarUrl });
  auditLog(req, {
    action: 'user.avatar.upload',
    targetType: 'User', targetId: req.user.id, targetNom: req.user.nom,
  });
});

// GET /api/upload/secure/:filename — accès authentifié à un fichier sensible (devis/factures)
router.get('/secure/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    // Protection contre path traversal
    if (/[/\\]/.test(filename)) return res.status(400).json({ error: 'Nom de fichier invalide' });

    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const owned = await prisma.devisFacture.findFirst({
        where: { fichier: filename, createdBy: req.user.nom },
      });
      if (!owned) return res.status(403).json({ error: 'Accès refusé' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable' });
    res.sendFile(filePath);
  } catch (err) {
    console.error('Erreur GET upload secure:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// DELETE /api/upload/avatar — supprime la photo et repasse aux initiales
router.delete('/avatar', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user?.avatar && user.avatar.startsWith('/uploads/avatars/')) {
    const filePath = path.join(__dirname, '../..', user.avatar);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  // Recalculer les initiales
  const parts = (user.nom || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] || '?').slice(0, 2).toUpperCase();
  await prisma.user.update({ where: { id: req.user.id }, data: { avatar: initials } });
  res.json({ avatar: initials });
  auditLog(req, {
    action: 'user.avatar.delete',
    targetType: 'User', targetId: req.user.id, targetNom: req.user.nom,
  });
});

module.exports = router;
