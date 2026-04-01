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

// Extensions exécutables — refusées même si le MIME type semble correct
const DANGEROUS_EXTENSIONS = new Set([
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.asp', '.aspx', '.jsp', '.jspx',
  '.sh', '.bash', '.zsh', '.fish',
  '.bat', '.cmd', '.ps1', '.psm1',
  '.exe', '.dll', '.so', '.dylib',
  '.py', '.rb', '.pl', '.cgi',
  '.htaccess', '.htpasswd',
  '.svg', // SVG peut embarquer du JS (XSS)
  '.xml', // XXE possible
  '.html', '.htm', '.xhtml',
  '.js', '.mjs', '.ts',
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // 1. Vérification MIME type (peut être falsifié, mais filtre les cas courants)
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
    }
    // 2. Vérification de l'extension (indépendante du MIME pour bloquer les fichiers renommés)
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error(`Extension de fichier non autorisée : ${ext}`));
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

// GET /api/upload/secure/:filename — accès authentifié à un fichier (devis/factures)
router.get('/secure/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;

    // Protection path traversal : nom de fichier simple uniquement (pas de slashes, dots doubles, etc.)
    if (!/^[\w\-. ]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }

    // Résolution et confinement au répertoire uploads (protection supplémentaire)
    const filePath = path.resolve(UPLOAD_DIR, filename);
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      return res.status(400).json({ error: 'Accès refusé' });
    }

    // Contrôle d'accès : Admin/Bureau voient tout — les autres uniquement leurs propres fichiers
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Bureau';
    if (!isPrivileged) {
      const owned = await prisma.devisFacture.findFirst({
        where: {
          fichier:   filename,
          createdBy: req.user.nom,  // sera remplacé par createdById une fois le schéma migré
        },
      });
      if (!owned) return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable' });

    // Forcer le téléchargement sécurisé (ne pas exécuter dans le navigateur)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
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
